import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, getAuthenticatedUser } from '../_shared/supabase.ts';
import { getActiveLicenseAndUsage } from '../_shared/usage.ts';
import { supportedModelsForTier } from '../_shared/openrouter.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { user } = await getAuthenticatedUser(req);
    const supabaseAdmin = createAdminClient();
    const { tier } = await getActiveLicenseAndUsage(supabaseAdmin, user.id);
    const models = supportedModelsForTier(tier);
    return jsonResponse({ data: models, cached_for_seconds: 3600 });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, { status: 401 });
  }
});
