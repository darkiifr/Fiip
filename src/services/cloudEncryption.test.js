import { beforeEach, describe, expect, it } from 'vitest';

import {
  decryptNoteFromCloud,
  decryptSettingsEnvelope,
  encryptNoteForCloud,
  encryptSettingsEnvelope,
} from './cloudEncryption';
import { clearZeroKnowledgePassphrase, setZeroKnowledgePassphrase } from './zeroKnowledge';

describe('cloud encryption envelopes', () => {
  beforeEach(() => {
    clearZeroKnowledgePassphrase();
    setZeroKnowledgePassphrase('test passphrase');
  });

  it('removes every private note field from the server payload', async () => {
    const payload = await encryptNoteForCloud({
      id: '5b4fba70-46c3-4a2a-b2ac-53bb2f743a45',
      title: 'Roadmap',
      content: '<p>Confidentiel</p>',
      attachments: [{ id: 'file-1', name: 'secret.pdf', ocrText: 'private OCR' }],
      tags: ['private'],
      badges: [{ id: 'urgent', label: 'Urgent' }],
      updatedAt: 1234,
    }, { userId: '12f9500b-707d-4d7f-a003-424ca047d80c' });

    expect(payload.title).toBe('');
    expect(payload.content).toBe('');
    expect(payload.attachments).toEqual([]);
    expect(payload.tags).toEqual([]);
    expect(payload.badges).toEqual([]);
    expect(payload.encrypted_content_v2).toMatch(/^ENC:/);
    expect(JSON.stringify(payload)).not.toContain('Confidentiel');
    expect(JSON.stringify(payload)).not.toContain('secret.pdf');
    expect(JSON.stringify(payload)).not.toContain('private OCR');
  });

  it('round-trips an encrypted note payload', async () => {
    const note = {
      id: '5b4fba70-46c3-4a2a-b2ac-53bb2f743a45',
      title: 'Roadmap',
      content: '<p>Confidentiel</p>',
      attachments: [],
      tags: ['private'],
      badges: [],
      updatedAt: 1234,
    };
    const payload = await encryptNoteForCloud(note, {
      userId: '12f9500b-707d-4d7f-a003-424ca047d80c',
    });
    const restored = await decryptNoteFromCloud(payload);

    expect(restored.title).toBe(note.title);
    expect(restored.content).toBe(note.content);
    expect(restored.tags).toEqual(note.tags);
  });

  it('encrypts settings independently so the server can merge timestamps', async () => {
    const envelope = await encryptSettingsEnvelope(
      { theme: 'dark', saved_custom_badges: [{ label: 'Secret' }] },
      '2026-07-20T10:00:00.000Z',
    );

    expect(envelope.theme.updatedAt).toBe('2026-07-20T10:00:00.000Z');
    expect(envelope.theme.ciphertext).toMatch(/^ENC:/);
    expect(JSON.stringify(envelope)).not.toContain('Secret');

    await expect(decryptSettingsEnvelope(envelope)).resolves.toEqual({
      theme: 'dark',
      saved_custom_badges: [{ label: 'Secret' }],
    });
  });
});
