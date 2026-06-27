import { describe, expect, it } from 'vitest';

import { normalizeNoteTags, serializeNoteTags } from './noteTags';

describe('note tag helpers', () => {
  it('migrates legacy string tags to object tags', () => {
    expect(normalizeNoteTags(['Projet'])).toEqual([
      { id: 'tag-projet', label: 'Projet', icon: 'Tag', color: 4 },
    ]);
  });

  it('deduplicates tags case-insensitively', () => {
    expect(normalizeNoteTags(['Projet', 'projet', { label: 'PROJET', icon: 'Star', color: 2 }])).toHaveLength(1);
  });

  it('serializes only the public tag shape', () => {
    expect(serializeNoteTags([{ id: 'x', label: 'Urgent', icon: 'Flag', color: 0, extra: true }])).toEqual([
      { id: 'x', label: 'Urgent', icon: 'Flag', color: 0 },
    ]);
  });
});
