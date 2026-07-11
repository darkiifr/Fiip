import { getEnv, getOptionalEnv } from './env.ts';
import { getTierCapabilities, type BillingInterval, type FiipTier } from './tiers.ts';

export const KEYAUTH_LICENSE_MASK = '******-******-******-******-******-******';

export interface KeyAuthLicenseRequest {
  userId: string;
  email?: string;
  tier: FiipTier;
  interval?: BillingInterval;
  expiresAt?: string | null;
  sourceEventId?: string;
}

function expiryDays(interval?: BillingInterval, expiresAt?: string | null) {
  if (expiresAt) {
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.max(1, Math.ceil(ms / 86_400_000));
  }
  return interval === 'yearly' ? 365 : 30;
}

async function sellerRequest(params: Record<string, string | number | boolean | undefined>) {
  const sellerKey = getEnv('KEYAUTH_SELLER_KEY');
  const baseUrl = getOptionalEnv('KEYAUTH_SELLER_API_URL') || 'https://keyauth.win/api/seller/';
  const url = new URL(baseUrl);
  url.searchParams.set('sellerkey', sellerKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), { method: 'GET' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `KeyAuth Seller API failed (${response.status})`);
  }
  return payload;
}

export function extractKeyAuthLicenseKey(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as Record<string, unknown>;

  const firstStringValue = (value: unknown) => {
    if (!value || typeof value !== 'object') return '';
    const found = Object.values(value as Record<string, unknown>).find((item) => typeof item === 'string' && item.trim());
    return typeof found === 'string' ? found.trim() : '';
  };

  if (typeof data.key === 'string' && data.key.trim()) {
    return data.key.trim();
  }

  const nestedKey = firstStringValue(data.key);
  if (nestedKey) return nestedKey;

  if (Array.isArray(data.keys)) {
    const firstKey = data.keys.find((item) => typeof item === 'string' && item.trim());
    if (typeof firstKey === 'string') return firstKey.trim();

    const firstNestedKey = data.keys.map(firstStringValue).find(Boolean);
    if (firstNestedKey) return firstNestedKey;
  }

  if (data.keys && typeof data.keys === 'object') {
    const firstKey = Object.values(data.keys as Record<string, unknown>).find((item) => typeof item === 'string' && item.trim());
    if (typeof firstKey === 'string') return firstKey.trim();

    const firstNestedKey = Object.values(data.keys as Record<string, unknown>).map(firstStringValue).find(Boolean);
    if (firstNestedKey) return firstNestedKey;
  }

  if (typeof data.license === 'string' && data.license.trim()) {
    return data.license.trim();
  }

  return '';
}

export async function generateKeyAuthLicense(input: KeyAuthLicenseRequest) {
  const caps = getTierCapabilities(input.tier);
  const note = JSON.stringify({
    user_id: input.userId,
    email: input.email || null,
    tier: input.tier,
    source_event_id: input.sourceEventId || null,
  });

  const payload = await sellerRequest({
    type: 'add',
    format: 'json',
    expiry: expiryDays(input.interval, input.expiresAt),
    mask: KEYAUTH_LICENSE_MASK,
    level: caps.keyauthLevel,
    amount: 1,
    owner: input.email || input.userId,
    note,
    displayToken: 1,
  });

  return {
    key: extractKeyAuthLicenseKey(payload),
    payload,
  };
}

export async function extendKeyAuthLicense(licenseKey: string, interval?: BillingInterval, expiresAt?: string | null) {
  return sellerRequest({
    type: 'addtime',
    key: licenseKey,
    time: expiryDays(interval, expiresAt),
  });
}

export async function revokeKeyAuthLicense(licenseKey: string, reason = 'subscription inactive') {
  return sellerRequest({
    type: 'ban',
    key: licenseKey,
    reason,
  });
}

export async function resetKeyAuthHwid(licenseKey: string) {
  return sellerRequest({
    type: 'resethwid',
    key: licenseKey,
  });
}

export async function getKeyAuthLicenseInfo(licenseKey: string) {
  return sellerRequest({
    type: 'info',
    key: licenseKey,
    format: 'json',
  });
}
