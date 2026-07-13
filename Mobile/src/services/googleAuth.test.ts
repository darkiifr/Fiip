import { Linking } from 'react-native';
import { handleGoogleOAuthUrl, installGoogleAuthLifecycle, startGoogleOAuth, subscribeGoogleOAuthCallbacks, subscribeGoogleOAuthResults } from './googleAuth';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: { auth: { signInWithOAuth: jest.fn(), exchangeCodeForSession: jest.fn(), setSession: jest.fn() } },
}));

const auth = supabase.auth as jest.Mocked<typeof supabase.auth>;

describe('Google OAuth mobile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests Google OAuth without browser redirect and opens the returned URL', async () => {
    (auth.signInWithOAuth as jest.Mock).mockResolvedValue({ data: { url: 'https://accounts.google.com/oauth' }, error: null });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await startGoogleOAuth();
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'fiip://login-callback', skipBrowserRedirect: true } });
    expect(Linking.openURL).toHaveBeenCalledWith('https://accounts.google.com/oauth');
  });

  it('exchanges a code only for the exact callback URL', async () => {
    (auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({ error: null });
    expect(await handleGoogleOAuthUrl('fiip://login-callback?code=abc')).toBe(true);
    expect(await handleGoogleOAuthUrl('fiip://evil?code=stolen')).toBe(false);
    expect(await handleGoogleOAuthUrl('https://login-callback?code=stolen')).toBe(false);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
  });

  it.each([
    'fiip://user@login-callback?code=x', 'fiip://login-callback:42?code=x',
    'fiip://login-callback/path?code=x', 'fiip://login-callback//?code=x',
  ])('rejects callback URL variants (%s)', async url => {
    expect(await handleGoogleOAuthUrl(url)).toBe(false);
  });

  it('allows retry after an exchange error', async () => {
    (auth.exchangeCodeForSession as jest.Mock).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ error: null });
    const url = 'fiip://login-callback?code=retry';
    await expect(handleGoogleOAuthUrl(url)).rejects.toThrow('network');
    await expect(handleGoogleOAuthUrl(url)).resolves.toBe(true);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(2);
  });

  it('shares concurrent processing for the same callback', async () => {
    let resolve!: (value: any) => void;
    (auth.exchangeCodeForSession as jest.Mock).mockReturnValue(new Promise(r => { resolve = r; }));
    const url = 'fiip://login-callback?code=concurrent';
    const first = handleGoogleOAuthUrl(url);
    const second = handleGoogleOAuthUrl(url);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    resolve({ error: null });
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
  });

  it.each([
    'fiip://login-callback?access_token=access&refresh_token=refresh',
    'fiip://login-callback#access_token=access&refresh_token=refresh',
  ])('sets a session from callback tokens (%s)', async url => {
    (auth.setSession as jest.Mock).mockResolvedValue({ error: null });
    expect(await handleGoogleOAuthUrl(url)).toBe(true);
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
  });

  it('surfaces provider errors', async () => {
    await expect(handleGoogleOAuthUrl('fiip://login-callback?error=access_denied&error_description=No%20thanks')).rejects.toThrow('No thanks');
  });

  it('handles cold and hot callbacks once and cleans up the listener', async () => {
    const remove = jest.fn();
    let hot: ((event: { url: string }) => void) | undefined;
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('fiip://login-callback?code=cold');
    jest.spyOn(Linking, 'addEventListener').mockImplementation((_type, listener: any) => { hot = listener; return { remove }; });
    (auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({ error: null });
    const success = jest.fn();
    const failure = jest.fn();
    const cleanup = subscribeGoogleOAuthCallbacks(success, failure);
    await Promise.resolve(); await Promise.resolve();
    hot?.({ url: 'fiip://login-callback?code=hot' });
    hot?.({ url: 'fiip://login-callback?code=hot' });
    await new Promise(resolve => setImmediate(resolve));
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(2);
    expect(success).toHaveBeenCalledTimes(2);
    expect(failure).not.toHaveBeenCalled();
    cleanup();
    expect(remove).toHaveBeenCalled();
  });

  it('finalizes only once for concurrent distinct cold/hot callbacks and treats sync failure as best-effort', async () => {
    let hot: ((event: { url: string }) => void) | undefined;
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('fiip://login-callback?code=cycle-cold');
    jest.spyOn(Linking, 'addEventListener').mockImplementation((_type, listener: any) => { hot = listener; return { remove: jest.fn() }; });
    (auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({ error: null });
    const finalize = jest.fn().mockRejectedValue(new Error('sync unavailable'));
    const success = jest.fn();
    const failure = jest.fn();
    const removeResult = subscribeGoogleOAuthResults(success, failure);
    const cleanup = installGoogleAuthLifecycle(finalize);
    hot?.({ url: 'fiip://login-callback?code=cycle-hot' });
    await new Promise(resolve => setImmediate(resolve));
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(2);
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledTimes(1);
    expect(failure).not.toHaveBeenCalled();
    cleanup(); removeResult();
  });

  it('starts a fresh completion cycle for a second login after logout in the same process', async () => {
    let hot: ((event: { url: string }) => void) | undefined;
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    jest.spyOn(Linking, 'addEventListener').mockImplementation((_type, listener: any) => { hot = listener; return { remove: jest.fn() }; });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    (auth.signInWithOAuth as jest.Mock).mockResolvedValue({ data: { url: 'https://accounts.google.com/oauth' }, error: null });
    (auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({ error: null });
    const finalize = jest.fn().mockResolvedValue(undefined);
    const success = jest.fn();
    const removeResult = subscribeGoogleOAuthResults(success, jest.fn());
    const cleanup = installGoogleAuthLifecycle(finalize);

    await startGoogleOAuth();
    hot?.({ url: 'fiip://login-callback?code=first-login' });
    await new Promise(resolve => setImmediate(resolve));
    // Logical logout/reset happens outside this service; a new initiation defines the next cycle.
    await startGoogleOAuth();
    hot?.({ url: 'fiip://login-callback?code=second-login' });
    await new Promise(resolve => setImmediate(resolve));

    expect(finalize).toHaveBeenCalledTimes(2);
    expect(success).toHaveBeenCalledTimes(2);
    cleanup(); removeResult();
  });
});
