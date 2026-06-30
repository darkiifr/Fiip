import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(readFileSync(resolve('BrowserExtension/manifest.json'), 'utf8'));
const popupHtml = readFileSync(resolve('BrowserExtension/popup.html'), 'utf8');

describe('Fiip extension manifest', () => {
  it('declares a Chrome and Edge compatible Manifest V3 clipper', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('Fiip Web Clipper');
    expect(manifest.permissions).toEqual(expect.arrayContaining(['activeTab', 'scripting', 'storage']));
    expect(manifest.host_permissions).toEqual(expect.arrayContaining(['https://*/', 'http://*/']));
    expect(manifest.background).toEqual({ service_worker: 'background.js', type: 'module' });
    expect(manifest.action.default_popup).toBe('popup.html');
    expect(manifest.content_scripts[0].js).toEqual(['content-helpers.js', 'content.js']);
  });

  it('ships required store icons for browser chrome and action button', () => {
    expect(manifest.icons).toMatchObject({
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    });
    expect(manifest.action.default_icon).toMatchObject(manifest.icons);
  });

  it('explains the clipper options in the popup', () => {
    expect(popupHtml).toContain('Mode de capture');
    expect(popupHtml).toContain('Page lisible');
    expect(popupHtml).toContain('Sélection');
    expect(popupHtml).toContain('Source et images');
  });
});
