/**
 * ZIP archives — the container of every xlsx file — read and written without
 * a library.
 *
 * The reader trusts the central directory (local headers may defer their
 * sizes to a data descriptor), supports the two methods xlsx files use
 * (stored, deflate), checks every entry's CRC-32, and refuses what an xlsx
 * never is: ZIP64, encryption, multi-disk archives. Password-protected xlsx
 * files and legacy `.xls` files are OLE compound documents, not ZIPs, and get
 * their own error so a host can say so. Limits on entry count and inflated
 * sizes stop decompression bombs.
 *
 * The writer is deterministic: fixed 1980-01-01 timestamps (what Excel
 * writes), sizes and CRC in the local headers, no data descriptors, no ZIP64.
 */
import { ogeCrc32 } from './crc32';
import { OgeInflateError, ogeInflateRaw } from './inflate';
import { ogeDeflateRawAsync, ogeInflateRawAsync } from './streams';

/** Why an archive was refused. */
export type OgeZipErrorCode =
  | 'not-zip'
  | 'ole-container'
  | 'encrypted'
  | 'zip64'
  | 'multi-disk'
  | 'unsupported-method'
  | 'corrupt'
  | 'crc-mismatch'
  | 'too-large'
  | 'too-many-entries'
  | 'duplicate-entry'
  | 'missing-entry';

/** A refused archive or entry. */
export class OgeZipError extends Error {
  constructor(
    readonly code: OgeZipErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OgeZipError';
  }
}

/** One file of an archive, as its central directory describes it. */
export interface OgeZipEntry {
  readonly name: string;
  /** 0 stored, 8 deflate. */
  readonly method: 0 | 8;
  readonly crc32: number;
  readonly compressedSize: number;
  /** Uncompressed size. */
  readonly size: number;
  /** Where the entry's data starts in the archive. */
  readonly dataOffset: number;
}

/** A parsed archive: the entries, and the bytes they point into. */
export interface OgeZipArchive {
  readonly entries: readonly OgeZipEntry[];
  readonly bytes: Uint8Array;
  /** The entry with a name, if any. */
  entry(name: string): OgeZipEntry | undefined;
}

/** Bounds on what an archive may make the reader do. */
export interface OgeZipLimits {
  /** Most entries accepted. Default 10,000 (an xlsx has dozens). */
  readonly maxEntries?: number;
  /** Largest inflated entry. Default 256 MiB. */
  readonly maxEntrySize?: number;
  /** Largest inflated total. Default 1 GiB. */
  readonly maxTotalSize?: number;
}

const DEFAULT_LIMITS: Required<OgeZipLimits> = {
  maxEntries: 10_000,
  maxEntrySize: 256 * 1024 * 1024,
  maxTotalSize: 1024 * 1024 * 1024,
};

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_DIRECTORY = 0x06054b50;
const ZIP64_LOCATOR = 0x07064b50;
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const utf8 = new TextDecoder('utf-8');

function u16(bytes: Uint8Array, at: number): number {
  return bytes[at] | (bytes[at + 1] << 8);
}

function u32(bytes: Uint8Array, at: number): number {
  return (
    (bytes[at] |
      (bytes[at + 1] << 8) |
      (bytes[at + 2] << 16) |
      (bytes[at + 3] << 24)) >>>
    0
  );
}

/** Whether the bytes are an OLE compound document (`.xls`, encrypted `.xlsx`). */
export function isOgeOleContainer(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && OLE_SIGNATURE.every((b, i) => bytes[i] === b);
}

/**
 * Reads an archive's directory — no entry is inflated yet. Throws
 * {@link OgeZipError} for anything that is not a plain ZIP within the limits.
 */
