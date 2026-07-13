import { Linking } from 'react-native';
import { supabase } from './supabase';

export const GOOGLE_OAUTH_REDIRECT = 'fiip://login-callback';
const successfulUrls = new Set<string>();
const inFlightUrls = new Map<string, Promise<boolean>>();
const resultListeners = new Set<{ success: () => void; error: (error: Error) => void }>();
const cycleListeners = new Set<() => void>();

export async function startGoogleOAuth(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: GOOGLE_OAUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("L'URL de connexion Google est indisponible.");
  cycleListeners.forEach(listener => listener());
  await Linking.openURL(data.url);
}

export async function handleGoogleOAuthUrl(rawUrl: string): Promise<boolean> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return false; }
  if (url.protocol !== 'fiip:' || url.hostname !== 'login-callback' || url.username || url.password || url.port || (url.pathname !== '' && url.pathname !== '/')) return false;
  if (successfulUrls.has(rawUrl)) return false;
  const existing = inFlightUrls.get(rawUrl);
  if (existing) return existing;
  const processing = (async () => {
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const value = (name: string) => url.searchParams.get(name) || hash.get(name);
    const providerError = value('error');
    if (providerError) throw new Error(value('error_description') || providerError);
    const code = value('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else {
      const access_token = value('access_token');
      const refresh_token = value('refresh_token');
      if (!access_token || !refresh_token) throw new Error('Réponse de connexion Google invalide.');
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
    }
    successfulUrls.add(rawUrl);
    return true;
  })();
  inFlightUrls.set(rawUrl, processing);
  try { return await processing; } finally { inFlightUrls.delete(rawUrl); }
}

export function subscribeGoogleOAuthCallbacks(onSuccess: () => void, onError: (error: Error) => void): () => void {
  const delivered = new Set<string>();
  const process = (url: string | null) => {
    if (!url || delivered.has(url)) return;
    delivered.add(url);
    handleGoogleOAuthUrl(url).then(handled => { if (handled) onSuccess(); }).catch(error => { delivered.delete(url); onError(error instanceof Error ? error : new Error(String(error))); });
  };
  Linking.getInitialURL().then(process).catch(error => onError(error));
  const subscription = Linking.addEventListener('url', event => process(event.url));
  return () => subscription.remove();
}

export function subscribeGoogleOAuthResults(success: () => void, error: (error: Error) => void): () => void {
  const listener = { success, error };
  resultListeners.add(listener);
  return () => resultListeners.delete(listener);
}

export function installGoogleAuthLifecycle(finalize: () => Promise<void>): () => void {
  let active = true;
  let cycleCompleted = false;
  let finalization: Promise<void> | null = null;
  const beginCycle = () => {
    cycleCompleted = false;
    finalization = null;
  };
  cycleListeners.add(beginCycle);
  const removeLinkingListener = subscribeGoogleOAuthCallbacks(async () => {
    if (!active || cycleCompleted || finalization) return;
    finalization = (async () => {
      try { await finalize(); } catch { /* Session auth succeeded; profile/sync are best-effort. */ }
      if (!active) return;
      cycleCompleted = true;
      resultListeners.forEach(listener => listener.success());
    })();
    await finalization;
  }, error => { if (active) resultListeners.forEach(listener => listener.error(error)); });
  return () => { active = false; cycleListeners.delete(beginCycle); removeLinkingListener(); };
}
