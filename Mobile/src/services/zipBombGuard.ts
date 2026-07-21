import RNFS from 'react-native-fs';
import { toByteArray } from 'base64-js';
import { bytesToUtf8 } from '@noble/hashes/utils';

const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;

export function assertSafeZipBytes(bytes: Uint8Array, {
  maxCompressionRatio = 100,
  maxUncompressedBytes = 512 * 1024 * 1024,
  maxEntries = 10_000,
} = {}) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  let entries = 0;
  let compressedTotal = 0;
  let uncompressedTotal = 0;

  while (offset + 30 <= view.byteLength) {
    const signature = view.getUint32(offset, true);
    if (signature === ZIP_CENTRAL_DIRECTORY_HEADER) break;
    if (signature !== ZIP_LOCAL_FILE_HEADER) {
      offset += 1;
      continue;
    }

    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    const fileName = bytesToUtf8(bytes.slice(nameStart, nameEnd)).toLowerCase();

    entries += 1;
    compressedTotal += compressedSize;
    uncompressedTotal += uncompressedSize;
    if (fileName.endsWith('.zip')) throw new Error('NESTED_ARCHIVE_REJECTED');
    if (entries > maxEntries) throw new Error('ARCHIVE_ENTRY_LIMIT_EXCEEDED');
    if (uncompressedTotal > maxUncompressedBytes) {
      throw new Error('ARCHIVE_UNCOMPRESSED_LIMIT_EXCEEDED');
    }
    if (compressedTotal > 0 && uncompressedTotal / compressedTotal > maxCompressionRatio) {
      throw new Error('ARCHIVE_COMPRESSION_RATIO_EXCEEDED');
    }

    offset = nameEnd + extraLength + compressedSize;
  }
}

export async function assertSafeArchive(uri: string, fileName: string) {
  if (!fileName.toLowerCase().endsWith('.zip')) return;
  const path = uri.replace(/^file:\/\//, '');
  const base64 = await RNFS.readFile(path, 'base64');
  assertSafeZipBytes(toByteArray(base64));
}
