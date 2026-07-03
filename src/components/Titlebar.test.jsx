import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UIProvider } from '../providers/UIProvider';
import Titlebar from './Titlebar';

const windowControls = vi.hoisted(() => ({
  close: vi.fn().mockResolvedValue(undefined),
  minimize: vi.fn().mockResolvedValue(undefined),
  toggleMaximize: vi.fn().mockResolvedValue(undefined),
  isFullscreen: vi.fn().mockResolvedValue(false),
  setFullscreen: vi.fn().mockResolvedValue(undefined),
  onResized: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => windowControls,
}));

vi.mock('@tauri-apps/plugin-os', () => ({
  type: () => 'windows',
}));

function renderTitlebar(style = 'windows') {
  return render(
    <UIProvider>
      <Titlebar style={style} />
    </UIProvider>,
  );
}

describe('Titlebar', () => {
  beforeEach(() => {
    window.__TAURI_INTERNALS__ = {};
    Object.values(windowControls).forEach((control) => control.mockClear());
    windowControls.isFullscreen.mockResolvedValue(false);
    windowControls.onResized.mockResolvedValue(() => {});
  });

  afterEach(() => {
    delete window.__TAURI_INTERNALS__;
  });

  it('wires the Windows titlebar buttons to Tauri window actions', async () => {
    renderTitlebar('windows');

    fireEvent.click(screen.getByRole('button', { name: 'settings.minimize' }));
    fireEvent.click(screen.getByRole('button', { name: 'settings.maximize' }));
    fireEvent.click(screen.getByRole('button', { name: 'settings.close' }));

    await waitFor(() => {
      expect(windowControls.minimize).toHaveBeenCalledTimes(1);
      expect(windowControls.toggleMaximize).toHaveBeenCalledTimes(1);
      expect(windowControls.close).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the macOS traffic light buttons outside drag regions', () => {
    renderTitlebar('macos');

    for (const name of ['settings.close', 'settings.minimize', 'settings.maximize']) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveClass('titlebar-no-drag');
      expect(button.closest('[data-tauri-drag-region]')).toBeNull();
    }
  });

  it('uses window maximize instead of fullscreen for the macOS green button', async () => {
    renderTitlebar('macos');

    fireEvent.click(screen.getByRole('button', { name: 'settings.maximize' }));

    await waitFor(() => {
      expect(windowControls.toggleMaximize).toHaveBeenCalledTimes(1);
      expect(windowControls.setFullscreen).not.toHaveBeenCalled();
    });
  });
});
