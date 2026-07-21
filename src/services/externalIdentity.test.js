import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearExternalIdentityProvider,
  getExternalIdentityUser,
  setExternalIdentityProvider,
  signOutExternalIdentity,
} from './externalIdentity';

describe('external identity provider', () => {
  afterEach(() => clearExternalIdentityProvider());

  it('exposes a mapped Clerk user to legacy data services', async () => {
    const user = { id: '2d1bc0cb-bc80-44d8-9655-a20a951189ba', clerkSubject: 'user_123' };
    setExternalIdentityProvider({
      getUser: async () => user,
      signOut: vi.fn(),
    });

    await expect(getExternalIdentityUser()).resolves.toEqual(user);
  });

  it('delegates sign-out without persisting a token', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    setExternalIdentityProvider({ getUser: async () => null, signOut });

    await signOutExternalIdentity();
    expect(signOut).toHaveBeenCalledOnce();
  });
});
