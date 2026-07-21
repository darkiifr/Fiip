import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') || (req.method === 'POST' ? (await req.json().catch(() => ({}))).scope : 'all') || 'all';
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('feature_flags')
    .select('feature_key, scope, status, message, reason, expected_reactivation_at, enabled_for, updated_at')
    .in('scope', ['all', scope])
    .order('feature_key', { ascending: true });

  if (error) {
    console.error('Unable to read feature flags', error);
    return jsonResponse({ error: 'Les indicateurs de fonctionnalités sont indisponibles.' }, { status: 500 });
  }
  return jsonResponse({ flags: data || [] });
});
