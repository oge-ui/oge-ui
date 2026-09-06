'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import {
  OgeFileUploaderCore,
  mergeUploadMessages,
  type OgeFileUploaderEvents,
  type OgeFileUploaderProps as OgeFileUploaderCoreProps,
  type OgeUploadAbortReason,
  type OgeUploadActionsLayout,
  type OgeUploadFieldError,
  type OgeUploadFile,
  type OgeUploadFileError,
  type OgeUploadMessagesInput,
  type OgeUploadPreloadedFile,
  sanitizeResourceUrl,
} from '@oge-ui/behavior';
import { OgeProgressBar } from '@oge-ui/react-layout';
import { OgeModal } from '@oge-ui/react-overlay';
import { useOgeUploadConfig, useOgeUploadTransport } from './upload-config';
import {
  useUploadZoneRegistration,
  type OgeUploadZoneTarget,
} from './upload-registry';

/**
 * Every glyph the uploader draws, as one discriminated slot — the argument
 * of `renderIcon`.
 */
export type OgeUploadIconSlot =
  | 'select'
  | 'upload'
  | 'clear'
  | 'cancel'
  | 'remove'
  | 'retry'
  | 'pause'
  | 'resume'
  | 'download'
  | 'preview'
  | 'dropZone'
  | 'file'
  | 'success'
  | 'error';

/** Argument of `renderFile` — the React face of `*ogeUploadFileTemplate`. */
export interface OgeUploadFileRenderContext {
  readonly file: OgeUploadFile;
  readonly index: number;
  /** Pre-formatted size, so a custom row need not import the formatter. */
  readonly size: string;
  /** The row's resolved status line. */
  readonly status: string;
}

/** Argument of `renderHeader` — the React face of `*ogeUploadHeaderTemplate`. */
export interface OgeUploadHeaderRenderContext {
  readonly files: readonly OgeUploadFile[];
  readonly count: number;
  readonly uploadedCount: number;
  /** Pre-formatted total size of the list. */
  readonly totalSize: string;
}

/** Argument of `renderDropZone` — the React face of `*ogeUploadDropZoneTemplate`. */
export interface OgeUploadDropZoneRenderContext {
  /** `true` while files are hovering the zone. */
  readonly over: boolean;
  readonly disabled: boolean;
}

/** Argument of `renderToolbar` — the React face of `*ogeUploadToolbarTemplate`. */
export interface OgeUploadToolbarRenderContext {
  readonly files: readonly OgeUploadFile[];
  readonly uploading: boolean;
}

/** The callback props, one per Angular output, `on`-prefixed. */
export type OgeFileUploaderCallbacks = {
  [K in keyof OgeFileUploaderEvents as `on${Capitalize<K>}`]?: (
    event: OgeFileUploaderEvents[K],
  ) => void;
};

/** Imperative handle, mirroring the Angular component's public members. */
export interface OgeFileUploaderHandle {
  /** Every row, including the ones that failed a restriction. */
  readonly files: readonly OgeUploadFile[];
  /** Every restriction failure across the list — dx's `validationErrors`. */
  readonly validationErrors: readonly OgeUploadFileError[];
  /** dx's `isValid`. */
  readonly valid: boolean;
  readonly fileCount: number;
  readonly limitExceeded: boolean;
  /** `true` while any transfer is in flight. */
  readonly busy: boolean;
  /** Overall percentage across every file with bytes to send — dx's `progress`. */
  readonly progress: number;
  readonly uploadedCount: number;
  /** Starts the queued transfers — Kendo's `uploadFiles`, PrimeNG's `upload`. */
  upload(uids?: readonly string[]): void;
  /** dx's `abortUpload`, Kendo's `cancelUploadByUid`. */
  abort(uid?: string, reason?: OgeUploadAbortReason): void;
  /** Suspends a chunked transfer between slices. */
  pause(uid: string): boolean;
  /** Picks a paused transfer up at the slice it stopped on. */
  resume(uid: string): boolean;
  /** Kendo's `retryUploadByUid`; with no argument, everything that failed. */
  retry(uid?: string): void;
  /** Opens the browser's file dialog — PrimeNG's `choose`. */
  openFileDialog(): void;
  /** Adds files programmatically, through the same pipeline as a drop. */
  addFiles(files: readonly File[]): void;
  /** Removes one row, and its preview URL with it. */
  removeFile(uid: string): void;
  /** Empties the list — Kendo's `clearFiles`, PrimeNG's `clear`. */
  clear(): void;
  /** Every row, or one of them — Syncfusion's `getFilesData(index?)`. */
  getFiles(index?: number): readonly OgeUploadFile[];
  /** Returns the uploader to a pristine state — dx's `reset(value)`. */
  reset(value?: readonly File[]): void;
  /** Opens the built-in lightbox — Ant's `onPreview`. */
  preview(uid: string): void;
  /** Downloads a file — Ant's `onDownload`; cancelable via `onFileDownloading`. */
  download(uid: string): void;
  /** Reorders the list — Syncfusion's `sortFileList`, by name unless told otherwise. */
  sortFiles(compare?: (a: OgeUploadFile, b: OgeUploadFile) => number): void;
  focus(): void;
  blur(): void;
}

