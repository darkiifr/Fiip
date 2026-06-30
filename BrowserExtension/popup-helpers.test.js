import { describe, expect, it, vi } from 'vitest';

import { captureActiveTab } from './popup-helpers.js';

describe('Fiip extension popup helpers', () => {
  it('keeps the popup responsive when the content script is unavailable', async () => {
    const status = { textContent: '' };
    const result = await captureActiveTab({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42 }]),
        sendMessage: vi.fn().mockRejectedValue(new Error('Could not establish connection. Receiving end does not exist.')),
      },
      runtime: {
        sendMessage: vi.fn(),
      },
      status,
    });

    expect(result.error).toMatch(/Could not establish connection/);
    expect(status.textContent).toMatch(/Could not establish connection/);
  });

  it('injects the content script and retries once when the tab has no receiver yet', async () => {
    const status = { textContent: '' };
    const sendMessage = vi.fn()
      .mockRejectedValueOnce(new Error('Could not establish connection. Receiving end does not exist.'))
      .mockResolvedValueOnce({ title: 'Clip', html: '<p>Clip</p>' });
    const executeScript = vi.fn().mockResolvedValue([]);
    const result = await captureActiveTab({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42, url: 'https://example.com/read' }]),
        sendMessage,
      },
      runtime: {
        sendMessage: vi.fn().mockResolvedValue({ mode: 'deep-link' }),
      },
      scripting: { executeScript },
      status,
    });

    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 42 },
      files: ['content-helpers.js', 'content.js'],
    });
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ mode: 'deep-link' });
  });

  it('explains unsupported browser pages instead of trying to inject into them', async () => {
    const status = { textContent: '' };
    const sendMessage = vi.fn();
    const executeScript = vi.fn();
    const result = await captureActiveTab({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42, url: 'chrome://settings' }]),
        sendMessage,
      },
      runtime: {
        sendMessage: vi.fn(),
      },
      scripting: { executeScript },
      status,
    });

    expect(result.error).toBe('UNSUPPORTED_PAGE');
    expect(status.textContent).toMatch(/Cette page ne peut pas être capturée/);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('sends the selected capture mode to the content script', async () => {
    const status = { textContent: '' };
    const modeInput = { value: 'selection' };
    const sendMessage = vi.fn().mockResolvedValue({ title: 'Clip', html: '<p>Clip</p>' });
    await captureActiveTab({
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42 }]),
        sendMessage,
      },
      runtime: {
        sendMessage: vi.fn().mockResolvedValue({ mode: 'deep-link' }),
      },
      status,
      captureModeInput: modeInput,
    });

    expect(sendMessage).toHaveBeenCalledWith(42, {
      type: 'FIIP_COLLECT_CLIP',
      captureMode: 'selection',
    });
  });
});
