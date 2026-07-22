import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useEffect, useMemo, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ClerkAccountBridge, FiipClerkSignIn } from './ClerkAccountBridge';
import { getClerkAccessToken } from '../services/clerkSession';

const getToken = vi.fn(() => Promise.resolve('clerk-token'));

vi.mock('@clerk/react', () => ({
  SignIn: () => <div>Clerk Sign In</div>,
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken, signOut: vi.fn() }),
  useUser: () => ({ user: { id: 'user_123' } }),
}));

describe('FiipClerkSignIn', () => {
  it('renders the configured Clerk entry or the local fallback', () => {
    render(<FiipClerkSignIn />);

    const fallback = screen.queryByRole('heading', { name: 'Connexion sécurisée' });
    if (fallback) {
      expect(screen.getByRole('link', { name: 'Continuer vers la connexion' })).toHaveAttribute(
        'href',
        'https://portail.fiip.fr/sign-in',
      );
    } else {
      expect(screen.getByText('Clerk Sign In')).toBeInTheDocument();
    }
  });

  it('exposes the Clerk token before child effects invoke Supabase', async () => {
    function TokenProbe() {
      const tokenPromise = useMemo(() => getClerkAccessToken(), []);
      const [token, setToken] = useState('pending');
      useEffect(() => { tokenPromise.then((value) => setToken(value || 'missing')); }, [tokenPromise]);
      return <span>{token}</span>;
    }

    render(<ClerkAccountBridge><TokenProbe /></ClerkAccountBridge>);

    expect(await screen.findByText('clerk-token')).toBeInTheDocument();
  });
});
