import { describe, expect, it } from 'vitest';

import { getDeviceLimitState, getLicenseState, getOcrState } from './accountPresentation';

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

  it('only formats unlimited OCR when an active license explicitly has no limit', () => {
    expect(getOcrState({
      license: {
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
});
