import { normalizeTier, type BillingInterval, type FiipTier } from '../_shared/tiers.ts';

const LICENSE_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export interface ParsedLicenseInfo {
  level: number;
  tier: FiipTier;
  interval: BillingInterval | null;
  email: string | null;
  expiresAt: string | null;
  status: string;
  sourceEventId: string | null;
}

export function normalizeLicenseKeyInput(value: unknown) {
  const key = String(value || '').trim();
  if (!LICENSE_KEY_RE.test(key)) {
    throw new Error('Cle de licence invalide.');
  }
  return key;
}

export function resolveTierFromKeyAuthLevel(level: unknown): FiipTier {
  const numericLevel = Number(level || 0);
  if (numericLevel >= 4) return 'family_pro';
  if (numericLevel >= 3) return 'ai';
  if (numericLevel >= 2) return 'pro';
  return 'basic';
}

function parseNote(note: unknown) {
  if (typeof note !== 'string' || !note.trim()) return {};
  try {
    const parsed = JSON.parse(note);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function parseExpiry(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return null;
  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric > 0) {
    const millis = numeric > 10_000_000_000 ? numeric : numeric * 1000;
    const date = new Date(millis);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseKeyAuthLicenseInfo(payload: Record<string, unknown>): ParsedLicenseInfo {
  const note = parseNote(payload.note);
  const level = Number(payload.level || note.keyauth_level || 1);
  const noteInterval = String(note.interval || '').toLowerCase();
  const interval = noteInterval === 'yearly' || noteInterval === 'monthly' ? noteInterval as BillingInterval : null;
  const email = String(note.email || '').trim().toLowerCase() || null;

  return {
    level,
    tier: note.tier ? normalizeTier(note.tier) : resolveTierFromKeyAuthLevel(level),
    interval,
    email,
    expiresAt: parseExpiry(payload.duration),
    status: String(payload.status || '').trim().toLowerCase(),
    sourceEventId: String(note.source_event_id || '').trim() || null,
  };
}

export function assertLicenseCanAttach(parsed: ParsedLicenseInfo, userEmail?: string | null) {
  if (parsed.status && ['banned', 'expired', 'disabled', 'revoked'].includes(parsed.status)) {
    throw new Error('Cette licence n’est pas active.');
  }
  const normalizedEmail = String(userEmail || '').trim().toLowerCase();
  if (parsed.email && normalizedEmail && parsed.email !== normalizedEmail) {
    throw new Error('Cette licence appartient a une autre adresse e-mail.');
  }
}