export interface OgeFileUploaderProps
  extends
    Partial<
      Omit<OgeFileUploaderCoreProps, 'disabled' | 'readonly' | 'required'>
    >,
    OgeFileUploaderCallbacks {
  /** The selected local files — controlled when provided. */
  value?: readonly File[];
  /** Uncontrolled initial value. */
  defaultValue?: readonly File[];
  /** The controlled half of `value`; Angular's `[(value)]` model is both halves at once. */
  onValueChange?: (files: readonly File[]) => void;
  /** `false` makes the zone drop-only; the separate browse button keeps the keyboard path. */
  openFileDialogOnClick?: boolean;
  /** The native `capture` attribute: opens the camera or microphone directly on a mobile device. */
  capture?: boolean | 'user' | 'environment';
  /** Name this uploader answers to, so `<OgeUploadDropZone>` / `<OgeUploadTrigger>` elsewhere can reach it. */
  dropZone?: string;
  /** Extra attributes for the internal `<input type="file">`. */
  inputAttributes?: Record<string, string>;
  readonly previewWidth?: number;
  readonly actionsLayout?: OgeUploadActionsLayout;
  readonly showCancelButton?: boolean;
  /** Files that already exist on the server when the uploader renders. */
  readonly initialFiles?: readonly OgeUploadPreloadedFile[];
  /** Per-instance message overrides (merged over the config). */
  readonly messages?: OgeUploadMessagesInput;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** External validity (a form's verdict); the restrictions add their own. */
  invalid?: boolean;
  touched?: boolean;
  dirty?: boolean;
  name?: string;
  /** Field-level errors handed in from the outside. */
  errors?: readonly OgeUploadFieldError[];
  id?: string;
  tabIndex?: number;
  /** FormValueControl contract — fires once per user interaction that dirties the control. */
  onTouch?: () => void;
  /** Replaces the body of one file row — the React face of `*ogeUploadFileTemplate`. */
  renderFile?: (context: OgeUploadFileRenderContext) => ReactNode;
  /** Replaces the header strip above the list — `*ogeUploadHeaderTemplate`. */
  renderHeader?: (context: OgeUploadHeaderRenderContext) => ReactNode;
  /** Replaces the drop zone's contents — `*ogeUploadDropZoneTemplate`. */
  renderDropZone?: (context: OgeUploadDropZoneRenderContext) => ReactNode;
  /** Rendered in place of the list while nothing is selected — `*ogeUploadEmptyTemplate`. */
  renderEmpty?: () => ReactNode;
  /** Replaces the Upload/Clear action row — `*ogeUploadToolbarTemplate`. */
  renderToolbar?: (context: OgeUploadToolbarRenderContext) => ReactNode;
  /** Replaces one glyph, discriminated by slot — `*ogeUploadIconTemplate`. */
  renderIcon?: (slot: OgeUploadIconSlot) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

const icon = (
  path: ReactNode,
  size: number,
  strokeWidth = 1.5,
  className?: string,
) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

/** The built-in glyphs — the same paths the Angular template draws. */
const DEFAULT_ICONS: Record<OgeUploadIconSlot, ReactNode> = {
  dropZone: icon(
    <>
      <path d="M8 10.5V2m0 0L5 5m3-3 3 3" />
      <path d="M2.5 10v2.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V10" />
    </>,
    24,
    1.4,
    'oge-upload-icon',
  ),
  select: icon(<path d="M8 3v10M3 8h10" />, 14, 1.5, 'oge-upload-icon'),
  file: icon(
    <>
      <path d="M9 1.5H4.5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V5z" />
      <path d="M9 1.5V5h3.5" />
    </>,
    18,
    1.3,
  ),
  error: icon(
    <>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 5v3.5M8 10.8v.2" />
    </>,
    13,
  ),
  preview: icon(
    <>
      <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="1.9" />
    </>,
    14,
  ),
  download: icon(
    <>
      <path d="M8 2.5v7m0 0L5 6.5m3 3 3-3" />
      <path d="M3 11.5v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
    </>,
    14,
  ),
  upload: icon(<path d="M8 12.5V3.5m0 0L4.5 7M8 3.5 11.5 7" />, 14),
  remove: icon(<path d="m4.5 4.5 7 7m0-7-7 7" />, 14),
  clear: null,
  cancel: null,
  retry: null,
  pause: null,
  resume: null,
  success: null,
};

let uidCounter = 0;

/**
 * File uploader: a drop zone, a real file input, a list of what was chosen,
 * and the transfers that follow — the React render of the Angular
 * `<oge-file-uploader>`, over the same `@oge-ui/behavior` machine
 * (`OgeFileUploaderCore`: the selection pipeline, the restrictions, the
 * transfer queue, the announcements) and the same stylesheet.
 *
 * Transport is optional. With no `uploadUrl` the component is a file picker
 * with restrictions and previews, and everything the user chose lands in
 * `value` as plain `File` objects. With one, transfers run through a
 * pluggable adapter: XHR by default, chunked and resumable on request, with
 * concurrency, batching, abort and retry.
 *
 * ```tsx
 * <OgeFileUploader
 *   uploadUrl="/api/upload"
 *   allowedFileExtensions={['.png', '.pdf']}
 *   maxFileSize={5 * 1024 * 1024}
 *   onUploaded={({ file }) => toast(`${file.name} uploaded`)}
 * />
 * ```
 */
export const OgeFileUploader = forwardRef<
  OgeFileUploaderHandle,
  OgeFileUploaderProps
>(function OgeFileUploaderRender(props, ref) {
  const {
    openFileDialogOnClick = true,
    capture,
    dropZone,
    inputAttributes,
    previewWidth = 50,
    actionsLayout = 'end',
    initialFiles,
    disabled = false,
    readOnly = false,
    required = false,
    invalid = false,
    errors = [],
    id,
    tabIndex = 0,
    renderFile,
    renderHeader,
    renderDropZone,
    renderEmpty,
    renderToolbar,
    renderIcon,
    className,
    style,
  } = props;

  const config = useOgeUploadConfig();
  const transport = useOgeUploadTransport();
  const messages = useMemo(
    () => mergeUploadMessages(config.messages, props.messages),
    [config.messages, props.messages],
  );

  const reactId = useId();
  const baseIdRef = useRef<string>(undefined);
  baseIdRef.current ??= `oge-upload-${reactId.replace(/:/g, '')}-${(uidCounter += 1)}`;
  const baseId = baseIdRef.current;

  const hostRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [, setVersion] = useState(0);
  const [uncontrolledValue, setUncontrolledValue] = useState<readonly File[]>(
    props.defaultValue ?? [],
  );
  const value = props.value ?? uncontrolledValue;

  const latest = useRef({
    props,
    config,
    messages,
    transport,
    value,
    disabled,
    readOnly,
    required,
  });
  latest.current = {
    props,
    config,
    messages,
    transport,
    value,
    disabled,
    readOnly,
    required,
  };

  const coreRef = useRef<OgeFileUploaderCore>(undefined);
  if (!coreRef.current) {
    coreRef.current = new OgeFileUploaderCore({
      props: () => {
        const p = latest.current.props;
        return {
          accept: p.accept ?? '',
          multiple: p.multiple ?? true,
          directory: p.directory ?? false,
          pastable: p.pastable ?? false,
          transformFile: p.transformFile,
          thumbnailFor: p.thumbnailFor,
          allowDrop: p.allowDrop ?? true,
          dropEffect: p.dropEffect ?? 'copy',
          fieldName: p.fieldName ?? 'files[]',
          allowedFileExtensions: p.allowedFileExtensions ?? [],
          maxFileSize: p.maxFileSize,
          minFileSize: p.minFileSize,
          maxFileCount: p.maxFileCount,
          maxTotalFileSize: p.maxTotalFileSize,
          validateFile: p.validateFile,
          uploadUrl: p.uploadUrl ?? '',
          uploadMethod: p.uploadMethod ?? 'post',
          uploadHeaders: p.uploadHeaders ?? {},
          uploadCustomData: p.uploadCustomData ?? {},
          withCredentials: p.withCredentials ?? false,
          responseType: p.responseType ?? 'json',
          timeout: p.timeout,
          batch: p.batch ?? false,
          concurrency: p.concurrency,
          chunk: p.chunk ?? false,
          autoRetry: p.autoRetry ?? false,
          uploadAdapter: p.uploadAdapter,
          abortable: p.abortable ?? true,
          removeUrl: p.removeUrl,
          removeMethod: p.removeMethod ?? 'post',
          removeHeaders: p.removeHeaders ?? {},
          removeField: p.removeField ?? 'fileNames',
          displayMode: p.displayMode ?? 'full',
          uploadMode: p.uploadMode ?? 'instantly',
          showFileList: p.showFileList ?? true,
          listType: p.listType ?? 'text',
          showClearButton: p.showClearButton,
          showUploadButton: p.showUploadButton,
          disabled: latest.current.disabled,
          readonly: latest.current.readOnly,
          required: latest.current.required,
        };
      },
      config: () => latest.current.config,
      messages: () => latest.current.messages,
      defaultAdapter: () => latest.current.transport,
      nativeInput: () => inputRef.current,
      baseId,
      onChange: () => setVersion((v) => v + 1),
      emit: (name, payload) => {
        const handler = latest.current.props[
          `on${name.charAt(0).toUpperCase()}${name.slice(1)}` as keyof OgeFileUploaderCallbacks
        ] as ((event: unknown) => void) | undefined;
        handler?.(payload);
      },
      onValueChange: (files) => {
        if (latest.current.props.value === undefined)
          setUncontrolledValue(files);
        latest.current.props.onValueChange?.(files);
      },
      onDirty: () => latest.current.props.onTouch?.(),
    });
  }
  const core = coreRef.current;

  // A controlled `value` written from the outside (a form reset) replaces
  // the list — the counterpart of the Angular `writeValue`. Loop-guarded by
  // comparing with what the machine already holds.
  useEffect(() => {
    if (props.value === undefined) return;
    const current = core.value;
    if (
      current.length === props.value.length &&
      current.every((file, i) => file === props.value?.[i])
    ) {
      return;
    }
    core.setValue(props.value);
  }, [core, props.value]);

  // Preloaded rows are a prop, so they re-seed when the prop changes; a row
  // the user has since removed is not resurrected (the seed skips known uids).
  useEffect(() => {
    if (initialFiles?.length) core.seedPreloaded(initialFiles);
  }, [core, initialFiles]);

  // The native input takes arbitrary attributes; there is no prop syntax for
  // a bag of them, so they are applied imperatively.
  useEffect(() => {
    const element = inputRef.current;
    if (!element || !inputAttributes) return;
    for (const [key, attributeValue] of Object.entries(inputAttributes)) {
      element.setAttribute(key, attributeValue);
    }
  }, [inputAttributes]);

  // Object URLs outlive the call that made them, so the component owns their
  // lifetime. StrictMode runs this cleanup and re-mounts the same instance,
  // so the mount side revives the machine (the `revive()` pattern).
  useEffect(() => {
    core.revive();
    return () => core.destroy();
  }, [core]);

  // --- the external zone / trigger registry ------------------------------------

  const zoneTarget = useMemo<OgeUploadZoneTarget>(
    () => ({
      get directory() {
        return latest.current.props.directory ?? false;
      },
      addFiles: (files) => core.addFiles(files),
      openFileDialog: () => core.openFileDialog(),
    }),
    [core],
  );
  useUploadZoneRegistration(dropZone, zoneTarget);

  // --- imperative handle -------------------------------------------------------

  const hostZone = (): HTMLElement | null =>
    hostRef.current?.querySelector<HTMLElement>(
      '.oge-upload-dropzone, .oge-upload-select',
    ) ?? null;

  useImperativeHandle(
    ref,
    () => ({
      get files() {
        return core.rows;
      },
      get validationErrors() {
        return core.validationErrors;
      },
      get valid() {
        return core.valid;
      },
      get fileCount() {
        return core.fileCount;
      },
      get limitExceeded() {
        return core.limitExceeded;
      },
      get busy() {
        return core.busy;
      },
      get progress() {
        return core.progress;
      },
      get uploadedCount() {
        return core.uploadedCount;
      },
      upload: (uids) => core.upload(uids),
      abort: (uid, reason) => core.abort(uid, reason),
      pause: (uid) => core.pause(uid),
      resume: (uid) => core.resume(uid),
      retry: (uid) => core.retry(uid),
      openFileDialog: () => core.openFileDialog(),
      addFiles: (files) => core.addFiles(files),
      removeFile: (uid) => core.removeFile(uid),
      clear: () => core.clear(),
      getFiles: (index) => core.getFiles(index),
      reset: (next) => core.reset(next),
      preview: (uid) => core.preview(uid),
      download: (uid) => core.download(uid),
      sortFiles: (compare) => core.sortFiles(compare),
      focus: () => hostZone()?.focus(),
      blur: () => hostZone()?.blur(),
    }),
    [core],
  );

  // --- render ------------------------------------------------------------------

  const interactive = !disabled && !readOnly;
  const rows = core.rows;
  const effectiveInvalid = invalid || errors.length > 0 || !core.valid;
  const listType = props.listType ?? 'text';
  const displayMode = props.displayMode ?? 'full';
  const multiple = props.multiple ?? true;
  const hintId = core.restrictionHint ? `${id ?? baseId}-hint` : undefined;
  const inputId = `${id ?? baseId}-input`;
  const captureAttr =
    capture === undefined || capture === false
      ? undefined
      : capture === true
        ? ''
        : capture;
  const glyph = (slot: OgeUploadIconSlot): ReactNode =>
    renderIcon ? renderIcon(slot) : DEFAULT_ICONS[slot];

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLUListElement>): void => {
    const uid = core.onListKeydown(event.nativeEvent);
    if (uid !== null) {
      hostRef.current
        ?.querySelector<HTMLElement>(`.oge-upload-file[data-uid="${uid}"]`)
        ?.focus();
    }
  };

  const dragHandlers = {
    onDragEnter: (event: ReactDragEvent) => core.onDragEnter(event.nativeEvent),
    onDragOver: (event: ReactDragEvent) => core.onDragOver(event.nativeEvent),
    onDragLeave: (event: ReactDragEvent) => core.onDragLeave(event.nativeEvent),
    onDrop: (event: ReactDragEvent) => core.onDrop(event.nativeEvent),
  };

  const dropZoneContent = renderDropZone ? (
    renderDropZone({ over: core.dragOver, disabled })
  ) : (
    <>
      {glyph('dropZone')}
      <span className="oge-upload-dropzone-label">{core.dropZoneLabel}</span>
      {core.restrictionHint && (
        <span className="oge-upload-dropzone-hint" id={hintId}>
          {core.restrictionHint}
        </span>
      )}
    </>
  );

  const fileRow = (file: OgeUploadFile, index: number): ReactNode => {
    if (renderFile) {
      return renderFile({
        file,
        index,
        size: core.bytes(file.size),
        status: core.statusText(file),
      });
    }
    const thumb = core.thumbnailOf(file);
    return (
      <>
        {thumb ? (
          <img
            className="oge-upload-file-thumb"
            alt=""
            src={sanitizeResourceUrl(thumb)}
            width={previewWidth}
            crossOrigin={file.crossOrigin}
            onError={(event: SyntheticEvent<HTMLImageElement>) =>
              core.thumbnailFailed(file, event.nativeEvent)
            }
          />
        ) : (
          <span className="oge-upload-file-glyph" aria-hidden="true">
            {glyph('file')}
          </span>
        )}

        <span className="oge-upload-file-main">
          <span className="oge-upload-file-name" id={`${file.uid}-name`}>
            {file.name}
          </span>
          <span className="oge-upload-file-meta">{core.metaOf(file)}</span>

          {core.showsProgress(file) && (
            <OgeProgressBar
              className="oge-upload-file-progress"
              value={file.progress}
              severity={core.severityOf(file)}
              chunkCount={file.chunk?.total}
              ariaLabel={core.progressLabel(file)}
            />
          )}

          {file.errors.map((error) => (
            <span
              key={error.kind}
              className="oge-upload-file-error"
              id={`${file.uid}-error`}
            >
              {glyph('error')}
              {error.message}
            </span>
          ))}
        </span>

        {core.canPreview(file) && (
          <button
            type="button"
            className="oge-upload-file-action"
            aria-label={core.actionLabel('preview', file)}
            onClick={() => core.preview(file.uid)}
          >
            {glyph('preview')}
          </button>
        )}
        {core.canDownload(file) && (
          <button
            type="button"
            className="oge-upload-file-action"
            aria-label={core.actionLabel('download', file)}
            onClick={() => core.download(file.uid)}
          >
            {glyph('download')}
          </button>
        )}
        {core.canPause(file) && (
          <button
            type="button"
            className="oge-upload-file-action"
            aria-label={core.actionLabel('pause', file)}
            onClick={() => core.pause(file.uid)}
          >
            {messages.buttons.pause}
          </button>
        )}
        {core.canResume(file) && (
          <button
            type="button"
            className="oge-upload-file-action"
            aria-label={core.actionLabel('resume', file)}
            onClick={() => core.resume(file.uid)}
          >
            {messages.buttons.resume}
          </button>
        )}
        {core.canCancel(file) && (
          <button
            type="button"
            className="oge-upload-file-action"
            aria-label={core.actionLabel('cancel', file)}
            onClick={() => core.abort(file.uid)}
          >
            {messages.buttons.cancel}
          </button>
        )}
        {core.canRetry(file) && (
          <button
            type="button"
            className="oge-upload-file-action"
            aria-label={core.actionLabel('retry', file)}
            onClick={() => core.retry(file.uid)}
          >
            {messages.buttons.retry}
          </button>
        )}
        {core.listOptions.showRemove !== false && (
          <button
            type="button"
            className="oge-upload-file-action"
            disabled={!interactive}
            aria-label={core.actionLabel('remove', file)}
            onClick={() => core.removeFile(file.uid)}
          >
            {glyph('remove')}
          </button>
        )}
      </>
    );
  };

  return (
    <div
      ref={hostRef}
      className={[
        'oge-upload',
        disabled && 'oge-upload-disabled',
        readOnly && 'oge-upload-readonly',
        effectiveInvalid && 'oge-upload-invalid',
        core.dragOver && 'oge-upload-dragging',
        listType === 'picture' && 'oge-upload-list-picture',
        listType === 'pictureCard' && 'oge-upload-list-card',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      role="group"
      aria-label={messages.uploaderLabel}
      aria-describedby={hintId}
      aria-disabled={disabled || undefined}
      onPaste={(event: ReactClipboardEvent) => core.onPaste(event.nativeEvent)}
    >
      <input
        ref={inputRef}
        type="file"
        className="oge-upload-input"
        tabIndex={-1}
        id={inputId}
        name={props.fieldName ?? 'files[]'}
        aria-label={core.selectLabel}
        accept={props.accept || undefined}
        multiple={multiple}
        // React has no typing for the non-standard directory attribute.
        {...(props.directory ? { webkitdirectory: '' } : {})}
        capture={captureAttr as 'user' | 'environment' | undefined}
        disabled={!interactive}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          core.onNativeChange(event.nativeEvent)
        }
      />

      {(displayMode === 'button' || !openFileDialogOnClick) && (
        <button
          type="button"
          className="oge-upload-select"
          disabled={!interactive}
          tabIndex={tabIndex}
          onClick={() => core.openFileDialog()}
        >
          {glyph('select')}
          {core.selectLabel}
        </button>
      )}

      {displayMode === 'button' ? null : !openFileDialogOnClick ? (
        // Drop-only: a plain region, because a button that does nothing on
        // Enter is worse than no button. The browse path is the button above.
        <div
          className={[
            'oge-upload-dropzone',
            'oge-upload-dropzone-passive',
            core.dragOver && 'oge-upload-dropzone-over',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-describedby={hintId}
          {...dragHandlers}
        >
          {dropZoneContent}
        </div>
      ) : (
        <button
          type="button"
          className={[
            'oge-upload-dropzone',
            core.dragOver && 'oge-upload-dropzone-over',
            displayMode === 'compact' && 'oge-upload-dropzone-compact',
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={!interactive}
          tabIndex={tabIndex}
          aria-label={messages.dropZone.ariaLabel}
          aria-describedby={hintId}
          onClick={() => core.openFileDialog()}
          {...dragHandlers}
        >
          {dropZoneContent}
        </button>
      )}

      {core.showList && (
        <>
          {renderHeader?.(core.headerContext())}
          {rows.length > 0 ? (
            <ul
              className="oge-upload-list"
              role="list"
              aria-label={core.listLabel}
              onKeyDown={onListKeyDown}
            >
              {rows.map((file, index) => (
                <li
                  key={file.uid}
                  className={[
                    'oge-upload-file',
                    `oge-upload-file-${file.status}`,
                    file.errors.length > 0 && 'oge-upload-file-invalid',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-uid={file.uid}
                  aria-labelledby={`${file.uid}-name`}
                  aria-invalid={file.errors.length > 0 || undefined}
                  aria-describedby={
                    file.errors.length > 0 ? `${file.uid}-error` : undefined
                  }
                  aria-keyshortcuts={core.rowShortcuts ?? undefined}
                  tabIndex={file.uid === core.activeUid ? 0 : -1}
                  onFocus={() => core.setActive(file.uid)}
                >
                  {fileRow(file, index)}
                </li>
              ))}
            </ul>
          ) : renderEmpty ? (
            renderEmpty()
          ) : (
            <p className="oge-upload-empty">{messages.empty}</p>
          )}
        </>
      )}

      {renderToolbar
        ? renderToolbar({ files: rows, uploading: false })
        : (core.uploadButtonVisible || core.clearButtonVisible) && (
            <div
              className={`oge-upload-actions oge-upload-actions-${actionsLayout}`}
            >
              {core.uploadButtonVisible && (
                <button
                  type="button"
                  className="oge-upload-start"
                  disabled={!interactive || !core.hasPending}
                  onClick={() => core.upload()}
                >
                  {glyph('upload')}
                  {messages.buttons.upload}
                </button>
              )}
              {core.clearButtonVisible && (
                <button
                  type="button"
                  className="oge-upload-clear"
                  disabled={!interactive}
                  onClick={() => core.clear()}
                >
                  {messages.buttons.clear}
                </button>
              )}
            </div>
          )}

      <div className="oge-upload-live" aria-live="polite" aria-atomic="true">
        {core.announcement}
      </div>

      {core.previewing && (
        <OgeModal
          className="oge-upload-lightbox"
          opened
          title={core.previewing.name}
          ariaLabel={core.previewing.name}
          maxWidth="min(90vw, 900px)"
          onOpenedChange={(opened) => {
            if (!opened) core.closePreview();
          }}
        >
          <img
            className="oge-upload-lightbox-image"
            src={sanitizeResourceUrl(
              core.previewing.thumbnailUrl ?? core.previewing.url,
            )}
            alt={core.previewing.name}
            crossOrigin={core.previewing.crossOrigin}
          />
        </OgeModal>
      )}
    </div>
  );
});
