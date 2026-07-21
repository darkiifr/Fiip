import {
  clearZeroKnowledgePassphrase,
  createPassphraseVerifier,
  decryptSensitiveJson,
  encryptSensitiveJson,
  getZeroKnowledgePassphrase,
  setZeroKnowledgePassphrase,
  unlockWithPassphrase,
} from './zeroKnowledge';

describe('mobile zero-knowledge crypto', () => {
  afterEach(() => clearZeroKnowledgePassphrase());

  it('keeps the passphrase in memory and round-trips sensitive JSON', async () => {
    setZeroKnowledgePassphrase('mobile secret phrase');
    expect(getZeroKnowledgePassphrase()).toBe('mobile secret phrase');

    const encrypted = await encryptSensitiveJson({ title: 'Private', ocr: 'secret text' });
    expect(encrypted).toMatch(/^ENC:/);
    expect(encrypted).not.toContain('Private');
    await expect(decryptSensitiveJson(encrypted)).resolves.toEqual({
      title: 'Private',
      ocr: 'secret text',
    });
  });

  it('unlocks from an encrypted verifier without persisting the passphrase', async () => {
    const verifier = await createPassphraseVerifier('another mobile phrase');
    clearZeroKnowledgePassphrase();
    await expect(unlockWithPassphrase('wrong phrase', verifier)).rejects.toThrow('INVALID_PASSPHRASE');
    expect(getZeroKnowledgePassphrase()).toBeNull();
    await expect(unlockWithPassphrase('another mobile phrase', verifier)).resolves.toBe(true);
  });
});
