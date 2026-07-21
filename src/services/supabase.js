
import { createClient } from '@supabase/supabase-js';

import { FIIP_ACCOUNT_PORTAL_URL } from '../config/links';
import { serializeNoteTags } from '../utils/noteTags';

import {
  decryptNoteFromCloud,
  decryptSettingsEnvelope,
  encryptNoteForCloud,
  encryptSettingsEnvelope,
} from './cloudEncryption';
import { normalizeError } from './errorMessages';
import {
  getExternalIdentityUser,
  hasExternalIdentityProvider,
  signOutExternalIdentity,
} from './externalIdentity';
import {
  canUseNoteContent,
  createTask,
  defaultHomeWidgets,
  normalizeAttachment,
  normalizeNotebook,
  normalizeNoteForV1,
  sanitizeClipperPayload,
} from './fiipV1';
import { canAttachFile, canCreateNote, getStorageLimit, resolvePlanLevel } from './planLimits';
import { decryptBlob, encryptSensitiveJson } from './zeroKnowledge';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const OAUTH_BROWSER_CALLBACK_PATH = '/auth/callback';
const FIIP_DEVICE_ID_KEY = 'fiip-device-id';
const PENDING_SETTINGS_SYNC_KEY = 'fiip-pending-settings-sync-v2';
const PLACEHOLDER_SUPABASE_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.xxxxx';
const SUPABASE_CONFIG_ERROR = "Configuration Supabase manquante. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY avant d'utiliser la connexion au compte Fiip.";
const oauthCallbacksInFlight = new Map();
const successfulOAuthCallbacks = new Set();
let accessTokenProvider = null;

async function identityAwareFetch(input, init = {}) {
  if (!accessTokenProvider) {
    return fetch(input, init);
  }
  const token = await accessTokenProvider();
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

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
  isSupabaseConfigured ? SUPABASE_ANON_KEY.trim() : PLACEHOLDER_SUPABASE_ANON_KEY,
  {
    global: {
      fetch: identityAwareFetch,
    },
    auth: {
      experimental: {
        passkey: true,
      },
    },
  }
);

export { getStorageLimit };

export function setSupabaseAccessTokenProvider(provider) {
  accessTokenProvider = typeof provider === 'function' ? provider : null;
}

export function getOAuthRedirectUrl() {
  if (isTauriRuntime()) {
    return new URL('/auth/callback', FIIP_ACCOUNT_PORTAL_URL).toString();
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

function getBrowserName(userAgent = navigator.userAgent || '') {
  const value = String(userAgent || '');
  if (/Edg\//.test(value)) {
    return 'Microsoft Edge';
  }
  if (/OPR\//.test(value)) {
    return 'Opera';
  }
  if (/Firefox\//.test(value)) {
    return 'Firefox';
  }
  if (/Chrome\//.test(value)) {
    return 'Chrome';
  }
  if (/Safari\//.test(value)) {
    return 'Safari';
  }
  return 'Navigateur inconnu';
}

function serializeUserDevice(device) {
  const currentDeviceId = getCurrentDeviceId();
  const currentDeviceName = getCurrentDeviceName();
  const currentPlatform = navigator.userAgentData?.platform || navigator.platform || '';
  const currentUserAgent = navigator.userAgent || '';
  const platform = device.platform || 'unknown';
  const userAgent = device.user_agent || '';
  const surface = /Fiip Desktop/i.test(device.name || '') ? 'Desktop' : 'Web';
  const matchesCurrentSignature = (
      device.name === currentDeviceName &&
      platform === currentPlatform &&
      userAgent === currentUserAgent
  );

  return {
      ...device,
      is_current: device.id === currentDeviceId || matchesCurrentSignature,
      surface,
      browser: getBrowserName(userAgent),
      platform_label: platform,
      last_seen_label: device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : '',
  };
}

function readLocalSettings() {
  try {
    return JSON.parse(localStorage.getItem('fiip-settings') || '{}') || {};
  } catch {
    return {};
  }
}

function readPendingSettingsSync() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_SETTINGS_SYNC_KEY) || 'null');
  } catch {
    return null;
  }
}

async function invokeSettingsSync(payload) {
  const { data, error } = await supabase.functions.invoke('sync-settings', { body: payload });
  if (error) {throw error;}
  return data;
}

async function flushPendingSettingsSync() {
  const pending = readPendingSettingsSync();
  if (!pending) {return;}
  await invokeSettingsSync(pending);
  localStorage.removeItem(PENDING_SETTINGS_SYNC_KEY);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushPendingSettingsSync().catch((error) => {
      console.warn('Pending encrypted settings sync failed:', error);
    });
  });
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
    if (!response.ok) {return null;}
    const payload = await response.json();
    return payload?.ip || null;
  } catch {
    return null;
  } finally {
    if (timeout) {clearTimeout(timeout);}
  }
}

