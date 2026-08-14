/**
 * The transport contract.
 *
 * One `send` per request. Batch versus per-file is expressed by the *shape of
 * the argument* — a batch is simply more than one part — so there is a single
 * code path and a custom adapter never has to branch on a mode flag.
 *
 * Framework-free by contract — see the `src/lib/engine` lint block.
 */

/** Everything about one HTTP call except the bytes. */
export interface OgeUploadRequest {
  url: string;
  method: 'post' | 'put' | 'patch' | 'delete';
  headers: Record<string, string>;
  /** Extra multipart fields — dx's `uploadCustomData`, Ant's `data`. */
  data: Record<string, unknown>;
  /** Multipart field name for the file part(s). */
  fieldName: string;
  withCredentials: boolean;
  responseType: 'json' | 'text' | 'blob';
  /** Milliseconds; `undefined` leaves the browser default in place. */
  timeout?: number;
}

/**
 * Chunk descriptor sent alongside the slice.
 *
 * Kendo's `ChunkMetadata`, field for field — a server written against Kendo's
 * chunked upload works here unchanged.
 */
export interface OgeUploadChunkMetadata {
  readonly contentType: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly fileUid: string;
  readonly chunkIndex: number;
  readonly totalChunks: number;
}

/** One file's worth of bytes in a request — the whole file, or one slice. */
export interface OgeUploadPart {
  readonly uid: string;
  readonly file: File;
  readonly blob: Blob;
  /** `null` for a whole-file transfer. */
  readonly chunk: OgeUploadChunkMetadata | null;
}

/** How a transport reports back. Exactly one of `done`/`fail` is called. */
export interface OgeUploadCallbacks {
  /** `total <= 0` means the browser could not compute a length. */
  progress(loaded: number, total: number): void;
  done(result: { response: unknown; httpStatus: number }): void;
  fail(error: {
    message: string;
    httpStatus: number | null;
    response: unknown;
  }): void;
}

/** The handle a caller keeps so it can stop the request. */
export interface OgeUploadHandle {
  abort(): void;
}

/**
 * Pluggable transport — dx's `uploadFile`/`uploadChunk`, PrimeNG's
 * `customUpload`, Ant's `customRequest`, all in one interface.
 */
export interface OgeUploadAdapter {
  send(
    parts: readonly OgeUploadPart[],
    request: OgeUploadRequest,
    callbacks: OgeUploadCallbacks,
  ): OgeUploadHandle;
  /** Optional server-side delete — Kendo's and Syncfusion's `removeUrl`. */
  remove?(
    names: readonly string[],
    request: OgeUploadRequest,
    callbacks: OgeUploadCallbacks,
  ): OgeUploadHandle;
}
