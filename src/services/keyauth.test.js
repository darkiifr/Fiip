import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve('hwid-test')),
}));

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}));

describe('KeyAuth service state helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    const store = new Map();
    const memoryStorage = {
      getItem: vi.fn((key) => store.get(key) ?? null),
      setItem: vi.fn((key, value) => store.set(key, String(value))),
      removeItem: vi.fn((key) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    };
    Object.defineProperty(window, 'localStorage', {
      value: memoryStorage,
      configurable: true,
    });
    vi.stubGlobal('localStorage', memoryStorage);
    localStorage.clear();
  });

  it('verifyLicense delegates to validateLicense', async () => {
    const { keyAuthService } = await import('./keyauth');
    const validateSpy = vi
      .spyOn(keyAuthService, 'validateLicense')
      .mockResolvedValue({ success: true, level: 2, message: 'ok' });

    await expect(keyAuthService.verifyLicense('license-key')).resolves.toEqual({
      success: true,
      level: 2,
      message: 'ok',
    });
    expect(validateSpy).toHaveBeenCalledWith('license-key');
  });

  it('setLocalLevel(0) clears premium and AI access', async () => {
    const { keyAuthService } = await import('./keyauth');

    keyAuthService.setLocalLevel(3, 'Vincent', 'license-key');
    expect(keyAuthService.hasAIAccess()).toBe(true);

    keyAuthService.setLocalLevel(0);

    expect(keyAuthService.isAuthenticated).toBe(false);
    expect(keyAuthService.currentLevel).toBe(0);
    expect(keyAuthService.userData).toBeNull();
    expect(keyAuthService.licenseKey).toBeNull();
    expect(keyAuthService.hasAIAccess()).toBe(false);
  });

  it('labels level 4 access as Family Pro', async () => {
    const { keyAuthService } = await import('./keyauth');

    keyAuthService.setLocalLevel(4, 'family@fiip.app');

    expect(keyAuthService.isAuthenticated).toBe(true);
    expect(keyAuthService.getCurrentSubscriptionName()).toBe('Family Pro');
  });

  it('logout clears local license and trial state', async () => {
    const { keyAuthService } = await import('./keyauth');

    keyAuthService.setLocalLevel(2, 'Vincent', 'license-key');
    keyAuthService.logout();

    expect(keyAuthService.isAuthenticated).toBe(false);
    expect(keyAuthService.isTrialActive).toBe(false);
    expect(keyAuthService.currentLevel).toBe(0);
    expect(localStorage.getItem('saved_license_key')).toBeNull();
    expect(localStorage.getItem('fiip-trial-expiry')).toBeNull();
  });
});
