import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { fetchAccountDevices, fetchSecurityEvents, getSessionUser, registerCurrentDevice, signInWithGoogle } from './services/account';

vi.mock('./services/account', () => ({
  activateLicense: vi.fn(),
  canUsePasskeys: vi.fn(() => true),
  fetchAccountDevices: vi.fn(),
  fetchAccountSummary: vi.fn().mockResolvedValue({
    user: { id: 'user-1', email: 'vincent@fiip.app' },
    license: null,
    device_count: 0,
    device_limit: 1,
  }),
  fetchSecurityEvents: vi.fn(),
  getCaptchaSiteKey: vi.fn(() => ''),
  getAuthErrorMessage: vi.fn((error) => error?.message || String(error || '')),
  getSessionUser: vi.fn(),
  registerPasskey: vi.fn(),
  registerCurrentDevice: vi.fn(),
  revokeAllDevices: vi.fn(),
  revokeDevice: vi.fn(),
  assertCaptchaToken: vi.fn(),
  selectLicense: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithPasskey: vi.fn(),
  signInWithMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  verifyMagicCode: vi.fn(),
}));

describe('AccountPortal navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    fireEvent.click(screen.getByRole('link', { name: /Sécurité/i }));

    await waitFor(() => expect(fetchSecurityEvents).toHaveBeenCalledTimes(1));
    expect(window.location.pathname).toBe('/account/security');
  });
});

describe('AccountPortal Google sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/account');
    getSessionUser.mockResolvedValue(null);
  });

  it('shows loading while Google OAuth starts and reports an OAuth error', async () => {
    let rejectOAuth;
    signInWithGoogle.mockReturnValue(new Promise((resolve, reject) => { rejectOAuth = reject; }));
    render(<App />);

    const button = await screen.findByRole('button', { name: /continuer avec google/i });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/connexion à google/i);

    rejectOAuth(new Error('Google indisponible'));
    expect(await screen.findByText('Google indisponible')).toHaveClass('account-error');
    expect(button).not.toBeDisabled();
  });

  it('keeps auth actions disabled until their required fields are present', async () => {
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Recevoir un magic link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mot de passe oublié' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Se connecter avec une passkey' })).toBeEnabled();
    expect(screen.getByText(/Windows Hello, Touch ID, Face ID/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('email@exemple.com'), { target: { value: 'vincent@fiip.fr' } });

    expect(screen.getByRole('button', { name: 'Recevoir un magic link' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mot de passe oublié' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Mot de passe'), { target: { value: 'secret-password' } });

    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeEnabled();
  });
});
