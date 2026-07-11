const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLATFORMS = new Set(['desktop', 'mobile', 'web']);
const SAFE_METADATA_KEYS = new Set(['reason', 'platform', 'device_name', 'count']);

function trimText(value: unknown, maxLength: number) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  return text.slice(0, maxLength);
}

export function validateUuid(value: unknown) {
  const text = String(value || '').trim();
  if (!UUID_RE.test(text)) {
    throw new Error('Identifiant invalide.');
  }
  return text.toLowerCase();
}

export function sanitizeDeviceInput(input: Record<string, unknown>) {
  const installationId = validateUuid(input.installation_id);
  const platform = trimText(input.platform, 16).toLowerCase();
  if (!PLATFORMS.has(platform)) {
    throw new Error('Plateforme invalide.');
  }

  const deviceName = trimText(input.device_name, 80) || 'Appareil Fiip';
  const appVersion = trimText(input.app_version, 32) || null;

  return {
    installation_id: installationId,
    platform,
    device_name: deviceName,
    app_version: appVersion,
  };
}

export function sanitizeSecurityMetadata(input: Record<string, unknown> = {}) {
  const metadata: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (typeof value === 'number' && Number.isFinite(value)) {
      metadata[key] = value;
      continue;
    }
    if (typeof value === 'boolean') {
      metadata[key] = value;
      continue;
    }
    if (typeof value === 'string' && value.length <= 120) {
      metadata[key] = trimText(value, 120);
    }
  }
  return metadata;
}
