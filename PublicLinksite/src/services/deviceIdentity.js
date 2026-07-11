const INSTALLATION_KEY = 'fiip_account_installation_id';

function createUuid() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  window.crypto?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getInstallationId() {
  const existing = localStorage.getItem(INSTALLATION_KEY);
  if (existing) return existing;
  const installationId = createUuid();
  localStorage.setItem(INSTALLATION_KEY, installationId);
  return installationId;
}

export function getCurrentDeviceDescriptor() {
  const userAgent = window.navigator?.userAgent || '';
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(userAgent);
  return {
    installation_id: getInstallationId(),
    platform: 'web',
    device_name: isMobile ? 'Navigateur mobile' : 'Navigateur web',
    app_version: import.meta.env.VITE_APP_VERSION || null,
  };
}
