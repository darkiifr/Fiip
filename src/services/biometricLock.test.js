import { describe, expect, it, vi } from 'vitest';

import {
  authenticateBiometricLock,
  enrollBiometricLock,
  getBiometricPlatformInfo,
  getBiometricUserMessage,
  isBiometricApiAvailable,
} from './biometricLock';

describe('biometric lock helpers', () => {
  it('uses OS-specific copy for platform authenticators', () => {
    expect(getBiometricPlatformInfo('macos').name).toBe('Touch ID ou mot de passe macOS');
    expect(getBiometricPlatformInfo('windows').name).toBe('Windows Hello');
    expect(getBiometricPlatformInfo('linux').name).toBe('Authentification locale Linux');
  });

  it('detects whether WebAuthn can provide local OS authentication', () => {
    expect(isBiometricApiAvailable({
      PublicKeyCredential: function PublicKeyCredential() {},
      navigator: { credentials: {} },
    })).toBe(true);
    expect(isBiometricApiAvailable({ navigator: { credentials: {} } })).toBe(false);
  });

  it('enrolls a platform credential and stores its id', async () => {
    const storage = new Map();
    const navigatorLike = {
      credentials: {
        create: vi.fn().mockResolvedValue({
          rawId: Uint8Array.from([1, 2, 3]).buffer,
        }),
      },
    };

    const result = await enrollBiometricLock({
      navigatorLike,
      storage: {
        setItem: (key, value) => storage.set(key, value),
      },
      randomValues: (bytes) => bytes.fill(7),
    });

    expect(result.enabled).toBe(true);
    expect(JSON.parse(storage.get('fiip-biometric-lock')).credentialId).toBe('AQID');
    expect(navigatorLike.credentials.create).toHaveBeenCalledWith({
      publicKey: expect.objectContaining({
        authenticatorSelection: expect.objectContaining({
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        }),
      }),
    });
  });

  it('authenticates with the stored platform credential', async () => {
    const navigatorLike = {
      credentials: {
        get: vi.fn().mockResolvedValue({ id: 'credential' }),
      },
    };

    await expect(authenticateBiometricLock({
      navigatorLike,
      storage: {
        getItem: () => JSON.stringify({ credentialId: 'AQID' }),
      },
      randomValues: (bytes) => bytes.fill(3),
    })).resolves.toEqual({ authenticated: true });
  });

  it('turns browser WebAuthn failures into readable user messages', () => {
    expect(getBiometricUserMessage(new DOMException(
      'The operation either timed out or was not allowed. See: https://www.w3.org/TR/webauthn-2/#sctn-privacy-considerations-client.',
      'NotAllowedError',
    ))).toBe('Déverrouillage annulé ou expiré. Réessayez avec l’authentification de votre appareil.');

    expect(getBiometricUserMessage(new Error('Unexpected failure'))).toBe('Fiip n’a pas pu vérifier votre identité. Réessayez dans un instant.');
  });
});
