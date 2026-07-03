import { describe, expect, it, vi } from 'vitest';

import { applyTheme, resolveTheme } from './theme';

describe('theme service', () => {
  it('resolves explicit and system themes', () => {
    expect(resolveTheme({ theme: 'light' }, () => ({ matches: true }))).toBe('dark');
    expect(resolveTheme({ theme: 'dark' }, () => ({ matches: false }))).toBe('dark');
    expect(resolveTheme({ theme: 'system' }, () => ({ matches: true }))).toBe('dark');
    expect(resolveTheme({}, () => ({ matches: false }))).toBe('dark');
  });

  it('applies dark class, datasets, color scheme and window effect state', async () => {
    const setWindowEffect = vi.fn().mockResolvedValue(undefined);
    window.__TAURI_INTERNALS__ = {};

    await applyTheme({
      settings: { theme: 'dark', windowEffect: 'mica' },
      osType: 'windows',
      setWindowEffect,
      root: document.documentElement,
      body: document.body,
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.body.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.documentElement.classList.contains('window-effect-active')).toBe(true);
    expect(setWindowEffect).toHaveBeenCalledWith({ effect: 'mica', dark: true });
    delete window.__TAURI_INTERNALS__;
  });
});
