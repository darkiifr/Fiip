import { FREE_MODEL_ROUTER, listOpenRouterModels } from './ai';

const LOGO_BASE_URL = 'https://models.dev/logos/';

export const ModelsService = {
  async fetchModels() {
    const models = await listOpenRouterModels({ freeOnly: true }).catch(() => []);

    if (models.length === 0) {
      return [{
        id: FREE_MODEL_ROUTER,
        name: 'Free Models Router',
        provider: 'OpenRouter',
        description: 'Route automatiquement vers les modèles gratuits compatibles avec la requête.',
        logo_url: `${LOGO_BASE_URL}openrouter.svg`,
      }];
    }

    return models.map((model) => {
      const provider = this.detectProvider(model.id);

      return {
        id: model.id,
        name: model.name || model.id,
        provider,
        description: model.description,
        context_length: model.context_length,
        pricing: model.pricing,
        architecture: model.architecture,
        logo_url: `${LOGO_BASE_URL}${provider}.svg`,
      };
    });
  },

  detectProvider(modelId) {
    if (!modelId || modelId === FREE_MODEL_ROUTER) {
      return 'openrouter';
    }

    if (modelId.includes('/')) {
      return modelId.split('/')[0].toLowerCase();
    }

    return 'openrouter';
  },

  getLogoUrl(provider) {
    return `${LOGO_BASE_URL}${(provider || 'openrouter').toLowerCase()}.svg`;
  },

  async getModelMetadata(modelId) {
    const models = await this.fetchModels();
    const model = models.find((item) => item.id === modelId);

    if (model) {
      return model;
    }

    const provider = this.detectProvider(modelId);
    return {
      id: modelId,
      name: modelId.split('/').pop() || modelId,
      provider,
      logo_url: this.getLogoUrl(provider),
    };
  },
};
