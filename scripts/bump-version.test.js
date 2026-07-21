import { describe, expect, it } from 'vitest';

import { bumpVersion } from './bump-version.mjs';

describe('bumpVersion', () => {
  it.each([
    ['patch', '9.0.4', '9.0.5'],
    ['minor', '9.0.4', '9.1.0'],
    ['major', '9.0.4', '10.0.0'],
    ['prepatch', '9.0.4', '9.0.5-rc.0'],
    ['preminor', '9.0.4', '9.1.0-rc.0'],
    ['premajor', '9.0.4', '10.0.0-rc.0'],
    ['prerelease', '9.1.0-rc.0', '9.1.0-rc.1'],
  ])('applies the %s bump', (type, current, expected) => {
    expect(bumpVersion(current, type)).toBe(expected);
  });

  it('rejects malformed versions and unknown bump types', () => {
    expect(() => bumpVersion('v9.0.4', 'patch')).toThrow(/Version invalide/);
    expect(() => bumpVersion('9.0.4', 'preview')).toThrow(/Type de version invalide/);
  });
});
