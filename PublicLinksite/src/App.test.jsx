import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('Public Fiip landing', () => {
  it('renders the redesigned public landing page', () => {
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(screen.getAllByRole('link', { name: 'Fiip' })).toHaveLength(2);
    expect(screen.getByText('Notes, licences et compte')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir les licences' })).toHaveAttribute('href', '/pricing');
    expect(screen.getByRole('link', { name: 'Partage public' })).toHaveAttribute('href', '/share');
    expect(screen.getAllByRole('link', { name: 'Mon compte' })[0]).toHaveAttribute('href', 'https://portail.fiip.fr/');
    expect(screen.getByText('Une note qui respire.')).toBeInTheDocument();
    expect(screen.queryByText('Copie')).not.toBeInTheDocument();
    expect(screen.queryByText('Markdown')).not.toBeInTheDocument();
    expect(screen.queryByText('PDF')).not.toBeInTheDocument();
    expect(screen.queryByText(/KeyAuth|Supabase|\/n\/:slug/i)).not.toBeInTheDocument();
    expect(screen.getByText('Licences Fiip')).toBeInTheDocument();
    expect(screen.getByText('Notes publiques')).toBeInTheDocument();
    expect(screen.queryByText('Exports utiles')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CGU' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Confidentialite' })).toHaveAttribute('href', '/privacy');
    expect(screen.getAllByRole('link', { name: 'Support Discord' })[0]).toHaveAttribute('href', 'https://discord.gg/nghHqs2pvN');
  });

  it('moves public sharing details to the share page', () => {
    window.history.pushState({}, '', '/share');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Partager une note sans transformer Fiip en export brut.' })).toBeInTheDocument();
    expect(screen.getByText('Exports utiles')).toBeInTheDocument();
    expect(screen.getByText('Écrire')).toBeInTheDocument();
    expect(screen.queryByText(/KeyAuth|Supabase|\/n\/:slug/i)).not.toBeInTheDocument();
  });

  it('renders pricing tiers with the expected public subscription limits', () => {
    window.history.pushState({}, '', '/pricing');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Choisissez la licence qui correspond à votre façon de noter.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Basic' })).toBeInTheDocument();
    expect(screen.getByText('5 scans OCR par mois')).toBeInTheDocument();
    expect(screen.getByText('Clé de licence automatique')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByText('Extension navigateur')).toBeInTheDocument();
    expect(screen.queryByText(/KeyAuth|Supabase|\/n\/:slug/i)).not.toBeInTheDocument();
  });

  it('renders legal pages', () => {
    window.history.pushState({}, '', '/terms');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Conditions generales d\'utilisation' })).toBeInTheDocument();
    expect(screen.getByText('Version du', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(/Information non juridique/i)).not.toBeInTheDocument();
  });

  it('renders the Supabase OAuth consent route on the account application', () => {
    window.history.pushState({}, '', '/oauth/consent');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Continuer avec votre compte Fiip' })).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/portail\.fiip\.fr/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ouvrir mon compte' })).toHaveAttribute('href', '/account');
  });
});
