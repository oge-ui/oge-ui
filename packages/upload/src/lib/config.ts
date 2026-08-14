import { InjectionToken, type Provider } from '@angular/core';

/**
 * Button and action labels.
 *
 * These are messages rather than inputs on purpose: dx spells them
 * `selectButtonText`/`uploadButtonText`, PrimeNG `chooseLabel`/`uploadLabel`/
 * `cancelLabel` and Syncfusion nests them under `buttons`. One localizable set
 * beats three naming schemes and a dozen string inputs.
 */
export interface OgeUploadButtonMessages {
  readonly select: string;
  readonly selectSingle: string;
  readonly upload: string;
  readonly clear: string;
  readonly cancel: string;
  readonly retry: string;
  readonly pause: string;
  readonly resume: string;
  readonly remove: string;
  readonly preview: string;
  readonly download: string;
  /** Closes the preview lightbox. */
  readonly closePreview: string;
}

/** Drop-zone wording. `{token}` placeholders are expanded at render. */
export interface OgeUploadDropZoneMessages {
  /** Primary line; dx's `labelText`. */
  readonly label: string;
  /** Primary line when only one file may be chosen. */
  readonly labelSingle: string;
  /** The clickable word inside the label that opens the dialog. */
  readonly browse: string;
  /** Accessible name of the zone, which is exposed as a button. */
  readonly ariaLabel: string;
  /** Restriction summary under the label; `{extensions}`, `{maxSize}`, `{maxCount}`. */
  readonly hintExtensions: string;
  readonly hintMaxSize: string;
  readonly hintMaxCount: string;
}

/** Per-row status text; dx's four `*Message` options. */
export interface OgeUploadStatusMessages {
  readonly ready: string;
  readonly uploading: string;
  readonly uploaded: string;
  readonly failed: string;
  readonly aborted: string;
  readonly paused: string;
  /** Chunk cursor line; `{index}`, `{total}`. */
  readonly chunk: string;
  /** Transfer rate; `{rate}` is already formatted. */
  readonly rate: string;
  /** Remaining time; `{seconds}`. */
  readonly remaining: string;
}

/**
 * One message per {@link OgeUploadErrorKind}.
 *
 * Placeholders: `{name}`, `{size}`, `{limit}`, `{extensions}`, `{count}` —
 * all pre-formatted, so a translation may reorder them freely.
 */
export interface OgeUploadValidationMessages {
  readonly extension: string;
  readonly maxFileSize: string;
  readonly minFileSize: string;
  readonly maxFileCount: string;
  readonly maxTotalSize: string;
  readonly custom: string;
  readonly server: string;
  /** Shown by the forms validator when the whole control is invalid. */
  readonly invalid: string;
  /** Shown when `required` is set and the list is empty. */
  readonly required: string;
}

/** Live-region templates. Throttled at the source, not here. */
export interface OgeUploadAnnouncementMessages {
  readonly fileAdded: string;
  readonly filesAdded: string;
  readonly fileRejected: string;
  readonly uploadStarted: string;
  readonly uploadProgress: string;
  readonly uploadCompleted: string;
  readonly uploadFailed: string;
  readonly uploadPaused: string;
  readonly uploadResumed: string;
  readonly uploadAborted: string;
  readonly fileRemoved: string;
  readonly cleared: string;
  readonly allCompleted: string;
  readonly dropZoneEntered: string;
}

/** Everything the uploader can say. */
export interface OgeUploadMessages {
  /** Accessible name of the uploader as a whole. */
  readonly uploaderLabel: string;
  /** Heading over the file list; `{count}`. */
  readonly listLabel: string;
  /** Shown in place of the list when nothing is selected. */
  readonly empty: string;
  /** Keyboard hint appended to the uploader's description. */
  readonly hint: string;
  readonly buttons: OgeUploadButtonMessages;
  readonly dropZone: OgeUploadDropZoneMessages;
  readonly status: OgeUploadStatusMessages;
  readonly validation: OgeUploadValidationMessages;
  readonly announcements: OgeUploadAnnouncementMessages;
}

