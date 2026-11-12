/**
 * A dependency-free QR Code encoder (ISO/IEC 18004, model 2): numeric,
 * alphanumeric and byte (UTF-8) modes, error-correction levels L / M / Q / H,
 * versions 1–40, all eight masks scored by the standard penalty rules.
 */

/** Error-correction level: recovers about 7 %, 15 %, 25 % or 30 % of the symbol. */
export type OgeQrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

/** An encoded QR symbol: `modules[y][x]` is `true` for a dark module. */
export interface OgeQrCode {
  readonly version: number;
  readonly size: number;
  readonly errorCorrection: OgeQrErrorCorrection;
  readonly mask: number;
  readonly mode: 'numeric' | 'alphanumeric' | 'byte';
  readonly modules: readonly (readonly boolean[])[];
}

export interface OgeQrOptions {
  /** Default `'M'`. */
  readonly errorCorrection?: OgeQrErrorCorrection;
  /** Smallest version to use (default 1) — keeps a series of codes one size. */
  readonly minVersion?: number;
  /** Force a mask 0–7 instead of the lowest-penalty one. */
  readonly mask?: number;
}

const ECL_INDEX: Record<OgeQrErrorCorrection, number> = {
  L: 0,
  M: 1,
  Q: 2,
  H: 3,
};
const ECL_FORMAT: Record<OgeQrErrorCorrection, number> = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
};

// prettier-ignore
const ECC_PER_BLOCK: readonly (readonly number[])[] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

// prettier-ignore
const NUM_BLOCKS: readonly (readonly number[])[] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

/** Modules available for data and ECC in a version (everything but function patterns). */
export function ogeQrRawModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

/** Data codewords a version holds at a level. */
export function ogeQrDataCodewords(
  version: number,
  ecl: OgeQrErrorCorrection,
): number {
  const e = ECL_INDEX[ecl];
  return (
    Math.floor(ogeQrRawModules(version) / 8) -
    ECC_PER_BLOCK[e][version] * NUM_BLOCKS[e][version]
  );
}

// --- bit buffer ------------------------------------------------------------

class Bits {
  readonly data: number[] = [];
  push(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) this.data.push((value >>> i) & 1);
  }
}

interface Segment {
  mode: OgeQrCode['mode'];
  modeBits: number;
  count: number;
  countBits: readonly [number, number, number];
  data: Bits;
}

function makeSegment(text: string): Segment {
  if (/^\d*$/.test(text)) {
    const data = new Bits();
    for (let i = 0; i < text.length; i += 3) {
      const chunk = text.slice(i, i + 3);
      data.push(Number(chunk), chunk.length * 3 + 1);
    }
    return {
      mode: 'numeric',
      modeBits: 1,
      count: text.length,
      countBits: [10, 12, 14],
      data,
    };
  }
  if ([...text].every((c) => ALPHANUMERIC.includes(c))) {
    const data = new Bits();
    let i = 0;
    for (; i + 1 < text.length; i += 2) {
      data.push(
        ALPHANUMERIC.indexOf(text[i]) * 45 + ALPHANUMERIC.indexOf(text[i + 1]),
        11,
      );
    }
    if (i < text.length) data.push(ALPHANUMERIC.indexOf(text[i]), 6);
    return {
      mode: 'alphanumeric',
      modeBits: 2,
      count: text.length,
      countBits: [9, 11, 13],
      data,
    };
  }
  const bytes = new TextEncoder().encode(text);
  const data = new Bits();
  for (const b of bytes) data.push(b, 8);
  return {
    mode: 'byte',
    modeBits: 4,
    count: bytes.length,
    countBits: [8, 16, 16],
    data,
  };
}

function countBitsFor(segment: Segment, version: number): number {
  return segment.countBits[version <= 9 ? 0 : version <= 26 ? 1 : 2];
}

// --- Reed–Solomon over GF(256), polynomial 0x11D -----------------------------

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

/** The ECC codewords of one block (exposed for the spec's reference vectors). */
export function ogeQrReedSolomon(
  data: readonly number[],
  degree: number,
): number[] {
  const divisor = rsDivisor(degree);
  const result = new Array<number>(degree).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    for (let i = 0; i < result.length; i++) {
      result[i] ^= gfMultiply(divisor[i], factor);
    }
  }
  return result;
}