// Auth Services
function normalizeAuthError(error) {
  if (!error) {return error;}
  return normalizeError(error, 'Connexion Fiip impossible pour le moment.');
}

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
    return { data, error: normalizeAuthError(error) };
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
      password,
    });
    return { data, error: normalizeAuthError(error) };
  },

  async sendPasswordReset(email) {
    if (!isSupabaseConfigured) {
      return { data: null, error: getSupabaseConfigError() };
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(String(email || '').trim(), {
      redirectTo: getOAuthRedirectUrl(),
    });
    return { data, error: normalizeAuthError(error) };
  },

  async sendEmailCode(email) {
    if (!isSupabaseConfigured) {
      return { data: null, error: getSupabaseConfigError() };
    }

    const { data, error } = await supabase.auth.signInWithOtp({
      email: String(email || '').trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: getOAuthRedirectUrl(),
      },
    });
    return { data, error: normalizeAuthError(error) };
  },

  async verifyEmailOtp(email, token) {
    if (!isSupabaseConfigured) {
      return { data: null, error: getSupabaseConfigError() };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: String(email || '').trim(),
      token: String(token || '').trim(),
      type: 'email',
    });
    return { data, error: normalizeAuthError(error) };
  },

  async signInWithOAuth(provider) {
    if (!isSupabaseConfigured) {
      return { data: null, error: getSupabaseConfigError() };
    }

    if (provider !== 'google') {
      return { data: null, error: { code: 'OAUTH_PROVIDER_NOT_ALLOWED', message: 'Seule la connexion Google est autorisée.' } };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectUrl(),
        skipBrowserRedirect: true
      }
    });
    return { data, error };
  },

  async linkGoogleIdentity() {
    if (!isSupabaseConfigured) {
      return { data: null, error: getSupabaseConfigError() };
    }

    if (typeof supabase.auth.linkIdentity !== 'function') {
      return { data: null, error: { message: 'La liaison Google n’est pas disponible dans cette version Supabase.' } };
    }

    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectUrl(),
        skipBrowserRedirect: true,
      },
    });
    return { data, error };
  },

  async completeOAuthCallback(callbackUrl) {
    if (!isSupabaseConfigured) {
      return { data: null, error: getSupabaseConfigError() };
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(callbackUrl);
    } catch {
      return { data: null, error: { code: 'OAUTH_CALLBACK_INVALID', message: 'URL de callback Google invalide.' } };
    }
    if (parsedUrl.protocol !== 'fiip:' || parsedUrl.hostname !== 'login-callback' || parsedUrl.username || parsedUrl.password || parsedUrl.port || (parsedUrl.pathname && parsedUrl.pathname !== '/')) {
      return { data: null, error: { code: 'OAUTH_CALLBACK_INVALID', message: 'URL de callback Google refusée.' } };
    }

    const callbackKey = parsedUrl.toString();
    if (successfulOAuthCallbacks.has(callbackKey)) {return { data: null, error: null };}
    if (oauthCallbacksInFlight.has(callbackKey)) {
      const result = await oauthCallbacksInFlight.get(callbackKey);
      return { ...result, handled: false };
    }

    const params = new URLSearchParams(parsedUrl.search);
    const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
    const oauthError = params.get('error') || hashParams.get('error');
    if (oauthError) {
      return {
        data: null,
        error: {
          code: oauthError,
          message: params.get('error_description') || hashParams.get('error_description') || 'Connexion Google refusée.',
        },
      };
    }
    const code = params.get('code') || hashParams.get('code');
    const accessToken = params.get('access_token') || hashParams.get('access_token');
    const refreshToken = params.get('refresh_token') || hashParams.get('refresh_token');

    let callbackPromise;
    if (code) {
      callbackPromise = supabase.auth.exchangeCodeForSession(code);
    } else if (accessToken && refreshToken) {
      callbackPromise = supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } else {
      return { data: null, error: { message: 'Callback Google incomplet.' } };
    }

    oauthCallbacksInFlight.set(callbackKey, callbackPromise);
    try {
      const result = await callbackPromise;
      if (!result?.error) {
        successfulOAuthCallbacks.add(callbackKey);
        if (result?.data?.session?.user) {
          await dataService.fetchProfile().catch((profileError) => {
            console.warn('Could not sync OAuth profile:', profileError);
          });
        }
      }
      return { ...result, handled: !result?.error };
    } finally {
      oauthCallbacksInFlight.delete(callbackKey);
    }
  },

  async signInWithPasskey() {
    if (!isSupabaseConfigured) {
      return { data: null, error: getSupabaseConfigError() };
    }
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return { data: null, error: normalizeAuthError({ code: 'PASSKEY_UNSUPPORTED', message: 'Les passkeys ne sont pas disponibles sur cet appareil.' }) };
    }
    if (typeof supabase.auth.signInWithPasskey !== 'function') {
      return { data: null, error: normalizeAuthError({ code: 'PASSKEY_API_MISSING', message: 'Les passkeys ne sont pas encore disponibles dans cette version Supabase.' }) };
    }

    const { data, error } = await supabase.auth.signInWithPasskey();
    return { data, error: normalizeAuthError(error) };
  },

  async registerPasskey() {
    if (!isSupabaseConfigured) {
      return { data: null, error: getSupabaseConfigError() };
    }
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return { data: null, error: normalizeAuthError({ code: 'PASSKEY_UNSUPPORTED', message: 'Les passkeys ne sont pas disponibles sur cet appareil.' }) };
    }
    if (typeof supabase.auth.registerPasskey !== 'function') {
      return { data: null, error: normalizeAuthError({ code: 'PASSKEY_API_MISSING', message: 'Les passkeys ne sont pas encore disponibles dans cette version Supabase.' }) };
    }

    const { data, error } = await supabase.auth.registerPasskey();
    return { data, error: normalizeAuthError(error) };
  },

  async signOut() {
    dataService.markCurrentDeviceOffline().catch(() => {});
    if (hasExternalIdentityProvider()) {
      await signOutExternalIdentity();
      return { error: null };
    }
    return await supabase.auth.signOut();
  },

  async getUser() {
    try {
      const externalUser = await getExternalIdentityUser();
      if (externalUser) {
        return externalUser;
      }
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

    const decryptedData = await Promise.all(combinedData.map(async (note) => {
      try {
        return await decryptNoteFromCloud(note);
      } catch (error) {
        console.warn('Encrypted note could not be unlocked:', note.id, error);
        return {
          ...note,
          title: 'Note chiffrée verrouillée',
          content: '',
          attachments: [],
          tags: [],
          badges: [],
          isLockedByEncryption: true,
        };
      }
    }));

    // Map decrypted fields back to what the frontend expects.
    const mappedData = decryptedData.map(n => normalizeNoteForV1({
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

    // Encrypt private fields before the first network write.
    const normalized = normalizeNoteForV1(note);
    const dbNote = await encryptNoteForCloud({
      ...normalized,
      tags: serializeNoteTags(normalized.tags || []),
    }, { userId: user.id });
    const { data, error } = await supabase
      .from('notes')
      .upsert(dbNote, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
        console.error('Error saving note:', error);
        return { error };
    }

    return { data: data ? normalizeNoteForV1({ ...normalized, ...data }) : normalized, error };
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

    const { data: encryptedNote, error: readError } = await supabase
      .from('notes')
      .select('id, title, content, attachments, tags, badges, is_locked, encrypted_content, encrypted_content_v2')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (readError) {
      return { error: readError };
    }

    let existingNote = encryptedNote?.encrypted_content_v2
      ? await decryptNoteFromCloud(encryptedNote)
      : encryptedNote;
    try {
      const localNote = JSON.parse(localStorage.getItem('fiip-notes') || '[]')
        .find((note) => note.id === noteId);
      existingNote = localNote || existingNote;
    } catch {
      // The decrypted server row remains the source for publication.
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

    if (error) {return { data, error };}

    try {
      const profileQuery = supabase.from('profiles');
      const { data: profile } = profileQuery?.select
        ? await profileQuery
          .select('nickname, username, avatar_url, bio, accent_color')
          .eq('id', user.id)
          .maybeSingle()
        : { data: null };

      const snapshotQuery = supabase.from('public_note_snapshots');
      if (snapshotQuery?.upsert) {
        const { error: snapshotError } = await snapshotQuery
          .upsert({
            note_id: noteId,
            owner_id: user.id,
            public_slug: slug,
            title: existingNote.title || '',
            content: existingNote.content || '',
            attachments: existingNote.attachments || [],
            tags: existingNote.tags || [],
            badges: existingNote.badges || [],
            author_profile: {
              username: profile?.nickname || profile?.username || 'Utilisateur Fiip',
              avatar_url: profile?.avatar_url || '',
              bio: profile?.bio || '',
              accent_color: profile?.accent_color || '#D97706',
            },
            updated_at: new Date().toISOString(),
            unpublished_at: null,
          }, { onConflict: 'note_id' });
        if (snapshotError) {return { data, error: snapshotError };}
      }
    } catch (snapshotError) {
      console.warn('Public note snapshot creation failed:', snapshotError);
    }

    return { data, error: null };
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

    await supabase
      .from('public_note_snapshots')
      .delete()
      .eq('note_id', noteId)
      .eq('owner_id', user.id);

    return { data, error };
  },

  async getPublicNote(slug) {
    const { data, error } = await supabase
      .rpc('get_public_note_by_slug', { p_slug: slug })
      .maybeSingle();
    
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

      let cloudSettings = {};
      let error = null;
      try {
          await flushPendingSettingsSync();
          const data = await invokeSettingsSync({
              settings: {},
              deviceId: getCurrentDeviceId(),
          });
          cloudSettings = await decryptSettingsEnvelope(data?.settings || {});
      } catch (syncError) {
          error = syncError;
          console.warn('Encrypted settings fetch failed:', syncError);
      }

      const localSettings = readLocalSettings();
      const settings = {
          ...cloudSettings,
          windowEffect: localSettings.windowEffect,
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

      const deviceId = getCurrentDeviceId();
      const envelope = await encryptSettingsEnvelope(getSyncedSettings(settings));
      const pendingPayload = { settings: envelope, deviceId };
      try {
          const data = await invokeSettingsSync(pendingPayload);
          localStorage.removeItem(PENDING_SETTINGS_SYNC_KEY);
          if (data?.settings) {
              return { data: await decryptSettingsEnvelope(data.settings), error: null };
          }
      } catch (syncError) {
          localStorage.setItem(PENDING_SETTINGS_SYNC_KEY, JSON.stringify(pendingPayload));
          console.warn('Encrypted settings queued until reconnection:', syncError);
          return { data: settings, error: syncError, queued: true };
      }
      return { data: settings, error: null };
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

      return { data: (data || []).map(serializeUserDevice), error };
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
        const { data: files, error } = await supabase
          .from('files')
          .select('file_size')
          .eq('owner_id', userId)
          .eq('status', 'confirmed')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) {throw error;}
        totalSize += (files || []).reduce((acc, file) => acc + Number(file.file_size || 0), 0);
        hasMore = files?.length === pageSize;
        page++;
      }
    } catch (e) {
      console.error("Error calculating usage:", e);
      return totalSize; // Return what we found so far
    }

    return totalSize;
  },

  // --- Storage (Attachments) ---
  async uploadAttachment(file, path) {
    const user = await authService.getUser();
    if (!user) {return { error: 'Not authenticated' };}
    
    const currentUsage = await this.getUsage(user.id);
    const level = await authService.getPlanLevel(user);

    if (!canAttachFile({ level, currentUsage, fileSize: file.size, attachmentCount: 0 })) {
      return { error: new Error("STORAGE_LIMIT_EXCEEDED") };
    }

    try {
        const { uploadFile } = await import('./storageR2');
        const noteId = String(path || '').split('/')[1] || null;
        const data = await uploadFile(file, { noteId });
        if (data.queued) {
          return { data: { queued: true, queueId: data.queueId }, error: null };
        }
        return { data: { path: data.file_key, fileId: data.id, signedUrl: '' }, error: null };
    } catch (error) {
        return { error };
    }
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
      try {
          const notes = JSON.parse(localStorage.getItem('fiip-notes') || '[]');
          const tasks = notes.flatMap((note) => (note.tasks || []).map((task) => createTask({
              ...task,
              note_id: note.id,
              user_id: user.id,
          })));
          return { data: tasks, error: null, localOnly: true };
      } catch (error) {
          return { data: [], error, localOnly: true };
      }
  },

  async saveTask(task) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}

      const normalized = createTask({ ...task, user_id: user.id });
      return { data: normalized, error: null, localOnly: true };
  },

  async deleteTask(taskId) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}

      return { data: { id: taskId, status: 'archived' }, error: null, localOnly: true };
  },

  async upsertAttachmentMetadata(noteId, attachment) {
      const user = await authService.getUser();
      if (!user) {return { error: 'Not authenticated' };}

      const normalized = normalizeAttachment(attachment, noteId);
      const encryptedMetadata = await encryptSensitiveJson({
          name: normalized.name,
          ocrText: normalized.ocrText || '',
      });
      const payload = {
          id: normalized.id,
          note_id: noteId,
          user_id: user.id,
          name: '',
          type: normalized.type,
          mime_type: normalized.mimeType,
          size_bytes: normalized.size,
          storage_path: normalized.fileKey || `${user.id}/${normalized.fileId || normalized.id}`,
          previewable: normalized.previewable,
          ocr_text: '',
          ocr_status: normalized.ocrText ? 'complete' : 'pending',
          encrypted_name: encryptedMetadata,
          encrypted_ocr_text: encryptedMetadata,
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
      void note;
      void tasks;
      void attachmentTexts;
      return { data: null, error: null, skipped: true, localOnly: true };
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
      return dataService.uploadAttachment(file, `${userId}/${path}`);
  },

  async downloadFile(userId, path) {
      const { downloadEncryptedFile } = await import('./storageR2');
      const encrypted = await downloadEncryptedFile(path);
      const blob = await decryptBlob(encrypted);
      return await blob.text();
  },

  getPublicUrl(userId, path) {
    return path;
  }
};
