import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import Dexter from './Dexter';

vi.mock('../services/dexterMemory', () => ({
  dexterMemory: {
    addMessage: vi.fn(),
    getRecentMessages: vi.fn().mockResolvedValue([]),
    updateContext: vi.fn(),
    getContext: vi.fn().mockResolvedValue({ current_note_id: null })
  }
}));

describe('Dexter Assistant', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders and displays chat when isOpen is true', () => {
        render(
            <Dexter 
                isOpen={true} 
                onClose={vi.fn()} 
                settings={{}} 
                onCreateNote={vi.fn()}
                onUpdateNote={vi.fn()}
                onDeleteNote={vi.fn()}
            />
        );
        
        expect(screen.getByPlaceholderText('Posez une question ou demandez une correction...')).toBeInTheDocument();
        expect(screen.getByText('Assistant Dexter IA')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const handleClose = vi.fn();
        render(
            <Dexter 
                isOpen={true} 
                onClose={handleClose} 
                settings={{}} 
                onCreateNote={vi.fn()}
                onUpdateNote={vi.fn()}
                onDeleteNote={vi.fn()}
            />
        );
        
        fireEvent.click(screen.getByRole('button', { name: 'Fermer Dexter' }));
        expect(handleClose).toHaveBeenCalled();
    });
});
