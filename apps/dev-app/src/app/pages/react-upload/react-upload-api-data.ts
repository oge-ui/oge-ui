// Hand-compiled from packages/react/upload/src/lib/** — keep in sync with the
// source TSDoc.
//
// Mirrors `pages/upload/upload-api-data.ts` block for block and group for
// group, so the two views read as one page across the switch and the parity
// gate can diff them member by member. What differs is the idiom — a
// controlled `value` pair instead of `model()`, `on`-prefixed callbacks
// instead of outputs, a `ref` handle instead of public members and signals,
// render props instead of structural directives, providers + hooks instead
// of DI tokens.
import type { ApiSections } from '../../shared/api-reference';

export const OGE_REACT_FILE_UPLOADER_API: ApiSections = {
  properties: [
    {
      title: 'Selection',
      entries: [
        {
          name: 'accept',
          type: 'string',
          default: "''",
          description:
            'The <code>accept</code> attribute of the file input. Also filters drops and pastes, which the browser does not do for you.',
        },
        {
          name: 'multiple',
          type: 'boolean',
          default: 'true',
          description:
            'Allows several files. With <code>false</code> a new selection <em>replaces</em> the list, which is what every reference does.',
        },
        {
          name: 'directory',
          type: 'boolean',
          default: 'false',
          description:
            'Lets the dialog pick a folder, and descends into dropped folders. Falls back to the flat file list where the entry API is unavailable.',
        },
        {
          name: 'pastable',
          type: 'boolean',
          default: 'false',
          description:
            'Adds files from a paste while the uploader has focus — a pasted screenshot included.',
        },
        {
          name: 'allowDrop',
          type: 'boolean',
          default: 'true',
          description:
            'Turns drag &amp; drop off without hiding the browse affordance.',
        },
        {
          name: 'dropZone',
          type: 'string | undefined',
          default: 'undefined',
          description:
            'Name this uploader answers to, so <code>&lt;OgeUploadDropZone&gt;</code> and <code>&lt;OgeUploadTrigger&gt;</code> elsewhere can reach it. dx <code>dropZone</code>, Kendo <code>zoneId</code>, Syncfusion <code>dropArea</code>.',
        },
        {
          name: 'dropEffect',
          type: "'copy' | 'move' | 'link' | 'none' | 'default'",
          default: "'copy'",
          description: 'Pointer feedback while files hover the zone.',
        },
        {
          name: 'fieldName',
          type: 'string',
          default: "'files[]'",
          description:
            'Multipart field name, and the <code>name</code> attribute of the file input — Kendo’s <code>saveField</code>.',
        },
        {
          name: 'openFileDialogOnClick',
          type: 'boolean',
          default: 'true',
          description:
            'Ant’s option. <code>false</code> makes the zone drop-only — and stops it being a button, because a button that does nothing on Enter is worse than none; the separate browse button appears instead so the keyboard path survives.',
        },
        {
          name: 'capture',
          type: "boolean | 'user' | 'environment'",
          default: 'undefined',
          description:
            'The native <code>capture</code> attribute: opens the camera or microphone directly on mobile instead of the file browser.',
        },
        {
          name: 'transformFile',
          type: '((file: File) =&gt; File | Promise&lt;File&gt;) | undefined',
          default: 'undefined',
          description:
            'Rewrites each file — compression, watermarking, EXIF stripping. Applied <em>before</em> validation, so the restrictions judge the bytes that will be sent.',
        },
        {
          name: 'thumbnailFor',
          type: '((file: OgeUploadFile) =&gt; string | null | Promise&lt;string | null&gt;) | undefined',
          default: 'undefined',
          description:
            'Supplies a preview the browser cannot make itself — a server-rendered PDF thumbnail, a downscaled canvas image. Returning <code>null</code> is the "not an image" half.',
        },
        {
          name: 'inputAttributes',
          type: 'Record&lt;string, string&gt;',
          default: '{}',
          description:
            'Extra attributes for the internal file input, applied imperatively.',
        },
      ],
    },
    {
      title: 'Restrictions',
      entries: [
        {
          name: 'allowedFileExtensions',
          type: 'readonly string[]',
          default: '[]',
          description:
            '<code>.png</code>-style or bare <code>png</code>-style; empty allows everything.',
        },
        {
          name: 'maxFileSize / minFileSize',
          type: 'number | undefined',
          default: 'undefined',
          description:
            'Inclusive bounds in bytes. <code>undefined</code> means no limit — an explicit <code>0</code> is a real limit.',
        },
        {
          name: 'maxFileCount',
          type: 'number | undefined',
          default: 'undefined',
          description:
            'Only the files past the limit are rejected, and a rejected file never spends a count slot.',
        },
        {
          name: 'maxTotalFileSize',
          type: 'number | undefined',
          default: 'undefined',
          description:
            'Budget across the whole list. <strong>OGE extra</strong>.',
        },
        {
          name: 'validateFile',
          type: '((file: File) =&gt; string | null) | undefined',
          default: 'undefined',
          description:
            'Returns a message to reject, or <code>null</code> to accept — the validation half of Ant’s <code>beforeUpload</code>.',
        },
      ],
    },
    {
      title: 'Transport',
      entries: [
        {
          name: 'uploadUrl',
          type: 'string | ((files: readonly File[]) =&gt; string)',
          default: "''",
          description:
            'Empty means there is nowhere to send to, and nothing is sent — the uploader stays a picker.',
        },
        {
          name: 'uploadMode',
          type: "'instantly' | 'useButtons' | 'useForm' | 'select'",
          default: "'instantly'",
          description:
            '<code>select</code> never uploads: Kendo’s FileSelect as a mode rather than a second component.',
        },
        {
          name: 'uploadMethod / uploadHeaders / uploadCustomData',
          type: "'post' | 'put' | 'patch' / Record / Record | fn",
          default: "'post' / {} / {}",
          description:
            '<code>uploadCustomData</code> also takes a per-file function — Ant’s <code>data</code> in both shapes.',
        },
        {
          name: 'withCredentials / responseType / timeout',
          type: "boolean / 'json' | 'text' | 'blob' / number",
          default: 'false / json / undefined',
          description: 'Standard request knobs.',
        },
        {
          name: 'batch',
          type: 'boolean',
          default: 'false',
          description: 'Every file in one request.',
        },
        {
          name: 'concurrency',
          type: 'number | undefined',
          default: '3 (config)',
          description:
            'One number replaces two booleans: Kendo’s <code>concurrent: false</code> and Syncfusion’s <code>sequentialUpload: true</code> are both <code>1</code>.',
        },
        {
          name: 'chunk',
          type: 'boolean | OgeUploadChunkOptions',
          default: 'false',
          description:
            'Kendo’s <code>ChunkSettings</code> defaults: <code>size: 1 MiB</code>, <code>autoRetryAfter: 100</code>, <code>maxAutoRetries: 1</code>, <code>resumable: true</code>.',
        },
        {
          name: 'autoRetry',
          type: 'boolean | OgeUploadRetryOptions',
          default: 'false',
          description:
            'Whole-file retry; defaults <code>{ count: 3, delayMs: 500 }</code>. A run serving its backoff frees its concurrency slot.',
        },
        {
          name: 'uploadAdapter',
          type: 'OgeUploadAdapter | undefined',
          default: 'undefined',
          description:
            'Replaces the transport wholesale for this instance; <code>&lt;OgeUploadTransportProvider&gt;</code> does it for a subtree.',
        },
        {
          name: 'abortable',
          type: 'boolean',
          default: 'true',
          description: 'dx’s <code>allowCanceling</code>.',
        },
        {
          name: 'removeUrl / removeMethod / removeHeaders / removeField',
          type: "string / 'post' | 'delete' / Record / string",
          default: "undefined / 'post' / {} / 'fileNames'",
          description:
            'Server-side delete. Only files that actually reached the server are deleted there.',
        },
      ],
    },
    {
      title: 'Display',
      entries: [
        {
          name: 'displayMode',
          type: "'full' | 'compact' | 'button'",
          default: "'full'",
          description:
            'PrimeNG’s advanced/basic pair, plus a slim <code>compact</code> bar (<strong>OGE extra</strong>).',
        },
        {
          name: 'showFileList',
          type: 'boolean | OgeUploadFileListOptions',
          default: 'true',
          description:
            'The boolean, or Ant’s options object (<code>showRemove</code>, <code>showRetry</code>, <code>showCancel</code>, <code>showPause</code>, …).',
        },
        {
          name: 'listType / previewWidth',
          type: "'text' | 'picture' | 'pictureCard' / number",
          default: "'text' / 50",
          description: 'Preview rendering.',
        },
        {
          name: 'actionsLayout',
          type: "'start' | 'center' | 'end' | 'stretch'",
          default: "'end'",
          description: 'Where the action row sits.',
        },
        {
          name: 'showUploadButton / showClearButton / showCancelButton',
          type: 'boolean | undefined',
          default: 'undefined',
          description:
            '<code>undefined</code> derives visibility from <code>uploadMode</code> — no button that has nothing to do.',
        },
        {
          name: 'initialFiles',
          type: 'readonly OgeUploadPreloadedFile[]',
          default: '[]',
          description:
            'Files that already live on the server — Syncfusion’s <code>files</code>, Ant’s <code>defaultFileList</code>.',
        },
        {
          name: 'messages',
          type: 'OgeUploadMessagesInput',
          default: 'undefined',
          description:
            'Per-instance override, layered over <code>&lt;OgeUploadConfigProvider&gt;</code>.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          default: '—',
          description: 'Applied to the uploader host.',
        },
      ],
    },
    {
      title: 'State and forms',
      entries: [
        {
          name: 'value',
          type: 'readonly File[]',
          default: '[]',
          description:
            'Every row that carries a real <code>File</code>, <strong>including invalid ones</strong> — controlled when provided, so pass <code>onValueChange</code> with it. Hiding invalid rows would let <code>required</code> pass while a file is plainly on screen; the handle’s <code>valid</code> flag is what blocks submission.',
        },
        {
          name: 'defaultValue',
          type: 'readonly File[]',
          default: '[]',
          description: 'Uncontrolled initial value.',
        },
        {
          name: 'onValueChange',
          type: '(files: readonly File[]) =&gt; void',
          default: '—',
          description:
            'The controlled half of <code>value</code>; Angular’s <code>[(value)]</code> model is both halves at once.',
        },
        {
          name: 'disabled / readOnly / required / invalid / touched / dirty / name / errors',
          type: 'FormValueControl contract',
          default: '—',
          description:
            'The same member names the Angular Signal Forms contract fixes — here plain props; <code>&lt;OgeForm&gt;</code> drives them for its <code>fileUploader</code> editor.',
        },
        {
          name: 'files',
          type: 'readonly OgeUploadFile[] (handle)',
          default: '—',
          description:
            'Read off the <code>ref</code> handle. Every row, invalid and preloaded included.',
        },
        {
          name: 'progress / busy / uploadedCount / fileCount / limitExceeded / valid / validationErrors',
          type: 'handle getters',
          default: '—',
          description:
            'Read off the <code>ref</code> handle — Angular exposes the same names as signals. Replaces dx’s <code>progress</code>/<code>isValid</code>/<code>validationErrors</code> and PrimeNG’s boolean methods.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'OgeFileUploader',
      entries: [
        {
          name: 'upload(uids?)',
          type: 'void',
          description:
            'Starts the queued transfers. Files that failed a restriction are never sent.',
        },
        {
          name: 'abort(uid?, reason?)',
          type: 'void',
          description:
            'dx <code>abortUpload</code>, Kendo <code>cancelUploadByUid</code>.',
        },
        {
          name: 'pause(uid) / resume(uid)',
          type: 'boolean',
          description:
            'Chunked and resumable transfers only; returns <code>false</code> otherwise rather than aborting and calling it a pause.',
        },
        {
          name: 'retry(uid?)',
          type: 'void',
          description:
            'With no argument, everything that failed or was aborted.',
        },
        {
          name: 'addFiles(files)',
          type: 'void',
          description: 'Adds files through the same pipeline as a drop.',
        },
        {
          name: 'removeFile(uid) / clear()',
          type: 'void',
          description: 'Both run their cancelable pre-event first.',
        },
        {
          name: 'openFileDialog()',
          type: 'void',
          description: 'PrimeNG <code>choose</code>.',
        },
        {
          name: 'getFiles(index?) / sortFiles(compare?)',
          type: 'readonly OgeUploadFile[] / void',
          description:
            'Syncfusion <code>getFilesData</code> / <code>sortFileList</code>; sorts by name unless told otherwise.',
        },
        {
          name: 'preview(uid) / download(uid)',
          type: 'void',
          description:
            'Opens the built-in lightbox / downloads the file. Both fire a cancelable callback first, so an app can substitute its own viewer or signed-URL flow — Ant’s <code>onPreview</code> and <code>onDownload</code>.',
        },
        {
          name: 'reset(value?)',
          type: 'void',
          description:
            'dx’s <code>reset</code>: back to a pristine state. Fires no <code>onClearing</code> pipeline — a reset is the app rewinding its form, not the user removing files.',
        },
        {
          name: 'focus() / blur()',
          type: 'void',
          description: 'Moves focus to the browse affordance.',
        },
        {
          name: 'formatFileSize(bytes, options?)',
          type: 'string',
          description:
            'Exported free function — PrimeNG <code>formatSize</code>, Syncfusion <code>bytesToSize</code>.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Selection',
      entries: [
        {
          name: 'onFilesSelecting',
          type: '(event: OgeUploadFilesSelectingEvent) =&gt; void',
          description:
            '<strong>Cancelable</strong> (set <code>event.cancel</code>). Before anything is validated or added. Carries the source: dialog, drop, paste or api.',
        },
        {
          name: 'onFilesSelected / onFileRejected / onFilesDropped',
          type: 'callback',
          description:
            '<code>onFileRejected</code> fires once per file that failed a restriction — <strong>OGE extra</strong>; the references only render a message.',
        },
        {
          name: 'onDropZoneEntered / onDropZoneLeft',
          type: '(event: OgeUploadDropZoneEvent) =&gt; void',
          description:
            'dx <code>onDropZoneEnter</code> / <code>onDropZoneLeave</code>.',
        },
      ],
    },
    {
      title: 'Transfers',
      entries: [
        {
          name: 'onUploading',
          type: '(event: OgeUploadUploadingEvent) =&gt; void',
          description:
            '<strong>Cancelable</strong>, and the one place the outgoing <code>request</code> is writable — dx’s <code>onBeforeSend</code>.',
        },
        {
          name: 'onUploadStarted / onUploadProgress / onUploaded / onUploadFailed / onUploadAborted / onAllUploaded',
          type: 'callback',
          description:
            '<code>onUploadStarted</code> fires when a request actually goes out — not when the file is queued, and again on a retry.',
        },
        {
          name: 'onChunkUploading / onChunkUploaded / onChunkFailed',
          type: 'callback',
          description:
            '<code>onChunkUploading</code> is cancelable, per slice.',
        },
        {
          name: 'onUploadPausing / onUploadPaused / onUploadResuming / onUploadResumed',
          type: 'callback',
          description: 'The <code>-ing</code> halves are cancelable.',
        },
      ],
    },
    {
      title: 'List',
      entries: [
        {
          name: 'onFileRemoving / onFileRemoved',
          type: 'callback',
          description:
            '<code>onFileRemoving</code> is cancelable and reports whether a server delete will follow.',
        },
        {
          name: 'onClearing / onCleared',
          type: 'callback',
          description: '<code>onClearing</code> is cancelable.',
        },
        {
          name: 'onPreviewShowing / onPreviewHidden',
          type: 'callback',
          description:
            '<code>onPreviewShowing</code> is cancelable — veto it to open your own viewer instead of the built-in lightbox.',
        },
        {
          name: 'onFileDownloading',
          type: '(event: OgeUploadFileDownloadingEvent) =&gt; void',
          description:
            'Cancelable. The default is an anchor click against the server <code>url</code>, or a temporary object URL for a file that only exists locally.',
        },
        {
          name: 'onThumbnailFailed / onValueChange / onTouch',
          type: 'callback',
          description:
            'Preview decode failure, the controlled value, and the forms contract (fires once per interaction that dirties the control).',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Types',
      entries: [
        {
          name: 'OgeUploadFile',
          type: 'interface',
          description:
            '<code>uid</code>, <code>name</code>, <code>size</code>, <code>type</code>, <code>file</code>, <code>status</code>, <code>loaded</code>, <code>progress</code>, <code>errors</code>, <code>response</code>, <code>httpStatus</code>, <code>chunk</code>, <code>attempts</code>, plus <code>bytesPerSecond</code> and <code>secondsRemaining</code> (<strong>OGE extra</strong>). Shared with the Angular package via <code>&#64;oge-ui/behavior</code>.',
        },
        {
          name: 'OgeUploadFileStatus',
          type: 'union',
          description:
            "<code>'pending' | 'uploading' | 'paused' | 'uploaded' | 'failed' | 'aborted' | 'invalid' | 'removed'</code>.",
        },
        {
          name: 'OgeUploadAdapter',
          type: 'interface',
          description:
            '<code>send(parts, request, callbacks)</code> and optional <code>remove(...)</code>. Batch versus per-file is the shape of the argument, not a flag.',
        },
        {
          name: 'OgeUploadChunkMetadata',
          type: 'interface',
          description:
            'Kendo’s <code>ChunkMetadata</code> field for field, so a Kendo-shaped server needs no changes.',
        },
        {
          name: '&lt;OgeUploadTransportProvider adapter&gt;',
          type: 'component',
          description:
            'The default adapter for a subtree — the counterpart of Angular’s <code>OGE_UPLOAD_TRANSPORT</code> token. Override it in tests and demos; jsdom’s XHR performs real network I/O.',
        },
        {
          name: '&lt;OgeUploadConfigProvider config&gt;',
          type: 'component',
          description:
            'App-wide defaults and messages — five nested message blocks: buttons, dropZone, status, validation, announcements. The counterpart of <code>provideOgeUploadConfig()</code>.',
        },
        {
          name: '&lt;OgeUploadDropZone zone&gt;',
          type: 'component',
          description:
            'Turns its element into a drop target for the uploader whose <code>dropZone</code> matches the given name. Reports hover through <code>onOverChange</code> for your own styling.',
        },
        {
          name: '&lt;OgeUploadTrigger zone&gt;',
          type: 'component',
          description:
            'A real <code>&lt;button&gt;</code> that opens an uploader’s file dialog from elsewhere on the page — dx’s <code>dialogTrigger</code>. Disables itself while no uploader answers to that name.',
        },
        {
          name: 'createXhrUploadAdapter()',
          type: '() =&gt; OgeUploadAdapter',
          description:
            'The default transport. Exported so a custom adapter can delegate to it.',
        },
        {
          name: 'OgeFileUploaderHandle',
          type: 'ref handle',
          description:
            'Every public method above plus the read-only getters <code>files</code>, <code>valid</code>, <code>validationErrors</code>, <code>busy</code>, <code>progress</code>, <code>uploadedCount</code>, <code>fileCount</code>, <code>limitExceeded</code>.',
        },
      ],
    },
    {
      title: 'Template directives (render props)',
      entries: [
        {
          name: 'renderFile',
          type: '(context: OgeUploadFileRenderContext) =&gt; ReactNode',
          description:
            'Replaces one file row — the React face of <code>*ogeUploadFileTemplate</code>. Context: <code>file</code>, <code>index</code>, and the pre-formatted <code>size</code> and <code>status</code>.',
        },
        {
          name: 'renderHeader',
          type: '(context: OgeUploadHeaderRenderContext) =&gt; ReactNode',
          description:
            'Replaces the strip above the list — <code>*ogeUploadHeaderTemplate</code>. Context: <code>files</code>, <code>count</code>, <code>uploadedCount</code> and a pre-formatted <code>totalSize</code>.',
        },
        {
          name: 'renderDropZone',
          type: '(context: OgeUploadDropZoneRenderContext) =&gt; ReactNode',
          description:
            'Replaces the drop zone’s contents — <code>*ogeUploadDropZoneTemplate</code>. Context: <code>over</code> (<code>true</code> while files hover) and <code>disabled</code>.',
        },
        {
          name: 'renderEmpty',
          type: '() =&gt; ReactNode',
          description:
            'Rendered in place of the list while nothing is selected — <code>*ogeUploadEmptyTemplate</code>.',
        },
        {
          name: 'renderToolbar',
          type: '(context: OgeUploadToolbarRenderContext) =&gt; ReactNode',
          description:
            'Replaces the Upload/Clear action row — <code>*ogeUploadToolbarTemplate</code>. Context: <code>files</code> and <code>uploading</code>.',
        },
        {
          name: 'renderIcon',
          type: '(slot: OgeUploadIconSlot) =&gt; ReactNode',
          description:
            'Replaces one glyph — <code>*ogeUploadIconTemplate</code>. The slot is one of 14 values covering PrimeNG’s four icon slots and Ant’s three, in one render prop instead of seven.',
        },
      ],
    },
  ],
};
