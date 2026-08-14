/**
 * The public type surface of `@oge-ui/upload`.
 *
 * Pure types only — the engine imports from here, so nothing in this file may
 * reach for Angular.
 */

/**
 * Where a file row is in its life.
 *
 * `invalid` files never enter the queue: they failed a restriction at selection
 * time and stay on the list so the user can see why. `removed` is the single
 * frame between the remove pipeline committing and the row leaving the list.
 */
export type OgeUploadFileStatus =
  | 'pending'
  | 'uploading'
  | 'paused'
  | 'uploaded'
  | 'failed'
  | 'aborted'
  | 'invalid'
  | 'removed';

/** Why a file was rejected, or why its transfer failed. */
export type OgeUploadErrorKind =
  | 'extension'
  | 'maxFileSize'
  | 'minFileSize'
  | 'maxFileCount'
  | 'maxTotalSize'
  | 'custom'
  | 'server';

/**
 * One resolved error on a file row.
 *
 * `message` is already localized and placeholder-expanded when it is attached,
 * so a custom file template renders it directly — no pipe, no lookup table.
 */
export interface OgeUploadFileError {
  readonly kind: OgeUploadErrorKind;
  readonly message: string;
}

/**
 * A row in the uploader's list.
 *
 * Immutable: the queue replaces whole entries rather than mutating them, so a
 * template can compare identities to decide what to re-render.
 */
export interface OgeUploadFile {
  /** Stable identity for the row; the argument every imperative method takes. */
  readonly uid: string;
  readonly name: string;
  readonly size: number;
  /** MIME type as the browser reported it; `''` when it could not tell. */
  readonly type: string;
  /** `null` for {@link OgeUploadPreloadedFile} rows that only exist server-side. */
  readonly file: File | null;
  readonly status: OgeUploadFileStatus;
  /** Bytes confirmed sent. */
  readonly loaded: number;
  /** 0–100, derived from `loaded` and `size`. */
  readonly progress: number;
  readonly errors: readonly OgeUploadFileError[];
  /** Parsed server response, once the transfer resolved. */
  readonly response: unknown;
  readonly httpStatus: number | null;
  /** Chunk cursor while a chunked transfer is running. */
  readonly chunk: { readonly index: number; readonly total: number } | null;
  /** How many times the transfer has been started, including retries. */
  readonly attempts: number;
  /** Server-side location, for preloaded or already-uploaded files. */
  readonly url?: string;
  /** Preview image source: an object URL for local files, a URL for preloaded ones. */
  readonly thumbnailUrl?: string;
  readonly crossOrigin?: 'anonymous' | 'use-credentials';
  readonly startedAt?: number;
  readonly finishedAt?: number;
  /**
   * Observed transfer rate in bytes per second, while uploading.
   *
   * **OGE extra** — no reference library reports one. On a chunked multi-
   * gigabyte upload a progress bar without a rate says almost nothing.
   */
  readonly bytesPerSecond?: number;
  /** Estimated seconds left, from {@link bytesPerSecond}. **OGE extra**. */
  readonly secondsRemaining?: number;
}

/**
 * A file that already lives on the server when the uploader renders.
 *
 * The equivalent of Syncfusion's `files` and Ant's `defaultFileList`: the row
 * shows and can be removed, but there is no local `File` to send.
 */
export interface OgeUploadPreloadedFile {
  /** Generated when omitted. */
  readonly uid?: string;
  readonly name: string;
  readonly size?: number;
  readonly type?: string;
  readonly url?: string;
  readonly thumbnailUrl?: string;
  readonly crossOrigin?: 'anonymous' | 'use-credentials';
}

/** How the file list renders each row. */
export type OgeUploadListType = 'text' | 'picture' | 'pictureCard';

/** How much of the uploader is drawn. */
export type OgeUploadDisplayMode = 'full' | 'compact' | 'button';

/** Where the action row sits. */
export type OgeUploadActionsLayout = 'start' | 'center' | 'end' | 'stretch';

/** The pointer feedback shown while files hover the drop zone. */
export type OgeUploadDropEffect = 'copy' | 'move' | 'link' | 'none' | 'default';

