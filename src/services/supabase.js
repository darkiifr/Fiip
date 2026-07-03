
import { createClient } from '@supabase/supabase-js';

import {
  buildSearchIndexEntry,
  canUseNoteContent,
  createTask,
  defaultHomeWidgets,
  normalizeAttachment,
  normalizeNotebook,
  normalizeNoteForV1,
  sanitizeClipperPayload,
} from './fiipV1';
import { serializeNoteTags } from '../utils/noteTags';
import { canAttachFile, canCreateNote, getStorageLimit, resolvePlanLevel } from './planLimits';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const OAUTH_BROWSER_CALLBACK_PATH = '/auth/callback';
const FIIP_DEVICE_ID_KEY = 'fiip-device-id';
const PLACEHOLDER_SUPABASE_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.xxxxx';
const SUPABASE_CONFIG_ERROR = "Configuration Supabase manquante. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY avant d'utiliser la connexion Google.";

export function hasUsableSupabaseConfig(url = SUPABASE_URL, anonKey = SUPABASE_ANON_KEY) {
  const normalizedUrl = String(url || '').trim();
  const normalizedKey = String(anonKey || '').trim();

  if (!normalizedUrl || !normalizedKey) {
    return false;
  }

  try {
    if (new URL(normalizedUrl).hostname === 'placeholder.supabase.co') {
      return false;
    }
  } catch {
    return false;
  }

  return normalizedKey !== PLACEHOLDER_SUPABASE_ANON_KEY && !normalizedKey.endsWith('.xxxxx');
}

export const isSupabaseConfigured = hasUsableSupabaseConfig();

function getSupabaseConfigError() {
  return { message: SUPABASE_CONFIG_ERROR, code: 'SUPABASE_CONFIG_MISSING' };
}

if (!isSupabaseConfigured) {
  console.warn("Supabase URL or Key missing in environment variables.");
}

export const supabase = createClient(
  isSupabaseConfigured ? SUPABASE_URL.trim() : PLACEHOLDER_SUPABASE_URL,
  isSupabaseConfigured ? SUPABASE_ANON_KEY.trim() : PLACEHOLDER_SUPABASE_ANON_KEY
);

export { getStorageLimit };

export function getOAuthRedirectUrl() {
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
    return 'fiip://login-callback';
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(OAUTH_BROWSER_CALLBACK_PATH, window.location.origin).toString();
  }

  return 'fiip://login-callback';
}

export function getSyncedSettings(settings = {}) {
  const syncedSettings = { ...(settings || {}), theme: 'dark' };
  delete syncedSettings.windowEffect;
  delete syncedSettings.titlebarStyle;
  delete syncedSettings.audioInputId;
  delete syncedSettings.audioOutputId;
  delete syncedSettings.biometricLockEnabled;
  return syncedSettings;
}

function getCurrentDeviceId() {
  let id = localStorage.getItem(FIIP_DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(FIIP_DEVICE_ID_KEY, id);
  }
  return id;
}

function getCurrentDeviceName() {
  const platform = navigator.userAgentData?.platform || navigator.platform || 'Unknown OS';
  const appSurface = typeof window !== 'undefined' && window.__TAURI_INTERNALS__ ? 'Fiip Desktop' : 'Fiip Web';
  return `${appSurface} - ${platform}`;
}

function readLocalSettings() {
  try {
    return JSON.parse(localStorage.getItem('fiip-settings') || '{}') || {};
  } catch {
    return {};
  }
}

