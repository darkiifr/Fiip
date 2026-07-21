import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  FeatureFlag,
  FeatureFlagMap,
  readCachedFeatureFlags,
  startFeatureFlagPolling,
} from '../services/featureFlags';

const FeatureFlagContext = createContext<FeatureFlagMap>({});

function Message({ flag, blocking = false }: { flag: FeatureFlag; blocking?: boolean }) {
  return (
    <View style={blocking ? styles.blocking : styles.banner}>
      <Text style={blocking ? styles.title : styles.bannerTitle}>{flag.message || 'Service Fiip indisponible.'}</Text>
      {flag.reason ? <Text style={blocking ? styles.body : styles.bannerBody}>{flag.reason}</Text> : null}
      {flag.expected_reactivation_at ? (
        <Text style={blocking ? styles.body : styles.bannerBody}>
          Retour prévu : {new Date(flag.expected_reactivation_at).toLocaleString()}
        </Text>
      ) : null}
    </View>
  );
}

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlagMap>({});

  useEffect(() => {
    let mounted = true;
    const updateFlags = (nextFlags: FeatureFlagMap) => {
      if (mounted) setFlags(nextFlags);
    };
    void readCachedFeatureFlags().then(updateFlags);
    const polling = startFeatureFlagPolling(updateFlags);
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) void polling.refresh();
    });
    return () => {
      mounted = false;
      unsubscribe();
      polling.stop();
    };
  }, []);

  const maintenance = flags.global_maintenance || flags.mobile_maintenance;
  const degraded = useMemo(
    () => Object.values(flags).find((flag) => flag.status === 'degraded'),
    [flags],
  );
  if (maintenance?.status === 'disabled') return <Message flag={maintenance} blocking />;

  return (
    <FeatureFlagContext.Provider value={flags}>
      {degraded ? <Message flag={degraded} /> : null}
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlag(key: string): FeatureFlag {
  const flags = useContext(FeatureFlagContext);
  return flags[key] || { feature_key: key, scope: 'all', status: 'enabled' };
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#FFD60A', paddingHorizontal: 16, paddingVertical: 8 },
  bannerBody: { color: '#111111', fontSize: 12, textAlign: 'center' },
  bannerTitle: { color: '#111111', fontWeight: '700', textAlign: 'center' },
  blocking: { backgroundColor: '#0A0A0A', flex: 1, justifyContent: 'center', padding: 28 },
  body: { color: '#C7C7CC', fontSize: 15, lineHeight: 22 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginBottom: 12 },
});
