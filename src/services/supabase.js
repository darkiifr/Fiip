
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
    const { data } = await supabase.auth.getUser();
    return data.user;
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
  }
};

// Storage Services
export const storageService = {
  async getUsage(userId) {
    // Note: Supabase Storage doesn't have a direct "folder size" API without listing.
    // We will estimate or rely on a database tracker if available.
    // For now, we'll list files in the user's folder and sum size.
    // This assumes a structure: 'user_files/{userId}/*'
    
    if (!userId) return 0;

    let totalSize = 0;
    let page = 0;
    let pageSize = 100;
    let hasMore = true;

    try {
      while (hasMore) {
        const { data, error } = await supabase
          .storage
          .from('user_files')
          .list(`${userId}`, {
            limit: pageSize,
            offset: page * pageSize,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (error) throw error;

        if (data.length === 0) {
          hasMore = false;
        } else {
          totalSize += data.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);
          page++;
          // Safety break for very large folders to avoid freezing
          if (page > 50) hasMore = false; 
        }
      }
    } catch (e) {
      console.error("Error calculating usage:", e);
      return 0; // Fail safe
    }

    return totalSize;
  },

  async uploadFile(userId, file, path) {
    // 1. Check Usage
    const currentUsage = await this.getUsage(userId);
    const user = await authService.getUser();
    const level = user?.user_metadata?.subscription_level || 0;
    const limit = getStorageLimit(level);

    if (currentUsage + file.size > limit) {
      throw new Error("STORAGE_LIMIT_EXCEEDED");
    }

    // 2. Upload
    const { data, error } = await supabase
      .storage
      .from('user_files')
      .upload(`${userId}/${path}`, file, {
        upsert: true
      });

    if (error) throw error;
    return data;
  },

  async downloadFile(userId, path) {
    const { data, error } = await supabase
      .storage
      .from('user_files')
      .download(`${userId}/${path}`);

    if (error) throw error;
    return await data.text(); // Assuming text/json for data.json
  },

  getPublicUrl(userId, path) {
    // If path starts with userId, it's already full path (from upload response)
    // Otherwise prepend userId (relative path)
    const finalPath = path.startsWith(userId) ? path : `${userId}/${path}`;
    const { data } = supabase.storage.from('user_files').getPublicUrl(finalPath);
    return data.publicUrl;
  }
};
