import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { resolveRequestUser } from '../_shared/request-auth.ts';
import { createAdminClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const identity = await resolveRequestUser(req, createAdminClient());
    return jsonResponse({
      userId: identity.id,
      subject: identity.subject,
    });
  } catch {
    return jsonResponse({ error: 'Not authenticated' }, { status: 401 });
  }
});
