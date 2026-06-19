import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./keyauth', () => ({
  keyAuthService: {
    hasAIAccess: vi.fn(() => true),
  },
}));

describe('OpenRouter AI service', () => {
  beforeEach(() => {
    vi.resetModules();
    import.meta.env.VITE_OPENROUTER_KEY = 'test-openrouter-key';
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
});
