import fc from 'fast-check';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { ogeCrc32 } from './crc32';
import {
  ogeForceCompressionStreams,
  ogeHasCompressionStreams,
  ogeDeflateRawAsync,
  ogeInflateRawAsync,
} from './streams';
import {
  OgeZipError,
  isOgeOleContainer,
  readOgeZip,
  readOgeZipEntry,
  readOgeZipEntrySync,
  writeOgeZip,
  writeOgeZipSync,
  type OgeZipErrorCode,
} from './zip';

const text = (s: string) => new TextEncoder().encode(s);
const xml = text(
  '<?xml version="1.0"?><worksheet>' +
    '<row><c><v>1</v></c></row>'.repeat(500) +
    '</worksheet>',
);

function code(action: () => unknown): OgeZipErrorCode | null {
  try {
    action();
    return null;
  } catch (error) {
    if (error instanceof OgeZipError) return error.code;
    throw error;
  }
}

/**
 * A hand-built archive with what the writer never produces: a data
 * descriptor (sizes after the data, zeros in the local header), a directory
 * entry and a comment.
 */
function archiveWithDescriptor(name: string, data: Uint8Array): Uint8Array {
  const packed = new Uint8Array(deflateRawSync(data));
  const nameBytes = text(name);
  const crc = ogeCrc32(data);
  const parts: number[] = [];
  const u16 = (v: number) => parts.push(v & 0xff, (v >> 8) & 0xff);
  const u32 = (v: number) =>
    parts.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff);
  // local header with bit 3 set and zero sizes
  u32(0x04034b50);
  u16(20);
  u16(0x0008);
  u16(8);
  u16(0);
  u16(0x21);
  u32(0);
  u32(0);
  u32(0);
  u16(nameBytes.length);
  u16(0);
  parts.push(...nameBytes);
  parts.push(...packed);
  u32(0x08074b50);
  u32(crc);
  u32(packed.length);
  u32(data.length); // data descriptor
  const directoryEntryOffset = parts.length;
  const dirName = text('xl/');
  u32(0x04034b50);
  u16(20);
  u16(0);
  u16(0);
  u16(0);
  u16(0x21);
  u32(0);
  u32(0);
  u32(0);
  u16(dirName.length);
  u16(0);
  parts.push(...dirName);
  const centralOffset = parts.length;
  u32(0x02014b50);
  u16(20);
  u16(20);
  u16(0x0008);
  u16(8);
  u16(0);
  u16(0x21);
  u32(crc);
  u32(packed.length);
  u32(data.length);
  u16(nameBytes.length);
  u16(0);
  u16(0);
  u16(0);
  u16(0);
  u32(0);
  u32(0);
  parts.push(...nameBytes);
  u32(0x02014b50);
  u16(20);
  u16(20);
  u16(0);
  u16(0);
  u16(0);
  u16(0x21);
  u32(0);
  u32(0);
  u32(0);
  u16(dirName.length);
  u16(0);
  u16(0);
  u16(0);
  u16(0);
  u32(0x10);
  u32(directoryEntryOffset);
  parts.push(...dirName);
  const centralSize = parts.length - centralOffset;
  const comment = text('made by hand');
  u32(0x06054b50);
  u16(0);
  u16(0);
  u16(2);
  u16(2);
  u32(centralSize);
  u32(centralOffset);
  u16(comment.length);
  parts.push(...comment);
  return new Uint8Array(parts);
}

