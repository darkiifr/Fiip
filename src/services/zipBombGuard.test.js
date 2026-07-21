import { describe, expect, it } from 'vitest';

import { assertSafeArchive } from './zipBombGuard';

function makeZip(name, compressedSize = 20, uncompressedSize = 20) {
  const fileName = new TextEncoder().encode(name);
  const bytes = new Uint8Array(30 + fileName.length + compressedSize);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint32(18, compressedSize, true);
  view.setUint32(22, uncompressedSize, true);
  view.setUint16(26, fileName.length, true);
  bytes.set(fileName, 30);
  return new File([bytes], 'outer.zip', { type: 'application/zip' });
}

describe('zip bomb guard', () => {
  it('rejects nested zip entries', async () => {
    await expect(assertSafeArchive(makeZip('nested.zip'))).rejects.toThrow('NESTED_ARCHIVE_REJECTED');
  });
});
