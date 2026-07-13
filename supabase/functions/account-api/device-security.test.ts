import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  resolveAccountDeviceLimit,
  sanitizeDeviceInput,
  sanitizeSecurityMetadata,
  validateUuid,
} from './device-security.ts';

Deno.test('validateUuid rejects malformed ids', () => {
  assertThrows(() => validateUuid('abc'), Error, 'Identifiant invalide.');
  assertEquals(validateUuid('11111111-1111-4111-8111-111111111111'), '11111111-1111-4111-8111-111111111111');
});

Deno.test('sanitizeDeviceInput enforces platform and length limits', () => {
  assertEquals(sanitizeDeviceInput({
    installation_id: '22222222-2222-4222-8222-222222222222',
    platform: 'desktop',
    device_name: '  Vincent PC  ',
    app_version: '1.2.3',
  }), {
    installation_id: '22222222-2222-4222-8222-222222222222',
    platform: 'desktop',
    device_name: 'Vincent PC',
    app_version: '1.2.3',
  });

  assertThrows(() => sanitizeDeviceInput({
    installation_id: '22222222-2222-4222-8222-222222222222',
    platform: 'console',
    device_name: 'Device',
  }), Error, 'Plateforme invalide.');
});

Deno.test('sanitizeSecurityMetadata keeps only safe short values', () => {
  assertEquals(sanitizeSecurityMetadata({
    reason: 'manual',
    token: 'secret',
    long: 'a'.repeat(200),
    count: 2,
  }), {
    reason: 'manual',
    count: 2,
  });
});

Deno.test('resolveAccountDeviceLimit preserves real tier capabilities', () => {
  const isActive = (license: any) => license?.status === 'active';

  assertEquals(resolveAccountDeviceLimit(null, isActive), 1);
  assertEquals(resolveAccountDeviceLimit({ status: 'active', tier: 'basic', device_limit: null }, isActive), 2);
  assertEquals(resolveAccountDeviceLimit({ status: 'active', tier: 'family_pro', device_limit: null }, isActive), null);
  assertEquals(resolveAccountDeviceLimit({ status: 'active', tier: 'pro', device_limit: 3 }, isActive), 3);
});
