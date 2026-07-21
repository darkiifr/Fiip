import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { resolveRequestUser } from '../_shared/request-auth.ts';
import { mergeSettings } from '../_shared/settings.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const supabase = createAdminClient();
    const user = await resolveRequestUser(req, supabase);
    const body = await req.json();
    const incoming = body.settings || {};
    const deviceId = String(body.deviceId || 'unknown').slice(0, 200);
    const { data: existing } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('owner_id', user.id)
      .maybeSingle();

    const settings = mergeSettings(existing?.settings || {}, incoming);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        owner_id: user.id,
        config: settings,
        settings,
        device_id: deviceId,
        updated_at: now,
      }, { onConflict: 'user_id' })
      .select('settings, updated_at, device_id')
      .single();
    if (error) throw error;
    return jsonResponse({ settings: data.settings, updatedAt: data.updated_at, deviceId: data.device_id });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Settings sync failed' }, { status: 401 });
  }
});
