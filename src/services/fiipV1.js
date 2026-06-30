import DOMPurify from 'dompurify';

import { classifyAttachment } from './attachmentCache';
import { normalizeNoteTags, serializeNoteTags, slugifyTagLabel } from '../utils/noteTags';

export const DEFAULT_NOTEBOOK_ID = 'all-notes';

export const PROTECTED_BLOCKED_ACTIONS = new Set([
  'search',
  'ai',
  'ocr-sync',
  'public-share',
  'collaboration',
]);

export function nowIso() {
  return new Date().toISOString();
}

export function stripHtml(value = '') {
  if (!value) return '';
  return DOMPurify.sanitize(String(value), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function normalizeNotebook(input = {}) {
  const id = String(input.id || input.notebook_id || DEFAULT_NOTEBOOK_ID).trim() || DEFAULT_NOTEBOOK_ID;
  const name = String(input.name || input.title || '').trim() || 'Toutes les notes';
  const createdAt = input.created_at || input.createdAt || nowIso();
  const updatedAt = input.updated_at || input.updatedAt || createdAt;

  return {
    id,
    user_id: input.user_id || input.userId || null,
    name,
    color: input.color || '#D97706',
    sort_order: Number(input.sort_order || input.sortOrder || 0),
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: input.deleted_at || input.deletedAt || null,
  };
}

export function getNotebookIdFromNav(activeNav = '') {
  if (typeof activeNav !== 'string' || !activeNav.startsWith('notebook:')) {
    return DEFAULT_NOTEBOOK_ID;
  }

  const notebookId = activeNav.slice('notebook:'.length).trim();
  return notebookId || DEFAULT_NOTEBOOK_ID;
}

export function isNotebookNav(activeNav = '') {
  return getNotebookIdFromNav(activeNav) !== DEFAULT_NOTEBOOK_ID;
}

export function createNoteDraft({
  id = crypto.randomUUID(),
  title = '',
  content = '',
  activeNav = 'home',
  notebookId,
  now = Date.now(),
  defaultTitle = 'Nouvelle Note',
} = {}) {
  const targetNotebookId = notebookId || getNotebookIdFromNav(activeNav);
  const inNotebook = targetNotebookId !== DEFAULT_NOTEBOOK_ID;

  return {
    id,
    title: title || defaultTitle,
    content: content || '',
    updatedAt: now,
    createdAt: now,
    favorite: false,
    deleted: false,
    tags: [],
    notebookId: targetNotebookId,
    notebook_id: inNotebook ? targetNotebookId : null,
    folder_id: inNotebook ? targetNotebookId : null,
  };
}

export function normalizeAttachment(input = {}, noteId = '') {
  const meta = classifyAttachment({ name: input.name, mimeType: input.mimeType || input.mime_type });
  return {
    id: input.id || crypto.randomUUID(),
    note_id: input.note_id || input.noteId || noteId || null,
    name: input.name || 'fichier',
    type: input.type || input.kind || meta.kind,
    mimeType: input.mimeType || input.mime_type || '',
    size: Number(input.size || 0),
    path: input.path || input.storage_path || input.cachePath || '',
    cachePath: input.cachePath || input.cache_path || '',
    url: input.url || input.publicUrl || '',
    previewable: input.previewable ?? meta.previewable,
    ocrText: input.ocrText || input.ocr_text || '',
    createdAt: input.createdAt || input.created_at || nowIso(),
  };
}

export function normalizeNoteForV1(input = {}) {
  const createdAt = input.createdAt || input.created_at || nowIso();
  const updatedAt = input.updatedAt || input.updated_at || createdAt;
  const security = input.security || {};
  const isProtected = Boolean(
    input.isProtected ||
    input.is_locked ||
    input.encrypted_content ||
    security.protected ||
    security.locked
  );
  const locked = Boolean(security.locked ?? input.is_locked ?? isProtected);

  return {
    ...input,
    id: input.id || crypto.randomUUID(),
    user_id: input.user_id || input.userId || null,
    title: input.title || '',
    content: input.content || '',
    encryptedContent: input.encryptedContent || input.encrypted_content || null,
    notebookId: input.notebookId || input.notebook_id || input.folder_id || DEFAULT_NOTEBOOK_ID,
    tags: serializeNoteTags(normalizeNoteTags(input.tags || [])),
    attachments: (input.attachments || []).map((attachment) => normalizeAttachment(attachment, input.id)),
    favorite: Boolean(input.favorite ?? input.is_favorite),
    is_favorite: Boolean(input.is_favorite ?? input.favorite),
    deleted: Boolean(input.deleted || input.deleted_at),
    deleted_at: input.deleted_at || input.deletedAt || null,
    public_slug: input.public_slug || null,
    shared: Boolean(input.shared),
    createdAt: typeof createdAt === 'number' ? createdAt : Date.parse(createdAt) || Date.now(),
    updatedAt: typeof updatedAt === 'number' ? updatedAt : Date.parse(updatedAt) || Date.now(),
    created_at: typeof createdAt === 'string' ? createdAt : new Date(createdAt).toISOString(),
    updated_at: typeof updatedAt === 'string' ? updatedAt : new Date(updatedAt).toISOString(),
    syncStatus: input.syncStatus || input._status || 'synced',
    conflictOf: input.conflictOf || input.conflict_of || null,
    isProtected,
    is_locked: locked,
    security: {
      protected: isProtected,
      locked,
      algorithm: security.algorithm || (isProtected ? 'AES-GCM-256' : null),
      hint: security.hint || input.password_hint || '',
    },
  };
}

export function canUseNoteContent(note, action = 'search') {
  const normalized = normalizeNoteForV1(note);
  if (!normalized.isProtected) return true;
  if (!PROTECTED_BLOCKED_ACTIONS.has(action)) return true;
  return normalized.security.locked === false && action !== 'public-share' && action !== 'collaboration';
}

export function createTask(input = {}) {
  const createdAt = input.created_at || input.createdAt || nowIso();
  const updatedAt = input.updated_at || input.updatedAt || createdAt;
  return {
    id: input.id || crypto.randomUUID(),
    note_id: input.note_id || input.noteId || null,
    title: String(input.title || '').trim() || 'Nouvelle tache',
    status: input.status || 'open',
    priority: input.priority || 'normal',
    due_at: input.due_at || input.dueAt || null,
    reminder_at: input.reminder_at || input.reminderAt || null,
    source_block_id: input.source_block_id || input.sourceBlockId || null,
    created_at: createdAt,
    updated_at: updatedAt,
    completed_at: input.completed_at || input.completedAt || null,
  };
}

export function getDueTasks(tasks = [], { now = new Date(), includeOverdue = true } = {}) {
  const nowTime = now.getTime();
  return tasks
    .map(createTask)
    .filter((task) => task.status !== 'done' && task.due_at)
    .filter((task) => includeOverdue ? Date.parse(task.due_at) <= nowTime : Date.parse(task.due_at) === nowTime)
    .sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at));
}

