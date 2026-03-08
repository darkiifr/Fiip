
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase URL or Key missing in environment variables.");
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

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
          subscription_level: 0 // Default to Free
        }
      }
    });

    if (!error && data.user) {
        // Create initial profile if trigger fails or delayed
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ id: data.user.id, username, updated_at: new Date() }, { onConflict: 'id' });
            
        if (profileError) console.error("Error creating profile:", profileError);
    }
    return { data, error };
  },

  async signIn(email, password) {
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
        skipBrowserRedirect: true
      }
    });
    return { data, error };
  },

  async signOut() {
    return await supabase.auth.signOut();
  },

  async getUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session.user;

    const { data: { user } } = await supabase.auth.getUser();
    return user;
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

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching notes:', error);
        // Fallback to local storage if offline/error
        const local = localStorage.getItem('fiip-notes');
        return { data: local ? JSON.parse(local) : [], error };
    }

    // Map DB fields back to what the frontend expects
    const mappedData = data.map(n => ({
      ...n,
      favorite: n.is_favorite,
      updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : Date.now(),
      badges: n.badges || [],
      deleted: n.deleted || false
    }));

    // Update local cache
    localStorage.setItem('fiip-notes', JSON.stringify(mappedData));
    return { data: mappedData, error };
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
      .update({ public_slug: slug, updated_at: new Date() })
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
      .update({ public_slug: null, updated_at: new Date() })
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

  // --- Profile ---
  async fetchProfile() {
      const user = await authService.getUser();
      if (!user) return { data: null, error: 'Not authenticated' };

      const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
      
      return { data, error };
  },

  async saveProfile(profile) {
      const user = await authService.getUser();
      if (!user) return { error: 'Not authenticated' };

      const { error } = await supabase
          .from('profiles')
          .upsert({ id: user.id, ...profile, updated_at: new Date() }, { onConflict: 'id' });

      return { error };
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
      localStorage.setItem('fiip-settings', JSON.stringify(settings));
      return { data: settings, error };
  },

  async saveSettings(settings) {
      const user = await authService.getUser();
      if (!user) return { error: 'Not authenticated' };

      const { error } = await supabase
          .from('user_settings')
          .upsert({ user_id: user.id, config: settings, updated_at: new Date() }, { onConflict: 'user_id' });
      
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
