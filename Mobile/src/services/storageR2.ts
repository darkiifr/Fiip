import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, bytesToUtf8, utf8ToBytes } from '@noble/hashes/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { fromByteArray, toByteArray } from 'base64-js';
import ReactNativeBlobUtil from 'react-native-blob-util';
import RNFS from 'react-native-fs';

import { supabase } from './supabase';
import {
  decryptSensitiveBytes,
  encryptSensitiveBytes,
  encryptSensitiveJson,
} from './zeroKnowledge';
import { assertSafeArchive } from './zipBombGuard';

const REQUEST_TIMEOUT_MS = 30_000;
const CACHE_DIRECTORY = `${RNFS.CachesDirectoryPath}/fiip-r2`;
const UPLOAD_QUEUE_KEY = 'fiip-r2-upload-queue-v1';
let queueProcessing = false;

type LocalFile = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs = REQUEST_TIMEOUT_MS) {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('R2_REQUEST_TIMEOUT')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

async function ensureCacheDirectory() {
  if (!await RNFS.exists(CACHE_DIRECTORY)) {
    await RNFS.mkdir(CACHE_DIRECTORY);
  }
}

async function invokeFunction(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data;
}

function localPath(uri: string) {
  return decodeURIComponent(uri.replace(/^file:\/\//, ''));
}

async function readQueue(): Promise<Array<LocalFile & { noteId?: string; queueId: string }>> {
  try {
    return JSON.parse(await AsyncStorage.getItem(UPLOAD_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

async function writeQueue(queue: Array<LocalFile & { noteId?: string; queueId: string }>) {
  await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
}

async function enqueueUpload(file: LocalFile, noteId?: string) {
  await ensureCacheDirectory();
  const queueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const queuedPath = `${CACHE_DIRECTORY}/${queueId}.queued`;
  await RNFS.copyFile(localPath(file.uri), queuedPath);
  const queue = await readQueue();
  queue.push({ ...file, uri: `file://${queuedPath}`, noteId, queueId });
  await writeQueue(queue);
  return { queued: true, queueId };
}

export async function processUploadQueue() {
  if (queueProcessing) return;
  queueProcessing = true;
  try {
    const queue = await readQueue();
    const pending = [];
    for (const item of queue) {
      try {
        await uploadFile(item, item.noteId, false);
        const queuedPath = localPath(item.uri);
        if (await RNFS.exists(queuedPath)) await RNFS.unlink(queuedPath);
      } catch {
        pending.push(item);
      }
    }
    await writeQueue(pending);
  } finally {
    queueProcessing = false;
  }
}

export async function uploadFile(file: LocalFile, noteId?: string, queueOnOffline = true) {
  const size = Number(file.size || 0);
  if (!size) throw new Error('INVALID_FILE_SIZE');
  await assertSafeArchive(file.uri, file.name);
  if (queueOnOffline) {
    const network = await NetInfo.fetch();
    if (!network.isConnected) return enqueueUpload(file, noteId);
  }

  const sourcePath = localPath(file.uri);
  const plainBase64 = await RNFS.readFile(sourcePath, 'base64');
  const encryptedEnvelope = await encryptSensitiveBytes(toByteArray(plainBase64));
  const encryptedBytes = utf8ToBytes(encryptedEnvelope);
  const encryptedFileName = await encryptSensitiveJson({
    name: file.name,
    type: file.type,
  });

  const upload = await invokeFunction('generate-upload-url', {
    noteId,
    fileType: 'application/octet-stream',
    encryptedFileName,
    fileSize: encryptedBytes.byteLength,
  });

  await ensureCacheDirectory();
  const encryptedPath = `${CACHE_DIRECTORY}/${upload.fileId}.encrypted`;
  await RNFS.writeFile(encryptedPath, fromByteArray(encryptedBytes), 'base64');

  try {
    const response = await withTimeout(ReactNativeBlobUtil.fetch(
      'PUT',
      upload.uploadUrl,
      { 'Content-Type': 'application/octet-stream' },
      ReactNativeBlobUtil.wrap(encryptedPath),
    ));
    if (response.info().status < 200 || response.info().status >= 300) {
      throw new Error(`R2_UPLOAD_FAILED_${response.info().status}`);
    }

    const confirmed = await invokeFunction('confirm-upload', {
      fileId: upload.fileId,
      checksum: bytesToHex(sha256(encryptedBytes)),
    });
    const cachedPath = `${CACHE_DIRECTORY}/${upload.fileId}.plain`;
    await RNFS.copyFile(sourcePath, cachedPath);
    return { ...confirmed.file, localPath: cachedPath };
  } catch (error) {
    if (queueOnOffline) {
      const network = await NetInfo.fetch();
      if (!network.isConnected) return enqueueUpload(file, noteId);
    }
    throw error;
  } finally {
    if (await RNFS.exists(encryptedPath)) await RNFS.unlink(encryptedPath);
  }
}

NetInfo.addEventListener((state) => {
  if (state.isConnected) void processUploadQueue();
});

export async function getFileUrl(fileId: string) {
  const data = await invokeFunction('generate-download-url', { fileId });
  return data.downloadUrl as string;
}

export async function downloadFile(fileId: string) {
  await ensureCacheDirectory();
  const cachedPath = `${CACHE_DIRECTORY}/${fileId}.plain`;
  if (await RNFS.exists(cachedPath)) return cachedPath;

  const encryptedPath = `${CACHE_DIRECTORY}/${fileId}.download`;
  const url = await getFileUrl(fileId);
  try {
    const response = await withTimeout(
      ReactNativeBlobUtil.config({ path: encryptedPath, fileCache: false }).fetch('GET', url),
    );
    if (response.info().status < 200 || response.info().status >= 300) {
      throw new Error(`R2_DOWNLOAD_FAILED_${response.info().status}`);
    }

    const encryptedBase64 = await RNFS.readFile(encryptedPath, 'base64');
    const encryptedEnvelope = bytesToUtf8(toByteArray(encryptedBase64));
    const plainBytes = await decryptSensitiveBytes(encryptedEnvelope);
    await RNFS.writeFile(cachedPath, fromByteArray(plainBytes), 'base64');
    return cachedPath;
  } finally {
    if (await RNFS.exists(encryptedPath)) await RNFS.unlink(encryptedPath);
  }
}
