import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createAltStoreSource, normalizeTag } from './generate-altstore-source.mjs';

describe('AltStore source generator', () => {
  it.each([
    ['v9.2.0', '9.2.0'],
    ['v.9.2.0', '9.2.0'],
    ['9.2.0-beta.1', '9.2.0-beta.1'],
  ])('normalizes release tag %s', (tag, expected) => {
    expect(normalizeTag(tag)).toBe(expected);
  });

  it('uses the exact native bundle version and stable release assets', () => {
    const source = createAltStoreSource({
      tag: 'v9.2.0',
      version: '9.2.0',
      buildVersion: '421',
      date: '2026-07-22T10:00:00Z',
      ipaSize: 123456,
    });

    const app = source.apps[0];
    const release = app.versions[0];
    expect(app.bundleIdentifier).toBe('com.fiipmobile');
    expect(release.version).toBe('9.2.0');
    expect(release.buildVersion).toBe('421');
    expect(release.marketingVersion).toBe('9.2.0');
    expect(release.minOSVersion).toBe('16.4');
    expect(release.downloadURL).toBe('https://github.com/darkiifr/Fiip/releases/download/v9.2.0/FiipMobile-Unsigned.ipa');
    expect(app.iconURL).toContain('/v9.2.0/src-tauri/icons/icon.png');
  });

  it('generates metadata from the packaged app in the release workflow', () => {
    const workflow = readFileSync('.github/workflows/release.yml', 'utf8');

    expect(workflow).toContain("Print :CFBundleShortVersionString");
    expect(workflow).toContain("Print :CFBundleVersion");
    expect(workflow).toContain('node scripts/generate-altstore-source.mjs');
    expect(workflow).not.toContain('raw.githubusercontent.com/darkiifr/Fiip/main/src-tauri/icons/icon.png');
  });

  it('rejects metadata that cannot match an iOS bundle', () => {
    expect(() => createAltStoreSource({
      tag: 'v9.2.0',
      version: 'v9.2.0',
      buildVersion: 'build-1',
      date: '2026-07-22T10:00:00Z',
      ipaSize: 1,
    })).toThrow('Invalid CFBundleShortVersionString');
  });

  it('can describe a legacy IPA without changing its native identity', () => {
    const source = createAltStoreSource({
      tag: 'v.9.1.0',
      version: '1.0',
      buildVersion: '1',
      date: '2026-07-16T16:30:08Z',
      ipaSize: 10600371,
      bundleIdentifier: 'vinsstudio.FiipMobile',
      minOSVersion: '15.1',
    });

    expect(source.apps[0].bundleIdentifier).toBe('vinsstudio.FiipMobile');
    expect(source.apps[0].versions[0]).toMatchObject({
      version: '1.0',
      buildVersion: '1',
      marketingVersion: '9.1.0',
      minOSVersion: '15.1',
    });
  });
});
