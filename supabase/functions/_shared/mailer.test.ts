import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { resolveMailIdentity } from './mailer.ts';

Deno.test('resolveMailIdentity replaces legacy fiip.app senders with verified fiip.fr defaults', () => {
  assertEquals(
    resolveMailIdentity('Fiip <noreply@fiip.app>', 'Fiip <licences@fiip.fr>'),
    'Fiip <licences@fiip.fr>',
  );
  assertEquals(
    resolveMailIdentity('support@fiip.app', 'support@fiip.fr'),
    'support@fiip.fr',
  );
});

Deno.test('resolveMailIdentity keeps configured verified identities', () => {
  assertEquals(
    resolveMailIdentity('Fiip <licences@fiip.fr>', 'Fiip <fallback@fiip.fr>'),
    'Fiip <licences@fiip.fr>',
  );
});
