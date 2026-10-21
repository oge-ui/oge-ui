import fc from 'fast-check';
import { constants, deflateRawSync } from 'node:zlib';
import { ogeCrc32 } from './crc32';
import { OgeInflateError, ogeInflateRaw } from './inflate';

// Node's zlib is the reference encoder: specs may use it, the engine may not.
const deflate = (
  data: Uint8Array,
  options: Parameters<typeof deflateRawSync>[1] = {},
) => new Uint8Array(deflateRawSync(data, options));

const text = (s: string) => new TextEncoder().encode(s);

describe('CRC-32', () => {
  it('matches the standard check values', () => {
    expect(ogeCrc32(text('123456789'))).toBe(0xcbf43926);
    expect(ogeCrc32(new Uint8Array(0))).toBe(0);
    expect(ogeCrc32(text('The quick brown fox jumps over the lazy dog'))).toBe(
      0x414fa339,
    );
  });

  it('continues over data that arrives in pieces', () => {
    const whole = text('spreadsheet engine');
    const first = ogeCrc32(whole.subarray(0, 7));
    expect(ogeCrc32(whole.subarray(7), first)).toBe(ogeCrc32(whole));
  });
});

describe('inflate', () => {
  const sample = text(
    '<sheetData>' +
      Array.from(
        { length: 200 },
        (_, i) =>
          `<row r="${i + 1}"><c r="A${i + 1}"><v>${i * 3.5}</v></c></row>`,
      ).join('') +
      '</sheetData>',
  );

  it.each([
    ['stored blocks', { level: 0 }],
    ['fixed Huffman codes', { strategy: constants.Z_FIXED }],
    ['dynamic Huffman codes', { level: 9 }],
    ['run-length matches', { strategy: constants.Z_RLE }],
    ['Huffman only', { strategy: constants.Z_HUFFMAN_ONLY }],
  ])('decodes %s', (_label, options) => {
    const packed = deflate(sample, options);
    expect(ogeInflateRaw(packed)).toEqual(sample);
    expect(ogeInflateRaw(packed, { expectedSize: sample.length })).toEqual(
      sample,
    );
  });

  it('decodes empty input and long overlapping matches', () => {
    expect(ogeInflateRaw(deflate(new Uint8Array(0)))).toEqual(
      new Uint8Array(0),
    );
    const zeros = new Uint8Array(100_000);
    expect(ogeInflateRaw(deflate(zeros))).toEqual(zeros);
  });

  it('agrees with zlib on random data at every level', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ maxLength: 4000 }),
        fc.integer({ min: 0, max: 9 }),
        (data, level) => {
          expect(ogeInflateRaw(deflate(data, { level }))).toEqual(data);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('agrees with zlib on compressible text', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(
            '<c r="A1">',
            '<v>',
            '1',
            '2',
            '</v>',
            '</c>',
            ' ',
            'x',
          ),
          { maxLength: 800 },
        ),
        (parts) => {
          const data = text(parts.join(''));
          expect(ogeInflateRaw(deflate(data))).toEqual(data);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('stops at the size limit instead of allocating without bound', () => {
    const bomb = deflate(new Uint8Array(5_000_000));
    expect(bomb.length).toBeLessThan(10_000);
    expect(() => ogeInflateRaw(bomb, { maxSize: 1_000_000 })).toThrow(
      OgeInflateError,
    );
    try {
      ogeInflateRaw(bomb, { maxSize: 1_000_000 });
    } catch (error) {
      expect((error as OgeInflateError).code).toBe('too-large');
    }
  });

  it('refuses truncated and corrupt data', () => {
    const packed = deflate(sample, { level: 9 });
    expect(() => ogeInflateRaw(packed.subarray(0, packed.length >> 1))).toThrow(
      OgeInflateError,
    );
    expect(() => ogeInflateRaw(new Uint8Array([0x07]))).toThrow(
      OgeInflateError,
    ); // reserved block type
    expect(() =>
      ogeInflateRaw(new Uint8Array([0x01, 0x05, 0x00, 0x00, 0x00])),
    ).toThrow(OgeInflateError); // stored length / complement mismatch
  });

  it('never throws anything else or hangs on garbage', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 600 }), (garbage) => {
        try {
          ogeInflateRaw(garbage, { maxSize: 1 << 20 });
        } catch (error) {
          expect(error).toBeInstanceOf(OgeInflateError);
        }
      }),
      { numRuns: 3000 },
    );
  });

  it('never throws anything else on corrupted real streams', () => {
    const packed = deflate(sample, { level: 6 });
    fc.assert(
      fc.property(
        fc.nat(packed.length - 1),
        fc.integer({ min: 1, max: 255 }),
        (index, flip) => {
          const broken = packed.slice();
          broken[index] ^= flip;
          try {
            const out = ogeInflateRaw(broken, { maxSize: 1 << 20 });
            expect(out.length).toBeLessThanOrEqual(1 << 20);
          } catch (error) {
            expect(error).toBeInstanceOf(OgeInflateError);
          }
        },
      ),
      { numRuns: 2000 },
    );
  });

  it('decodes megabytes quickly', () => {
    const big = new Uint8Array(4 << 20);
    for (let i = 0; i < big.length; i++) big[i] = (i * 7 + (i >> 5)) & 0x7f;
    const packed = deflate(big);
    const started = performance.now();
    const out = ogeInflateRaw(packed, { expectedSize: big.length });
    const elapsed = performance.now() - started;
    // a plain loop: a deep-equality matcher over 4 MB costs seconds itself
    let same = out.length === big.length;
    for (let i = 0; same && i < big.length; i++) same = out[i] === big[i];
    expect(same).toBe(true);
    // ~40 ms on a laptop; the budget leaves room for coverage and loaded CI
    expect(elapsed).toBeLessThan(2000);
  });
});
