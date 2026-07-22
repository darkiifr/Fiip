import { describe, expect, it } from 'vitest';

import {
  buildFiipCallbackUrl,
  isExactFiipHostUrl,
  parseFiipUrl,
  parseLoginCallback,
} from './fiipCallbacks';

describe('Fiip callback URL helpers', () => {
  it('accepts only the exact login callback authority', () => {
    expect(parseLoginCallback('fiip://login-callback?code=abc')).toMatchObject({ ok: true, code: 'abc' });

    for (const url of [
      'https://login-callback?code=abc',
      'fiip://user@login-callback?code=abc',
      'fiip://login-callback:42?code=abc',
      'fiip://login-callback/path?code=abc',
      'fiip://evil?code=abc',
    ]) {
      expect(parseLoginCallback(url)).toMatchObject({ ok: false, code: 'OAUTH_CALLBACK_INVALID' });
    }
  });

  it('extracts query and hash callback credentials', () => {
    expect(parseLoginCallback('fiip://login-callback#access_token=a&refresh_token=r')).toMatchObject({
      accessToken: 'a',
      refreshToken: 'r',
    });
    expect(parseLoginCallback('fiip://login-callback?error=denied&error_description=Nope')).toMatchObject({
      providerError: 'denied',
      errorDescription: 'Nope',
    });
  });

  it('builds canonical fiip callback URLs', () => {
    expect(buildFiipCallbackUrl('login-callback', { code: 'abc' }, { state: 'xyz' }))
      .toBe('fiip://login-callback?code=abc#state=xyz');
    expect(isExactFiipHostUrl(parseFiipUrl('fiip://clip?noteId=1'), 'clip')).toBe(true);
  });
});

