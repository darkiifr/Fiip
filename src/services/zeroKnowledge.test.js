import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearZeroKnowledgePassphrase,
  createPassphraseVerifier,
  getZeroKnowledgePassphrase,
  setZeroKnowledgePassphrase,
  unlockWithPassphrase,
} from './zeroKnowledge';

describe('zeroKnowledge passphrase lifecycle', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    clearZeroKnowledgePassphrase();
  });

  it('keeps the passphrase in memory instead of browser storage', () => {
    expect(setZeroKnowledgePassphrase('correct horse battery staple')).toBe(true);
    expect(getZeroKnowledgePassphrase()).toBe('correct horse battery staple');
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.getItem('fiip-zk-passphrase-session')).toBeFalsy();
  });

  it('unlocks only when the encrypted verifier matches', async () => {
    const verifier = await createPassphraseVerifier('secret phrase');
    clearZeroKnowledgePassphrase();

    await expect(unlockWithPassphrase('wrong phrase', verifier)).resolves.toBe(false);
    expect(getZeroKnowledgePassphrase()).toBeNull();

    await expect(unlockWithPassphrase('secret phrase', verifier)).resolves.toBe(true);
    expect(getZeroKnowledgePassphrase()).toBe('secret phrase');
  });
});
