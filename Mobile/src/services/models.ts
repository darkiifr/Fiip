import { FREE_MODEL_ROUTER, listOpenRouterModels } from './ai';

export interface ModelMetadata {
  id: string;
  name: string;
  provider: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  logo_url: string;
}

const LOGO_BASE_URL = 'https://models.dev/logos/';

export const ModelsService = {
  async fetchModels(): Promise<ModelMetadata[]> {
    const models = await listOpenRouterModels({ freeOnly: true }).catch(() => []);

    if (models.length === 0) {
      return [{
        id: FREE_MODEL_ROUTER,
        name: 'Free Models Router',
        provider: 'OpenRouter',
        description: 'Route automatiquement vers des modèles gratuits compatibles.',
        logo_url: `${LOGO_BASE_URL}openrouter.svg`,
      }];
    }

    return models.map((model: any) => {
      const provider = this.detectProvider(model.id);

      return {
        id: model.id,
        name: model.name || model.id,
        provider,
        description: model.description,
        context_length: model.context_length,
        pricing: model.pricing,
        logo_url: `${LOGO_BASE_URL}${provider}.svg`,
      };
    });
  },

  detectProvider(modelId: string): string {
    if (!modelId) {
      return 'openrouter';
    }

    if (modelId === FREE_MODEL_ROUTER) {
      return 'openrouter';
    }

    if (modelId.includes('/')) {
      return modelId.split('/')[0].toLowerCase();
    }

    return 'openrouter';
  },

  getLogoUrl(provider: string): string {
    return `${LOGO_BASE_URL}${(provider || 'openrouter').toLowerCase()}.svg`;
  },

  async getModelMetadata(modelId: string): Promise<ModelMetadata | null> {
    const models = await this.fetchModels();
    return models.find((model) => model.id === modelId) || {
      id: modelId,
      name: modelId.split('/').pop() || modelId,
      provider: this.detectProvider(modelId),
      logo_url: this.getLogoUrl(this.detectProvider(modelId)),
    };
  },
};
