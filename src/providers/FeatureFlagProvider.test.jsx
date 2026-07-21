import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/featureFlags', () => ({
  readCachedFeatureFlags: () => ({
    global_maintenance: {
      feature_key: 'global_maintenance',
      status: 'disabled',
      message: 'Maintenance planifiée',
      reason: 'Migration',
      expected_reactivation_at: '2026-07-21T08:00:00.000Z',
    },
  }),
  startFeatureFlagPolling: () => () => {},
}));

import { FeatureFlagProvider } from './FeatureFlagProvider';

describe('FeatureFlagProvider', () => {
  it('blocks the desktop application during global maintenance', () => {
    render(
      <FeatureFlagProvider scope="app">
        <div>Contenu privé</div>
      </FeatureFlagProvider>,
    );

    expect(screen.queryByText('Contenu privé')).not.toBeInTheDocument();
    expect(screen.getByText('Maintenance planifiée')).toBeInTheDocument();
    expect(screen.getByText('Migration')).toBeInTheDocument();
  });
});
