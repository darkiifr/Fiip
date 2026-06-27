import { describe, expect, it } from 'vitest';

import { normalizeOverextendedLinks } from './RichTextEditor';

describe('RichTextEditor links', () => {
  it('keeps only the URL inside an overextended link', () => {
    const html = '<p><a href="https://example.com/path?x=1">https://example.com/path?x=1 puis le reste du texte</a></p>';

    expect(normalizeOverextendedLinks(html)).toBe('<p><a href="https://example.com/path?x=1">https://example.com/path?x=1</a> puis le reste du texte</p>');
  });

  it('leaves normal links unchanged', () => {
    const html = '<p>Voir <a href="https://example.com">le site</a> maintenant.</p>';

    expect(normalizeOverextendedLinks(html)).toBe(html);
  });
});
