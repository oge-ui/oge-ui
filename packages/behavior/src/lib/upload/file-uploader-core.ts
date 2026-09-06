/**
 * The framework-free half of the file uploader (ADR 0001): the row list and
 * everything that happens to it — the selection pipeline (dialog, drop,
 * paste, API) with transform + restrictions, the transfer plumbing over
 * `UploadQueue` (request assembly, the cancelable `uploading` hook, queue
 * events → row patches + outputs + announcements), remove/clear/reset, the
 * preview and download flows, the list keyboard map, and every derived value
 * the templates read (labels, hints, status lines, button visibility).
 *
 * Plain fields, one `onChange` sink, one `emit` sink: the Angular component
 * mirrors the state into signals and routes `emit` into its outputs; the
 * React component mirrors it into `useState` and calls the `onX` props. Both
 * render the same markup over the same machine, so the pipelines cannot
 * drift.
 */
import { edgeEnabledIndex, stepEnabledIndex } from '@oge-ui/core';
import { formatFileSize } from './file-size';
import {
  validateSelection,
  type OgeUploadRestrictions,
} from './file-validation';
import { ObjectUrlRegistry } from './thumbnails';
import type { OgeUploadAdapter } from './transport-types';
import {
  DragDepthCounter,
  dataTransferHasFiles,
  dropEffectFor,
  readClipboardFiles,
  readDataTransferFiles,
} from './upload-dnd';
import {
  formatUploadMessage as format,
  type OgeUploadConfig,
  type OgeUploadMessages,
} from './upload-messages';
import {
  UploadQueue,
  type OgeUploadQueueEvent,
  type OgeUploadTask,
  type OgeUploadTimers,
} from './upload-queue';
import { sanitizeResourceUrl } from '../security/sanitize-url';
import type {
  OgeUploadAbortReason,
  OgeUploadAbortedEvent,
  OgeUploadAllUploadedEvent,
  OgeUploadChunkFailedEvent,
  OgeUploadChunkOptions,
  OgeUploadChunkUploadedEvent,
  OgeUploadChunkUploadingEvent,
  OgeUploadClearedEvent,
  OgeUploadClearingEvent,
  OgeUploadDisplayMode,
  OgeUploadDropEffect,
  OgeUploadDropZoneEvent,
  OgeUploadErrorKind,
  OgeUploadFailedEvent,
  OgeUploadFile,
  OgeUploadFileDownloadingEvent,
  OgeUploadFileError,
  OgeUploadFileListOptions,
  OgeUploadFileRejectedEvent,
  OgeUploadFileRemovedEvent,
  OgeUploadFileRemovingEvent,
  OgeUploadFilesDroppedEvent,
  OgeUploadFilesSelectedEvent,
  OgeUploadFilesSelectingEvent,
  OgeUploadListType,
  OgeUploadMode,
  OgeUploadPausedEvent,
  OgeUploadPausingEvent,
  OgeUploadPreloadedFile,
  OgeUploadPreviewHiddenEvent,
  OgeUploadPreviewShowingEvent,
  OgeUploadProgressEvent,
  OgeUploadResumedEvent,
  OgeUploadResumingEvent,
  OgeUploadRetryOptions,
  OgeUploadSelectionSource,
  OgeUploadStartedEvent,
  OgeUploadThumbnailFailedEvent,
  OgeUploadUploadedEvent,
  OgeUploadUploadingEvent,
} from './upload-types';

let uidCounter = 0;

/** Every output the uploader raises, keyed by its Angular output name. */
export interface OgeFileUploaderEvents {
  filesSelecting: OgeUploadFilesSelectingEvent;
  filesSelected: OgeUploadFilesSelectedEvent;
  fileRejected: OgeUploadFileRejectedEvent;
  filesDropped: OgeUploadFilesDroppedEvent;
  dropZoneEntered: OgeUploadDropZoneEvent;
  dropZoneLeft: OgeUploadDropZoneEvent;
  fileRemoving: OgeUploadFileRemovingEvent;
  fileRemoved: OgeUploadFileRemovedEvent;
  clearing: OgeUploadClearingEvent;
  cleared: OgeUploadClearedEvent;
  thumbnailFailed: OgeUploadThumbnailFailedEvent;
  previewShowing: OgeUploadPreviewShowingEvent;
  previewHidden: OgeUploadPreviewHiddenEvent;
  fileDownloading: OgeUploadFileDownloadingEvent;
  uploading: OgeUploadUploadingEvent;
  uploadStarted: OgeUploadStartedEvent;
  uploadProgress: OgeUploadProgressEvent;
  uploaded: OgeUploadUploadedEvent;
  uploadFailed: OgeUploadFailedEvent;
  uploadAborted: OgeUploadAbortedEvent;
  allUploaded: OgeUploadAllUploadedEvent;
  chunkUploading: OgeUploadChunkUploadingEvent;
  chunkUploaded: OgeUploadChunkUploadedEvent;
  chunkFailed: OgeUploadChunkFailedEvent;
  uploadPausing: OgeUploadPausingEvent;
  uploadPaused: OgeUploadPausedEvent;
  uploadResuming: OgeUploadResumingEvent;
  uploadResumed: OgeUploadResumedEvent;
}

/** The names of the cancelable pre-events (their payload carries `cancel`). */
export type OgeFileUploaderEventName = keyof OgeFileUploaderEvents;

/**
 * The host's inputs, read live through one getter so the machine always
 * sees the current binding without a re-creation per change.
 */
