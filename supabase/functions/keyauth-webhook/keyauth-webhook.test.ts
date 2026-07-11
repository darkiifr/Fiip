import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { sanitizeKeyAuthWebhookBody } from '../_shared/keyauth-webhook-validation.ts';

Deno.test('sanitizeKeyAuthWebhookBody accepts a valid license generation request', () => {
  const body = sanitizeKeyAuthWebhookBody({
    action: 'generate_license',
    source_event_id: 'sellauth-123',
    user_id: 'user_123',
    email: 'BUYER@FIIP.FR',
    tier: 'AI',
    interval: 'yearly',
  });

  assertEquals(body.action, 'generate_license');
  assertEquals(body.email, 'buyer@fiip.fr');
  assertEquals(body.tier, 'ai');
  assertEquals(body.interval, 'yearly');
});

Deno.test('sanitizeKeyAuthWebhookBody rejects unsupported actions and injected ids', () => {
  assertThrows(
    () => sanitizeKeyAuthWebhookBody({ action: 'delete_all', user_id: 'user_123' }),
    Error,
    'Unsupported action',
  );

  assertThrows(
    () => sanitizeKeyAuthWebhookBody({
      action: 'generate_license',
      source_event_id: 'abc<script>',
      user_id: 'user_123',
    }),
    Error,
    'Invalid event id',
  );
});

Deno.test('sanitizeKeyAuthWebhookBody requires license keys for mutating license actions', () => {
  assertThrows(
    () => sanitizeKeyAuthWebhookBody({ action: 'revoke_license', license_key: 'short' }),
    Error,
    'Invalid license key',
  );

  const body = sanitizeKeyAuthWebhookBody({
    action: 'reset_hwid',
    license_key: 'eWf8Yk-WJxLsL-MLhL6f-ym7uxN-U41LNs-9D8d8x',
  });
  assertEquals(body.license_key, 'eWf8Yk-WJxLsL-MLhL6f-ym7uxN-U41LNs-9D8d8x');
});
