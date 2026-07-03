/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
const mockGetUser = jest.fn();
const mockGetSession = jest.fn();
const mockFrom = jest.fn();
const mockUseSettingsStore = jest.fn((selector: any) => selector({ syncEnabled: true }));

jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: any[]) => mockGetUser(...args),
      getSession: (...args: any[]) => mockGetSession(...args),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

jest.mock('./settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ syncEnabled: mockUseSettingsStore((state: any) => state).syncEnabled }),
  },
}));

jest.mock('../services/widgetService', () => ({
  syncStatsToWidget: jest.fn(() => Promise.resolve()),
}));

describe('mobile notes store sync behavior', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockUseSettingsStore.mockImplementation((selector: any) => selector({ syncEnabled: true }));
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockReturnValue({
      upsert: jest.fn(() => Promise.resolve({ error: null })),
      update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })) })),
      select: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: [], error: null })) })),
    });
  });

  it('creates Supabase-compatible UUID note ids', async () => {
    const { useNotesStore } = require('./notesStore');

    const id = await useNotesStore.getState().addNote({
      title: 'Mobile',
      content: 'Content',
      is_favorite: false,
      is_locked: false,
      badges: [],
    });

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('does not sync with Supabase when sync is disabled', async () => {
    mockUseSettingsStore.mockImplementation((selector: any) => selector({ syncEnabled: false }));
    const { useNotesStore } = require('./notesStore');

    await useNotesStore.getState().syncWithCloud();

    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('creates a local tombstone when deleting a cloud-backed note', () => {
    const { useNotesStore } = require('./notesStore');
    useNotesStore.setState({
      notes: {
        'note-cloud': {
          id: 'note-cloud',
          title: 'Cloud',
          content: 'Content',
          user_id: 'user-1',
          is_favorite: false,
          is_locked: false,
          badges: [],
          created_at: '2026-06-29T10:00:00Z',
          updated_at: '2026-06-29T10:00:00Z',
          _status: 'synced',
        },
      },
      pendingDeletions: [],
      isSyncing: true,
    });

    useNotesStore.getState().deleteNote('note-cloud');

    const deleted = useNotesStore.getState().notes['note-cloud'];
    expect(deleted.deleted_at).toBeTruthy();
    expect(deleted._status).toBe('deleted');
    expect(useNotesStore.getState().pendingDeletions).toContain('note-cloud');
  });

  it('keeps unsynced tags and status when Supabase upsert fails', async () => {
    const upsert = jest.fn(() => Promise.resolve({ error: { message: 'network' } }));
    mockFrom.mockReturnValue({
      upsert,
      update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })) })),
      select: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: [], error: null })) })),
    });

    const { useNotesStore } = require('./notesStore');
    useNotesStore.setState({
      notes: {
        'note-local': {
          id: 'note-local',
          title: 'Local',
          content: 'Content',
          user_id: 'user-1',
          is_favorite: false,
          is_locked: false,
          tags: [{ id: 'desktop', label: 'Desktop' }],
          badges: ['Desktop'],
          created_at: '2026-06-29T10:00:00Z',
          updated_at: '2026-06-29T10:00:00Z',
          _status: 'created',
        },
      },
      lastSyncAt: null,
      isSyncing: false,
      pendingDeletions: [],
    });

    await useNotesStore.getState().syncWithCloud();

    const note = useNotesStore.getState().notes['note-local'];
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      tags: [expect.objectContaining({ id: 'desktop', label: 'Desktop' })],
      badges: ['Desktop'],
    }), { onConflict: 'id' });
    expect(note._status).toBe('created');
    expect(note.tags).toEqual([expect.objectContaining({ id: 'desktop', label: 'Desktop' })]);
    expect(useNotesStore.getState().lastSyncAt).toBeNull();
  });
});
