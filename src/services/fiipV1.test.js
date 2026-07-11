import { describe, expect, it } from 'vitest';

import {
  buildSearchIndexEntry,
  canUseNoteContent,
  createTask,
  createNoteDraft,
  defaultHomeWidgets,
  filterNotesAdvanced,
  getDueTasks,
  getNotebookIdFromNav,
  isNotebookNav,
  normalizeNotebook,
  normalizeNoteForV1,
  parseAdvancedSearchQuery,
  removeTaskById,
  sanitizeClipperPayload,
} from './fiipV1';

describe('Fiip V1 domain helpers', () => {
  it('normalizes legacy notes into the shared V1 note shape', () => {
    const note = normalizeNoteForV1({
      id: 'note-1',
      title: 'Legacy',
      content: '<p>Hello</p>',
      folder_id: 'work',
      tags: ['Projet'],
      attachments: [{
        id: 'att-1',
        name: 'doc.pdf',
        type: 'pdf',
        filePath: 'C:/tmp/doc.pdf',
        ocrStatus: 'complete',
        ocrConfidence: 91,
        ocrEngine: 'tesseract.js',
        ocrQualityScore: 86,
        ocrQualityLevel: 'high',
      }],
      deleted: false,
      updatedAt: 10,
    });

    expect(note).toMatchObject({
      id: 'note-1',
      notebookId: 'work',
      deleted: false,
      isProtected: false,
      syncStatus: 'synced',
    });
    expect(note.tags).toEqual([{ id: 'tag-projet', label: 'Projet', icon: 'Tag', color: 4 }]);
    expect(note.attachments[0]).toMatchObject({
      id: 'att-1',
      name: 'doc.pdf',
      type: 'pdf',
      filePath: 'C:/tmp/doc.pdf',
      ocrStatus: 'complete',
      ocrConfidence: 91,
      ocrEngine: 'tesseract.js',
      ocrQualityScore: 86,
      ocrQualityLevel: 'high',
    });
  });

  it('keeps protected locked notes out of search, AI, OCR sync, sharing, and collaboration', () => {
    const note = normalizeNoteForV1({
      id: 'secret',
      title: 'Secret',
      is_locked: true,
      encrypted_content: 'ENC:value',
      security: { locked: true },
    });

    expect(canUseNoteContent(note, 'search')).toBe(false);
    expect(canUseNoteContent(note, 'ai')).toBe(false);
    expect(canUseNoteContent(note, 'ocr-sync')).toBe(false);
    expect(canUseNoteContent(note, 'public-share')).toBe(false);
    expect(canUseNoteContent(note, 'collaboration')).toBe(false);
  });

  it('builds a local search index entry from note, tags, tasks, and extracted attachment text', () => {
    const note = normalizeNoteForV1({
      id: 'note-2',
      title: 'Budget',
      content: '<h1>Q2</h1><p>Recu client</p>',
      tags: ['Finance'],
    });
    const task = createTask({ noteId: note.id, title: 'Valider facture', dueAt: '2026-06-30T10:00:00.000Z' });
    const entry = buildSearchIndexEntry(note, {
      tasks: [task],
      attachmentTexts: [{ attachmentId: 'pdf-1', text: 'TVA 20%' }],
      ocrStatus: 'complete',
    });

    expect(entry.searchText).toContain('budget');
    expect(entry.searchText).toContain('finance');
    expect(entry.searchText).toContain('valider facture');
    expect(entry.searchText).toContain('tva 20%');
    expect(entry.syncable).toBe(true);
  });

  it('filters notes by keyword, notebook, tag, attachment type, and due tasks', () => {
    const notes = [
      normalizeNoteForV1({ id: 'a', title: 'Projet Alpha', notebook_id: 'work', tags: ['Client'], attachments: [{ type: 'pdf' }] }),
      normalizeNoteForV1({ id: 'b', title: 'Journal', notebook_id: 'personal', tags: ['Perso'] }),
    ];
    const tasks = [createTask({ noteId: 'a', title: 'Relancer', dueAt: '2026-06-26T08:00:00.000Z' })];
    const query = parseAdvancedSearchQuery('alpha notebook:work tag:client has:pdf due:overdue');

    expect(filterNotesAdvanced(notes, query, {
      tasks,
      now: new Date('2026-06-27T08:00:00.000Z'),
    }).map((note) => note.id)).toEqual(['a']);
  });

  it('returns sorted due tasks without completed items', () => {
    const tasks = [
      createTask({ id: 'later', noteId: 'n', title: 'Later', dueAt: '2026-06-27T08:00:00.000Z' }),
      createTask({ id: 'done', noteId: 'n', title: 'Done', dueAt: '2026-06-25T08:00:00.000Z', status: 'done' }),
      createTask({ id: 'now', noteId: 'n', title: 'Now', dueAt: '2026-06-26T08:00:00.000Z' }),
    ];

    expect(getDueTasks(tasks, { now: new Date('2026-06-26T09:00:00.000Z') }).map((task) => task.id)).toEqual(['now']);
  });

  it('removes a task by id without changing the others', () => {
    const tasks = [
      createTask({ id: 'keep', noteId: 'n', title: 'Keep' }),
      createTask({ id: 'delete', noteId: 'n', title: 'Delete' }),
    ];

    expect(removeTaskById(tasks, 'delete').map((task) => task.id)).toEqual(['keep']);
  });

  it('sanitizes extension clipper payloads and rejects unsafe urls', () => {
    const clipped = sanitizeClipperPayload({
      title: '  Page  ',
      url: 'https://example.com/a',
      html: '<h1 onclick="x()">Title</h1><script>alert(1)</script><p>Body</p>',
      selectionText: 'Quote',
      images: ['https://example.com/a.png', 'javascript:alert(1)'],
    });

    expect(clipped.title).toBe('Page');
    expect(clipped.html).not.toContain('script');
    expect(clipped.html).not.toContain('onclick');
    expect(clipped.images).toEqual(['https://example.com/a.png']);
  });

  it('provides stable defaults for notebooks and home widgets', () => {
    expect(normalizeNotebook({ name: '' }).name).toBe('Toutes les notes');
    expect(getNotebookIdFromNav('notebook:work')).toBe('work');
    expect(getNotebookIdFromNav('home')).toBe('all-notes');
    expect(getNotebookIdFromNav('notebook:')).toBe('all-notes');
    expect(isNotebookNav('notebook:work')).toBe(true);
    expect(isNotebookNav('notebook:all-notes')).toBe(false);
    expect(defaultHomeWidgets().map((widget) => widget.id)).toEqual([
      'recent-notes',
      'due-tasks',
      'pinned-notes',
      'notebooks',
      'tags',
      'sync-status',
      'ai-suggestions',
    ]);
  });

  it('creates new notes inside the active notebook when the nav targets one', () => {
    expect(createNoteDraft({
      id: 'note-1',
      title: '',
      content: 'Body',
      activeNav: 'notebook:work',
      now: 123,
      defaultTitle: 'Nouvelle Note',
    })).toMatchObject({
      id: 'note-1',
      title: 'Nouvelle Note',
      content: 'Body',
      notebookId: 'work',
      notebook_id: 'work',
      folder_id: 'work',
      createdAt: 123,
      updatedAt: 123,
    });

    expect(createNoteDraft({
      id: 'note-2',
      title: 'Inbox',
      activeNav: 'home',
      now: 456,
    })).toMatchObject({
      notebookId: 'all-notes',
      notebook_id: null,
      folder_id: null,
    });
  });
});