export interface OgeFileUploaderProps {
  readonly accept: string;
  readonly multiple: boolean;
  readonly directory: boolean;
  readonly pastable: boolean;
  readonly transformFile: ((file: File) => File | Promise<File>) | undefined;
  readonly thumbnailFor:
    | ((file: OgeUploadFile) => string | null | Promise<string | null>)
    | undefined;
  readonly allowDrop: boolean;
  readonly dropEffect: OgeUploadDropEffect;
  readonly fieldName: string;
  readonly allowedFileExtensions: readonly string[];
  readonly maxFileSize: number | undefined;
  readonly minFileSize: number | undefined;
  readonly maxFileCount: number | undefined;
  readonly maxTotalFileSize: number | undefined;
  readonly validateFile: ((file: File) => string | null) | undefined;
  readonly uploadUrl: string | ((files: readonly File[]) => string);
  readonly uploadMethod: 'post' | 'put' | 'patch';
  readonly uploadHeaders: Record<string, string>;
  readonly uploadCustomData:
    | Record<string, unknown>
    | ((file: OgeUploadFile) => Record<string, unknown>);
  readonly withCredentials: boolean;
  readonly responseType: 'json' | 'text' | 'blob';
  readonly timeout: number | undefined;
  readonly batch: boolean;
  readonly concurrency: number | undefined;
  readonly chunk: boolean | OgeUploadChunkOptions;
  readonly autoRetry: boolean | OgeUploadRetryOptions;
  readonly uploadAdapter: OgeUploadAdapter | undefined;
  readonly abortable: boolean;
  readonly removeUrl: string | undefined;
  readonly removeMethod: 'post' | 'delete';
  readonly removeHeaders: Record<string, string>;
  readonly removeField: string;
  readonly displayMode: OgeUploadDisplayMode;
  readonly uploadMode: OgeUploadMode;
  readonly showFileList: boolean | OgeUploadFileListOptions;
  readonly listType: OgeUploadListType;
  readonly showClearButton: boolean | undefined;
  readonly showUploadButton: boolean | undefined;
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly required: boolean;
}

export interface OgeFileUploaderCoreOptions {
  /** Live inputs. */
  readonly props: () => OgeFileUploaderProps;
  /** Resolved package defaults (locale, units, chunk size, concurrency…). */
  readonly config: () => OgeUploadConfig;
  /** Resolved message catalog (config merged with the per-instance override). */
  readonly messages: () => OgeUploadMessages;
  /** The transport used when `props.uploadAdapter` is not set. */
  readonly defaultAdapter: () => OgeUploadAdapter;
  /** The native `<input type="file">`, for `useForm` mirroring and the dialog. */
  readonly nativeInput: () => HTMLInputElement | null;
  /** Id prefix for rows and generated element ids. */
  readonly baseId: string;
  /** Notified after every state change the host should re-render for. */
  readonly onChange: () => void;
  /** Raises one of the uploader's outputs. */
  readonly emit: <K extends OgeFileUploaderEventName>(
    name: K,
    payload: OgeFileUploaderEvents[K],
  ) => void;
  /** The `File[]` value changed (forms / `[(value)]`). */
  readonly onValueChange: (files: readonly File[]) => void;
  /** A user interaction dirtied + touched the control. */
  readonly onDirty: () => void;
  readonly timers?: OgeUploadTimers;
  readonly now?: () => number;
  /** `document` for the download anchor; defaults to the global. */
  readonly document?: () => Document | null;
}

export class OgeFileUploaderCore {
  // --- state --------------------------------------------------------------

  /** Every row, including the ones that failed a restriction. */
  rows: readonly OgeUploadFile[] = [];
  /** `true` while files hover the built-in drop zone. */
  dragOver = false;
  /** The row holding the roving tabindex. */
  activeUid: string | null = null;
  /** Text of the polite live region. */
  announcement = '';
  /** The row whose lightbox is open, if any. */
  previewing: OgeUploadFile | null = null;

  private readonly thumbnails = new ObjectUrlRegistry();
  private readonly dragDepth = new DragDepthCounter();
  private queue: UploadQueue | null = null;
  private abortReason: OgeUploadAbortReason = 'user';
  private destroyed = false;

  constructor(private readonly options: OgeFileUploaderCoreOptions) {}

  // --- derived ------------------------------------------------------------

  get files(): readonly OgeUploadFile[] {
    return this.rows;
  }

  get interactive(): boolean {
    const props = this.options.props();
    return !props.disabled && !props.readonly;
  }

  /** Every restriction failure across the list — dx's `validationErrors`. */
  get validationErrors(): readonly OgeUploadFileError[] {
    return this.rows.flatMap((row) => row.errors);
  }

  /** `true` when `required` is set and nothing sendable is on the list. */
  get requiredUnmet(): boolean {
    return this.options.props().required && this.value.length === 0;
  }

  /** dx's `isValid`. */
  get valid(): boolean {
    return this.validationErrors.length === 0 && !this.requiredUnmet;
  }

  get fileCount(): number {
    return this.rows.length;
  }

  get limitExceeded(): boolean {
    return this.rows.some((row) =>
      row.errors.some((e) => e.kind === 'maxFileCount'),
    );
  }

  /** The `File[]` the forms layer sees: every local file on the list. */
  get value(): readonly File[] {
    return this.rows
      .map((row) => row.file)
      .filter((file): file is File => file !== null);
  }

  /** `true` while any transfer is in flight. */
  get busy(): boolean {
    return this.rows.some((row) => row.status === 'uploading');
  }

  /** Overall percentage across every file with bytes to send — dx's `progress`. */
  get progress(): number {
    const sendable = this.rows.filter((row) => row.file !== null);
    const total = sendable.reduce((sum, row) => sum + row.size, 0);
    if (total === 0) return 0;
    const loaded = sendable.reduce((sum, row) => sum + row.loaded, 0);
    return Math.round((loaded / total) * 100);
  }

  get uploadedCount(): number {
    return this.rows.filter((row) => row.status === 'uploaded').length;
  }

  /** Pause is offered exactly when chunking is on and resumable. */
  get pausable(): boolean {
    const setting = this.options.props().chunk;
    if (setting === false) return false;
    return typeof setting === 'boolean' ? true : setting.resumable !== false;
  }

  get listOptions(): OgeUploadFileListOptions {
    const setting = this.options.props().showFileList;
    return typeof setting === 'boolean' ? {} : setting;
  }

  get showList(): boolean {
    const props = this.options.props();
    return props.showFileList !== false && props.displayMode !== 'button';
  }

  get hasPending(): boolean {
    return this.rows.some(
      (row) =>
        row.file !== null &&
        row.errors.length === 0 &&
        row.status === 'pending',
    );
  }

  get uploadButtonVisible(): boolean {
    const props = this.options.props();
    if (props.showUploadButton !== undefined) return props.showUploadButton;
    // The button exists for the modes that wait for it. `instantly` sends on
    // selection and `select` never sends at all, so a button there would be a
    // control with nothing to do.
    return props.uploadMode === 'useButtons' && props.displayMode !== 'button';
  }

