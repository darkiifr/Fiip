import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AuthModal from './AuthModal';

// Mock dependencies
const mockGetCurrentUser = vi.fn();
const mockOnAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

vi.mock('../services/supabase', () => ({
  authService: {
    getUser: () => mockGetCurrentUser(),
  },
  supabase: {
    auth: {
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
      signInWithPassword: vi.fn(),
      signUp: vi.fn()
    }
  }
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
      t: (key, fallback) => fallback || key,
    }),
}));

describe('AuthModal Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCurrentUser.mockResolvedValue(null);
    });

    it('renders the login screen automatically when user is not logged in', async () => {
        render(<AuthModal isOpen={true} onClose={vi.fn()} />);

        await waitFor(() => {
            expect(screen.queryByText(/Validation de session\.\.\./i)).not.toBeInTheDocument();
        });

        // "Connexion" heading should be visible when not logged in
        expect(screen.getByText('Connexion')).toBeInTheDocument();
    });

    it('bypasses loading and shows profile when session is verified', async () => {
        mockGetCurrentUser.mockResolvedValue({ 
            id: '123', 
            email: 'user@example.com', 
            user_metadata: { username: 'SuperUser' } 
        });

        render(<AuthModal isOpen={true} onClose={vi.fn()} />);

        // Wait to finish checking the session
        await waitFor(() => {
            expect(screen.queryByText(/Validation de session\.\.\./i)).not.toBeInTheDocument();
        });

        // The username should be in document proving they're logged in
        expect(screen.getByText('SuperUser')).toBeInTheDocument();
    });
});
