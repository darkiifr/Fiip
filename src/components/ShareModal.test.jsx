import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';    
import ShareModal from './ShareModal';

// Mock dependencies
const mockGetCurrentUser = vi.fn();

vi.mock('../services/supabase', () => ({
  authService: {
    getUser: () => mockGetCurrentUser(),
  },
  dataService: {
    setPublicSlug: vi.fn(),
    removePublicSlug: vi.fn(),
    addCollaborator: vi.fn(),
    getCollaborators: vi.fn().mockResolvedValue({ data: [], error: null })
  }
}));

describe('ShareModal Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCurrentUser.mockResolvedValue(null);
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
});
