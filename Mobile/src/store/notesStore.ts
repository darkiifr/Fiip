import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decryptNoteFromCloud, encryptNoteForCloud } from '../services/cloudEncryption';
import { authService, supabase } from '../services/supabase';
import { useSettingsStore } from './settingsStore';
import { syncStatsToWidget } from '../services/widgetService';
import { FiipTag, normalizeNoteTags, serializeLegacyBadges } from '../utils/noteTags';

export interface Note {
  id: string;
  title: string;
  content: string;
  encrypted_content?: string | null;
  encrypted_content_v2?: string | null;
  notebook_id?: string | null;
  folder_id?: string | null;
  user_id: string;
  is_favorite: boolean;
  is_locked: boolean;
  tags?: Array<{ id: string; label: string; icon?: string; color?: number }> | string[];
  badges: string[];
  is_public?: boolean;
  shared?: boolean;
  public_slug?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  conflict_of?: string | null;
  _status: 'synced' | 'created' | 'updated' | 'deleted';
  drawingPaths?: string[];
  attachments?: unknown[];
  memoPath?: string | null;
}

function createUuid() {
  const nativeCrypto = (globalThis as typeof globalThis & {
    crypto?: { randomUUID?: () => string };
  }).crypto;
  if (nativeCrypto?.randomUUID) {
    return nativeCrypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : Math.floor(random / 4) + 8;
    return value.toString(16);
  });
}

interface NotesState {
  notes: Record<string, Note>;
  lastSyncAt: string | null;
  isSyncing: boolean;
  pendingDeletions: string[];
  addNote: (note: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at' | '_status'>) => Promise<string>;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  syncWithCloud: () => Promise<void>;
  getNotesList: () => Note[];
}

type SharedNoteRow = {
  role: string;
  notes: unknown;
};

function toFiipTags(tags: Note['tags'], badges: string[] = []): FiipTag[] {
  return normalizeNoteTags(tags, badges);
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: {},
      lastSyncAt: null,
      isSyncing: false,
      pendingDeletions: [],

      addNote: async (noteData) => {
        let userId = 'local-user';
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
             userId = data.session.user.id;
          }
        } catch {}

        const id = createUuid();
        const now = new Date().toISOString();

        const newNote: Note = {
          ...noteData,
          id,
          user_id: userId,
          tags: toFiipTags(noteData.tags, noteData.badges || []),
          badges: serializeLegacyBadges(toFiipTags(noteData.tags, noteData.badges || [])),
          created_at: now,
          updated_at: now,
          _status: 'created',
        };

        set((state) => {
          const newNotes = { ...state.notes, [id]: newNote };
          // Sync with mobile widgets
          syncStatsToWidget(Object.values(newNotes)).catch(console.error);
          return { notes: newNotes };
        });

