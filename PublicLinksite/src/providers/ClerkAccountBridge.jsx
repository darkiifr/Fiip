import { SignIn, useAuth, useUser } from '@clerk/react';
import { createContext, useContext, useEffect, useMemo } from 'react';

import { clearClerkSession, installClerkSession } from '../services/clerkSession';

const FiipClerkContext = createContext({ loaded: true, signedIn: false, user: null, signOut: async () => {} });

export function ClerkAccountBridge({ children }) {
  const auth = useAuth();
  const { user } = useUser();
  const session = useMemo(() => ({
    getToken: auth.getToken,
    signOut: auth.signOut,
    user: user || null,
  }), [auth.getToken, auth.signOut, user]);

  // Descendants can invoke Supabase during their first effect, so the token
  // provider must exist before those descendants are committed.
  if (auth.isLoaded) installClerkSession(session);

  useEffect(() => {
    if (!auth.isLoaded) return undefined;
    installClerkSession(session);
    return () => clearClerkSession(session);
  }, [auth.isLoaded, session]);

  const value = useMemo(() => ({
    loaded: auth.isLoaded,
    signedIn: Boolean(auth.isSignedIn),
    user: user || null,
    signOut: auth.signOut,
  }), [auth.isLoaded, auth.isSignedIn, auth.signOut, user]);

  return <FiipClerkContext.Provider value={value}>{children}</FiipClerkContext.Provider>;
}

export function useFiipClerk() {
  return useContext(FiipClerkContext);
}

export function FiipClerkSignIn() {
  return <SignIn routing="hash" fallbackRedirectUrl="https://portail.fiip.fr/account" signUpFallbackRedirectUrl="https://portail.fiip.fr/account" />;
}
