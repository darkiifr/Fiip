import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TurnstileCaptcha from './TurnstileCaptcha';

describe('TurnstileCaptcha', () => {
  afterEach(() => {
    delete window.turnstile;
    document.getElementById('fiip-turnstile-script')?.remove();
  });

  it('reports distinct widget expiration and error states', async () => {
    let options;
    window.turnstile = { render: vi.fn((_node, value) => { options = value; return 'widget'; }), remove: vi.fn() };
    const onVerify = vi.fn();
    render(<TurnstileCaptcha siteKey="site-key" onVerify={onVerify} />);
    await waitFor(() => expect(window.turnstile.render).toHaveBeenCalled());
    options.callback('fresh-token');
    options['expired-callback']();
    expect(onVerify).toHaveBeenNthCalledWith(1, 'fresh-token', null);
    expect(onVerify).toHaveBeenNthCalledWith(2, '', 'expired');
    options['error-callback']();
    expect(onVerify).toHaveBeenNthCalledWith(3, '', 'error');
  });

  it('shows a distinct script loading error', () => {
    const onVerify = vi.fn();
    render(<TurnstileCaptcha siteKey="site-key" onVerify={onVerify} />);
    fireEvent.error(document.getElementById('fiip-turnstile-script'));
    expect(onVerify).toHaveBeenCalledWith('', 'load');
    expect(screen.getByText(/chargement.*anti-bot/i)).toBeInTheDocument();
  });

  it('handles failure of an existing script that is still loading', () => {
    const script = document.createElement('script');
    script.id = 'fiip-turnstile-script';
    document.head.appendChild(script);
    const onVerify = vi.fn();
    render(<TurnstileCaptcha siteKey="site-key" onVerify={onVerify} />);
    fireEvent.error(script);
    expect(onVerify).toHaveBeenCalledWith('', 'load');
  });
});