/** The English defaults. */
export const OGE_DEFAULT_UPLOAD_MESSAGES: OgeUploadMessages = {
  uploaderLabel: 'File upload',
  listLabel: 'Selected files ({count})',
  empty: 'No files selected',
  hint: 'Press Enter to browse for files, or drop them on the area.',
  buttons: {
    select: 'Select files',
    selectSingle: 'Select file',
    upload: 'Upload',
    clear: 'Clear',
    cancel: 'Cancel',
    retry: 'Retry',
    pause: 'Pause',
    resume: 'Resume',
    remove: 'Remove',
    preview: 'Preview',
    download: 'Download',
    closePreview: 'Close preview',
  },
  dropZone: {
    label: 'Drop files here or {browse}',
    labelSingle: 'Drop a file here or {browse}',
    browse: 'browse',
    ariaLabel: 'Drop files here, or press Enter to browse',
    hintExtensions: 'Allowed: {extensions}',
    hintMaxSize: 'Up to {maxSize} each',
    hintMaxCount: 'At most {maxCount} files',
  },
  status: {
    ready: 'Ready to upload',
    uploading: 'Uploading',
    uploaded: 'Uploaded',
    failed: 'Upload failed',
    aborted: 'Upload cancelled',
    paused: 'Paused',
    chunk: 'Part {index} of {total}',
    rate: '{rate}/s',
    remaining: '{seconds}s left',
  },
  validation: {
    extension: 'File type is not allowed. Allowed: {extensions}.',
    maxFileSize: 'File is too large. The limit is {limit}.',
    minFileSize: 'File is too small. The minimum is {limit}.',
    maxFileCount: 'Too many files. At most {limit} can be uploaded.',
    maxTotalSize: 'Total size is too large. The limit is {limit}.',
    custom: 'File is not allowed.',
    server: 'The server rejected the upload.',
    invalid: 'One or more files are not valid.',
    required: 'Select at least one file.',
  },
  announcements: {
    fileAdded: '{name} added',
    filesAdded: '{count} files added',
    fileRejected: '{name} was rejected: {reason}',
    uploadStarted: 'Uploading {name}',
    uploadProgress: '{name}, {percent} percent',
    uploadCompleted: '{name} uploaded',
    uploadFailed: '{name} failed to upload: {reason}',
    uploadPaused: '{name} paused',
    uploadResumed: '{name} resumed',
    uploadAborted: '{name} cancelled',
    fileRemoved: '{name} removed',
    cleared: 'All files removed',
    allCompleted: '{succeeded} of {total} files uploaded',
    dropZoneEntered: 'Drop files to add them',
  },
};

/** Package-wide defaults for every uploader in the injector. */
export interface OgeUploadConfig {
  /**
   * How many transfers run at once. `1` is Kendo's `concurrent: false` and
   * Syncfusion's `sequentialUpload: true`.
   */
  readonly concurrency: number;
  /** Chunk size in bytes used when `chunk` is enabled without options. */
  readonly chunkSize: number;
  /** Whether previews are generated for image files at all. */
  readonly showThumbnails: boolean;
  /** Locale for byte formatting; `undefined` follows the host. */
  readonly locale: string | undefined;
  /** `true` prints IEC units (KiB, MiB) instead of SI (KB, MB). */
  readonly binaryFileSizes: boolean;
  readonly messages: OgeUploadMessages;
}

/** The shipped defaults. */
export const OGE_DEFAULT_UPLOAD_CONFIG: OgeUploadConfig = {
  concurrency: 3,
  chunkSize: 1024 * 1024,
  showThumbnails: true,
  locale: undefined,
  binaryFileSizes: false,
  messages: OGE_DEFAULT_UPLOAD_MESSAGES,
};

/** Injection token every uploader reads its defaults from. */
export const OGE_UPLOAD_CONFIG = new InjectionToken<OgeUploadConfig>(
  'OGE_UPLOAD_CONFIG',
  { factory: () => OGE_DEFAULT_UPLOAD_CONFIG },
);

/** What {@link provideOgeUploadConfig} accepts: everything optional, messages deep-partial. */
export type OgeUploadConfigInput = Partial<
  Omit<OgeUploadConfig, 'messages'>
> & {
  messages?: Partial<
    Omit<
      OgeUploadMessages,
      'buttons' | 'dropZone' | 'status' | 'validation' | 'announcements'
    >
  > & {
    buttons?: Partial<OgeUploadButtonMessages>;
    dropZone?: Partial<OgeUploadDropZoneMessages>;
    status?: Partial<OgeUploadStatusMessages>;
    validation?: Partial<OgeUploadValidationMessages>;
    announcements?: Partial<OgeUploadAnnouncementMessages>;
  };
};

/**
 * Overrides the uploader defaults for an application or a route.
 *
 * ```ts
 * provideOgeUploadConfig({
 *   concurrency: 1,
 *   messages: { buttons: { select: 'Dosya seç' } },
 * })
 * ```
 */
export function provideOgeUploadConfig(config: OgeUploadConfigInput): Provider {
  const { messages, ...rest } = config;
  const base = OGE_DEFAULT_UPLOAD_MESSAGES;
  return {
    provide: OGE_UPLOAD_CONFIG,
    useValue: {
      ...OGE_DEFAULT_UPLOAD_CONFIG,
      ...rest,
      messages: {
        ...base,
        ...messages,
        buttons: { ...base.buttons, ...messages?.buttons },
        dropZone: { ...base.dropZone, ...messages?.dropZone },
        status: { ...base.status, ...messages?.status },
        validation: { ...base.validation, ...messages?.validation },
        announcements: { ...base.announcements, ...messages?.announcements },
      },
    } satisfies OgeUploadConfig,
  };
}
