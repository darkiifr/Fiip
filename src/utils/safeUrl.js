const SAFE_DATA_MEDIA_PATTERN = /^data:(image|audio|video)\/[a-z0-9.+-]+;base64,/i;

export function getSafePublicUrl(value, { allowDataMedia = false, allowSvg = false } = {}) {
  if (!value || typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (allowDataMedia && SAFE_DATA_MEDIA_PATTERN.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    const isAllowedProtocol = ['http:', 'https:', 'blob:'].includes(parsed.protocol);
    if (!isAllowedProtocol) return '';
    if (!allowSvg && /\.svg(?:$|[?#])/i.test(parsed.pathname)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

export function getSafeImageUrl(value, { allowDataMedia = false, allowSvg = false } = {}) {
  const safeUrl = getSafePublicUrl(value, { allowDataMedia, allowSvg });
  if (!safeUrl) return '';

  try {
    const parsed = new URL(safeUrl, window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (!allowSvg && /\.svg(?:$|[?#])/i.test(parsed.pathname)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

export function sanitizeDomText(value, fallback = '') {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  const text = String(value)
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      return code <= 31 || code === 127 ? ' ' : char;
    })
    .join('')
    .replace(/[<>&"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return text || fallback;
}
