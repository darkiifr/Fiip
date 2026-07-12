import { supabase } from './supabase';
import { getCurrentDeviceDescriptor, getInstallationId } from './deviceIdentity';
import { FIIP_ACCOUNT_PORTAL_URL } from '../config/links';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENABLE_CAPTCHA_IN_DEV = import.meta.env.VITE_ENABLE_CAPTCHA_IN_DEV === 'true';

function isLocalDevHost() {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

export function getCaptchaSiteKey(siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '') {
  if (isLocalDevHost() && !ENABLE_CAPTCHA_IN_DEV) {
    return '';
  }
  return String(siteKey || '').trim();
}

export function requiresCaptcha(siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '') {
  return Boolean(getCaptchaSiteKey(siteKey));
}

export function assertCaptchaToken(captchaToken, siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '') {
  if (requiresCaptcha(siteKey) && !String(captchaToken || '').trim()) {
    throw new Error('Veuillez valider la protection anti-bot.');
  }
}

export async function getSessionUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

function buildCaptchaOptions(captchaToken) {
  return captchaToken ? { captchaToken } : undefined;
}

export function getAccountRedirectUrl() {
  return new URL('/account', FIIP_ACCOUNT_PORTAL_URL).toString();
}

export function normalizeAccountEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(value)) {
    throw new Error('Entrez une adresse email valide.');
  }
  return value;
}

export function getAuthErrorMessage(error) {
  const message = String(error?.message || error || '').trim();
  if (!message) {
    return 'Connexion impossible pour le moment.';
  }

  if (/confirmation email|email rate limit|smtp|mail/i.test(message)) {
    return 'Email non envoyé. Vérifiez la configuration SMTP Supabase/Resend et les limites d’envoi, puis réessayez.';
  }

  if (/captcha|challenge/i.test(message)) {
    return isLocalDevHost()
      ? "Supabase demande un CAPTCHA pour cette connexion. En local, utilisez le site déployé ou activez VITE_ENABLE_CAPTCHA_IN_DEV=true avec une clé Turnstile."
      : 'Validation anti-bot refusée. Revalidez le captcha puis réessayez.';
  }

  if (/user not found|account not found|not exist|introuvable|no user/i.test(message)) {
    return 'Aucun compte Fiip n’existe avec cette adresse e-mail.';
  }

  return message;
}

async function invokePublicAccountAction(body, fallbackMessage = 'Action compte impossible.') {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  const { data, error } = await supabase.functions.invoke('account-api', { body });
  if (error) throw new Error(error.message || fallbackMessage);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function checkAccountEmailExists(email) {
  const normalizedEmail = normalizeAccountEmail(email);
  const data = await invokePublicAccountAction({
    action: 'check_account_email',
    email: normalizedEmail,
  }, 'Impossible de vérifier ce compte.');
  return Boolean(data?.exists);
}

export async function signInWithMagicLink(email, captchaToken) {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  const exists = await checkAccountEmailExists(email);
  if (!exists) {
    return { data: null, error: { message: 'Aucun compte Fiip n’existe avec cette adresse e-mail.' } };
  }

  return supabase.auth.signInWithOtp({
    email: normalizeAccountEmail(email),
    options: {
      shouldCreateUser: false,
      emailRedirectTo: getAccountRedirectUrl(),
      ...buildCaptchaOptions(captchaToken),
    },
  });
}

export async function verifyMagicCode(email, token) {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  return supabase.auth.verifyOtp({
    email: normalizeAccountEmail(email),
    token: String(token || '').trim(),
    type: 'email',
  });
}

export async function sendPasswordReset(email, captchaToken) {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  const exists = await checkAccountEmailExists(email);
  if (!exists) {
    return { data: null, error: { message: 'Aucun compte Fiip n’existe avec cette adresse e-mail.' } };
  }

  return supabase.auth.resetPasswordForEmail(normalizeAccountEmail(email), {
    redirectTo: getAccountRedirectUrl(),
    ...buildCaptchaOptions(captchaToken),
  });
}

export async function signInWithPassword(email, password, captchaToken) {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  return supabase.auth.signInWithPassword({
    email: normalizeAccountEmail(email),
    password,
    options: buildCaptchaOptions(captchaToken),
  });
}

export function canUsePasskeys() {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';
}

export async function signInWithPasskey() {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  if (!canUsePasskeys()) {
    throw new Error('Les passkeys ne sont pas disponibles sur ce navigateur.');
  }

  return supabase.auth.signInWithPasskey();
}

export async function registerPasskey() {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  if (!canUsePasskeys()) {
    throw new Error('Les passkeys ne sont pas disponibles sur ce navigateur.');
  }

  return supabase.auth.registerPasskey();
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function fetchAccountSummary() {
  return invokeAccountAction({
    action: 'summary',
    installation_id: getInstallationId(),
  }, 'Impossible de charger le compte.');
}

export async function resetDeviceHwid() {
  return invokeAccountAction({ action: 'reset_hwid' }, 'Impossible de réinitialiser l’appareil.');
}

async function invokeAccountAction(body, fallbackMessage = 'Action compte impossible.') {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  const { data, error } = await supabase.functions.invoke('account-api', { body });
  if (error) throw new Error(error.message || fallbackMessage);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function registerCurrentDevice() {
  return invokeAccountAction({
    action: 'register_device',
    ...getCurrentDeviceDescriptor(),
  }, 'Impossible d’enregistrer cet appareil.');
}

export async function activateLicense(licenseKey) {
  return invokeAccountAction({
    action: 'activate_license',
    license_key: String(licenseKey || '').trim(),
    installation_id: getInstallationId(),
  }, 'Impossible d’activer cette licence.');
}

export async function fetchAccountDevices() {
  return invokeAccountAction({
    action: 'list_devices',
    installation_id: getInstallationId(),
  }, 'Impossible de charger les appareils.');
}

export async function selectLicense(licenseId) {
  return invokeAccountAction({
    action: 'select_license',
    license_id: licenseId,
  }, 'Impossible de sélectionner cette licence.');
}

export async function fetchSecurityEvents() {
  return invokeAccountAction({ action: 'list_security_events' }, 'Impossible de charger la sécurité.');
}

export async function revokeDevice(deviceId, reason = 'manual') {
  return invokeAccountAction({
    action: 'revoke_device',
    device_id: deviceId,
    reason,
  }, 'Impossible de révoquer cet appareil.');
}

export async function revokeAllDevices({ keepCurrent = true } = {}) {
  return invokeAccountAction({
    action: 'revoke_all_devices',
    keep_installation_id: keepCurrent ? getInstallationId() : null,
  }, 'Impossible de révoquer les appareils.');
}

export async function ensureFamilyGroup() {
  return invokeAccountAction({ action: 'ensure_family_group' });
}

export async function inviteFamilyMember(email) {
  return invokeAccountAction({
    action: 'invite_family_member',
    email,
    origin: window.location.origin,
  });
}

export async function acceptFamilyInvite(inviteToken) {
  return invokeAccountAction({
    action: 'accept_family_invite',
    invite_token: inviteToken,
  });
}

export async function removeFamilyMember(memberId) {
  return invokeAccountAction({
    action: 'remove_family_member',
    member_id: memberId,
  });
}
