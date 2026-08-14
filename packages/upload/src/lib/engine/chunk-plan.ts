/**
 * Chunk arithmetic.
 *
 * Pure and total: the easiest thing in the package to test exhaustively, and
 * the part a resumable transfer is least forgiving about getting wrong.
 *
 * Framework-free by contract — see the `src/lib/engine` lint block.
 */

/** One slice of a file. `end` is exclusive, matching `Blob.slice`. */
export interface OgeUploadChunk {
  readonly index: number;
  readonly start: number;
  readonly end: number;
}

/**
 * Splits `size` bytes into slices of at most `chunkSize`.
 *
 * An empty file still gets one chunk: a zero-byte upload is a real upload, and
 * a plan of length zero would leave the transfer with nothing to send and no
 * way to finish.
 */
export function planChunks(
  size: number,
  chunkSize: number,
): readonly OgeUploadChunk[] {
  if (chunkSize <= 0 || size <= chunkSize) {
    return [{ index: 0, start: 0, end: Math.max(0, size) }];
  }

  const chunks: OgeUploadChunk[] = [];
  for (let start = 0; start < size; start += chunkSize) {
    chunks.push({
      index: chunks.length,
      start,
      end: Math.min(start + chunkSize, size),
    });
  }
  return chunks;
}

/**
 * Bytes confirmed sent once `doneCount` chunks have completed and the one in
 * flight reports `currentLoaded`.
 *
 * Progress is computed from the plan rather than accumulated, so a chunk that
 * fails and retries cannot double-count its bytes.
 */
export function chunkedLoaded(
  plan: readonly OgeUploadChunk[],
  doneCount: number,
  currentLoaded = 0,
): number {
  const settled = plan
    .slice(0, Math.max(0, Math.min(doneCount, plan.length)))
    .reduce((sum, chunk) => sum + (chunk.end - chunk.start), 0);

  const current = plan[doneCount];
  if (!current) {
    return settled;
  }
  const room = current.end - current.start;
  return settled + Math.max(0, Math.min(currentLoaded, room));
}
