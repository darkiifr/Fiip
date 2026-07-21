import { createClient } from '@supabase/supabase-js';
import { getClerkAccessToken } from './clerkSession';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase URL or Key missing in environment variables.");
}

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    accessToken: getClerkAccessToken,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  : null;

const PUBLIC_NOTE_SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,79}$/i;

export function normalizePublicNoteSlug(slug) {
  const value = String(slug || '').trim();
  if (!PUBLIC_NOTE_SLUG_RE.test(value)) {
    throw new Error('Lien public invalide.');
  }
  return value;
}

export const dataService = {
  async getPublicNote(slug) {
    if (!supabase) {
      console.error("Supabase client not initialized due to missing environment variables.");
      return { data: null, error: "Configuration missing" };
    }

    let safeSlug;
    try {
      safeSlug = normalizePublicNoteSlug(slug);
    } catch (error) {
      return { data: null, error };
    }

    const { data, error } = await supabase
      .rpc('get_public_note_by_slug', { p_slug: safeSlug })
      .maybeSingle();

    if (data) {
       data.updatedAt = data.updated_at ? new Date(data.updated_at).getTime() : Date.now();
       data.badges = data.badges || [];
       
    }

    return { data, error };
  }
};
