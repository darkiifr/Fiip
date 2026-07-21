import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, getAuthenticatedUser } from '../_shared/supabase.ts';
import { adjustAiBudget, ensureAiUsageRecord, getActiveLicenseAndUsage, recordAiUsage, remainingBudget, reserveAiBudget } from '../_shared/usage.ts';
import { callOpenRouter, estimateOpenRouterReservationEur, extractUsageCostEur, fetchGenerationStats, MIMO_FALLBACK_MODEL, normalizeChatMessages, normalizeMaxOutputTokens, selectModel } from '../_shared/openrouter.ts';
import { getManagedOpenRouterApiKey } from '../_shared/openrouter-keys.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { user } = await getAuthenticatedUser(req);
    const body = await req.json().catch(() => ({}));
    let messages;
    try {
      messages = normalizeChatMessages(body.messages);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : 'Invalid messages' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { license, tier, caps, usage, familyGroupId, usageUserId } = await getActiveLicenseAndUsage(supabaseAdmin, user.id);
    if (!license || !caps.aiEnabled) {
      return jsonResponse({ error: 'AI access is not enabled for this account.' }, { status: 403 });
    }

    let activeUsage = usage;
    const remaining = remainingBudget(caps, activeUsage);
    if (remaining <= 0) {
      return jsonResponse({ error: 'Budget IA mensuel dépassé.' }, { status: 402 });
    }

    const selected = selectModel({
      taskType: body.taskType,
      inputLength: body.inputLength,
      userChoice: body.model || 'auto',
      tier,
      remainingBudgetEur: remaining,
    });
    const maxTokens = normalizeMaxOutputTokens(body.maxTokens);
    const reservedCostEur = estimateOpenRouterReservationEur({ messages, maxTokens });
    if (reservedCostEur > remaining) {
      return jsonResponse({ error: 'Budget IA insuffisant pour cette génération.' }, { status: 402 });
    }
    const budgetLimitEur = Number(activeUsage?.budget_limit_eur ?? caps.aiBudgetEur);
    activeUsage = await ensureAiUsageRecord(supabaseAdmin, {
      usage: activeUsage,
      userId: user.id,
      usageUserId,
      familyGroupId,
      tier,
      budgetLimitEur,
    });
    const openRouterApiKey = await getManagedOpenRouterApiKey({
      supabaseAdmin,
      userId: user.id,
      familyGroupId,
      budgetLimitEur,
    });
    const reserved = await reserveAiBudget(supabaseAdmin, activeUsage?.id, reservedCostEur);
    if (!reserved) {
      return jsonResponse({ error: 'Budget IA mensuel dépassé.' }, { status: 402 });
    }

    let completion;
    let modelUsed: string;
    let fallbackUsed = false;
    try {
      completion = await callOpenRouter({ apiKey: openRouterApiKey, messages, model: selected.model, jsonMode: Boolean(body.jsonMode), maxTokens });
      modelUsed = completion?.model || selected.model;
    } catch {
      try {
        completion = await callOpenRouter({ apiKey: openRouterApiKey, messages, model: MIMO_FALLBACK_MODEL, jsonMode: Boolean(body.jsonMode), maxTokens });
        modelUsed = completion?.model || MIMO_FALLBACK_MODEL;
        fallbackUsed = true;
      } catch (fallbackError) {
        await adjustAiBudget(supabaseAdmin, activeUsage?.id, -reservedCostEur);
        throw fallbackError;
      }
    }

    const generationStats = await fetchGenerationStats(completion?.id, openRouterApiKey);
    const usageCost = extractUsageCostEur(completion, generationStats);
    if (usageCost.costEur > remaining) {
      return jsonResponse({ error: 'Budget IA insuffisant pour cette génération.' }, { status: 402 });
    }

    await recordAiUsage(supabaseAdmin, {
      userId: user.id,
      usageUserId,
      familyGroupId,
      usageId: activeUsage?.id,
      tier,
      budgetLimitEur,
      taskType: body.taskType || 'chat',
      requestedModel: body.model || 'auto',
      modelUsed,
      fallbackUsed,
      inputTokens: usageCost.inputTokens,
      outputTokens: usageCost.outputTokens,
      costEur: usageCost.costEur,
      generationId: completion?.id,
      reservedCostEur,
      metadata: { selection_reason: selected.reason, downgraded: selected.downgraded, reserved_cost_eur: reservedCostEur },
    });

    return jsonResponse({
      id: completion?.id,
      content: completion?.choices?.[0]?.message?.content || '',
      model_used: modelUsed,
      usage: usageCost.usage,
      budget: {
        limit_eur: budgetLimitEur,
        used_eur: Number(activeUsage?.budget_used_eur ?? 0) + usageCost.costEur,
        remaining_eur: Math.max(0, remaining - usageCost.costEur),
      },
      downgraded: selected.downgraded,
      fallback_used: fallbackUsed,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
