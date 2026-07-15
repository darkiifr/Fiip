import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';

import AccountSubscription from './AccountSubscription';

describe('AccountSubscription', () => {
  it('activates a license key from the portal', async () => {
    const onActivateLicense = vi.fn().mockResolvedValue({ ok: true });

    render(<AccountSubscription account={{ license: null }} onActivateLicense={onActivateLicense} />);

    fireEvent.change(screen.getByLabelText('Cle de licence'), { target: { value: ' FIIP-KEY-123 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Activer' }));

    await waitFor(() => expect(onActivateLicense).toHaveBeenCalledWith('FIIP-KEY-123'));
    expect(screen.getByText('Licence activee et synchronisee.')).toBeInTheDocument();
  });

  it('shows the real backend error when license activation fails', async () => {
    const onActivateLicense = vi.fn().mockRejectedValue(new Error('Invalid license'));

    render(<AccountSubscription account={{ license: null }} onActivateLicense={onActivateLicense} />);

    fireEvent.change(screen.getByLabelText('Cle de licence'), { target: { value: 'ANY-LICENSE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Activer' }));

    await waitFor(() => expect(onActivateLicense).toHaveBeenCalledWith('ANY-LICENSE'));
    expect(screen.getByText('Invalid license')).toBeInTheDocument();
    expect(screen.queryByText('Licence activee et synchronisee.')).not.toBeInTheDocument();
  });

  it('lists account licenses and selects another active license', async () => {
    const onSelectLicense = vi.fn().mockResolvedValue({ ok: true });
    const account = {
      active_license_id: 'license-1',
      license: { id: 'license-1', billing_interval: 'monthly' },
      licenses: [
        {
          id: 'license-1',
          tier: 'basic',
          billing_interval: 'monthly',
          keyauth_license_key: 'BASIC-KEY',
          status: 'active',
        },
        {
          id: 'license-2',
          tier: 'pro',
          billing_interval: 'yearly',
          keyauth_license_key: 'PRO-KEY',
          status: 'active',
        },
      ],
    };

    render(<AccountSubscription account={account} onActivateLicense={vi.fn()} onSelectLicense={onSelectLicense} />);

    expect(screen.getByText('BASIC-KEY')).toBeInTheDocument();
    expect(screen.getByText('PRO-KEY')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser' }));

    await waitFor(() => expect(onSelectLicense).toHaveBeenCalledWith('license-2'));
  });

  it('does not show broken 1980 dates for active licenses', () => {
    const account = {
      active_license_id: 'license-1',
      license: { id: 'license-1', billing_interval: 'monthly' },
      licenses: [
        {
          id: 'license-1',
          tier: 'family_pro',
          billing_interval: 'monthly',
          keyauth_license_key: 'FAMILY-KEY',
          status: 'active',
          expires_at: '1980-01-01T00:00:00.000Z',
        },
      ],
    };

    render(<AccountSubscription account={account} onActivateLicense={vi.fn()} onSelectLicense={vi.fn()} />);

    expect(screen.getByText(/expiration Expiration inconnue/i)).toBeInTheDocument();
    expect(screen.queryByText(/01\/01\/1980/)).not.toBeInTheDocument();
  });
});
