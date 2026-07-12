import { open } from '@tauri-apps/plugin-shell';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authService } from '../services/supabase';

import OnboardingView from './OnboardingView';

vi.mock('../services/supabase', () => ({
  getCaptchaSiteKey: vi.fn(() => ''),
  authService: {
    signInWithOAuth: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    sendPasswordReset: vi.fn(),
  },
}));

vi.mock('../services/keyauth', () => ({
  keyAuthService: {
    startTrial: vi.fn(() => true),
  },
}));

describe('OnboardingView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche une entrée propre sans photo ni section licence', () => {
    render(<OnboardingView onComplete={vi.fn()} onLoginSuccess={vi.fn()} />);

    expect(screen.queryByAltText(/stone sprout/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /licence/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/clé de licence/i)).not.toBeInTheDocument();
  });

  it('ouvre le flux OAuth Google retourné par Supabase', async () => {
    authService.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://auth.example.com/google' },
      error: null,
    });

    render(<OnboardingView onComplete={vi.fn()} onLoginSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole('tab', { name: /connexion/i }));
    fireEvent.click(screen.getByRole('button', { name: /se connecter avec google/i }));

    await waitFor(() => {
      expect(authService.signInWithOAuth).toHaveBeenCalledWith('google');
      expect(open).toHaveBeenCalledWith('https://auth.example.com/google');
    });
  });
});
