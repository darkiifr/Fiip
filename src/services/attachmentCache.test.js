import { describe, expect, it } from 'vitest';

import { classifyAttachment, formatBytes, normalizeAttachmentName } from './attachmentCache';

describe('attachment cache helpers', () => {
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
});
