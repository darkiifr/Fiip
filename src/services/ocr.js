import { invoke } from '@tauri-apps/api/core';

import { getFriendlyErrorMessage } from './errorMessages';

const IMAGE_MIME_PATTERN = /^image\/(png|jpe?g|webp|bmp|tiff?|gif|avif|heic|heif)$/i;
const IMAGE_OCR_EXTENSION_PATTERN = /\.(png|jpe?g|webp|bmp|tiff?|gif|avif|heic|heif)$/i;
const OCR_LANGUAGES = 'fra+eng';
const OCR_QUALITY_RETRY_THRESHOLD = 62;

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function canRunImageOcr(fileOrAttachment = {}) {
  const mimeType = fileOrAttachment.type || fileOrAttachment.mimeType || '';
  const name = fileOrAttachment.name || '';
  return IMAGE_MIME_PATTERN.test(mimeType) || IMAGE_OCR_EXTENSION_PATTERN.test(name);
}

export function shouldRunAttachmentOcr(fileOrAttachment = {}, { protectedNote = false } = {}) {
  return !protectedNote
    && !fileOrAttachment.skipOcr
    && fileOrAttachment.attachmentSource !== 'drawing'
    && canRunImageOcr(fileOrAttachment);
}

export function classifyOcrResult({ text = '', confidence = 0 } = {}) {
  const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
  const score = Number(confidence) || 0;

  if (!cleanText) {
    return {
      kind: 'unreadable',
      label: 'Aucun texte détecté',
      confidence: score,
    };
  }

  if (score < 28) {
    return {
      kind: 'low-confidence',
      label: 'Texte détecté à vérifier',
      confidence: score,
    };
  }

  if (score >= 72) {
    return {
      kind: 'printed',
      label: 'Texte imprimé détecté',
      confidence: score,
    };
  }

  return {
    kind: 'maybe-handwritten',
    label: 'Écriture manuscrite possible',
    confidence: score,
  };
}

function getImagePath(fileOrAttachment = {}) {
  return fileOrAttachment.path || fileOrAttachment.cachePath || fileOrAttachment.filePath || '';
}

function normalizeOcrText(text = '') {
  return String(text || '')
    .replace(/\s+\n/g, '\n')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map(cleanChatOcrLine)
    .filter(Boolean)
    .join('\n')
    .trim();
}

function cleanChatOcrLine(line = '') {
  let value = String(line || '').trim();
  if (!value) {return '';}

  value = value
    .replace(/\s*[=~-]\s*\d{2}[-:]\d{2}\s*$/i, '')
    .replace(/\s*[=~-]\s*(?:[01]?\d|2[0-3])[-:h]?[0-5]\d\s*$/i, '')
    .replace(/\s+(?:[01]?\d|2[0-3])[:h][0-5]\d\s*$/i, '');

  if (/[a-zà-ÿ]/i.test(value)) {
    value = value
      .replace(/\s+\d{4}\s*$/i, '')
      .replace(/\s*[=~-]\s*\d{3,4}\s*$/i, '');
  }

  return value
    .replace(/\bIly\s+atoutles\b/gi, 'Il y a tous les')
    .replace(/\bIly\s+a\b/gi, 'Il y a')
    .replace(/\batoutles\b/gi, 'a tous les')
    .replace(/\bGoogle\s*=\s*$/i, 'Google')
    .trim();
}

function normalizeOcrWords(words = [], sourceWidth = 0, sourceHeight = 0) {
  return (Array.isArray(words) ? words : [])
    .map((word) => {
      const text = String(word?.text || '').trim();
      const box = word?.bbox || {};
      const x = Number(box.x ?? box.x0 ?? 0);
      const y = Number(box.y ?? box.y0 ?? 0);
      const rawWidth = Number(box.width ?? (Number(box.x1) - Number(box.x0) || 0));
      const rawHeight = Number(box.height ?? (Number(box.y1) - Number(box.y0) || 0));
      if (!text || rawWidth <= 0 || rawHeight <= 0) {
        return null;
      }

      return {
        text,
        confidence: Number(word?.confidence ?? word?.conf ?? 0),
        bbox: { x, y, width: rawWidth, height: rawHeight },
        sourceWidth: Number(sourceWidth) || Number(word?.sourceWidth) || 0,
        sourceHeight: Number(sourceHeight) || Number(word?.sourceHeight) || 0,
      };
    })
    .filter(Boolean)
    .slice(0, 1000);
}

