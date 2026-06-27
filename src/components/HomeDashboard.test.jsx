import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HomeDashboard from './HomeDashboard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key, fallback) => fallback }),
}));

describe('HomeDashboard search', () => {
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
});
