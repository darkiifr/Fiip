import { describe, expect, it } from 'vitest';

import './content-helpers.js';

const { buildClipPayload, cleanClone, collectImages, escapeHtml } = globalThis.FiipContentHelpers;

describe('Fiip extension content helpers', () => {
  it('escapes selected text before creating the clip html', () => {
    document.body.innerHTML = '<main><p>Ignored article</p></main>';

    const payload = buildClipPayload({
      document,
      location: new URL('https://example.com/article'),
      selectionText: '<img src=x onerror=alert(1)> & "quote"',
      captureMode: 'selection',
      now: () => new Date('2026-06-27T08:00:00.000Z'),
    });

    expect(payload).toMatchObject({
      title: 'Capture web',
      url: 'https://example.com/article',
      selectionText: '<img src=x onerror=alert(1)> & "quote"',
      capturedAt: '2026-06-27T08:00:00.000Z',
    });
    expect(payload.html).toBe('<blockquote>&lt;img src=x onerror=alert(1)&gt; &amp; &quot;quote&quot;</blockquote>');
  });

  it('captures the readable page by default even when text is selected', () => {
    document.body.innerHTML = '<main><p>Readable article</p></main>';

    const payload = buildClipPayload({
      document,
      location: new URL('https://example.com/article'),
      selectionText: 'Selected fragment',
      now: () => new Date('2026-06-27T08:00:00.000Z'),
    });

    expect(payload.selectionText).toBe('');
    expect(payload.html).toContain('Readable article');
    expect(payload.html).not.toContain('Selected fragment');
  });

  it('removes unsafe nodes and inline event handlers from page capture html', () => {
    const wrapper = document.createElement('article');
    wrapper.innerHTML = `
      <script>alert('x')</script>
      <style>body { color: red; }</style>
      <p onclick="alert('x')" data-keep="yes">Safe</p>
      <iframe src="https://example.com"></iframe>
    `;

    const clone = cleanClone(wrapper);

    expect(clone.querySelector('script')).toBeNull();
    expect(clone.querySelector('style')).toBeNull();
    expect(clone.querySelector('iframe')).toBeNull();
    expect(clone.querySelector('p')?.getAttribute('onclick')).toBeNull();
    expect(clone.querySelector('p')?.getAttribute('data-keep')).toBe('yes');
  });

  it('collects only http images and limits payload size', () => {
    const root = document.createElement('main');
    root.innerHTML = [
      '<img src="https://example.com/1.png">',
      '<img src="http://example.com/2.png">',
      '<img src="data:image/png;base64,abc">',
      ...Array.from({ length: 20 }, (_, index) => `<img src="https://example.com/${index + 3}.png">`),
    ].join('');

    const images = collectImages(root);

    expect(images).toHaveLength(12);
    expect(images[0]).toBe('https://example.com/1.png');
    expect(images[1]).toBe('http://example.com/2.png');
    expect(images).not.toContain('data:image/png;base64,abc');
  });

  it('keeps escapeHtml deterministic for quotes and apostrophes', () => {
    expect(escapeHtml(`Tom's "note" <draft>`)).toBe('Tom&#39;s &quot;note&quot; &lt;draft&gt;');
  });
});
