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

export function getDisplayLicense(account) {
  const primary = account?.license || null;
  if (isActiveLicense(primary)) return primary;

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

export function getLicenseState(account) {
  const license = getDisplayLicense(account);
  const hasActiveLicense = isActiveLicense(license);
  return {
    hasActiveLicense,
    planLabel: hasActiveLicense ? formatTier(license.tier) : 'Free',
    statusLabel: hasActiveLicense ? 'Licence active' : 'Aucune licence active',
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

  const limit = Number(license.ocr_limit || 0);
  if (limit > 0) {
    return {
      label: `${Number(license.ocr_scans_used || 0)}/${limit} scans`,
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
  const limit = isActiveLicense(license) && Number(license.device_limit || 0) > 0
    ? Number(license.device_limit)
    : 1;
  return {
    used,
    limit,
    label: `${used}/${limit} appareil${used > 1 ? 's' : ''}`,
  };
}
