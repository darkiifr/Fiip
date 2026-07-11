import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';

import AccountDevices from './AccountDevices';

describe('AccountDevices', () => {
  it('renders device rows and revokes non-current active devices', async () => {
    const onRevokeDevice = vi.fn().mockResolvedValue();

    render(
      <AccountDevices
        account={{ device_count: 2, license: { status: 'active', device_limit: 3 } }}
        section={{
          status: 'ready',
          data: {
            devices: [
              {
                id: 'device-current',
                device_name: 'Navigateur web',
                platform: 'web',
                last_seen_at: '2026-07-10T08:00:00Z',
                is_current: true,
              },
              {
                id: 'device-desktop',
                device_name: 'PC Vincent',
                platform: 'desktop',
                last_seen_at: '2026-07-10T07:00:00Z',
                is_current: false,
              },
              {
                id: 'device-old',
                device_name: 'Ancien mobile',
                platform: 'mobile',
                revoked_at: '2026-07-09T07:00:00Z',
              },
            ],
          },
        }}
        onRefresh={vi.fn()}
        onRevokeDevice={onRevokeDevice}
      />,
    );

    expect(screen.getByText('Navigateur web')).toBeInTheDocument();
    expect(screen.getByText('Actuel')).toBeInTheDocument();
    expect(screen.getByText('Revoque')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Revoquer'));

    await waitFor(() => expect(onRevokeDevice).toHaveBeenCalledWith('device-desktop'));
    expect(screen.getByText('Appareil revoque.')).toBeInTheDocument();
  });
});
