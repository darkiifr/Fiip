import { assertEquals } from '@std/assert';

import { mergeSettings } from './settings.ts';

Deno.test('mergeSettings resolves each key independently by timestamp', () => {
  const merged = mergeSettings(
    {
      theme: { ciphertext: 'remote-new', updatedAt: '2026-07-20T10:00:00Z' },
      locale: { ciphertext: 'remote-old', updatedAt: '2026-07-20T08:00:00Z' },
    },
    {
      theme: { ciphertext: 'incoming-old', updatedAt: '2026-07-20T09:00:00Z' },
      locale: { ciphertext: 'incoming-new', updatedAt: '2026-07-20T11:00:00Z' },
    },
  );

  assertEquals(merged.theme.ciphertext, 'remote-new');
  assertEquals(merged.locale.ciphertext, 'incoming-new');
});