function extractTesseractWords(data = {}) {
  const sourceWidth = Number(data?.image?.width || data?.blocks?.[0]?.bbox?.x1 || 0);
  const sourceHeight = Number(data?.image?.height || data?.blocks?.[0]?.bbox?.y1 || 0);
  return normalizeOcrWords(data.words, sourceWidth, sourceHeight);
}

export function assessOcrQuality({ text = '', confidence = 0, words = [] } = {}) {
  const cleanText = normalizeOcrText(text);
  if (!cleanText) {
    return {
      score: 0,
      level: 'empty',
      label: 'Aucun texte fiable',
      reasons: ['empty-text'],
    };
  }

  const compact = cleanText.replace(/\s+/g, '');
  const alphaCount = (cleanText.match(/[a-zà-ÿ]/gi) || []).length;
  const digitCount = (cleanText.match(/\d/g) || []).length;
  const symbolCount = (cleanText.match(/[^\p{L}\p{N}\s.,;:!?'"’()@#%€$+-]/gu) || []).length;
  const lineCount = cleanText.split('\n').filter(Boolean).length;
  const wordList = Array.isArray(words) ? words : [];
  const validWordCount = wordList.filter((word) => String(word?.text || '').trim()).length;
  const meanWordConfidence = validWordCount
    ? wordList.reduce((sum, word) => sum + clamp(word?.confidence, 0, 100), 0) / validWordCount
    : 0;
  const digitRatio = digitCount / Math.max(1, alphaCount);
  const symbolRatio = symbolCount / Math.max(1, compact.length);
  const repeatedNoise = /(.)\1{5,}/.test(compact);

  const reasons = [];
  let score = 0;
  score += clamp(confidence, 0, 100) * 0.62;
  score += Math.min(25, alphaCount * 0.48);
  score += Math.min(10, lineCount * 2.5);
  score += Math.min(10, validWordCount * 0.85);
  score += meanWordConfidence ? meanWordConfidence * 0.15 : 8;

  if (alphaCount < 6) {
    score -= 24;
    reasons.push('too-few-letters');
  }
  if (digitRatio > 0.45) {
    score -= Math.min(22, (digitRatio - 0.45) * 34);
    reasons.push('digit-noise');
  }
  if (symbolRatio > 0.08) {
    score -= Math.min(18, symbolRatio * 80);
    reasons.push('symbol-noise');
  }
  if (repeatedNoise) {
    score -= 12;
    reasons.push('repeated-character-noise');
  }
  if (cleanText.length < 12) {
    score -= 10;
    reasons.push('short-text');
  }

  const finalScore = Math.round(clamp(score));
  const level = finalScore >= 74 ? 'high' : finalScore >= 58 ? 'medium' : 'low';
  const label = level === 'high'
    ? 'Scan OCR fiable'
    : level === 'medium'
      ? 'Scan OCR à vérifier'
      : 'Scan OCR faible';

  return {
    score: finalScore,
    level,
    label,
    reasons,
  };
}

/**
 * Runs native on-device OCR through Tauri when a filesystem image path is available.
 * The command routes per OS in Rust so the UI never depends on platform-specific OCR APIs.
 */
export async function scanImageToText(imagePath) {
  if (!imagePath) {
    throw new Error("Aucun chemin d'image disponible pour l'OCR natif.");
  }

  return invoke('scan_image_to_text', { imagePath });
}

function scoreOcrCandidate({ text = '', confidence = 0 } = {}) {
  const cleanText = normalizeOcrText(text);
  const alphaCount = (cleanText.match(/[a-zà-ÿ]/gi) || []).length;
  const digitCount = (cleanText.match(/\d/g) || []).length;
  const lineCount = cleanText.split('\n').filter(Boolean).length;
  const timestampNoise = (cleanText.match(/\b(?:[01]?\d|2[0-3])[:h]?[0-5]\d\b/g) || []).length;
  const digitPenalty = alphaCount ? Math.min(18, (digitCount / Math.max(1, alphaCount)) * 24) : 0;
  return Number(confidence || 0) + Math.min(18, alphaCount / 4) + Math.min(8, lineCount * 1.5) - digitPenalty - (timestampNoise * 4);
}

async function recognizeTesseractVariants(recognize, variants, { pageSegMode = '6', passName = 'block' } = {}) {
  const candidates = [];
  for (const variant of variants) {
    const result = await recognize(variant.source, OCR_LANGUAGES, {
      logger: () => {},
      tessedit_pageseg_mode: pageSegMode,
      preserve_interword_spaces: '1',
    });
    const text = normalizeOcrText(result?.data?.text || '');
    const confidence = Number(result?.data?.confidence || 0);
    const words = extractTesseractWords(result?.data);
    const quality = assessOcrQuality({ text, confidence, words });
    candidates.push({
      text,
      confidence,
      words,
      quality,
      variant: `${variant.name}:${passName}`,
      score: scoreOcrCandidate({ text, confidence }) + quality.score,
    });
  }
  return candidates;
}

async function runTesseractOcr(file) {
  const { recognize } = await import('tesseract.js');
  let variants;
  try {
    variants = await preprocessImageVariantsForOcr(file);
  } catch {
    variants = [{ name: 'original', source: file }];
  }

  let candidates = await recognizeTesseractVariants(recognize, variants, { pageSegMode: '6', passName: 'block' });
  let best = candidates.sort((a, b) => b.score - a.score)[0] || { text: '', confidence: 0, words: [], variant: 'original:block', quality: assessOcrQuality() };

  if (best.quality.score < OCR_QUALITY_RETRY_THRESHOLD) {
    const retryVariants = variants.filter((variant) => ['original', 'line-cleaned', 'soft-contrast', 'light-text-mask', 'opencv-adaptive'].includes(variant.name));
    const retryCandidates = await recognizeTesseractVariants(recognize, retryVariants.length ? retryVariants : variants, { pageSegMode: '11', passName: 'sparse' });
    candidates = [...candidates, ...retryCandidates];
    best = candidates.sort((a, b) => b.score - a.score)[0] || best;
  }

  return {
    text: best.text,
    confidence: best.confidence,
    engine: 'tesseract.js',
    words: best.words,
    ocrVariant: best.variant,
    quality: best.quality,
    qualityScore: best.quality.score,
    qualityLevel: best.quality.level,
    status: best.text ? 'complete' : 'empty',
    classification: classifyOcrResult({ text: best.text, confidence: best.confidence }),
  };
}

let openCvPromise;

async function getOpenCv() {
  if (!openCvPromise) {
    openCvPromise = import('@techstark/opencv-js').then(async (module) => {
      const cv = module.default || module;
      if (cv instanceof Promise) {return cv;}
      if (cv?.Mat) {return cv;}
      await new Promise((resolve) => {
        const previous = cv?.onRuntimeInitialized;
        cv.onRuntimeInitialized = () => {
          previous?.();
          resolve();
        };
      });
      return cv;
    });
  }
  return openCvPromise;
}

async function createOpenCvOcrVariant(baseImageData, width, height) {
  const cv = await getOpenCv();
  if (!cv?.matFromImageData || !cv?.adaptiveThreshold || !cv?.cvtColor) {return null;}

  const source = cv.matFromImageData(baseImageData);
  const grayscale = new cv.Mat();
  const denoised = new cv.Mat();
  const thresholded = new cv.Mat();
  const rgba = new cv.Mat();

  try {
    cv.cvtColor(source, grayscale, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(grayscale, denoised, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
    cv.adaptiveThreshold(
      denoised,
      thresholded,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      31,
      11,
    );
    cv.cvtColor(thresholded, rgba, cv.COLOR_GRAY2RGBA);
    return new ImageData(new Uint8ClampedArray(rgba.data), width, height);
  } finally {
    source.delete();
    grayscale.delete();
    denoised.delete();
    thresholded.delete();
    rgba.delete();
  }
}

async function imageSourceToBitmap(source) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(source);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(source);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Impossible de préparer l'image pour l'OCR."));
    };
    image.src = objectUrl;
  });
}

export async function preprocessImageVariantsForOcr(file) {
  if (typeof document === 'undefined' || !canRunImageOcr(file)) {return [{ name: 'original', source: file }];}

  const bitmap = await imageSourceToBitmap(file);
  const sourceWidth = bitmap.width || bitmap.naturalWidth;
  const sourceHeight = bitmap.height || bitmap.naturalHeight;
  if (!sourceWidth || !sourceHeight) {return [{ name: 'original', source: file }];}

  const maxSide = 2600;
  const minReadableSide = 1400;
  const scale = Math.min(maxSide / Math.max(sourceWidth, sourceHeight), Math.max(1, minReadableSide / Math.max(sourceWidth, sourceHeight)));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = width;
  baseCanvas.height = height;
  const context = baseCanvas.getContext('2d', { willReadFrequently: true });
  if (!context) {return [{ name: 'original', source: file }];}
  context.drawImage(bitmap, 0, 0, width, height);

  const baseImageData = context.getImageData(0, 0, width, height);
  const variants = [{ name: 'original', source: file }];

  const makeVariant = async (name, transform) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const variantContext = canvas.getContext('2d', { willReadFrequently: true });
    if (!variantContext) {return;}
    const imageData = new ImageData(new Uint8ClampedArray(baseImageData.data), width, height);
    transform(imageData.data);
    variantContext.putImageData(imageData, 0, 0);
    const blob = await new Promise((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/png', 0.98);
    });
    if (blob) {variants.push({ name, source: blob });}
  };

  const addOpenCvVariant = async () => {
    try {
      const imageData = await createOpenCvOcrVariant(baseImageData, width, height);
      if (!imageData) {return;}
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const variantContext = canvas.getContext('2d', { willReadFrequently: true });
      if (!variantContext) {return;}
      variantContext.putImageData(imageData, 0, 0);
      const blob = await new Promise((resolve) => {
        canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/png', 0.98);
      });
      if (blob) {variants.push({ name: 'opencv-adaptive', source: blob });}
    } catch {
      // The original and lightweight variants remain available if OpenCV cannot initialize.
    }
  };

  let lumaSum = 0;
  for (let i = 0; i < baseImageData.data.length; i += 4) {
    const luma = (baseImageData.data[i] * 0.299) + (baseImageData.data[i + 1] * 0.587) + (baseImageData.data[i + 2] * 0.114);
    lumaSum += luma;
  }
  const average = lumaSum / Math.max(1, baseImageData.data.length / 4);
  const softThreshold = Math.max(104, Math.min(190, average * 1.05));
  const hardThreshold = Math.max(118, Math.min(202, average * 1.18));

  await makeVariant('line-cleaned', (data) => {
    const darkRows = new Set();

    for (let y = 0; y < height; y += 1) {
      let darkCount = 0;
      for (let x = 0; x < width; x += 1) {
        const index = ((y * width) + x) * 4;
        const luma = (data[index] * 0.299) + (data[index + 1] * 0.587) + (data[index + 2] * 0.114);
        if (luma < average * 0.72) {
          darkCount += 1;
        }
      }

      if (darkCount / Math.max(1, width) > 0.34) {
        darkRows.add(y);
      }
    }

    for (const row of darkRows) {
      for (let y = Math.max(0, row - 1); y <= Math.min(height - 1, row + 1); y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = ((y * width) + x) * 4;
          const luma = (data[index] * 0.299) + (data[index + 1] * 0.587) + (data[index + 2] * 0.114);
          if (luma < average * 0.82) {
            data[index] = 242;
            data[index + 1] = 242;
            data[index + 2] = 242;
          }
        }
      }
    }

    for (let i = 0; i < data.length; i += 4) {
      const luma = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
      const boosted = Math.max(0, Math.min(255, ((luma - average) * 1.78) + 184));
      data[i] = boosted;
      data[i + 1] = boosted;
      data[i + 2] = boosted;
    }
  });

  await makeVariant('soft-contrast', (data) => {
    for (let i = 0; i < data.length; i += 4) {
      const luma = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
      const boosted = Math.max(0, Math.min(255, ((luma - average) * 1.65) + 176));
      data[i] = boosted;
      data[i + 1] = boosted;
      data[i + 2] = boosted;
    }
  });

  await makeVariant('light-text-mask', (data) => {
    for (let i = 0; i < data.length; i += 4) {
      const luma = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
      const boosted = luma > softThreshold ? 255 : Math.max(0, Math.min(255, luma * 0.46));
      data[i] = boosted;
      data[i + 1] = boosted;
      data[i + 2] = boosted;
    }
  });

  await makeVariant('binary-text', (data) => {
    for (let i = 0; i < data.length; i += 4) {
      const luma = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
      const boosted = luma > hardThreshold ? 255 : 0;
      data[i] = boosted;
      data[i + 1] = boosted;
      data[i + 2] = boosted;
    }
  });

  await addOpenCvVariant();

  return variants;
}