export function readOgeZip(
  bytes: Uint8Array,
  limits: OgeZipLimits = {},
): OgeZipArchive {
  const { maxEntries, maxEntrySize, maxTotalSize } = {
    ...DEFAULT_LIMITS,
    ...limits,
  };
  if (isOgeOleContainer(bytes)) {
    throw new OgeZipError(
      'ole-container',
      'This is an OLE compound document — a legacy .xls or a password-protected workbook',
    );
  }
  // the end-of-central-directory record sits in the last 22 + 65,535 bytes
  let eocd = -1;
  for (
    let i = bytes.length - 22;
    i >= Math.max(0, bytes.length - 22 - 0xffff);
    i--
  ) {
    if (u32(bytes, i) === END_OF_DIRECTORY) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0)
    throw new OgeZipError('not-zip', 'No ZIP end-of-central-directory record');
  if (eocd >= 20 && u32(bytes, eocd - 20) === ZIP64_LOCATOR) {
    throw new OgeZipError('zip64', 'ZIP64 archives are not supported');
  }
  const disk = u16(bytes, eocd + 4);
  const directoryDisk = u16(bytes, eocd + 6);
  const count = u16(bytes, eocd + 10);
  const directorySize = u32(bytes, eocd + 12);
  const directoryOffset = u32(bytes, eocd + 16);
  if (disk !== 0 || directoryDisk !== 0 || u16(bytes, eocd + 8) !== count) {
    throw new OgeZipError(
      'multi-disk',
      'Multi-disk archives are not supported',
    );
  }
  if (
    count === 0xffff ||
    directoryOffset === 0xffffffff ||
    directorySize === 0xffffffff
  ) {
    throw new OgeZipError('zip64', 'ZIP64 archives are not supported');
  }
  if (count > maxEntries)
    throw new OgeZipError(
      'too-many-entries',
      `More than ${maxEntries} entries`,
    );
  if (directoryOffset + directorySize > eocd) {
    throw new OgeZipError(
      'corrupt',
      'Central directory lies outside the archive',
    );
  }
  const entries: OgeZipEntry[] = [];
  const byName = new Map<string, OgeZipEntry>();
  let total = 0;
  let at = directoryOffset;
  for (let n = 0; n < count; n++) {
    if (at + 46 > eocd || u32(bytes, at) !== CENTRAL_HEADER) {
      throw new OgeZipError('corrupt', 'Malformed central directory entry');
    }
    const flags = u16(bytes, at + 8);
    const method = u16(bytes, at + 10);
    const crc32 = u32(bytes, at + 16);
    const compressedSize = u32(bytes, at + 20);
    const size = u32(bytes, at + 24);
    const nameLength = u16(bytes, at + 28);
    const extraLength = u16(bytes, at + 30);
    const commentLength = u16(bytes, at + 32);
    const localOffset = u32(bytes, at + 42);
    const nameEnd = at + 46 + nameLength;
    if (nameEnd > eocd)
      throw new OgeZipError('corrupt', 'Entry name runs past the directory');
    const name = utf8.decode(bytes.subarray(at + 46, nameEnd));
    at = nameEnd + extraLength + commentLength;
    if (flags & 0x1)
      throw new OgeZipError('encrypted', `Entry ${name} is encrypted`);
    if (
      compressedSize === 0xffffffff ||
      size === 0xffffffff ||
      localOffset === 0xffffffff
    ) {
      throw new OgeZipError('zip64', 'ZIP64 entries are not supported');
    }
    // directories carry no data
    if (name.endsWith('/') && size === 0) continue;
    if (method !== 0 && method !== 8) {
      throw new OgeZipError(
        'unsupported-method',
        `Entry ${name} uses compression method ${method}`,
      );
    }
    if (method === 0 && compressedSize !== size) {
      throw new OgeZipError(
        'corrupt',
        `Stored entry ${name} has mismatched sizes`,
      );
    }
    if (size > maxEntrySize)
      throw new OgeZipError(
        'too-large',
        `Entry ${name} inflates past the limit`,
      );
    total += size;
    if (total > maxTotalSize)
      throw new OgeZipError('too-large', 'The archive inflates past the limit');
    if (
      localOffset + 30 > bytes.length ||
      u32(bytes, localOffset) !== LOCAL_HEADER
    ) {
      throw new OgeZipError('corrupt', `Entry ${name} has no local header`);
    }
    const dataOffset =
      localOffset +
      30 +
      u16(bytes, localOffset + 26) +
      u16(bytes, localOffset + 28);
    if (dataOffset + compressedSize > bytes.length) {
      throw new OgeZipError('corrupt', `Entry ${name} runs past the archive`);
    }
    if (byName.has(name))
      throw new OgeZipError('duplicate-entry', `Entry ${name} appears twice`);
    const entry: OgeZipEntry = {
      name,
      method,
      crc32,
      compressedSize,
      size,
      dataOffset,
    };
    entries.push(entry);
    byName.set(name, entry);
  }
  return {
    entries,
    bytes,
    entry: (name: string) => byName.get(name),
  };
}

