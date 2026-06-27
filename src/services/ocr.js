const IMAGE_MIME_PATTERN = /^image\/(png|jpe?g|webp|bmp|tiff?)$/i;
const OCR_LANGUAGES = 'fra+eng';

export function canRunImageOcr(fileOrAttachment = {}) {
  const mimeType = fileOrAttachment.type || fileOrAttachment.mimeType || '';
  const name = fileOrAttachment.name || '';
  return IMAGE_MIME_PATTERN.test(mimeType) || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(name);
}

export function classifyOcrResult({ text = '', confidence = 0 } = {}) {
  const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
  const score = Number(confidence) || 0;

  if (!cleanText || score < 28) {
    return {
      kind: 'unreadable',
      label: 'Texte non fiable',
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

export async function preprocessImageForOcr(file) {
  if (typeof document === 'undefined' || !canRunImageOcr(file)) return file;

  const bitmap = await imageSourceToBitmap(file);
  const sourceWidth = bitmap.width || bitmap.naturalWidth;
  const sourceHeight = bitmap.height || bitmap.naturalHeight;
  if (!sourceWidth || !sourceHeight) return file;

  const maxSide = 2200;
  const minReadableSide = 1100;
  const scale = Math.min(maxSide / Math.max(sourceWidth, sourceHeight), Math.max(1, minReadableSide / Math.max(sourceWidth, sourceHeight)));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  let lumaSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const luma = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
    lumaSum += luma;
  }
  const average = lumaSum / Math.max(1, data.length / 4);
  const threshold = Math.max(112, Math.min(176, average * 0.92));

  for (let i = 0; i < data.length; i += 4) {
    const luma = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
    const boosted = luma > threshold ? 255 : Math.max(0, Math.min(255, (luma - 18) * 1.18));
    data[i] = boosted;
    data[i + 1] = boosted;
    data[i + 2] = boosted;
  }
  context.putImageData(imageData, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || file), 'image/png', 0.95);
  });
}

export async function extractImageOcr(file, { protectedNote = false } = {}) {
  if (protectedNote || !canRunImageOcr(file)) {
    return {
      text: '',
      confidence: 0,
      status: protectedNote ? 'skipped-protected' : 'skipped',
      classification: classifyOcrResult(),
    };
  }

  try {
    const { recognize } = await import('tesseract.js');
    let prepared = file;
    try {
      prepared = await preprocessImageForOcr(file);
    } catch {
      prepared = file;
    }
    const result = await recognize(prepared, OCR_LANGUAGES, {
      logger: () => {},
    });
    const text = String(result?.data?.text || '').replace(/\s+\n/g, '\n').trim();
    const confidence = Number(result?.data?.confidence || 0);
    return {
      text,
      confidence,
      status: text ? 'complete' : 'empty',
      classification: classifyOcrResult({ text, confidence }),
    };
  } catch (error) {
    return {
      text: '',
      confidence: 0,
      status: 'failed',
      error: error?.message || String(error),
      classification: classifyOcrResult(),
    };
  }
}