describe('ZIP writer and reader', () => {
  afterEach(() => ogeForceCompressionStreams(undefined));

  it('round-trips entries, compressing the ones that shrink', async () => {
    const files = [
      { name: '[Content_Types].xml', data: xml },
      {
        name: 'xl/media/image1.png',
        data: new Uint8Array([1, 2, 3]),
        compress: false,
      },
      { name: 'docProps/üñíçødé.xml', data: text('<x/>') },
      { name: 'empty.bin', data: new Uint8Array(0) },
    ];
    const zip = await writeOgeZip(files);
    const archive = readOgeZip(zip);
    expect(archive.entries.map((e) => e.name)).toEqual(
      files.map((f) => f.name),
    );
    const sheet = archive.entry('[Content_Types].xml');
    expect(sheet?.method).toBe(ogeHasCompressionStreams() ? 8 : 0);
    expect(archive.entry('xl/media/image1.png')?.method).toBe(0);
    for (const file of files) {
      expect(await readOgeZipEntry(archive, file.name)).toEqual(file.data);
      expect(readOgeZipEntrySync(archive, file.name)).toEqual(file.data);
    }
  });

  it('writes standard deflate that zlib reads, and identical bytes every time', async () => {
    const first = await writeOgeZip([{ name: 'a.xml', data: xml }]);
    const second = await writeOgeZip([{ name: 'a.xml', data: xml }]);
    expect(second).toEqual(first);
    const entry = readOgeZip(first).entry('a.xml');
    if (!entry) throw new Error('missing');
    const payload = first.subarray(
      entry.dataOffset,
      entry.dataOffset + entry.compressedSize,
    );
    const plain =
      entry.method === 8 ? new Uint8Array(inflateRawSync(payload)) : payload;
    expect(plain).toEqual(xml);
  });

  it('stores everything when the runtime has no Compression Streams', async () => {
    ogeForceCompressionStreams(false);
    expect(await ogeDeflateRawAsync(xml)).toBeNull();
    const zip = await writeOgeZip([{ name: 'a.xml', data: xml }]);
    const archive = readOgeZip(zip);
    expect(archive.entry('a.xml')?.method).toBe(0);
    expect(await readOgeZipEntry(archive, 'a.xml')).toEqual(xml);
  });

  it('inflates with the TypeScript decoder when the native one is missing', async () => {
    const packed = new Uint8Array(deflateRawSync(xml));
    ogeForceCompressionStreams(false);
    expect(await ogeInflateRawAsync(packed)).toEqual(xml);
  });

  it('writes stored archives synchronously', () => {
    const zip = writeOgeZipSync([{ name: 'a.txt', data: text('hello') }]);
    const archive = readOgeZip(zip);
    expect(archive.entry('a.txt')?.method).toBe(0);
    expect(readOgeZipEntrySync(archive, 'a.txt')).toEqual(text('hello'));
  });

  it('reads data descriptors, directories and comments it never writes', async () => {
    const archive = readOgeZip(archiveWithDescriptor('xl/workbook.xml', xml));
    expect(archive.entries.map((e) => e.name)).toEqual(['xl/workbook.xml']);
    expect(await readOgeZipEntry(archive, 'xl/workbook.xml')).toEqual(xml);
  });

  it('refuses names a package cannot hold', async () => {
    await expect(writeOgeZip([{ name: '', data: xml }])).rejects.toThrow(
      OgeZipError,
    );
    await expect(
      writeOgeZip([{ name: '/abs.xml', data: xml }]),
    ).rejects.toThrow(OgeZipError);
    await expect(
      writeOgeZip([{ name: 'xl/../x.xml', data: xml }]),
    ).rejects.toThrow(OgeZipError);
    expect(
      code(() =>
        writeOgeZipSync([
          { name: 'a', data: xml },
          { name: 'a', data: xml },
        ]),
      ),
    ).toBe('duplicate-entry');
  });
});

