import { decryptSensitiveJson, encryptSensitiveJson } from './zeroKnowledge';
import { utf8ToBytes } from '@noble/hashes/utils';

type NoteRecord = Record<string, any>;
type SettingEnvelope = Record<string, { ciphertext: string; updatedAt: string }>;

function byteLength(value: string) {
  return utf8ToBytes(value).byteLength;
}

export async function encryptNoteForCloud(note: NoteRecord, { userId }: { userId?: string } = {}) {
  const encryptedContent = await encryptSensitiveJson({
    version: 1,
    title: note.title || '',
    content: note.content || '',
    attachments: note.attachments || [],
    tags: note.tags || [],
    badges: note.badges || [],
    ocrText: note.ocrText || '',
    tasks: note.tasks || [],
  });

  return {
    id: note.id,
    user_id: userId || note.user_id,
    notebook_id: note.notebookId === 'all-notes'
      ? null
      : (note.notebookId || note.notebook_id || null),
    folder_id: note.notebookId === 'all-notes'
      ? null
      : (note.notebookId || note.folder_id || null),
    title: '',
    content: '',
    attachments: [],
    tags: [],
    badges: [],
    encrypted_content: null,
    encrypted_content_v2: encryptedContent,
    encrypted_title: '',
    encrypted_ocr: '',
    password_hint: '',
    note_size_bytes: byteLength(encryptedContent),
    is_favorite: Boolean(note.favorite ?? note.is_favorite),
    is_locked: Boolean(note.isProtected ?? note.is_locked),
    deleted: Boolean(note.deleted),
    deleted_at: note.deleted_at || null,
    conflict_of: note.conflictOf || note.conflict_of || null,
    updated_at: new Date(note.updatedAt || note.updated_at || Date.now()).toISOString(),
  };
}

export async function decryptNoteFromCloud(row: NoteRecord): Promise<NoteRecord> {
  if (!row?.encrypted_content_v2) return { ...row };
  const decrypted = await decryptSensitiveJson<NoteRecord>(row.encrypted_content_v2);
  return {
    ...row,
    ...decrypted,
    favorite: Boolean(row.is_favorite),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

export async function encryptSettingsEnvelope(
  settings: Record<string, unknown> = {},
  updatedAt = new Date().toISOString(),
): Promise<SettingEnvelope> {
  const entries = await Promise.all(Object.entries(settings).map(async ([key, value]) => [
    key,
    { ciphertext: await encryptSensitiveJson({ value }), updatedAt },
  ] as const));
  return Object.fromEntries(entries);
}

export async function decryptSettingsEnvelope(envelope: SettingEnvelope | Record<string, any> = {}) {
  const entries = await Promise.all(Object.entries(envelope).map(async ([key, item]) => {
    if (!item?.ciphertext) return [key, item?.value] as const;
    const decrypted = await decryptSensitiveJson<{ value: unknown }>(item.ciphertext);
    return [key, decrypted.value] as const;
  }));
  return Object.fromEntries(entries);
}