        get().syncWithCloud();
        return id;
      },

      updateNote: (id, updates) => {
        set((state) => {
          const existing = state.notes[id];
          if (!existing) return state;

          const now = new Date().toISOString();
          const updatedNote: Note = {
              ...existing,
              ...updates,
              tags: updates.tags !== undefined ? toFiipTags(updates.tags, updates.badges || existing.badges) : existing.tags,
              badges: updates.tags !== undefined
                ? serializeLegacyBadges(toFiipTags(updates.tags, updates.badges || existing.badges))
                : updates.badges || existing.badges,
              updated_at: now,
              _status: existing._status === 'created' ? 'created' : 'updated',
          };
          const newNotes: Record<string, Note> = { ...state.notes, [id]: updatedNote };
          // Sync with mobile widgets
          syncStatsToWidget(Object.values(newNotes)).catch(console.error);
          return { notes: newNotes };
        });
        
        get().syncWithCloud();
      },

      deleteNote: (id) => {
        set((state) => {
          const existing = state.notes[id];
          if (!existing) return state;

          const newNotes = { ...state.notes };

          if (existing._status === 'created') {
            delete newNotes[id];
            syncStatsToWidget(Object.values(newNotes)).catch(console.error);
            return { notes: newNotes };
          }

          newNotes[id] = {
            ...existing,
            deleted_at: new Date().toISOString(),
            _status: 'deleted',
          };

          // Sync with mobile widgets
          syncStatsToWidget(Object.values(newNotes)).catch(console.error);

          return { 
            notes: newNotes,
            pendingDeletions: Array.from(new Set([...(state.pendingDeletions || []), id]))
          };
        });
        
        get().syncWithCloud();
      },

      syncWithCloud: async () => {
        if (useSettingsStore.getState().syncEnabled === false) {
          return;
        }

        const state = get();
        if (state.isSyncing) return;
        
        set({ isSyncing: true });

        try {
          const user = await authService.getUser();
          if (!user) {
             set({ isSyncing: false });
             return;
          }

          const localNotes = state.notes;
          const notesToPush = Object.values(localNotes).filter(n => n._status !== 'synced');
          let pushFailed = false;
          
          const pendingDels = state.pendingDeletions || [];
          if (pendingDels.length > 0) {
            const successfulDeletes: string[] = [];
            for (const delId of pendingDels) {
              const { error } = await supabase
                .from('notes')
                .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', delId)
                .eq('user_id', user.id);
              if (!error || error.code === 'PGRST116') {
                successfulDeletes.push(delId);
              } else {
                pushFailed = true;
              }
            }
            if (successfulDeletes.length > 0) {
              set((s) => ({
                pendingDeletions: s.pendingDeletions.filter(id => !successfulDeletes.includes(id))
              }));
            }
          }

          for (const note of notesToPush) {
            const { _status, ...dbNote } = note;
            
            if (_status === 'deleted') {
              const { error } = await supabase
                .from('notes')
                .update({ deleted_at: dbNote.deleted_at || new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', dbNote.id)
                .eq('user_id', user.id);

              if (!error || error.code === 'PGRST116') {
                set((s) => {
                  const next = { ...s.notes };
                  delete next[note.id];
                  return {
                    notes: next,
                    pendingDeletions: s.pendingDeletions.filter(delId => delId !== note.id),
                  };
                });
              } else {
                pushFailed = true;
              }
              continue;
            }

            if (_status === 'created' || _status === 'updated') {
              const encryptedNote = await encryptNoteForCloud(dbNote, { userId: user.id });
              const { error } = await supabase
                .from('notes')
                .upsert(encryptedNote, { onConflict: 'id' });
              
              if (!error) {
                set((s) => ({
                  notes: {
                    ...s.notes,
                    [note.id]: { ...note, _status: 'synced' }
                  }
                }));
              } else {
                pushFailed = true;
              }
            }
          }

          if (pushFailed) {
            return;
          }

          const lastSync = state.lastSyncAt;
          let query = supabase.from('notes').select('*').eq('user_id', user.id);
          
          if (lastSync) {
             query = query.gt('updated_at', lastSync);
          }

          const { data: remoteNotes, error } = await query;
          const { data: sharedRows, error: sharedError } = await supabase
            .from('note_collaborators')
            .select('role, notes(*)')
            .eq('user_id', user.id);
          
          if (!error && !sharedError && remoteNotes) {
            const decryptedRemoteNotes = await Promise.all(remoteNotes.map(decryptNoteFromCloud)) as Note[];
            const decryptedSharedNotes = await Promise.all((sharedRows || [])
              .filter((row: SharedNoteRow) => row.notes)
              .map(async (row: SharedNoteRow) => ({
                ...await decryptNoteFromCloud(row.notes as Parameters<typeof decryptNoteFromCloud>[0]),
                shared: true,
                collaboration_role: row.role,
              } as unknown as Note)));
            set((s) => {
              const newNotes = { ...s.notes };

              [...decryptedRemoteNotes, ...decryptedSharedNotes].forEach(remote => {
                const local = newNotes[remote.id];
                if (!local || local._status === 'synced' || new Date(remote.updated_at) > new Date(local.updated_at)) {
                  newNotes[remote.id] = {
                    ...remote,
                    tags: toFiipTags(remote.tags || [], remote.badges || []),
                    badges: serializeLegacyBadges(toFiipTags(remote.tags || [], remote.badges || [])),
                    _status: 'synced'
                  } as Note;
                }
              });
              return { 
                notes: newNotes,
                lastSyncAt: new Date().toISOString()
              };
            });
          }
        } catch (error) {
          console.error("Sync failed:", error);
        } finally {
          set({ isSyncing: false });
        }
      },

      getNotesList: () => {
        return Object.values(get().notes)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      }
    }),
    {
      name: 'notes-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
