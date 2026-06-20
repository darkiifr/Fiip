import {
  BaseDirectory,
  exists,
  mkdir,
  readFile,
  readDir,
  remove,
  stat,
  writeFile,
} from '@tauri-apps/plugin-fs';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']);
const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts', 'tsx', 'jsx', 'rs', 'py', 'java', 'kt', 'swift', 'go', 'sql', 'toml', 'yaml', 'yml']);
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'rtf', 'odt']);
const SPREADSHEET_EXTENSIONS = new Set(['xls', 'xlsx', 'ods']);
const PRESENTATION_EXTENSIONS = new Set(['ppt', 'pptx', 'key', 'odp']);
const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2']);

export const ATTACHMENT_CACHE_DIR = 'attachments';

export function normalizeAttachmentName(name = '') {
  const fallback = `fichier-${Date.now()}`;
  const safe = String(name || fallback)
    .split(/[/\\]/)
    .pop()
    .replace(/[^\p{L}\p{N}._ -]+/gu, '')
    .trim()
    .replace(/\s+/g, '-');

  return safe || fallback;
}

function getExtension(name = '') {
  const match = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

export function classifyAttachment({ name = '', mimeType = '' } = {}) {
  const mime = String(mimeType || '').toLowerCase();
  const extension = getExtension(name);

  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) return { kind: 'image', extension, previewable: true };
  if (mime.startsWith('video/') || VIDEO_EXTENSIONS.has(extension)) return { kind: 'video', extension, previewable: true };
  if (mime.startsWith('audio/') || AUDIO_EXTENSIONS.has(extension)) return { kind: 'audio', extension, previewable: true };
  if (mime.startsWith('text/') || TEXT_EXTENSIONS.has(extension)) return { kind: 'text', extension, previewable: true };
  if (extension === 'pdf' || mime === 'application/pdf') return { kind: 'pdf', extension, previewable: true };
  if (DOCUMENT_EXTENSIONS.has(extension)) return { kind: 'document', extension, previewable: false };
  if (SPREADSHEET_EXTENSIONS.has(extension)) return { kind: 'spreadsheet', extension, previewable: false };
  if (PRESENTATION_EXTENSIONS.has(extension)) return { kind: 'presentation', extension, previewable: false };
  if (ARCHIVE_EXTENSIONS.has(extension)) return { kind: 'archive', extension, previewable: false };
  return { kind: 'file', extension, previewable: false };
}

export function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value <= 0) return '0 o';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** index;
  return `${Number.isInteger(amount) ? amount : amount.toFixed(1)} ${units[index]}`;
}

async function ensureAttachmentDir(noteId) {
  const dir = `${ATTACHMENT_CACHE_DIR}/${noteId || 'general'}`;
  if (!(await exists(dir, { baseDir: BaseDirectory.AppData }))) {
    await mkdir(dir, { baseDir: BaseDirectory.AppData, recursive: true });
  }
  return dir;
}

export async function cacheAttachment(file, noteId) {
  const dir = await ensureAttachmentDir(noteId);
  const safeName = normalizeAttachmentName(file.name);
  const id = crypto.randomUUID();
  const path = `${dir}/${id}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  await writeFile(path, bytes, { baseDir: BaseDirectory.AppData });

  const meta = classifyAttachment({ name: safeName, mimeType: file.type });
  return {
    id,
    name: safeName,
    mimeType: file.type || '',
    size: file.size || bytes.byteLength,
    cachePath: path,
    type: meta.kind,
    previewable: meta.previewable,
    createdAt: new Date().toISOString(),
  };
}

export async function getAttachmentPreviewUrl(attachment) {
  if (!attachment?.cachePath) {
    return attachment?.url || '';
  }

  try {
    const bytes = await readFile(attachment.cachePath, { baseDir: BaseDirectory.AppData });
    const blob = new Blob([bytes], { type: attachment.mimeType || 'application/octet-stream' });
    return URL.createObjectURL(blob);
  } catch {
    return attachment.url || '';
  }
}

async function sumDir(path) {
  if (!(await exists(path, { baseDir: BaseDirectory.AppData }))) return 0;
  const entries = await readDir(path, { baseDir: BaseDirectory.AppData });
  let total = 0;
  for (const entry of entries) {
    const childPath = `${path}/${entry.name}`;
    if (entry.isDirectory) {
      total += await sumDir(childPath);
    } else {
      const metadata = await stat(childPath, { baseDir: BaseDirectory.AppData });
      total += Number(metadata.size || entry.size || 0);
    }
  }
  return total;
}

export async function getAttachmentCacheSize() {
  try {
    return await sumDir(ATTACHMENT_CACHE_DIR);
  } catch {
    return 0;
  }
}

export async function clearAttachmentCache() {
  try {
    if (await exists(ATTACHMENT_CACHE_DIR, { baseDir: BaseDirectory.AppData })) {
      await remove(ATTACHMENT_CACHE_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
