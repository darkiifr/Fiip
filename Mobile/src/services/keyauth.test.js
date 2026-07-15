/* eslint-disable @typescript-eslint/no-require-imports */
describe('mobile KeyAuth service state helpers', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('verifyLicense delegates to validateLicense', async () => {
    const { keyAuthService } = require('./keyauth');
    const validateSpy = jest
      .spyOn(keyAuthService, 'validateLicense')
      .mockResolvedValue({ success: true, level: 2, message: 'ok' });

    await expect(keyAuthService.verifyLicense('license-key')).resolves.toEqual({
      success: true,
      level: 2,
      message: 'ok',
    });
    expect(validateSpy).toHaveBeenCalledWith('license-key');
  });

  it('setLocalLevel(0) clears premium and AI access', () => {
    const { keyAuthService } = require('./keyauth');

    keyAuthService.setLocalLevel(2, 'Vincent', 'license-key');
    expect(keyAuthService.hasAIAccess()).toBe(true);

    keyAuthService.setLocalLevel(0);

    expect(keyAuthService.isAuthenticated).toBe(false);
    expect(keyAuthService.currentLevel).toBe(0);
    expect(keyAuthService.userData).toBeNull();
    expect(keyAuthService.licenseKey).toBeNull();
    expect(keyAuthService.hasAIAccess()).toBe(false);
  });

  it('labels level 4 access as Family Pro', () => {
    const { keyAuthService } = require('./keyauth');

    keyAuthService.setLocalLevel(4, 'family@fiip.app');

    expect(keyAuthService.isAuthenticated).toBe(true);
    expect(keyAuthService.getCurrentSubscriptionName()).toBe('Family Pro');
  });

  it('logout clears stored license and trial state', async () => {
    const { keyAuthService } = require('./keyauth');

    keyAuthService.setLocalLevel(2, 'Vincent', 'license-key');
    await keyAuthService.logout();
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    expect(keyAuthService.isAuthenticated).toBe(false);
    expect(keyAuthService.currentLevel).toBe(0);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('saved_license_key');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('fiip-trial-expiry');
  });
});
