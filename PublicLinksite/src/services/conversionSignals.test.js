import { describe, expect, it } from 'vitest';
import { getAnnualSavings, getQuotaPrompt, getTrialDaysRemaining } from './conversionSignals';

describe('conversion signals', () => {
  it('computes a truthful rounded-up trial countdown', () => {
    const now = new Date('2026-07-22T10:00:00Z').getTime();
    expect(getTrialDaysRemaining({ active: true, ends_at: '2026-07-24T09:00:00Z' }, now)).toBe(2);
    expect(getTrialDaysRemaining({ active: false, ends_at: '2026-07-24T09:00:00Z' }, now)).toBeNull();
  });

  it('only prompts when real quota usage becomes risky', () => {
    expect(getQuotaPrompt(79, 20)).toBeNull();
    expect(getQuotaPrompt(80, 20)).toMatchObject({ tone: 'warning' });
    expect(getQuotaPrompt(40, 100)).toMatchObject({ tone: 'critical' });
  });

  it('derives annual savings from configured prices', () => {
    expect(getAnnualSavings({ id: 'pro', monthly: '6,99€', yearly: '62,99€' })).toBe('20,89');
    expect(getAnnualSavings({ id: 'free', monthly: '0€', yearly: '0€' })).toBeNull();
  });
});
