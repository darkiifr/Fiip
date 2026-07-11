import { getEnv } from './env.ts';
import { SUPPORTED_MODELS } from './tiers.ts';

export const DEEPSEEK_MODEL = 'deepseek/deepseek-v3.2';
export const MIMO_FALLBACK_MODEL = 'xiaomi/mimo-v2-flash';
export const CLAUDE_HAIKU_MODEL = 'anthropic/claude-haiku-4.5';

interface SelectModelInput {
  taskType?: string;
  inputLength?: number;
  userChoice?: string;
  tier?: string;
  remainingBudgetEur?: number;
}

const CHAT_ROLES = new Set(['system', 'user', 'assistant', 'tool']);
const MAX_CHAT_MESSAGES = 32;
const MAX_MESSAGE_CONTENT_CHARS = 20_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 800;
const MAX_OUTPUT_TOKENS = 2_000;
const MAX_PROVIDER_PROMPT_PRICE_USD = 0.000002;
const MAX_PROVIDER_COMPLETION_PRICE_USD = 0.000004;
const USD_TO_EUR_BUDGET_RATE = 0.92;
const RESERVATION_MARGIN = 1.2;

export function normalizeChatMessages(input: unknown) {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_CHAT_MESSAGES) {
    throw new Error('messages must contain between 1 and 32 items');
  }

  return input.map((message, index) => {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      throw new Error(`Invalid message at index ${index}`);
    }

    const record = message as Record<string, unknown>;
    const role = String(record.role || '').trim().toLowerCase();
    if (!CHAT_ROLES.has(role)) {
      throw new Error(`Invalid message role at index ${index}`);
    }

    const content = typeof record.content === 'string'
      ? record.content
      : Array.isArray(record.content)
        ? record.content
        : '';
    if (!content || (typeof content === 'string' && content.length > MAX_MESSAGE_CONTENT_CHARS)) {
      throw new Error(`Invalid message content at index ${index}`);
    }

    return { role, content };
  });
}

export function normalizeMaxOutputTokens(input: unknown) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_OUTPUT_TOKENS;
  return Math.max(1, Math.min(MAX_OUTPUT_TOKENS, Math.floor(parsed)));
}

function estimatePromptTokens(messages: unknown[]) {
  let chars = 0;
  for (const message of messages) {
    if (!message || typeof message !== 'object') continue;
    const content = (message as Record<string, unknown>).content;
    if (typeof content === 'string') chars += content.length;
    if (Array.isArray(content)) chars += JSON.stringify(content).length;
  }
  return Math.max(1, Math.ceil(chars / 4));
}

export function estimateOpenRouterReservationEur({ messages, maxTokens = DEFAULT_MAX_OUTPUT_TOKENS }: { messages: unknown[]; maxTokens?: number }) {
  const promptTokens = estimatePromptTokens(messages);
  const outputTokens = normalizeMaxOutputTokens(maxTokens);
  const maxCostUsd = (promptTokens * MAX_PROVIDER_PROMPT_PRICE_USD) + (outputTokens * MAX_PROVIDER_COMPLETION_PRICE_USD);
  const eur = maxCostUsd * USD_TO_EUR_BUDGET_RATE * RESERVATION_MARGIN;
  return Number(Math.min(0.05, Math.max(0.000001, eur)).toFixed(6));
}

