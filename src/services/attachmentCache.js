import { appDataDir, join } from '@tauri-apps/api/path';
import {
  BaseDirectory,
  exists,
  mkdir,
  readFile,
  readDir,
  remove,
  stat,
  writeFile,
  readTextFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif', 'bmp', 'tif', 'tiff', 'svg']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']);
const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts', 'tsx', 'jsx', 'rs', 'py', 'java', 'kt', 'swift', 'go', 'sql', 'toml', 'yaml', 'yml']);
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'rtf', 'odt']);
const SPREADSHEET_EXTENSIONS = new Set(['xls', 'xlsx', 'ods']);
const PRESENTATION_EXTENSIONS = new Set(['ppt', 'pptx', 'key', 'odp']);
const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2']);

export const ATTACHMENT_CACHE_DIR = 'attachments';
const BROWSER_CACHE_DB = 'fiip-attachment-cache';
const BROWSER_CACHE_STORE = 'attachments';
const BROWSER_CACHE_PREFIX = 'indexeddb://attachments/';
const MEMORY_CACHE_PREFIX = 'memory://attachments/';
const memoryAttachmentCache = new Map();

function isBrowserCachePath(path = '') {
  return path.startsWith(BROWSER_CACHE_PREFIX) || path.startsWith(MEMORY_CACHE_PREFIX);
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

function canUseIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function createCacheId() {
  return globalThis.crypto?.randomUUID?.() || `attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openBrowserCacheDb() {
  if (!canUseIndexedDb()) {
    return Promise.reject(new Error('IndexedDB indisponible pour le cache local.'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BROWSER_CACHE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BROWSER_CACHE_STORE)) {
        db.createObjectStore(BROWSER_CACHE_STORE, { keyPath: 'cachePath' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Ouverture du cache local impossible.'));
  });
}

async function withBrowserCacheStore(mode, callback) {
  const db = await openBrowserCacheDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(BROWSER_CACHE_STORE, mode);
      const store = transaction.objectStore(BROWSER_CACHE_STORE);
      let settled = false;

      const finish = (value) => {
        settled = true;
        resolve(value);
      };

      Promise.resolve(callback(store, finish, reject)).catch(reject);
      transaction.oncomplete = () => {
        if (!settled) {
          resolve(undefined);
        }
      };
      transaction.onerror = () => reject(transaction.error || new Error('Cache local indisponible.'));
      transaction.onabort = () => reject(transaction.error || new Error('Cache local interrompu.'));
    });
  } finally {
    db.close();
  }
}

async function cacheAttachmentInBrowser(file, noteId) {
  const safeName = normalizeAttachmentName(file.name);
  const id = createCacheId();
  const cachePath = `${BROWSER_CACHE_PREFIX}${noteId || 'general'}/${id}-${safeName}`;
  const bytes = await file.arrayBuffer();
  const meta = classifyAttachment({ name: safeName, mimeType: file.type });

  await withBrowserCacheStore('readwrite', (store) => {
    store.put({
      cachePath,
      id,
      noteId: noteId || 'general',
      name: safeName,
      mimeType: file.type || '',
      size: file.size || bytes.byteLength,
      bytes,
      createdAt: new Date().toISOString(),
    });
  });

  return {
    id,
    name: safeName,
    mimeType: file.type || '',
    size: file.size || bytes.byteLength,
    cachePath,
    type: meta.kind,
    previewable: meta.previewable,
    createdAt: new Date().toISOString(),
  };
}

async function cacheAttachmentInMemory(file, noteId) {
  const safeName = normalizeAttachmentName(file.name);
  const id = createCacheId();
  const cachePath = `${MEMORY_CACHE_PREFIX}${noteId || 'general'}/${id}-${safeName}`;
  const bytes = await file.arrayBuffer();
  const meta = classifyAttachment({ name: safeName, mimeType: file.type });

  memoryAttachmentCache.set(cachePath, {
    cachePath,
    id,
    noteId: noteId || 'general',
    name: safeName,
    mimeType: file.type || '',
    size: file.size || bytes.byteLength,
    bytes,
    createdAt: new Date().toISOString(),
  });

  return {
    id,
    name: safeName,
    mimeType: file.type || '',
    size: file.size || bytes.byteLength,
    cachePath,
    type: meta.kind,
    previewable: meta.previewable,
    createdAt: new Date().toISOString(),
  };
}

async function readBrowserCachedAttachment(cachePath) {
  if (cachePath?.startsWith(MEMORY_CACHE_PREFIX)) {
    return memoryAttachmentCache.get(cachePath) || null;
  }
  if (!cachePath?.startsWith(BROWSER_CACHE_PREFIX)) {
    return null;
  }
  return withBrowserCacheStore('readonly', (store, resolve, reject) => {
    const request = store.get(cachePath);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Lecture du cache local impossible.'));
  });
}

async function updateBrowserCachedAttachment(cachePath, updater) {
  if (cachePath?.startsWith(MEMORY_CACHE_PREFIX)) {
    const current = memoryAttachmentCache.get(cachePath);
    if (!current) {
      return false;
    }
    memoryAttachmentCache.set(cachePath, updater(current));
    return true;
  }
  if (!cachePath?.startsWith(BROWSER_CACHE_PREFIX)) {
    return false;
  }

  return withBrowserCacheStore('readwrite', (store, resolve, reject) => {
    const request = store.get(cachePath);
    request.onsuccess = () => {
      const current = request.result;
      if (!current) {
        resolve(false);
        return;
      }
      store.put(updater(current));
      resolve(true);
    };
    request.onerror = () => reject(request.error || new Error('Mise à jour du cache local impossible.'));
  });
}

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

function getAttachmentLocalPath(attachment = {}) {
  return attachment.path || attachment.filePath || attachment.localPath || attachment.absolutePath || '';
}

export function classifyAttachment({ name = '', mimeType = '' } = {}) {
  const mime = String(mimeType || '').toLowerCase();
  const extension = getExtension(name);

  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) {return { kind: 'image', extension, previewable: true };}
  if (mime.startsWith('video/') || VIDEO_EXTENSIONS.has(extension)) {return { kind: 'video', extension, previewable: true };}
  if (mime.startsWith('audio/') || AUDIO_EXTENSIONS.has(extension)) {return { kind: 'audio', extension, previewable: true };}
  if (mime.startsWith('text/') || TEXT_EXTENSIONS.has(extension)) {return { kind: 'text', extension, previewable: true };}
  if (extension === 'pdf' || mime === 'application/pdf') {return { kind: 'pdf', extension, previewable: true };}
  if (DOCUMENT_EXTENSIONS.has(extension)) {return { kind: 'document', extension, previewable: false };}
  if (SPREADSHEET_EXTENSIONS.has(extension)) {return { kind: 'spreadsheet', extension, previewable: false };}
  if (PRESENTATION_EXTENSIONS.has(extension)) {return { kind: 'presentation', extension, previewable: false };}
  if (ARCHIVE_EXTENSIONS.has(extension)) {return { kind: 'archive', extension, previewable: false };}
  return { kind: 'file', extension, previewable: false };
}

export function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value <= 0) {return '0 o';}
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
  if (!isTauriRuntime()) {
    try {
      return await cacheAttachmentInBrowser(file, noteId);
    } catch (error) {
      console.warn('IndexedDB attachment cache failed, falling back to memory cache:', error);
      return cacheAttachmentInMemory(file, noteId);
    }
  }

  const safeName = normalizeAttachmentName(file.name);
  try {
    const dir = await ensureAttachmentDir(noteId);
    const id = createCacheId();
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
  } catch (error) {
    console.warn('Tauri attachment cache failed, falling back to browser cache:', error);
    try {
      return await cacheAttachmentInBrowser(file, noteId);
    } catch (browserError) {
      console.warn('IndexedDB attachment cache failed, falling back to memory cache:', browserError);
      return cacheAttachmentInMemory(file, noteId);
    }
  }
}

export async function resolveAttachmentCachePath(attachment) {
  if (!attachment?.cachePath) {
    return getAttachmentLocalPath(attachment);
  }
  if (isBrowserCachePath(attachment.cachePath)) {
    return attachment.cachePath;
  }
  if (!isTauriRuntime()) {
    return attachment.cachePath;
  }

  try {
    return await join(await appDataDir(), attachment.cachePath);
  } catch {
    return attachment.cachePath;
  }
}

export async function getAttachmentPreviewUrl(attachment) {
  const localPath = getAttachmentLocalPath(attachment);

  if (isBrowserCachePath(attachment?.cachePath || '')) {
    try {
      const cached = await readBrowserCachedAttachment(attachment.cachePath);
      if (!cached?.bytes) {
        return attachment.url || '';
      }
      updateBrowserCachedAttachment(attachment.cachePath, (current) => ({
        ...current,
        accessCount: Number(current.accessCount || 0) + 1,
        lastAccessedAt: new Date().toISOString(),
      })).catch(() => {});
      const blob = new Blob([cached.bytes], { type: cached.mimeType || attachment.mimeType || 'application/octet-stream' });
      return URL.createObjectURL(blob);
    } catch {
      return attachment.url || '';
    }
  }

  if (!attachment?.cachePath) {
    if (localPath && isTauriRuntime()) {
      try {
        const bytes = await readFile(localPath);
        const blob = new Blob([bytes], { type: attachment.mimeType || 'application/octet-stream' });
        return URL.createObjectURL(blob);
      } catch {
        return attachment.url || '';
      }
    }
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

function getOcrCachePath(attachment) {
  return attachment?.cachePath ? `${attachment.cachePath}.ocr.json` : '';
}

export async function readAttachmentOcrCache(attachment) {
  if (isBrowserCachePath(attachment?.cachePath || '')) {
    try {
      const cached = await readBrowserCachedAttachment(attachment.cachePath);
      const parsed = cached?.ocrCache;
      if (parsed?.version !== 1 || parsed?.attachmentId !== attachment.id) {
        return null;
      }
      return parsed.ocr || null;
    } catch {
      return null;
    }
  }

  const path = getOcrCachePath(attachment);
  if (!path) {return null;}

  try {
    if (!(await exists(path, { baseDir: BaseDirectory.AppData }))) {return null;}
    const raw = await readTextFile(path, { baseDir: BaseDirectory.AppData });
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || parsed?.attachmentId !== attachment.id) {return null;}
    return parsed.ocr || null;
  } catch {
    return null;
  }
}

export async function writeAttachmentOcrCache(attachment, ocr) {
  if (isBrowserCachePath(attachment?.cachePath || '')) {
    if (!ocr) {
      return false;
    }
    try {
      const payload = {
        version: 1,
        attachmentId: attachment.id,
        sourceName: attachment.name,
        sourceSize: attachment.size || 0,
        cachedAt: new Date().toISOString(),
        ocr,
      };
      return await updateBrowserCachedAttachment(attachment.cachePath, (current) => ({
        ...current,
        ocrCache: payload,
        updatedAt: new Date().toISOString(),
      }));
    } catch {
      return false;
    }
  }

  const path = getOcrCachePath(attachment);
  if (!path || !ocr) {return false;}

  try {
    const payload = {
      version: 1,
      attachmentId: attachment.id,
      sourceName: attachment.name,
      sourceSize: attachment.size || 0,
      cachedAt: new Date().toISOString(),
      ocr,
    };
    await writeTextFile(path, JSON.stringify(payload), { baseDir: BaseDirectory.AppData });
    return true;
  } catch {
    return false;
  }
}

async function sumDir(path) {
  if (!(await exists(path, { baseDir: BaseDirectory.AppData }))) {return 0;}
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
  if (!isTauriRuntime()) {
    try {
      const indexedDbSize = await withBrowserCacheStore('readonly', (store, resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const total = (request.result || []).reduce((sum, item) => sum + Number(item.size || item.bytes?.byteLength || 0), 0);
          resolve(total);
        };
        request.onerror = () => reject(request.error || new Error('Lecture du cache local impossible.'));
      });
      return indexedDbSize + Array.from(memoryAttachmentCache.values()).reduce((sum, item) => sum + Number(item.size || item.bytes?.byteLength || 0), 0);
    } catch {
      return Array.from(memoryAttachmentCache.values()).reduce((sum, item) => sum + Number(item.size || item.bytes?.byteLength || 0), 0);
    }
  }

  try {
    return await sumDir(ATTACHMENT_CACHE_DIR);
  } catch {
    return 0;
  }
}

export async function clearAttachmentCache() {
  if (!isTauriRuntime()) {
    try {
      await withBrowserCacheStore('readwrite', (store) => {
        store.clear();
      });
      memoryAttachmentCache.clear();
      return { success: true };
    } catch (error) {
      memoryAttachmentCache.clear();
      return { success: false, error: error.message };
    }
  }

  try {
    if (await exists(ATTACHMENT_CACHE_DIR, { baseDir: BaseDirectory.AppData })) {
      await remove(ATTACHMENT_CACHE_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
