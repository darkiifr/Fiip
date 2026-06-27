import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('tesseract.js', () => ({
  recognize: vi.fn(),
}));

import { recognize } from 'tesseract.js';
import { canRunImageOcr, classifyOcrResult, extractImageOcr } from './ocr';

describe('ocr service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 24, height: 12 })));
  });

  it('detects supported image inputs', () => {
    expect(canRunImageOcr({ type: 'image/png', name: 'scan.png' })).toBe(true);
    expect(canRunImageOcr({ type: '', name: 'receipt.jpg' })).toBe(true);
    expect(canRunImageOcr({ type: 'application/pdf', name: 'doc.pdf' })).toBe(false);
  });

  it('classifies printed text with high confidence', () => {
    expect(classifyOcrResult({ text: 'Facture 2026', confidence: 91 })).toMatchObject({
      kind: 'printed',
      label: 'Texte imprimé détecté',
    });
  });

  it('classifies lower confidence text as possible handwriting', () => {
    expect(classifyOcrResult({ text: 'liste courses', confidence: 54 })).toMatchObject({
      kind: 'maybe-handwritten',
    });
  });

  it('runs tesseract locally and returns normalized OCR metadata', async () => {
    recognize.mockResolvedValueOnce({
      data: {
        text: '  Bonjour Fiip\n',
        confidence: 88,
      },
    });
    const file = new File(['fake'], 'scan.png', { type: 'image/png' });

    const result = await extractImageOcr(file);

    expect(recognize).toHaveBeenCalled();
    expect(result).toMatchObject({
      text: 'Bonjour Fiip',
      confidence: 88,
      status: 'complete',
      classification: { kind: 'printed' },
    });
  });

  it('skips protected notes', async () => {
    const file = new File(['fake'], 'scan.png', { type: 'image/png' });

    const result = await extractImageOcr(file, { protectedNote: true });

    expect(recognize).not.toHaveBeenCalled();
    expect(result.status).toBe('skipped-protected');
  });
});
