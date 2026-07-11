function isActiveLicense(license) {
  if (!license) return false;
  if (license.status !== 'active') return false;
  if (!license.expires_at) return true;
  return new Date(license.expires_at).getTime() > Date.now();
}

function formatTier(tier) {
  if (!tier) return 'Free';
  return String(tier)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getLicenseState(account) {
  const license = account?.license || null;
  const hasActiveLicense = isActiveLicense(license);
  return {
    hasActiveLicense,
    planLabel: hasActiveLicense ? formatTier(license.tier) : 'Free',
    statusLabel: hasActiveLicense ? 'Licence active' : 'Aucune licence active',
  };
}

export function getOcrState(account) {
  const license = account?.license || null;
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
  const license = account?.license || null;
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
