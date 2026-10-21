/**
 * A raw DEFLATE decoder (RFC 1951) in plain TypeScript.
 *
 * The platform's `DecompressionStream('deflate-raw')` does this faster, but
 * it is asynchronous, and Safari up to 18 throws on valid input followed by
 * trailing bytes (WebKit bugs 299541 / 307952). This decoder is the fallback
 * for both, and the synchronous path the specs use. It decodes with one
 * lookup table per Huffman code (indexed by the code's bits), copies LZ77
 * matches byte by byte (they may overlap), and stops with an error — never a
 * hang or an unbounded allocation — on corrupt or oversized data.
 */

/** Why inflating failed. */
export type OgeInflateErrorCode = 'corrupt' | 'too-large';

/** Raised for corrupt deflate data or output past the size limit. */
export class OgeInflateError extends Error {
  constructor(
    readonly code: OgeInflateErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OgeInflateError';
  }
}

/** Limits and hints for {@link ogeInflateRaw}. */
export interface OgeInflateOptions {
  /** The size the output should have, when known (a ZIP entry states it). */
  readonly expectedSize?: number;
  /** Largest output accepted. Default 256 MiB. */
  readonly maxSize?: number;
}

const DEFAULT_MAX = 256 * 1024 * 1024;

const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67,
  83, 99, 115, 131, 163, 195, 227, 258,
];
const LENGTH_EXTRA = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5,
  5, 5, 0,
];
const DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769,
  1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
];
const DISTANCE_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11,
  11, 12, 12, 13, 13,
];
const CODE_LENGTH_ORDER = [
  16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15,
];

/** A Huffman decoding table: entry = symbol << 4 | code length, 0 = no code. */
interface Huffman {
  readonly table: Uint32Array;
  readonly bits: number;
}

/** Builds the decoding table for canonical code `lengths` (RFC 1951 §3.2.2). */
function buildHuffman(lengths: Uint8Array): Huffman {
  let maxLength = 0;
  const counts = new Uint16Array(16);
  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i];
    if (length > 15)
      throw new OgeInflateError('corrupt', 'Code length out of range');
    counts[length]++;
    if (length > maxLength) maxLength = length;
  }
  if (maxLength === 0) return { table: new Uint32Array(1), bits: 1 };
  counts[0] = 0;
  const next = new Uint16Array(16);
  let code = 0;
  for (let bits = 1; bits <= 15; bits++) {
    code = (code + counts[bits - 1]) << 1;
    next[bits] = code;
  }
  // an over-subscribed code is corrupt; an incomplete one simply leaves holes
  let left = 1;
  for (let bits = 1; bits <= 15; bits++) {
    left = (left << 1) - counts[bits];
    if (left < 0)
      throw new OgeInflateError('corrupt', 'Over-subscribed Huffman code');
  }
  const size = 1 << maxLength;
  const table = new Uint32Array(size);
  for (let symbol = 0; symbol < lengths.length; symbol++) {
    const length = lengths[symbol];
    if (length === 0) continue;
    const value = next[length]++;
    // deflate packs Huffman codes most-significant bit first: reverse them
    let reversed = 0;
    for (let b = 0; b < length; b++)
      reversed |= ((value >> b) & 1) << (length - 1 - b);
    const entry = (symbol << 4) | length;
    for (let i = reversed; i < size; i += 1 << length) table[i] = entry;
  }
  return { table, bits: maxLength };
}

let fixedLiteral: Huffman | null = null;
let fixedDistance: Huffman | null = null;

function fixedTables(): [Huffman, Huffman] {
  if (!fixedLiteral || !fixedDistance) {
    const lengths = new Uint8Array(288);
    lengths.fill(8, 0, 144);
    lengths.fill(9, 144, 256);
    lengths.fill(7, 256, 280);
    lengths.fill(8, 280, 288);
    fixedLiteral = buildHuffman(lengths);
    fixedDistance = buildHuffman(new Uint8Array(30).fill(5));
  }
  return [fixedLiteral, fixedDistance];
}

