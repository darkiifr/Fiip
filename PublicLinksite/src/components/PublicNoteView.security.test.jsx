import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PublicNoteView from './PublicNoteView';
import { dataService } from '../services/supabase';

vi.mock('../services/supabase', () => ({
  dataService: {
    getPublicNote: vi.fn(),
  },
}));

vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: () => ({
      from: () => ({
        save: () => Promise.resolve(),
      }),
    }),
  }),
}));

describe('PublicNoteView security', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/n/shared-note');
    vi.mocked(dataService.getPublicNote).mockReset();
  });

  it('sanitizes markdown and rejects unsafe attachment URLs', async () => {
    vi.mocked(dataService.getPublicNote).mockResolvedValue({
      error: null,
      data: {
        title: 'Note publique',
        content: '[lien dangereux](javascript:alert(1))<img src=x onerror=alert(1)>',
        updated_at: '2026-06-20T10:00:00Z',
        attachments: [
          { type: 'image', name: 'Image piégée', url: 'javascript:alert(1)' },
          { type: 'file', name: 'Fichier piégé', url: 'data:text/html,<script>alert(1)</script>' },
          { type: 'file', name: 'Document sûr', url: 'https://example.com/doc.pdf' },
        ],
      },
    });

    const { container } = render(<PublicNoteView />);

    await screen.findByRole('heading', { name: 'Note publique' });
    await waitFor(() => expect(container.querySelector('[onerror]')).not.toBeInTheDocument());
    expect(container.querySelector('a[href^="javascript:"]')).not.toBeInTheDocument();
    expect(container.querySelector('img[src^="javascript:"]')).not.toBeInTheDocument();
    expect(screen.queryByText('Fichier piégé')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Document sûr/i })).toHaveAttribute('href', 'https://example.com/doc.pdf');
  });
});
