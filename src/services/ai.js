import { supabase } from './supabase';
import { keyAuthService } from './keyauth';

export const AI_PROXY_FUNCTION = 'ai-proxy';
export const AI_MODELS_FUNCTION = 'ai-models-list';
export const AUTO_MODEL_ROUTER = 'auto';
export const FREE_MODEL_ROUTER = AUTO_MODEL_ROUTER;

const usageListeners = new Set();
let lastUsageStats = null;

function normalizeGenerateTextArgs(input, model, signal) {
  if (typeof input === 'string') {
    return {
      model: model || AUTO_MODEL_ROUTER,
      signal,
      taskType: 'chat',
      messages: [{ role: 'user', content: input }],
    };
  }

  return {
    model: input?.model || model || AUTO_MODEL_ROUTER,
    taskType: input?.taskType || 'chat',
    inputLength: input?.inputLength,
    messages: input?.messages || [],
    signal: input?.signal || signal,
    jsonMode: Boolean(input?.jsonMode),
  };
}

function assertSupabaseFunctions() {
  if (!supabase?.functions?.invoke) {
    throw new Error("Le service IA Fiip n'est pas configuré.");
  }
}

function notifyUsage(stats) {
  lastUsageStats = stats;
  usageListeners.forEach((listener) => listener(stats));
}

export function subscribeToAIUsage(listener) {
  usageListeners.add(listener);
  if (lastUsageStats) {
    listener(lastUsageStats);
  }

  return () => usageListeners.delete(listener);
}

export function getLastAIUsageStats() {
  return lastUsageStats;
}

async function formatFunctionError(error, fallback) {
  if (!error) {
    return fallback;
  }
  const context = error.context;
  if (context && typeof context.json === 'function') {
    try {
      const response = typeof context.clone === 'function' ? context.clone() : context;
      const payload = await response.json();
      const responseMessage = payload?.error || payload?.message || payload?.error_description;
      if (responseMessage) {
        return responseMessage;
      }
    } catch {
      // Keep the SDK error as a fallback when the response is not JSON.
    }
  }
  return error.message || error.error_description || error.error || fallback;
}

export async function listOpenRouterModels({ freeOnly = true } = {}) {
  assertSupabaseFunctions();

  const { data, error } = await supabase.functions.invoke(AI_MODELS_FUNCTION, {
    body: { freeOnly },
  });

  if (error) {
    throw new Error(await formatFunctionError(error, 'Impossible de charger les modèles IA.'));
  }

  return Array.isArray(data?.data) ? data.data : [];
}

export const generateText = async (input, model, signal) => {
  const request = normalizeGenerateTextArgs(input, model, signal);

  if (!keyAuthService.hasAIAccess()) {
    throw new Error('Cette fonctionnalité nécessite un abonnement actif. Veuillez activer votre licence.');
  }

  assertSupabaseFunctions();

  const { data, error } = await supabase.functions.invoke(AI_PROXY_FUNCTION, {
    body: {
      messages: request.messages,
      model: request.model,
      taskType: request.taskType,
      inputLength: request.inputLength,
      jsonMode: request.jsonMode,
    },
    signal: request.signal,
  });

  if (error) {
    throw new Error(await formatFunctionError(error, "L'assistant n'a pas pu répondre."));
  }

  notifyUsage({
    id: data?.id,
    model: data?.model_used || request.model || AUTO_MODEL_ROUTER,
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

  async enhanceNote(input) {
    const payload = typeof input === 'string'
      ? { content: input, title: '', tags: [], goal: 'améliorer la note' }
      : input || {};

    return generateText({
      taskType: 'rewrite',
      messages: [
        {
          role: 'system',
          content: "Améliore cette note en français en gardant le sens, la structure utile et un ton clair. Corrige les fautes, clarifie les phrases, conserve le HTML utile et retourne uniquement le contenu amélioré.",
        },
        {
          role: 'user',
          content: `Titre: ${payload.title || 'Sans titre'}\nTags: ${(payload.tags || []).join(', ') || 'aucun'}\nObjectif: ${payload.goal || 'clarifier'}\n\nContenu:\n${payload.content || ''}`,
        },
      ],
    });
  },

  async getSmartSuggestions(content) {
    const response = await generateText({
      taskType: 'auto_tag',
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content: 'Retourne un JSON {"suggestions":["..."]} avec 3 suggestions courtes et actionnables pour améliorer une note.',
        },
        { role: 'user', content: content || '' },
      ],
    });

    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    } catch {
      return response
        .split('\n')
        .map((line) => line.replace(/^[-*\d.\s]+/, '').trim())
        .filter(Boolean)
        .slice(0, 3);
    }
  },
};
