/**
 * CRC-32 (IEEE 802.3, polynomial 0xEDB88320) — the checksum every ZIP entry
 * carries. The platform's Compression Streams produce the deflate data but no
 * checksum, so the engine computes it itself.
 */

let table: Uint32Array | null = null;

function crcTable(): Uint32Array {
  if (table) return table;
  table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

/**
 * The CRC-32 of `data`. Pass the previous result as `crc` to continue a
 * checksum over data that arrives in pieces.
 */
export function ogeCrc32(data: Uint8Array, crc = 0): number {
  const t = crcTable();
  let c = (crc ^ 0xffffffff) >>> 0;
  for (let i = 0; i < data.length; i++) c = t[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
