export const FIIP_PUBLIC_SITE_URL = 'https://fiip.netlify.app/';
export const FIIP_PUBLIC_NOTES_URL = 'https://fiip-app.netlify.app/';
export const FIIP_LICENSE_PURCHASE_URL = 'https://vinsstudio.mysellauth.com/';

export function buildPublicNoteUrl(slug: string): string {
  return new URL(`/n/${slug}`, FIIP_PUBLIC_NOTES_URL).toString();
}
