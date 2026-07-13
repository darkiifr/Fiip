import { describe, expect, it } from 'vitest';

import {
  getChromeWebStoreSetupHint,
  shouldTreatChromeWebStorePublishAsWarning,
} from './publish-chrome-extension.mjs';

describe('Chrome Web Store publishing errors', () => {
  it('classifies disabled Chrome Web Store API as setup warning', () => {
    const body = {
      error: {
        code: 403,
        status: 'PERMISSION_DENIED',
        details: [{
          '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
          reason: 'SERVICE_DISABLED',
          domain: 'googleapis.com',
          metadata: {
            service: 'chromewebstore.googleapis.com',
            activationUrl: 'https://console.developers.google.com/apis/api/chromewebstore.googleapis.com/overview?project=123',
          },
        }],
      },
    };

    expect(shouldTreatChromeWebStorePublishAsWarning(body)).toBe(true);
    expect(getChromeWebStoreSetupHint(body)).toContain('Chrome Web Store API is disabled');
    expect(getChromeWebStoreSetupHint(body)).toContain('project=123');
  });

  it('does not downgrade unrelated publishing failures', () => {
    const body = {
      error: {
        code: 403,
        status: 'PERMISSION_DENIED',
        details: [{
          '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
          reason: 'ACCESS_TOKEN_SCOPE_INSUFFICIENT',
          metadata: {
            service: 'chromewebstore.googleapis.com',
          },
        }],
      },
    };

    expect(shouldTreatChromeWebStorePublishAsWarning(body)).toBe(false);
    expect(getChromeWebStoreSetupHint(body)).toBe('');
  });
});
