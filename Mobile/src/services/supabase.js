import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } from '@env';
import {
  decryptNoteFromCloud,
  decryptSettingsEnvelope,
  encryptNoteForCloud,
  encryptSettingsEnvelope,
} from './cloudEncryption';
import {
  getExternalIdentityUser,
  signOutExternalIdentity,
} from './externalIdentity';
import { canAttachFile, canCreateNote, getStorageLimit, resolvePlanLevel } from './planLimits';

const SUPABASE_URL = VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let accessTokenProvider = null;

async function identityAwareFetch(input, init = {}) {
  if (!accessTokenProvider) return fetch(input, init);
  const token = await accessTokenProvider();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase URL or Key missing in environment variables.");
}

export const supabase = createClient(
  SUPABASE_URL && SUPABASE_URL.trim() !== '' ? SUPABASE_URL : 'https://placeholder.supabase.co', 
  SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.trim() !== '' ? SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.xxxxx',
  {
    global: {
      fetch: identityAwareFetch,
    },
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export { getStorageLimit };
export function setSupabaseAccessTokenProvider(provider) {
  accessTokenProvider = typeof provider === 'function' ? provider : null;
}

// Auth Services
export const authService = {
  async signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          nickname: username,
          subscription_level: 0 // Default to Free
        }
      }
    });

    if (!error && data.user) {
        // Create initial profile if trigger fails or delayed
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ id: data.user.id, nickname: username, avatar_url: '', bio: '', accent_color: '#5865F2', updated_at: new Date().toISOString() }, { onConflict: 'id' });
            
        if (profileError) console.error("Error creating profile:", profileError);
    }
    return { data, error };
  },

  async signIn(identifier, password) {
    const email = String(identifier || '').trim();
    if (!email.includes('@')) {
        return { error: { message: 'Connectez-vous avec votre adresse e-mail.' } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  async signInWithOAuth(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: 'fiip://login-callback',
        skipBrowserRedirect: false // Frequently needs browser for OAuth in RN
      }
    });
    return { data, error };
  },

  async signOut() {
    const externalUser = await getExternalIdentityUser();
    if (externalUser) {
      await signOutExternalIdentity();
      return { error: null };
    }
    return await supabase.auth.signOut();
  },

  async requestAccountDeletion() {
    const user = await this.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const requestedAt = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        deletion_requested_at: requestedAt,
        deletion_status: 'requested',
        updated_at: requestedAt,
      }, { onConflict: 'id' });

    if (error) return { error };
    await supabase.auth.signOut();
    return { data: { deletion_requested_at: requestedAt }, error: null };
  },

  async getUser() {
    try {
      const externalUser = await getExternalIdentityUser();
      if (externalUser) return externalUser;
      // Wrapped in a 5-second timeout to prevent infinite loading screens everywhere
      const getUserLogic = async () => {
        // 1. First fast check locally (avoids slow network request when offline)
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
           return sessionData.session.user;
        }

        // 2. Only if needed
        const { data: userData } = await supabase.auth.getUser();
        return userData?.user || null;
      };

      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Timeout')), 5000);
      });
      
      const user = await Promise.race([getUserLogic(), timeoutPromise]);
      clearTimeout(timeoutId); // Nettoyage de la promesse pour éviter le unhandled rejection

      return user;
    } catch (e) {
      console.warn("Could not get user (offline or timeout):", e);
      return null;
    }
  },

  async validateSession() {
    const user = await this.getUser();
    if (!user) return false;
    
    try {
      const validateLogic = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('last_session_validated')
          .eq('id', user.id)
          .single();
          
        if (!data?.last_session_validated) return false;
        
        const lastValidated = new Date(data.last_session_validated);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return lastValidated > thirtyDaysAgo;
      };

      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      const isValid = await Promise.race([validateLogic(), timeoutPromise]);
      clearTimeout(timeoutId);
      return isValid;
    } catch (e) {
      console.warn("Session validation failed or timed out:", e);
      return false;
    }
  },

  async updateSubscription(level, licenseKey) {
    const user = await this.getUser();
    if (!user) {return { data: null, error: { message: 'Not authenticated' } };}

    const profilePayload = {
      id: user.id,
      plan_level: Number(level) || 0,
      plan_source: 'keyauth',
      plan_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (profileError) {
      return { data: null, error: profileError };
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        subscription_level: level,
        license_key: licenseKey
      }
    });
    return { data, error };
  },

  async setSession(access_token, refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });
    return { data, error };
  },

  async exchangeCodeForSession(code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    return { data, error };
  },

  onAuthStateChange(callback) {
      return supabase.auth.onAuthStateChange(callback);
  },

  /** @param {import('@supabase/supabase-js').User | null} user */
  async getPlanLevel(user = null) {
    const currentUser = user || await this.getUser();
    if (!currentUser) return 0;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan_level')
        .eq('id', currentUser.id)
        .single();

      if (!error && data?.plan_level !== undefined && data?.plan_level !== null) {
        return resolvePlanLevel(data);
      }
    } catch (e) {
      console.warn('Could not read profile plan level:', e);
    }

    return resolvePlanLevel(currentUser);
  }
};

