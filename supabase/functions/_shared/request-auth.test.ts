import { assertEquals, assertRejects } from '@std/assert';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { getRequestSubject, normalizeClerkIssuer } from './request-auth.ts';

Deno.test('normalizeClerkIssuer accepts a Clerk host or HTTPS URL', () => {
  assertEquals(normalizeClerkIssuer('accounts.fiip.fr'), 'https://accounts.fiip.fr');
  assertEquals(normalizeClerkIssuer('https://accounts.fiip.fr/'), 'https://accounts.fiip.fr');
});

Deno.test('getRequestSubject verifies the Clerk signature and authenticated role', async () => {
  const previousDomain = Deno.env.get('CLERK_DOMAIN');
  const originalFetch = globalThis.fetch;
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  const issuer = 'https://clerk.test';
  Deno.env.set('CLERK_DOMAIN', issuer);
  globalThis.fetch = () => Promise.resolve(Response.json({ keys: [{ ...jwk, kid: 'fiip-test', alg: 'RS256', use: 'sig' }] }));

  try {
    const token = await new SignJWT({ role: 'authenticated', email: 'admin@fiip.fr' })
      .setProtectedHeader({ alg: 'RS256', kid: 'fiip-test' })
      .setIssuer(issuer)
      .setSubject('user_clerk_123')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
    const request = new Request('https://example.test', { headers: { Authorization: `Bearer ${token}` } });

    const identity = await getRequestSubject(request);
    assertEquals(identity.subject, 'user_clerk_123');

    const forgedToken = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
    await assertRejects(() => getRequestSubject(new Request('https://example.test', {
      headers: { Authorization: `Bearer ${forgedToken}` },
    })));
  } finally {
    globalThis.fetch = originalFetch;
    if (previousDomain) Deno.env.set('CLERK_DOMAIN', previousDomain);
    else Deno.env.delete('CLERK_DOMAIN');
  }
});
