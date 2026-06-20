import { describe, expect, it } from 'vitest';

import { getNoteStats, pickFeaturedNote } from './notePresentation';

describe('note presentation helpers', () => {
  it('does not show reading time for empty notes', () => {
    expect(getNoteStats({ content: '<p><br></p>' })).toMatchObject({
      wordCount: 0,
      readTime: null,
      readTimeLabel: '',
      hasReadableText: false,
    });
  });

  it('calculates reading time only from readable text', () => {
    const content = `<h1>Titre</h1><p>${Array.from({ length: 230 }, (_, i) => `mot${i}`).join(' ')}</p>`;

    expect(getNoteStats({ content })).toMatchObject({
      wordCount: 231,
      readTime: 2,
      hasReadableText: true,
    });
  });

  it('promotes useful notes over empty recent notes', () => {
    const notes = [
      { id: 'empty-new', title: '', content: '', updatedAt: 3000, favorite: false },
      { id: 'favorite', title: 'Plan produit', content: '<p>Un contenu solide avec plusieurs mots utiles.</p>', updatedAt: 1000, favorite: true },
      { id: 'recent-content', title: 'Journal', content: '<p>Quelques notes utiles.</p>', updatedAt: 2000, favorite: false },
    ];

    expect(pickFeaturedNote(notes)?.id).toBe('favorite');
  });
});
