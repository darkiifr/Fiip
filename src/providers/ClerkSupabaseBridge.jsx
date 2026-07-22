import {
  ClerkLoaded,
  ClerkLoading,
  ClerkProvider,
  SignIn,
  UserButton,
  useAuth,
  useClerk,
  useUser,
} from '@clerk/react';
import { useEffect, useState } from 'react';

import ZeroKnowledgeUnlock from '../components/ZeroKnowledgeUnlock';
import {
  clearExternalIdentityProvider,
  setExternalIdentityProvider,
} from '../services/externalIdentity';
import { setSupabaseAccessTokenProvider, supabase } from '../services/supabase';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function SupabaseTokenBridge({ children }) {
  const { getToken, isLoaded, isSignedIn, signOut, sessionId } = useAuth();
  const { user } = useUser();
  const [mappedUser, setMappedUser] = useState(null);
  const [bootstrapError, setBootstrapError] = useState('');

  useEffect(() => {
    if (!isLoaded) {return undefined;}
    setSupabaseAccessTokenProvider(async () => getToken());
    return () => {
      setSupabaseAccessTokenProvider(null);
      clearExternalIdentityProvider();
    };
  }, [getToken, isLoaded]);

  useEffect(() => {
    let cancelled = false;
    if (!isLoaded || !isSignedIn || !user) {
      setMappedUser(null);
      clearExternalIdentityProvider();
      return () => {
        cancelled = true;
      };
    }

    const bootstrap = async () => {
      setBootstrapError('');
      const { data, error } = await supabase.functions.invoke('identity-bootstrap', { body: {} });
      if (error || !data?.userId) {
        throw error || new Error('Identity bootstrap failed');
      }
      if (cancelled) {return;}
      const nextUser = {
        id: data.userId,
        clerkSubject: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        user_metadata: {
          username: user.username || user.fullName || user.firstName || '',
          nickname: user.fullName || user.username || user.firstName || '',
          avatar_url: user.imageUrl || '',
        },
      };
      setExternalIdentityProvider({
        getUser: async () => nextUser,
        getSessionId: () => sessionId || null,
        signOut: async () => signOut(),
        revokeDevice: async (targetSessionId) => {
          if (!targetSessionId || targetSessionId === sessionId) {
            return;
          }
          const sessions = await user.getSessions();
          const target = sessions.find((session) => session.id === targetSessionId);
          await target?.revoke();
        },
      });
      setMappedUser(nextUser);
      localStorage.setItem('fiip-onboarding-completed', 'true');
      localStorage.removeItem('fiip-mode-local');
    };

    bootstrap().catch((error) => {
      if (!cancelled) {
        setBootstrapError(error?.message || 'Connexion Fiip impossible.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, sessionId, signOut, user]);

  if (!isLoaded) {
    return <div className="grid min-h-screen place-items-center bg-[#0a0a0a] text-white">Chargement du compte...</div>;
  }

  if (!isSignedIn) {
    if (localStorage.getItem('fiip-mode-local') === 'true') {
      return children;
    }
    return (
      <div className="grid min-h-screen place-items-center bg-[#0a0a0a] p-6 text-white">
        <div className="grid w-full max-w-md gap-4">
          <SignIn routing="hash" />
          <button
            type="button"
            className="rounded-lg border border-white/15 px-4 py-3 text-sm font-semibold hover:bg-white/10"
            onClick={() => {
              localStorage.setItem('fiip-mode-local', 'true');
              localStorage.setItem('fiip-onboarding-completed', 'true');
              window.location.reload();
            }}
          >
            Continuer en local
          </button>
        </div>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0a0a0a] p-6 text-white">
        <div className="max-w-md rounded-lg border border-red-500/30 bg-red-500/10 p-5">
          <h1 className="text-lg font-bold">Connexion cloud indisponible</h1>
          <p className="mt-2 text-sm text-red-100">{bootstrapError}</p>
        </div>
      </div>
    );
  }

  if (!mappedUser) {
    return <div className="grid min-h-screen place-items-center bg-[#0a0a0a] text-white">Préparation du compte...</div>;
  }
  return <ZeroKnowledgeUnlock userId={mappedUser.id}>{children}</ZeroKnowledgeUnlock>;
}

export function ClerkAccountControls() {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  if (!isLoaded || !isSignedIn) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <UserButton afterSignOutUrl="/" />
      <button
        type="button"
        onClick={() => clerk.openUserProfile()}
        className="rounded-xl border border-warm-border-light px-3 py-2 text-xs font-bold hover:bg-warm-sidebar-item-active dark:border-white/10 dark:hover:bg-white/10"
      >
        Gérer le compte
      </button>
    </div>
  );
}

export function ClerkSupabaseBridge({ children }) {
  if (!clerkPublishableKey) {return children;}
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
      <ClerkLoading>
        <div className="grid min-h-screen place-items-center bg-[#0a0a0a] text-white">Chargement...</div>
      </ClerkLoading>
      <ClerkLoaded>
        <SupabaseTokenBridge>{children}</SupabaseTokenBridge>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
