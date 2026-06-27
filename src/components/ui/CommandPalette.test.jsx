import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CommandPalette } from './CommandPalette';

describe('CommandPalette', () => {
  it('keeps typed search text visible and filters commands', () => {
    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        items={[
          { id: 'new', label: 'Nouvelle note', description: 'Creer', onSelect: vi.fn() },
          { id: 'share', label: 'Partager la note', description: 'Lien public', onSelect: vi.fn() },
        ]}
      />
    );

    const input = screen.getByLabelText('Recherche');
    fireEvent.change(input, { target: { value: 'partager' } });

    expect(input).toHaveValue('partager');
    expect(screen.getByText('Partager la note')).toBeInTheDocument();
    expect(screen.queryByText('Nouvelle note')).not.toBeInTheDocument();
  });
});
