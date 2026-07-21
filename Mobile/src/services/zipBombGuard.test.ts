import { assertSafeZipBytes } from './zipBombGuard';
import { utf8ToBytes } from '@noble/hashes/utils';

function makeZipHeader(name: string, compressedSize: number, uncompressedSize: number) {
  const nameBytes = utf8ToBytes(name);
  const bytes = new Uint8Array(30 + nameBytes.length + compressedSize);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint32(18, compressedSize, true);
  view.setUint32(22, uncompressedSize, true);
  view.setUint16(26, nameBytes.length, true);
  bytes.set(nameBytes, 30);
  return bytes;
}

describe('mobile zip bomb guard', () => {
  it('rejects abusive compression ratios', () => {
    expect(() => assertSafeZipBytes(
      makeZipHeader('bomb.txt', 1, 10_000),
      { maxCompressionRatio: 100 },
    )).toThrow('ARCHIVE_COMPRESSION_RATIO_EXCEEDED');
  });

  it('rejects nested archives before upload', () => {
    expect(() => assertSafeZipBytes(makeZipHeader('nested.zip', 20, 20)))
      .toThrow('NESTED_ARCHIVE_REJECTED');
  });
});
