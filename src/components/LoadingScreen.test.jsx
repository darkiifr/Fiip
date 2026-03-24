import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen component', () => {
    it('renders the application name', () => {
        render(<LoadingScreen status="Chargement en cours..." />);
        expect(screen.getByText('Fiip')).toBeInTheDocument();
    });

    it('displays the status message passed in props', () => {
        const testStatus = "Connexion au serveur...";
        render(<LoadingScreen status={testStatus} />);
        expect(screen.getByText(testStatus)).toBeInTheDocument();
    });
});
