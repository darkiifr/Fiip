import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cacheAttachment,
  classifyAttachment,
  formatBytes,
  getAttachmentCacheSize,
  getAttachmentPreviewUrl,
  normalizeAttachmentName,
  readAttachmentOcrCache,
  writeAttachmentOcrCache,
} from './attachmentCache';

function installIndexedDbMock() {
  const records = new Map();
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: vi.fn(),
    close: vi.fn(),
    transaction: vi.fn(() => {
      const transaction = {
        objectStore: () => ({
          put: (value) => records.set(value.cachePath, value),
          clear: () => records.clear(),
          get: (key) => {
            const request = {};
            setTimeout(() => {
              request.result = records.get(key);
              request.onsuccess?.();
            }, 0);
            return request;
          },
          getAll: () => {
            const request = {};
            setTimeout(() => {
              request.result = [...records.values()];
              request.onsuccess?.();
            }, 0);
            return request;
          },
        }),
      };
      setTimeout(() => transaction.oncomplete?.(), 5);
      return transaction;
    }),
  };
  const indexedDBMock = {
    open: vi.fn(() => {
      const request = { result: db };
      setTimeout(() => request.onsuccess?.(), 0);
      return request;
    }),
  };
  vi.stubGlobal('indexedDB', indexedDBMock);
  return { records };
}

describe('attachment cache helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('classifies common previewable attachment types', () => {
    expect(classifyAttachment({ name: 'photo.JPG', mimeType: 'image/jpeg' })).toMatchObject({ kind: 'image', previewable: true });
    expect(classifyAttachment({ name: 'clip.mp4', mimeType: 'video/mp4' })).toMatchObject({ kind: 'video', previewable: true });
    expect(classifyAttachment({ name: 'voice.mp3', mimeType: 'audio/mpeg' })).toMatchObject({ kind: 'audio', previewable: true });
    expect(classifyAttachment({ name: 'notes.md', mimeType: 'text/markdown' })).toMatchObject({ kind: 'text', previewable: true });
    expect(classifyAttachment({ name: 'deck.pptx' })).toMatchObject({ kind: 'presentation', previewable: false });
    expect(classifyAttachment({ name: 'archive.zip' })).toMatchObject({ kind: 'archive', previewable: false });
  });

  it('normalizes unsafe names without dropping the extension', () => {
    expect(normalizeAttachmentName('../../Budget final.pdf')).toBe('Budget-final.pdf');
    expect(normalizeAttachmentName('')).toMatch(/^fichier-/);
  });

  it('formats cache sizes for settings', () => {
    expect(formatBytes(0)).toBe('0 o');
    expect(formatBytes(1536)).toBe('1.5 Ko');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2 Mo');
  });

  it('caches attachments in IndexedDB when running in browser dev mode', async () => {
    const { records } = installIndexedDbMock();
    const file = new File(['scan'], 'scan-webcam.png', { type: 'image/png' });

    const attachment = await cacheAttachment(file, 'note-1');

    expect(attachment).toMatchObject({
      name: 'scan-webcam.png',
      type: 'image',
      previewable: true,
    });
    expect(attachment.cachePath).toMatch(/^indexeddb:\/\/attachments\/note-1\//);
    expect(records.has(attachment.cachePath)).toBe(true);
  });

  it('hydrates previews and OCR from the persistent browser cache', async () => {
    const { records } = installIndexedDbMock();
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/cached-scan');
    const file = new File(['scan text'], 'scan-webcam.png', { type: 'image/png' });
    const attachment = await cacheAttachment(file, 'note-1');

    const previewUrl = await getAttachmentPreviewUrl(attachment);
    const wroteOcr = await writeAttachmentOcrCache(attachment, {
      text: 'Facture Fiip',
      status: 'complete',
      confidence: 91,
    });
    const cachedOcr = await readAttachmentOcrCache(attachment);
    const cacheSize = await getAttachmentCacheSize();

    expect(previewUrl).toMatch(/^blob:/);
    expect(wroteOcr).toBe(true);
    expect(cachedOcr).toMatchObject({ text: 'Facture Fiip', status: 'complete' });
    expect(cacheSize).toBe(file.size);
    expect(records.get(attachment.cachePath).ocrCache).toMatchObject({ attachmentId: attachment.id });
    createObjectUrlSpy.mockRestore();
  });

  it('keeps attachments usable when IndexedDB is blocked', async () => {
    vi.stubGlobal('indexedDB', {
      open: vi.fn(() => {
        const request = { error: new Error('blocked') };
        setTimeout(() => request.onerror?.(), 0);
        return request;
      }),
    });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const file = new File(['drawing'], 'croquis.png', { type: 'image/png' });

    const attachment = await cacheAttachment(file, 'note-1');

    expect(attachment).toMatchObject({
      name: 'croquis.png',
      type: 'image',
      previewable: true,
    });
    expect(attachment.cachePath).toMatch(/^memory:\/\/attachments\/note-1\//);
    consoleSpy.mockRestore();
  });
});
