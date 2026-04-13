import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

export interface Note {
  id: string;
  title: string;
  content: string;
  user_id: string;
  is_favorite: boolean;
  is_locked: boolean;
  badges: any[];
  is_public?: boolean;
  shared?: boolean;
  public_slug?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  _status: 'synced' | 'created' | 'updated' | 'deleted';
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
        } catch (e) {}

        const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const now = new Date().toISOString();

        const newNote: Note = {
          ...noteData,
          id,
          user_id: userId,
          created_at: now,
          updated_at: now,
          _status: 'created',
        };

        set((state) => ({
          notes: { ...state.notes, [id]: newNote }
        }));
        get().syncWithCloud();
        return id;
      },

      updateNote: (id, updates) => {
        set((state) => {
          const existing = state.notes[id];
          if (!existing) return state;

          const now = new Date().toISOString();
          return {
            notes: {
              ...state.notes,
              [id]: {
                ...existing,
                ...updates,
                updated_at: now,
                _status: existing._status === 'created' ? 'created' : 'updated'
              }
            }
          };
        });
        
        get().syncWithCloud();
      },

      deleteNote: (id) => {
        set((state) => {
          const existing = state.notes[id];
          if (!existing) return state;

          const newNotes = { ...state.notes };
          delete newNotes[id];

          if (existing._status === 'created') {
            // If never synced, simply remove it with no pending deletion needed
            return { notes: newNotes };
          }

          // Real robust offline-first: add to pendingDeletions, immediately remove from UI state
          return { 
            notes: newNotes,
            pendingDeletions: [...(state.pendingDeletions || []), id]
          };
        });
        
        get().syncWithCloud();
      },

      syncWithCloud: async () => {
        const state = get();
        if (state.isSyncing) return;
        
        set({ isSyncing: true });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
             set({ isSyncing: false });
             return;
          }

          const localNotes = state.notes;
          const notesToPush = Object.values(localNotes).filter(n => n._status !== 'synced');
          
          // 1. Process Pending Deletions first
          const pendingDels = state.pendingDeletions || [];
          if (pendingDels.length > 0) {
            const successfulDeletes = [];
            for (const delId of pendingDels) {
              const { error } = await supabase.from('notes').delete().eq('id', delId).eq('user_id', user.id);
              // if it's already deleted (or not found), we should also consider it successful locally to not block the queue
              if (!error || error.code === 'PGRST116') {
                successfulDeletes.push(delId);
              }
            }
            if (successfulDeletes.length > 0) {
              set((s) => ({
                pendingDeletions: s.pendingDeletions.filter(id => !successfulDeletes.includes(id))
              }));
            }
          }

          // 2. Push local changes
          for (const note of notesToPush) {
            const { _status, ...dbNote } = note;
            
            if (_status === 'created' || _status === 'updated') {
              const { error } = await supabase.from('notes').upsert({
                id: dbNote.id,
                title: dbNote.title,
                content: dbNote.content,
                user_id: user.id,
                is_favorite: dbNote.is_favorite || false,
                is_locked: dbNote.is_locked || false,
                badges: dbNote.badges || [],
                created_at: dbNote.created_at,
                updated_at: dbNote.updated_at,
              }, { onConflict: 'id' });
              
              if (!error) {
                set((s) => ({
                  notes: {
                    ...s.notes,
                    [note.id]: { ...note, _status: 'synced' }
                  }
                }));
              }
            }
          }

          // 2. Pull remote changes
          const lastSync = state.lastSyncAt;
          let query = supabase.from('notes').select('*').eq('user_id', user.id);
          
          if (lastSync) {
             // Only fetch records updated after last sync
             query = query.gt('updated_at', lastSync);
          }

          const { data: remoteNotes, error } = await query;
          
          if (!error && remoteNotes) {
            set((s) => {
              const newNotes = { ...s.notes };
              remoteNotes.forEach(remote => {
                const local = newNotes[remote.id];
                // Local write wins if it's not synced yet to avoid overwriting pending offline changes
                if (!local || local._status === 'synced' || new Date(remote.updated_at) > new Date(local.updated_at)) {
                  newNotes[remote.id] = {
                    ...remote,
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
