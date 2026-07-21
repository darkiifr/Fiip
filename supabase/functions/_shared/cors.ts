export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-timestamp, x-fiip-delivery-token, x-keyauth-webhook-secret, x-idempotency-key, idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const safeBody = body instanceof Error
    ? { error: 'Une erreur interne est survenue.' }
    : body;
  return new Response(JSON.stringify(safeBody), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });
}

export function handleOptions(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
