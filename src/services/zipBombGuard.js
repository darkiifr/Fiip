const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;

function readUInt32(view, offset) {
  return view.getUint32(offset, true);
}

function readUInt16(view, offset) {
  return view.getUint16(offset, true);
}

export async function assertSafeArchive(file, {
  maxCompressionRatio = 100,
  maxUncompressedBytes = 512 * 1024 * 1024,
  maxEntries = 10000,
  maxNestedDepth = 2,
  depth = 0,
} = {}) {
  const name = String(file?.name || '').toLowerCase();
  if (!name.endsWith('.zip')) {return true;}
  if (depth > maxNestedDepth) {throw new Error('ARCHIVE_DEPTH_EXCEEDED');}

  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  let offset = 0;
  let entries = 0;
  let uncompressedTotal = 0;
  let compressedTotal = 0;

  while (offset + 30 <= view.byteLength) {
    const signature = readUInt32(view, offset);
    if (signature === ZIP_CENTRAL_DIRECTORY_HEADER) {break;}
    if (signature !== ZIP_LOCAL_FILE_HEADER) {
      offset += 1;
      continue;
    }

    const compressedSize = readUInt32(view, offset + 18);
    const uncompressedSize = readUInt32(view, offset + 22);
    const fileNameLength = readUInt16(view, offset + 26);
    const extraLength = readUInt16(view, offset + 28);
    const fileNameStart = offset + 30;
    const entryName = new TextDecoder()
      .decode(new Uint8Array(buffer, fileNameStart, fileNameLength))
      .toLowerCase();
    entries += 1;
    compressedTotal += compressedSize;
    uncompressedTotal += uncompressedSize;

    if (entries > maxEntries) {throw new Error('ARCHIVE_ENTRY_LIMIT_EXCEEDED');}
    if (entryName.endsWith('.zip')) {throw new Error('NESTED_ARCHIVE_REJECTED');}
    if (uncompressedTotal > maxUncompressedBytes) {throw new Error('ARCHIVE_UNCOMPRESSED_LIMIT_EXCEEDED');}
    if (compressedTotal > 0 && uncompressedTotal / compressedTotal > maxCompressionRatio) {
      throw new Error('ARCHIVE_COMPRESSION_RATIO_EXCEEDED');
    }

    offset += 30 + fileNameLength + extraLength + compressedSize;
  }

  return true;
}