export async function preprocessImageForOcr(file) {
  const variants = await preprocessImageVariantsForOcr(file);
  return variants[1]?.source || variants[0]?.source || file;
}

export async function extractImageOcr(file, { protectedNote = false, fallbackFile = null } = {}) {
  if (!shouldRunAttachmentOcr(file, { protectedNote })) {
    return {
      text: '',
      confidence: 0,
      status: protectedNote ? 'skipped-protected' : 'skipped',
      classification: classifyOcrResult(),
    };
  }

  const imagePath = getImagePath(file);
  if (imagePath) {
    try {
      const result = await scanImageToText(imagePath);
      const text = normalizeOcrText(result?.text || result || '');
      const hasNativeConfidence = Number.isFinite(Number(result?.confidence));
      const confidence = hasNativeConfidence ? Number(result.confidence) : 58;
      const words = normalizeOcrWords(result?.words, result?.source_width || result?.sourceWidth, result?.source_height || result?.sourceHeight);
      const quality = assessOcrQuality({ text, confidence, words });
      const lineCount = text.split('\n').filter(Boolean).length;
      const nativeLooksIncomplete = !hasNativeConfidence && (text.length < 120 || lineCount < 4 || words.length === 0);
      const nativeResult = {
        text,
        confidence,
        engine: result?.engine || 'native',
        words,
        quality,
        qualityScore: quality.score,
        qualityLevel: quality.level,
        status: text ? 'complete' : 'empty',
        classification: classifyOcrResult({ text, confidence }),
      };
      if (fallbackFile && (quality.score < OCR_QUALITY_RETRY_THRESHOLD || nativeLooksIncomplete) && canRunImageOcr(fallbackFile)) {
        try {
          const fallbackResult = await runTesseractOcr(fallbackFile);
          if (fallbackResult.qualityScore > quality.score || fallbackResult.text.length > text.length + 12) {
            return { ...fallbackResult, fallbackFrom: 'native-low-quality' };
          }
        } catch {
          // Keep the native result when the secondary quality pass cannot run.
        }
      }
      return nativeResult;
    } catch (error) {
      if (fallbackFile && canRunImageOcr(fallbackFile)) {
        try {
          const fallbackResult = await runTesseractOcr(fallbackFile);
          return {
            ...fallbackResult,
            fallbackFrom: 'native',
          };
        } catch (fallbackError) {
          return {
            text: '',
            confidence: 0,
            status: 'failed',
            error: getFriendlyErrorMessage(fallbackError || error, "OCR indisponible pour cette image."),
            classification: classifyOcrResult(),
          };
        }
      }
      return {
        text: '',
        confidence: 0,
        status: 'failed',
        error: getFriendlyErrorMessage(error, "OCR indisponible pour cette image."),
        classification: classifyOcrResult(),
      };
    }
  }

  try {
    return await runTesseractOcr(file);
  } catch (error) {
    return {
      text: '',
      confidence: 0,
      status: 'failed',
      error: getFriendlyErrorMessage(error, "OCR indisponible pour cette image."),
      classification: classifyOcrResult(),
    };
  }
}
