export const FIIP_CALLBACK_SCHEME = 'fiip:';
export const FIIP_LOGIN_CALLBACK_HOST = 'login-callback';

export type LoginCallbackResult =
  | {
      ok: true;
      url: URL;
      code: string;
      accessToken: string;
      refreshToken: string;
      providerError: string;
      errorDescription: string;
    }
  | {
      ok: false;
      code: 'OAUTH_CALLBACK_INVALID';
      message: string;
    };

export function parseFiipUrl(rawUrl: string): URL | null {
  try {
    return new URL(String(rawUrl || ''));
  } catch {
    return null;
  }
}

export function isExactFiipHostUrl(url: URL | null, host: string): url is URL {
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

export function parseLoginCallback(rawUrl: string): LoginCallbackResult {
  const url = parseFiipUrl(rawUrl);
  if (!isExactFiipHostUrl(url, FIIP_LOGIN_CALLBACK_HOST)) {
    return { ok: false, code: 'OAUTH_CALLBACK_INVALID', message: 'URL de callback Google refusée.' };
  }

  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const value = (name: string) => url.searchParams.get(name) || hash.get(name) || '';
  return {
    ok: true,
    url,
    code: value('code'),
    accessToken: value('access_token'),
    refreshToken: value('refresh_token'),
    providerError: value('error'),
    errorDescription: value('error_description') || value('error'),
  };
}
