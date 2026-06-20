import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FIIP_PUBLIC_SITE_URL } from '../config/links';
import { dataService } from '../services/supabase';

import PublicNoteView from './PublicNoteView';

vi.mock('../services/supabase', () => ({
  dataService: {
    getPublicNote: vi.fn(),
  },
}));

describe('PublicNoteView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/n/shared-note');
    dataService.getPublicNote.mockResolvedValue({
      data: {
        title: 'Shared note',
        content: '# Public content',
        public_slug: 'shared-note',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    });
  });

  it('links the Fiip footer back to the production public site', async () => {
    render(<PublicNoteView />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /shared note/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Fiip' })).toHaveAttribute('href', FIIP_PUBLIC_SITE_URL);
  });
});
