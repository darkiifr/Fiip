import { describe, expect, it } from 'vitest';

import { coerceWindowEffect, getWindowEffectOptions } from './windowEffects';

describe('window effect helpers', () => {
  it('enables mica and acrylic on Windows', () => {
    const options = getWindowEffectOptions('windows');
    expect(options.find((item) => item.id === 'mica')?.supported).toBe(true);
    expect(options.find((item) => item.id === 'acrylic')?.supported).toBe(true);
  });

  it('disables Windows-only effects on Linux', () => {
    expect(coerceWindowEffect('mica', 'linux')).toBe('none');
  });

  it('keeps macOS vibrancy only on macOS', () => {
    expect(coerceWindowEffect('vibrancy', 'macos')).toBe('vibrancy');
    expect(coerceWindowEffect('vibrancy', 'windows')).toBe('none');
  });

  it('does not reset a saved effect before OS detection resolves', () => {
    expect(coerceWindowEffect('mica', 'unknown')).toBe('mica');
  });
});
