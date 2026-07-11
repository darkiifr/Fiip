import { supabase } from './supabase';
import { getCurrentDeviceDescriptor, getInstallationId } from './deviceIdentity';

export function requiresCaptcha(siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '') {
  return Boolean(String(siteKey || '').trim());
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

export async function signInWithMagicLink(email, captchaToken) {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/account`,
      ...buildCaptchaOptions(captchaToken),
    },
  });
}

export async function signInWithPassword(email, password, captchaToken) {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  return supabase.auth.signInWithPassword({
    email,
    password,
    options: buildCaptchaOptions(captchaToken),
  });
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
