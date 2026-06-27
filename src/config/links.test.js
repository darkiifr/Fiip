import { describe, expect, it } from 'vitest';

import {
  FIIP_CHROME_EXTENSION_URL,
  FIIP_LICENSE_PURCHASE_URL,
  FIIP_PUBLIC_NOTES_URL,
  FIIP_PUBLIC_SITE_URL,
  buildPublicNoteUrl,
} from './links';

describe('Fiip public links', () => {
  it('exposes the production public site and license purchase URLs', () => {
    expect(FIIP_PUBLIC_SITE_URL).toBe('https://fiip.netlify.app/');
    expect(FIIP_PUBLIC_NOTES_URL).toBe('https://fiip-app.netlify.app/');
    expect(FIIP_LICENSE_PURCHASE_URL).toBe('https://vinsstudio.mysellauth.com/');
    expect(FIIP_CHROME_EXTENSION_URL).toBe('');
  });

  it('builds public note URLs on the production public site', () => {
    expect(buildPublicNoteUrl('demo-note')).toBe('https://fiip-app.netlify.app/n/demo-note');
  });
});
