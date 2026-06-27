export const FIIP_PUBLIC_SITE_URL = 'https://fiip.netlify.app/';
export const FIIP_PUBLIC_NOTES_URL = 'https://fiip-app.netlify.app/';
export const FIIP_LICENSE_PURCHASE_URL = 'https://vinsstudio.mysellauth.com/';
export const FIIP_CHROME_EXTENSION_URL = import.meta.env.VITE_CHROME_EXTENSION_URL || '';

export function buildPublicNoteUrl(slug) {
  return new URL(`/n/${slug}`, FIIP_PUBLIC_NOTES_URL).toString();
}
