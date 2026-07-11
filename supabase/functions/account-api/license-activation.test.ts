import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  normalizeLicenseKeyInput,
  parseKeyAuthLicenseInfo,
  resolveTierFromKeyAuthLevel,
} from './license-activation.ts';

Deno.test('normalizeLicenseKeyInput trims and rejects invalid license keys', () => {
  assertEquals(normalizeLicenseKeyInput('  FIIP-KEY-123  '), 'FIIP-KEY-123');
  assertThrows(() => normalizeLicenseKeyInput('short'), Error, 'Cle de licence invalide.');
  assertThrows(() => normalizeLicenseKeyInput('x'.repeat(160)), Error, 'Cle de licence invalide.');
});

Deno.test('resolveTierFromKeyAuthLevel maps account levels to tiers', () => {
  assertEquals(resolveTierFromKeyAuthLevel(1), 'basic');
  assertEquals(resolveTierFromKeyAuthLevel(2), 'pro');
  assertEquals(resolveTierFromKeyAuthLevel(3), 'ai');
  assertEquals(resolveTierFromKeyAuthLevel(4), 'family_pro');
});

Deno.test('parseKeyAuthLicenseInfo keeps buyer note and expiry when available', () => {
  const parsed = parseKeyAuthLicenseInfo({
    success: true,
    status: 'Not Used',
    level: '2',
    note: JSON.stringify({ email: 'Buyer@Fiip.App', tier: 'pro', interval: 'yearly' }),
    duration: String(Math.floor(Date.now() / 1000) + 3600),
  });

  assertEquals(parsed.email, 'buyer@fiip.app');
  assertEquals(parsed.tier, 'pro');
  assertEquals(parsed.interval, 'yearly');
  assertEquals(parsed.level, 2);
  assertEquals(typeof parsed.expiresAt, 'string');
});
