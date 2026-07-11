export async function verifyLemonSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

export function parseLemonPayload(payload: any, eventNameHeader?: string | null) {
  const data = payload?.data || {};
  const attrs = data?.attributes || {};
  const meta = payload?.meta || {};
  const custom = meta?.custom_data || attrs?.custom_data || {};
  const eventName = eventNameHeader || meta?.event_name || payload?.event_name || '';
  const variantId = String(attrs?.variant_id || attrs?.first_subscription_item?.variant_id || data?.relationships?.variant?.data?.id || '');
  const subscriptionId = String(data?.id || attrs?.subscription_id || attrs?.first_subscription_item?.subscription_id || '');

  return {
    eventName,
    eventId: String(meta?.webhook_id || meta?.event_id || `${eventName}:${data?.id || crypto.randomUUID()}`),
    userId: custom?.user_id || custom?.supabase_user_id || '',
    email: attrs?.user_email || attrs?.customer_email || attrs?.email || meta?.custom_data?.email || '',
    customerId: String(attrs?.customer_id || data?.relationships?.customer?.data?.id || ''),
    subscriptionId,
    orderId: String(attrs?.order_id || data?.id || ''),
    variantId,
    status: String(attrs?.status || attrs?.status_formatted || '').toLowerCase(),
    renewsAt: attrs?.renews_at || attrs?.trial_ends_at || null,
    expiresAt: attrs?.ends_at || attrs?.renews_at || null,
    payload,
  };
}
