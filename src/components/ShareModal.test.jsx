import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { buildPublicNoteUrl } from '../config/links';

import ShareModal from './ShareModal';

// Mock dependencies
const mockGetCurrentUser = vi.fn();
const mockPublishNote = vi.fn();

vi.mock('../services/supabase', () => ({
  authService: {
    getUser: () => mockGetCurrentUser(),
  },
  dataService: {
    saveNote: vi.fn().mockResolvedValue({ error: null }),
    publishNote: (...args) => mockPublishNote(...args),
    unpublishNote: vi.fn().mockResolvedValue({ error: null }),
    addCollaborator: vi.fn(),
    getCollaborators: vi.fn().mockResolvedValue({ data: [], error: null })
  }
}));

describe('ShareModal Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCurrentUser.mockResolvedValue(null);
        mockPublishNote.mockResolvedValue({ data: { public_slug: 'published-note' }, error: null });
    });

    const mockNote = { 
        id: '123', 
        title: 'Test Note', 
        user_id: 'user-1', 
        public_slug: null 
    };

    it('renders and verifies ownership safely', async () => {
        // Setup a current user that matches the note owner
        mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });

        render(<ShareModal isOpen={true} onClose={vi.fn()} note={mockNote} notes={[mockNote]} />);
        
        // Wait for the "Vérification des droits..." to disappear and options to show
        await waitFor(() => {
            expect(screen.queryByText(/Vérification des droits/i)).not.toBeInTheDocument();
        });

        // The user is the owner, so they should see the public link toggles
        expect(screen.getByText(/Lien Public/i)).toBeInTheDocument();
    });

    it('shows permission error if the user is not the owner', async () => {
        // Setup a current user that does NOT match the note owner
        mockGetCurrentUser.mockResolvedValue({ id: 'user-2', email: 'other@test.com' });

        render(<ShareModal isOpen={true} onClose={vi.fn()} note={mockNote} notes={[mockNote]} />);
        
        await waitFor(() => {
            expect(screen.getByText(/Vous n'êtes pas le propriétaire de cette note/i)).toBeInTheDocument();
        });

        // They should NOT see the public sharing toggles due to ownership
        expect(screen.queryByText(/Lien Public/i)).not.toBeInTheDocument();
    });

    it('shows existing public note links on the production public site', async () => {
        mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });
        const publicNote = { ...mockNote, public_slug: 'already-public' };

        render(<ShareModal isOpen={true} onClose={vi.fn()} note={publicNote} notes={[publicNote]} />);

        await waitFor(() => {
            expect(screen.getByText(buildPublicNoteUrl('already-public'))).toBeInTheDocument();
        });
    });

    it('generates public note links on the production public site when publishing', async () => {
        mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });

        render(<ShareModal isOpen={true} onClose={vi.fn()} note={mockNote} notes={[mockNote]} onUpdateNote={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText(/Lien Public/i)).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: /publier/i }));

        await waitFor(() => {
            expect(screen.getByText(buildPublicNoteUrl('published-note'))).toBeInTheDocument();
        });
    });

    it('blocks protected notes from public publishing', async () => {
        mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });
        const protectedNote = { ...mockNote, is_locked: true, encrypted_content: 'ENC:value' };

        render(<ShareModal isOpen={true} onClose={vi.fn()} note={protectedNote} notes={[protectedNote]} onUpdateNote={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText(/Lien Public/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /publier/i }));

        await waitFor(() => {
            expect(screen.getByText(/Les notes protegees ne peuvent pas etre publiees/i)).toBeInTheDocument();
        });
        expect(mockPublishNote).not.toHaveBeenCalled();
    });
});
