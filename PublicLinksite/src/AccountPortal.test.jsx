import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { fetchAccountDevices, fetchSecurityEvents, getSessionUser, registerCurrentDevice } from './services/account';

let clerkState = { loaded: true, signedIn: true, user: { id: 'user_clerk' }, signOut: vi.fn() };

vi.mock('./providers/ClerkAccountBridge', () => ({
  FiipClerkSignIn: () => <div>Connexion Clerk Fiip</div>,
}));

vi.mock('./providers/ClerkAccountContext', () => ({
  useFiipClerk: () => clerkState,
}));

vi.mock('./services/account', () => ({
  activateLicense: vi.fn(),
  bootstrapClerkIdentity: vi.fn().mockResolvedValue({ userId: 'user-1' }),
  canUsePasskeys: vi.fn(() => true),
  fetchAccountDevices: vi.fn(),
  fetchAccountSummary: vi.fn().mockResolvedValue({
    user: { id: 'user-1', email: 'vincent@fiip.app' },
    license: null,
    device_count: 0,
    device_limit: 1,
  }),
  fetchSecurityEvents: vi.fn(),
  getAuthErrorMessage: vi.fn((error) => error?.message || String(error || '')),
  getSessionUser: vi.fn(),
  registerPasskey: vi.fn(),
  registerCurrentDevice: vi.fn(),
  revokeAllDevices: vi.fn(),
  revokeDevice: vi.fn(),
  selectLicense: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithPasskey: vi.fn(),
  signInWithMagicLink: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
  signOut: vi.fn(),
  verifyMagicCode: vi.fn(),
}));

describe('AccountPortal navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clerkState = { loaded: true, signedIn: true, user: { id: 'user_clerk' }, signOut: vi.fn() };
    window.history.pushState({}, '', '/account');
    getSessionUser.mockResolvedValue({ id: 'user-1', email: 'vincent@fiip.app' });
    registerCurrentDevice.mockResolvedValue({ ok: true });
    fetchAccountDevices.mockResolvedValue({ devices: [], device_count: 0, device_limit: 1 });
    fetchSecurityEvents.mockResolvedValue({ events: [] });
  });

  it('switches sections without a full reload and loads devices on demand', async () => {
    render(<App />);

    expect(await screen.findAllByText('OCR limite')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Fiip' })).toHaveAttribute('href', 'https://fiip.fr/');
    expect(screen.getByRole('link', { name: /Profil et sécurité Clerk/i })).toHaveAttribute(
      'href',
      'https://accounts.fiip.fr/user',
    );

    fireEvent.click(screen.getByRole('link', { name: /Appareils/i }));

    await waitFor(() => expect(fetchAccountDevices).toHaveBeenCalledTimes(1));
    expect(window.location.pathname).toBe('/account/devices');
  });

  it('loads and renders the security history section on demand', async () => {
    fetchSecurityEvents.mockResolvedValueOnce({
      events: [{
        id: 'event-1',
        event_type: 'device_registered',
        metadata: { device_name: 'Chrome Windows', platform: 'web', app_version: '9.0.6' },
        created_at: '2026-07-13T14:30:00.000Z',
      }],
    });

    render(<App />);

    await screen.findAllByText('OCR limite');
    fireEvent.click(screen.getByRole('link', { name: /^Sécurité$/i }));

    await waitFor(() => expect(fetchSecurityEvents).toHaveBeenCalledTimes(1));
    expect(window.location.pathname).toBe('/account/security');
  });
});

describe('AccountPortal Clerk sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/account');
    getSessionUser.mockResolvedValue(null);
    clerkState = { loaded: true, signedIn: false, user: null, signOut: vi.fn() };
  });

  it('delegates every signed-out account flow to Clerk', () => {
    render(<App />);

    expect(screen.getByText('Connexion Clerk Fiip')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Mot de passe')).not.toBeInTheDocument();
  });
});
