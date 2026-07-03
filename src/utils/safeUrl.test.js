import { describe, expect, it } from 'vitest';

import { getSafeImageUrl, getSafePublicUrl, sanitizeDomText } from './safeUrl';

describe('getSafePublicUrl', () => {
  it('rejects javascript URLs and remote SVG by default', () => {
    expect(getSafePublicUrl('javascript:alert(1)')).toBe('');
    expect(getSafePublicUrl('https://example.com/icon.svg')).toBe('');
  });

  it('allows http image URLs and data media when explicitly enabled', () => {
    expect(getSafePublicUrl('https://example.com/photo.png')).toBe('https://example.com/photo.png');
    expect(getSafePublicUrl('data:image/png;base64,aaaa', { allowDataMedia: true })).toBe('data:image/png;base64,aaaa');
  });

  it('keeps DOM image sources on network image URLs only', () => {
    expect(getSafeImageUrl('javascript:alert(1)')).toBe('');
    expect(getSafeImageUrl('blob:https://example.com/id')).toBe('');
    expect(getSafeImageUrl('/avatar.png')).toBe('http://localhost:3000/avatar.png');
    expect(getSafeImageUrl('https://example.com/avatar.svg')).toBe('');
  });

  it('normalizes untrusted profile text before it reaches DOM attributes', () => {
    expect(sanitizeDomText('<img src=x onerror=alert(1)> Toyger')).toBe('img src=x onerror=alert(1) Toyger');
    expect(sanitizeDomText('', 'Compte Fiip')).toBe('Compte Fiip');
  });
});
