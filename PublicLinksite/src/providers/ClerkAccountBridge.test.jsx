import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';

import { FiipClerkSignIn } from './ClerkAccountBridge';

describe('FiipClerkSignIn', () => {
  it('keeps account pages usable when Clerk is not configured locally', () => {
    render(<FiipClerkSignIn />);

    expect(screen.getByRole('heading', { name: 'Connexion sécurisée' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continuer vers la connexion' })).toHaveAttribute(
      'href',
      'https://portail.fiip.fr/sign-in',
    );
  });
});
