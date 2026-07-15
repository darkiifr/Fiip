import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { buildDexterNoteContext } from '../services/dexterContext';

import Dexter from './Dexter';

const mockGenerateText = vi.fn();

vi.mock('../services/ai', () => ({
  generateText: (...args) => mockGenerateText(...args),
}));

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
        expect(screen.getByText('Dexter')).toBeInTheDocument();
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

    it('does not expose PDF attachment upload in the free model flow', () => {
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

        expect(screen.queryByTitle(/Joindre un PDF/i)).not.toBeInTheDocument();
    });

    it('does not expose the model indicator', () => {
        render(
            <Dexter
                isOpen={true}
                onClose={vi.fn()}
                settings={{ aiModel: 'openai/gpt-4o-mini' }}
                onCreateNote={vi.fn()}
                onUpdateNote={vi.fn()}
                onDeleteNote={vi.fn()}
            />
        );

        expect(screen.queryByText(/Modèle:/i)).not.toBeInTheDocument();
    });

    it('does not read assistant responses aloud', async () => {
        mockGenerateText.mockResolvedValueOnce('Réponse silencieuse');
        const speak = vi.fn();
        vi.stubGlobal('speechSynthesis', {
            cancel: vi.fn(),
            getVoices: vi.fn(() => []),
            speak,
        });

        render(
            <Dexter
                isOpen={true}
                onClose={vi.fn()}
                settings={{ voiceEnabled: true }}
                onCreateNote={vi.fn()}
                onUpdateNote={vi.fn()}
                onDeleteNote={vi.fn()}
            />
        );

        fireEvent.change(screen.getByPlaceholderText('Posez une question ou demandez une correction...'), {
            target: { value: 'Aide' },
        });
        fireEvent.keyDown(screen.getByPlaceholderText('Posez une question ou demandez une correction...'), {
            key: 'Enter',
        });

        expect(await screen.findByText('Réponse silencieuse')).toBeInTheDocument();
        expect(speak).not.toHaveBeenCalled();
    });

    it('runs a quick note action and applies the generated update', async () => {
        mockGenerateText.mockResolvedValueOnce('{"action":"update","mode":"replace","title":"Note corrigee","content":"Texte corrige"}');
        const handleUpdate = vi.fn();

        render(
            <Dexter
                isOpen={true}
                onClose={vi.fn()}
                settings={{}}
                onCreateNote={vi.fn()}
                onUpdateNote={handleUpdate}
                onDeleteNote={vi.fn()}
                currentNote={{ id: 'note-1', title: 'Brouillon', content: '<p>Texte a corriger</p>' }}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Corriger/i }));

        expect(await screen.findByText('Modification de note')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Appliquer' }));

        expect(handleUpdate).toHaveBeenCalledWith(expect.objectContaining({
            id: 'note-1',
            title: 'Note corrigee',
            content: 'Texte corrige',
        }));
    });

    it('runs an AI chat starter prompt with the active note context', async () => {
        mockGenerateText.mockResolvedValueOnce('Voici une analyse claire.');

        render(
            <Dexter
                isOpen={true}
                onClose={vi.fn()}
                settings={{}}
                onCreateNote={vi.fn()}
                onUpdateNote={vi.fn()}
                onDeleteNote={vi.fn()}
                currentNote={{ id: 'note-1', title: 'Sprint', content: '<p>Objectif flou</p>' }}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Clarifier la note/i }));

        expect(await screen.findByText('Voici une analyse claire.')).toBeInTheDocument();
        expect(mockGenerateText).toHaveBeenCalledWith(expect.objectContaining({
            messages: expect.arrayContaining([
                expect.objectContaining({
                    role: 'user',
                    content: expect.stringContaining('Objectif flou'),
                }),
            ]),
        }));
    });

    it('shows the assistant generation error message', async () => {
        mockGenerateText.mockRejectedValueOnce(new Error('Cette fonctionnalité nécessite un abonnement actif.'));
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

        fireEvent.change(screen.getByPlaceholderText('Posez une question ou demandez une correction...'), {
            target: { value: 'Aide' },
        });
        fireEvent.keyDown(screen.getByPlaceholderText('Posez une question ou demandez une correction...'), {
            key: 'Enter',
        });

        expect(await screen.findByText('Cette fonctionnalité nécessite un abonnement actif.')).toBeInTheDocument();
    });

    it('includes plain note text and OCR attachment text for the AI prompt', () => {
        const context = buildDexterNoteContext({
            title: 'Facture client',
            content: '<h1>Total</h1><p>À vérifier</p>',
            attachments: [
                { name: 'recu.webp', ocrText: 'Montant TTC 42 EUR' },
                { name: 'photo.png', ocrText: '' },
            ],
        });

        expect(context).toContain('Titre: Facture client');
        expect(context).toContain('Total À vérifier');
        expect(context).toContain('- recu.webp: Montant TTC 42 EUR');
    });
});