function resolve(
  archive: OgeZipArchive,
  entry: OgeZipEntry | string,
): OgeZipEntry {
  const found = typeof entry === 'string' ? archive.entry(entry) : entry;
  if (!found)
    throw new OgeZipError('missing-entry', `No entry ${String(entry)}`);
  return found;
}

function verified(entry: OgeZipEntry, data: Uint8Array): Uint8Array {
  if (data.length !== entry.size) {
    throw new OgeZipError(
      'corrupt',
      `Entry ${entry.name} inflated to ${data.length} of ${entry.size} bytes`,
    );
  }
  if (ogeCrc32(data) !== entry.crc32) {
    throw new OgeZipError(
      'crc-mismatch',
      `Entry ${entry.name} fails its CRC-32 check`,
    );
  }
  return data;
}

function inflateFailure(entry: OgeZipEntry, error: unknown): OgeZipError {
  if (error instanceof OgeInflateError) {
    return new OgeZipError(
      error.code === 'too-large' ? 'too-large' : 'corrupt',
      `Entry ${entry.name}: ${error.message}`,
    );
  }
  return error instanceof OgeZipError
    ? error
    : new OgeZipError('corrupt', `Entry ${entry.name} cannot be inflated`);
}

/** An entry's contents, inflated natively where possible and CRC-checked. */
export async function readOgeZipEntry(
  archive: OgeZipArchive,
  entry: OgeZipEntry | string,
): Promise<Uint8Array> {
  const target = resolve(archive, entry);
  const raw = archive.bytes.subarray(
    target.dataOffset,
    target.dataOffset + target.compressedSize,
  );
  if (target.method === 0) return verified(target, raw.slice());
  try {
    const data = await ogeInflateRawAsync(raw, {
      expectedSize: target.size,
      maxSize: target.size,
    });
    return verified(target, data);
  } catch (error) {
    throw inflateFailure(target, error);
  }
}

/** An entry's contents, inflated synchronously by the engine's own decoder. */
export function readOgeZipEntrySync(
  archive: OgeZipArchive,
  entry: OgeZipEntry | string,
): Uint8Array {
  const target = resolve(archive, entry);
  const raw = archive.bytes.subarray(
    target.dataOffset,
    target.dataOffset + target.compressedSize,
  );
  if (target.method === 0) return verified(target, raw.slice());
  try {
    return verified(
      target,
      ogeInflateRaw(raw, { expectedSize: target.size, maxSize: target.size }),
    );
  } catch (error) {
    throw inflateFailure(target, error);
  }
}

/** A file to put in an archive. */
export interface OgeZipInput {
  /** Path inside the archive (`xl/workbook.xml`), `/`-separated. */
  readonly name: string;
  readonly data: Uint8Array;
  /** Deflate this entry when that makes it smaller. Default `true`. */
  readonly compress?: boolean;
}

/** Writer options. */
export interface OgeZipWriteOptions {
  /**
   * Inflate each natively compressed entry back and compare its CRC before
   * using it — the guard against Safari 16.4's broken deflate output. Default
   * `true`; the cost is one decode per entry.
   */
  readonly verify?: boolean;
}

const encoder = new TextEncoder();
/** DOS date 1980-01-01 — the timestamp Excel writes on every entry. */
const DOS_DATE = 0x21;

interface Prepared {
  readonly name: Uint8Array;
  readonly ascii: boolean;
  readonly method: 0 | 8;
  readonly crc: number;
  readonly size: number;
  readonly payload: Uint8Array;
}

function prepareName(name: string): { bytes: Uint8Array; ascii: boolean } {
  if (!name || name.startsWith('/') || name.split('/').includes('..')) {
    throw new OgeZipError('corrupt', `Invalid entry name "${name}"`);
  }
  const bytes = encoder.encode(name);
  if (bytes.length > 0xffff)
    throw new OgeZipError('corrupt', 'Entry name too long');
  return { bytes, ascii: bytes.length === name.length };
}

/**
 * Writes an archive, deflating natively where the runtime can (and the
 * result is smaller and verifies), storing otherwise.
 */
