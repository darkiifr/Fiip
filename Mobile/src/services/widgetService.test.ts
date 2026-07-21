import { __private__ } from './widgetService';

describe('mobile widget service', () => {
  it('builds a widget snapshot from active notes', () => {
    const stats = __private__.buildWidgetStats([
      {
        title: 'Ancienne note',
        content: 'ignoree',
        is_favorite: false,
        is_locked: false,
        updated_at: '2026-07-18T10:00:00Z',
      },
      {
        title: 'Note recente',
        content: 'Contenu visible dans le widget',
        is_favorite: true,
        is_locked: true,
        attachments: [{ id: 'file-1' }],
        updated_at: '2026-07-21T10:00:00Z',
      },
      {
        title: 'Supprimee',
        content: 'hors stats',
        is_favorite: true,
        deleted_at: '2026-07-21T11:00:00Z',
        updated_at: '2026-07-21T11:00:00Z',
      },
    ]);

    expect(stats).toMatchObject({
      totalNotes: 2,
      totalFavorites: 1,
      lockedNotes: 1,
      attachmentNotes: 1,
      recentNoteTitle: 'Note recente',
      recentNoteContent: 'Contenu visible dans le widget',
      recentNoteUpdatedAt: '2026-07-21T10:00:00Z',
    });
  });
});
