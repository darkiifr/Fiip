import {
  FIIP_ACCOUNT_PORTAL_URL,
  FIIP_LICENSE_PURCHASE_URL,
  FIIP_PUBLIC_NOTES_URL,
  FIIP_PUBLIC_SITE_URL,
  buildPublicNoteUrl,
} from './links';

describe('mobile Fiip public links', () => {
  it('exposes the production public site and license purchase URLs', () => {
    expect(FIIP_PUBLIC_SITE_URL).toBe('https://fiip.fr/');
    expect(FIIP_PUBLIC_NOTES_URL).toBe('https://fiip.fr/');
    expect(FIIP_ACCOUNT_PORTAL_URL).toBe('https://accounts.fiip.fr/');
    expect(FIIP_LICENSE_PURCHASE_URL).toBe('https://vinsstudio.mysellauth.com/');
  });

  it('builds public note URLs on the production public site', () => {
    expect(buildPublicNoteUrl('mobile-note')).toBe('https://fiip.fr/n/mobile-note');
  });
});
