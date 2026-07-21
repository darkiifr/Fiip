import { supabase } from './supabase';

const CACHE_KEY = 'fiip-site-feature-flags';

function normalizeFlags(flags = []) {
  return Object.fromEntries(flags.map((flag) => [flag.feature_key, flag]));
}

export async function fetchFeatureFlags(scope = 'site') {
  if (!supabase) return {};
  const { data, error } = await supabase.functions.invoke('get-feature-flags', { body: { scope } });
  if (error) throw error;
  const flags = data?.flags || [];
  localStorage.setItem(CACHE_KEY, JSON.stringify(flags));
  return normalizeFlags(flags);
}

export function readCachedFeatureFlags() {
  try {
    return normalizeFlags(JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'));
  } catch {
    return {};
  }
}

