import { describe, expect, it } from 'vitest';

import { buildDesktopOAuthCallbackUrl, getOAuthCallbackError } from './oauthCallback';

describe('desktop OAuth callback relay', () => {
  it('preserves both query parameters and hash parameters', () => {
    expect(buildDesktopOAuthCallbackUrl({
      search: '?code=abc&state=xyz',
      hash: '#access_token=token&refresh_token=refresh',
    })).toBe('fiip://login-callback?code=abc&state=xyz#access_token=token&refresh_token=refresh');
  });

  it('only builds the expected Fiip login callback scheme', () => {
    expect(buildDesktopOAuthCallbackUrl({ search: '?next=https://evil.test', hash: '' }))
      .toBe('fiip://login-callback?next=https://evil.test');
  });

  it('reads OAuth errors from query or hash parameters', () => {
    expect(getOAuthCallbackError({ search: '?error=access_denied&error_description=Consent+refus%C3%A9', hash: '' }))
      .toBe('Consent refusé');
    expect(getOAuthCallbackError({ search: '', hash: '#error=server_error' }))
      .toBe('server_error');
  });
});