/** The padded data codewords for `text` at a version and level, or `null` when it does not fit. */
export function ogeQrDataBytes(
  text: string,
  version: number,
  ecl: OgeQrErrorCorrection,
): number[] | null {
  const segment = makeSegment(text);
  const capacity = ogeQrDataCodewords(version, ecl) * 8;
  const countBits = countBitsFor(segment, version);
  if (segment.count >= 1 << countBits) return null;
  const bits = new Bits();
  bits.push(segment.modeBits, 4);
  bits.push(segment.count, countBits);
  bits.data.push(...segment.data.data);
  if (bits.data.length > capacity) return null;
  bits.push(0, Math.min(4, capacity - bits.data.length));
  bits.push(0, (8 - (bits.data.length % 8)) % 8);
  for (let pad = 0xec; bits.data.length < capacity; pad ^= 0xec ^ 0x11) {
    bits.push(pad, 8);
  }
  const bytes: number[] = [];
  for (let i = 0; i < bits.data.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits.data[i + j];
    bytes.push(b);
  }
  return bytes;
}

function interleave(
  data: readonly number[],
  version: number,
  ecl: OgeQrErrorCorrection,
): number[] {
  const e = ECL_INDEX[ecl];
  const numBlocks = NUM_BLOCKS[e][version];
  const eccLen = ECC_PER_BLOCK[e][version];
  const raw = Math.floor(ogeQrRawModules(version) / 8);
  const numShort = numBlocks - (raw % numBlocks);
  const shortLen = Math.floor(raw / numBlocks);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dataLen = shortLen - eccLen + (i < numShort ? 0 : 1);
    const block = data.slice(k, k + dataLen);
    k += dataLen;
    const ecc = ogeQrReedSolomon(block, eccLen);
    // short blocks get a placeholder so every block lines up
    if (i < numShort) block.push(0);
    blocks.push([...block, ...ecc]);
  }
  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i !== shortLen - eccLen || j >= numShort) result.push(blocks[j][i]);
    }
  }
  return result;
}

// --- the matrix --------------------------------------------------------------

/** Centres of the alignment patterns along each axis. */
export function ogeQrAlignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step =
    version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let pos = version * 4 + 10; result.length < count; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

class Matrix {
  readonly modules: boolean[][];
  readonly fn: boolean[][];
  constructor(readonly size: number) {
    this.modules = Array.from({ length: size }, () =>
      new Array<boolean>(size).fill(false),
    );
    this.fn = Array.from({ length: size }, () =>
      new Array<boolean>(size).fill(false),
    );
  }
  setFn(x: number, y: number, dark: boolean): void {
    this.modules[y][x] = dark;
    this.fn[y][x] = true;
  }
}

function drawFunctionPatterns(m: Matrix, version: number): void {
  const size = m.size;
  for (let i = 0; i < size; i++) {
    m.setFn(6, i, i % 2 === 0);
    m.setFn(i, 6, i % 2 === 0);
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        m.setFn(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  const align = ogeQrAlignmentPositions(version);
  const n = align.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // the three corners already hold finders
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === n - 1) ||
        (i === n - 1 && j === 0)
      )
        continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          m.setFn(
            align[i] + dx,
            align[j] + dy,
            Math.max(Math.abs(dx), Math.abs(dy)) !== 1,
          );
        }
      }
    }
  }
  drawFormatBits(m, 'M', 0); // reserved now, rewritten once the mask is known
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      m.setFn(a, b, dark);
      m.setFn(b, a, dark);
    }
  }
}

