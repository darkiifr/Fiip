import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, getAuthenticatedUser } from '../_shared/supabase.ts';
import { getKeyAuthLicenseInfo, resetKeyAuthHwid } from '../_shared/keyauth.ts';
import { sendTemplateEmail } from '../_shared/mailer.ts';
import { getTierCapabilities } from '../_shared/tiers.ts';
import { resolveAccountDeviceLimit, sanitizeDeviceInput, sanitizeSecurityMetadata, validateUuid } from './device-security.ts';
import {
  assertLicenseCanAttach,
  normalizeLicenseKeyInput,
  parseKeyAuthLicenseInfo,
} from './license-activation.ts';

const PUBLIC_EMAIL_CHECKS = new Map<string, { count: number; resetAt: number }>();
const PUBLIC_EMAIL_CHECK_LIMIT = 20;
const PUBLIC_EMAIL_CHECK_WINDOW_MS = 15 * 60 * 1000;

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown';
}

function assertPublicEmailCheckRateLimit(req: Request) {
  const now = Date.now();
  const key = getClientIp(req);
  const current = PUBLIC_EMAIL_CHECKS.get(key);

  if (!current || current.resetAt <= now) {
    PUBLIC_EMAIL_CHECKS.set(key, { count: 1, resetAt: now + PUBLIC_EMAIL_CHECK_WINDOW_MS });
    return;
  }

  if (current.count >= PUBLIC_EMAIL_CHECK_LIMIT) {
    throw new Error('RATE_LIMITED');
  }

  current.count += 1;
  PUBLIC_EMAIL_CHECKS.set(key, current);
}

function isFamilyLicense(profile: any, license: any) {
  return license?.tier === 'family_pro' || Number(license?.keyauth_level || profile?.plan_level || 0) >= 4;
}

function createInviteToken() {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

function isLicenseActive(license: any) {
  if (!license || license.status !== 'active') return false;
  const expiry = license.expires_at ? new Date(license.expires_at) : null;
  if (!expiry || Number.isNaN(expiry.getTime()) || expiry.getUTCFullYear() < 2024) return true;
  return expiry.getTime() > Date.now();
}

function getDeviceLimit(activeLicense: any) {
  return resolveAccountDeviceLimit(activeLicense, isLicenseActive);
}

function serializeDevice(device: any, currentInstallationId?: string | null) {
  return {
    id: device.id,
    platform: device.platform,
    device_name: device.device_name,
    app_version: device.app_version,
    first_seen_at: device.first_seen_at,
    last_seen_at: device.last_seen_at,
    revoked_at: device.revoked_at,
    revoked_reason: device.revoked_reason,
    is_current: Boolean(currentInstallationId && device.installation_id === currentInstallationId),
  };
}

async function createSecurityEvent(
  supabaseAdmin: any,
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
  deviceId: string | null = null,
) {
  await supabaseAdmin.from('account_security_events').insert({
    user_id: userId,
    device_id: deviceId,
    event_type: eventType,
    metadata: sanitizeSecurityMetadata(metadata),
  });
}

async function findUserIdByEmail(supabaseAdmin: any, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const found = data?.users?.find((candidate: any) => normalizeEmail(candidate.email) === email);
    if (found?.id) return found.id;
    if (!data?.users?.length || data.users.length < 1000) return null;
  }
  return null;
}

