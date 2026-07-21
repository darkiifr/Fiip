import { decryptData, encryptData } from '../utils/crypto';

const PASSPHRASE_VERIFIER_VALUE = {
  type: 'fiip-zero-knowledge-verifier',
  version: 1,
};

let passphraseInMemory = null;

export function setZeroKnowledgePassphrase(passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length < 8) {return false;}
  passphraseInMemory = passphrase;
  return true;
}

export function clearZeroKnowledgePassphrase() {
  passphraseInMemory = null;
}

export function getZeroKnowledgePassphrase() {
  return passphraseInMemory;
}

export function hasZeroKnowledgePassphrase() {
  return Boolean(getZeroKnowledgePassphrase());
}

export async function encryptSensitiveJson(value, passphrase = getZeroKnowledgePassphrase()) {
  if (!passphrase) {throw new Error('ZERO_KNOWLEDGE_PASSPHRASE_REQUIRED');}
  return encryptData(value, passphrase);
}

export async function decryptSensitiveJson(value, passphrase = getZeroKnowledgePassphrase()) {
  if (!passphrase) {throw new Error('ZERO_KNOWLEDGE_PASSPHRASE_REQUIRED');}
  return decryptData(value, passphrase);
}

export async function encryptBlob(blob, passphrase = getZeroKnowledgePassphrase()) {
  if (!passphrase) {throw new Error('ZERO_KNOWLEDGE_PASSPHRASE_REQUIRED');}
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const encrypted = await encryptData(Array.from(bytes), passphrase);
  return new Blob([encrypted], { type: 'application/octet-stream' });
}

export async function decryptBlob(blob, passphrase = getZeroKnowledgePassphrase(), type = 'application/octet-stream') {
  if (!passphrase) {throw new Error('ZERO_KNOWLEDGE_PASSPHRASE_REQUIRED');}
  const encrypted = await blob.text();
  const bytes = await decryptData(encrypted, passphrase);
  return new Blob([new Uint8Array(bytes)], { type });
}

export async function createPassphraseVerifier(passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length < 8) {
    throw new Error('ZERO_KNOWLEDGE_PASSPHRASE_TOO_SHORT');
  }
  return encryptData(PASSPHRASE_VERIFIER_VALUE, passphrase);
}

export async function unlockWithPassphrase(passphrase, verifier) {
  try {
    const value = await decryptData(verifier, passphrase);
    if (
      value?.type !== PASSPHRASE_VERIFIER_VALUE.type
      || value?.version !== PASSPHRASE_VERIFIER_VALUE.version
    ) {
      return false;
    }
    return setZeroKnowledgePassphrase(passphrase);
  } catch {
    return false;
  }
}