  get clearButtonVisible(): boolean {
    const props = this.options.props();
    if (props.showClearButton !== undefined) return props.showClearButton;
    return props.displayMode !== 'button' && this.rows.length > 0;
  }

  get selectLabel(): string {
    const buttons = this.options.messages().buttons;
    return this.options.props().multiple
      ? buttons.select
      : buttons.selectSingle;
  }

  get listLabel(): string {
    return format(this.options.messages().listLabel, {
      count: String(this.rows.length),
    });
  }

  get dropZoneLabel(): string {
    const messages = this.options.messages().dropZone;
    const template = this.options.props().multiple
      ? messages.label
      : messages.labelSingle;
    return format(template, { browse: messages.browse });
  }

  /** The restriction summary under the drop-zone label. */
  get restrictionHint(): string {
    const messages = this.options.messages().dropZone;
    const props = this.options.props();
    const parts: string[] = [];
    if (props.allowedFileExtensions.length > 0) {
      parts.push(
        format(messages.hintExtensions, {
          extensions: props.allowedFileExtensions.join(', '),
        }),
      );
    }
    if (props.maxFileSize !== undefined) {
      parts.push(
        format(messages.hintMaxSize, {
          maxSize: this.bytes(props.maxFileSize),
        }),
      );
    }
    if (props.maxFileCount !== undefined) {
      parts.push(
        format(messages.hintMaxCount, {
          maxCount: String(props.maxFileCount),
        }),
      );
    }
    return parts.join(' · ');
  }

  get hintId(): string | null {
    return this.restrictionHint ? `${this.options.baseId}-hint` : null;
  }

  /** `'Delete'` while rows can be removed from the keyboard. */
  get rowShortcuts(): string | null {
    return this.interactive ? 'Delete' : null;
  }

  // --- per-row helpers ------------------------------------------------------

  bytes(size: number): string {
    const config = this.options.config();
    return formatFileSize(size, {
      locale: config.locale,
      binary: config.binaryFileSizes,
    });
  }

  statusText(file: OgeUploadFile): string {
    const status = this.options.messages().status;
    switch (file.status) {
      case 'uploaded':
        return status.uploaded;
      case 'failed':
        return status.failed;
      case 'aborted':
        return status.aborted;
      case 'paused':
        return status.paused;
      case 'uploading':
        return status.uploading;
      default:
        return status.ready;
    }
  }

  /** Size, plus the status line once the row has one worth showing. */
  metaOf(file: OgeUploadFile): string {
    const size = this.bytes(file.size);
    if (file.status === 'pending' || file.status === 'invalid') return size;
    const status = this.options.messages().status;
    if (file.status !== 'uploading')
      return `${size} · ${this.statusText(file)}`;

    const parts = [size];
    if (file.chunk) {
      parts.push(
        format(status.chunk, {
          index: String(file.chunk.index + 1),
          total: String(file.chunk.total),
        }),
      );
    }
    if (file.bytesPerSecond !== undefined) {
      parts.push(
        format(status.rate, { rate: this.bytes(file.bytesPerSecond) }),
      );
    }
    if (file.secondsRemaining !== undefined) {
      parts.push(
        format(status.remaining, { seconds: String(file.secondsRemaining) }),
      );
    }
    if (parts.length === 1) parts.push(status.uploading);
    return parts.join(' · ');
  }

  showsProgress(file: OgeUploadFile): boolean {
    return file.status === 'uploading' || file.status === 'paused';
  }

  severityOf(file: OgeUploadFile): 'accent' | 'success' | 'warning' | 'danger' {
    if (file.status === 'failed') return 'danger';
    if (file.status === 'uploaded') return 'success';
    if (file.status === 'paused') return 'warning';
    return 'accent';
  }

  progressLabel(file: OgeUploadFile): string {
    return `${file.name}: ${this.statusText(file)}`;
  }

  canCancel(file: OgeUploadFile): boolean {
    return (
      this.options.props().abortable &&
      this.listOptions.showCancel !== false &&
      (file.status === 'uploading' || file.status === 'paused')
    );
  }

  canRetry(file: OgeUploadFile): boolean {
    return (
      this.listOptions.showRetry !== false &&
      (file.status === 'failed' || file.status === 'aborted')
    );
  }

  canPreview(file: OgeUploadFile): boolean {
    return (
      this.listOptions.showPreview !== false &&
      (file.thumbnailUrl !== undefined || file.url !== undefined)
    );
  }

  canDownload(file: OgeUploadFile): boolean {
    // Opt-in: a download button on a file the user just picked from their own
    // disk is noise, so it appears once there is a server URL, or when the
    // list options ask for it explicitly.
    const explicit = this.listOptions.showDownload;
    if (explicit === false) return false;
    return explicit === true || file.url !== undefined;
  }

  canPause(file: OgeUploadFile): boolean {
    return (
      this.pausable &&
      this.listOptions.showPause !== false &&
      file.status === 'uploading'
    );
  }

  canResume(file: OgeUploadFile): boolean {
    return this.pausable && file.status === 'paused';
  }

  thumbnailOf(file: OgeUploadFile): string | null {
    return this.options.props().listType === 'text'
      ? null
      : (file.thumbnailUrl ?? null);
  }

  actionLabel(
    action:
      | 'cancel'
      | 'retry'
      | 'pause'
      | 'resume'
      | 'preview'
      | 'download'
      | 'remove',
    file: OgeUploadFile,
  ): string {
    return `${this.options.messages().buttons[action]}: ${file.name}`;
  }

  headerContext(): {
    files: readonly OgeUploadFile[];
    count: number;
    uploadedCount: number;
    totalSize: string;
  } {
    const rows = this.rows;
    return {
      files: rows,
      count: rows.length,
      uploadedCount: this.uploadedCount,
      totalSize: this.bytes(rows.reduce((sum, row) => sum + row.size, 0)),
    };
  }

  // --- transfers ------------------------------------------------------------

  /** `false` when there is nowhere to send to. */
  private canTransfer(): boolean {
    const props = this.options.props();
    // `select` never uploads, and `useForm` hands the files to the enclosing
    // <form> instead — uploading them here as well would send everything twice.
    if (props.uploadMode === 'select' || props.uploadMode === 'useForm') {
      return false;
    }
    if (props.uploadAdapter !== undefined) return true;
    const url = props.uploadUrl;
    return typeof url === 'function' || url.length > 0;
  }

