import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import OfflineConnectionDialog from './OfflineConnectionDialog';

describe('OfflineConnectionDialog', () => {
  it('lets users wait for network or switch to offline mode', () => {
    const onWaitOnline = vi.fn();
    const onUseOffline = vi.fn();

    render(
      <OfflineConnectionDialog
        onWaitOnline={onWaitOnline}
        onUseOffline={onUseOffline}
      />
    );

    expect(screen.getByText('Connexion indisponible')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /attendre/i }));
    expect(onWaitOnline).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /mode hors ligne/i }));
    expect(onUseOffline).toHaveBeenCalledTimes(1);
  });

  it('shows the waiting state', () => {
    render(
      <OfflineConnectionDialog
        isWaiting
        onWaitOnline={() => {}}
        onUseOffline={() => {}}
      />
    );

    expect(screen.getByText(/en attente du réseau/i)).toBeInTheDocument();
  });
});
