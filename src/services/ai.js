import { FIIP_PUBLIC_SITE_URL } from '../config/links';

import { keyAuthService } from './keyauth';

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
export const FREE_MODEL_ROUTER = 'openrouter/free';

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';

const usageListeners = new Set();
let lastUsageStats = null;

function normalizeGenerateTextArgs(input, model, signal) {
  if (typeof input === 'string') {
    return {
      model,
      signal,
      messages: [{ role: 'user', content: input }],
    };
  }

  return input || {};
}

function assertOpenRouterKey() {
  if (!OPENROUTER_KEY) {
    throw new Error('OpenRouter est configuré via le secret GitHub VITE_OPENROUTER_KEY. Aucune clé locale personnalisée n’est acceptée.');
  }
}

function notifyUsage(stats) {
  lastUsageStats = stats;
  usageListeners.forEach((listener) => listener(stats));
}

async function fetchGenerationStats(generationId) {
  if (!generationId) {
    return null;
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/generation?id=${encodeURIComponent(generationId)}`, {
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
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

export async function listOpenRouterModels({ freeOnly = true } = {}) {
  assertOpenRouterKey();

  const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur modèles OpenRouter (${response.status})`);
  }

  const payload = await response.json();
  const models = Array.isArray(payload.data) ? payload.data : [];

  if (!freeOnly) {
    return models;
  }

  return models.filter((model) => {
    const promptPrice = Number(model.pricing?.prompt || 0);
    const completionPrice = Number(model.pricing?.completion || 0);
    return model.id?.endsWith(':free') || (promptPrice === 0 && completionPrice === 0);
  });
}

export const generateText = async (input, model, signal) => {
  const { messages, signal: requestedSignal, jsonMode } = normalizeGenerateTextArgs(input, model, signal);

  if (!keyAuthService.hasAIAccess()) {
    throw new Error('Cette fonctionnalité nécessite un abonnement actif. Veuillez activer votre licence.');
  }

  assertOpenRouterKey();

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const body = {
        model: FREE_MODEL_ROUTER,
        messages,
        temperature: 0.7,
      };

      if (jsonMode) {
        body.response_format = { type: 'json_object' };
      }

      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': FIIP_PUBLIC_SITE_URL,
          'X-Title': 'Fiip',
        },
        body: JSON.stringify(body),
        signal: requestedSignal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if ((response.status === 429 || response.status === 503) && attempt < maxRetries - 1) {
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }

        throw new Error(`Erreur OpenRouter (${response.status}): ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const generationId = data.id;
      const generationStats = await fetchGenerationStats(generationId);

      notifyUsage({
        id: generationId,
        model: FREE_MODEL_ROUTER,
        usage: data.usage || generationStats?.data || generationStats || null,
        createdAt: new Date().toISOString(),
      });

      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }

      if (attempt === maxRetries - 1) {
        throw error;
      }

      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
};

export const aiService = {
  FREE_MODEL_ROUTER,
  getLastUsageStats: getLastAIUsageStats,
  listModels: listOpenRouterModels,
  subscribeToUsage: subscribeToAIUsage,

  async enhanceNote(input) {
    const payload = typeof input === 'string'
      ? { content: input, title: '', tags: [], goal: 'améliorer la note' }
      : input || {};

    return generateText({
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
