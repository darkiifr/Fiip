import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

export type FeatureFlag = {
  feature_key: string;
  scope: 'app' | 'mobile' | 'site' | 'all';
  status: 'enabled' | 'disabled' | 'degraded';
  message?: string;
  reason?: string;
  expected_reactivation_at?: string | null;
  enabled_for?: unknown[];
};

export type FeatureFlagMap = Record<string, FeatureFlag>;

const CACHE_KEY = 'fiip-mobile-feature-flags';
const POLL_INTERVAL_MS = 10 * 60 * 1000;

export function normalizeFeatureFlags(flags: FeatureFlag[] = [], scope = 'mobile'): FeatureFlagMap {
  const normalized: FeatureFlagMap = {};
  for (const flag of flags) {
    if (!flag?.feature_key) continue;
    const existing = normalized[flag.feature_key];
    if (!existing || flag.scope === scope || existing.scope !== scope) {
      normalized[flag.feature_key] = flag;
    }
  }
  return normalized;
}

export async function readCachedFeatureFlags(): Promise<FeatureFlagMap> {
  try {
    return normalizeFeatureFlags(JSON.parse(await AsyncStorage.getItem(CACHE_KEY) || '[]'));
  } catch {
    return {};
  }
}

export async function fetchFeatureFlags(scope = 'mobile'): Promise<FeatureFlagMap> {
  const { data, error } = await supabase.functions.invoke('get-feature-flags', { body: { scope } });
  if (error) throw error;
  const flags = data?.flags || [];
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(flags));
  return normalizeFeatureFlags(flags, scope);
}

export function startFeatureFlagPolling(onFlags: (flags: FeatureFlagMap) => void) {
  let stopped = false;
  const refresh = async () => {
    try {
      const flags = await fetchFeatureFlags('mobile');
      if (!stopped) onFlags(flags);
    } catch {
      if (!stopped) onFlags(await readCachedFeatureFlags());
    }
  };
  void refresh();
  const timer = setInterval(refresh, POLL_INTERVAL_MS);
  return {
    refresh,
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}
