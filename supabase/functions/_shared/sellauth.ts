import { getEnv, getOptionalEnv } from './env.ts';
import { normalizeTier, type BillingInterval, type FiipTier } from './tiers.ts';

export interface SellAuthDeliveryPayload {
  event?: string;
  id?: number;
  invoice_id?: number;
  unique_id?: string;
  email?: string;
  shop_id?: number;
  customer?: {
    id?: number | string;
    email?: string;
  };
  item?: {
    id?: number;
    product_id?: number | string;
    variant_id?: number | string;
    quantity?: number;
    product?: { name?: string };
    variant?: { name?: string };
    custom_fields?: Record<string, unknown>;
  };
}

const MAX_SELLAUTH_BODY_BYTES = 128 * 1024;
const EVENT_ID_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function normalizeSellAuthEventId(value: unknown) {
  const eventId = String(value || '').trim();
  if (!EVENT_ID_RE.test(eventId)) {
    throw new Error('Invalid SellAuth event id');
  }
  return eventId;
}

export function normalizeSellAuthEmail(value: unknown) {
  const email = String(value || '').trim().toLowerCase();
  if (!email) return undefined;
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    throw new Error('Invalid SellAuth customer email');
  }
  return email;
}

function normalizeSellAuthId(value: unknown) {
  const id = String(value || '').trim();
  if (!id) return undefined;
  if (!/^[0-9]{1,32}$/.test(id)) {
    throw new Error('Invalid SellAuth product identifier');
  }
  return id;
}

function normalizeSellAuthLabel(value: unknown) {
  return String(value || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 120);
}

export function parseSellAuthDeliveryPayload(rawBody: string): SellAuthDeliveryPayload {
  if (new TextEncoder().encode(rawBody).length > MAX_SELLAUTH_BODY_BYTES) {
    throw new Error('SellAuth payload too large');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error('Invalid SellAuth JSON payload');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid SellAuth payload');
  }

  const input = parsed as Record<string, unknown>;
  const item = input.item && typeof input.item === 'object' && !Array.isArray(input.item)
    ? input.item as Record<string, unknown>
    : {};
  const customer = input.customer && typeof input.customer === 'object' && !Array.isArray(input.customer)
    ? input.customer as Record<string, unknown>
    : {};
  const product = item.product && typeof item.product === 'object' && !Array.isArray(item.product)
    ? item.product as Record<string, unknown>
    : {};
  const variant = item.variant && typeof item.variant === 'object' && !Array.isArray(item.variant)
    ? item.variant as Record<string, unknown>
    : {};

  const payload: SellAuthDeliveryPayload = {
    event: normalizeSellAuthLabel(input.event),
    id: Number(input.id || input.invoice_id || 0) || undefined,
    invoice_id: Number(input.invoice_id || 0) || undefined,
    unique_id: normalizeSellAuthLabel(input.unique_id),
    email: normalizeSellAuthEmail(input.email),
    shop_id: Number(input.shop_id || 0) || undefined,
    customer: {
      id: normalizeSellAuthId(customer.id),
      email: normalizeSellAuthEmail(customer.email),
    },
    item: {
      id: Number(item.id || 0) || undefined,
      product_id: normalizeSellAuthId(item.product_id),
      variant_id: normalizeSellAuthId(item.variant_id),
      quantity: Math.max(1, Math.min(10, Number(item.quantity || 1) || 1)),
      product: { name: normalizeSellAuthLabel(product.name) },
      variant: { name: normalizeSellAuthLabel(variant.name) },
    },
  };

  if (payload.event && payload.event !== 'INVOICE.ITEM.DELIVER-DYNAMIC') {
    throw new Error('Unsupported SellAuth event');
  }
  if (!payload.item?.product_id || !payload.item?.variant_id) {
    throw new Error('Missing SellAuth product identifiers');
  }

  return payload;
}

export async function verifySellAuthSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const cleanSignature = signature.toLowerCase().replace(/^sha256=/, '');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getEnv('SELLAUTH_WEBHOOK_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(expected, cleanSignature);
}

export function verifySellAuthDeliveryToken(req: Request) {
  const expected = getOptionalEnv('SELLAUTH_DELIVERY_TOKEN');
  if (!expected) return false;

  const provided = req.headers.get('X-Fiip-Delivery-Token') || '';
  return timingSafeEqual(expected, provided);
}

function timingSafeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

function mappingEnvName(tier: FiipTier, interval: BillingInterval, key: 'PRODUCT_ID' | 'VARIANT_ID') {
  return `SELLAUTH_${tier.toUpperCase()}_${interval.toUpperCase()}_${key}`;
}

export function resolveTierFromSellAuthItem(payload: SellAuthDeliveryPayload) {
  const productId = String(payload.item?.product_id || '');
  const variantId = String(payload.item?.variant_id || '');
  const label = `${payload.item?.product?.name || ''} ${payload.item?.variant?.name || ''}`;
  const interval = /year|annuel|annual/i.test(label) ? 'yearly' : 'monthly';

  for (const tier of ['basic', 'pro', 'ai', 'family_pro'] as FiipTier[]) {
    for (const interval of ['monthly', 'yearly'] as BillingInterval[]) {
      const envProductId = Deno.env.get(mappingEnvName(tier, interval, 'PRODUCT_ID')) || '';
      const envVariantId = Deno.env.get(mappingEnvName(tier, interval, 'VARIANT_ID')) || '';
      if (envProductId === productId && envVariantId === variantId) {
        return { tier, interval };
      }
    }
  }

  for (const tier of ['basic', 'pro', 'ai', 'family_pro'] as FiipTier[]) {
    const monthlyProductId = Deno.env.get(mappingEnvName(tier, 'monthly', 'PRODUCT_ID')) || '';
    const yearlyProductId = Deno.env.get(mappingEnvName(tier, 'yearly', 'PRODUCT_ID')) || '';
    if (productId && (monthlyProductId === productId || yearlyProductId === productId)) {
      return { tier, interval: interval as BillingInterval };
    }
  }

  return { tier: normalizeTier(label), interval: interval as BillingInterval };
}
