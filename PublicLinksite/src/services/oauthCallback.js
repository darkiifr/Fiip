function normalizedPart(value, prefix) {
  const part = String(value || '');
  if (!part) return '';
  return part.startsWith(prefix) ? part : `${prefix}${part}`;
}

export function buildDesktopOAuthCallbackUrl(location) {
  const search = normalizedPart(location?.search, '?');
  const hash = normalizedPart(location?.hash, '#');
  return `fiip://login-callback${search}${hash}`;
}

export function getOAuthCallbackError(location) {
  const sources = [location?.search, String(location?.hash || '').replace(/^#/, '?')];
  for (const source of sources) {
    const params = new URLSearchParams(source || '');
    const error = params.get('error_description') || params.get('error');
    if (error) return error;
  }
  return '';
}
