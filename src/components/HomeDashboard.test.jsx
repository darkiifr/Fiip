import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HomeDashboard from './HomeDashboard';

const mockGenerateText = vi.fn();

vi.mock('../services/ai', () => ({
  generateText: (...args) => mockGenerateText(...args),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key, fallback) => fallback }),
}));

describe('HomeDashboard search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateText.mockResolvedValue('Dexter propose de reprendre votre note la plus récente.');
  });

  it('filters notes locally and opens a selected result', () => {
    const onSelectNote = vi.fn();
    render(
      <HomeDashboard
        featuredNote={{ id: '1', title: 'Planning', content: '<p>Roadmap</p>', updatedAt: Date.now() }}
        recentNotes={[{ id: '2', title: 'Sécurité', content: '<p>Audit Supabase</p>', updatedAt: Date.now() }]}
        onSelectNote={onSelectNote}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Rechercher dans vos notes...'), {
      target: { value: 'sécur' },
    });
    fireEvent.click(screen.getAllByText('Sécurité')[0].closest('button'));

    expect(onSelectNote).toHaveBeenCalledWith('2');
  });

  it('lets the search input use the full available width', () => {
    render(
      <HomeDashboard
        featuredNote={null}
        recentNotes={[]}
        onSelectNote={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Rechercher dans vos notes...');
    expect(input).toHaveClass('min-w-0', 'flex-1');
    expect(input.parentElement).toHaveClass('min-w-0', 'flex-1');
  });

  it('shows a Dexter note when Dexter is enabled', async () => {
    mockGenerateText.mockResolvedValueOnce('Votre note Sécurité mérite une synthèse claire avant publication.');

    render(
      <HomeDashboard
        featuredNote={{ id: '1', title: 'Sécurité', content: '<p>Audit Supabase</p>', updatedAt: Date.now() }}
        recentNotes={[]}
        onSelectNote={vi.fn()}
        widgets={[{ id: 'ai-suggestions', enabled: true }]}
        settings={{ aiEnabled: true }}
      />
    );

    expect(await screen.findByText('Votre note Sécurité mérite une synthèse claire avant publication.')).toBeInTheDocument();
    expect(mockGenerateText).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.any(Array),
    }));
  });

  it('hides the Dexter widget when Dexter is disabled', () => {
    render(
      <HomeDashboard
        featuredNote={{ id: '1', title: 'Sécurité', content: '<p>Audit Supabase</p>', updatedAt: Date.now() }}
        recentNotes={[]}
        onSelectNote={vi.fn()}
        widgets={[{ id: 'ai-suggestions', enabled: true }]}
        settings={{ aiEnabled: false }}
      />
    );

    expect(screen.queryByText('Dexter')).not.toBeInTheDocument();
    expect(mockGenerateText).not.toHaveBeenCalled();
  });
});
