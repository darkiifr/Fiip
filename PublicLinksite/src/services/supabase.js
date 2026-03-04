import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase URL or Key missing in environment variables.");
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

export const dataService = {
  async getPublicNote(slug) {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('public_slug', slug)
      .single();
    
    return { data, error };
  }
};
