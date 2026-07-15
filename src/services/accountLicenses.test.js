import { describe, expect, it } from 'vitest';

import { formatAccountFunctionError } from './accountLicenses';

describe('account license service errors', () => {
  it('hides generic Supabase Edge Function transport errors', () => {
    expect(formatAccountFunctionError(
      { message: 'Edge Function returned a non-2xx status code' },
      'Impossible de charger les licences.',
    )).toBe('Impossible de charger les licences.');
  });

  it('keeps readable account errors from the backend', () => {
    expect(formatAccountFunctionError(
      { message: 'Cette invitation a expiré.' },
      'Action compte impossible.',
    )).toBe('Cette invitation a expiré.');
  });
});
