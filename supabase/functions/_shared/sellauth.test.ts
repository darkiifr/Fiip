import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  normalizeSellAuthEventId,
  parseSellAuthDeliveryPayload,
  resolveTierFromSellAuthItem,
  verifySellAuthDeliveryToken,
  verifySellAuthSignature,
} from './sellauth.ts';
import { getTierCapabilities } from './tiers.ts';

function expectEqual(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

async function hmacSha256(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    event: 'INVOICE.ITEM.DELIVER-DYNAMIC',
    id: 13888518,
    unique_id: '97039048d92eb-0000013888518',
    email: 'buyer@fiip.fr',
    shop_id: 130522,
    item: {
      product_id: 782696,
      variant_id: 1314026,
      quantity: 1,
      product: { name: 'Fiip Basic' },
      variant: { name: 'Mensuel' },
    },
    ...overrides,
  };
}

Deno.test('resolveTierFromSellAuthItem maps Basic monthly product and variant ids to Basic level 1', () => {
  Deno.env.set('SELLAUTH_BASIC_MONTHLY_PRODUCT_ID', '782696');
  Deno.env.set('SELLAUTH_BASIC_MONTHLY_VARIANT_ID', '1314026');

  try {
    const result = resolveTierFromSellAuthItem({
      item: {
        product_id: 782696,
        variant_id: 1314026,
        product: { name: 'Fiip Basic' },
        variant: { name: 'Mensuel' },
      },
    });
    const caps = getTierCapabilities(result.tier);

    expectEqual(result.tier, 'basic');
    expectEqual(result.interval, 'monthly');
    expectEqual(caps.keyauthLevel, 1);
    expectEqual(caps.planLevel, 1);
  } finally {
    Deno.env.delete('SELLAUTH_BASIC_MONTHLY_PRODUCT_ID');
    Deno.env.delete('SELLAUTH_BASIC_MONTHLY_VARIANT_ID');
  }
});

Deno.test('resolveTierFromSellAuthItem falls back to the Basic product name when ids are not configured', () => {
  const result = resolveTierFromSellAuthItem({
    item: {
      product_id: 999,
      variant_id: 111,
      product: { name: 'Fiip Basic' },
      variant: { name: 'Mensuel' },
    },
  });
  const caps = getTierCapabilities(result.tier);

  expectEqual(result.tier, 'basic');
  expectEqual(result.interval, 'monthly');
  expectEqual(caps.keyauthLevel, 1);
});

Deno.test('verifySellAuthSignature accepts only the matching raw-body HMAC', async () => {
  const secret = 'unit-test-webhook-secret';
  const rawBody = JSON.stringify(validPayload());
  Deno.env.set('SELLAUTH_WEBHOOK_SECRET', secret);

  try {
    const signature = await hmacSha256(secret, rawBody);
    assertEquals(await verifySellAuthSignature(rawBody, signature), true);
    assertEquals(await verifySellAuthSignature(rawBody.replace('Basic', 'Pro'), signature), false);
    assertEquals(await verifySellAuthSignature(rawBody, `sha256=${signature}`), true);
  } finally {
    Deno.env.delete('SELLAUTH_WEBHOOK_SECRET');
  }
});

Deno.test('verifySellAuthDeliveryToken accepts only the dedicated header', () => {
  Deno.env.set('SELLAUTH_DELIVERY_TOKEN', 'delivery-secret');

  try {
    const headerRequest = new Request('https://fiip.fr/delivery', {
      headers: { 'X-Fiip-Delivery-Token': 'delivery-secret' },
    });
    const queryRequest = new Request('https://fiip.fr/delivery?delivery_token=delivery-secret');

    assertEquals(verifySellAuthDeliveryToken(headerRequest), true);
    assertEquals(verifySellAuthDeliveryToken(queryRequest), false);
  } finally {
    Deno.env.delete('SELLAUTH_DELIVERY_TOKEN');
  }
});

Deno.test('parseSellAuthDeliveryPayload normalizes safe fields and strips markup from labels', () => {
  const payload = parseSellAuthDeliveryPayload(JSON.stringify(validPayload({
    item: {
      product_id: '782696',
      variant_id: '1314026',
      quantity: 500,
      product: { name: 'Fiip <script>Basic</script>' },
      variant: { name: 'Mensuel' },
    },
  })));

  assertEquals(payload.email, 'buyer@fiip.fr');
  assertEquals(payload.item?.product_id, '782696');
  assertEquals(payload.item?.variant_id, '1314026');
  assertEquals(payload.item?.quantity, 10);
  assertEquals(String(payload.item?.product?.name || '').includes('<'), false);
});

Deno.test('parseSellAuthDeliveryPayload rejects injection-shaped identifiers and unsupported events', () => {
  assertThrows(
    () => parseSellAuthDeliveryPayload(JSON.stringify(validPayload({
      item: {
        product_id: '782696;drop table licenses',
        variant_id: '1314026',
        product: { name: 'Fiip Basic' },
        variant: { name: 'Mensuel' },
      },
    }))),
    Error,
    'Invalid SellAuth product identifier',
  );

  assertThrows(
    () => parseSellAuthDeliveryPayload(JSON.stringify(validPayload({ event: 'CUSTOMER.UPDATED' }))),
    Error,
    'Unsupported SellAuth event',
  );
});

Deno.test('normalizeSellAuthEventId rejects suspicious idempotency values', () => {
  assertEquals(normalizeSellAuthEventId('abc-123:retry_1'), 'abc-123:retry_1');
  assertThrows(() => normalizeSellAuthEventId('../secret'), Error, 'Invalid SellAuth event id');
  assertThrows(() => normalizeSellAuthEventId('x'.repeat(200)), Error, 'Invalid SellAuth event id');
});