describe('ZIP reader refusals', () => {
  const valid = writeOgeZipSync([
    { name: 'a.xml', data: text('<a/>') },
    { name: 'b.xml', data: text('<b/>') },
  ]);

  it('tells OLE documents (.xls, encrypted .xlsx) apart from garbage', () => {
    const ole = new Uint8Array([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0,
    ]);
    expect(isOgeOleContainer(ole)).toBe(true);
    expect(code(() => readOgeZip(ole))).toBe('ole-container');
    expect(code(() => readOgeZip(text('just text, not a zip')))).toBe(
      'not-zip',
    );
    expect(code(() => readOgeZip(new Uint8Array(0)))).toBe('not-zip');
  });

  it('enforces the entry and size limits', () => {
    expect(code(() => readOgeZip(valid, { maxEntries: 1 }))).toBe(
      'too-many-entries',
    );
    expect(code(() => readOgeZip(valid, { maxEntrySize: 3 }))).toBe(
      'too-large',
    );
    expect(code(() => readOgeZip(valid, { maxTotalSize: 5 }))).toBe(
      'too-large',
    );
  });

  it('refuses encrypted, ZIP64 and unknown-method entries', () => {
    const central = valid.findIndex(
      (_b, i) =>
        valid[i] === 0x50 &&
        valid[i + 1] === 0x4b &&
        valid[i + 2] === 0x01 &&
        valid[i + 3] === 0x02,
    );
    const encrypted = valid.slice();
    encrypted[central + 8] |= 0x01;
    expect(code(() => readOgeZip(encrypted))).toBe('encrypted');
    const bzip = valid.slice();
    bzip[central + 10] = 12;
    expect(code(() => readOgeZip(bzip))).toBe('unsupported-method');
    const big = valid.slice();
    big.set([0xff, 0xff, 0xff, 0xff], central + 24);
    expect(code(() => readOgeZip(big))).toBe('zip64');
  });

  it('detects a corrupted payload by its CRC-32', async () => {
    const zip = writeOgeZipSync([{ name: 'a.xml', data: text('<payload/>') }]);
    const archive = readOgeZip(zip);
    const entry = archive.entry('a.xml');
    if (!entry) throw new Error('missing');
    const broken = zip.slice();
    broken[entry.dataOffset] ^= 0xff;
    const brokenArchive = readOgeZip(broken);
    expect(code(() => readOgeZipEntrySync(brokenArchive, 'a.xml'))).toBe(
      'crc-mismatch',
    );
    await expect(readOgeZipEntry(brokenArchive, 'a.xml')).rejects.toMatchObject(
      {
        code: 'crc-mismatch',
      },
    );
    expect(code(() => readOgeZipEntrySync(archive, 'nope.xml'))).toBe(
      'missing-entry',
    );
  });

  it('turns a corrupt deflate stream into a ZIP error', async () => {
    const data = text('<x>' + 'y'.repeat(5000) + '</x>');
    const zip = await writeOgeZip([{ name: 'a.xml', data }]);
    const archive = readOgeZip(zip);
    const entry = archive.entry('a.xml');
    if (!entry || entry.method !== 8) return; // no native deflate here: nothing to corrupt
    const broken = zip.slice();
    broken.fill(
      0xff,
      entry.dataOffset,
      entry.dataOffset + entry.compressedSize,
    );
    const brokenArchive = readOgeZip(broken);
    expect(
      code(() => readOgeZipEntrySync(brokenArchive, 'a.xml')),
    ).not.toBeNull();
    await expect(
      readOgeZipEntry(brokenArchive, 'a.xml'),
    ).rejects.toBeInstanceOf(OgeZipError);
  });
});

describe('ZIP — properties', () => {
  const entryName = fc
    .stringMatching(/^[A-Za-z0-9_\-[\]]{1,12}(\/[A-Za-z0-9_.]{1,12}){0,3}$/)
    .filter((name) => !name.split('/').includes('..'));

  it('round-trips any set of entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(
          fc.record({
            name: entryName,
            data: fc.uint8Array({ maxLength: 2000 }),
          }),
          {
            selector: (entry) => entry.name,
            maxLength: 8,
          },
        ),
        async (files) => {
          const archive = readOgeZip(await writeOgeZip(files));
          expect(archive.entries.map((e) => e.name)).toEqual(
            files.map((f) => f.name),
          );
          for (const file of files) {
            expect(await readOgeZipEntry(archive, file.name)).toEqual(
              file.data,
            );
          }
        },
      ),
      { numRuns: 60 },
    );
  });

  it('throws nothing but OgeZipError on garbage or damaged archives', () => {
    const base = writeOgeZipSync([
      { name: 'xl/workbook.xml', data: xml },
      { name: 'xl/styles.xml', data: text('<styleSheet/>') },
    ]);
    fc.assert(
      fc.property(
        fc.oneof(
          fc.uint8Array({ maxLength: 400 }),
          fc
            .tuple(fc.nat(base.length - 1), fc.integer({ min: 1, max: 255 }))
            .map(([index, flip]) => {
              const broken = base.slice();
              broken[index] ^= flip;
              return broken;
            }),
        ),
        (bytes) => {
          try {
            const archive = readOgeZip(bytes);
            for (const entry of archive.entries)
              readOgeZipEntrySync(archive, entry);
          } catch (error) {
            expect(error).toBeInstanceOf(OgeZipError);
          }
        },
      ),
      { numRuns: 2000 },
    );
  });
});
