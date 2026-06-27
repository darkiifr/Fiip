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
