import 'react-native-get-random-values';

import { gcm } from '@noble/ciphers/aes';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToUtf8, utf8ToBytes } from '@noble/hashes/utils';
import { fromByteArray, toByteArray } from 'base64-js';

const ENCRYPTED_PREFIX = 'ENC:';
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

let passphraseInMemory: string | null = null;

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  const nativeCrypto = (globalThis as typeof globalThis & {
    crypto: { getRandomValues: <T extends ArrayBufferView>(value: T) => T };
  }).crypto;
  nativeCrypto.getRandomValues(bytes);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  return pbkdf2Async(sha256, utf8ToBytes(passphrase), salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: KEY_LENGTH,
  });
}

function requirePassphrase() {
  if (!passphraseInMemory) {
    throw new Error('ZERO_KNOWLEDGE_LOCKED');
  }
  return passphraseInMemory;
}

export function setZeroKnowledgePassphrase(passphrase: string) {
  if (passphrase.trim().length < 8) {
    throw new Error('PASSPHRASE_TOO_SHORT');
  }
  passphraseInMemory = passphrase;
}

export function getZeroKnowledgePassphrase() {
  return passphraseInMemory;
}

export function clearZeroKnowledgePassphrase() {
  passphraseInMemory = null;
}

export async function encryptSensitiveBytes(plainBytes: Uint8Array) {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = await deriveKey(requirePassphrase(), salt);
  const ciphertext = gcm(key, iv).encrypt(plainBytes);
  return `${ENCRYPTED_PREFIX}${fromByteArray(salt)}:${fromByteArray(iv)}:${fromByteArray(ciphertext)}`;
}

export async function decryptSensitiveBytes(envelope: string) {
  if (!envelope.startsWith(ENCRYPTED_PREFIX)) {
    throw new Error('INVALID_ENCRYPTED_PAYLOAD');
  }

  const [saltBase64, ivBase64, ciphertextBase64] = envelope
    .slice(ENCRYPTED_PREFIX.length)
    .split(':');
  if (!saltBase64 || !ivBase64 || !ciphertextBase64) {
    throw new Error('INVALID_ENCRYPTED_PAYLOAD');
  }

  const salt = toByteArray(saltBase64);
  const iv = toByteArray(ivBase64);
  const ciphertext = toByteArray(ciphertextBase64);
  const key = await deriveKey(requirePassphrase(), salt);

  try {
    return gcm(key, iv).decrypt(ciphertext);
  } catch {
    throw new Error('DECRYPTION_FAILED');
  }
}

export async function encryptSensitiveJson(value: unknown) {
  return encryptSensitiveBytes(utf8ToBytes(JSON.stringify(value)));
}

export async function decryptSensitiveJson<T = unknown>(envelope: string): Promise<T> {
  const bytes = await decryptSensitiveBytes(envelope);
  return JSON.parse(bytesToUtf8(bytes)) as T;
}

export async function createPassphraseVerifier(passphrase: string) {
  setZeroKnowledgePassphrase(passphrase);
  return encryptSensitiveJson({ marker: 'fiip-zero-knowledge-v1' });
}

export async function unlockWithPassphrase(passphrase: string, verifier: string) {
  setZeroKnowledgePassphrase(passphrase);
  try {
    const value = await decryptSensitiveJson<{ marker?: string }>(verifier);
    if (value.marker !== 'fiip-zero-knowledge-v1') throw new Error('INVALID_PASSPHRASE');
    return true;
  } catch {
    clearZeroKnowledgePassphrase();
    throw new Error('INVALID_PASSPHRASE');
  }
}
