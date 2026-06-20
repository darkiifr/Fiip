export function getCollaborationEndpoint(rawUrl, { allowLocalhost = import.meta.env.DEV } = {}) {
  const value = String(rawUrl || '').trim();
  if (!value) {
    return null;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (!['ws:', 'wss:'].includes(url.protocol)) {
    return null;
  }

  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (isLocalhost && !allowLocalhost) {
    return null;
  }

  return url.toString().replace(/\/$/, '');
}
