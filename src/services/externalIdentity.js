let externalIdentityProvider = null;

export function setExternalIdentityProvider(provider) {
  externalIdentityProvider = provider?.getUser ? provider : null;
}

export function clearExternalIdentityProvider() {
  externalIdentityProvider = null;
}

export function hasExternalIdentityProvider() {
  return Boolean(externalIdentityProvider);
}

export async function getExternalIdentityUser() {
  return externalIdentityProvider ? await externalIdentityProvider.getUser() : null;
}

export async function signOutExternalIdentity() {
  if (externalIdentityProvider?.signOut) {
    await externalIdentityProvider.signOut();
  }
}
