export const FIIP_PUBLIC_SITE_URL = 'https://fiip.fr/';
export const FIIP_PUBLIC_NOTES_URL = 'https://fiip.fr/';
export const FIIP_ACCOUNT_PORTAL_URL = 'https://accounts.fiip.fr/';
export const FIIP_LICENSE_PURCHASE_URL = 'https://vinsstudio.mysellauth.com/';
export const FIIP_CHROME_EXTENSION_URL = import.meta.env.VITE_CHROME_EXTENSION_URL
  || 'https://chromewebstore.google.com/detail/fiip-web-clipper/kgjgfajhpigjmiblpjbihcpndfnibdko';
export const FIIP_DISCORD_SUPPORT_URL = 'https://discord.gg/nghHqs2pvN';
export const FIIP_LEGAL_URL = new URL('/legal', FIIP_PUBLIC_SITE_URL).toString();
export const FIIP_TERMS_URL = new URL('/terms', FIIP_PUBLIC_SITE_URL).toString();
export const FIIP_PRIVACY_URL = new URL('/privacy', FIIP_PUBLIC_SITE_URL).toString();
export const FIIP_COOKIES_URL = new URL('/cookies', FIIP_PUBLIC_SITE_URL).toString();
export const FIIP_REFUNDS_URL = new URL('/refunds', FIIP_PUBLIC_SITE_URL).toString();

export function buildPublicNoteUrl(slug) {
  return new URL(`/n/${slug}`, FIIP_PUBLIC_NOTES_URL).toString();
}
