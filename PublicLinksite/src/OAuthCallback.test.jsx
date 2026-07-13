import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';

import OAuthCallback from './components/OAuthCallback';

describe('OAuthCallback', () => {
  it('attempts the desktop handoff once and exposes a manual fallback', () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    render(<OAuthCallback location={{ search: '?code=abc', hash: '#state=xyz' }} navigate={navigate} delay={500} />);

    vi.advanceTimersByTime(500);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('fiip://login-callback?code=abc#state=xyz');

    vi.advanceTimersByTime(5000);
    expect(navigate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /ouvrir fiip/i }));
    expect(navigate).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('cancels the automatic handoff when fallback is clicked before the delay', () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    render(<OAuthCallback location={{ search: '?code=abc', hash: '' }} navigate={navigate} delay={500} />);

    fireEvent.click(screen.getByRole('button', { name: /ouvrir fiip/i }));
    expect(navigate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(navigate).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('shows the OAuth error and does not automatically redirect', () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    render(<OAuthCallback location={{ search: '?error=access_denied&error_description=Connexion+annul%C3%A9e', hash: '' }} navigate={navigate} delay={500} />);

    vi.advanceTimersByTime(5000);
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Connexion annulée');
    expect(screen.getByRole('button', { name: /ouvrir fiip/i })).toBeInTheDocument();
    vi.useRealTimers();
  });
});
