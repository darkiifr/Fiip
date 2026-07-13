import { describe, expect, it } from 'vitest';

import {
  formatAccountDate,
  getDeviceLimitState,
  getDisplayLicense,
  getLicenseCapabilities,
  getLicenseState,
  getOcrState,
} from './accountPresentation';

describe('account presentation helpers', () => {
  it('does not present OCR as unlimited without an active license', () => {
    expect(getLicenseState({ license: null })).toMatchObject({
      hasActiveLicense: false,
      planLabel: 'Free',
      statusLabel: 'Aucune licence active',
    });

    expect(getOcrState({ license: null })).toEqual({
      label: 'OCR limite',
      detail: 'Quelques scans de base disponibles',
      tone: 'limited',
    });
  });

  it('formats limited OCR usage for active licenses', () => {
    expect(getOcrState({
      license: {
        tier: 'basic',
        status: 'active',
        ocr_limit: 250,
        ocr_scans_used: 31,
      },
    })).toEqual({
      label: '31/250 scans',
      detail: 'Ce mois',
      tone: 'ok',
    });
  });

  it('only formats unlimited OCR when an active unlimited tier has no limit', () => {
    expect(getOcrState({
      license: {
        tier: 'pro',
        status: 'active',
        ocr_limit: null,
      },
    })).toEqual({
      label: 'OCR illimite',
      detail: 'Licence active',
      tone: 'ok',
    });
  });

  it('formats device usage with a free fallback limit', () => {
    expect(getDeviceLimitState({ device_count: 0, license: null })).toEqual({
      used: 0,
      limit: 1,
      label: '0/1 appareil',
    });
  });

  it('uses an active license from the account list when the primary license is missing', () => {
    const account = {
      active_license_id: 'license-family',
      license: null,
      licenses: [{
        id: 'license-family',
        tier: 'family_pro',
        status: 'active',
        expires_at: null,
        device_limit: 5,
        ocr_limit: 0,
      }],
    };

    expect(getDisplayLicense(account)?.id).toBe('license-family');
    expect(getLicenseState(account)).toMatchObject({
      hasActiveLicense: true,
      planLabel: 'Family Pro',
      statusLabel: 'Licence active',
    });
    expect(getDeviceLimitState(account)).toMatchObject({
      limit: 5,
    });
  });

  it('treats legacy pre-2024 expiry dates as missing for active licenses', () => {
    expect(getLicenseState({
      license: {
        tier: 'family_pro',
        status: 'active',
        expires_at: '1980-01-01T00:00:00.000Z',
      },
    })).toMatchObject({
      hasActiveLicense: true,
      planLabel: 'Family Pro',
    });
  });

  it('uses tier capabilities when license rows store null unlimited limits', () => {
    const license = {
      id: 'license-1',
      tier: 'family_pro',
      status: 'active',
      device_limit: null,
      ocr_limit: null,
    };

    expect(getLicenseCapabilities(license)).toEqual(expect.objectContaining({
      deviceLimit: null,
      ocrLimit: null,
      familySlots: 5,
      aiEnabled: true,
    }));
    expect(getDeviceLimitState({ license, device_count: 1 }).label).toBe('1 appareil / illimité');
    expect(getOcrState({ license }).label).toBe('OCR illimite');
  });

  it('keeps Basic limits visible from the tier policy', () => {
    const license = {
      id: 'license-1',
      tier: 'basic',
      status: 'active',
      device_limit: null,
      ocr_limit: null,
    };

    expect(getDeviceLimitState({ license, device_count: 1 }).label).toBe('1/2 appareil');
    expect(getOcrState({ license }).label).toBe('0/5 scans');
  });

  it('hides invalid legacy KeyAuth expiry dates', () => {
    expect(formatAccountDate('1980-01-01T00:00:00.000Z')).toBe('Sans expiration');
  });
});
