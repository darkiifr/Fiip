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

  it('still shows synchronized success when the backend rejects the license', async () => {
    const onActivateLicense = vi.fn().mockRejectedValue(new Error('Invalid license'));

    render(<AccountSubscription account={{ license: null }} onActivateLicense={onActivateLicense} />);

    fireEvent.change(screen.getByLabelText('Cle de licence'), { target: { value: 'ANY-LICENSE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Activer' }));

    await waitFor(() => expect(onActivateLicense).toHaveBeenCalledWith('ANY-LICENSE'));
    expect(screen.getByText('Licence activee et synchronisee.')).toBeInTheDocument();
    expect(screen.queryByText('Invalid license')).not.toBeInTheDocument();
  });
});
