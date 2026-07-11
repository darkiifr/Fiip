import { handleOptions } from '../_shared/cors.ts';
import { generateKeyAuthLicense } from '../_shared/keyauth.ts';
import { normalizeSellAuthEventId, parseSellAuthDeliveryPayload, verifySellAuthDeliveryToken, verifySellAuthSignature, resolveTierFromSellAuthItem } from '../_shared/sellauth.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { getTierCapabilities } from '../_shared/tiers.ts';

function formatTierName(tier: string) {
  return tier.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatSellAuthLicenseDelivery(tier: string, interval: string, licenseKey: string) {
  const intervalLabel = interval === 'yearly' ? 'annuel' : 'mensuel';
  const tierName = formatTierName(tier);

  return [
    `Fiip ${tierName} - ${intervalLabel}`,
    `Licence Fiip : ${licenseKey}`,
    'Durée : ' + (interval === 'yearly' ? '1 an' : '1 mois'),
    'Activation : Fiip > Réglages > Fiip Premium > License key',
  ].join('\n');
}

async function findUserIdByEmail(supabaseAdmin: any, email?: string) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const found = data?.users?.find((candidate: any) => String(candidate.email || '').trim().toLowerCase() === normalized);
    if (found?.id) return found.id;
    if (!data?.users?.length || data.users.length < 1000) return null;
  }
  return null;
}

async function ensureFamilyGroupForLicense(supabaseAdmin: any, userId: string, licenseId: string) {
  const { data: license } = await supabaseAdmin
    .from('licenses')
    .select('family_group_id')
    .eq('id', licenseId)
    .maybeSingle();
  if (license?.family_group_id) return license.family_group_id;

  const { data: ownedGroup } = await supabaseAdmin
    .from('family_groups')
    .select('*')
    .eq('owner_user_id', userId)
    .maybeSingle();

  const group = ownedGroup || (await supabaseAdmin
    .from('family_groups')
    .insert({ owner_user_id: userId, name: 'Fiip Family', ai_budget_limit_eur: 2 })
    .select('*')
    .single()).data;

  if (!group?.id) return null;

  await supabaseAdmin.from('family_members').upsert({
    family_group_id: group.id,
    user_id: userId,
    role: 'admin',
    invited_email: null,
    status: 'active',
    accepted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'family_group_id,user_id' });

  await supabaseAdmin
    .from('licenses')
    .update({ family_group_id: group.id, updated_at: new Date().toISOString() })
    .eq('id', licenseId);

  return group.id;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const rawBody = await req.text();
  const valid = await verifySellAuthSignature(rawBody, req.headers.get('X-Signature')) || verifySellAuthDeliveryToken(req);
  if (!valid) return new Response('Invalid signature', { status: 401 });

  let payload;
  try {
    payload = parseSellAuthDeliveryPayload(rawBody);
  } catch (error) {
    console.warn('Rejected SellAuth payload', error instanceof Error ? error.message : String(error));
    return new Response('Invalid SellAuth payload', { status: 400 });
  }

  const { tier, interval } = resolveTierFromSellAuthItem(payload);
  const sourceEventId = normalizeSellAuthEventId(req.headers.get('Idempotency-Key') || payload.unique_id || String(payload.id || crypto.randomUUID()));
  const customerEmail = payload.email || payload.customer?.email;
  const supabaseAdmin = createAdminClient();

  const { error: reserveError } = await supabaseAdmin
    .from('sellauth_delivery_events')
    .insert({
      source_event_id: sourceEventId,
      event_name: payload.event || 'INVOICE.ITEM.DELIVER-DYNAMIC',
      customer_email: customerEmail || null,
      product_id: payload.item?.product_id ? String(payload.item.product_id) : null,
      variant_id: payload.item?.variant_id ? String(payload.item.variant_id) : null,
      tier,
      billing_interval: interval,
      payload,
      status: 'accepted',
    });

  if (reserveError?.code === '23505') {
    const { data: existingDelivery } = await supabaseAdmin
      .from('sellauth_delivery_events')
      .select('license_key,status')
      .eq('source_event_id', sourceEventId)
      .maybeSingle();
    if (existingDelivery?.license_key) {
      return new Response(formatSellAuthLicenseDelivery(tier, interval, existingDelivery.license_key), {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    return new Response('Fiip license delivery is already being processed. Please refresh this order in a moment.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  if (reserveError) {
    return new Response('Unable to reserve Fiip delivery. Please contact support.', { status: 500 });
  }

  const license = await generateKeyAuthLicense({
    userId: customerEmail || `sellauth:${payload.shop_id || 'shop'}:${payload.id || sourceEventId}`,
    email: customerEmail,
    tier,
    interval,
    sourceEventId,
  });

  if (!license.key) {
    await supabaseAdmin
      .from('sellauth_delivery_events')
      .update({ status: 'failed', error: 'Missing KeyAuth license key', processed_at: new Date().toISOString() })
      .eq('source_event_id', sourceEventId);
    return new Response('Unable to generate Fiip license. Please contact support.', { status: 500 });
  }

  await supabaseAdmin
    .from('sellauth_delivery_events')
    .update({ status: 'processed', license_key: license.key, processed_at: new Date().toISOString() })
    .eq('source_event_id', sourceEventId);

  const userId = await findUserIdByEmail(supabaseAdmin, customerEmail);
  if (userId) {
    const caps = getTierCapabilities(tier);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (interval === 'yearly' ? 365 : 30) * 86_400_000).toISOString();
    const orderId = payload.unique_id || String(payload.invoice_id || payload.id || sourceEventId);
    const subscriptionId = `sellauth:${sourceEventId}`;

    const { data: storedLicense } = await supabaseAdmin
      .from('licenses')
      .upsert({
        user_id: userId,
        ls_customer_id: payload.customer?.id ? String(payload.customer.id) : payload.email || null,
        ls_subscription_id: subscriptionId,
        ls_order_id: orderId,
        ls_variant_id: payload.item?.variant_id ? String(payload.item.variant_id) : null,
        keyauth_license_key: license.key,
        keyauth_level: caps.keyauthLevel,
        keyauth_source: 'sellauth',
        keyauth_sync_status: 'synced',
        tier,
        status: 'active',
        expires_at: expiresAt,
        renews_at: expiresAt,
        billing_interval: interval,
        device_limit: caps.deviceLimit,
        sharing_enabled: caps.sharingEnabled,
        ai_enabled: caps.aiEnabled,
        ocr_limit: caps.ocrLimit,
        family_slots: caps.familySlots,
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id,ls_subscription_id' })
      .select('id')
      .single();

    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        plan_level: caps.planLevel,
        plan_source: 'sellauth',
        plan_updated_at: now.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: 'id' });

    if (tier === 'family_pro' && storedLicense?.id) {
      await ensureFamilyGroupForLicense(supabaseAdmin, userId, storedLicense.id);
    }

    const { error: resetError } = await supabaseAdmin.rpc('fiip_reset_subscription_period', {
      p_user_id: userId,
      p_tier: tier,
      p_budget_limit_eur: caps.aiBudgetEur,
      p_period_start: now.toISOString(),
      p_period_end: expiresAt,
    });
    if (resetError) console.error('fiip_reset_subscription_period failed', resetError);
  }

  return new Response(formatSellAuthLicenseDelivery(tier, interval, license.key), {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
});
