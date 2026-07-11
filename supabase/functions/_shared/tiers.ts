export type FiipTier = 'basic' | 'pro' | 'ai' | 'family_pro';
export type BillingInterval = 'monthly' | 'yearly';

export interface TierCapabilities {
  tier: FiipTier;
  planLevel: number;
  deviceLimit: number | null;
  sharingEnabled: boolean;
  aiEnabled: boolean;
  ocrLimit: number | null;
  familySlots: number;
  aiBudgetEur: number;
  keyauthLevel: number;
}

export const TIER_CAPABILITIES: Record<FiipTier, TierCapabilities> = {
  basic: {
    tier: 'basic',
    planLevel: 1,
    deviceLimit: 2,
    sharingEnabled: false,
    aiEnabled: false,
    ocrLimit: 5,
    familySlots: 1,
    aiBudgetEur: 0,
    keyauthLevel: 1,
  },
  pro: {
    tier: 'pro',
    planLevel: 2,
    deviceLimit: null,
    sharingEnabled: true,
    aiEnabled: false,
    ocrLimit: null,
    familySlots: 1,
    aiBudgetEur: 0,
    keyauthLevel: 2,
  },
  ai: {
    tier: 'ai',
    planLevel: 3,
    deviceLimit: null,
    sharingEnabled: true,
    aiEnabled: true,
    ocrLimit: null,
    familySlots: 1,
    aiBudgetEur: 1.35,
    keyauthLevel: 3,
  },
  family_pro: {
    tier: 'family_pro',
    planLevel: 4,
    deviceLimit: null,
    sharingEnabled: true,
    aiEnabled: true,
    ocrLimit: null,
    familySlots: 5,
    aiBudgetEur: 2,
    keyauthLevel: 4,
  },
};

export const SUPPORTED_MODELS = [
  {
    id: 'auto',
    name: 'Automatique',
    description: 'Choisit le modèle adapté à la tâche et au budget disponible.',
    provider: 'openrouter',
    tier: 'ai',
    pricing: { prompt: '0', completion: '0' },
  },
  {
    id: 'deepseek/deepseek-v3.2',
    name: 'DeepSeek V3.2',
    description: 'Rapide et économique pour titres, tags, nettoyage OCR, traduction et recherche sémantique.',
    provider: 'deepseek',
    tier: 'ai',
    estimated_price_eur_per_million: 0.675,
  },
  {
    id: 'xiaomi/mimo-v2-flash',
    name: 'MiMo V2 Flash',
    description: 'Fallback rapide en cas d’indisponibilité fournisseur.',
    provider: 'xiaomi',
    tier: 'ai',
    estimated_price_eur_per_million: 0.5,
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    description: 'Meilleure qualité pour reformulation, expansion et longs résumés.',
    provider: 'anthropic',
    tier: 'family_pro',
    estimated_price_eur_per_million: 1.5,
  },
];

export function normalizeTier(input: unknown): FiipTier {
  const value = String(input || '').toLowerCase().replace(/[-\s]/g, '_');
  if (value === 'family' || value === 'family_pro' || value === 'family pro') return 'family_pro';
  if (value === 'ai') return 'ai';
  if (value === 'pro') return 'pro';
  return 'basic';
}

export function getTierCapabilities(tier: unknown) {
  return TIER_CAPABILITIES[normalizeTier(tier)];
}

export function variantEnvName(tier: FiipTier, interval: BillingInterval) {
  return `LS_VARIANT_${tier.toUpperCase()}_${interval.toUpperCase()}`;
}

export function resolveTierFromVariant(variantId: string) {
  for (const tier of Object.keys(TIER_CAPABILITIES) as FiipTier[]) {
    for (const interval of ['monthly', 'yearly'] as BillingInterval[]) {
      const envName = variantEnvName(tier, interval);
      if (Deno.env.get(envName) === variantId) {
        return { tier, interval, capabilities: TIER_CAPABILITIES[tier] };
      }
    }
  }
  return null;
}
