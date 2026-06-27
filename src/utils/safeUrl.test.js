import { describe, expect, it } from 'vitest';

import { getSafePublicUrl } from './safeUrl';

describe('getSafePublicUrl', () => {
  it('rejects javascript URLs and remote SVG by default', () => {
    expect(getSafePublicUrl('javascript:alert(1)')).toBe('');
    expect(getSafePublicUrl('https://example.com/icon.svg')).toBe('');
  });

  it('allows http image URLs and data media when explicitly enabled', () => {
    expect(getSafePublicUrl('https://example.com/photo.png')).toBe('https://example.com/photo.png');
    expect(getSafePublicUrl('data:image/png;base64,aaaa', { allowDataMedia: true })).toBe('data:image/png;base64,aaaa');
  });
});
