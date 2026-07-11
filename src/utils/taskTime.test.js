import { describe, expect, it } from 'vitest';

import { normalizeTaskTime } from './taskTime';

describe('normalizeTaskTime', () => {
  it('inserts the separator in compact hour input', () => {
    expect(normalizeTaskTime('930')).toBe('09:30');
    expect(normalizeTaskTime('1430')).toBe('14:30');
  });

  it('keeps valid formatted time and rejects invalid time', () => {
    expect(normalizeTaskTime('08:05')).toBe('08:05');
    expect(normalizeTaskTime('2960')).toBe('');
  });
});