  /** Starts the queued transfers — Kendo's `uploadFiles`, PrimeNG's `upload`. */
  upload(uids?: readonly string[]): void {
    if (!this.interactive || !this.canTransfer()) return;
    const wanted = uids ? new Set(uids) : null;
    // Files that failed a restriction are never sent: they are on the list so
    // the user can see why, not so the server can reject them a second time.
    const tasks = this.rows
      .filter(
        (row) =>
          row.file !== null &&
          row.errors.length === 0 &&
          (row.status === 'pending' ||
            row.status === 'failed' ||
            row.status === 'aborted') &&
          (wanted === null || wanted.has(row.uid)),
      )
      .map<OgeUploadTask>((row) => ({ uid: row.uid, file: row.file as File }));
    if (tasks.length > 0) this.ensureQueue().enqueue(tasks);
  }

  /** dx's `abortUpload`, Kendo's `cancelUploadByUid`. */
  abort(uid?: string, reason: OgeUploadAbortReason = 'user'): void {
    if (!this.options.props().abortable && reason === 'user') return;
    this.abortReason = reason;
    this.queue?.abort(uid);
  }

  /** Suspends a chunked transfer between slices. */
  pause(uid: string): boolean {
    const file = this.rowOf(uid);
    if (!file || !this.pausable) return false;
    const event: OgeUploadPausingEvent = { file, cancel: false };
    this.options.emit('uploadPausing', event);
    if (event.cancel) return false;
    return this.queue?.pause(uid) ?? false;
  }

  /** Picks a paused transfer up at the slice it stopped on. */
  resume(uid: string): boolean {
    const file = this.rowOf(uid);
    if (!file) return false;
    const event: OgeUploadResumingEvent = { file, cancel: false };
    this.options.emit('uploadResuming', event);
    if (event.cancel) return false;
    return this.queue?.resume(uid) ?? false;
  }

  /** Kendo's `retryUploadByUid`; with no argument, everything that failed. */
  retry(uid?: string): void {
    const targets = uid
      ? [uid]
      : this.rows
          .filter((row) => row.status === 'failed' || row.status === 'aborted')
          .map((row) => row.uid);
    for (const target of targets) {
      this.patchRow(target, {
        status: 'pending',
        loaded: 0,
        progress: 0,
        errors: [],
      });
      if (!this.queue?.retry(target)) this.upload([target]);
    }
    this.notify();
  }

  // --- public API -------------------------------------------------------------

  /** Opens the browser's file dialog — PrimeNG's `choose`. */
  openFileDialog(): void {
    if (!this.interactive) return;
    this.options.nativeInput()?.click();
  }

  /** Adds files programmatically, through the same pipeline as a drop. */
  addFiles(files: readonly File[]): void {
    this.ingest(files, 'api', null);
  }

  /** Removes one row, and its preview URL with it. */
  removeFile(uid: string): void {
    const file = this.rowOf(uid);
    if (!file || !this.interactive) return;
    const props = this.options.props();
    // A file that reached the server is removed there too, when a removeUrl
    // is configured; a local-only row just leaves the list.
    const fromServer =
      props.removeUrl !== undefined &&
      (file.status === 'uploaded' || file.file === null);
    const event: OgeUploadFileRemovingEvent = {
      file,
      fromServer,
      cancel: false,
    };
    this.options.emit('fileRemoving', event);
    if (event.cancel) return;

    if (fromServer) this.sendRemove(file);
    else this.abort(uid, 'clear');
    this.thumbnails.revoke(uid);
    this.rows = this.rows.filter((row) => row.uid !== uid);
    this.syncValue();
    this.options.onDirty();
    if (this.activeUid === uid) this.activeUid = this.rows[0]?.uid ?? null;
    this.options.emit('fileRemoved', { file, fromServer: false });
    this.announce(this.options.messages().announcements.fileRemoved, {
      name: file.name,
    });
  }

  /** Empties the list — Kendo's `clearFiles`, PrimeNG's `clear`. */
  clear(): void {
    const files = this.rows;
    if (files.length === 0 || !this.interactive) return;
    const event: OgeUploadClearingEvent = { files, cancel: false };
    this.options.emit('clearing', event);
    if (event.cancel) return;
    // Anything in flight goes with the list, and says why.
    this.abort(undefined, 'clear');
    this.thumbnails.revokeAll();
    this.rows = [];
    this.activeUid = null;
    this.syncValue();
    this.options.onDirty();
    this.options.emit('cleared', { files });
    this.announce(this.options.messages().announcements.cleared, {});
  }

  /** Every row, or one of them — Syncfusion's `getFilesData(index?)`. */
  getFiles(index?: number): readonly OgeUploadFile[] {
    if (index === undefined) return this.rows;
    const row = this.rows[index];
    return row ? [row] : [];
  }

  /**
   * Returns the uploader to a pristine state — dx's `reset(value)`.
   *
   * Unlike `clear()` this fires no `clearing`/`cleared` pipeline: a reset is
   * the app rewinding its own form, not the user removing files.
   */
  reset(value: readonly File[] = []): void {
    this.abort(undefined, 'clear');
    this.thumbnails.revokeAll();
    this.rows = value.map((file) => this.buildRow(file, [], null));
    this.activeUid = null;
    this.previewing = null;
    this.syncValue();
  }

  /**
   * Replaces the list from the outside (forms `writeValue`) without the
   * value callback — the control already holds that value.
   */
  setValue(value: readonly File[]): void {
    this.thumbnails.revokeAll();
    this.rows = value.map((file) => this.buildRow(file, [], null));
    this.notify();
  }

  /** Opens the built-in lightbox — Ant's `onPreview`. */
  preview(uid: string): void {
    const file = this.rowOf(uid);
    if (!file) return;
    const event: OgeUploadPreviewShowingEvent = { file, cancel: false };
    this.options.emit('previewShowing', event);
    // A veto means the app shows its own viewer; the built-in one stays shut.
    if (event.cancel) return;
    this.previewing = file;
    this.notify();
  }

  /** Closes the lightbox (the modal's `openedChange` false). */
  closePreview(): void {
    const file = this.previewing;
    this.previewing = null;
    this.notify();
    if (file) this.options.emit('previewHidden', { file });
  }

