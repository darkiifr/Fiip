import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { syncStatsToWidget } from '../services/widgetService';

export interface Note {
  id: string;
  title: string;
  content: string;
  encrypted_content?: string | null;
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
  attachments?: any[];
  memoPath?: string | null;
}

const SEED_NOTES: Record<string, Note> = {
  "seed-1": {
    id: "seed-1",
    title: "Clarté avant vitesse",
    content: "Prendre le temps de comprendre le vrai problème permet de construire des solutions qui durent. Dans un monde qui valorise la rapidité, la clarté devient un avantage compétitif.\n\nLa clarté guide chaque décision. Elle évite les faux départs, réduit les allers-retours et aligne les équipes. Quand chacun comprend le “pourquoi”, l’exécution devient plus fluide et plus sereine.\n\nNotre cap est simple : créer un produit utile, compréhensible et fiable. La clarté du message sera au cœur de notre stratégie.\n\nBesoin de clarté sur les responsabilités et les prochaines étapes. Chacun repart avec une action précise et une deadline.\n\nSimplifier l’expérience. Enlever le superflu. Apporter plus de clarté dans chaque interaction avec le produit.\n\nLa clarté est la politesse des leaders. Un message clair crée l’alignement et la confiance.",
    user_id: "local-user",
    is_favorite: true,
    is_locked: false,
    badges: ["Réflexion", "Principes"],
    created_at: "2026-05-31T09:41:00Z",
    updated_at: "2026-05-31T09:41:00Z",
    _status: "synced"
  },
  "seed-2": {
    id: "seed-2",
    title: "Idées produit",
    content: "Simplifier l'expérience. Enlever le superflu. Apporter plus de clarté à chaque interaction.",
    user_id: "local-user",
    is_favorite: false,
    is_locked: false,
    badges: ["Idées"],
    created_at: "2026-05-31T09:12:00Z",
    updated_at: "2026-05-31T09:12:00Z",
    _status: "synced"
  },
  "seed-3": {
    id: "seed-3",
    title: "Réunion équipe",
    content: "Besoin de clarté sur les responsabilités et les prochaines étapes.",
    user_id: "local-user",
    is_favorite: false,
    is_locked: false,
    badges: ["Réunion"],
    created_at: "2026-05-31T08:30:00Z",
    updated_at: "2026-05-31T08:30:00Z",
    _status: "synced"
  },
  "seed-4": {
    id: "seed-4",
    title: "Journal",
    content: "Ce matin, j'ai cherché la clarté dans mes priorités. Moins de bruit, plus d'essentiel.",
    user_id: "local-user",
    is_favorite: true,
    is_locked: false,
    badges: ["Réflexion"],
    created_at: "2026-05-30T10:00:00Z",
    updated_at: "2026-05-30T10:00:00Z",
    _status: "synced"
  },
  "seed-5": {
    id: "seed-5",
    title: "Plan lancement",
    content: "Notre stratégie repose sur une vision claire et une clarté d'exécution à chaque étape.",
    user_id: "local-user",
    is_favorite: false,
    is_locked: false,
    badges: ["Stratégie"],
    created_at: "2026-05-30T11:00:00Z",
    updated_at: "2026-05-30T11:00:00Z",
    _status: "synced"
  },
  "seed-6": {
    id: "seed-6",
    title: "Voyage à Lisbonne",
    content: "Notes, adresses et souvenirs.",
    user_id: "local-user",
    is_favorite: false,
    is_locked: false,
    badges: ["Personnel"],
    created_at: "2026-05-25T14:00:00Z",
    updated_at: "2026-05-25T14:00:00Z",
    _status: "synced"
  },
  "seed-7": {
    id: "seed-7",
    title: "Lecture",
    content: "La clarté n'est pas innée, elle se cultive : lire, observer, écouter.",
    user_id: "local-user",
    is_favorite: false,
    is_locked: false,
    badges: ["Idées"],
    created_at: "2026-05-26T15:00:00Z",
    updated_at: "2026-05-26T15:00:00Z",
    _status: "synced"
  }
};

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
      notes: SEED_NOTES,
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
          const newNotes = {
            ...state.notes,
            [id]: {
              ...existing,
              ...updates,
              updated_at: now,
              _status: existing._status === 'created' ? 'created' : 'updated'
            }
          };
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
          delete newNotes[id];

          // Sync with mobile widgets
          syncStatsToWidget(Object.values(newNotes)).catch(console.error);

          if (existing._status === 'created') {
            return { notes: newNotes };
          }

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
          
          const pendingDels = state.pendingDeletions || [];
          if (pendingDels.length > 0) {
            const successfulDeletes = [];
            for (const delId of pendingDels) {
              const { error } = await supabase
                .from('notes')
                .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', delId)
                .eq('user_id', user.id);
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

          for (const note of notesToPush) {
            const { _status, ...dbNote } = note;
            
            if (_status === 'created' || _status === 'updated') {
              const { error } = await supabase.from('notes').upsert({
                id: dbNote.id,
                title: dbNote.title,
                content: dbNote.is_locked ? '' : dbNote.content,
                encrypted_content: dbNote.encrypted_content || null,
                user_id: user.id,
                notebook_id: dbNote.notebook_id || dbNote.folder_id || null,
                folder_id: dbNote.folder_id || dbNote.notebook_id || null,
                is_favorite: dbNote.is_favorite || false,
                is_locked: dbNote.is_locked || false,
                tags: dbNote.tags || [],
                badges: dbNote.badges || [],
                attachments: dbNote.attachments || [],
                deleted_at: dbNote.deleted_at || null,
                conflict_of: dbNote.conflict_of || null,
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
            set((s) => {
              const newNotes = { ...s.notes };
              const sharedNotes = (sharedRows || [])
                .map((row: any) => row.notes ? { ...row.notes, shared: true, collaboration_role: row.role } : null)
                .filter(Boolean);

              [...remoteNotes, ...sharedNotes].forEach(remote => {
                const local = newNotes[remote.id];
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
