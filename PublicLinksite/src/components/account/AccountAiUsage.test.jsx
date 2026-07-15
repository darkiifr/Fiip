import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AccountAiUsage from './AccountAiUsage';

describe('AccountAiUsage', () => {
  it('shows the shared Family budget before the first usage row exists', () => {
    render(<AccountAiUsage account={{
      ai_usage: null,
      family_group: { ai_budget_limit_eur: 2 },
    }} />);

    expect(screen.getByText('0.00€ / 2.00€')).toBeTruthy();
  });
});
