import { normalizeTier, type BillingInterval, type FiipTier } from './tiers.ts';

const ACTIONS = new Set(['generate_license', 'extend_license', 'revoke_license', 'sync_license', 'reset_hwid', 'device_logout']);
const EVENT_ID_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const LICENSE_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const USER_ID_RE = /^[A-Za-z0-9._:@-]{1,160}$/;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export interface SanitizedKeyAuthWebhookBody {
  action: 'generate_license' | 'extend_license' | 'revoke_license' | 'sync_license' | 'reset_hwid' | 'device_logout';
  source_event_id: string | null;
  user_id: string | null;
  email?: string;
  tier: FiipTier;
  interval?: BillingInterval;
  expires_at?: string;
  license_key?: string;
  reason?: string;
}

export function sanitizeKeyAuthWebhookBody(input: unknown): SanitizedKeyAuthWebhookBody {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid request body');
  }
  const body = input as Record<string, unknown>;
  const action = String(body.action || '').trim() as SanitizedKeyAuthWebhookBody['action'];
  if (!ACTIONS.has(action)) {
    throw new Error('Unsupported action');
  }

  const sourceEventId = String(body.source_event_id || '').trim();
  if (sourceEventId && !EVENT_ID_RE.test(sourceEventId)) {
    throw new Error('Invalid event id');
  }

  const userId = String(body.user_id || '').trim();
  if (['generate_license'].includes(action) && !USER_ID_RE.test(userId)) {
    throw new Error('Invalid user id');
  }

  const email = String(body.email || '').trim().toLowerCase();
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) {
    throw new Error('Invalid email');
  }

  const licenseKey = String(body.license_key || '').trim();
  if (['extend_license', 'revoke_license', 'reset_hwid', 'device_logout'].includes(action) && !LICENSE_KEY_RE.test(licenseKey)) {
    throw new Error('Invalid license key');
  }

  return {
    action,
    source_event_id: sourceEventId || null,
    user_id: userId || null,
    email: email || undefined,
    tier: normalizeTier(body.tier),
    interval: body.interval === 'yearly' || body.interval === 'monthly' ? body.interval : undefined,
    expires_at: typeof body.expires_at === 'string' ? body.expires_at : undefined,
    license_key: licenseKey || undefined,
    reason: String(body.reason || '').replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, 160) || undefined,
  };
}
