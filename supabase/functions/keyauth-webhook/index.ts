import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getEnv } from '../_shared/env.ts';
import { sanitizeKeyAuthWebhookBody } from '../_shared/keyauth-webhook-validation.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { extendKeyAuthLicense, generateKeyAuthLicense, resetKeyAuthHwid, revokeKeyAuthLicense } from '../_shared/keyauth.ts';

const EVENT_ID_RE = /^[A-Za-z0-9._:-]{1,160}$/;

function timingSafeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  const token = req.headers.get('x-keyauth-webhook-secret') || '';
  if (!timingSafeEqual(token, getEnv('KEYAUTH_WEBHOOK_SECRET'))) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = sanitizeKeyAuthWebhookBody(await req.json());
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, { status: 400 });
  }
  const action = body.action;
  const sourceEventId = String(body.source_event_id || req.headers.get('x-idempotency-key') || crypto.randomUUID());
  if (!EVENT_ID_RE.test(sourceEventId)) {
    return jsonResponse({ error: 'Invalid event id' }, { status: 400 });
  }
  const supabaseAdmin = createAdminClient();

  const { error: insertError } = await supabaseAdmin
    .from('keyauth_webhook_events')
    .insert({
      source_event_id: sourceEventId,
      action,
      user_id: body.user_id || null,
      request_payload: body,
      status: 'accepted',
    });

  if (insertError?.code === '23505') {
    return jsonResponse({ ok: true, duplicate: true });
  }
  if (insertError) {
    console.error('Unable to persist KeyAuth webhook event', insertError);
    return jsonResponse({ error: 'KeyAuth webhook persistence failed' }, { status: 500 });
  }

  try {
    let result: unknown = null;
    if (action === 'generate_license') {
      result = await generateKeyAuthLicense({
        userId: body.user_id || sourceEventId,
        email: body.email,
        tier: body.tier,
        interval: body.interval,
        expiresAt: body.expires_at,
        sourceEventId,
      });
    } else if (action === 'extend_license') {
      result = await extendKeyAuthLicense(body.license_key!, body.interval, body.expires_at);
    } else if (action === 'revoke_license') {
      result = await revokeKeyAuthLicense(body.license_key!, body.reason || 'manual revoke');
    } else if (action === 'reset_hwid' || action === 'device_logout') {
      result = await resetKeyAuthHwid(body.license_key!);
    } else if (action === 'sync_license') {
      result = { ok: true, skipped: 'sync_license is reserved for future KeyAuth pull sync' };
    } else {
      return jsonResponse({ error: 'Unsupported action' }, { status: 400 });
    }

    await supabaseAdmin
      .from('keyauth_webhook_events')
      .update({ status: 'processed', response_payload: result, processed_at: new Date().toISOString() })
      .eq('source_event_id', sourceEventId);

    return jsonResponse({ ok: true, result });
  } catch (error) {
    await supabaseAdmin
      .from('keyauth_webhook_events')
      .update({ status: 'failed', error: error instanceof Error ? error.message : String(error), processed_at: new Date().toISOString() })
      .eq('source_event_id', sourceEventId);
    console.error('KeyAuth webhook processing failed', error);
    return jsonResponse({ error: 'KeyAuth webhook processing failed' }, { status: 500 });
  }
});
