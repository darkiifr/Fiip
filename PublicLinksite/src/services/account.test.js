import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase.js', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithPasskey: vi.fn(),
      signInWithPassword: vi.fn(),
      registerPasskey: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      verifyOtp: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import {
  activateLicense,
  fetchAccountDevices,
  fetchSecurityEvents,
  getAccountRedirectUrl,
  getAuthErrorMessage,
  registerCurrentDevice,
  registerPasskey,
  sendPasswordReset,
  selectLicense,
  revokeAllDevices,
  revokeDevice,
  assertCaptchaToken,
  checkAccountEmailExists,
  signInWithPasskey,
  requiresCaptcha,
  signInWithMagicLink,
  signInWithGoogle,
  signInWithPassword,
  verifyMagicCode,
} from './account';
import { supabase } from './supabase';

describe('account service device actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 Test',
    });
  });

  it('registers the current web device with a stable installation id', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });

    await registerCurrentDevice();

    expect(supabase.functions.invoke).toHaveBeenCalledWith('account-api', {
      body: expect.objectContaining({
        action: 'register_device',
        platform: 'web',
        device_name: expect.any(String),
        installation_id: expect.stringMatching(/[0-9a-f-]{36}/),
      }),
    });
  });

  it('passes the current installation id when listing devices', async () => {
    localStorage.setItem('fiip_account_installation_id', '11111111-1111-4111-8111-111111111111');
    supabase.functions.invoke.mockResolvedValueOnce({ data: { devices: [] }, error: null });

    await fetchAccountDevices();

    expect(supabase.functions.invoke).toHaveBeenCalledWith('account-api', {
      body: {
        action: 'list_devices',
        installation_id: '11111111-1111-4111-8111-111111111111',
      },
    });
  });

  it('wraps security and revoke actions', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });

    await fetchSecurityEvents();
    await revokeDevice('22222222-2222-4222-8222-222222222222');
    await revokeAllDevices({ keepCurrent: true });

    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(1, 'account-api', {
      body: { action: 'list_security_events' },
    });
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(2, 'account-api', {
      body: {
        action: 'revoke_device',
        device_id: '22222222-2222-4222-8222-222222222222',
        reason: 'manual',
      },
    });
    expect(supabase.functions.invoke).toHaveBeenNthCalledWith(3, 'account-api', {
      body: expect.objectContaining({
        action: 'revoke_all_devices',
        keep_installation_id: expect.stringMatching(/[0-9a-f-]{36}/),
      }),
    });
  });

  it('activates a license key through the account backend', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({ data: { ok: true, license: { id: 'license-1' } }, error: null });

    await activateLicense(' FIIP-KEY-123 ');

    expect(supabase.functions.invoke).toHaveBeenCalledWith('account-api', {
      body: {
        action: 'activate_license',
        license_key: 'FIIP-KEY-123',
        installation_id: expect.stringMatching(/[0-9a-f-]{36}/),
      },
    });
  });

  it('selects the active license through the account backend', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({ data: { ok: true, active_license_id: 'license-2' }, error: null });

    await selectLicense('license-2');

    expect(supabase.functions.invoke).toHaveBeenCalledWith('account-api', {
      body: {
        action: 'select_license',
        license_id: 'license-2',
      },
    });
  });

  it('passes CAPTCHA tokens to Supabase auth calls', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { exists: true }, error: null });
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });
    supabase.auth.signInWithOtp.mockResolvedValueOnce({ data: {}, error: null });

    await signInWithPassword('buyer@fiip.fr', 'password', 'turnstile-token');
    await signInWithMagicLink('buyer@fiip.fr', 'magic-token');

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'buyer@fiip.fr',
      password: 'password',
      options: { captchaToken: 'turnstile-token' },
    });
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'buyer@fiip.fr',
      options: {
        shouldCreateUser: false,
        emailRedirectTo: 'https://portail.fiip.fr/account',
        captchaToken: 'magic-token',
      },
    });
  });

  it('starts Google OAuth with the canonical portal account redirect', async () => {
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({ data: { url: 'https://accounts.google.com/' }, error: null });

    await signInWithGoogle();

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://portail.fiip.fr/account' },
    });
  });

  it('verifies magic codes and sends password reset links', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({ data: { exists: true }, error: null });
    supabase.auth.verifyOtp.mockResolvedValueOnce({ data: {}, error: null });
    supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });

    await verifyMagicCode(' BUYER@FIIP.FR ', '123456');
    await sendPasswordReset('buyer@fiip.fr', 'reset-token');

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'buyer@fiip.fr',
      token: '123456',
      type: 'email',
    });
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('buyer@fiip.fr', {
      redirectTo: 'https://portail.fiip.fr/account',
      captchaToken: 'reset-token',
    });
  });

  it('uses Supabase WebAuthn passkey helpers when supported', async () => {
    Object.defineProperty(window, 'PublicKeyCredential', {
      configurable: true,
      value: function PublicKeyCredential() {},
    });
    supabase.auth.signInWithPasskey.mockResolvedValueOnce({ data: {}, error: null });
    supabase.auth.registerPasskey.mockResolvedValueOnce({ data: {}, error: null });

    await signInWithPasskey();
    await registerPasskey();

    expect(supabase.auth.signInWithPasskey).toHaveBeenCalledTimes(1);
    expect(supabase.auth.registerPasskey).toHaveBeenCalledTimes(1);
  });

  it('blocks passkey actions on unsupported browsers before calling Supabase', async () => {
    Object.defineProperty(window, 'PublicKeyCredential', {
      configurable: true,
      value: undefined,
    });

    await expect(signInWithPasskey()).rejects.toThrow('passkeys ne sont pas disponibles');
    await expect(registerPasskey()).rejects.toThrow('passkeys ne sont pas disponibles');
    expect(supabase.auth.signInWithPasskey).not.toHaveBeenCalled();
    expect(supabase.auth.registerPasskey).not.toHaveBeenCalled();
  });

  it('normalizes auth email and exposes the canonical account redirect URL', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({ data: { exists: true }, error: null });
    supabase.auth.signInWithOtp.mockResolvedValueOnce({ data: {}, error: null });

    await signInWithMagicLink(' BUYER@FIIP.FR ', 'magic-token');

    expect(getAccountRedirectUrl()).toBe('https://portail.fiip.fr/account');
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'buyer@fiip.fr',
      options: {
        shouldCreateUser: false,
        emailRedirectTo: 'https://portail.fiip.fr/account',
        captchaToken: 'magic-token',
      },
    });
  });

  it('checks account existence before sending magic links', async () => {
    supabase.functions.invoke
      .mockResolvedValueOnce({ data: { exists: false }, error: null })
      .mockResolvedValueOnce({ data: { exists: false }, error: null });

    expect(await checkAccountEmailExists('missing@fiip.fr')).toBe(false);
    const result = await signInWithMagicLink('missing@fiip.fr', 'magic-token');

    expect(result.error.message).toContain('Aucun compte Fiip');
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('does not require a CAPTCHA token when no Turnstile key is configured', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

    const result = await signInWithPassword('buyer@fiip.fr', 'password', '');

    expect(result.error).toBeNull();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'buyer@fiip.fr',
      password: 'password',
      options: undefined,
    });
  });

  it('formats Supabase mail and captcha errors for users', () => {
    expect(getAuthErrorMessage(new Error('Error sending confirmation email'))).toContain('configuration SMTP Supabase/Resend');
    expect(getAuthErrorMessage(new Error('captcha verification failed'))).toContain('Validation anti-bot refusée');
  });

  it('falls back to direct RLS security event reads when the account function is unavailable', async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [{ id: 'event-1', event_type: 'device_registered' }],
      error: null,
    });
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    supabase.functions.invoke.mockResolvedValueOnce({ data: null, error: { message: 'Function not deployed' } });
    supabase.from.mockReturnValueOnce({ select });

    await expect(fetchSecurityEvents()).resolves.toEqual({
      events: [{ id: 'event-1', event_type: 'device_registered' }],
    });
    expect(supabase.from).toHaveBeenCalledWith('account_security_events');
    expect(select).toHaveBeenCalledWith('id, device_id, event_type, metadata, created_at');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(50);
  });

  it('requires a CAPTCHA token when Turnstile is configured', () => {
    expect(requiresCaptcha('')).toBe(false);
    expect(requiresCaptcha('0xPUBLIC_SITE_KEY')).toBe(true);
    expect(() => assertCaptchaToken('', '0xPUBLIC_SITE_KEY')).toThrow('Veuillez valider la protection anti-bot.');
    expect(() => assertCaptchaToken('turnstile-token', '0xPUBLIC_SITE_KEY')).not.toThrow();
  });

  it('requires a CAPTCHA token on localhost when Turnstile is configured', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new URL('http://localhost:5173/account'),
    });

    expect(requiresCaptcha('local-turnstile-key')).toBe(true);
    expect(() => assertCaptchaToken('', 'local-turnstile-key')).toThrow('Veuillez valider la protection anti-bot.');
  });
});
