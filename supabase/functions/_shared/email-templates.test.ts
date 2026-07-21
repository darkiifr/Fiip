import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert';

import { renderEmailTemplate } from './email-templates.ts';

Deno.test('trial email is branded, truthful and contains bounded quotas', () => {
  const email = renderEmailTemplate('trial_started', {
    expiresAt: '2026-08-04T00:00:00Z',
    portalUrl: 'https://accounts.fiip.fr/',
  });
  assertEquals(email.subject, 'Votre essai Pro Fiip commence maintenant');
  assertStringIncludes(email.html, '250 Mo de pièces jointes');
  assertStringIncludes(email.html, 'Aucun moyen de paiement');
  assertStringIncludes(email.html, 'https://accounts.fiip.fr/');
});

Deno.test('dynamic email content is escaped and unsafe portal schemes are rejected', () => {
  const email = renderEmailTemplate('family_invite', {
    inviterEmail: '<script>alert(1)</script>@example.com',
    inviteUrl: 'javascript:alert(1)',
  });
  assert(!email.html.includes('<script>'));
  assert(!email.html.includes('javascript:'));
  assertStringIncludes(email.html, 'https://accounts.fiip.fr/');
});
