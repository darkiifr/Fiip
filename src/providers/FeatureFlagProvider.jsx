import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  getFeatureFlagState,
  readCachedFeatureFlags,
  startFeatureFlagPolling,
} from '../services/featureFlags';

const FeatureFlagContext = createContext({});

function FlagMessage({ flag, blocking = false }) {
  return (
    <div className={blocking
      ? 'grid min-h-screen place-items-center bg-[#0a0a0a] p-6 text-white'
      : 'fixed inset-x-0 top-0 z-[100000] flex flex-wrap items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-black'}
    >
      <div className={blocking ? 'w-full max-w-lg rounded-lg border border-white/15 bg-[#151515] p-6' : ''}>
        <strong>{flag.message || (blocking ? 'Fonctionnalité temporairement indisponible.' : 'Service dégradé.')}</strong>
        {flag.reason ? <span className={blocking ? 'mt-2 block text-sm text-zinc-300' : ''}>{flag.reason}</span> : null}
        {flag.expected_reactivation_at ? (
          <span className={blocking ? 'mt-2 block text-sm text-zinc-400' : ''}>
            Retour prévu : {new Date(flag.expected_reactivation_at).toLocaleString()}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function FeatureFlagProvider({ children, scope = 'app' }) {
  const [flags, setFlags] = useState(() => readCachedFeatureFlags());

  useEffect(() => startFeatureFlagPolling({ scope, onFlags: setFlags }), [scope]);

  const value = useMemo(() => ({
    flags,
    getFlag: (key) => getFeatureFlagState(flags, key),
  }), [flags]);
  const maintenance = flags.global_maintenance || flags.app_maintenance;
  if (maintenance?.status === 'disabled') {
    return <FlagMessage flag={maintenance} blocking />;
  }
  const degraded = Object.values(flags).find((flag) => flag.status === 'degraded');

  return (
    <FeatureFlagContext.Provider value={value}>
      {degraded ? <FlagMessage flag={degraded} /> : null}
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlag(key) {
  const { getFlag = () => ({ feature_key: key, status: 'enabled', scope: 'all' }) } = useContext(FeatureFlagContext);
  return getFlag(key);
}

export function FeatureFlagBoundary({ featureKey, children, fallback = null }) {
  const flag = useFeatureFlag(featureKey);
  if (flag.status === 'disabled') {
    return fallback || <FlagMessage flag={flag} blocking />;
  }
  return (
    <>
      {flag.status === 'degraded' ? <FlagMessage flag={flag} /> : null}
      {children}
    </>
  );
}