export function buildSearchIndexEntry(noteInput, { tasks = [], attachmentTexts = [], ocrStatus = 'pending' } = {}) {
  const note = normalizeNoteForV1(noteInput);
  const syncable = canUseNoteContent(note, 'search');
  const tagText = normalizeNoteTags(note.tags).map((tag) => tag.label).join(' ');
  const taskText = tasks
    .map(createTask)
    .filter((task) => task.note_id === note.id)
    .map((task) => task.title)
    .join(' ');
  const attachmentText = attachmentTexts
    .map((item) => item?.text || '')
    .join(' ');
  const searchText = syncable
    ? [note.title, stripHtml(note.content), tagText, taskText, attachmentText].join(' ').toLowerCase().replace(/\s+/g, ' ').trim()
    : '';

  return {
    note_id: note.id,
    title: syncable ? note.title : '',
    searchText,
    syncable,
    ocrStatus,
    updated_at: nowIso(),
  };
}

export function parseAdvancedSearchQuery(raw = '') {
  const tokens = String(raw).match(/"[^"]+"|\S+/g) || [];
  const query = {
    keywords: [],
    notebook: null,
    tag: null,
    has: null,
    due: null,
    protected: null,
  };

  tokens.forEach((token) => {
    const clean = token.replace(/^"|"$/g, '');
    const [key, ...rest] = clean.split(':');
    const value = rest.join(':').trim();
    if (value && ['notebook', 'tag', 'has', 'due', 'protected'].includes(key.toLowerCase())) {
      query[key.toLowerCase()] = value.toLowerCase();
      return;
    }
    query.keywords.push(clean.toLowerCase());
  });

  return query;
}

