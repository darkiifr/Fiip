import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';

import AccountSecurity from './AccountSecurity';

describe('AccountSecurity', () => {
  it('renders security history events with useful metadata', () => {
    render(
      <AccountSecurity
        account={{ user: { email: 'vincent@fiip.app' } }}
        section={{
          status: 'ready',
          data: {
            events: [{
              id: 'event-1',
              event_type: 'device_registered',
              metadata: { device_name: 'Chrome Windows', platform: 'web', app_version: '9.0.6' },
              created_at: '2026-07-13T14:30:00.000Z',
            }],
          },
        }}
        onRefresh={vi.fn()}
        onRevokeAll={vi.fn()}
      />,
    );

    expect(screen.getByText('Appareil ajoute')).toBeInTheDocument();
    expect(screen.getByText('Chrome Windows - web - 9.0.6')).toBeInTheDocument();
  });

  it('shows the backend error when security history cannot load', () => {
    render(
      <AccountSecurity
        account={{ user: { email: 'vincent@fiip.app' } }}
        section={{ status: 'error', error: 'Table account_security_events introuvable.' }}
        onRefresh={vi.fn()}
        onRevokeAll={vi.fn()}
      />,
    );

    expect(screen.getByText('Table account_security_events introuvable.')).toHaveClass('account-error');
  });
});
