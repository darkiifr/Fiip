type ExternalIdentityProvider = {
  getUser: () => Promise<any>;
  signOut?: () => Promise<void>;
};

let provider: ExternalIdentityProvider | null = null;

export function setExternalIdentityProvider(nextProvider: ExternalIdentityProvider) {
  provider = typeof nextProvider?.getUser === 'function' ? nextProvider : null;
}

export function clearExternalIdentityProvider() {
  provider = null;
}

export function getExternalIdentityUser() {
  return provider?.getUser() || Promise.resolve(null);
}

export async function signOutExternalIdentity() {
  await provider?.signOut?.();
}
