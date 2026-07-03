import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./keyauth', () => ({
  keyAuthService: {
    hasAIAccess: vi.fn(() => true),
  },
}));

describe('OpenRouter AI service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_OPENROUTER_KEY', 'test-openrouter-key');
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'gen-test',
          choices: [{ message: { content: 'Réponse test' } }],
          usage: { total_tokens: 12 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { total_cost: 0 } }),
      });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('forces the free OpenRouter model router', async () => {
    const { FREE_MODEL_ROUTER, generateText } = await import('./ai');

    const response = await generateText('Résumé rapide');
    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);

    expect(response).toBe('Réponse test');
    expect(requestBody.model).toBe(FREE_MODEL_ROUTER);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-openrouter-key',
        }),
      }),
    );
  });

  it('rejects AI calls when the OpenRouter secret is missing', async () => {
    vi.resetModules();
    import.meta.env.VITE_OPENROUTER_KEY = '';
    global.fetch = vi.fn();

    const { generateText } = await import('./ai');

    await expect(generateText('Résumé rapide')).rejects.toThrow('VITE_OPENROUTER_KEY');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('filters OpenRouter models to free models only by default', async () => {
    vi.resetModules();
    import.meta.env.VITE_OPENROUTER_KEY = 'test-openrouter-key';
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'provider/free-model:free', pricing: { prompt: '0', completion: '0' } },
          { id: 'provider/paid-model', pricing: { prompt: '0.0001', completion: '0.0001' } },
          { id: 'provider/free-priced-model', pricing: { prompt: '0', completion: '0' } },
        ],
      }),
    });

    const { listOpenRouterModels } = await import('./ai');
    const models = await listOpenRouterModels();

    expect(models.map((model) => model.id)).toEqual([
      'provider/free-model:free',
      'provider/free-priced-model',
    ]);
  });

  it('surfaces OpenRouter 401 errors with server key context', async () => {
    vi.resetModules();
    import.meta.env.VITE_OPENROUTER_KEY = 'test-openrouter-key';
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { message: 'User not found' } }),
    });

    const { generateText } = await import('./ai');

    await expect(generateText('Résumé rapide')).rejects.toThrow(
      'Erreur OpenRouter (401): User not found. Vérifiez le secret serveur VITE_OPENROUTER_KEY',
    );
  });
});
