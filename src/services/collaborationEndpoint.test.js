import { describe, expect, it } from 'vitest';

import { getCollaborationEndpoint } from './collaborationEndpoint';

describe('collaboration endpoint', () => {
  it('does not fallback to localhost when no Hocuspocus URL is configured', () => {
    expect(getCollaborationEndpoint('')).toBeNull();
    expect(getCollaborationEndpoint(undefined)).toBeNull();
  });

  it('accepts explicit websocket endpoints', () => {
    expect(getCollaborationEndpoint('wss://sync.fiip.app')).toBe('wss://sync.fiip.app');
    expect(getCollaborationEndpoint('ws://localhost:1234', { allowLocalhost: true })).toBe('ws://localhost:1234');
  });
});
