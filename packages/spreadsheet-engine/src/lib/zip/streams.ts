/**
 * Raw deflate through the platform's Compression Streams, with the engine's
 * own decoder as the fallback.
 *
 * `CompressionStream('deflate-raw')` / `DecompressionStream('deflate-raw')`
 * are Baseline since 2023 (Chrome 103, Firefox 113, Safari 16.4) and exist in
 * Node and Web Workers. Two hazards shape this module: Safari 16.4 produced
 * invalid output on flush for large inputs (WebKit 254021), so callers verify
 * what they compressed; and Safari ≤ 18 throws on valid input with trailing
 * bytes (WebKit 299541 / 307952), so any stream failure retries with the
 * TypeScript decoder before it counts as corrupt data.
 */
import {
  OgeInflateError,
  ogeInflateRaw,
  type OgeInflateOptions,
} from './inflate';

let available: boolean | undefined;

/** Whether this runtime has deflate-raw Compression Streams. */
export function ogeHasCompressionStreams(): boolean {
  if (available !== undefined) return available;
  available = false;
  if (
    typeof CompressionStream === 'function' &&
    typeof DecompressionStream === 'function'
  ) {
    try {
      // older engines know the streams but not the 'deflate-raw' format
      new CompressionStream('deflate-raw');
      new DecompressionStream('deflate-raw');
      available = true;
    } catch {
      available = false;
    }
  }
  return available;
}

/** @internal — specs force the fallback path through this. */
export function ogeForceCompressionStreams(value: boolean | undefined): void {
  available = value;
}

/** The bytes on a plain `ArrayBuffer` — what a stream's writer accepts. */
function plain(data: Uint8Array): Uint8Array<ArrayBuffer> {
  return data.buffer instanceof ArrayBuffer
    ? (data as Uint8Array<ArrayBuffer>)
    : new Uint8Array(data);
}

/** Pushes `data` through a transform stream and collects the output. */
async function pipe(
  transform: {
    readonly readable: ReadableStream<Uint8Array>;
    readonly writable: WritableStream<BufferSource>;
  },
  data: Uint8Array,
  maxSize: number,
): Promise<Uint8Array> {
  const writer = transform.writable.getWriter();
  // write and close without awaiting: the readable must be drained meanwhile
  const writing = writer.write(plain(data)).then(() => writer.close());
  writing.catch(() => undefined);
  const reader = transform.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxSize) {
      await reader.cancel().catch(() => undefined);
      throw new OgeInflateError(
        'too-large',
        `Inflated data exceeds ${maxSize} bytes`,
      );
    }
    chunks.push(value);
  }
  await writing;
  if (chunks.length === 1) return chunks[0];
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * Inflates raw deflate data, natively when possible. A size limit stops a
 * decompression bomb on either path.
 */
export async function ogeInflateRawAsync(
  data: Uint8Array,
  options: OgeInflateOptions = {},
): Promise<Uint8Array> {
  const maxSize = options.maxSize ?? 256 * 1024 * 1024;
  if (ogeHasCompressionStreams()) {
    try {
      return await pipe(new DecompressionStream('deflate-raw'), data, maxSize);
    } catch (error) {
      if (error instanceof OgeInflateError) throw error;
      // fall through: Safari rejects some valid streams; the decoder decides
    }
  }
  return ogeInflateRaw(data, { ...options, maxSize });
}

/**
 * Deflates natively, or returns `null` where the runtime cannot — the ZIP
 * writer then stores the entry uncompressed, which every reader accepts.
 */
export async function ogeDeflateRawAsync(
  data: Uint8Array,
): Promise<Uint8Array | null> {
  if (!ogeHasCompressionStreams()) return null;
  try {
    return await pipe(
      new CompressionStream('deflate-raw'),
      data,
      Number.MAX_SAFE_INTEGER,
    );
  } catch {
    return null;
  }
}
