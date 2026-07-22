export const FIIP_CALLBACK_SCHEME = 'fiip:';
export const FIIP_LOGIN_CALLBACK_HOST = 'login-callback';
export const FIIP_CLIP_HOST = 'clip';

export function parseFiipUrl(rawUrl) {
  try {
    return new URL(String(rawUrl || ''));
  } catch {
    return null;
  }
}

export function isExactFiipHostUrl(url, host) {
  return Boolean(
    url
    && url.protocol === FIIP_CALLBACK_SCHEME
    && url.hostname === host
    && !url.username
    && !url.password
    && !url.port
    && (!url.pathname || url.pathname === '/')
  );
}

export function parseLoginCallback(rawUrl) {
  const url = parseFiipUrl(rawUrl);
  if (!isExactFiipHostUrl(url, FIIP_LOGIN_CALLBACK_HOST)) {
    return { ok: false, code: 'OAUTH_CALLBACK_INVALID', message: 'URL de callback Google refusée.' };
  }

  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const value = (name) => url.searchParams.get(name) || hash.get(name) || '';
  const providerError = value('error');
  if (providerError) {
    return {
      ok: true,
      url,
      providerError,
      errorDescription: value('error_description') || providerError,
    };
  }

  return {
    ok: true,
    url,
    code: value('code'),
    accessToken: value('access_token'),
    refreshToken: value('refresh_token'),
  };
}

export function buildFiipCallbackUrl(host, params = {}, hashParams = {}) {
  const url = new URL(`${FIIP_CALLBACK_SCHEME}//${host}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  const hash = new URLSearchParams();
  for (const [key, value] of Object.entries(hashParams)) {
    if (value !== undefined && value !== null && value !== '') {
      hash.set(key, String(value));
    }
  }
  const serializedHash = hash.toString();
  if (serializedHash) {
    url.hash = serializedHash;
  }
  return url.toString();
}