/** The 15 format bits (level + mask, BCH-protected, XOR-masked). */
export function ogeQrFormatBits(
  ecl: OgeQrErrorCorrection,
  mask: number,
): number {
  const data = (ECL_FORMAT[ecl] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function drawFormatBits(
  m: Matrix,
  ecl: OgeQrErrorCorrection,
  mask: number,
): void {
  const bits = ogeQrFormatBits(ecl, mask);
  const bit = (i: number) => ((bits >>> i) & 1) !== 0;
  const size = m.size;
  for (let i = 0; i <= 5; i++) m.setFn(8, i, bit(i));
  m.setFn(8, 7, bit(6));
  m.setFn(8, 8, bit(7));
  m.setFn(7, 8, bit(8));
  for (let i = 9; i < 15; i++) m.setFn(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) m.setFn(size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) m.setFn(8, size - 15 + i, bit(i));
  m.setFn(8, size - 8, true); // the dark module
}

function drawCodewords(m: Matrix, codewords: readonly number[]): void {
  const size = m.size;
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip the vertical timing column
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!m.fn[y][x] && i < codewords.length * 8) {
          m.modules[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }
}

const MASKS: readonly ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function applyMask(m: Matrix, mask: number): void {
  const condition = MASKS[mask];
  for (let y = 0; y < m.size; y++) {
    for (let x = 0; x < m.size; x++) {
      if (!m.fn[y][x] && condition(x, y)) m.modules[y][x] = !m.modules[y][x];
    }
  }
}

const FINDER_LIKE = [true, false, true, true, true, false, true];

/** The standard mask penalty (rules N1–N4); lower reads better. */
export function ogeQrPenalty(modules: readonly (readonly boolean[])[]): number {
  const size = modules.length;
  let penalty = 0;
  const line = (get: (i: number) => boolean) => {
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && get(i) === get(i - 1)) {
        run++;
      } else {
        if (run >= 5) penalty += 3 + (run - 5);
        run = 1;
      }
    }
    // 1:1:3:1:1 with four light modules on one side
    for (let i = 0; i + 7 <= size; i++) {
      if (!FINDER_LIKE.every((v, k) => get(i + k) === v)) continue;
      const lightBefore = [1, 2, 3, 4].every((k) => i - k < 0 || !get(i - k));
      const lightAfter = [0, 1, 2, 3].every(
        (k) => i + 7 + k >= size || !get(i + 7 + k),
      );
      if (lightBefore || lightAfter) penalty += 40;
    }
  };
  for (let y = 0; y < size; y++) line((x) => modules[y][x]);
  for (let x = 0; x < size; x++) line((y) => modules[y][x]);
  let dark = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules[y][x]) dark++;
      if (
        x + 1 < size &&
        y + 1 < size &&
        modules[y][x] === modules[y][x + 1] &&
        modules[y][x] === modules[y + 1][x] &&
        modules[y][x] === modules[y + 1][x + 1]
      ) {
        penalty += 3;
      }
    }
  }
  const total = size * size;
  penalty += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return penalty;
}

/** Encodes `text` as a QR symbol. Throws `RangeError` when it exceeds version 40. */
export function ogeEncodeQr(
  text: string,
  options: OgeQrOptions = {},
): OgeQrCode {
  const ecl = options.errorCorrection ?? 'M';
  let version = Math.max(1, Math.min(40, options.minVersion ?? 1));
  let data: number[] | null = null;
  for (; version <= 40; version++) {
    data = ogeQrDataBytes(text, version, ecl);
    if (data) break;
  }
  if (!data) throw new RangeError('Too much data for a QR code.');
  const size = version * 4 + 17;
  const base = new Matrix(size);
  drawFunctionPatterns(base, version);
  drawCodewords(base, interleave(data, version, ecl));

  const tryMask = (mask: number) => {
    const m = new Matrix(size);
    for (let y = 0; y < size; y++) {
      m.modules[y] = [...base.modules[y]];
      m.fn[y] = base.fn[y];
    }
    applyMask(m, mask);
    drawFormatBits(m, ecl, mask);
    return m;
  };
  let best: Matrix | null = null;
  let bestMask = 0;
  if (options.mask !== undefined && options.mask >= 0 && options.mask <= 7) {
    best = tryMask(options.mask);
    bestMask = options.mask;
  } else {
    let bestPenalty = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const m = tryMask(mask);
      const penalty = ogeQrPenalty(m.modules);
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        best = m;
        bestMask = mask;
      }
    }
  }
  return {
    version,
    size,
    errorCorrection: ecl,
    mask: bestMask,
    mode: makeSegment(text).mode,
    modules: (best as Matrix).modules,
  };
}
