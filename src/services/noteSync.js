import { normalizeNoteForV1 } from './fiipV1';

export const PENDING_NOTE_SYNC_KEY = 'fiip-pending-note-sync';
export const CLOUD_QUOTA_STATE_KEY = 'fiip-cloud-quota-state';

const QUOTA_ERROR_PATTERN = /(?:NOTE|ATTACHMENT|STORAGE).*(?:LIMIT|QUOTA)|(?:LIMIT|QUOTA).*EXCEEDED/i;

function errorText(error) {
  if (!error) {return '';}
  if (typeof error === 'string') {return error;}
  return [error.message, error.details, error.hint, error.code]
    .filter(Boolean)
    .join(' ');
}

export function isCloudQuotaError(error) {
  return QUOTA_ERROR_PATTERN.test(errorText(error));
}

export function getCloudQuotaState() {
  try {
    return JSON.parse(localStorage.getItem(CLOUD_QUOTA_STATE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setCloudQuotaState(blocked, error = null) {
  if (!blocked) {
    localStorage.removeItem(CLOUD_QUOTA_STATE_KEY);
    return null;
  }
  const state = {
    blocked: true,
    reason: errorText(error) || 'CLOUD_QUOTA_EXCEEDED',
    detectedAt: new Date().toISOString(),
  };
  localStorage.setItem(CLOUD_QUOTA_STATE_KEY, JSON.stringify(state));
  return state;
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export function getNoteTimestamp(note) {
  return Number(note?.updatedAt || Date.parse(note?.updated_at || '') || note?.createdAt || Date.parse(note?.created_at || '') || 0);
}

function readPending() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_NOTE_SYNC_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePending(notes) {
  const deduped = new Map();
  notes.forEach((note) => {
    if (note?.id) {
      deduped.set(note.id, note);
    }
  });
  localStorage.setItem(PENDING_NOTE_SYNC_KEY, JSON.stringify(Array.from(deduped.values())));
}

export function getPendingNoteSync() {
  return readPending();
}

export function clearPendingNoteSync() {
  localStorage.removeItem(PENDING_NOTE_SYNC_KEY);
}

export function queuePendingNoteSync(note) {
  writePending([...readPending(), note]);
}

function normalizeLocalNote(note) {
  const normalized = normalizeNoteForV1(note);
  if (isUuid(normalized.id)) {
    return normalized;
  }

  return {
    ...normalized,
    id: crypto.randomUUID(),
    legacyId: normalized.id,
  };
}

function mergeNotes(localNotes, remoteNotes) {
  const notesById = new Map();
  [...localNotes, ...remoteNotes].forEach((note) => {
    const normalized = normalizeNoteForV1(note);
    const existing = notesById.get(normalized.id);
    if (!existing || getNoteTimestamp(normalized) >= getNoteTimestamp(existing)) {
      notesById.set(normalized.id, normalized);
    }
  });

  return Array.from(notesById.values()).sort((a, b) => getNoteTimestamp(b) - getNoteTimestamp(a));
}

export async function syncNotesNow({
  localNotes = [],
  settings = {},
  dataService,
  authService,
} = {}) {
  const pending = readPending();

  if (settings.cloudSync === false) {
    return { notes: localNotes, pendingCount: pending.length, error: null };
  }

  const user = await authService.getUser();
  if (!user) {
    return { notes: localNotes, pendingCount: pending.length, error: 'Not authenticated' };
  }

  const normalizedLocal = localNotes.map(normalizeLocalNote);
  const notesToPush = [...pending, ...normalizedLocal].filter((note) => note && !note.deleted_at);
  const failed = [];
  let quotaBlocked = false;

  for (const note of notesToPush) {
    const result = await dataService.saveNote(note);
    if (result?.error) {
      failed.push(note);
      if (isCloudQuotaError(result.error)) {
        quotaBlocked = true;
        setCloudQuotaState(true, result.error);
      }
    }
  }

  writePending(failed);

  if (!quotaBlocked && notesToPush.length > 0 && failed.length === 0) {
    setCloudQuotaState(false);
  }

  const { data: remoteNotes, error } = await dataService.fetchNotes();
  if (error) {
    return { notes: normalizedLocal, pendingCount: failed.length, quotaBlocked, error };
  }

  const merged = mergeNotes(normalizedLocal, remoteNotes || []);
  localStorage.setItem('fiip-last-sync-at', new Date().toISOString());
  return { notes: merged, pendingCount: failed.length, quotaBlocked, error: null };
}
