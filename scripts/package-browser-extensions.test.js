import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import * as packageHelpers from './package-browser-extensions.mjs';
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

  it('generates a packaged Supabase runtime config without hardcoding credentials in source', () => {
    expect(typeof packageHelpers.buildBrowserExtensionConfigSource).toBe('function');
    const source = packageHelpers.buildBrowserExtensionConfigSource({
      supabaseUrl: 'https://fqouvzkovppyqocfxanl.supabase.co',
      supabaseAnonKey: 'public-anon-key',
    });

    expect(source).toContain("supabaseUrl: 'https://fqouvzkovppyqocfxanl.supabase.co'");
    expect(source).toContain("supabaseAnonKey: 'public-anon-key'");
    expect(source).not.toContain('__FIIP_SUPABASE_ANON_KEY__');
  });

  it('refuses to package an extension without valid Supabase public config', () => {
    expect(typeof packageHelpers.buildBrowserExtensionConfigSource).toBe('function');
    expect(() => packageHelpers.buildBrowserExtensionConfigSource({
      supabaseUrl: 'https://fqouvzkovppyqocfxanl.supabase.co',
      supabaseAnonKey: '',
    })).toThrow(/Supabase/);
    expect(() => packageHelpers.buildBrowserExtensionConfigSource({
      supabaseUrl: 'http://localhost:54321',
      supabaseAnonKey: 'anon',
    })).toThrow(/Supabase/);
  });

  it('injects Supabase public configuration in the release packaging job', () => {
    const workflow = readFileSync('.github/workflows/release.yml', 'utf8');

    expect(workflow).toContain('VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}');
    expect(workflow).toContain('VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}');
  });
});
