import { extractKeyAuthLicenseKey, KEYAUTH_LICENSE_MASK } from './keyauth.ts';

function expectEqual(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

Deno.test('extractKeyAuthLicenseKey reads the documented KeyAuth key field', () => {
  expectEqual(
    extractKeyAuthLicenseKey({
      success: true,
      message: 'Licenses successfully generated',
      key: 'FIIP-BASIC-ABC123',
    }),
    'FIIP-BASIC-ABC123',
  );
});

Deno.test('KEYAUTH_LICENSE_MASK uses six random blocks of six characters', () => {
  expectEqual(KEYAUTH_LICENSE_MASK, '******-******-******-******-******-******');
  expectEqual(KEYAUTH_LICENSE_MASK.split('-').length, 6);
  for (const block of KEYAUTH_LICENSE_MASK.split('-')) {
    expectEqual(block, '******');
  }
});

Deno.test('extractKeyAuthLicenseKey reads nested key objects without returning [object Object]', () => {
  expectEqual(
    extractKeyAuthLicenseKey({
      success: true,
      message: 'Licenses successfully generated',
      key: { license: 'FIIP-PRO-NESTED1' },
    }),
    'FIIP-PRO-NESTED1',
  );
});

Deno.test('extractKeyAuthLicenseKey never uses message as a license key', () => {
  expectEqual(
    extractKeyAuthLicenseKey({
      success: true,
      message: { text: 'Licenses successfully generated' },
      key: '',
    }),
    '',
  );
});
