import { describe, expect, it, vi } from 'vitest';

import { importFiinFromPath, isFiinPath, normalizeFiinNotePayload } from './fileManager';

describe('Fiip .fiin import', () => {
  it('recognizes .fiin paths only', () => {
    expect(isFiinPath('C:/notes/demo.fiin')).toBe(true);
    expect(isFiinPath('C:/notes/demo.FIIN')).toBe(true);
    expect(isFiinPath('C:/notes/demo.json')).toBe(false);
  });

  it('normalizes an exported note and resets share-only fields', () => {
    const note = normalizeFiinNotePayload({
      id: 'public-note',
      title: 'Note exportée',
      content: '<p>Hello</p>',
      public_slug: 'shared',
      favorite: true,
      deleted: true,
      tags: ['Projet'],
      attachments: [{ name: 'doc.pdf', type: 'pdf' }],
      updatedAt: 123,
    }, {
      randomUUID: () => 'imported-note',
      now: () => 999,
    });

    expect(note).toMatchObject({
      id: 'imported-note',
      title: 'Note exportée',
      content: '<p>Hello</p>',
      updatedAt: 123,
      createdAt: 123,
      favorite: true,
      deleted: false,
      public_slug: null,
      public: false,
      tags: ['Projet'],
    });
    expect(note.attachments).toEqual([{ name: 'doc.pdf', type: 'pdf' }]);
  });

  it('imports a .fiin file from disk through the provided reader', async () => {
    const readText = vi.fn().mockResolvedValue(JSON.stringify({ title: 'Depuis fichier', content: '<p>OK</p>' }));

    const note = await importFiinFromPath('C:/tmp/demo.fiin', {
      readText,
      randomUUID: () => 'note-id',
      now: () => 456,
    });

    expect(readText).toHaveBeenCalledWith('C:/tmp/demo.fiin');
    expect(note).toMatchObject({ id: 'note-id', title: 'Depuis fichier', content: '<p>OK</p>' });
  });

  it('keeps ISO timestamps from public .fiin exports', () => {
    const note = normalizeFiinNotePayload({
      title: 'Note publique',
      content: '<p>Export</p>',
      updated_at: '2026-06-27T09:30:00Z',
      created_at: '2026-06-26T09:30:00Z',
    }, {
      randomUUID: () => 'note-id',
      now: () => 1,
    });

    expect(note.updatedAt).toBe(new Date('2026-06-27T09:30:00Z').getTime());
    expect(note.createdAt).toBe(new Date('2026-06-26T09:30:00Z').getTime());
  });

  it('rejects files that are not .fiin', async () => {
    await expect(importFiinFromPath('C:/tmp/demo.json')).rejects.toThrow('Seuls les fichiers .fiin');
  });

  it('rejects unreadable .fiin payloads', () => {
    expect(() => normalizeFiinNotePayload('{}')).toThrow('ne contient pas de note lisible');
  });
});