/** Inflates raw deflate data (no zlib or gzip header). */
export function ogeInflateRaw(
  input: Uint8Array,
  options: OgeInflateOptions = {},
): Uint8Array {
  const maxSize = options.maxSize ?? DEFAULT_MAX;
  const expected = options.expectedSize;
  let capacity =
    expected !== undefined && expected >= 0
      ? Math.min(expected, maxSize)
      : Math.min(maxSize, Math.max(1024, input.length * 4));
  let out = new Uint8Array(capacity);
  let length = 0;
  let pos = 0;
  let bitBuffer = 0;
  let bitCount = 0;
  const end = input.length;

  const grow = (needed: number) => {
    if (needed > maxSize) {
      throw new OgeInflateError(
        'too-large',
        `Inflated data exceeds ${maxSize} bytes`,
      );
    }
    while (capacity < needed)
      capacity = Math.min(maxSize, Math.max(needed, capacity * 2));
    const bigger = new Uint8Array(capacity);
    bigger.set(out.subarray(0, length));
    out = bigger;
  };

  // Reads past the end are padded with zero bytes (a code near the end may
  // peek beyond it); `pos` keeps counting so truncation is detected below.
  const need = (bits: number) => {
    while (bitCount < bits) {
      if (pos >= end + 4)
        throw new OgeInflateError('corrupt', 'Deflate data is truncated');
      bitBuffer |= (pos < end ? input[pos] : 0) << bitCount;
      pos++;
      bitCount += 8;
    }
  };
  const take = (bits: number): number => {
    need(bits);
    const value = bitBuffer & ((1 << bits) - 1);
    bitBuffer >>>= bits;
    bitCount -= bits;
    return value;
  };
  const decode = (huffman: Huffman): number => {
    need(huffman.bits);
    const entry = huffman.table[bitBuffer & ((1 << huffman.bits) - 1)];
    const bits = entry & 15;
    if (bits === 0)
      throw new OgeInflateError('corrupt', 'Invalid Huffman code');
    bitBuffer >>>= bits;
    bitCount -= bits;
    return entry >>> 4;
  };

  let final = 0;
  while (!final) {
    final = take(1);
    const type = take(2);
    if (type === 0) {
      // stored block: byte-align, then LEN and its one's complement
      bitBuffer = 0;
      pos -= bitCount >> 3;
      bitCount = 0;
      if (pos + 4 > end)
        throw new OgeInflateError('corrupt', 'Deflate data is truncated');
      const size = input[pos] | (input[pos + 1] << 8);
      const check = input[pos + 2] | (input[pos + 3] << 8);
      if ((size ^ 0xffff) !== check)
        throw new OgeInflateError('corrupt', 'Stored block length mismatch');
      pos += 4;
      if (pos + size > end)
        throw new OgeInflateError('corrupt', 'Deflate data is truncated');
      if (length + size > capacity) grow(length + size);
      out.set(input.subarray(pos, pos + size), length);
      length += size;
      pos += size;
      continue;
    }
    let literal: Huffman;
    let distance: Huffman;
    if (type === 1) {
      [literal, distance] = fixedTables();
    } else if (type === 2) {
      const literalCount = take(5) + 257;
      const distanceCount = take(5) + 1;
      const codeLengthCount = take(4) + 4;
      if (literalCount > 286 || distanceCount > 30) {
        throw new OgeInflateError('corrupt', 'Too many Huffman codes');
      }
      const codeLengths = new Uint8Array(19);
      for (let i = 0; i < codeLengthCount; i++)
        codeLengths[CODE_LENGTH_ORDER[i]] = take(3);
      const lengthCode = buildHuffman(codeLengths);
      const lengths = new Uint8Array(literalCount + distanceCount);
      let i = 0;
      while (i < lengths.length) {
        const symbol = decode(lengthCode);
        if (symbol < 16) {
          lengths[i++] = symbol;
          continue;
        }
        let repeat: number;
        let value = 0;
        if (symbol === 16) {
          if (i === 0)
            throw new OgeInflateError(
              'corrupt',
              'Repeat with no previous length',
            );
          value = lengths[i - 1];
          repeat = 3 + take(2);
        } else if (symbol === 17) repeat = 3 + take(3);
        else repeat = 11 + take(7);
        if (i + repeat > lengths.length)
          throw new OgeInflateError('corrupt', 'Code lengths overflow');
        lengths.fill(value, i, i + repeat);
        i += repeat;
      }
      if (lengths[256] === 0)
        throw new OgeInflateError('corrupt', 'No end-of-block code');
      literal = buildHuffman(lengths.subarray(0, literalCount));
      distance = buildHuffman(lengths.subarray(literalCount));
    } else {
      throw new OgeInflateError('corrupt', 'Reserved block type');
    }
    for (;;) {
      const symbol = decode(literal);
      if (symbol < 256) {
        if (length >= capacity) grow(length + 1);
        out[length++] = symbol;
        continue;
      }
      if (symbol === 256) break;
      const index = symbol - 257;
      if (index >= 29)
        throw new OgeInflateError('corrupt', 'Invalid length code');
      const run = LENGTH_BASE[index] + take(LENGTH_EXTRA[index]);
      const distanceSymbol = decode(distance);
      if (distanceSymbol >= 30)
        throw new OgeInflateError('corrupt', 'Invalid distance code');
      const back =
        DISTANCE_BASE[distanceSymbol] + take(DISTANCE_EXTRA[distanceSymbol]);
      if (back > length)
        throw new OgeInflateError(
          'corrupt',
          'Distance reaches before the start',
        );
      if (length + run > capacity) grow(length + run);
      let from = length - back;
      for (let k = 0; k < run; k++) out[length++] = out[from++];
    }
  }
  // every bit the blocks used must have come from the input
  if (pos - (bitCount >> 3) > end)
    throw new OgeInflateError('corrupt', 'Deflate data is truncated');
  return length === out.length ? out : out.slice(0, length);
}
