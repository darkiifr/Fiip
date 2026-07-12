import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { fetchAccountDevices, getSessionUser, registerCurrentDevice } from './services/account';

vi.mock('./services/account', () => ({
  activateLicense: vi.fn(),
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
  });

  it('switches sections without a full reload and loads devices on demand', async () => {
    render(<App />);

    expect(await screen.findAllByText('OCR limite')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Fiip' })).toHaveAttribute('href', 'https://fiip.fr/');

    fireEvent.click(screen.getByRole('link', { name: /Appareils/i }));

    await waitFor(() => expect(fetchAccountDevices).toHaveBeenCalledTimes(1));
    expect(window.location.pathname).toBe('/account/devices');
  });
});
