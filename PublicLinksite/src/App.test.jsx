import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('Public Fiip landing', () => {
  it('renders the redesigned public landing page', () => {
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(screen.getByRole('link', { name: 'Fiip' })).toBeInTheDocument();
    expect(screen.getByText('même hors de l’app.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir une note' })).toHaveAttribute('href', '/n/demo');
    expect(screen.getByText('Une note qui respire.')).toBeInTheDocument();
    expect(screen.getByText('Exports utiles')).toBeInTheDocument();
    expect(screen.getByText('Partager une note ne doit pas ressembler à un export brut.')).toBeInTheDocument();
  });
});
