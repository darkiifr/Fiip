jest.mock('@env', () => ({
  VITE_OPENROUTER_KEY: 'test-openrouter-key',
}), { virtual: true });

jest.mock('./keyauth', () => ({
  keyAuthService: {
    hasAIAccess: () => true,
  },
}));

process.env.VITE_OPENROUTER_KEY = 'test-openrouter-key';

const { FREE_MODEL_ROUTER, generateText, listOpenRouterModels } = require('./ai');

describe('mobile OpenRouter client', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'gen-1',
          usage: { prompt_tokens: 8, completion_tokens: 13 },
          choices: [{ message: { content: 'Réponse gratuite' } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { total_cost: 0 } }),
      }) as jest.Mock;
  });

  it('forces the OpenRouter free model router', async () => {
    const result = await generateText({
      messages: [{ role: 'user', content: 'Bonjour' }],
    });

    expect(result).toBe('Réponse gratuite');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining(`"model":"${FREE_MODEL_ROUTER}"`),
      }),
    );
  });

  it('filters model listings to free OpenRouter models', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'provider/free:free', pricing: { prompt: '0', completion: '0' } },
          { id: 'provider/free-priced', pricing: { prompt: '0', completion: '0' } },
          { id: 'provider/paid', pricing: { prompt: '0.01', completion: '0.01' } },
        ],
      }),
    }) as jest.Mock;

    const models = await listOpenRouterModels();

    expect(models.map((model: any) => model.id)).toEqual(['provider/free:free', 'provider/free-priced']);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer\s+\S+/),
        }),
      }),
    );
  });
});
