jest.mock('@env', () => ({
  VITE_OPENROUTER_KEY: 'test-openrouter-key',
}), { virtual: true });

jest.mock('./keyauth', () => ({
  keyAuthService: {
    hasAIAccess: () => true,
  },
}));

const mockInvoke = jest.fn();

jest.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

describe('mobile Supabase AI proxy client', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    global.fetch = jest.fn() as jest.Mock;
  });

  it('calls the Supabase AI proxy', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        content: 'Réponse proxy',
        model_used: 'deepseek/deepseek-v3.2',
        usage: { prompt_tokens: 8, completion_tokens: 13 },
      },
      error: null,
    });

    const { generateText } = require('./ai');
    const result = await generateText({
      messages: [{ role: 'user', content: 'Bonjour' }],
    });

    expect(result).toBe('Réponse proxy');
    expect(mockInvoke).toHaveBeenCalledWith('ai-proxy', expect.objectContaining({
      body: expect.objectContaining({ model: 'auto', taskType: 'chat' }),
    }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('lists models through the Supabase models endpoint', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        data: [
          { id: 'auto', name: 'Automatique' },
          { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2' },
        ],
      },
      error: null,
    });

    const { listOpenRouterModels } = require('./ai');
    const models = await listOpenRouterModels();

    expect(models.map((model: any) => model.id)).toEqual(['auto', 'deepseek/deepseek-v3.2']);
    expect(mockInvoke).toHaveBeenCalledWith('ai-models-list', expect.objectContaining({
      body: { freeOnly: true },
    }));
  });
});
