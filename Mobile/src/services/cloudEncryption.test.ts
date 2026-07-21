import {
  decryptNoteFromCloud,
  decryptSettingsEnvelope,
  encryptNoteForCloud,
  encryptSettingsEnvelope,
} from './cloudEncryption';
import { clearZeroKnowledgePassphrase, setZeroKnowledgePassphrase } from './zeroKnowledge';

describe('mobile cloud encryption', () => {
  beforeEach(() => setZeroKnowledgePassphrase('mobile cloud passphrase'));
  afterEach(() => clearZeroKnowledgePassphrase());

  it('removes private note fields from the server payload', async () => {
    const encrypted = await encryptNoteForCloud({
      id: 'note-1',
      title: 'Secret title',
      content: 'Secret body',
      tags: ['private'],
      attachments: [{ name: 'secret.pdf' }],
    }, { userId: 'user-1' });

    expect(encrypted.title).toBe('');
    expect(encrypted.content).toBe('');
    expect(JSON.stringify(encrypted)).not.toContain('Secret title');
    expect(JSON.stringify(encrypted)).not.toContain('secret.pdf');

    const decrypted = await decryptNoteFromCloud(encrypted);
    expect(decrypted.title).toBe('Secret title');
    expect(decrypted.content).toBe('Secret body');
  });

  it('encrypts settings independently by key', async () => {
    const envelope = await encryptSettingsEnvelope({ theme: 'dark', locale: 'fr' });
    expect(envelope.theme.ciphertext).not.toContain('dark');
    await expect(decryptSettingsEnvelope(envelope)).resolves.toEqual({
      theme: 'dark',
      locale: 'fr',
    });
  });
});