  /**
   * Downloads a file — Ant's `onDownload`.
   *
   * Cancelable, because a real app usually wants its own signed-URL flow. The
   * default is an anchor click against the server `url`, or a temporary object
   * URL for a file that only exists locally; that temporary URL is revoked
   * immediately, since the download has already been handed to the browser.
   */
  download(uid: string): void {
    const file = this.rowOf(uid);
    if (!file) return;
    const event: OgeUploadFileDownloadingEvent = { file, cancel: false };
    this.options.emit('fileDownloading', event);
    if (event.cancel) return;
    // `file.url` is server data (a preloaded file, or an upload response), so
    // it goes through the same gate as any other data-driven URL: an anchor
    // this code clicks itself would happily run a `javascript:` href.
    const href = sanitizeResourceUrl(file.url ?? this.temporaryUrl(file));
    if (!href || href === 'about:blank') return;
    const doc =
      this.options.document?.() ??
      (typeof document !== 'undefined' ? document : null);
    if (!doc) return;
    const anchor = doc.createElement('a');
    anchor.href = href;
    anchor.download = file.name;
    anchor.click();
    if (!file.url) URL.revokeObjectURL?.(href);
  }

  /** Reorders the list — Syncfusion's `sortFileList`, by name unless told otherwise. */
  sortFiles(
    compare: (a: OgeUploadFile, b: OgeUploadFile) => number = (a, b) =>
      a.name.localeCompare(b.name),
  ): void {
    this.rows = [...this.rows].sort(compare);
    this.syncValue();
  }

  /** Rows for the `initialFiles` input, skipping uids already on the list. */
  seedPreloaded(preloaded: readonly OgeUploadPreloadedFile[]): void {
    if (preloaded.length === 0) return;
    const known = new Set(this.rows.map((row) => row.uid));
    const seeded = preloaded
      .map((entry, index) => ({
        entry,
        uid: entry.uid ?? `${this.options.baseId}-p${index}`,
      }))
      .filter(({ uid }) => !known.has(uid))
      .map<OgeUploadFile>(({ entry, uid }) => ({
        uid,
        name: entry.name,
        size: entry.size ?? 0,
        type: entry.type ?? '',
        file: null,
        status: 'uploaded',
        loaded: entry.size ?? 0,
        progress: 100,
        errors: [],
        response: null,
        httpStatus: null,
        chunk: null,
        attempts: 0,
        url: entry.url,
        thumbnailUrl: entry.thumbnailUrl,
        crossOrigin: entry.crossOrigin,
      }));
    if (seeded.length > 0) {
      this.rows = [...seeded, ...this.rows];
      this.notify();
    }
  }

  thumbnailFailed(file: OgeUploadFile, event: Event): void {
    this.options.emit('thumbnailFailed', { file, event });
  }

  /**
   * Re-arms a destroyed machine — React StrictMode runs the unmount cleanup
   * and then re-mounts the same instance, so the effect's mount side calls
   * this before anything else.
   */
  revive(): void {
    this.destroyed = false;
    this.abortReason = 'user';
  }

  /** Aborts in-flight transfers and releases every object URL. */
  destroy(): void {
    // Flagged *before* disposing: disposal aborts whatever is in flight, and
    // raising `uploadAborted` from a destroyed host is an error in every app
    // that navigates away mid-transfer.
    this.destroyed = true;
    this.abortReason = 'destroy';
    this.queue?.dispose();
    this.thumbnails.revokeAll();
  }

  // --- selection pipeline -----------------------------------------------------

