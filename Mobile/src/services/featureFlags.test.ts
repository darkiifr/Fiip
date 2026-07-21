import { normalizeFeatureFlags } from './featureFlags';

describe('mobile feature flags', () => {
  it('keeps the scope-specific flag when an all-scope default shares its key', () => {
    const flags = normalizeFeatureFlags([
      { feature_key: 'sync', scope: 'all', status: 'enabled' },
      { feature_key: 'sync', scope: 'mobile', status: 'disabled', message: 'Maintenance' },
    ], 'mobile');

    expect(flags.sync.status).toBe('disabled');
    expect(flags.sync.message).toBe('Maintenance');
  });
});