// Data Services
export const dataService = {
  // --- Notes ---
  async fetchNotes() {
    const user = await authService.getUser();
    if (!user) return { data: [], error: 'Not authenticated' };

    // Fetch owned notes
    const { data: ownedData, error: ownedError } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id);

    // Fetch collaborative notes
    const { data: collabData, error: collabError } = await supabase
      .from('note_collaborators')
      .select('notes(*)')
      .eq('user_id', user.id);

    if (ownedError || collabError) {
        console.error('Error fetching notes:', ownedError || collabError);
        // Fallback to local storage if offline/error
        const local = await AsyncStorage.getItem('fiip-notes');
        return { data: local ? JSON.parse(local) : [], error: ownedError || collabError };
    }

    // Combine and deduplicate
    const allNotesMap = new Map();
    ownedData.forEach(n => allNotesMap.set(n.id, { ...n, shared: false }));
    if (collabData) {
        collabData.forEach(c => {
             if (c.notes && c.notes.id) {
                 allNotesMap.set(c.notes.id, { ...c.notes, shared: true });
             }
        });
    }
    
    let combinedData = await Promise.all(Array.from(allNotesMap.values()).map(async (note) => {
      try {
        return await decryptNoteFromCloud(note);
      } catch (error) {
        console.warn('Could not decrypt cloud note:', note.id, error);
        return {
          ...note,
          title: 'Note verrouillée',
          content: '',
          attachments: [],
          tags: [],
          badges: [],
          zeroKnowledgeLocked: true,
        };
      }
    }));
    combinedData.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    // Map DB fields back to what the frontend expects
    const mappedData = combinedData.map(n => ({
      ...n,
      favorite: n.is_favorite,
      updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : Date.now(),
      badges: n.badges || [],
      deleted: n.deleted || false,
      shared: n.shared || false
    }));

    // Preserve local trashed notes
    const localStr = await AsyncStorage.getItem('fiip-notes');
    let localNotes = [];
    if (localStr) {
        try { localNotes = JSON.parse(localStr); } catch (e) {
            console.warn('Failed to parse local trashed notes', e);
        }
    }
    const trashedNotes = localNotes.filter(n => n.deleted);
    
    // Combine fetched DB notes and local trashed notes
    const finalData = [...mappedData, ...trashedNotes];

    // Update local cache
    await AsyncStorage.setItem('fiip-notes', JSON.stringify(finalData));
    return { data: finalData, error: null };
  },

  async saveNote(note) {
    const user = await authService.getUser();
    if (!user) return { error: 'Not authenticated' };
    const level = await authService.getPlanLevel(user);
    const { data: existingNotes, error: countError } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', user.id);

    if (!countError && !existingNotes?.some((existing) => existing.id === note.id)) {
      const currentNoteCount = Array.isArray(existingNotes) ? existingNotes.length : 0;
      if (!canCreateNote({ level, currentNoteCount })) {
        return { error: 'FREE_NOTE_LIMIT_EXCEEDED' };
      }
    }

    let dbNote;
    try {
      dbNote = await encryptNoteForCloud(note, { userId: user.id });
    } catch (error) {
      return { error };
    }

    const { data, error } = await supabase
      .from('notes')
      .upsert(dbNote, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
        console.error('Error saving note:', error);
        return { error };
    }

    return { data, error };
  },

  async deleteNote(noteId) {
      const user = await authService.getUser();
      if (!user) return { error: 'Not authenticated' };

      const { error } = await supabase
          .from('notes')
          .delete()
          .eq('id', noteId);

      return { error };
  },

  // --- Public Sharing ---
  async publishNote(noteId) {
    const user = await authService.getUser();
    if (!user) return { error: 'Not authenticated' };
    const level = await authService.getPlanLevel(user);
    if (level < 1) {
      return { error: 'FREE_PUBLIC_SHARE_DISABLED' };
    }

    const slug = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const localNotes = JSON.parse(await AsyncStorage.getItem('fiip-notes') || '[]');
    let note = localNotes.find((item) => item.id === noteId);
    if (!note) {
      const { data: encryptedNote, error: noteError } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .eq('user_id', user.id)
        .single();
      if (noteError) return { data: null, error: noteError };
      try {
        note = await decryptNoteFromCloud(encryptedNote);
      } catch (error) {
        return { data: null, error };
      }
    }

    const { data, error } = await supabase
      .from('public_note_snapshots')
      .upsert({
        note_id: noteId,
        owner_id: user.id,
        public_slug: slug,
        title: note.title || '',
        content: note.content || '',
        attachments: note.publicAttachments || [],
        tags: note.tags || [],
        badges: note.badges || [],
        author_profile: {},
        updated_at: new Date().toISOString(),
        unpublished_at: null,
      }, { onConflict: 'note_id' })
      .select()
      .single();

    return { data, error };
  },

  async unpublishNote(noteId) {
    const user = await authService.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('public_note_snapshots')
      .delete()
      .eq('note_id', noteId)
      .eq('owner_id', user.id);

    return { data: null, error };
  },

  async getPublicNote(slug) {
    const { data, error } = await supabase
      .from('public_note_snapshots')
      .select('*')
      .eq('public_slug', slug)
      .is('unpublished_at', null)
      .single();
    
    return { data, error };
  },

  // --- Collaboration ---
  async getCollaborators(noteId) {
      const { data, error } = await supabase
          .from('note_collaborators')
          .select('*, profiles(username, avatar_url)')
          .eq('note_id', noteId);
      return { data, error };
  },

  async addCollaborator(noteId, username, role = 'viewer') {
      const user = await authService.getUser();
      const level = await authService.getPlanLevel(user);
      if (level < 1) {
          return { error: 'FREE_COLLABORATION_DISABLED' };
      }

      // 1. Find user by username
      const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .single();
          
      if (profileError || !profile) {
          return { error: 'Utilisateur introuvable.' };
      }

      // 2. Add to collaborators table
      const { data, error } = await supabase
          .from('note_collaborators')
          .insert({
              note_id: noteId,
              user_id: profile.id,
              role: role
          })
          .select()
          .single();
          
      return { data, error: error ? 'Erreur lors de l\'ajout du collaborateur.' : null };
  },

  async removeCollaborator(noteId, userId) {
      const { error } = await supabase
          .from('note_collaborators')
          .delete()
          .eq('note_id', noteId)
          .eq('user_id', userId);
      return { error };
  },

  // --- Profile ---
  async fetchProfile() {
      const user = await authService.getUser();
      if (!user) return { data: null, error: 'Not authenticated' };

      const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
      
      // Auto-sync / migration for older accounts without a profile or missing nickname
      if (error && error.code === 'PGRST116') {
          // Profile not found, let's create it from metadata
          const username = user.user_metadata?.nickname || user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || "Utilisateur";
          const newProfile = { id: user.id, nickname: username, avatar_url: user.user_metadata?.avatar_url || '', bio: '', accent_color: '#5865F2', updated_at: new Date().toISOString() };
          const { data: createdData } = await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' }).select().single();
          return { data: createdData, error: null };
      }
      
      // Sync legacy 'username' column to 'nickname' column if nickname is empty but username exists
      if (data && !data.nickname && data.username) {
          const updatedProfile = { ...data, nickname: data.username };
          const { data: fixedData } = await supabase.from('profiles').upsert(updatedProfile, { onConflict: 'id' }).select().single();
          return { data: fixedData, error: null };
      }
      
      return { data, error };
  },

  async saveProfile(profile) {
      const user = await authService.getUser();
      if (!user) return { error: 'Not authenticated' };

      // Update auth user metadata so it drops down smoothly
      const { error: authError } = await supabase.auth.updateUser({
          data: {
              username: profile.nickname,
              full_name: profile.nickname,
              name: profile.nickname,
              avatar_url: profile.avatar || profile.avatar_url
          }
      });

      // Format profile data exactly to database schema
      const profileData = {
          id: user.id,
          nickname: profile.nickname,
          bio: profile.bio || '',
          avatar_url: profile.avatar || profile.avatar_url,
          accent_color: profile.accentColor || profile.accent_color || '#5865F2',
          skills: profile.skills || [],
          updated_at: new Date().toISOString()
      };

      const { error } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' });

      return { error: authError || error };
  },

  async uploadAvatar(file) {
      const user = await authService.getUser();
      if (!user) return { error: new Error('Not authenticated') };

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });

      if (uploadError) return { error: uploadError };

      const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

      return { url: data.publicUrl, error: null };
  },

  // --- Realtime Subscriptions ---
  subscribeToNotes(callback) {
      const channel = supabase
          .channel('public:notes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload) => {
              callback(payload);
          })
          .subscribe();
      return channel;
  },

  joinNoteCollaboration(noteId, userId, username, onUpdate, onPresenceSync) {
      if (!noteId) return null;
      const room = supabase.channel(`note-${noteId}`, {
          config: { presence: { key: userId } }
      });

      room.on('broadcast', { event: 'edit' }, (payload) => {
          if (payload.payload && payload.payload.userId !== userId) {
              onUpdate(payload.payload.note);
          }
      });

      room.on('presence', { event: 'sync' }, () => {
          const state = room.presenceState();
          if (onPresenceSync) onPresenceSync(state);
      });

      room.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              await room.track({
                  user: username || 'Anonyme',
                  online_at: new Date().toISOString(),
              });
          }
      });

      return room;
  },

  // --- Settings ---
  async fetchSettings() {
      const user = await authService.getUser();
      if (!user) return { data: {}, error: 'Not authenticated' };

      const { data, error } = await supabase.functions.invoke('sync-settings', {
        body: { settings: {}, deviceId: 'mobile' },
      });
      if (error) {
        const cached = await AsyncStorage.getItem('fiip-settings');
        return { data: cached ? JSON.parse(cached) : {}, error };
      }

      const settings = await decryptSettingsEnvelope(data?.settings || {});
      await AsyncStorage.setItem('fiip-settings', JSON.stringify(settings));
      return { data: settings, error: null };
  },

  async saveSettings(settings) {
      const user = await authService.getUser();
      if (!user) return { error: 'Not authenticated' };

      const encryptedSettings = await encryptSettingsEnvelope(settings);
      const { error } = await supabase.functions.invoke('sync-settings', {
        body: { settings: encryptedSettings, deviceId: 'mobile' },
      });
      await AsyncStorage.setItem('fiip-settings', JSON.stringify(settings));
      if (error) {
        await AsyncStorage.setItem('fiip-settings-pending', JSON.stringify(encryptedSettings));
      } else {
        await AsyncStorage.removeItem('fiip-settings-pending');
      }
      return { error };
  },

  async getUsage(userId) {
    if (!userId) {
        if (typeof authService !== 'undefined' && authService.getUser) {
             const user = await authService.getUser();
             if (user) userId = user.id;
        }
        if (!userId) return 0;
    }

    const { data, error } = await supabase
      .from('files')
      .select('file_size')
      .eq('owner_id', userId)
      .eq('status', 'confirmed');
    if (error) {
      console.error('Error calculating R2 usage:', error);
      return 0;
    }
    return (data || []).reduce((total, file) => total + Number(file.file_size || 0), 0);
  },

  // --- Storage (Attachments) ---
  async uploadAttachment(file, path) {
    // 1. Check Usage
    const user = await authService.getUser();
    if (!user) return { error: 'Not authenticated' };
    
    const currentUsage = await this.getUsage(user.id);
    const level = await authService.getPlanLevel(user);

    if (!canAttachFile({ level, currentUsage, fileSize: file.size, attachmentCount: 0 })) {
      return { error: new Error("STORAGE_LIMIT_EXCEEDED") };
    }
    
    try {
      const { uploadFile } = await import('./storageR2');
      const noteId = String(path || '').split('/').filter(Boolean)[0] || undefined;
      const data = await uploadFile({
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      }, noteId);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};

// Storage Services (Legacy/Helper wrapper around dataService)
export const storageService = {
  async getUsage(userId) {
      return dataService.getUsage(userId);
  },

  async uploadFile(userId, file, path) {
      // Legacy paths might not include userId, so ensure consistency if needed
      // But path arg here usually expects relative. 
      // dataService expects full path.
      // Let's assume path passed here is relative to userId folder.
      return dataService.uploadAttachment(file, `${userId}/${path}`);
  },

  async downloadFile(_userId, fileId) {
      const { downloadFile } = await import('./storageR2');
      return downloadFile(fileId);
  },

  async getPublicUrl(_userId, fileId) {
    const { getFileUrl } = await import('./storageR2');
    return getFileUrl(fileId);
  }
};