export async function writeOgeZip(
  files: readonly OgeZipInput[],
  options: OgeZipWriteOptions = {},
): Promise<Uint8Array> {
  const verify = options.verify ?? true;
  const prepared: Prepared[] = [];
  for (const file of files) {
    const { bytes, ascii } = prepareName(file.name);
    const crc = ogeCrc32(file.data);
    let method: 0 | 8 = 0;
    let payload = file.data;
    if (file.compress !== false && file.data.length > 0) {
      const deflated = await ogeDeflateRawAsync(file.data);
      if (
        deflated &&
        deflated.length < file.data.length &&
        (!verify || roundTrips(deflated, file.data.length, crc))
      ) {
        method = 8;
        payload = deflated;
      }
    }
    prepared.push({
      name: bytes,
      ascii,
      method,
      crc,
      size: file.data.length,
      payload,
    });
  }
  return assemble(prepared);
}

/** Writes an archive synchronously, every entry stored (no compression). */
export function writeOgeZipSync(files: readonly OgeZipInput[]): Uint8Array {
  return assemble(
    files.map((file) => {
      const { bytes, ascii } = prepareName(file.name);
      return {
        name: bytes,
        ascii,
        method: 0,
        crc: ogeCrc32(file.data),
        size: file.data.length,
        payload: file.data,
      };
    }),
  );
}

function roundTrips(deflated: Uint8Array, size: number, crc: number): boolean {
  try {
    const back = ogeInflateRaw(deflated, { expectedSize: size, maxSize: size });
    return back.length === size && ogeCrc32(back) === crc;
  } catch {
    return false;
  }
}

function assemble(entries: readonly Prepared[]): Uint8Array {
  if (entries.length > 0xfffe)
    throw new OgeZipError('zip64', 'Too many entries for a ZIP without ZIP64');
  const names = new Set<string>();
  let localSize = 0;
  let centralSize = 0;
  for (const entry of entries) {
    const key = utf8.decode(entry.name);
    if (names.has(key))
      throw new OgeZipError('duplicate-entry', `Entry ${key} appears twice`);
    names.add(key);
    localSize += 30 + entry.name.length + entry.payload.length;
    centralSize += 46 + entry.name.length;
  }
  if (localSize + centralSize + 22 > 0xffffffff) {
    throw new OgeZipError('zip64', 'Archive too large for a ZIP without ZIP64');
  }
  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let at = 0;
  const offsets: number[] = [];
  for (const entry of entries) {
    offsets.push(at);
    view.setUint32(at, LOCAL_HEADER, true);
    view.setUint16(at + 4, 20, true); // version needed: 2.0 (deflate)
    view.setUint16(at + 6, entry.ascii ? 0 : 0x0800, true); // bit 11: UTF-8 name
    view.setUint16(at + 8, entry.method, true);
    view.setUint16(at + 10, 0, true); // time 00:00
    view.setUint16(at + 12, DOS_DATE, true);
    view.setUint32(at + 14, entry.crc, true);
    view.setUint32(at + 18, entry.payload.length, true);
    view.setUint32(at + 22, entry.size, true);
    view.setUint16(at + 26, entry.name.length, true);
    view.setUint16(at + 28, 0, true);
    out.set(entry.name, at + 30);
    out.set(entry.payload, at + 30 + entry.name.length);
    at += 30 + entry.name.length + entry.payload.length;
  }
  const directoryOffset = at;
  entries.forEach((entry, index) => {
    view.setUint32(at, CENTRAL_HEADER, true);
    view.setUint16(at + 4, 20, true); // made by: MS-DOS, 2.0
    view.setUint16(at + 6, 20, true);
    view.setUint16(at + 8, entry.ascii ? 0 : 0x0800, true);
    view.setUint16(at + 10, entry.method, true);
    view.setUint16(at + 12, 0, true);
    view.setUint16(at + 14, DOS_DATE, true);
    view.setUint32(at + 16, entry.crc, true);
    view.setUint32(at + 20, entry.payload.length, true);
    view.setUint32(at + 24, entry.size, true);
    view.setUint16(at + 28, entry.name.length, true);
    // extra, comment, disk, internal and external attributes: all zero
    view.setUint32(at + 42, offsets[index], true);
    out.set(entry.name, at + 46);
    at += 46 + entry.name.length;
  });
  view.setUint32(at, END_OF_DIRECTORY, true);
  view.setUint16(at + 8, entries.length, true);
  view.setUint16(at + 10, entries.length, true);
  view.setUint32(at + 12, at - directoryOffset, true);
  view.setUint32(at + 16, directoryOffset, true);
  return out;
}