async function getPublicIpAddress() {
  if (typeof fetch !== 'function') {
    return null;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 2500) : null;

  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller?.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.ip || null;
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

// Auth Services
export const authService = {
  async signUp(email, password, username) {
    if (!isSupabaseConfigured) {
      return { data: null, error: getSupabaseConfigError() };
    }

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
            
        if (profileError) {console.error("Error creating profile:", profileError);}
    }
    return { data, error };
  },

  async signIn(identifier, password) {
    if (!isSupabaseConfigured) {
      return { data: null, error: getSupabaseConfigError() };
    }

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
    if (!isSupabaseConfigured) {
      return { data: null, error: getSupabaseConfigError() };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: getOAuthRedirectUrl(),
        skipBrowserRedirect: true
      }
    });
    return { data, error };
  },

  async completeOAuthCallback(callbackUrl) {
    if (!isSupabaseConfigured) {
      return { data: null, error: getSupabaseConfigError() };
    }

    const parsedUrl = new URL(callbackUrl);
    const params = new URLSearchParams(parsedUrl.search);
    const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
    const code = params.get('code') || hashParams.get('code');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (code) {
      return await supabase.auth.exchangeCodeForSession(code);
    }

    if (accessToken && refreshToken) {
      return await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }

    return { data: null, error: { message: 'Callback Google incomplet.' } };
  },

  async signOut() {
    dataService.markCurrentDeviceOffline().catch(() => {});
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
    if (!user) {return false;}
    
    try {
      const validateLogic = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('last_session_validated')
          .eq('id', user.id)
          .single();
          
        if (!data?.last_session_validated) {return false;}
        
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

  async getPlanLevel(user = null) {
    const currentUser = user || await this.getUser();
    if (!currentUser) {return 0;}

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan_level, subscription_level')
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
    if (!user) {return { data: [], error: 'Not authenticated' };}

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
        const local = localStorage.getItem('fiip-notes');
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
    
    const combinedData = Array.from(allNotesMap.values());
    combinedData.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    // Map DB fields back to what the frontend expects
    const mappedData = combinedData.map(n => normalizeNoteForV1({
      ...n,
      favorite: n.is_favorite,
      updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : Date.now(),
      tags: serializeNoteTags(n.tags || []),
      badges: n.badges || [],
      deleted: n.deleted || Boolean(n.deleted_at),
      shared: n.shared || false
    }));

    // Preserve local trashed notes
    const localStr = localStorage.getItem('fiip-notes');
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
    localStorage.setItem('fiip-notes', JSON.stringify(finalData));
    return { data: finalData, error: null };
  },

  async saveNote(note) {
    const user = await authService.getUser();
    if (!user) {return { error: 'Not authenticated' };}
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

    // Format note for DB (remove local-only constructs if any)
    const normalized = normalizeNoteForV1(note);
    const dbNote = {
      id: normalized.id,
      user_id: user.id,
      title: normalized.title,
      content: normalized.isProtected ? '' : normalized.content,
      encrypted_content: normalized.encryptedContent,
      notebook_id: normalized.notebookId === 'all-notes' ? null : normalized.notebookId,
      folder_id: normalized.notebookId === 'all-notes' ? null : normalized.notebookId,
      attachments: normalized.attachments || [],
      is_favorite: normalized.favorite || false,
      is_locked: normalized.isProtected,
      password_hint: normalized.security?.hint || '',
      tags: serializeNoteTags(normalized.tags || []),
      badges: normalized.badges || [],
      deleted: normalized.deleted || false,
      deleted_at: normalized.deleted_at || null,
      conflict_of: normalized.conflictOf || null,
      updated_at: new Date(normalized.updatedAt || Date.now()).toISOString()
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

    if (!error && canUseNoteContent(normalized, 'search')) {
      await this.upsertSearchIndex(normalized).catch((indexError) => {
        console.warn('Search index update failed:', indexError);
      });
    }

    return { data, error };
  },

  async deleteNote(noteId) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}

      const { error } = await supabase
          .from('notes')
          .delete()
          .eq('id', noteId);

      return { error };
  },

  // --- Public Sharing ---
  async publishNote(noteId) {
    const user = await authService.getUser();
    if (!user) {return { error: 'Not authenticated' };}
    const level = await authService.getPlanLevel(user);
    if (level < 1) {
      return { error: 'FREE_PUBLIC_SHARE_DISABLED' };
    }

    const { data: existingNote, error: readError } = await supabase
      .from('notes')
      .select('id, is_locked, encrypted_content')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (readError) {
      return { error: readError };
    }

    if (existingNote && !canUseNoteContent(existingNote, 'public-share')) {
      return { error: 'Les notes protegees ne peuvent pas etre publiees.' };
    }

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
    if (!user) {return { error: 'Not authenticated' };}

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
          .select('*')
          .eq('note_id', noteId);

      if (error || !data?.length) {
          return { data: data || [], error };
      }

      const userIds = data.map((collaborator) => collaborator.user_id).filter(Boolean);
      if (userIds.length === 0) {
          return { data, error: null };
      }

      try {
          const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, username, nickname, avatar_url')
              .in('id', userIds);

          if (profilesError) {
              return { data, error: null };
          }

          const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
          return {
              data: data.map((collaborator) => ({
                  ...collaborator,
                  profiles: profilesById.get(collaborator.user_id) || null,
              })),
              error: null,
          };
      } catch {
          return { data, error: null };
      }
  },

  async addCollaborator(noteId, username, role = 'viewer') {
      const user = await authService.getUser();
      const level = await authService.getPlanLevel(user);
      if (level < 1) {
          return { error: 'FREE_COLLABORATION_DISABLED' };
      }

      const { data: existingNote } = await supabase
          .from('notes')
          .select('id, user_id, is_locked, encrypted_content')
          .eq('id', noteId)
          .single();

      if (existingNote && !canUseNoteContent(existingNote, 'collaboration')) {
          return { error: 'Les notes protegees ne peuvent pas etre partagees en collaboration.' };
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
      if (!user) {return { data: null, error: 'Not authenticated' };}

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
      
      const metadataName = user.user_metadata?.nickname || user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.username || user.email?.split('@')[0] || 'Utilisateur';
      const metadataAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

      // Sync legacy or OAuth metadata when useful fields are missing.
      if (data && (!data.nickname || !data.avatar_url)) {
          const updatedProfile = {
              ...data,
              nickname: data.nickname || data.username || metadataName,
              avatar_url: data.avatar_url || metadataAvatar,
              username: data.username || metadataName,
          };
          const { data: fixedData } = await supabase.from('profiles').upsert(updatedProfile, { onConflict: 'id' }).select().single();
          return { data: fixedData, error: null };
      }
      
      return { data, error };
  },

  async saveProfile(profile) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}

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
      if (!user) {return { error: new Error('Not authenticated') };}

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });

      if (uploadError) {return { error: uploadError };}

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
      if (!noteId) {return null;}
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
          if (onPresenceSync) {onPresenceSync(state);}
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
      if (!user) {return { data: {}, error: 'Not authenticated' };}

      const { data, error } = await supabase
          .from('user_settings')
          .select('config')
          .eq('user_id', user.id)
          .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
           console.error('Error fetching settings:', error);
      }

      const localSettings = readLocalSettings();
      const settings = {
          ...(data?.config || {}),
          windowEffect: localSettings.windowEffect,
          titlebarStyle: localSettings.titlebarStyle,
          audioInputId: localSettings.audioInputId,
          audioOutputId: localSettings.audioOutputId,
          biometricLockEnabled: localSettings.biometricLockEnabled,
          theme: 'dark',
      };
      localStorage.setItem('fiip-settings', JSON.stringify(settings));
      return { data: settings, error };
  },

  async saveSettings(settings) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}

      const { error } = await supabase
          .from('user_settings')
          .upsert({ user_id: user.id, config: getSyncedSettings(settings), updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      
      return { error };
  },

  async registerCurrentDevice() {
      const user = await authService.getUser();
      if (!user) {return { data: null, error: 'Not authenticated' };}

      const payload = {
          id: getCurrentDeviceId(),
          user_id: user.id,
          name: getCurrentDeviceName(),
          platform: navigator.userAgentData?.platform || navigator.platform || 'unknown',
          user_agent: navigator.userAgent || '',
          ip_address: await getPublicIpAddress(),
          last_seen_at: new Date().toISOString(),
          revoked_at: null,
      };

      const { data, error } = await supabase
          .from('user_devices')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();

      return { data, error };
  },

  async listDevices() {
      const user = await authService.getUser();
      if (!user) {return { data: [], error: 'Not authenticated' };}

      const { data, error } = await supabase
          .from('user_devices')
          .select('*')
          .eq('user_id', user.id)
          .is('revoked_at', null)
          .order('last_seen_at', { ascending: false });

      return { data: data || [], error };
  },

  async revokeDevice(deviceId) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}

      const { error } = await supabase
          .from('user_devices')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', deviceId)
          .eq('user_id', user.id);

      return { error };
  },

  async markCurrentDeviceOffline() {
      const user = await authService.getUser();
      if (!user) {return { error: null };}

      const { error } = await supabase
          .from('user_devices')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', getCurrentDeviceId())
          .eq('user_id', user.id);

      return { error };
  },

  async getUsage(userId) {
    if (!userId) {
        if (typeof authService !== 'undefined' && authService.getUser) {
             const user = await authService.getUser();
             if (user) {userId = user.id;}
        }
        if (!userId) {return 0;}
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

        if (rootError) {throw rootError;}

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
            if (page > 50) {hasMore = false;} 
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
    if (!user) {return { error: 'Not authenticated' };}
    
    const currentUsage = await this.getUsage(user.id);
    const level = await authService.getPlanLevel(user);

    if (!canAttachFile({ level, currentUsage, fileSize: file.size, attachmentCount: 0 })) {
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

    if (error) {return { error };}

    const { data: signedUrlData } = await supabase
        .storage
        .from('attachments')
        .createSignedUrl(path, 60 * 60);

    return { data: { path: data.path, signedUrl: signedUrlData?.signedUrl || '' }, error: null };
  },

  // --- Fiip V1 foundation ---
  async fetchNotebooks() {
      const user = await authService.getUser();
      if (!user) {return { data: [normalizeNotebook()], error: 'Not authenticated' };}

      const { data, error } = await supabase
          .from('notebooks')
          .select('*')
          .is('deleted_at', null)
          .order('sort_order', { ascending: true })
          .order('updated_at', { ascending: false });

      const notebooks = (data || []).map(normalizeNotebook);
      return { data: [normalizeNotebook(), ...notebooks], error };
  },

  async saveNotebook(notebook) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}

      const normalized = normalizeNotebook({ ...notebook, user_id: user.id });
      const { data, error } = await supabase
          .from('notebooks')
          .upsert(normalized, { onConflict: 'id' })
          .select()
          .single();

      return { data: data ? normalizeNotebook(data) : null, error };
  },

  async deleteNotebook(notebookId) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}
      if (!notebookId || notebookId === 'all-notes') {
          return { error: 'Cannot delete default notebook' };
      }

      const deletedAt = new Date().toISOString();
      const { error } = await supabase
          .from('notebooks')
          .update({ deleted_at: deletedAt, updated_at: deletedAt })
          .eq('id', notebookId)
          .eq('user_id', user.id);

      return { data: { id: notebookId, deleted_at: deletedAt }, error };
  },

  async fetchTasks() {
      const user = await authService.getUser();
      if (!user) {return { data: [], error: 'Not authenticated' };}

      const { data, error } = await supabase
          .from('note_tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('due_at', { ascending: true, nullsFirst: false });

      return { data: (data || []).map(createTask), error };
  },

  async saveTask(task) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}

      const normalized = createTask({ ...task, user_id: user.id });
      const { data, error } = await supabase
          .from('note_tasks')
          .upsert({ ...normalized, user_id: user.id }, { onConflict: 'id' })
          .select()
          .single();

      return { data: data ? createTask(data) : null, error };
  },

  async deleteTask(taskId) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}

      const { error } = await supabase
          .from('note_tasks')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('id', taskId)
          .eq('user_id', user.id);

      return { error };
  },

  async upsertAttachmentMetadata(noteId, attachment) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}

      const normalized = normalizeAttachment(attachment, noteId);
      const payload = {
          id: normalized.id,
          note_id: noteId,
          user_id: user.id,
          name: normalized.name,
          type: normalized.type,
          mime_type: normalized.mimeType,
          size_bytes: normalized.size,
          storage_path: normalized.path || normalized.cachePath || `${user.id}/${noteId}/${normalized.name}`,
          previewable: normalized.previewable,
          ocr_text: normalized.ocrText || '',
          ocr_status: normalized.ocrText ? 'complete' : 'pending',
          updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
          .from('note_attachments')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();

      return { data, error };
  },

  async upsertSearchIndex(note, { tasks = [], attachmentTexts = [] } = {}) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}

      const normalized = normalizeNoteForV1(note);
      if (!canUseNoteContent(normalized, 'search')) {
          return { data: null, error: null, skipped: true };
      }

      const entry = buildSearchIndexEntry(normalized, { tasks, attachmentTexts, ocrStatus: 'complete' });
      const { data, error } = await supabase
          .from('note_search_index')
          .upsert({
              note_id: entry.note_id,
              user_id: user.id,
              title: entry.title,
              search_text: entry.searchText,
              syncable: entry.syncable,
              ocr_status: entry.ocrStatus,
              updated_at: entry.updated_at,
          }, { onConflict: 'note_id' })
          .select()
          .single();

      return { data, error };
  },

  async fetchHomeWidgets() {
      const user = await authService.getUser();
      if (!user) {return { data: defaultHomeWidgets(), error: 'Not authenticated' };}

      const { data, error } = await supabase
          .from('home_widgets')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true });

      if (!data?.length) {
          return { data: defaultHomeWidgets(), error };
      }

      return {
          data: data.map((widget) => ({
              id: widget.widget_id,
              enabled: widget.enabled,
              order: widget.sort_order,
              config: widget.config || {},
          })),
          error,
      };
  },

  async createNoteFromClipper(payload) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}

      const clip = sanitizeClipperPayload(payload);
      const now = Date.now();
      const note = normalizeNoteForV1({
          id: crypto.randomUUID(),
          user_id: user.id,
          title: clip.title,
          content: `${clip.html}<p><a href="${clip.url}" rel="noreferrer">Source: ${clip.source}</a></p>`,
          tags: ['Web clip'],
          attachments: clip.images.map((url, index) => ({
              id: crypto.randomUUID(),
              name: `capture-${index + 1}.png`,
              type: 'image',
              url,
              previewable: true,
          })),
          createdAt: now,
          updatedAt: now,
      });

      return this.saveNote(note);
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
  
      if (error) {throw error;}
      return await data.text();
  },

  getPublicUrl(userId, path) {
    const finalPath = path.startsWith(userId) ? path : `${userId}/${path}`;
    const { data } = supabase.storage.from('attachments').getPublicUrl(finalPath);
    return data.publicUrl;
  }
};
