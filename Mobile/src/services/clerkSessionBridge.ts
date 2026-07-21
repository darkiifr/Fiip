import {
  clearExternalIdentityProvider,
  setExternalIdentityProvider,
} from './externalIdentity';
import { setSupabaseAccessTokenProvider, supabase } from './supabase';

type ClerkSessionAdapter = {
  getToken: () => Promise<string | null>;
  subject: string;
  email?: string;
  username?: string;
  imageUrl?: string;
  signOut: () => Promise<void>;
};

export async function installClerkSession(adapter: ClerkSessionAdapter) {
  setSupabaseAccessTokenProvider(adapter.getToken);
  const { data, error } = await supabase.functions.invoke('identity-bootstrap', { body: {} });
  if (error || !data?.userId) {
    setSupabaseAccessTokenProvider(null);
    throw error || new Error('IDENTITY_BOOTSTRAP_FAILED');
  }

  const mappedUser = {
    id: data.userId,
    clerkSubject: adapter.subject,
    email: adapter.email || '',
    user_metadata: {
      username: adapter.username || '',
      nickname: adapter.username || '',
      avatar_url: adapter.imageUrl || '',
    },
  };
  setExternalIdentityProvider({
    getUser: async () => mappedUser,
    signOut: adapter.signOut,
  });
  return mappedUser;
}

export function uninstallClerkSession() {
  clearExternalIdentityProvider();
  setSupabaseAccessTokenProvider(null);
}
