import { assertEquals } from 'jsr:@std/assert';

import { getTierCapabilities, normalizeAccessTier, PAID_TIERS, variantEnvName } from './tiers.ts';

Deno.test('free and trial access never provision a KeyAuth subscription', () => {
  assertEquals(getTierCapabilities('free').keyauthLevel, 0);
  assertEquals(getTierCapabilities('trial').keyauthSubscription, null);
  assertEquals(getTierCapabilities('trial').planLevel, 2);
  assertEquals(getTierCapabilities('trial').aiEnabled, false);
});

Deno.test('paid tiers map to the four KeyAuth levels', () => {
  assertEquals(PAID_TIERS.map((tier) => getTierCapabilities(tier).keyauthLevel), [1, 2, 3, 4]);
  assertEquals(getTierCapabilities('family_pro').keyauthSubscription, 'Fiip Family Pro');
  assertEquals(variantEnvName('ai', 'yearly'), 'LS_VARIANT_AI_YEARLY');
});

Deno.test('unknown access is free while billing normalization stays explicit', () => {
  assertEquals(normalizeAccessTier(undefined), 'free');
  assertEquals(normalizeAccessTier('trial'), 'trial');
  assertEquals(normalizeAccessTier('Family Pro'), 'family_pro');
  assertEquals(getTierCapabilities('unknown').tier, 'free');
});
