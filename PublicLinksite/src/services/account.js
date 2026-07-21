import { supabase } from './supabase';
import { getCurrentDeviceDescriptor, getInstallationId } from './deviceIdentity';
import { FIIP_ACCOUNT_PORTAL_URL } from '../config/links';
import { getClerkUser, signOutClerk } from './clerkSession';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getSessionUser() {
  const user = getClerkUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress || '',
    user_metadata: {
      username: user.username || user.fullName || user.firstName || '',
      avatar_url: user.imageUrl || '',
    },
  };
}

export async function bootstrapClerkIdentity() {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  const { data, error } = await supabase.functions.invoke('identity-bootstrap', { body: {} });
  if (error || !data?.userId) throw error || new Error('Identity bootstrap failed');
  return data;
}

export function getAccountRedirectUrl() {
  if (typeof window !== 'undefined' && window.location?.origin && window.location.pathname.startsWith('/account')) {
    return new URL(`${window.location.pathname}${window.location.search}`, window.location.origin).toString();
  }
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
    return 'Email non envoyé pour le moment. Réessayez dans quelques minutes ou contactez le support Fiip.';
  }

  if (/edge function returned|non-2xx|failed to fetch|functionsfetcherror|supabase|network/i.test(message)) {
    return 'Action impossible pour le moment. Réessayez dans quelques instants.';
  }

  if (/registerPasskey is not a function|signInWithPasskey is not a function|le\.auth|passkey/i.test(message)) {
    return 'Les passkeys ne sont pas disponibles dans cette session. Mettez le portail à jour ou utilisez un navigateur compatible.';
  }

  if (/user not found|account not found|not exist|introuvable|no user/i.test(message)) {
    return 'Aucun compte Fiip n’existe avec cette adresse e-mail.';
  }

  return message;
}

async function invokePublicAccountAction(body, fallbackMessage = 'Action compte impossible.') {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  const { data, error } = await supabase.functions.invoke('account-api', { body });
  if (error) throw new Error(fallbackMessage);
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

export async function signInWithMagicLink(email) {
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

export async function sendPasswordReset(email) {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  const exists = await checkAccountEmailExists(email);
  if (!exists) {
    return { data: null, error: { message: 'Aucun compte Fiip n’existe avec cette adresse e-mail.' } };
  }

  return supabase.auth.resetPasswordForEmail(normalizeAccountEmail(email), {
    redirectTo: getAccountRedirectUrl(),
  });
}

export async function signInWithPassword(email, password) {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  return supabase.auth.signInWithPassword({
    email: normalizeAccountEmail(email),
    password,
  });
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getAccountRedirectUrl() },
  });
}

export function canUsePasskeys() {
  return typeof window !== 'undefined'
    && typeof window.PublicKeyCredential !== 'undefined'
    && typeof supabase?.auth?.signInWithPasskey === 'function'
    && typeof supabase?.auth?.registerPasskey === 'function';
}

export async function signUpWithPassword(email, password, username) {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  return supabase.auth.signUp({
    email: normalizeAccountEmail(email),
    password,
    options: {
      emailRedirectTo: getAccountRedirectUrl(),
      data: {
        username: String(username || '').trim() || normalizeAccountEmail(email).split('@')[0],
        nickname: String(username || '').trim() || normalizeAccountEmail(email).split('@')[0],
        subscription_level: 0,
      },
    },
  });
}

export async function signInWithPasskey() {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  if (!canUsePasskeys()) {
    throw new Error('Les passkeys ne sont pas disponibles avec cette version du portail ou de ce navigateur.');
  }

  return supabase.auth.signInWithPasskey();
}

export async function registerPasskey() {
  if (!supabase) throw new Error('Compte Fiip non configuré.');
  if (!canUsePasskeys()) {
    throw new Error('Les passkeys ne sont pas disponibles avec cette version du portail ou de ce navigateur.');
  }

  return supabase.auth.registerPasskey();
}

export async function signOut() {
  await signOutClerk();
}

export async function startProTrial() {
  return invokeAccountAction({ action: 'start_trial' }, 'Impossible de démarrer cet essai.');
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
  if (error) throw new Error(fallbackMessage);
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
  try {
    return await invokeAccountAction({ action: 'list_security_events' }, 'Impossible de charger la sécurité.');
  } catch (functionError) {
    if (!supabase?.from) throw functionError;

    const { data, error } = await supabase
      .from('account_security_events')
      .select('id, device_id, event_type, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw functionError;
    return { events: data || [] };
  }
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
