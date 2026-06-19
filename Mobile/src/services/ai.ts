import { VITE_OPENROUTER_KEY } from '@env';

import { keyAuthService } from './keyauth';

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
export const FREE_MODEL_ROUTER = 'openrouter/free';

const OPENROUTER_KEY = VITE_OPENROUTER_KEY || '';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateTextArgs {
  messages: OpenRouterMessage[];
  signal?: AbortSignal;
  jsonMode?: boolean;
}

export interface AIUsageStats {
  id?: string;
  model: string;
  usage: unknown;
  createdAt: string;
}

let lastUsageStats: AIUsageStats | null = null;
const usageListeners = new Set<(stats: AIUsageStats) => void>();

function assertOpenRouterKey() {
  if (!OPENROUTER_KEY) {
    throw new Error('OpenRouter est fourni uniquement par le secret GitHub VITE_OPENROUTER_KEY. Aucune clé personnalisée locale n’est acceptée.');
  }
}

function notifyUsage(stats: AIUsageStats) {
  lastUsageStats = stats;
  usageListeners.forEach((listener) => listener(stats));
}

async function fetchGenerationStats(generationId?: string) {
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

  return freeOnly
    ? models.filter((model: any) => model.id?.endsWith(':free') || (Number(model.pricing?.prompt || 0) === 0 && Number(model.pricing?.completion || 0) === 0))
    : models;
}

export const generateText = async ({ messages, signal, jsonMode }: GenerateTextArgs) => {
  if (keyAuthService && typeof keyAuthService.hasAIAccess === 'function' && !keyAuthService.hasAIAccess()) {
    throw new Error('Cette fonctionnalité nécessite un abonnement actif. Veuillez activer votre licence.');
  }

  assertOpenRouterKey();

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const body: Record<string, unknown> = {
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
          'HTTP-Referer': 'https://fiip.app',
          'X-Title': 'Fiip Mobile',
        },
        body: JSON.stringify(body),
        signal,
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
      const generationStats = await fetchGenerationStats(data.id);

      notifyUsage({
        id: data.id,
        model: FREE_MODEL_ROUTER,
        usage: data.usage || generationStats?.data || generationStats || null,
        createdAt: new Date().toISOString(),
      });

      return data.choices?.[0]?.message?.content || '';
    } catch (error: any) {
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

  return '';
};

export const aiService = {
  FREE_MODEL_ROUTER,
  getLastUsageStats: getLastAIUsageStats,
  listModels: listOpenRouterModels,
  subscribeToUsage: subscribeToAIUsage,
  async enhanceNote(content: string) {
    return generateText({
      messages: [
        { role: 'system', content: 'Améliore cette note en français. Retourne uniquement le texte final.' },
        { role: 'user', content: content || '' },
      ],
    });
  },
};
