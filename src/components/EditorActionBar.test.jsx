import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import EditorActionBar from './EditorActionBar';

vi.mock('../services/soundManager', () => ({
  soundManager: {
    play: vi.fn(() => Promise.resolve()),
  },
}));

const baseProps = {
  note: { id: 'note-1', title: 'Note', content: '<p>Texte</p>', tags: [] },
  hasContent: true,
  onOpenDexter: vi.fn(),
  onOpenLicense: vi.fn(),
  onAttachFile: vi.fn(),
  onToggleHeading: vi.fn(),
  onUpdateTags: vi.fn(),
  tagSuggestions: [],
  editorRef: { current: { getEditor: () => ({ chain: () => ({ focus: () => ({ toggleHeading: () => ({ run: vi.fn() }) }) }) }) } },
};

describe('EditorActionBar', () => {
  it('does not render the removed improve button or quick bar indicator', () => {
    render(<EditorActionBar {...baseProps} />);

    expect(screen.queryByText(/ameliorer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/barre rapide/i)).not.toBeInTheDocument();
  });

  it('keeps the add tag action inside the tag picker', () => {
    render(<EditorActionBar {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /tags/i }));

    const addButton = screen.getByRole('button', { name: /ajouter/i });
    expect(addButton).toBeInTheDocument();
    expect(addButton).toHaveClass('w-full');
  }, 10000);
});
