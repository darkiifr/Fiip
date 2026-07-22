import { SignIn, useAuth, useUser } from '@clerk/react';
import { useEffect, useMemo } from 'react';

import { clearClerkSession, installClerkSession } from '../services/clerkSession';
import { FiipClerkContext } from './ClerkAccountContext';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function ClerkAccountBridge({ children }) {
  const auth = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!auth.isLoaded) return undefined;
    installClerkSession({ getToken: auth.getToken, signOut: auth.signOut, user: user || null });
    return clearClerkSession;
  }, [auth.getToken, auth.isLoaded, auth.signOut, user]);

  const value = useMemo(() => ({
    loaded: auth.isLoaded,
    signedIn: Boolean(auth.isSignedIn),
    user: user || null,
    signOut: auth.signOut,
  }), [auth.isLoaded, auth.isSignedIn, auth.signOut, user]);

  return <FiipClerkContext.Provider value={value}>{children}</FiipClerkContext.Provider>;
}

export function FiipClerkSignIn() {
  if (!clerkPublishableKey) {
    return (
      <div className="public-panel auth-panel">
        <span className="eyebrow">Compte Fiip</span>
        <h1>Connexion sécurisée</h1>
        <p>La connexion s’ouvre sur le portail Fiip officiel.</p>
        <a className="account-primary" href="https://portail.fiip.fr/sign-in">Continuer vers la connexion</a>
      </div>
    );
  }

  return <SignIn routing="hash" fallbackRedirectUrl="https://accounts.fiip.fr/user" signUpFallbackRedirectUrl="https://accounts.fiip.fr/user" />;
}
