import { describe, expect, it, vi } from 'vitest';

import { sanitizeClipperPayload } from '../src/services/fiipV1.js';

import * as backgroundHelpers from './background-helpers.js';
import { buildDeepLinkUrl, buildSupabaseNotePayload, saveClip, sendToDeepLink, sendToSupabase } from './background-helpers.js';

const clip = {
  title: 'Article',
  url: 'https://example.com/read?x=1',
  html: '<p>Hello</p>',
  images: ['https://example.com/a.png', 'https://example.com/b.png'],
};

describe('Fiip extension background helpers', () => {
  it('builds a fiip deep link with the encoded clip payload', () => {
    const url = buildDeepLinkUrl(clip);
    const parsed = new URL(url);

    expect(parsed.protocol).toBe('fiip:');
    expect(parsed.hostname).toBe('clip');
    expect(JSON.parse(decodeURIComponent(parsed.searchParams.get('payload')))).toEqual(clip);
  });

  it('opens the fiip protocol in an active tab so Chrome can hand off to the app', async () => {
    const openTab = vi.fn().mockResolvedValue({});

    await sendToDeepLink(clip, { openTab });

    expect(openTab).toHaveBeenCalledWith({
      url: buildDeepLinkUrl(clip),
      active: true,
    });
  });

  it('creates a deep link payload accepted by the Fiip app clipper importer', () => {
    const url = buildDeepLinkUrl({
      ...clip,
      html: '<article><h1>Article</h1><p>Readable body</p></article>',
      selectionText: 'Readable body',
      capturedAt: '2026-06-27T09:00:00.000Z',
    });
    const parsed = new URL(url);
    const payload = JSON.parse(decodeURIComponent(parsed.searchParams.get('payload')));
    const imported = sanitizeClipperPayload(payload);

    expect(imported).toMatchObject({
      title: 'Article',
      url: 'https://example.com/read?x=1',
      source: 'example.com',
      selectionText: 'Readable body',
      capturedAt: '2026-06-27T09:00:00.000Z',
    });
    expect(imported.html).toContain('<article>');
    expect(imported.images).toEqual(['https://example.com/a.png', 'https://example.com/b.png']);
  });

  it('keeps percent signs in deep link payloads parseable by URLSearchParams', () => {
    const url = buildDeepLinkUrl({
      ...clip,
      html: '<p>Offre 50% valide</p>',
    });
    const parsed = new URL(url);
    const payload = JSON.parse(parsed.searchParams.get('payload'));

    expect(payload.html).toBe('<p>Offre 50% valide</p>');
    expect(sanitizeClipperPayload(payload).html).toContain('50% valide');
  });

  it('builds the Supabase insert payload with source link, tags and image attachments', () => {
    const payload = buildSupabaseNotePayload(clip, {
      userId: 'user-1',
      randomUUID: vi.fn()
        .mockReturnValueOnce('note-1')
        .mockReturnValueOnce('image-1')
        .mockReturnValueOnce('image-2'),
      now: () => new Date('2026-06-27T09:00:00.000Z'),
    });

    expect(payload).toMatchObject({
      title: 'Article',
      id: 'note-1',
      user_id: 'user-1',
      created_at: '2026-06-27T09:00:00.000Z',
      updated_at: '2026-06-27T09:00:00.000Z',
    });
    expect(payload.content).toBe('<p>Hello</p><p><a href="https://example.com/read?x=1" rel="noreferrer">Source: https://example.com/read?x=1</a></p>');
    expect(payload.tags).toEqual([{ id: 'tag-web-clip', label: 'Web clip', icon: 'Tag', color: 4 }]);
    expect(payload.attachments).toEqual([
      { id: 'image-1', name: 'capture-1', type: 'image', url: 'https://example.com/a.png', previewable: true },
      { id: 'image-2', name: 'capture-2', type: 'image', url: 'https://example.com/b.png', previewable: true },
    ]);
  });

  it('signs in with Supabase and stores only the normalized session locally', async () => {
    expect(typeof backgroundHelpers.signInWithPassword).toBe('function');
    const storageSet = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        user: { id: 'user-1', email: 'user@example.com' },
      }),
    });

    const result = await backgroundHelpers.signInWithPassword(
      { email: 'user@example.com', password: 'correct horse battery staple' },
      {
        config: { supabaseUrl: 'https://project.supabase.co', supabaseAnonKey: 'anon' },
        fetchImpl,
        storageSet,
        now: () => 1_000,
      },
    );

    expect(result).toEqual({ user: { id: 'user-1', email: 'user@example.com' } });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/token?grant_type=password',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ apikey: 'anon' }),
        body: JSON.stringify({ email: 'user@example.com', password: 'correct horse battery staple' }),
      }),
    );
    expect(storageSet).toHaveBeenCalledWith({
      fiipSupabaseSession: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: 3_601_000,
        user: { id: 'user-1', email: 'user@example.com' },
      },
    });
  });

  it('lets Supabase validate passwords used by existing accounts', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        user: { id: 'user-1', email: 'user@example.com' },
      }),
    });

    await expect(backgroundHelpers.signInWithPassword(
      { email: 'user@example.com', password: 'secret' },
      {
        config: { supabaseUrl: 'https://project.supabase.co', supabaseAnonKey: 'anon' },
        fetchImpl,
        storageSet: vi.fn(),
      },
    )).resolves.toMatchObject({ user: { id: 'user-1' } });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('refreshes an expired Supabase session before returning the auth state', async () => {
    expect(typeof backgroundHelpers.getAuthState).toBe('function');
    const storageSet = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        user: { id: 'user-1', email: 'user@example.com' },
      }),
    });

    const result = await backgroundHelpers.getAuthState({
      config: { supabaseUrl: 'https://project.supabase.co', supabaseAnonKey: 'anon' },
      fetchImpl,
      storageGet: vi.fn().mockResolvedValue({
        fiipSupabaseSession: {
          accessToken: 'expired',
          refreshToken: 'refresh-token',
          expiresAt: 1_500,
          user: { id: 'user-1', email: 'user@example.com' },
        },
      }),
      storageSet,
      now: () => 2_000,
    });

    expect(result).toEqual({ authenticated: true, user: { id: 'user-1', email: 'user@example.com' } });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/token?grant_type=refresh_token',
      expect.objectContaining({ body: JSON.stringify({ refresh_token: 'refresh-token' }) }),
    );
    expect(storageSet).toHaveBeenCalledTimes(1);
  });

  it('rejects non-http source URLs before fallback upload', () => {
    expect(() => buildSupabaseNotePayload({ ...clip, url: 'javascript:alert(1)' })).toThrow('Unsupported source URL.');
  });

  it('sanitizes fallback HTML before posting to Supabase', () => {
    const payload = buildSupabaseNotePayload({
      ...clip,
      html: '<p onclick="alert(1)">Hello</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
    }, { userId: 'user-1' });

    expect(payload.content).toContain('<p>Hello</p>');
    expect(payload.content).not.toContain('onclick');
    expect(payload.content).not.toContain('<script');
    expect(payload.content).not.toContain('javascript:');
  });

  it('posts to Supabase with configured credentials', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ id: 'note-1' }]),
    });

    const result = await sendToSupabase(clip, {
      config: {
        supabaseUrl: 'https://project.supabase.co/',
        supabaseAnonKey: 'anon',
      },
      fetchImpl,
      storageGet: vi.fn().mockResolvedValue({
        fiipSupabaseSession: {
          accessToken: 'token',
          refreshToken: 'refresh-token',
          expiresAt: 9_999_999_999_999,
          user: { id: 'user-1', email: 'user@example.com' },
        },
      }),
      storageSet: vi.fn(),
      randomUUID: () => 'image-id',
      now: () => new Date('2026-06-27T09:00:00.000Z'),
    });

    expect(result).toEqual({
      mode: 'supabase',
      data: [{ id: 'note-1' }],
      noteId: 'note-1',
      openUrl: 'fiip://clip?noteId=note-1',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://project.supabase.co/rest/v1/notes',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'anon',
          Authorization: 'Bearer token',
          Prefer: 'return=representation',
        }),
      }),
    );
  });

  it('saves to Supabase when authenticated and returns a short explicit Fiip link', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ id: 'note-1' }]),
    });
    const openTab = vi.fn();

    const result = await saveClip(clip, {
      openTab,
      config: { supabaseUrl: 'https://project.supabase.co', supabaseAnonKey: 'anon' },
      fetchImpl,
      storageGet: vi.fn().mockResolvedValue({
        fiipSupabaseSession: {
          accessToken: 'token',
          refreshToken: 'refresh-token',
          expiresAt: 9_999_999_999_999,
          user: { id: 'user-1', email: 'user@example.com' },
        },
      }),
      storageSet: vi.fn(),
      randomUUID: () => 'image-id',
      now: () => new Date('2026-06-27T09:00:00.000Z'),
    });

    expect(result).toEqual({
      mode: 'supabase',
      data: [{ id: 'note-1' }],
      noteId: 'note-1',
      openUrl: 'fiip://clip?noteId=note-1',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(openTab).not.toHaveBeenCalled();
  });

  it('returns a user-triggered deep link without pretending the app opened', async () => {
    const openTab = vi.fn();
    const result = await saveClip(clip, {
      openTab,
      config: { supabaseUrl: 'https://project.supabase.co', supabaseAnonKey: 'anon' },
      storageGet: vi.fn().mockResolvedValue({}),
      storageSet: vi.fn(),
    });

    expect(result).toEqual({ mode: 'deep-link', openUrl: buildDeepLinkUrl(clip) });
    expect(openTab).not.toHaveBeenCalled();
  });
});
