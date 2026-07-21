import { decryptSensitiveJson, encryptSensitiveJson } from './zeroKnowledge';

const PRIVATE_NOTE_FIELDS = [
  'title',
  'content',
  'attachments',
  'tags',
  'badges',
  'ocrText',
  'tasks',
];

function encodedSize(value) {
  return new TextEncoder().encode(String(value || '')).byteLength;
}

function privateNotePayload(note) {
  return {
    version: 1,
    title: note.title || '',
    content: note.content || '',
    attachments: note.attachments || [],
    tags: note.tags || [],
    badges: note.badges || [],
    ocrText: note.ocrText || '',
    tasks: note.tasks || [],
  };
}

export async function encryptNoteForCloud(note, { userId } = {}) {
  const encryptedContent = await encryptSensitiveJson(privateNotePayload(note));
  const payload = {
    id: note.id,
    user_id: userId || note.user_id,
    notebook_id: note.notebookId === 'all-notes' ? null : (note.notebookId || note.notebook_id || null),
    folder_id: note.notebookId === 'all-notes' ? null : (note.notebookId || note.folder_id || null),
    is_favorite: Boolean(note.favorite ?? note.is_favorite),
    is_locked: Boolean(note.isProtected ?? note.is_locked),
    deleted: Boolean(note.deleted),
    deleted_at: note.deleted_at || null,
    conflict_of: note.conflictOf || note.conflict_of || null,
    encrypted_content_v2: encryptedContent,
    encrypted_title: '',
    encrypted_ocr: '',
    note_size_bytes: encodedSize(encryptedContent),
    updated_at: new Date(note.updatedAt || note.updated_at || Date.now()).toISOString(),
  };

  for (const field of PRIVATE_NOTE_FIELDS) {
    if (field === 'title' || field === 'content') {
      payload[field] = '';
    } else if (field === 'attachments' || field === 'tags' || field === 'badges') {
      payload[field] = [];
    }
  }
  payload.encrypted_content = null;
  payload.password_hint = '';
  return payload;
}

export async function decryptNoteFromCloud(row) {
  if (!row?.encrypted_content_v2) {
    return { ...row };
  }
  const decrypted = await decryptSensitiveJson(row.encrypted_content_v2);
  return {
    ...row,
    ...decrypted,
    favorite: Boolean(row.is_favorite),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

export async function encryptSettingsEnvelope(settings = {}, updatedAt = new Date().toISOString()) {
  const entries = await Promise.all(Object.entries(settings).map(async ([key, value]) => [
    key,
    {
      ciphertext: await encryptSensitiveJson({ value }),
      updatedAt,
    },
  ]));
  return Object.fromEntries(entries);
}

export async function decryptSettingsEnvelope(envelope = {}) {
  const entries = await Promise.all(Object.entries(envelope || {}).map(async ([key, item]) => {
    if (!item?.ciphertext) {
      return [key, item?.value];
    }
    const decrypted = await decryptSensitiveJson(item.ciphertext);
    return [key, decrypted?.value];
  }));
  return Object.fromEntries(entries);
}
