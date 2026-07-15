import { getTierPolicy } from '../config/billing';

function isValidLicenseDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getUTCFullYear() >= 2024;
}

function isActiveLicense(license) {
  if (!license) return false;
  if (license.status !== 'active') return false;
  if (!isValidLicenseDate(license.expires_at)) return true;
  return new Date(license.expires_at).getTime() > Date.now();
}

function getFamilyMemberEffectiveLicense(account) {
  const membership = account?.family_membership;
  const familyGroup = account?.family_group;
  if (!membership || membership.status !== 'active' || !familyGroup?.id) return null;

  const ownerLicense = account?.family_license || {};
  const renewalDate = ownerLicense.renews_at || ownerLicense.expires_at || null;

  return {
    id: `family-membership:${membership.id || familyGroup.id}`,
    tier: 'family_pro',
    status: 'active',
    device_limit: ownerLicense.device_limit ?? null,
    ocr_limit: ownerLicense.ocr_limit ?? null,
    ai_enabled: ownerLicense.ai_enabled ?? true,
    sharing_enabled: ownerLicense.sharing_enabled ?? true,
    family_slots: Number(ownerLicense.family_slots || 5),
    expires_at: renewalDate,
    renews_at: ownerLicense.renews_at || renewalDate,
    is_family_member_license: true,
    family_group_id: familyGroup.id,
  };
}

export function getDisplayLicense(account) {
  const primary = account?.license || null;
  if (isActiveLicense(primary)) return primary;

  const familyMemberLicense = getFamilyMemberEffectiveLicense(account);
  if (familyMemberLicense) return familyMemberLicense;

  const licenses = Array.isArray(account?.licenses) ? account.licenses : [];
  const activeLicenseId = account?.active_license_id || account?.profile?.active_license_id || null;
  return licenses.find((license) => license.id === activeLicenseId && isActiveLicense(license))
    || licenses.find((license) => isActiveLicense(license))
    || primary
    || licenses[0]
    || null;
}

function formatTier(tier) {
  if (!tier) return 'Free';
  return String(tier)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeTier(tier) {
  const value = String(tier || '').toLowerCase().replace(/[-\s]/g, '_');
  if (value === 'family' || value === 'family_pro') return 'family_pro';
  if (value === 'ai') return 'ai';
  if (value === 'pro') return 'pro';
  if (value === 'basic') return 'basic';
  return '';
}

function resolveNullableCapability(rawValue, policyValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return policyValue;
  const value = Number(rawValue);
  return value > 0 ? value : policyValue;
}

export function getLicenseCapabilities(license) {
  const tier = normalizeTier(license?.tier);
  if (!tier) {
    return {
      deviceLimit: 1,
      ocrLimit: 0,
      familySlots: 1,
      aiEnabled: false,
      sharingEnabled: false,
      extensionEnabled: false,
    };
  }

  const policy = getTierPolicy(tier);
  return {
    ...policy,
    deviceLimit: resolveNullableCapability(license?.device_limit, policy.deviceLimit),
    ocrLimit: resolveNullableCapability(license?.ocr_limit, policy.ocrLimit),
    familySlots: Number(license?.family_slots || policy.familySlots || 1),
    aiEnabled: Boolean(license?.ai_enabled ?? policy.aiEnabled),
    sharingEnabled: Boolean(license?.sharing_enabled ?? policy.sharingEnabled),
  };
}

export function formatAccountDate(value, fallback = 'Expiration inconnue') {
  return isValidLicenseDate(value) ? new Date(value).toLocaleDateString('fr-FR') : fallback;
}

export function getLicenseState(account) {
  const license = getDisplayLicense(account);
  const hasActiveLicense = isActiveLicense(license);
  const isFamilyMember = Boolean(license?.is_family_member_license);
  return {
    hasActiveLicense,
    planLabel: hasActiveLicense ? formatTier(license.tier) : 'Free',
    statusLabel: hasActiveLicense ? (isFamilyMember ? 'Membre Family Pro' : 'Licence active') : 'Aucune licence active',
    isFamilyMember,
  };
}

export function getOcrState(account) {
  const license = getDisplayLicense(account);
  if (!isActiveLicense(license)) {
    return {
      label: 'OCR limite',
      detail: 'Quelques scans de base disponibles',
      tone: 'limited',
    };
  }

  const { ocrLimit } = getLicenseCapabilities(license);
  if (Number(ocrLimit || 0) > 0) {
    return {
      label: `${Number(license.ocr_scans_used || 0)}/${ocrLimit} scans`,
      detail: 'Ce mois',
      tone: 'ok',
    };
  }

  return {
    label: 'OCR illimite',
    detail: 'Licence active',
    tone: 'ok',
  };
}

export function getDeviceLimitState(account) {
  const license = getDisplayLicense(account);
  const used = Number(account?.device_count || account?.devices?.length || 0);
  const limit = isActiveLicense(license) ? getLicenseCapabilities(license).deviceLimit : 1;
  const plural = used > 1 ? 's' : '';
  return {
    used,
    limit,
    label: limit === null
      ? `${used} appareil${plural} / illimité`
      : `${used}/${limit} appareil${plural}`,
  };
}
