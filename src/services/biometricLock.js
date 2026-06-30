export const BIOMETRIC_LOCK_STORAGE_KEY = 'fiip-biometric-lock';

export function getBiometricPlatformInfo(osType = 'unknown') {
  if (osType === 'windows') {
    return {
      name: 'Windows Hello',
      description: 'Utilise le visage, l’empreinte, la clé de sécurité ou le code Windows Hello configuré sur ce PC.',
    };
  }
  if (osType === 'macos') {
    return {
      name: 'Touch ID ou mot de passe macOS',
      description: 'Utilise l’authentification locale macOS disponible sur ce Mac.',
    };
  }
  if (osType === 'linux') {
    return {
      name: 'Authentification locale Linux',
      description: 'Utilise l’authentificateur local disponible. Selon la distribution, cela peut nécessiter fprintd, PAM ou une clé de sécurité.',
    };
  }
  return {
    name: 'Authentification biométrique',
    description: 'Utilise l’authentificateur local proposé par le système.',
  };
}

export function isBiometricApiAvailable(context = globalThis) {
  return Boolean(context?.PublicKeyCredential && context?.navigator?.credentials);
}

export function getBiometricUserMessage(error) {
  const name = `${error?.name || ''}`;
  const message = `${error?.message || ''}`;
  const combined = `${name} ${message}`.toLowerCase();

  if (
    combined.includes('notallowed') ||
    combined.includes('timed out') ||
    combined.includes('timeout') ||
    combined.includes('not allowed') ||
    combined.includes('cancel') ||
    combined.includes('aborted')
  ) {
    return 'Déverrouillage annulé ou expiré. Réessayez avec l’authentification de votre appareil.';
  }

  if (combined.includes('not configured') || combined.includes('aucun verrouillage')) {
    return 'Aucun verrouillage local n’est configuré pour Fiip. Réactivez-le dans les paramètres.';
  }

  if (combined.includes('unavailable') || combined.includes('indisponible')) {
    return 'L’authentification locale est indisponible sur cet appareil.';
  }

  return 'Fiip n’a pas pu vérifier votre identité. Réessayez dans un instant.';
}

function bytesToBase64Url(bytes) {
  const binary = Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(value) {
  const base64 = `${value}`.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function createChallenge(randomValues = (bytes) => crypto.getRandomValues(bytes)) {
  const bytes = new Uint8Array(32);
  return randomValues(bytes);
}

export async function enrollBiometricLock({
  navigatorLike = navigator,
  storage = localStorage,
  randomValues,
} = {}) {
  if (!navigatorLike?.credentials?.create) {
    throw new Error('Authentification biométrique indisponible sur cet appareil.');
  }

  const credential = await navigatorLike.credentials.create({
    publicKey: {
      challenge: createChallenge(randomValues),
      rp: { name: 'Fiip' },
      user: {
        id: createChallenge(randomValues),
        name: 'fiip-local-user',
        displayName: 'Fiip',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'none',
    },
  });

  if (!credential?.rawId) {
    throw new Error('Aucun identifiant biométrique local n’a été créé.');
  }

  storage.setItem(BIOMETRIC_LOCK_STORAGE_KEY, JSON.stringify({
    credentialId: bytesToBase64Url(credential.rawId),
    createdAt: new Date().toISOString(),
  }));

  return { enabled: true };
}

export async function authenticateBiometricLock({
  navigatorLike = navigator,
  storage = localStorage,
  randomValues,
} = {}) {
  if (!navigatorLike?.credentials?.get) {
    throw new Error('Authentification biométrique indisponible sur cet appareil.');
  }

  const saved = JSON.parse(storage.getItem(BIOMETRIC_LOCK_STORAGE_KEY) || 'null');
  if (!saved?.credentialId) {
    throw new Error('Aucun verrouillage biométrique n’est configuré.');
  }

  await navigatorLike.credentials.get({
    publicKey: {
      challenge: createChallenge(randomValues),
      allowCredentials: [{
        id: base64UrlToBytes(saved.credentialId),
        type: 'public-key',
      }],
      userVerification: 'required',
      timeout: 60000,
    },
  });

  return { authenticated: true };
}

export function clearBiometricLock(storage = localStorage) {
  storage.removeItem(BIOMETRIC_LOCK_STORAGE_KEY);
}
