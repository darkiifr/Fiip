import { invoke } from '@tauri-apps/api/core';

import { coerceWindowEffect } from '../utils/windowEffects';

export function resolveTheme(settings = {}, matchMedia = window.matchMedia.bind(window)) {
  void settings;
  void matchMedia;
  return 'dark';
}

export async function applyTheme({
  settings = {},
  osType = 'unknown',
  root = document.documentElement,
  body = document.body,
  setWindowEffect = (payload) => invoke('set_window_effect', payload),
} = {}) {
  const resolvedTheme = resolveTheme(settings);
  const supportedWindowEffect = coerceWindowEffect(settings.windowEffect || 'none', osType);
  const isDark = resolvedTheme === 'dark';

  root.classList.toggle('dark', isDark);
  body.classList.toggle('dark', isDark);
  root.dataset.theme = resolvedTheme;
  body.dataset.theme = resolvedTheme;
  root.dataset.windowEffect = supportedWindowEffect;
  body.dataset.windowEffect = supportedWindowEffect;
  root.style.colorScheme = resolvedTheme;
  body.style.backgroundColor = supportedWindowEffect !== 'none' ? 'transparent' : 'var(--bg-content)';
  root.classList.toggle('window-effect-active', supportedWindowEffect !== 'none');

  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__ && osType !== 'unknown') {
    await setWindowEffect({ effect: supportedWindowEffect, dark: isDark });
  }

  return { resolvedTheme, supportedWindowEffect };
}
