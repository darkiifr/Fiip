import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMaybeSingle = vi.fn();
const mockRpc = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

describe('public note Supabase security', () => {
  beforeEach(() => {
    vi.resetModules();
    mockRpc.mockClear();
    mockMaybeSingle.mockReset();
  });

  it('uses a parameterized RPC call for valid public note slugs', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    mockMaybeSingle.mockResolvedValueOnce({ data: { title: 'Note', updated_at: '2026-07-11T00:00:00Z' }, error: null });

    const { dataService } = await import('./supabase.js');
    const result = await dataService.getPublicNote('safe-note_123');

    expect(result.error).toBeNull();
    expect(mockRpc).toHaveBeenCalledWith('get_public_note_by_slug', { p_slug: 'safe-note_123' });
  });

  it('rejects SQL-injection-shaped slugs before hitting Supabase', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');

    const { dataService } = await import('./supabase.js');
    const result = await dataService.getPublicNote("'; drop table notes; --");

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe('Lien public invalide.');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
