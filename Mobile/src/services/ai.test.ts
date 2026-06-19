import { FREE_MODEL_ROUTER, generateText } from './ai';

jest.mock('@env', () => ({
  VITE_OPENROUTER_KEY: 'test-openrouter-key',
}), { virtual: true });

jest.mock('./keyauth', () => ({
  keyAuthService: {
    hasAIAccess: () => true,
  },
}));

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
});
