import { authService, supabase } from './supabase';
import { encryptBlob, encryptSensitiveJson } from './zeroKnowledge';
import { assertSafeArchive } from './zipBombGuard';

const REQUEST_TIMEOUT_MS = 30000;
const FILE_CACHE_NAME = 'fiip-r2-attachments-v1';
const UPLOAD_QUEUE_CACHE_NAME = 'fiip-r2-upload-queue-v1';
const UPLOAD_QUEUE_KEY = 'fiip-r2-upload-queue-v1';
let processingQueue = false;

async function fetchWithTimeout(url, options = {}, ms = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function invokeFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {throw error;}
  return data;
}

async function sha256Hex(blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function readUploadQueue() {
  try {
    return JSON.parse(localStorage.getItem(UPLOAD_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeUploadQueue(queue) {
  localStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
}

async function queueEncryptedUpload(encryptedFile, metadata) {
  if (typeof caches === 'undefined') {throw new Error('OFFLINE_CACHE_UNAVAILABLE');}
  const queueId = crypto.randomUUID();
  const queueCache = await caches.open(UPLOAD_QUEUE_CACHE_NAME);
  await queueCache.put(`https://fiip.local/upload-queue/${queueId}`, new Response(encryptedFile));
  writeUploadQueue([...readUploadQueue(), { queueId, ...metadata }]);
  return { queued: true, queueId };
}

async function performEncryptedUpload(encryptedFile, metadata, cache = true) {
  const upload = await invokeFunction('generate-upload-url', metadata);
  const response = await fetchWithTimeout(upload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: encryptedFile,
  });
  if (!response.ok) {throw new Error(`R2_UPLOAD_FAILED_${response.status}`);}

  const checksum = await sha256Hex(encryptedFile);
  const confirmed = await invokeFunction('confirm-upload', { fileId: upload.fileId, checksum });
  if (cache && typeof caches !== 'undefined') {
    const localCache = await caches.open(FILE_CACHE_NAME);
    await localCache.put(`https://fiip.local/files/${upload.fileId}`, new Response(encryptedFile));
  }
  return confirmed.file;
}

export async function uploadFile(file, { noteId = null, passphrase, cache = true } = {}) {
  const user = await authService.getUser();
  if (!user) {throw new Error('Not authenticated');}
  await assertSafeArchive(file);

  const encryptedFile = await encryptBlob(file, passphrase);
  const encryptedFileName = await encryptSensitiveJson({ name: file.name, lastModified: file.lastModified }, passphrase);
  const metadata = {
    noteId,
    fileType: 'application/octet-stream',
    encryptedFileName,
    fileSize: encryptedFile.size,
  };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return queueEncryptedUpload(encryptedFile, metadata);
  }
  try {
    return await performEncryptedUpload(encryptedFile, metadata, cache);
  } catch (error) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return queueEncryptedUpload(encryptedFile, metadata);
    }
    throw error;
  }
}

export async function getFileUrl(fileId) {
  const data = await invokeFunction('generate-download-url', { fileId });
  return data.downloadUrl;
}

export async function downloadEncryptedFile(fileId) {
  if (typeof caches !== 'undefined') {
    const localCache = await caches.open(FILE_CACHE_NAME);
    const cached = await localCache.match(`https://fiip.local/files/${fileId}`);
    if (cached) {return cached.blob();}
  }
  const url = await getFileUrl(fileId);
  const response = await fetchWithTimeout(url);
  if (!response.ok) {throw new Error(`R2_DOWNLOAD_FAILED_${response.status}`);}
  return response.blob();
}

export async function processUploadQueue() {
  if (processingQueue || typeof caches === 'undefined') {return;}
  processingQueue = true;
  try {
    const queueCache = await caches.open(UPLOAD_QUEUE_CACHE_NAME);
    const pending = [];
    for (const item of readUploadQueue()) {
      const cacheKey = `https://fiip.local/upload-queue/${item.queueId}`;
      const cached = await queueCache.match(cacheKey);
      if (!cached) {continue;}
      try {
        await performEncryptedUpload(await cached.blob(), {
          noteId: item.noteId,
          fileType: item.fileType,
          encryptedFileName: item.encryptedFileName,
          fileSize: item.fileSize,
        });
        await queueCache.delete(cacheKey);
      } catch {
        pending.push(item);
      }
    }
    writeUploadQueue(pending);
  } finally {
    processingQueue = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processUploadQueue().catch((error) => console.warn('Queued R2 upload failed:', error));
  });
}