/** When the transfer starts. */
export type OgeUploadMode = 'instantly' | 'useButtons' | 'useForm' | 'select';

/** Which per-file affordances the built-in row offers. */
export interface OgeUploadFileListOptions {
  readonly showRemove?: boolean;
  readonly showRetry?: boolean;
  readonly showCancel?: boolean;
  readonly showPause?: boolean;
  readonly showPreview?: boolean;
  readonly showDownload?: boolean;
}

/** Chunked-transfer tuning. Defaults mirror Kendo's `ChunkSettings`. */
export interface OgeUploadChunkOptions {
  /** Chunk size in bytes. Defaults to 1 MiB. */
  readonly size?: number;
  /** Delay before a failed chunk is retried, in ms. Defaults to 100. */
  readonly autoRetryAfter?: number;
  /** How many times a chunk retries itself before failing. Defaults to 1. */
  readonly maxAutoRetries?: number;
  /** `false` removes pause/resume — the transfer runs to completion or fails. */
  readonly resumable?: boolean;
}

/** Whole-file retry tuning, applied when a transfer fails outright. */
export interface OgeUploadRetryOptions {
  /** How many times to retry. Defaults to 3. */
  readonly count?: number;
  /** Delay before each retry, in ms. Defaults to 500. */
  readonly delayMs?: number;
}

/**
 * A validation error handed to the uploader from the outside.
 *
 * Structurally the same shape `@oge-ui/inputs` uses, deliberately not imported
 * from it — a two-field interface is not worth a package edge.
 */
export interface OgeUploadFieldError {
  readonly kind: string;
  readonly message?: string;
}

/** Where a selection came from. */
export type OgeUploadSelectionSource = 'dialog' | 'drop' | 'paste' | 'api';

/** Why a transfer stopped early. */
export type OgeUploadAbortReason = 'user' | 'clear' | 'destroy';

/** The base every cancelable pre-event extends. */
export interface OgeUploadCancelableEvent {
  /** Set to `true` to veto. Read back synchronously after the emit. */
  cancel: boolean;
}

/** `filesSelecting` — fires before anything is validated or added. */
export interface OgeUploadFilesSelectingEvent extends OgeUploadCancelableEvent {
  readonly files: readonly File[];
  readonly source: OgeUploadSelectionSource;
  /** The originating DOM event, when there was one. */
  readonly event: Event | null;
}

/** `filesSelected` — fires once the selection has been validated and added. */
export interface OgeUploadFilesSelectedEvent {
  readonly files: readonly OgeUploadFile[];
  readonly accepted: readonly OgeUploadFile[];
  readonly rejected: readonly OgeUploadFile[];
  readonly source: OgeUploadSelectionSource;
}

/** `fileRejected` — one per file that failed a restriction. */
export interface OgeUploadFileRejectedEvent {
  readonly file: OgeUploadFile;
  readonly errors: readonly OgeUploadFileError[];
}

/** `filesDropped` — the drop landed; the veto lives in `filesSelecting`. */
export interface OgeUploadFilesDroppedEvent {
  readonly files: readonly File[];
  readonly event: DragEvent;
}

/** `dropZoneEntered` / `dropZoneLeft`. */
export interface OgeUploadDropZoneEvent {
  readonly event: DragEvent;
  /** The element the drag is over — the built-in zone, or an external one. */
  readonly zone: HTMLElement;
}

/** `fileRemoving` — cancelable; `fileRemoved` is its past-tense twin. */
export interface OgeUploadFileRemovingEvent extends OgeUploadCancelableEvent {
  readonly file: OgeUploadFile;
  /** `true` when a `removeUrl` request will be sent. */
  readonly fromServer: boolean;
}

/** `fileRemoved`. */
export interface OgeUploadFileRemovedEvent {
  readonly file: OgeUploadFile;
  readonly fromServer: boolean;
}

/** `clearing` — cancelable; `cleared` is its past-tense twin. */
export interface OgeUploadClearingEvent extends OgeUploadCancelableEvent {
  readonly files: readonly OgeUploadFile[];
}

/** `cleared`. */
export interface OgeUploadClearedEvent {
  readonly files: readonly OgeUploadFile[];
}

