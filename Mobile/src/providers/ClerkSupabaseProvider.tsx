import { ClerkProvider, useAuth, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { VITE_CLERK_PUBLISHABLE_KEY } from '@env';

import { installClerkSession, uninstallClerkSession } from '../services/clerkSessionBridge';

const runtimeEnv = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const publishableKey = String(
  runtimeEnv?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || VITE_CLERK_PUBLISHABLE_KEY || '',
).trim();
const passkeysEnabled = runtimeEnv?.EXPO_PUBLIC_CLERK_PASSKEYS_ENABLED === 'true';
// The native module is unavailable in Expo Go, so it must only load in an opted-in development build.
const clerkPasskeys = passkeysEnabled ? require('@clerk/expo/passkeys').passkeys : undefined;

function ClerkSessionBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    let cancelled = false;
    if (!isLoaded || !isSignedIn || !user) {
      uninstallClerkSession();
      return undefined;
    }

    installClerkSession({
      getToken: () => getToken(),
      subject: user.id,
      email: user.primaryEmailAddress?.emailAddress || '',
      username: user.username || user.fullName || user.firstName || '',
      imageUrl: user.imageUrl || '',
      signOut: async () => signOut(),
    }).catch((error) => {
      if (!cancelled) {
        console.warn('Could not bootstrap Clerk identity:', error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, signOut, user]);

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#0A84FF" />
        <Text style={styles.loadingText}>Chargement du compte...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export function ClerkSupabaseProvider({ children }: { children: React.ReactNode }) {
  if (!publishableKey) return <>{children}</>;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      __experimental_passkeys={clerkPasskeys}
    >
      <ClerkSessionBridge>{children}</ClerkSessionBridge>
    </ClerkProvider>
  );
}

export function isMobileClerkConfigured() {
  return Boolean(publishableKey);
}

export function isMobilePasskeyConfigured() {
  return Boolean(publishableKey && clerkPasskeys);
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
});
