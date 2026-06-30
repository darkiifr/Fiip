import { describe, expect, it, vi } from 'vitest';

import { sanitizeClipperPayload } from '../src/services/fiipV1.js';
import { buildDeepLinkUrl, buildSupabaseNotePayload, saveClip, sendToSupabase } from './background-helpers.js';

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

  it('builds the Supabase insert payload with source link, tags and image attachments', () => {
    const payload = buildSupabaseNotePayload(clip, {
      randomUUID: vi.fn()
        .mockReturnValueOnce('image-1')
        .mockReturnValueOnce('image-2'),
      now: () => new Date('2026-06-27T09:00:00.000Z'),
    });

    expect(payload).toMatchObject({
      title: 'Article',
      updated_at: '2026-06-27T09:00:00.000Z',
    });
    expect(payload.content).toBe('<p>Hello</p><p><a href="https://example.com/read?x=1" rel="noreferrer">Source: https://example.com/read?x=1</a></p>');
    expect(payload.tags).toEqual([{ id: 'tag-web-clip', label: 'Web clip', icon: 'Tag', color: 4 }]);
    expect(payload.attachments).toEqual([
      { id: 'image-1', name: 'capture-1', type: 'image', url: 'https://example.com/a.png', previewable: true },
      { id: 'image-2', name: 'capture-2', type: 'image', url: 'https://example.com/b.png', previewable: true },
    ]);
  });

  it('rejects non-http source URLs before fallback upload', () => {
    expect(() => buildSupabaseNotePayload({ ...clip, url: 'javascript:alert(1)' })).toThrow('Unsupported source URL.');
  });

  it('sanitizes fallback HTML before posting to Supabase', () => {
    const payload = buildSupabaseNotePayload({
      ...clip,
      html: '<p onclick="alert(1)">Hello</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
    });

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
      fetchImpl,
      storageGet: vi.fn().mockResolvedValue({
        supabaseUrl: 'https://project.supabase.co/',
        supabaseAnonKey: 'anon',
        accessToken: 'token',
      }),
      randomUUID: () => 'image-id',
      now: () => new Date('2026-06-27T09:00:00.000Z'),
    });

    expect(result).toEqual({ mode: 'supabase', data: [{ id: 'note-1' }] });
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

  it('prefers deep link and falls back to Supabase when opening Fiip fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ id: 'note-1' }]),
    });

    const result = await saveClip(clip, {
      openTab: vi.fn().mockRejectedValue(new Error('no handler')),
      fetchImpl,
      storageGet: vi.fn().mockResolvedValue({
        supabaseUrl: 'https://project.supabase.co',
        supabaseAnonKey: 'anon',
        accessToken: 'token',
      }),
      randomUUID: () => 'image-id',
      now: () => new Date('2026-06-27T09:00:00.000Z'),
    });

    expect(result.mode).toBe('supabase');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
