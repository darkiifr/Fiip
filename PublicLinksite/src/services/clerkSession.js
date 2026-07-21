let currentSession = null;

export function installClerkSession(session) {
  currentSession = session;
}

export function clearClerkSession() {
  currentSession = null;
}

export async function getClerkAccessToken() {
  return currentSession?.getToken ? currentSession.getToken() : null;
}

export function getClerkUser() {
  return currentSession?.user || null;
}

export async function signOutClerk() {
  await currentSession?.signOut?.();
}