export function filterNotesAdvanced(notes = [], query = {}, { tasks = [], now = new Date() } = {}) {
  const parsed = typeof query === 'string' ? parseAdvancedSearchQuery(query) : query;
  const dueByNote = new Map();
  getDueTasks(tasks, { now }).forEach((task) => {
    const list = dueByNote.get(task.note_id) || [];
    list.push(task);
    dueByNote.set(task.note_id, list);
  });

  return notes.map(normalizeNoteForV1).filter((note) => {
    if (note.deleted) return false;
    if (parsed.notebook && note.notebookId.toLowerCase() !== parsed.notebook) return false;
    if (parsed.tag) {
      const hasTag = normalizeNoteTags(note.tags).some((tag) => slugifyTagLabel(tag.label) === slugifyTagLabel(parsed.tag));
      if (!hasTag) return false;
    }
    if (parsed.has) {
      const hasAttachment = note.attachments.some((attachment) => (attachment.type || '').toLowerCase() === parsed.has);
      if (!hasAttachment) return false;
    }
    if (parsed.due === 'overdue' && !dueByNote.has(note.id)) return false;
    if (parsed.protected === 'true' && !note.isProtected) return false;
    if (parsed.protected === 'false' && note.isProtected) return false;
    if (parsed.keywords?.length) {
      const searchable = [note.title, stripHtml(note.content), normalizeNoteTags(note.tags).map((tag) => tag.label).join(' ')].join(' ').toLowerCase();
      return parsed.keywords.every((keyword) => searchable.includes(keyword));
    }
    return true;
  });
}

function sanitizeUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function sanitizeClipperPayload(payload = {}) {
  const url = sanitizeUrl(payload.url || '');
  if (!url) {
    throw new Error('Clipper URL invalide.');
  }

  const html = DOMPurify.sanitize(String(payload.html || ''), {
    ALLOWED_TAGS: ['article', 'blockquote', 'br', 'code', 'em', 'h1', 'h2', 'h3', 'h4', 'li', 'ol', 'p', 'pre', 'strong', 'ul', 'a', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
  });

  return {
    title: String(payload.title || 'Capture web').trim().slice(0, 180) || 'Capture web',
    url,
    source: new URL(url).hostname,
    html,
    selectionText: String(payload.selectionText || '').trim().slice(0, 20000),
    images: (payload.images || []).map(sanitizeUrl).filter(Boolean).slice(0, 12),
    capturedAt: payload.capturedAt || nowIso(),
  };
}

export function defaultHomeWidgets() {
  return [
    { id: 'recent-notes', label: 'Notes recentes', enabled: true, order: 0 },
    { id: 'due-tasks', label: 'Taches a venir', enabled: true, order: 1 },
    { id: 'pinned-notes', label: 'Notes epinglees', enabled: true, order: 2 },
    { id: 'notebooks', label: 'Carnets', enabled: true, order: 3 },
    { id: 'tags', label: 'Tags', enabled: true, order: 4 },
    { id: 'sync-status', label: 'Synchronisation', enabled: true, order: 5 },
    { id: 'ai-suggestions', label: 'Suggestions IA', enabled: true, order: 6 },
  ];
}
