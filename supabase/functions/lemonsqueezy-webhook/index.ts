import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getEnv } from '../_shared/env.ts';
import { parseLemonPayload, verifyLemonSignature } from '../_shared/lemonsqueezy.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { generateKeyAuthLicense, revokeKeyAuthLicense } from '../_shared/keyauth.ts';
import { resolveTierFromVariant } from '../_shared/tiers.ts';
import { sendTemplateEmail } from '../_shared/mailer.ts';

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

async function processLemonEvent(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  parsed: ReturnType<typeof parseLemonPayload>,
) {
  const tierInfo = resolveTierFromVariant(parsed.variantId);
  if (!tierInfo || !parsed.userId) {
    throw new Error('Unable to resolve Lemon Squeezy tier or user_id.');
  }

  const caps = tierInfo.capabilities;
  const isInactive = ['cancelled', 'expired'].some((status) => parsed.eventName.includes(status) || parsed.status.includes(status));
  const isPaymentFailed = parsed.eventName === 'subscription_payment_failed';

  if (isPaymentFailed) {
    if (parsed.email) {
      await sendTemplateEmail({
        supabaseAdmin,
        userId: parsed.userId,
        to: parsed.email,
        template: 'payment_failed',
        data: { tier: tierInfo.tier },
      }).catch(console.error);
    }
    return;
  }

  if (isInactive) {
    const { data: current } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('user_id', parsed.userId)
      .eq('ls_subscription_id', parsed.subscriptionId)
      .maybeSingle();

    if (current?.keyauth_license_key) {
      await revokeKeyAuthLicense(current.keyauth_license_key, parsed.status || parsed.eventName).catch((error) => {
        console.error('KeyAuth revoke failed', error);
      });
    }

    await supabaseAdmin
      .from('licenses')
      .update({
        status: parsed.status.includes('cancel') ? 'cancelled' : 'expired',
        ai_enabled: false,
        sharing_enabled: false,
        ocr_limit: 0,
        keyauth_sync_status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', parsed.userId)
      .eq('ls_subscription_id', parsed.subscriptionId);

    await supabaseAdmin
      .from('profiles')
      .update({ plan_level: 0, plan_source: 'lemonsqueezy', plan_updated_at: new Date().toISOString() })
      .eq('id', parsed.userId);

    if (parsed.email) {
      await sendTemplateEmail({
        supabaseAdmin,
        userId: parsed.userId,
        to: parsed.email,
        template: 'subscription_cancelled',
        data: { tier: tierInfo.tier },
      }).catch(console.error);
    }
    return;
  }

  const keyauth = await generateKeyAuthLicense({
    userId: parsed.userId,
    email: parsed.email,
    tier: tierInfo.tier,
    interval: tierInfo.interval,
    expiresAt: parsed.expiresAt,
    sourceEventId: parsed.eventId,
  });

  await supabaseAdmin
    .from('licenses')
    .upsert({
      user_id: parsed.userId,
      ls_customer_id: parsed.customerId,
      ls_subscription_id: parsed.subscriptionId,
      ls_order_id: parsed.orderId,
      ls_variant_id: parsed.variantId,
      keyauth_license_key: keyauth.key,
      keyauth_level: caps.keyauthLevel,
      keyauth_source: 'lemonsqueezy',
      keyauth_sync_status: 'synced',
      tier: tierInfo.tier,
      status: 'active',
      expires_at: parsed.expiresAt,
      renews_at: parsed.renewsAt,
      billing_interval: tierInfo.interval,
      device_limit: caps.deviceLimit,
      sharing_enabled: caps.sharingEnabled,
      ai_enabled: caps.aiEnabled,
      ocr_limit: caps.ocrLimit,
      family_slots: caps.familySlots,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,ls_subscription_id' });

  await supabaseAdmin
    .from('profiles')
    .update({ plan_level: caps.planLevel, plan_source: 'lemonsqueezy', plan_updated_at: new Date().toISOString() })
    .eq('id', parsed.userId);

  const { error: resetPeriodError } = await supabaseAdmin.rpc('fiip_reset_subscription_period', {
    p_user_id: parsed.userId,
    p_tier: tierInfo.tier,
    p_budget_limit_eur: caps.aiBudgetEur,
    p_period_start: new Date().toISOString(),
    p_period_end: parsed.renewsAt || parsed.expiresAt,
  });
  if (resetPeriodError) {
    console.error('Unable to reset subscription period', resetPeriodError);
  }

  if (parsed.email) {
    await sendTemplateEmail({
      supabaseAdmin,
      userId: parsed.userId,
      to: parsed.email,
      template: 'license_created',
      data: {
        tier: tierInfo.tier,
        licenseKey: keyauth.key,
        duration: tierInfo.interval === 'yearly' ? '1 an' : '1 mois',
        expiresAt: parsed.expiresAt,
        renewsAt: parsed.renewsAt,
        deviceLimit: caps.deviceLimit,
        budgetEur: caps.aiBudgetEur,
      },
    }).catch(console.error);
  }
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  const rawBody = await req.text();
  const secret = getEnv('LEMONSQUEEZY_WEBHOOK_SECRET');
  const valid = await verifyLemonSignature(rawBody, req.headers.get('X-Signature'), secret);
  if (!valid) {
    return jsonResponse({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const parsed = parseLemonPayload(payload, req.headers.get('X-Event-Name'));
  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from('webhook_events')
    .insert({
      provider: 'lemonsqueezy',
      event_id: parsed.eventId,
      event_name: parsed.eventName,
      user_id: parsed.userId || null,
      payload,
      status: 'accepted',
    });

  if (error?.code === '23505') {
    return jsonResponse({ ok: true, duplicate: true });
  }
  if (error) {
    console.error('Unable to persist Lemon Squeezy webhook event', error);
    return jsonResponse({ error: 'Lemon Squeezy webhook persistence failed' }, { status: 500 });
  }

  EdgeRuntime.waitUntil((async () => {
    try {
      await processLemonEvent(supabaseAdmin, parsed);
      await supabaseAdmin
        .from('webhook_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('provider', 'lemonsqueezy')
        .eq('event_id', parsed.eventId);
    } catch (processError) {
      await supabaseAdmin
        .from('webhook_events')
        .update({ status: 'failed', error: processError instanceof Error ? processError.message : String(processError) })
        .eq('provider', 'lemonsqueezy')
        .eq('event_id', parsed.eventId);
    }
  })());

  return jsonResponse({ ok: true });
});
