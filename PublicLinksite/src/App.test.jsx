import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('Public Fiip landing', () => {
  it('renders the redesigned public landing page', () => {
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(screen.getByRole('link', { name: 'Fiip' })).toBeInTheDocument();
    expect(screen.getByText('Vos idées gardent leur forme, même hors de l’app.')).toBeInTheDocument();
    expect(screen.getByText('Exports utiles')).toBeInTheDocument();
  });
});
