import { getTierCapabilities, normalizeTier } from './tiers.ts';

export async function getActiveLicenseAndUsage(supabaseAdmin: any, userId: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('active_license_id')
    .eq('id', userId)
    .maybeSingle();

  let license = null;
  if (profile?.active_license_id) {
    const { data } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('user_id', userId)
      .eq('id', profile.active_license_id)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .maybeSingle();
    license = data;
  }

  if (!license) {
    const { data } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    license = data;
  }

  let familyGroupId: string | null = null;
  let usageUserId = userId;

  if (!license) {
    const { data: membership } = await supabaseAdmin
      .from('family_members')
      .select('family_group_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membership?.family_group_id) {
      familyGroupId = membership.family_group_id;
      const { data } = await supabaseAdmin
        .from('licenses')
        .select('*')
        .eq('family_group_id', membership.family_group_id)
        .eq('tier', 'family_pro')
        .eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      license = data;
    }
  }

  const tier = normalizeTier(license?.tier);
  const caps = getTierCapabilities(tier);
  if (license?.family_group_id) {
    familyGroupId = license.family_group_id;
    usageUserId = license.user_id || userId;
  }

  const usageQuery = supabaseAdmin
    .from('ai_usage')
    .select('*')
    .order('period_start', { ascending: false })
    .limit(1);

  const { data: usage } = familyGroupId
    ? await usageQuery.eq('family_group_id', familyGroupId).maybeSingle()
    : await usageQuery.eq('user_id', userId).maybeSingle();

  return { license, tier, caps, usage, familyGroupId, usageUserId };
}

export function remainingBudget(caps: { aiBudgetEur: number }, usage: any) {
  const limit = Number(usage?.budget_limit_eur ?? caps.aiBudgetEur ?? 0);
  const used = Number(usage?.budget_used_eur ?? 0);
  return Math.max(0, limit - used);
}

export async function reserveAiBudget(supabaseAdmin: any, usageId: string | undefined, amountEur: number) {
  if (!usageId) return false;
  const reserve = Math.max(0, Number(amountEur) || 0);
  if (reserve <= 0) return true;

  const { data, error } = await supabaseAdmin.rpc('fiip_try_reserve_ai_budget', {
    p_usage_id: usageId,
    p_amount: reserve,
  });
  if (error) throw error;
  return data === true;
}

export async function ensureAiUsageRecord(supabaseAdmin: any, input: {
  usage?: any;
  userId: string;
  usageUserId?: string;
  familyGroupId?: string | null;
  tier: string;
  budgetLimitEur: number;
}) {
  if (input.usage?.id) return input.usage;

  const { data, error } = await supabaseAdmin
    .from('ai_usage')
    .insert({
      user_id: input.usageUserId || input.userId,
      family_group_id: input.familyGroupId || null,
      tier: input.tier,
      budget_limit_eur: input.budgetLimitEur,
      budget_used_eur: 0,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function adjustAiBudget(supabaseAdmin: any, usageId: string | undefined, deltaEur: number) {
  if (!usageId) return;
  const delta = Number(deltaEur) || 0;
  if (delta === 0) return;

  const { error } = await supabaseAdmin.rpc('increment_ai_budget_used', {
    p_usage_id: usageId,
    p_amount: delta,
  });
  if (error) throw error;
}

export async function recordAiUsage(supabaseAdmin: any, input: {
  userId: string;
  usageUserId?: string;
  familyGroupId?: string | null;
  usageId?: string;
  tier: string;
  budgetLimitEur: number;
  taskType: string;
  requestedModel: string;
  modelUsed: string;
  fallbackUsed: boolean;
  inputTokens: number;
  outputTokens: number;
  costEur: number;
  provider?: string;
  generationId?: string;
  metadata?: Record<string, unknown>;
  reservedCostEur?: number;
}) {
  let usageId = input.usageId;
  if (!usageId) {
    const { data } = await supabaseAdmin
      .from('ai_usage')
      .insert({
        user_id: input.usageUserId || input.userId,
        family_group_id: input.familyGroupId || null,
        tier: input.tier,
        budget_limit_eur: input.budgetLimitEur,
        budget_used_eur: 0,
      })
      .select('id')
      .single();
    usageId = data?.id;
  }

  await supabaseAdmin.from('ai_usage_events').insert({
    user_id: input.userId,
    ai_usage_id: usageId || null,
    task_type: input.taskType,
    requested_model: input.requestedModel,
    model_used: input.modelUsed,
    fallback_used: input.fallbackUsed,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    cost_eur: input.costEur,
    provider: input.provider || null,
    generation_id: input.generationId || null,
    metadata: input.metadata || {},
  });

  if (usageId) {
    await adjustAiBudget(supabaseAdmin, usageId, input.costEur - Number(input.reservedCostEur || 0));
  }
}
