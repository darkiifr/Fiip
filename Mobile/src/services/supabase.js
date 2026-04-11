import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase URL or Key missing in environment variables.");
}

export const supabase = createClient(
  SUPABASE_URL && SUPABASE_URL.trim() !== '' ? SUPABASE_URL : 'https://placeholder.supabase.co', 
  SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.trim() !== '' ? SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.xxxxx',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  }
);

// Storage Limits (in Bytes) - Adjusted for Supabase Free Tier (Max Project Size ~1GB)
export const STORAGE_LIMITS = {
  FREE: 50 * 1024 * 1024,       // 50 MB
  BASIC: 100 * 1024 * 1024,     // 100 MB
  PRO: 250 * 1024 * 1024,       // 250 MB
  ENTERPRISE: 500 * 1024 * 1024 // 500 MB
};

// Helper to get limit based on level
export const getStorageLimit = (level) => {
  // Level mapping from KeyAuth: 0=Free, 1=Basic, 2=Pro, 4=Dev/Enterprise
  const levelNum = Number(level) || 0;
  if (levelNum >= 4) return STORAGE_LIMITS.ENTERPRISE;
  if (levelNum >= 2) return STORAGE_LIMITS.PRO;
  if (levelNum >= 1) return STORAGE_LIMITS.BASIC;
  return STORAGE_LIMITS.FREE;
};

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
    let email = identifier;
    
    // S'il n'y a pas d'@, on considère que c'est un pseudo
    if (identifier && !identifier.includes('@')) {
        const { data: foundEmail, error: rpcError } = await supabase.rpc('get_email_by_pseudo', { p_pseudo: identifier });
        if (rpcError || !foundEmail) {
            return { error: { message: "Ce pseudo n'existe pas ou l'identifiant est incorrect." } };
        }
        email = foundEmail;
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
    return await supabase.auth.signOut();
  },

  async getUser() {
    try {
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
    
    let combinedData = Array.from(allNotesMap.values());
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

    // Format note for DB (remove local-only constructs if any)
    const dbNote = {
      id: note.id,
      user_id: user.id,
      title: note.title,
      content: note.content,
      attachments: note.attachments || [],
      is_favorite: note.favorite || false,
      tags: note.tags || [],
      badges: note.badges || [],
      deleted: note.deleted || false,
      updated_at: new Date(note.updatedAt || Date.now()).toISOString()
    };

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

    // Generate a random slug
    const slug = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

    const { data, error } = await supabase
      .from('notes')
      .update({ public_slug: slug, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .eq('user_id', user.id) // Ensure ownership
      .select()
      .single();

    return { data, error };
  },

  async unpublishNote(noteId) {
    const user = await authService.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('notes')
      .update({ public_slug: null, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .eq('user_id', user.id)
      .select()
      .single();

    return { data, error };
  },

  async getPublicNote(slug) {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('public_slug', slug)
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

      const { data, error } = await supabase
          .from('user_settings')
          .select('config')
          .eq('user_id', user.id)
          .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
           console.error('Error fetching settings:', error);
      }

      const settings = data?.config || {};
      await AsyncStorage.setItem('fiip-settings', JSON.stringify(settings));
      return { data: settings, error };
  },

  async saveSettings(settings) {
      const user = await authService.getUser();
      if (!user) return { error: 'Not authenticated' };

      const { error } = await supabase
          .from('user_settings')
          .upsert({ user_id: user.id, config: settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      
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

    let totalSize = 0;
    let page = 0;
    const pageSize = 100;
    let hasMore = true;

    try {
      while (hasMore) {
        const { data: rootItems, error: rootError } = await supabase
          .storage
          .from('attachments')
          .list(`${userId}`, {
            limit: pageSize,
            offset: page * pageSize,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (rootError) throw rootError;

        if (!rootItems || rootItems.length === 0) {
          hasMore = false;
        } else {
            // Parallel fetch for folder contents
            const sizePromises = rootItems.map(async (item) => {
                // Check if folder (no metadata or size 0 usually indicates folder in Supabase storage list)
                if (!item.metadata || !item.metadata.size) {
                    // It's a folder (Note ID) -> List contents
                    const { data: folderFiles, error: folderError } = await supabase
                        .storage
                        .from('attachments')
                        .list(`${userId}/${item.name}`, {
                            limit: 1000,
                            sortBy: { column: 'name', order: 'asc' }
                        });
                    
                    if (!folderError && folderFiles) {
                         return folderFiles.reduce((acc, file) => acc + (file.metadata ? file.metadata.size : 0), 0);
                    }
                    return 0;
                } else {
                    // It's a file at root level
                    return (item.metadata ? item.metadata.size : 0);
                }
            });

            const sizes = await Promise.all(sizePromises);
            totalSize += sizes.reduce((acc, s) => acc + s, 0);

            page++;
            if (page > 50) hasMore = false; 
        }
      }
    } catch (e) {
      console.error("Error calculating usage:", e);
      return totalSize; // Return what we found so far
    }

    return totalSize;
  },

  // --- Storage (Attachments) ---
  async uploadAttachment(file, path) {
    // 1. Check Usage
    const user = await authService.getUser();
    if (!user) return { error: 'Not authenticated' };
    
    const currentUsage = await this.getUsage(user.id);
    const level = user?.user_metadata?.subscription_level || 0;
    const limit = getStorageLimit(level);

    if (currentUsage + file.size > limit) {
      return { error: new Error("STORAGE_LIMIT_EXCEEDED") };
    }
    
    // Path should be: {userId}/{noteId}/{filename}
    // We should use 'attachments' bucket
    const { data, error } = await supabase
        .storage
        .from('attachments')
        .upload(path, file, {
            upsert: true
        });

    if (error) return { error };

    const { data: publicUrlData } = supabase
        .storage
        .from('attachments')
        .getPublicUrl(path);

    return { data: { path: data.path, publicUrl: publicUrlData.publicUrl }, error: null };
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

  async downloadFile(userId, path) {
      const finalPath = path.startsWith(userId) ? path : `${userId}/${path}`;
      const { data, error } = await supabase
        .storage
        .from('attachments')
        .download(finalPath);
  
      if (error) throw error;
      return await data.text();
  },

  getPublicUrl(userId, path) {
    const finalPath = path.startsWith(userId) ? path : `${userId}/${path}`;
    const { data } = supabase.storage.from('attachments').getPublicUrl(finalPath);
    return data.publicUrl;
  }
};