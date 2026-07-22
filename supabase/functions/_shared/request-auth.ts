import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { getEnv } from './env.ts';

export interface RequestUser {
  id: string;
  subject: string;
  claims: Record<string, unknown>;
}

let clerkJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let clerkIssuer = '';

export function normalizeClerkIssuer(domain: string) {
  const value = domain.trim().replace(/\/$/, '');
  if (!value) throw new Error('CLERK_DOMAIN is not configured');
  return value.startsWith('https://') ? value : `https://${value}`;
}

async function verifyClerkToken(token: string): Promise<JWTPayload> {
  const issuer = normalizeClerkIssuer(getEnv('CLERK_DOMAIN'));
  if (!clerkJwks || clerkIssuer !== issuer) {
    clerkIssuer = issuer;
    clerkJwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  }

  const { payload } = await jwtVerify(token, clerkJwks, { issuer });
  if (payload.role !== 'authenticated') throw new Error('Not authenticated');
  return payload;
}

export function getBearerToken(req: Request) {
  const header = req.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Not authenticated');
  return match[1];
}

export async function getRequestSubject(req: Request) {
  const claims = await verifyClerkToken(getBearerToken(req));
  const subject = String(claims.sub || '');
  if (!subject) throw new Error('Not authenticated');
  return { subject, claims: claims as Record<string, unknown> };
}

export async function resolveRequestUser(
  req: Request,
  supabase: {
    rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{
      data: unknown;
      error: { message?: string } | null;
    }>;
  },
): Promise<RequestUser> {
  const { subject, claims } = await getRequestSubject(req);
  const email = String(claims.email || '');
  const { data, error } = await supabase.rpc('fiip_bootstrap_identity', {
    p_subject: subject,
    p_email: email || null,
  });
  if (error || !data) {
    throw new Error(error?.message || 'Identity mapping failed');
  }
  return { id: String(data), subject, claims };
}
