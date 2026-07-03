import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LicenseModal from './LicenseModal';

vi.mock('@tauri-apps/plugin-os', () => ({
  type: vi.fn().mockResolvedValue('windows'),
}));

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn(),
  exit: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn(),
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');
  return {
    AnimatePresence: ({ children }) => <>{children}</>,
    motion: {
      div: ({ children, ...props }) => <div {...props}>{children}</div>,
      button: ({ children, ...props }) => <button {...props}>{children}</button>,
    },
    useReducedMotion: () => true,
  };
});

const keyAuthMock = vi.hoisted(() => ({
  isAuthenticated: true,
  isTrialActive: false,
  userData: { username: 'Vincent', expiry: '2099-01-01' },
  currentLevel: 2,
  trialExpiry: null,
  getCurrentSubscriptionName: vi.fn(() => 'Premium'),
  hasAIAccess: vi.fn(() => true),
  hasProAccess: vi.fn(() => true),
  canStartTrial: vi.fn(() => false),
  startTrial: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../services/keyauth', () => ({
  keyAuthService: keyAuthMock,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key, fallback) => fallback,
  }),
}));

describe('LicenseModal', () => {
  beforeEach(() => {
    keyAuthMock.isAuthenticated = true;
    keyAuthMock.isTrialActive = false;
    keyAuthMock.userData = { username: 'Vincent', expiry: '2099-01-01' };
    keyAuthMock.currentLevel = 2;
    vi.clearAllMocks();
  });

  it('renders readable controls and closes from the visible close button', () => {
    const onClose = vi.fn();

    render(<LicenseModal isOpen onClose={onClose} onOpenAccount={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens account management without forcing onboarding', async () => {
    const onOpenAccount = vi.fn();

    render(<LicenseModal isOpen onClose={vi.fn()} onOpenAccount={onOpenAccount} />);
    fireEvent.click(await screen.findByRole('button', { name: /Gérer le compte/i }));

    expect(onOpenAccount).toHaveBeenCalledTimes(1);
  });
});