export function selectModel({ taskType = 'chat', inputLength = 0, userChoice = 'auto', tier = 'basic', remainingBudgetEur = 0 }: SelectModelInput) {
  // Branch 1: explicit user model selection bypasses automatic routing.
  if (userChoice && userChoice !== 'auto') {
    return { model: userChoice, downgraded: false, reason: 'user_choice' };
  }

  const normalizedTask = String(taskType || '').toLowerCase();
  let model = DEEPSEEK_MODEL;
  let reason = 'default_light_task';

  // Branch 2a: short, repetitive editorial tasks stay on the economical model.
  if (['generate_title', 'auto_tag', 'grammar_fix', 'ocr_cleanup'].includes(normalizedTask)) {
    model = DEEPSEEK_MODEL;
    reason = `${normalizedTask}_economical`;
  // Branch 2b: summarize escalates long inputs to Haiku for quality/context handling.
  } else if (normalizedTask === 'summarize') {
    model = Number(inputLength) >= 3000 ? CLAUDE_HAIKU_MODEL : DEEPSEEK_MODEL;
    reason = Number(inputLength) >= 3000 ? 'long_summary_quality' : 'short_summary_economical';
  // Branch 2c: translation is predictable and stays on the economical model.
  } else if (normalizedTask === 'translate') {
    model = DEEPSEEK_MODEL;
    reason = 'translation_economical';
  // Branch 2d: generative rewrite/expansion/tone tasks use Haiku for prose quality.
  } else if (['rewrite', 'expand', 'tone_change'].includes(normalizedTask)) {
    model = CLAUDE_HAIKU_MODEL;
    reason = `${normalizedTask}_quality`;
  // Branch 2e: semantic search and note linking stay low-cost and high-volume.
  } else if (['semantic_search', 'note_linking'].includes(normalizedTask)) {
    model = DEEPSEEK_MODEL;
    reason = `${normalizedTask}_economical`;
  }

  // Branch 4: AI tier can use Haiku only if budget is clearly available; otherwise downgrade.
  if (tier === 'ai' && model === CLAUDE_HAIKU_MODEL && remainingBudgetEur < 0.05) {
    return { model: DEEPSEEK_MODEL, downgraded: true, reason: 'ai_tier_budget_downgrade' };
  }

  return { model, downgraded: false, reason };
}

export function supportedModelsForTier(tier = 'basic') {
  const level = tier === 'family_pro' ? 4 : tier === 'ai' ? 3 : tier === 'pro' ? 2 : 1;
  return SUPPORTED_MODELS.map((model) => {
    const required = model.tier === 'family_pro' ? 4 : model.tier === 'ai' ? 3 : 1;
    return { ...model, available: level >= required };
  });
}

export async function callOpenRouter({ messages, model, jsonMode = false, maxTokens = DEFAULT_MAX_OUTPUT_TOKENS }: { messages: unknown[]; model: string; jsonMode?: boolean; maxTokens?: number }) {
  const apiKey = getEnv('OPENROUTER_API_KEY');
  const body: Record<string, unknown> = {
    model: `${model}:floor`,
    models: [`${model}:floor`, `${MIMO_FALLBACK_MODEL}:floor`],
    messages,
    temperature: 0.7,
    max_tokens: normalizeMaxOutputTokens(maxTokens),
    provider: {
      sort: 'price',
      max_price: {
        prompt: 0.000002,
        completion: 0.000004,
      },
    },
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://fiip.fr',
      'X-Title': 'Fiip',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || `OpenRouter failed (${response.status})`);
  }

  return payload;
}

export async function fetchGenerationStats(generationId?: string) {
  if (!generationId) return null;
  const response = await fetch(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`, {
    headers: { Authorization: `Bearer ${getEnv('OPENROUTER_API_KEY')}` },
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

export function extractUsageCostEur(completionPayload: any, generationPayload: any) {
  const usage = completionPayload?.usage || generationPayload?.data || generationPayload || {};
  const dollars = Number(usage.total_cost || usage.cost || usage.usage_cost || 0);
  const eur = dollars > 0 ? dollars * 0.92 : 0;
  return {
    inputTokens: Number(usage.prompt_tokens || usage.tokens_prompt || usage.native_tokens_prompt || 0),
    outputTokens: Number(usage.completion_tokens || usage.tokens_completion || usage.native_tokens_completion || 0),
    costEur: Number(eur.toFixed(6)),
    usage,
  };
}
