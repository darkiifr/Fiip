import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./keyauth', () => ({
  keyAuthService: {
    hasAIAccess: vi.fn(() => true),
  },
}));

const invokeMock = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

describe('Supabase AI proxy service', () => {
  beforeEach(() => {
    vi.resetModules();
    invokeMock.mockReset();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('calls the Supabase AI proxy and reports the model used', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        content: 'Réponse test',
        model_used: 'deepseek/deepseek-v3.2',
        usage: { total_tokens: 12, total_cost_eur: 0.00002 },
        budget: { used_eur: 0.12, limit_eur: 1.35 },
      },
      error: null,
    });
    const { generateText, getLastAIUsageStats } = await import('./ai');

    const response = await generateText('Résumé rapide', 'auto');

    expect(response).toBe('Réponse test');
    expect(invokeMock).toHaveBeenCalledWith('ai-proxy', expect.objectContaining({
      body: expect.objectContaining({
        model: 'auto',
        taskType: 'chat',
      }),
    }));
    expect(getLastAIUsageStats()).toMatchObject({
      model: 'deepseek/deepseek-v3.2',
      budget: { used_eur: 0.12 },
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('surfaces explicit budget errors from the AI proxy', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Budget IA mensuel dépassé.' },
    });

    const { generateText } = await import('./ai');

    await expect(generateText('Résumé rapide')).rejects.toThrow('Budget IA mensuel dépassé.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('reads the Edge Function response body instead of showing the generic HTTP error', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response(JSON.stringify({ error: 'Budget IA mensuel dépassé.' }), {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }),
      },
    });

    const { generateText } = await import('./ai');

    await expect(generateText('Résumé rapide')).rejects.toThrow('Budget IA mensuel dépassé.');
  });

  it('hides generic Edge Function transport errors from the user', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response('', { status: 500 }),
      },
    });

    const { generateText } = await import('./ai');

    await expect(generateText('Résumé rapide')).rejects.toThrow("L'assistant n'a pas pu répondre.");
 });

  it('lists models through the Supabase cacheable models endpoint', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        data: [
          { id: 'auto', name: 'Automatique' },
          { id: 'deepseek/deepseek-v3.2', pricing: { prompt: '0.00000014', completion: '0.00000028' } },
        ],
      },
      error: null,
    });

    const { listOpenRouterModels } = await import('./ai');
    const models = await listOpenRouterModels();

    expect(models.map((model) => model.id)).toEqual(['auto', 'deepseek/deepseek-v3.2']);
    expect(invokeMock).toHaveBeenCalledWith('ai-models-list', expect.objectContaining({
      body: { freeOnly: true },
    }));
  });

  it('uses task metadata when provided', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { content: 'Titre', model_used: 'deepseek/deepseek-v3.2' },
      error: null,
    });

    const { generateText } = await import('./ai');

    await generateText({
      taskType: 'generate_title',
      inputLength: 128,
      model: 'auto',
      messages: [{ role: 'user', content: 'Note' }],
    });

    expect(invokeMock).toHaveBeenCalledWith('ai-proxy', expect.objectContaining({
      body: expect.objectContaining({
        taskType: 'generate_title',
        inputLength: 128,
        model: 'auto',
      }),
    }));
  });
});
