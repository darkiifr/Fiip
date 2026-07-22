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

export function isSafeDesktopOAuthCallbackUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === 'fiip:'
    && url.hostname === 'login-callback'
    && !url.username
    && !url.password
    && !url.port
    && (!url.pathname || url.pathname === '/');
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
