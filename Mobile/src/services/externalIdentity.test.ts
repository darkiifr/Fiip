import {
  clearExternalIdentityProvider,
  getExternalIdentityUser,
  setExternalIdentityProvider,
  signOutExternalIdentity,
} from './externalIdentity';

describe('mobile external identity', () => {
  afterEach(clearExternalIdentityProvider);

  it('exposes a mapped Clerk identity and delegates sign-out', async () => {
    const signOut = jest.fn();
    setExternalIdentityProvider({
      getUser: async () => ({ id: 'mapped-user', clerkSubject: 'user_clerk' }),
      signOut,
    });
    await expect(getExternalIdentityUser()).resolves.toMatchObject({ id: 'mapped-user' });
    await signOutExternalIdentity();
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
