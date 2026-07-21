export interface RequestUser {
  id: string;
  subject: string;
  claims: Record<string, unknown>;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  if (!payload) throw new Error('Missing JWT payload');
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return JSON.parse(atob(padded));
}

export function getBearerToken(req: Request) {
  const header = req.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Not authenticated');
  return match[1];
}

export function getRequestSubject(req: Request) {
  const claims = decodeJwtPayload(getBearerToken(req));
  const subject = String(claims.sub || '');
  if (!subject) throw new Error('Not authenticated');
  return { subject, claims };
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
  const { subject, claims } = getRequestSubject(req);
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
