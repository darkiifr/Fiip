import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase.js', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import {
  activateLicense,
  fetchAccountDevices,
  fetchSecurityEvents,
  registerCurrentDevice,
  revokeAllDevices,
  revokeDevice,
  assertCaptchaToken,
  requiresCaptcha,
  signInWithMagicLink,
  signInWithPassword,
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

  it('passes CAPTCHA tokens to Supabase auth calls', async () => {
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
        emailRedirectTo: `${window.location.origin}/account`,
        captchaToken: 'magic-token',
      },
    });
  });

  it('requires a CAPTCHA token when Turnstile is configured', () => {
    expect(requiresCaptcha('')).toBe(false);
    expect(requiresCaptcha('0xPUBLIC_SITE_KEY')).toBe(true);
    expect(() => assertCaptchaToken('', '0xPUBLIC_SITE_KEY')).toThrow('Veuillez valider la protection anti-bot.');
    expect(() => assertCaptchaToken('turnstile-token', '0xPUBLIC_SITE_KEY')).not.toThrow();
  });
});
