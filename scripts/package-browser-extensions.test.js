import { describe, expect, it } from 'vitest';

import {
  normalizeBrowserExtensionVersion,
  shouldIncludeBrowserExtensionFile,
} from './package-browser-extensions.mjs';

describe('browser extension packaging', () => {
  it('keeps runtime files and excludes documentation plus test files', () => {
    expect(shouldIncludeBrowserExtensionFile('BrowserExtension/manifest.json')).toBe(true);
    expect(shouldIncludeBrowserExtensionFile('BrowserExtension/background-helpers.js')).toBe(true);
    expect(shouldIncludeBrowserExtensionFile('BrowserExtension/README.md')).toBe(false);
    expect(shouldIncludeBrowserExtensionFile('BrowserExtension/content-helpers.test.js')).toBe(false);
  });

  it('normalizes release tags into Chrome Web Store compatible versions', () => {
    expect(normalizeBrowserExtensionVersion('9.0.6')).toBe('9.0.6');
    expect(normalizeBrowserExtensionVersion('v9.0.6')).toBe('9.0.6');
    expect(normalizeBrowserExtensionVersion('v.9.0.6')).toBe('9.0.6');
    expect(normalizeBrowserExtensionVersion('1.2.3.4')).toBe('1.2.3.4');
  });

  it('rejects versions that Chrome Web Store cannot accept', () => {
    expect(() => normalizeBrowserExtensionVersion('9.0.6-beta')).toThrow(/numeric dot-separated/);
    expect(() => normalizeBrowserExtensionVersion('')).toThrow(/numeric dot-separated/);
    expect(() => normalizeBrowserExtensionVersion('1.2.3.4.5')).toThrow(/numeric dot-separated/);
  });
});
