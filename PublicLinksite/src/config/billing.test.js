import { describe, expect, it } from 'vitest';

import {
  BILLING_TIERS,
  canUseAi,
  canUseBrowserExtension,
  canUseOcrScan,
  getTierPolicy,
} from './billing';

describe('Fiip billing capabilities', () => {
  it('limits Basic OCR to five scans per period and blocks the sixth scan', () => {
    expect(getTierPolicy('basic').ocrLimit).toBe(5);
    expect(canUseOcrScan('basic', 0)).toBe(true);
    expect(canUseOcrScan('basic', 4)).toBe(true);
    expect(canUseOcrScan('basic', 5)).toBe(false);
    expect(canUseOcrScan('basic', 6)).toBe(false);
  });

  it('keeps OCR unlimited for paid tiers above Basic', () => {
    expect(canUseOcrScan('pro', 500)).toBe(true);
    expect(canUseOcrScan('ai', 500)).toBe(true);
    expect(canUseOcrScan('family_pro', 500)).toBe(true);
  });

  it('only enables the browser extension from Pro upward', () => {
    expect(canUseBrowserExtension('basic')).toBe(false);
    expect(canUseBrowserExtension('pro')).toBe(true);
    expect(canUseBrowserExtension('ai')).toBe(true);
    expect(canUseBrowserExtension('family_pro')).toBe(true);
  });

  it('only enables AI on AI and Family Pro tiers', () => {
    expect(canUseAi('basic')).toBe(false);
    expect(canUseAi('pro')).toBe(false);
    expect(canUseAi('ai')).toBe(true);
    expect(canUseAi('family_pro')).toBe(true);
  });

  it('keeps the displayed tiers backed by explicit capabilities', () => {
    expect(BILLING_TIERS).toHaveLength(4);
    for (const tier of BILLING_TIERS) {
      expect(tier.capabilities).toEqual(expect.objectContaining({
        sharingEnabled: expect.any(Boolean),
        extensionEnabled: expect.any(Boolean),
        aiEnabled: expect.any(Boolean),
        familySlots: expect.any(Number),
      }));
      expect(tier.capabilities).toHaveProperty('ocrLimit');
      expect(tier.capabilities).toHaveProperty('deviceLimit');
    }
  });
});
