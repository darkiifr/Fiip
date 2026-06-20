import { describe, expect, it } from 'vitest';

import { resolvePlatformInfo } from './platform';

describe('desktop platform resolution', () => {
  it.each([
    ['windows', 'Windows', 'Ctrl', false, true, false],
    ['linux', 'Linux', 'Ctrl', false, false, true],
    ['macos', 'macOS', 'Cmd', true, false, false],
    ['darwin', 'macOS', 'Cmd', true, false, false],
  ])('resolves %s desktop behavior', (platform, displayName, modifierKey, isMacOS, isWindows, isLinux) => {
    expect(resolvePlatformInfo(platform, 'fallback-os')).toEqual({
      displayName,
      modifierKey,
      isMacOS,
      isWindows,
      isLinux,
    });
  });

  it('falls back to the OS type for unknown desktop platforms', () => {
    expect(resolvePlatformInfo('freebsd', 'unix')).toEqual({
      displayName: 'unix',
      modifierKey: 'Ctrl',
      isMacOS: false,
      isWindows: false,
      isLinux: false,
    });
  });
});