async function loadFamilyState(supabaseAdmin: any, user: any, selectedLicense: any) {
  const { data: ownedGroup } = await supabaseAdmin
    .from('family_groups')
    .select('*')
    .eq('owner_user_id', user.id)
    .maybeSingle();

  let familyGroup = ownedGroup || null;
  let membership = null;

  if (!familyGroup) {
    const { data: member } = await supabaseAdmin
      .from('family_members')
      .select('*, family_groups(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    membership = member;
    familyGroup = member?.family_groups || null;
  }

  if (!familyGroup && selectedLicense?.family_group_id) {
    const { data } = await supabaseAdmin
      .from('family_groups')
      .select('*')
      .eq('id', selectedLicense.family_group_id)
      .maybeSingle();
    familyGroup = data || null;
  }

  let familyMembers: any[] = [];
  if (familyGroup?.id) {
    const { data } = await supabaseAdmin
      .from('family_members')
      .select('*')
      .eq('family_group_id', familyGroup.id)
      .neq('status', 'removed')
      .order('created_at', { ascending: true });
    familyMembers = data || [];
  }

  const { data: pendingInvites } = await supabaseAdmin
    .from('family_members')
    .select('id, family_group_id, invited_email, status, expires_at, created_at')
    .eq('invited_email', normalizeEmail(user.email))
    .eq('status', 'invited')
    .order('created_at', { ascending: false });

  return {
    family_group: familyGroup,
    family_members: familyMembers,
    family_membership: membership,
    pending_family_invites: pendingInvites || [],
    is_family_admin: Boolean(familyGroup?.owner_user_id === user.id),
  };
}

async function ensureFamilyGroup(supabaseAdmin: any, user: any, selectedLicense: any, profile: any) {
  if (!isFamilyLicense(profile, selectedLicense)) {
    throw new Error('Family Pro is required to manage a family group.');
  }

  const existingGroupId = selectedLicense?.family_group_id;
  if (existingGroupId) {
    const { data: group } = await supabaseAdmin
      .from('family_groups')
      .select('*')
      .eq('id', existingGroupId)
      .maybeSingle();
    if (group) return group;
  }

  const { data: ownedGroup } = await supabaseAdmin
    .from('family_groups')
    .select('*')
    .eq('owner_user_id', user.id)
    .maybeSingle();
  if (ownedGroup) {
    if (selectedLicense?.id && selectedLicense.family_group_id !== ownedGroup.id) {
      await supabaseAdmin.from('licenses').update({ family_group_id: ownedGroup.id, updated_at: new Date().toISOString() }).eq('id', selectedLicense.id);
    }
    return ownedGroup;
  }

  const { data: group, error } = await supabaseAdmin
    .from('family_groups')
    .insert({
      owner_user_id: user.id,
      name: 'Fiip Family',
      ai_budget_limit_eur: 2,
    })
    .select('*')
    .single();
  if (error) throw error;

  await supabaseAdmin.from('family_members').upsert({
    family_group_id: group.id,
    user_id: user.id,
    role: 'admin',
    invited_email: normalizeEmail(user.email),
    status: 'active',
    accepted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'family_group_id,user_id' });

  if (selectedLicense?.id) {
    await supabaseAdmin.from('licenses').update({ family_group_id: group.id, updated_at: new Date().toISOString() }).eq('id', selectedLicense.id);
  }

  return group;
}

async function buildAccountSummary(supabaseAdmin: any, user: any, body: any = {}) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('plan_level, active_license_id')
    .eq('id', user.id)
    .maybeSingle();

  const { data: licenses } = await supabaseAdmin
    .from('licenses')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  const activeLicenses = (licenses || []).filter((item: any) => isLicenseActive(item));
  const selectedActiveLicense = activeLicenses.find((item: any) => item.id === profile?.active_license_id)
    || activeLicenses[0]
    || null;
  const selectedLicense = selectedActiveLicense
    || (licenses || [])[0]
    || null;

  const [{ data: aiUsage }, { data: emailEvents }, { data: accountDevices }] = await Promise.all([
    supabaseAdmin.from('ai_usage').select('*').eq('user_id', user.id).order('period_start', { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from('email_events').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('account_devices').select('*').eq('user_id', user.id).order('last_seen_at', { ascending: false }).limit(6),
  ]);
  const family = await loadFamilyState(supabaseAdmin, user, selectedLicense);
  const activeDeviceCount = (accountDevices || []).filter((device: any) => !device.revoked_at).length;

  return {
    user: { id: user.id, email: user.email },
    profile,
    license: selectedLicense,
    licenses: licenses || [],
    active_license_id: selectedLicense?.id || null,
    device_count: activeDeviceCount,
    device_limit: getDeviceLimit(selectedActiveLicense),
    devices: (accountDevices || []).map((device: any) => serializeDevice(device, body.installation_id || null)),
    ai_usage: aiUsage,
    ...family,
    email_events: emailEvents || [],
  };
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = body.action || new URL(req.url).searchParams.get('action') || 'summary';
    const supabaseAdmin = createAdminClient();

    if (action === 'check_account_email') {
      try {
        assertPublicEmailCheckRateLimit(req);
      } catch {
        return jsonResponse({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' }, { status: 429 });
      }

      const email = normalizeEmail(body.email);
      if (!isValidEmail(email)) {
        return jsonResponse({ error: 'Adresse e-mail invalide.' }, { status: 400 });
      }

      return jsonResponse({
        exists: Boolean(await findUserIdByEmail(supabaseAdmin, email)),
      });
    }

    const { user } = await getAuthenticatedUser(req);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan_level, active_license_id')
      .eq('id', user.id)
      .maybeSingle();

    const { data: licenses } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    const activeLicenses = (licenses || []).filter((item: any) => {
      return isLicenseActive(item);
    });

    const selectedActiveLicense = activeLicenses.find((item: any) => item.id === profile?.active_license_id)
      || activeLicenses[0]
      || null;
    const selectedLicense = selectedActiveLicense
      || (licenses || [])[0]
      || null;

    if (action === 'list_licenses') {
      return jsonResponse({
        licenses: licenses || [],
        active_license_id: selectedLicense?.id || null,
      });
    }

    if (action === 'select_license') {
      const licenseId = String(body.license_id || '');
      const license = activeLicenses.find((item: any) => item.id === licenseId);
      if (!license) {
        return jsonResponse({ error: 'License is not active or does not belong to this account.' }, { status: 404 });
      }

      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: user.id,
          active_license_id: license.id,
          plan_level: license.keyauth_level || profile?.plan_level || 0,
          plan_source: 'keyauth',
          plan_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      return jsonResponse({ ok: true, active_license_id: license.id, license });
    }

    if (action === 'activate_license') {
      const licenseKey = normalizeLicenseKeyInput(body.license_key);
      const { data: linkedLicense } = await supabaseAdmin
        .from('licenses')
        .select('*')
        .eq('keyauth_license_key', licenseKey)
        .maybeSingle();

      if (linkedLicense && linkedLicense.user_id !== user.id) {
        return jsonResponse({ error: 'Cette licence est deja liee a un autre compte.' }, { status: 409 });
      }

      let licenseInfo;
      try {
        licenseInfo = parseKeyAuthLicenseInfo(await getKeyAuthLicenseInfo(licenseKey));
      } catch {
        return jsonResponse({ error: 'Licence introuvable ou inactive.' }, { status: 404 });
      }
      try {
        assertLicenseCanAttach(licenseInfo, user.email);
      } catch (validationError) {
        return jsonResponse({ error: validationError instanceof Error ? validationError.message : 'Licence invalide.' }, { status: 400 });
      }

      const caps = getTierCapabilities(licenseInfo.tier);
      const now = new Date().toISOString();
      const subscriptionId = linkedLicense?.ls_subscription_id
        || `manual:${licenseKey}`;

      const { data: activatedLicense, error } = await supabaseAdmin
        .from('licenses')
        .upsert({
          id: linkedLicense?.id,
          user_id: user.id,
          ls_customer_id: user.email || null,
          ls_subscription_id: subscriptionId,
          ls_order_id: licenseInfo.sourceEventId || subscriptionId,
          keyauth_license_key: licenseKey,
          keyauth_level: caps.keyauthLevel,
          keyauth_source: linkedLicense?.keyauth_source || 'portal',
          keyauth_sync_status: 'synced',
          tier: licenseInfo.tier,
          status: 'active',
          expires_at: licenseInfo.expiresAt,
          renews_at: licenseInfo.expiresAt,
          billing_interval: licenseInfo.interval,
          device_limit: caps.deviceLimit,
          sharing_enabled: caps.sharingEnabled,
          ai_enabled: caps.aiEnabled,
          ocr_limit: caps.ocrLimit,
          family_slots: caps.familySlots,
          updated_at: now,
        }, { onConflict: 'user_id,ls_subscription_id' })
        .select('*')
        .single();
      if (error) throw error;

      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: user.id,
          active_license_id: activatedLicense.id,
          plan_level: caps.planLevel,
          plan_source: 'portal',
          plan_updated_at: now,
          updated_at: now,
        }, { onConflict: 'id' });

      if (licenseInfo.tier === 'family_pro') {
        await ensureFamilyGroup(supabaseAdmin, user, activatedLicense, { ...profile, plan_level: caps.planLevel });
      }

      const { error: usageResetError } = await supabaseAdmin.rpc('fiip_reset_subscription_period', {
        p_user_id: user.id,
        p_tier: licenseInfo.tier,
        p_budget_limit_eur: caps.aiBudgetEur,
        p_period_start: now,
        p_period_end: licenseInfo.expiresAt,
      });
      if (usageResetError) console.error('fiip_reset_subscription_period failed', usageResetError);

      await createSecurityEvent(supabaseAdmin, user.id, 'license_activated', {
        platform: 'web',
      });

      const summary = await buildAccountSummary(supabaseAdmin, user, body);
      return jsonResponse({ ok: true, license: activatedLicense, account: summary });
    }

    if (action === 'reset_hwid') {
      if (!selectedLicense?.keyauth_license_key) {
        return jsonResponse({ error: 'Aucune licence active disponible.' }, { status: 404 });
      }
      const result = await resetKeyAuthHwid(selectedLicense.keyauth_license_key);
      return jsonResponse({ ok: true, result });
    }

    if (action === 'register_device') {
      const deviceInput = sanitizeDeviceInput(body);
      const now = new Date().toISOString();
      const deviceLimit = getDeviceLimit(selectedActiveLicense);

      const { data: existingDevice } = await supabaseAdmin
        .from('account_devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('installation_id', deviceInput.installation_id)
        .maybeSingle();

      if (existingDevice?.revoked_at) {
        return jsonResponse({ error: 'Cet appareil a ete revoque.' }, { status: 403 });
      }

      if (!existingDevice) {
        const { count } = await supabaseAdmin
          .from('account_devices')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('revoked_at', null);
        if (deviceLimit !== null && Number(count || 0) >= deviceLimit) {
          return jsonResponse({ error: `Limite atteinte (${deviceLimit} appareil${deviceLimit > 1 ? 's' : ''}).` }, { status: 409 });
        }
      }

      const payload = {
        user_id: user.id,
        license_id: selectedActiveLicense?.id || null,
        ...deviceInput,
        last_seen_at: now,
        updated_at: now,
      };

      const { data: device, error } = await supabaseAdmin
        .from('account_devices')
        .upsert(payload, { onConflict: 'user_id,installation_id' })
        .select('*')
        .single();
      if (error) throw error;

      await createSecurityEvent(
        supabaseAdmin,
        user.id,
        existingDevice ? 'device_heartbeat' : 'device_registered',
        { platform: device.platform, device_name: device.device_name },
        device.id,
      );

      return jsonResponse({
        ok: true,
        device: serializeDevice(device, deviceInput.installation_id),
        device_limit: deviceLimit,
      });
    }

    if (action === 'heartbeat_device') {
      const installationId = validateUuid(body.installation_id);
      const { data: device } = await supabaseAdmin
        .from('account_devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('installation_id', installationId)
        .maybeSingle();
      if (!device) return jsonResponse({ error: 'Appareil introuvable.' }, { status: 404 });
      if (device.revoked_at) return jsonResponse({ error: 'Cet appareil a ete revoque.' }, { status: 403 });

      const now = new Date().toISOString();
      const { data: updated, error } = await supabaseAdmin
        .from('account_devices')
        .update({ last_seen_at: now, updated_at: now, license_id: selectedActiveLicense?.id || null })
        .eq('id', device.id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (error) throw error;

      return jsonResponse({ ok: true, device: serializeDevice(updated, installationId) });
    }

    if (action === 'list_devices') {
      const currentInstallationId = body.installation_id ? validateUuid(body.installation_id) : null;
      const { data: devices } = await supabaseAdmin
        .from('account_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen_at', { ascending: false });
      const activeCount = (devices || []).filter((device: any) => !device.revoked_at).length;
      return jsonResponse({
        devices: (devices || []).map((device: any) => serializeDevice(device, currentInstallationId)),
        device_count: activeCount,
        device_limit: getDeviceLimit(selectedActiveLicense),
      });
    }

    if (action === 'list_security_events') {
      const { data: events, error } = await supabaseAdmin
        .from('account_security_events')
        .select('id, device_id, event_type, metadata, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return jsonResponse({ events: events || [] });
    }

    if (action === 'revoke_device') {
      const deviceId = validateUuid(body.device_id);
      const reason = String(body.reason || 'manual').slice(0, 120);
      const { data: device } = await supabaseAdmin
        .from('account_devices')
        .select('*')
        .eq('id', deviceId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!device) return jsonResponse({ error: 'Appareil introuvable.' }, { status: 404 });

      const { data: updated, error } = await supabaseAdmin
        .from('account_devices')
        .update({
          revoked_at: device.revoked_at || new Date().toISOString(),
          revoked_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', device.id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (error) throw error;

      await createSecurityEvent(supabaseAdmin, user.id, 'device_revoked', {
        reason,
        platform: device.platform,
        device_name: device.device_name,
      }, device.id);

      return jsonResponse({ ok: true, device: serializeDevice(updated, body.installation_id || null) });
    }

    if (action === 'revoke_all_devices') {
      const keepInstallationId = body.keep_installation_id ? validateUuid(body.keep_installation_id) : null;
      let query = supabaseAdmin
        .from('account_devices')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_reason: 'global',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .is('revoked_at', null);
      if (keepInstallationId) {
        query = query.neq('installation_id', keepInstallationId);
      }
      const { error } = await query;
      if (error) throw error;

      if (selectedLicense?.keyauth_license_key) {
        await resetKeyAuthHwid(selectedLicense.keyauth_license_key).catch((error) => {
          console.error('device revoke license reset failed', error);
        });
      }

      await createSecurityEvent(supabaseAdmin, user.id, 'all_devices_revoked', {
        reason: 'global',
      });

      return jsonResponse({ ok: true });
    }

    if (action === 'ensure_family_group') {
      const group = await ensureFamilyGroup(supabaseAdmin, user, selectedLicense, profile);
      const family = await loadFamilyState(supabaseAdmin, user, { ...selectedLicense, family_group_id: group.id });
      return jsonResponse({ ok: true, ...family });
    }

    if (action === 'invite_family_member') {
      const group = await ensureFamilyGroup(supabaseAdmin, user, selectedLicense, profile);
      const email = normalizeEmail(body.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse({ error: 'Adresse e-mail invalide.' }, { status: 400 });
      }
      if (email === normalizeEmail(user.email)) {
        return jsonResponse({ error: 'Vous êtes déjà admin de ce foyer.' }, { status: 400 });
      }

      const { count } = await supabaseAdmin
        .from('family_members')
        .select('id', { count: 'exact', head: true })
        .eq('family_group_id', group.id)
        .neq('status', 'removed');
      const maxSlots = Number(selectedLicense?.family_slots || 5);
      if (Number(count || 0) >= maxSlots) {
        return jsonResponse({ error: `Limite Family Pro atteinte (${maxSlots} comptes).` }, { status: 409 });
      }

      const inviteeUserId = await findUserIdByEmail(supabaseAdmin, email);
      const token = createInviteToken();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();

      const { data: existing } = await supabaseAdmin
        .from('family_members')
        .select('*')
        .eq('family_group_id', group.id)
        .eq('invited_email', email)
        .maybeSingle();

      const payload = {
        family_group_id: group.id,
        user_id: inviteeUserId,
        role: 'member',
        invited_email: email,
        status: inviteeUserId ? 'active' : 'invited',
        invite_token: inviteeUserId ? null : token,
        invited_by_user_id: user.id,
        expires_at: inviteeUserId ? null : expiresAt,
        accepted_at: inviteeUserId ? new Date().toISOString() : null,
        removed_at: null,
        updated_at: new Date().toISOString(),
      };

      const query = existing?.id
        ? supabaseAdmin.from('family_members').update(payload).eq('id', existing.id).select('*').single()
        : supabaseAdmin.from('family_members').insert(payload).select('*').single();
      const { data: member, error } = await query;
      if (error) throw error;

      if (inviteeUserId) {
        await supabaseAdmin.from('profiles').upsert({
          id: inviteeUserId,
          plan_level: 4,
          plan_source: 'family_pro',
          plan_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } else {
        const origin = String(body.origin || req.headers.get('origin') || 'https://portail.fiip.fr');
        const inviteUrl = `${origin.replace(/\/$/, '')}/account/family?invite=${token}`;
        await sendTemplateEmail({
          supabaseAdmin,
          userId: user.id,
          to: email,
          template: 'family_invite',
          data: { inviteUrl, inviterEmail: user.email, portalUrl: `${origin.replace(/\/$/, '')}/account` },
        }).catch((error) => console.error('family invite email failed', error));
      }

      const family = await loadFamilyState(supabaseAdmin, user, { ...selectedLicense, family_group_id: group.id });
      return jsonResponse({ ok: true, member, ...family });
    }

    if (action === 'accept_family_invite') {
      const token = String(body.invite_token || '').trim();
      if (!token) return jsonResponse({ error: 'Invitation manquante.' }, { status: 400 });

      const { data: invite } = await supabaseAdmin
        .from('family_members')
        .select('*, family_groups(*)')
        .eq('invite_token', token)
        .eq('status', 'invited')
        .maybeSingle();
      if (!invite) return jsonResponse({ error: 'Invitation introuvable ou déjà utilisée.' }, { status: 404 });
      if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
        return jsonResponse({ error: 'Cette invitation a expiré.' }, { status: 410 });
      }
      if (normalizeEmail(invite.invited_email) !== normalizeEmail(user.email)) {
        return jsonResponse({ error: 'Connectez-vous avec l’adresse e-mail invitée.' }, { status: 403 });
      }

      const { data: ownerLicense } = await supabaseAdmin
        .from('licenses')
        .select('family_slots')
        .eq('family_group_id', invite.family_group_id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const { count } = await supabaseAdmin
        .from('family_members')
        .select('id', { count: 'exact', head: true })
        .eq('family_group_id', invite.family_group_id)
        .eq('status', 'active');
      const maxSlots = Number(ownerLicense?.family_slots || 5);
      if (Number(count || 0) >= maxSlots) {
        return jsonResponse({ error: `Limite Family Pro atteinte (${maxSlots} comptes).` }, { status: 409 });
      }

      const { data: member, error } = await supabaseAdmin
        .from('family_members')
        .update({
          user_id: user.id,
          status: 'active',
          invite_token: null,
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invite.id)
        .select('*')
        .single();
      if (error) throw error;

      await supabaseAdmin.from('profiles').upsert({
        id: user.id,
        plan_level: 4,
        plan_source: 'family_pro',
        plan_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      const family = await loadFamilyState(supabaseAdmin, user, selectedLicense);
      return jsonResponse({ ok: true, member, ...family });
    }

    if (action === 'remove_family_member') {
      const group = await ensureFamilyGroup(supabaseAdmin, user, selectedLicense, profile);
      const memberId = String(body.member_id || '');
      if (!memberId) return jsonResponse({ error: 'Membre manquant.' }, { status: 400 });

      const { data: member } = await supabaseAdmin
        .from('family_members')
        .select('*')
        .eq('id', memberId)
        .eq('family_group_id', group.id)
        .maybeSingle();
      if (!member) return jsonResponse({ error: 'Membre introuvable.' }, { status: 404 });
      if (member.user_id === user.id || member.role === 'admin') {
        return jsonResponse({ error: 'Le compte admin ne peut pas être retiré ici.' }, { status: 400 });
      }

      await supabaseAdmin
        .from('family_members')
        .update({
          status: 'removed',
          removed_at: new Date().toISOString(),
          invite_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', member.id);

      if (member.user_id) {
        await supabaseAdmin.from('profiles').update({
          plan_level: 0,
          plan_source: 'family_removed',
          plan_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', member.user_id).eq('plan_source', 'family_pro');
      }

      const family = await loadFamilyState(supabaseAdmin, user, { ...selectedLicense, family_group_id: group.id });
      return jsonResponse({ ok: true, ...family });
    }

    return jsonResponse(await buildAccountSummary(supabaseAdmin, user, body));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Not authenticated') {
      return jsonResponse({ error: 'Connexion requise.' }, { status: 401 });
    }
    console.error('account-api unexpected error', error);
    return jsonResponse({ error: 'Action compte impossible.' }, { status: 500 });
  }
});