/** `previewShowing` — cancelable; vetoing suppresses the built-in lightbox. */
export interface OgeUploadPreviewShowingEvent extends OgeUploadCancelableEvent {
  readonly file: OgeUploadFile;
}

/** `previewHidden`. */
export interface OgeUploadPreviewHiddenEvent {
  readonly file: OgeUploadFile;
}

/** `fileDownloading` — cancelable, so the app can serve the bytes its own way. */
export interface OgeUploadFileDownloadingEvent extends OgeUploadCancelableEvent {
  readonly file: OgeUploadFile;
}

/**
 * `uploading` — cancelable, and the one place the outgoing request is
 * writable.
 *
 * Mutating `request` here is how headers, the URL or extra fields are decided
 * per transfer; dx spells the same hook `onBeforeSend`.
 */
export interface OgeUploadUploadingEvent extends OgeUploadCancelableEvent {
  readonly files: readonly OgeUploadFile[];
  readonly batch: boolean;
  /** Mutable on purpose. */
  request: {
    url: string;
    method: 'post' | 'put' | 'patch' | 'delete';
    headers: Record<string, string>;
    data: Record<string, unknown>;
    fieldName: string;
    withCredentials: boolean;
    responseType: 'json' | 'text' | 'blob';
    timeout?: number;
  };
  /** The chunk about to go out, when the transfer is chunked. */
  readonly chunk: { readonly index: number; readonly total: number } | null;
}

/** `uploadStarted`. */
export interface OgeUploadStartedEvent {
  readonly file: OgeUploadFile;
}

/** `uploadProgress`. */
export interface OgeUploadProgressEvent {
  readonly file: OgeUploadFile;
  readonly loaded: number;
  readonly total: number;
  /** 0–1; `0` when the browser could not compute a length. */
  readonly ratio: number;
}

/** `uploaded`. */
export interface OgeUploadUploadedEvent {
  readonly file: OgeUploadFile;
  readonly response: unknown;
  readonly httpStatus: number;
}

/** `uploadFailed`. */
export interface OgeUploadFailedEvent {
  readonly file: OgeUploadFile;
  readonly message: string;
  readonly httpStatus: number | null;
  readonly response: unknown;
}

/** `uploadAborted`. */
export interface OgeUploadAbortedEvent {
  readonly file: OgeUploadFile;
  readonly reason: OgeUploadAbortReason;
}

/** `allUploaded` — every queued transfer has settled. */
export interface OgeUploadAllUploadedEvent {
  readonly files: readonly OgeUploadFile[];
  readonly succeeded: readonly OgeUploadFile[];
  readonly failed: readonly OgeUploadFile[];
}

/** `chunkUploading` — cancelable, per slice. */
export interface OgeUploadChunkUploadingEvent extends OgeUploadCancelableEvent {
  readonly file: OgeUploadFile;
  readonly chunkIndex: number;
  readonly totalChunks: number;
}

/** `chunkUploaded`. */
export interface OgeUploadChunkUploadedEvent {
  readonly file: OgeUploadFile;
  readonly chunkIndex: number;
  readonly totalChunks: number;
  readonly response: unknown;
}

/** `chunkFailed`. */
export interface OgeUploadChunkFailedEvent {
  readonly file: OgeUploadFile;
  readonly chunkIndex: number;
  readonly message: string;
}

/** `uploadPausing` — cancelable; `uploadPaused` is its past-tense twin. */
export interface OgeUploadPausingEvent extends OgeUploadCancelableEvent {
  readonly file: OgeUploadFile;
}

/** `uploadPaused`. */
export interface OgeUploadPausedEvent {
  readonly file: OgeUploadFile;
}

/** `uploadResuming` — cancelable; `uploadResumed` is its past-tense twin. */
export interface OgeUploadResumingEvent extends OgeUploadCancelableEvent {
  readonly file: OgeUploadFile;
}

/** `uploadResumed`. */
export interface OgeUploadResumedEvent {
  readonly file: OgeUploadFile;
}

/** `thumbnailFailed` — the preview image could not be decoded. */
export interface OgeUploadThumbnailFailedEvent {
  readonly file: OgeUploadFile;
  readonly event: Event;
}