  /** The file input's `change`: reset it so the same file can be chosen twice. */
  onNativeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []);
    // Reset the input so choosing the same file twice in a row still fires
    // `change`. In `useForm` mode the list is put back afterwards, because
    // there the input's own FileList is what gets submitted.
    input.value = '';
    this.ingest(picked, 'dialog', event);
  }

  onPaste(event: ClipboardEvent): void {
    if (!this.options.props().pastable || !this.interactive) return;
    const pasted = readClipboardFiles(event.clipboardData);
    if (pasted.length > 0) this.ingest(pasted, 'paste', event);
  }

  onDragEnter(event: DragEvent): void {
    if (!this.dropAllowed(event)) return;
    event.preventDefault();
    if (this.dragDepth.enter()) {
      this.dragOver = true;
      this.notify();
      this.options.emit('dropZoneEntered', {
        event,
        zone: event.currentTarget as HTMLElement,
      });
      this.announce(this.options.messages().announcements.dropZoneEntered, {});
    }
  }

  onDragOver(event: DragEvent): void {
    if (!this.dropAllowed(event)) return;
    // Without this the browser never fires `drop` at all.
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = dropEffectFor(
        this.options.props().dropEffect,
      );
    }
  }

  onDragLeave(event: DragEvent): void {
    if (!this.dragDepth.active) return;
    if (this.dragDepth.leave()) {
      this.dragOver = false;
      this.notify();
      this.options.emit('dropZoneLeft', {
        event,
        zone: event.currentTarget as HTMLElement,
      });
    }
  }

  onDrop(event: DragEvent): void {
    if (!this.dropAllowed(event)) return;
    event.preventDefault();
    this.dragDepth.reset();
    this.dragOver = false;
    this.notify();
    void readDataTransferFiles(event.dataTransfer, {
      directory: this.options.props().directory,
    }).then((dropped) => {
      if (dropped.length === 0) return;
      this.options.emit('filesDropped', { files: dropped, event });
      this.ingest(dropped, 'drop', event);
    });
  }

  private dropAllowed(event: DragEvent): boolean {
    return (
      this.options.props().allowDrop &&
      this.interactive &&
      dataTransferHasFiles(event.dataTransfer)
    );
  }

  /** The one road into the list: dialog, drop, paste and `addFiles` all use it. */
  private ingest(
    incoming: readonly File[],
    source: OgeUploadSelectionSource,
    origin: Event | null,
  ): void {
    if (incoming.length === 0 || !this.interactive) return;
    const selecting: OgeUploadFilesSelectingEvent = {
      files: incoming,
      source,
      event: origin,
      cancel: false,
    };
    this.options.emit('filesSelecting', selecting);
    if (selecting.cancel) return;

    const transform = this.options.props().transformFile;
    if (transform) {
      // Rewriting happens before validation, so the restrictions judge the
      // bytes that will actually be sent rather than the ones picked.
      // Started inside the chain, not before it: a `transformFile` that throws
      // synchronously would otherwise escape the `catch` and take the whole
      // selection down instead of falling back to the untransformed files.
      void Promise.resolve()
        .then(() => Promise.all(incoming.map((file) => transform(file))))
        .then((transformed) => this.commitSelection(transformed, source))
        .catch(() => this.commitSelection(incoming, source));
      return;
    }
    this.commitSelection(incoming, source);
  }

  /** The half of `ingest` that runs once the files are final. */
  private commitSelection(
    incoming: readonly File[],
    source: OgeUploadSelectionSource,
  ): void {
    if (this.destroyed) return;
    const props = this.options.props();
    // Single-file mode replaces rather than appends — the behaviour every
    // reference has, and what `maxCount: 1` means in Ant.
    const existing = props.multiple ? this.rows : [];
    if (!props.multiple && this.rows.length > 0) this.thumbnails.revokeAll();
    const batch = props.multiple ? incoming : incoming.slice(0, 1);

    const results = validateSelection(batch, this.restrictions(), {
      count: existing.length,
      totalSize: existing.reduce((sum, row) => sum + row.size, 0),
    });

    const added: OgeUploadFile[] = [];
    for (const result of results) {
      const file = result.candidate;
      const custom = props.validateFile?.(file) ?? null;
      added.push(this.buildRow(file, [...result.errors], custom));
    }

    this.rows = [...existing, ...added];
    this.resolveCustomThumbnails(added);
    for (const row of added) {
      if (row.errors.length > 0) {
        this.options.emit('fileRejected', { file: row, errors: row.errors });
      }
    }
    this.syncValue();
    this.options.onDirty();
    this.activeUid = this.activeUid ?? this.rows[0]?.uid ?? null;

    const accepted = added.filter((row) => row.errors.length === 0);
    this.options.emit('filesSelected', {
      files: this.rows,
      accepted,
      rejected: added.filter((row) => row.errors.length > 0),
      source,
    });
    this.announceSelection(added, accepted);

    if (props.uploadMode === 'instantly' && accepted.length > 0) {
      this.upload(accepted.map((row) => row.uid));
    }
  }

  private buildRow(
    file: File,
    kinds: readonly OgeUploadErrorKind[],
    custom: string | null,
  ): OgeUploadFile {
    const uid = `${this.options.baseId}-f${(uidCounter += 1)}`;
    const errors: OgeUploadFileError[] = kinds.map((kind) => ({
      kind,
      message: this.errorMessage(kind, file),
    }));
    if (custom !== null) errors.push({ kind: 'custom', message: custom });
    const thumbnailUrl =
      this.options.config().showThumbnails && errors.length === 0
        ? (this.thumbnails.create(uid, file) ?? undefined)
        : undefined;
    return {
      uid,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      status: errors.length > 0 ? 'invalid' : 'pending',
      loaded: 0,
      progress: 0,
      errors,
      response: null,
      httpStatus: null,
      chunk: null,
      attempts: 0,
      thumbnailUrl,
    };
  }

  /**
   * Asks `thumbnailFor` for a preview the browser could not make itself —
   * after the rows are on screen rather than blocking them.
   */
  private resolveCustomThumbnails(rows: readonly OgeUploadFile[]): void {
    const resolve = this.options.props().thumbnailFor;
    if (!resolve) return;
    for (const row of rows) {
      if (row.thumbnailUrl !== undefined || row.errors.length > 0) continue;
      void Promise.resolve(resolve(row))
        .then((url) => {
          if (url && !this.destroyed) {
            this.patchRow(row.uid, { thumbnailUrl: url });
            this.notify();
          }
        })
        .catch(() => undefined);
    }
  }

  private restrictions(): OgeUploadRestrictions {
    const props = this.options.props();
    return {
      allowedFileExtensions: props.allowedFileExtensions,
      maxFileSize: props.maxFileSize,
      minFileSize: props.minFileSize,
      maxFileCount: props.maxFileCount,
      maxTotalFileSize: props.maxTotalFileSize,
    };
  }

  private errorMessage(kind: OgeUploadErrorKind, file: File): string {
    const messages = this.options.messages().validation;
    const props = this.options.props();
    const tokens: Record<string, string> = {
      name: file.name,
      size: this.bytes(file.size),
      extensions: props.allowedFileExtensions.join(', '),
    };
    switch (kind) {
      case 'extension':
        return format(messages.extension, tokens);
      case 'maxFileSize':
        return format(messages.maxFileSize, {
          ...tokens,
          limit: this.bytes(props.maxFileSize ?? 0),
        });
      case 'minFileSize':
        return format(messages.minFileSize, {
          ...tokens,
          limit: this.bytes(props.minFileSize ?? 0),
        });
      case 'maxFileCount':
        return format(messages.maxFileCount, {
          ...tokens,
          limit: String(props.maxFileCount ?? 0),
        });
      case 'maxTotalSize':
        return format(messages.maxTotalSize, {
          ...tokens,
          limit: this.bytes(props.maxTotalFileSize ?? 0),
        });
      case 'server':
        return messages.server;
      default:
        return messages.custom;
    }
  }

  // --- keyboard ---------------------------------------------------------------

  /**
   * The list keyboard map: arrows/Home/End move the roving tabindex,
   * Delete/Backspace remove the active row. Returns the uid that should
   * receive focus, or `null` when the key was not handled.
   */
  onListKeydown(event: KeyboardEvent): string | null {
    const rows = this.rows;
    if (rows.length === 0) return null;
    const current = rows.findIndex((row) => row.uid === this.activeUid);
    const enabled = () => false;
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowDown':
        next = stepEnabledIndex(rows.length, current, 1, enabled);
        break;
      case 'ArrowUp':
        next = stepEnabledIndex(rows.length, current, -1, enabled);
        break;
      case 'Home':
        next = edgeEnabledIndex(rows.length, 1, enabled);
        break;
      case 'End':
        next = edgeEnabledIndex(rows.length, -1, enabled);
        break;
      case 'Delete':
      case 'Backspace': {
        // No reference supports removing a file from the keyboard; the mouse
        // affordance without its keyboard twin is exactly the gap the a11y
        // contract exists to close.
        const uid = this.activeUid;
        if (uid !== null) {
          event.preventDefault();
          this.removeFile(uid);
        }
        return null;
      }
      default:
        return null;
    }
    if (next === null) return null;
    event.preventDefault();
    const uid = rows[next]?.uid ?? null;
    this.activeUid = uid;
    this.notify();
    return uid;
  }

  /** A row took focus (pointer or script): it holds the roving tabindex now. */
  setActive(uid: string | null): void {
    if (this.activeUid === uid) return;
    this.activeUid = uid;
    this.notify();
  }

  // --- queue plumbing -----------------------------------------------------------

  private resolvedChunk() {
    const setting = this.options.props().chunk;
    if (setting === false) return null;
    const options: OgeUploadChunkOptions =
      typeof setting === 'boolean' ? {} : setting;
    // Kendo's ChunkSettings defaults, verbatim — a server written against its
    // chunked upload works here unchanged.
    return {
      size: options.size ?? this.options.config().chunkSize,
      autoRetryAfter: options.autoRetryAfter ?? 100,
      maxAutoRetries: options.maxAutoRetries ?? 1,
      resumable: options.resumable ?? true,
    };
  }

  private resolvedRetry() {
    const setting = this.options.props().autoRetry;
    if (setting === false) return null;
    const options: OgeUploadRetryOptions =
      typeof setting === 'boolean' ? {} : setting;
    return { count: options.count ?? 3, delayMs: options.delayMs ?? 500 };
  }

  private adapter(): OgeUploadAdapter {
    return this.options.props().uploadAdapter ?? this.options.defaultAdapter();
  }

  private ensureQueue(): UploadQueue {
    // The queue captures the transport-shaping inputs, so it is rebuilt when
    // they may have changed — but never out from under a live transfer.
    if (this.queue?.busy) return this.queue;
    this.queue?.dispose();
    const props = this.options.props();
    this.queue = new UploadQueue({
      adapter: this.adapter(),
      concurrency: Math.max(
        1,
        props.concurrency ?? this.options.config().concurrency,
      ),
      batch: props.batch,
      chunk: this.resolvedChunk(),
      autoRetry: this.resolvedRetry(),
      timers: this.options.timers ?? {
        setTimeout: (handler, ms) => setTimeout(handler, ms),
        clearTimeout: (handle) =>
          clearTimeout(handle as ReturnType<typeof setTimeout>),
      },
      buildRequest: (tasks, chunk, chunkTotal) =>
        this.buildRequest(tasks, chunk, chunkTotal),
      onEvent: (event) => this.onQueueEvent(event),
    });
    return this.queue;
  }

  /** Assembles the request, then offers it to `uploading` for mutation. */
  private buildRequest(
    tasks: readonly OgeUploadTask[],
    chunk: { readonly index: number } | null,
    chunkTotal: number,
  ) {
    const files = tasks
      .map((task) => this.rowOf(task.uid))
      .filter((row): row is OgeUploadFile => row !== null);
    if (files.length === 0) return null;

    if (chunk) {
      const chunkEvent: OgeUploadChunkUploadingEvent = {
        file: files[0],
        chunkIndex: chunk.index,
        totalChunks: chunkTotal,
        cancel: false,
      };
      this.options.emit('chunkUploading', chunkEvent);
      if (chunkEvent.cancel) return null;
    }

    const props = this.options.props();
    const urlInput = props.uploadUrl;
    const custom = props.uploadCustomData;
    const event: OgeUploadUploadingEvent = {
      files,
      batch: props.batch,
      chunk: chunk ? { index: chunk.index, total: chunkTotal } : null,
      cancel: false,
      request: {
        url:
          typeof urlInput === 'function'
            ? urlInput(tasks.map((task) => task.file))
            : urlInput,
        method: props.uploadMethod,
        headers: { ...props.uploadHeaders },
        data:
          typeof custom === 'function'
            ? { ...custom(files[0]) }
            : { ...custom },
        fieldName: props.fieldName,
        withCredentials: props.withCredentials,
        responseType: props.responseType,
        timeout: props.timeout,
      },
    };
    this.options.emit('uploading', event);
    // An empty URL is a misconfiguration, not a transfer: sending to the
    // current page would 200 on a static host and look like success.
    if (event.cancel || !event.request.url) return null;
    return event.request;
  }

  private onQueueEvent(event: OgeUploadQueueEvent): void {
    if (this.destroyed) return;
    const messages = this.options.messages().announcements;
    switch (event.type) {
      case 'started':
        for (const uid of event.uids) {
          this.patchRow(uid, {
            status: 'uploading',
            loaded: 0,
            progress: 0,
            errors: [],
            startedAt: this.now(),
            bytesPerSecond: undefined,
            secondsRemaining: undefined,
          });
          const file = this.rowOf(uid);
          if (file) {
            this.options.emit('uploadStarted', { file });
            this.announce(messages.uploadStarted, { name: file.name });
          }
        }
        break;
      case 'progress': {
        const ratio = event.total > 0 ? event.loaded / event.total : 0;
        this.patchRow(event.uid, {
          loaded: event.loaded,
          progress: Math.round(ratio * 100),
          ...this.rateOf(event.uid, event.loaded, event.total),
        });
        const file = this.rowOf(event.uid);
        if (file) {
          this.options.emit('uploadProgress', {
            file,
            loaded: event.loaded,
            total: event.total,
            ratio,
          });
        }
        break;
      }
      case 'chunkStarted':
        this.patchRow(event.uid, {
          chunk: { index: event.index, total: event.total },
        });
        break;
      case 'chunkDone': {
        const file = this.rowOf(event.uid);
        if (file) {
          this.options.emit('chunkUploaded', {
            file,
            chunkIndex: event.index,
            totalChunks: event.total,
            response: event.response,
          });
        }
        break;
      }
      case 'chunkFailed': {
        const file = this.rowOf(event.uid);
        if (file) {
          this.options.emit('chunkFailed', {
            file,
            chunkIndex: event.index,
            message: event.message,
          });
        }
        break;
      }
      case 'done': {
        const before = this.rowOf(event.uid);
        this.patchRow(event.uid, {
          status: 'uploaded',
          progress: 100,
          loaded: before?.size ?? 0,
          response: event.response,
          httpStatus: event.httpStatus,
          chunk: null,
        });
        const file = this.rowOf(event.uid);
        if (file) {
          this.options.emit('uploaded', {
            file,
            response: event.response,
            httpStatus: event.httpStatus,
          });
          this.announce(messages.uploadCompleted, { name: file.name });
        }
        break;
      }
      case 'failed': {
        this.patchRow(event.uid, {
          status: 'failed',
          httpStatus: event.httpStatus,
          response: event.response,
          errors: [{ kind: 'server', message: event.message }],
        });
        const file = this.rowOf(event.uid);
        if (file) {
          this.options.emit('uploadFailed', {
            file,
            message: event.message,
            httpStatus: event.httpStatus,
            response: event.response,
          });
          this.announce(messages.uploadFailed, {
            name: file.name,
            reason: event.message,
          });
        }
        break;
      }
      case 'aborted': {
        this.patchRow(event.uid, { status: 'aborted' });
        const file = this.rowOf(event.uid);
        if (file) {
          this.options.emit('uploadAborted', {
            file,
            reason: this.abortReason,
          });
          this.announce(messages.uploadAborted, { name: file.name });
        }
        break;
      }
      case 'paused': {
        this.patchRow(event.uid, { status: 'paused' });
        const file = this.rowOf(event.uid);
        if (file) {
          this.options.emit('uploadPaused', { file });
          this.announce(messages.uploadPaused, { name: file.name });
        }
        break;
      }
      case 'resumed': {
        this.patchRow(event.uid, { status: 'uploading' });
        const file = this.rowOf(event.uid);
        if (file) {
          this.options.emit('uploadResumed', { file });
          this.announce(messages.uploadResumed, { name: file.name });
        }
        break;
      }
      case 'idle': {
        const touched = this.rows.filter(
          (row) => row.status === 'uploaded' || row.status === 'failed',
        );
        if (touched.length === 0) break;
        const succeeded = touched.filter((row) => row.status === 'uploaded');
        this.options.emit('allUploaded', {
          files: touched,
          succeeded,
          failed: touched.filter((row) => row.status === 'failed'),
        });
        this.announce(messages.allCompleted, {
          succeeded: String(succeeded.length),
          total: String(touched.length),
        });
        break;
      }
    }
    this.notify();
  }

  /**
   * Fires the server-side delete — fire-and-forget on the UI side: the row
   * has already gone, and resurrecting it because a DELETE 500'd would be
   * worse than the stale file it leaves behind. The failure still reaches the
   * app through `uploadFailed`.
   */
  private sendRemove(file: OgeUploadFile): void {
    const props = this.options.props();
    const url = props.removeUrl;
    const adapter = this.adapter();
    if (!url || !adapter.remove) return;
    adapter.remove(
      [file.name],
      {
        url,
        method: props.removeMethod,
        headers: { ...props.removeHeaders },
        data: {},
        fieldName: props.removeField,
        withCredentials: props.withCredentials,
        responseType: props.responseType,
        timeout: props.timeout,
      },
      {
        progress: () => undefined,
        done: () => undefined,
        fail: (error) =>
          this.options.emit('uploadFailed', {
            file,
            message: error.message,
            httpStatus: error.httpStatus,
            response: error.response,
          }),
      },
    );
  }

  /** Observed rate and the estimate that follows from it. */
  private rateOf(
    uid: string,
    loaded: number,
    total: number,
  ): Partial<OgeUploadFile> {
    const startedAt = this.rowOf(uid)?.startedAt;
    if (startedAt === undefined) return {};
    const seconds = (this.now() - startedAt) / 1000;
    // Below a tick of real time the number is noise, not a measurement.
    if (seconds < 0.25 || loaded <= 0) return {};
    const bytesPerSecond = loaded / seconds;
    const left = Math.max(0, total - loaded);
    return {
      bytesPerSecond,
      secondsRemaining:
        bytesPerSecond > 0 ? Math.round(left / bytesPerSecond) : undefined,
    };
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  private temporaryUrl(file: OgeUploadFile): string | null {
    if (!file.file || typeof URL.createObjectURL !== 'function') return null;
    try {
      return URL.createObjectURL(file.file);
    } catch {
      return null;
    }
  }

  rowOf(uid: string): OgeUploadFile | null {
    return this.rows.find((row) => row.uid === uid) ?? null;
  }

  /** @internal Replaces one row's fields (exposed for the render layers' specs). */
  patchRow(uid: string, patch: Partial<OgeUploadFile>): void {
    this.rows = this.rows.map((row) =>
      row.uid === uid ? { ...row, ...patch } : row,
    );
  }

  // --- value / announcements ----------------------------------------------------

  /**
   * Mirrors the row list back into the native input's `FileList`.
   *
   * Only `useForm` needs this, and it genuinely needs it: a file added by drop
   * or paste never touched the input, so without this the enclosing `<form>`
   * would submit an empty field and the drop would silently do nothing.
   * Assigning `files` requires a `DataTransfer`, which jsdom does not have —
   * hence the guard rather than a crash in every spec.
   */
  private syncNativeFiles(): void {
    if (this.options.props().uploadMode !== 'useForm') return;
    if (typeof DataTransfer !== 'function') return;
    const input = this.options.nativeInput();
    if (!input) return;
    const transfer = new DataTransfer();
    for (const row of this.rows) {
      if (row.file && row.errors.length === 0) transfer.items.add(row.file);
    }
    input.files = transfer.files;
  }

  private syncValue(): void {
    this.syncNativeFiles();
    this.notify();
    this.options.onValueChange(this.value);
  }

  private notify(): void {
    if (!this.destroyed) this.options.onChange();
  }

  private announce(template: string, tokens: Record<string, string>): void {
    this.announcement = format(template, tokens);
    this.notify();
  }

  private announceSelection(
    added: readonly OgeUploadFile[],
    accepted: readonly OgeUploadFile[],
  ): void {
    const messages = this.options.messages().announcements;
    const rejected = added.filter((row) => row.errors.length > 0);
    if (rejected.length === 1 && added.length === 1) {
      this.announce(messages.fileRejected, {
        name: rejected[0].name,
        reason: rejected[0].errors[0]?.message ?? '',
      });
      return;
    }
    if (accepted.length === 1 && added.length === 1) {
      this.announce(messages.fileAdded, { name: accepted[0].name });
      return;
    }
    this.announce(messages.filesAdded, { count: String(accepted.length) });
  }
}
