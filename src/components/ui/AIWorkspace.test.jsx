import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AIFloatingAssistant } from './AIWorkspace';

describe('AIFloatingAssistant', () => {
  it('moves above the editor toolbar and stays inside narrow viewports', () => {
    render(
      <AIFloatingAssistant
        avoidBottomToolbar
        onOpen={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const launcher = screen.getByRole('button', { name: /Demander a Dexter/i });
    const floatingContainer = launcher.closest('form')?.parentElement;

    expect(floatingContainer).toHaveClass('bottom-24');
    expect(floatingContainer).toHaveClass('max-w-[calc(100vw-2rem)]');
  });
});
