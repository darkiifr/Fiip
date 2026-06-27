import { describe, expect, it } from 'vitest';

import { shouldIncludeBrowserExtensionFile } from './package-browser-extensions.mjs';

describe('browser extension packaging', () => {
  it('keeps runtime files and excludes documentation plus test files', () => {
    expect(shouldIncludeBrowserExtensionFile('BrowserExtension/manifest.json')).toBe(true);
    expect(shouldIncludeBrowserExtensionFile('BrowserExtension/background-helpers.js')).toBe(true);
    expect(shouldIncludeBrowserExtensionFile('BrowserExtension/README.md')).toBe(false);
    expect(shouldIncludeBrowserExtensionFile('BrowserExtension/content-helpers.test.js')).toBe(false);
  });
});
