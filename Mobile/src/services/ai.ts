import { keyAuthService } from './keyauth';
import { supabase } from './supabase';

export const AI_PROXY_FUNCTION = 'ai-proxy';
export const AI_MODELS_FUNCTION = 'ai-models-list';
export const AUTO_MODEL_ROUTER = 'auto';
export const FREE_MODEL_ROUTER = AUTO_MODEL_ROUTER;

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateTextArgs {
  messages: OpenRouterMessage[];
  signal?: AbortSignal;
  jsonMode?: boolean;
  model?: string;
  taskType?: string;
  inputLength?: number;
}

export interface AIUsageStats {
  id?: string;
  model: string;
  usage: unknown;
  budget?: unknown;
  createdAt: string;
}

let lastUsageStats: AIUsageStats | null = null;
const usageListeners = new Set<(stats: AIUsageStats) => void>();

function notifyUsage(stats: AIUsageStats) {
  lastUsageStats = stats;
  usageListeners.forEach((listener) => listener(stats));
}

function assertSupabaseFunctions() {
  if (!supabase?.functions?.invoke) {
    throw new Error('Supabase Functions ne sont pas configurées pour le proxy IA.');
  }
}

function formatFunctionError(error: any, fallback: string) {
  return error?.message || error?.error_description || error?.error || fallback;
}

export function subscribeToAIUsage(listener: (stats: AIUsageStats) => void) {
  usageListeners.add(listener);
  if (lastUsageStats) {
    listener(lastUsageStats);
  }

  return () => usageListeners.delete(listener);
}

export function getLastAIUsageStats() {
  return lastUsageStats;
}

export async function listOpenRouterModels({ freeOnly = true } = {}) {
  assertSupabaseFunctions();

  const { data, error } = await supabase.functions.invoke(AI_MODELS_FUNCTION, {
    body: { freeOnly },
  });

  if (error) {
    throw new Error(formatFunctionError(error, 'Impossible de charger les modèles IA.'));
  }

  return Array.isArray(data?.data) ? data.data : [];
}

export const generateText = async ({ messages, signal, jsonMode, model = AUTO_MODEL_ROUTER, taskType = 'chat', inputLength }: GenerateTextArgs) => {
  if (keyAuthService && typeof keyAuthService.hasAIAccess === 'function' && !keyAuthService.hasAIAccess()) {
    throw new Error('Cette fonctionnalité nécessite un abonnement actif. Veuillez activer votre licence.');
  }

  assertSupabaseFunctions();

  const { data, error } = await supabase.functions.invoke(AI_PROXY_FUNCTION, {
    body: {
      messages,
      model,
      taskType,
      inputLength,
      jsonMode: Boolean(jsonMode),
    },
    signal,
  });

  if (error) {
    throw new Error(formatFunctionError(error, "L'assistant n'a pas pu répondre."));
  }

  notifyUsage({
    id: data?.id,
    model: data?.model_used || model || AUTO_MODEL_ROUTER,
    usage: data?.usage || null,
    budget: data?.budget || null,
    createdAt: new Date().toISOString(),
  });

  return data?.content || '';
};

export const aiService = {
  FREE_MODEL_ROUTER,
  AUTO_MODEL_ROUTER,
  getLastUsageStats: getLastAIUsageStats,
  listModels: listOpenRouterModels,
  subscribeToUsage: subscribeToAIUsage,
  async enhanceNote(content: string) {
    return generateText({
      taskType: 'rewrite',
      messages: [
        { role: 'system', content: 'Améliore cette note en français. Retourne uniquement le texte final.' },
        { role: 'user', content: content || '' },
      ],
    });
  },
};
