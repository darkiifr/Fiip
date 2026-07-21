/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('tesseract.js', () => ({
  recognize: vi.fn(),
}));

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

import { recognize } from 'tesseract.js';

import { assessOcrQuality, canRunImageOcr, classifyOcrResult, extractImageOcr, shouldRunAttachmentOcr } from './ocr';

describe('ocr service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 24, height: 12 })));
  });

  it('detects supported image inputs', () => {
    expect(canRunImageOcr({ type: 'image/png', name: 'scan.png' })).toBe(true);
    expect(canRunImageOcr({ type: '', name: 'receipt.jpg' })).toBe(true);
    expect(canRunImageOcr({ type: '', name: 'screen.avif' })).toBe(true);
    expect(canRunImageOcr({ type: 'image/heic', name: 'photo.heic' })).toBe(true);
    expect(canRunImageOcr({ type: 'application/pdf', name: 'doc.pdf' })).toBe(false);
  });

  it('does not submit drawings to OCR', () => {
    expect(shouldRunAttachmentOcr({
      name: 'croquis-123.png',
      mimeType: 'image/png',
      attachmentSource: 'drawing',
      skipOcr: true,
    })).toBe(false);
    expect(shouldRunAttachmentOcr({ name: 'scan.png', mimeType: 'image/png' })).toBe(true);
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

  it('assesses OCR quality with penalties for noisy scans', () => {
    const readable = assessOcrQuality({
      text: 'Facture client\nTotal 42 euros\nMerci',
      confidence: 88,
      words: [
        { text: 'Facture', confidence: 91 },
        { text: 'client', confidence: 89 },
        { text: 'Total', confidence: 86 },
      ],
    });
    const noisy = assessOcrQuality({ text: '4043 //// === 1544', confidence: 51 });

    expect(readable.score).toBeGreaterThan(78);
    expect(readable.level).toBe('high');
    expect(noisy.level).toBe('low');
    expect(noisy.reasons).toContain('too-few-letters');
  });

  it('uses the native Tauri OCR command when an image path is available', async () => {
    mockInvoke.mockResolvedValueOnce({
      text: '  Bonjour Fiip\n',
      confidence: 88,
      engine: 'windows-media-ocr',
      source_width: 200,
      source_height: 100,
      words: [
        { text: 'Bonjour', confidence: 92, bbox: { x: 10, y: 20, width: 80, height: 18 } },
      ],
    });

    const result = await extractImageOcr({ path: 'C:/tmp/scan.png', type: 'image/png', name: 'scan.png' });

    expect(mockInvoke).toHaveBeenCalledWith('scan_image_to_text', { imagePath: 'C:/tmp/scan.png' });
    expect(recognize).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      text: 'Bonjour Fiip',
      confidence: 88,
      status: 'complete',
      engine: 'windows-media-ocr',
      words: [{ text: 'Bonjour', confidence: 92, bbox: { x: 10, y: 20, width: 80, height: 18 }, sourceWidth: 200, sourceHeight: 100 }],
      classification: { kind: 'printed' },
    });
  });

  it('retries a weak native result through the local quality pipeline', async () => {
    mockInvoke.mockResolvedValueOnce({
      text: '4043 ////',
      confidence: 21,
      engine: 'windows-media-ocr',
      words: [],
    });
    recognize.mockResolvedValueOnce({
      data: {
        text: 'Facture client Total 42 euros',
        confidence: 90,
        image: { width: 240, height: 120 },
        words: [{ text: 'Facture', confidence: 91, bbox: { x0: 12, y0: 24, x1: 92, y1: 42 } }],
      },
    });
    const file = new File(['fake'], 'scan.png', { type: 'image/png' });

    const result = await extractImageOcr({ path: 'C:/tmp/scan.png', type: 'image/png', name: 'scan.png' }, { fallbackFile: file });

    expect(recognize).toHaveBeenCalled();
    expect(result.engine).toBe('tesseract.js');
    expect(result.text).toContain('Facture client');
  });

  it('retries short native OCR without confidence when the fallback extracts more lines', async () => {
    mockInvoke.mockResolvedValueOnce({
      text: 'résultat expérience 049\nle médecin prends du temps...',
      engine: 'windows-media-ocr',
      words: [],
    });
    recognize.mockResolvedValueOnce({
      data: {
        text: 'résultat expérience 049\nle médecin prends du temps...\naucun sujet ne c’est transformé !\nc’est à la fois une réussite et un échec.',
        confidence: 83,
        image: { width: 360, height: 220 },
        words: [
          { text: 'résultat', confidence: 84, bbox: { x0: 10, y0: 10, x1: 86, y1: 28 } },
          { text: 'médecin', confidence: 82, bbox: { x0: 10, y0: 60, x1: 78, y1: 78 } },
        ],
      },
    });
    const file = new File(['fake'], 'lined-note.png', { type: 'image/png' });

    const result = await extractImageOcr(
      { path: 'C:/tmp/lined-note.png', type: 'image/png', name: 'lined-note.png' },
      { fallbackFile: file },
    );

    expect(recognize).toHaveBeenCalled();
    expect(result.engine).toBe('tesseract.js');
    expect(result.fallbackFrom).toBe('native-low-quality');
    expect(result.text).toContain('aucun sujet');
    expect(result.text).toContain('réussite');
  });

  it('falls back to tesseract.js when native OCR cannot be used', async () => {
    recognize.mockResolvedValueOnce({
      data: {
        text: '  Bonjour Fiip\n',
        confidence: 88,
        image: { width: 240, height: 120 },
        words: [
          { text: 'Bonjour', confidence: 86, bbox: { x0: 12, y0: 24, x1: 92, y1: 42 } },
        ],
      },
    });
    const file = new File(['fake'], 'scan.png', { type: 'image/png' });

    const result = await extractImageOcr(file);

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(recognize).toHaveBeenCalled();
    expect(result.status).toBe('complete');
    expect(result.qualityScore).toBeGreaterThan(70);
    expect(result.words[0]).toMatchObject({ text: 'Bonjour', bbox: { x: 12, y: 24, width: 80, height: 18 }, sourceWidth: 240, sourceHeight: 120 });
  });

  it('runs a sparse text retry when the first OCR pass quality is low', async () => {
    recognize
      .mockResolvedValueOnce({
        data: {
          text: '4043 ////',
          confidence: 24,
          image: { width: 240, height: 120 },
          words: [],
        },
      })
      .mockResolvedValueOnce({
        data: {
          text: 'Bonjour Fiip',
          confidence: 86,
          image: { width: 240, height: 120 },
          words: [
            { text: 'Bonjour', confidence: 85, bbox: { x0: 8, y0: 16, x1: 90, y1: 40 } },
            { text: 'Fiip', confidence: 88, bbox: { x0: 98, y0: 16, x1: 140, y1: 40 } },
          ],
        },
      });
    const file = new File(['fake'], 'scan.png', { type: 'image/png' });

    const result = await extractImageOcr(file);

    expect(recognize).toHaveBeenCalledTimes(2);
    expect(result.text).toBe('Bonjour Fiip');
    expect(result.ocrVariant).toContain('sparse');
    expect(result.qualityLevel).toBe('high');
  });

  it('cleans common chat screenshot timestamp artifacts from OCR text', async () => {
    recognize.mockResolvedValueOnce({
      data: {
        text: "J'vais me doucher là juste 4043\nCherche BTBF sur Google = 40-43\nIly atoutles leaks = 404",
        confidence: 76,
        image: { width: 420, height: 260 },
        words: [],
      },
    });
    const file = new File(['fake'], 'conversation.png', { type: 'image/png' });

    const result = await extractImageOcr(file);

    expect(result.text).toBe("J'vais me doucher là juste\nCherche BTBF sur Google\nIl y a tous les leaks");
  });

  it('falls back to tesseract.js when native OCR rejects a cached image path', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Unsupported image format'));
    recognize.mockResolvedValueOnce({
      data: {
        text: 'Texte visible',
        confidence: 82,
        image: { width: 320, height: 120 },
        words: [
          { text: 'Texte', confidence: 80, bbox: { x0: 20, y0: 30, x1: 80, y1: 54 } },
        ],
      },
    });
    const file = new File(['fake'], 'capture.avif', { type: 'image/avif' });

    const result = await extractImageOcr(
      { path: 'C:/tmp/capture.avif', type: 'image/avif', name: 'capture.avif' },
      { fallbackFile: file },
    );

    expect(mockInvoke).toHaveBeenCalledWith('scan_image_to_text', { imagePath: 'C:/tmp/capture.avif' });
    expect(recognize).toHaveBeenCalled();
    expect(result).toMatchObject({
      text: 'Texte visible',
      confidence: 82,
      status: 'complete',
      engine: 'tesseract.js',
      fallbackFrom: 'native',
    });
  });

  it('skips protected notes', async () => {
    const file = new File(['fake'], 'scan.png', { type: 'image/png' });

    const result = await extractImageOcr(file, { protectedNote: true });

    expect(recognize).not.toHaveBeenCalled();
    expect(result.status).toBe('skipped-protected');
  });
});
