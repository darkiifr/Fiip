import { supabase } from './supabase';

const CACHE_KEY = 'fiip-feature-flags';
const POLL_INTERVAL_MS = 10 * 60 * 1000;

export function normalizeFlags(flags = [], scope = 'all') {
  const normalized = {};
  for (const flag of flags) {
    if (!flag?.feature_key) {continue;}
    const existing = normalized[flag.feature_key];
    if (!existing || flag.scope === scope || existing.scope !== scope) {
      normalized[flag.feature_key] = flag;
    }
  }
  return normalized;
}

export function readCachedFeatureFlags() {
  try {
    return normalizeFlags(JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'));
  } catch {
    return {};
  }
}

export async function fetchFeatureFlags(scope = 'app') {
  const { data, error } = await supabase.functions.invoke('get-feature-flags', { body: { scope } });
  if (error) {throw error;}
  const flags = data?.flags || [];
  localStorage.setItem(CACHE_KEY, JSON.stringify(flags));
  return normalizeFlags(flags, scope);
}

export function startFeatureFlagPolling({ scope = 'app', onFlags } = {}) {
  let stopped = false;
  let timer = null;
  const refresh = async () => {
    try {
      const flags = await fetchFeatureFlags(scope);
      if (!stopped && onFlags) {onFlags(flags);}
    } catch (error) {
      console.warn('Feature flags refresh failed:', error);
    }
  };
  refresh();
  timer = setInterval(refresh, POLL_INTERVAL_MS);
  window.addEventListener('online', refresh);
  return () => {
    stopped = true;
    clearInterval(timer);
    window.removeEventListener('online', refresh);
  };
}

export function getFeatureFlagState(flags, key) {
  return flags?.[key] || { feature_key: key, status: 'enabled', scope: 'all' };
}
