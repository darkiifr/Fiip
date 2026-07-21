import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearPendingNoteSync,
  getCloudQuotaState,
  getPendingNoteSync,
  queuePendingNoteSync,
  syncNotesNow,
} from './noteSync';

describe('noteSync', () => {
  beforeEach(() => {
    const store = new Map();
    const memoryStorage = {
      getItem: vi.fn((key) => store.get(key) ?? null),
      setItem: vi.fn((key, value) => store.set(key, String(value))),
      removeItem: vi.fn((key) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    };
    Object.defineProperty(window, 'localStorage', {
      value: memoryStorage,
      configurable: true,
    });
    vi.stubGlobal('localStorage', memoryStorage);
    localStorage.clear();
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => '11111111-1111-4111-8111-111111111111'),
    });
  });

  it('queues failed cloud saves and reports pending changes', async () => {
    const note = { id: '22222222-2222-4222-8222-222222222222', title: 'Local', content: 'Body', updatedAt: 10 };
    const dataService = {
      fetchNotes: vi.fn().mockResolvedValue({ data: [], error: null }),
      saveNote: vi.fn().mockResolvedValue({ error: 'offline' }),
    };
    const authService = {
      getUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
    };

    const result = await syncNotesNow({
      localNotes: [note],
      settings: { cloudSync: true },
      dataService,
      authService,
    });

    expect(result.pendingCount).toBe(1);
    expect(getPendingNoteSync()).toEqual([expect.objectContaining({ id: note.id })]);
  });

  it('keeps quota-rejected notes local and exposes the blocked state', async () => {
    const note = { id: '22222222-2222-4222-8222-222222222222', title: 'Local', updatedAt: 10 };
    const dataService = {
      fetchNotes: vi.fn().mockResolvedValue({ data: [], error: null }),
      saveNote: vi.fn().mockResolvedValue({ error: { message: 'NOTE_STORAGE_LIMIT_EXCEEDED' } }),
    };

    const result = await syncNotesNow({
      localNotes: [note],
      settings: { cloudSync: true },
      dataService,
      authService: { getUser: vi.fn().mockResolvedValue({ id: 'user-1' }) },
    });

    expect(result.quotaBlocked).toBe(true);
    expect(result.pendingCount).toBe(1);
    expect(getCloudQuotaState()).toMatchObject({ blocked: true });
  });

  it('migrates legacy local note ids before cloud sync', async () => {
    const note = { id: '1', title: 'Legacy', content: 'Body', updatedAt: 20 };
    const dataService = {
      fetchNotes: vi.fn().mockResolvedValue({ data: [], error: null }),
      saveNote: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };
    const authService = {
      getUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
    };

    const result = await syncNotesNow({
      localNotes: [note],
      settings: { cloudSync: true },
      dataService,
      authService,
    });

    expect(dataService.saveNote).toHaveBeenCalledWith(expect.objectContaining({
      id: '11111111-1111-4111-8111-111111111111',
    }));
    expect(result.notes[0].id).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('does not contact the cloud when cloud sync is disabled', async () => {
    queuePendingNoteSync({ id: 'note-1', updatedAt: 1 });
    const dataService = {
      fetchNotes: vi.fn(),
      saveNote: vi.fn(),
    };
    const authService = {
      getUser: vi.fn(),
    };

    const result = await syncNotesNow({
      localNotes: [{ id: 'note-1', updatedAt: 1 }],
      settings: { cloudSync: false },
      dataService,
      authService,
    });

    expect(result.pendingCount).toBe(1);
    expect(dataService.fetchNotes).not.toHaveBeenCalled();
    expect(authService.getUser).not.toHaveBeenCalled();
  });

  it('clears pending queue after a successful retry', async () => {
    queuePendingNoteSync({ id: '33333333-3333-4333-8333-333333333333', title: 'Queued', updatedAt: 1 });
    const dataService = {
      fetchNotes: vi.fn().mockResolvedValue({ data: [], error: null }),
      saveNote: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };
    const authService = {
      getUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
    };

    const result = await syncNotesNow({
      localNotes: [],
      settings: { cloudSync: true },
      dataService,
      authService,
    });

    expect(result.pendingCount).toBe(0);
    expect(getPendingNoteSync()).toEqual([]);

    clearPendingNoteSync();
  });
});
