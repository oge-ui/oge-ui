// Hand-compiled from packages/upload/src/lib/** — keep in sync with the
// source TSDoc.
import type { ApiSections } from '../../shared/api-reference';

export const OGE_FILE_UPLOADER_API: ApiSections = {
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
            'Name this uploader answers to, so <code>[ogeUploadDropZone]</code> and <code>[ogeUploadTrigger]</code> elsewhere can reach it. dx <code>dropZone</code>, Kendo <code>zoneId</code>, Syncfusion <code>dropArea</code>.',
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
            'Multipart field name, and the <code>name</code> attribute of the file input. Called <code>fieldName</code> because <code>name</code> belongs to the Angular forms contract — Kendo splits it the same way with <code>saveField</code>.',
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
            'Rewrites each file — compression, watermarking, EXIF stripping. Ant folds this into <code>beforeUpload</code>; keeping it separate from <code>validateFile</code> means a transform cannot accidentally reject. Applied <em>before</em> validation, so the restrictions judge the bytes that will be sent.',
        },
        {
          name: 'thumbnailFor',
          type: '((file: OgeUploadFile) =&gt; string | null | Promise&lt;string | null&gt;) | undefined',
          default: 'undefined',
          description:
            'Supplies a preview the browser cannot make itself — a server-rendered PDF thumbnail, a downscaled canvas image. Ant’s <code>previewFile</code> plus <code>isImageUrl</code>: returning <code>null</code> is the "not an image" half.',
        },
        {
          name: 'inputAttributes',
          type: 'Record&lt;string, string&gt;',
          default: '{}',
          description:
            'Extra attributes for the internal file input, which no Angular binding can reach.',
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
            'Inclusive bounds in bytes. <code>undefined</code> means no limit — an explicit <code>0</code> is a real limit, unlike dx, where it is the sentinel.',
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
            'Replaces the transport wholesale. See <code>createHttpClientUploadAdapter</code> for interceptor support.',
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
          type: 'Partial&lt;OgeUploadMessages&gt;',
          default: 'undefined',
          description:
            'Per-instance override, layered over <code>provideOgeUploadConfig()</code>.',
        },
      ],
    },
    {
      title: 'State and forms',
      entries: [
        {
          name: 'value',
          type: 'model&lt;readonly File[]&gt;',
          default: '[]',
          description:
            'Every row that carries a real <code>File</code>, <strong>including invalid ones</strong> — hiding them would let <code>required</code> pass while a file is plainly on screen. The validator is what blocks submission.',
        },
        {
          name: 'disabled / readonly / required / invalid / touched / dirty / name / errors',
          type: 'FormValueControl contract',
          default: '—',
          description:
            'The Signal Forms member names. Never bind these alongside <code>[formField]</code> — express them in the schema.',
        },
        {
          name: 'files',
          type: 'Signal&lt;readonly OgeUploadFile[]&gt;',
          default: '—',
          description: 'Read-only. Every row, invalid and preloaded included.',
        },
        {
          name: 'progress / busy / uploadedCount / fileCount / limitExceeded / valid / validationErrors',
          type: 'Signal',
          default: '—',
          description:
            'Read-only. Replaces dx’s <code>progress</code>/<code>isValid</code>/<code>validationErrors</code> and PrimeNG’s boolean methods.',
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
            'Opens the built-in lightbox / downloads the file. Both fire a cancelable event first, so an app can substitute its own viewer or signed-URL flow — Ant’s <code>onPreview</code> and <code>onDownload</code>.',
        },
        {
          name: 'reset(value?)',
          type: 'void',
          description:
            'dx’s <code>reset</code>: back to a pristine state, clearing touched and dirty. Fires no <code>clearing</code> pipeline — a reset is the app rewinding its form, not the user removing files.',
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
          name: 'filesSelecting',
          type: 'OgeUploadFilesSelectingEvent',
          description:
            '<strong>Cancelable.</strong> Before anything is validated or added. Carries the source: dialog, drop, paste or api.',
        },
        {
          name: 'filesSelected / fileRejected / filesDropped',
          type: 'event',
          description:
            '<code>fileRejected</code> fires once per file that failed a restriction — <strong>OGE extra</strong>; the references only render a message.',
        },
        {
          name: 'dropZoneEntered / dropZoneLeft',
          type: 'OgeUploadDropZoneEvent',
          description:
            'dx <code>onDropZoneEnter</code> / <code>onDropZoneLeave</code>.',
        },
      ],
    },
    {
      title: 'Transfers',
      entries: [
        {
          name: 'uploading',
          type: 'OgeUploadUploadingEvent',
          description:
            '<strong>Cancelable</strong>, and the one place the outgoing <code>request</code> is writable — dx’s <code>onBeforeSend</code>.',
        },
        {
          name: 'uploadStarted / uploadProgress / uploaded / uploadFailed / uploadAborted / allUploaded',
          type: 'event',
          description:
            '<code>uploadStarted</code> fires when a request actually goes out — not when the file is queued, and again on a retry.',
        },
        {
          name: 'chunkUploading / chunkUploaded / chunkFailed',
          type: 'event',
          description: '<code>chunkUploading</code> is cancelable, per slice.',
        },
        {
          name: 'uploadPausing / uploadPaused / uploadResuming / uploadResumed',
          type: 'event',
          description: 'The <code>-ing</code> halves are cancelable.',
        },
      ],
    },
    {
      title: 'List',
      entries: [
        {
          name: 'fileRemoving / fileRemoved',
          type: 'event',
          description:
            '<code>fileRemoving</code> is cancelable and reports whether a server delete will follow.',
        },
        {
          name: 'clearing / cleared',
          type: 'event',
          description: '<code>clearing</code> is cancelable.',
        },
        {
          name: 'previewShowing / previewHidden',
          type: 'event',
          description:
            '<code>previewShowing</code> is cancelable — veto it to open your own viewer instead of the built-in lightbox.',
        },
        {
          name: 'fileDownloading',
          type: 'OgeUploadFileDownloadingEvent',
          description:
            'Cancelable. The default is an anchor click against the server <code>url</code>, or a temporary object URL for a file that only exists locally.',
        },
        {
          name: 'thumbnailFailed / valueChange / touch',
          type: 'event',
          description:
            'Preview decode failure, the two-way model, and the forms contract.',
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
            '<code>uid</code>, <code>name</code>, <code>size</code>, <code>type</code>, <code>file</code>, <code>status</code>, <code>loaded</code>, <code>progress</code>, <code>errors</code>, <code>response</code>, <code>httpStatus</code>, <code>chunk</code>, <code>attempts</code>, plus <code>bytesPerSecond</code> and <code>secondsRemaining</code> (<strong>OGE extra</strong>).',
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
          name: 'OGE_UPLOAD_TRANSPORT',
          type: 'InjectionToken',
          description:
            'The default adapter. Override it in tests and demos; jsdom’s XHR performs real network I/O.',
        },
        {
          name: 'provideOgeUploadConfig(config)',
          type: 'Provider',
          description:
            'App-wide defaults and messages — five nested message blocks: buttons, dropZone, status, validation, announcements. Messages render through <code>ogeFormatMessage</code> in the config <code>locale</code>, so count messages are ICU plurals (<code>filesAdded: {count, plural, one {# file added} other {# files added}}</code>).',
        },
        {
          name: 'OgeUploadDropZone',
          type: 'directive — <code>[ogeUploadDropZone]</code>',
          description:
            'Turns any element into a drop target for the uploader whose <code>dropZone</code> matches the given name. Exposes an <code>over</code> signal for your own hover styling.',
        },
        {
          name: 'OgeUploadTrigger',
          type: 'directive — <code>[ogeUploadTrigger]</code>',
          description:
            'Opens an uploader’s file dialog from a button elsewhere on the page — dx’s <code>dialogTrigger</code>. Disables itself while no uploader answers to that name.',
        },
        {
          name: 'createXhrUploadAdapter()',
          type: '() =&gt; OgeUploadAdapter',
          description:
            'The default transport, and the value behind <code>OGE_UPLOAD_TRANSPORT</code>. Exported so a custom adapter can delegate to it.',
        },
        {
          name: 'createHttpClientUploadAdapter(http)',
          type: '(http: HttpClient) =&gt; OgeUploadAdapter',
          description:
            'Runs transfers through Angular’s <code>HttpClient</code>, so interceptors (auth, tracing) apply. <code>@angular/common/http</code> is passed in, never imported by the package.',
        },
      ],
    },
    {
      title: 'Template directives',
      entries: [
        {
          name: 'OgeUploadFileTemplate',
          type: 'directive — <code>*ogeUploadFileTemplate</code>',
          description:
            'Replaces one file row. Context: <code>$implicit</code> (the file), <code>index</code>, and the pre-formatted <code>size</code> and <code>status</code>. Covers PrimeNG’s <code>file</code>/<code>filelabel</code>, Syncfusion’s <code>template</code> and Ant’s <code>itemRender</code>.',
        },
        {
          name: 'OgeUploadHeaderTemplate',
          type: 'directive — <code>*ogeUploadHeaderTemplate</code>',
          description:
            'Replaces the strip above the list. Context: the files, <code>count</code>, <code>uploadedCount</code> and a pre-formatted <code>totalSize</code>.',
        },
        {
          name: 'OgeUploadDropZoneTemplate',
          type: 'directive — <code>*ogeUploadDropZoneTemplate</code>',
          description:
            'Replaces the drop zone’s contents. Context: <code>$implicit</code> is <code>true</code> while files hover, plus <code>disabled</code>.',
        },
        {
          name: 'OgeUploadEmptyTemplate',
          type: 'directive — <code>*ogeUploadEmptyTemplate</code>',
          description:
            'Rendered in place of the list while nothing is selected.',
        },
        {
          name: 'OgeUploadToolbarTemplate',
          type: 'directive — <code>*ogeUploadToolbarTemplate</code>',
          description:
            'Replaces the Upload/Clear action row. Context: the files and <code>uploading</code>.',
        },
        {
          name: 'OgeUploadIconTemplate',
          type: 'directive — <code>*ogeUploadIconTemplate</code>',
          description:
            'Replaces one glyph. <code>$implicit</code> is an <code>OgeUploadIconSlot</code> — 14 values covering PrimeNG’s four icon slots and Ant’s three, in one directive instead of seven inputs.',
        },
      ],
    },
  ],
};

export const OGE_FILE_MANAGER_API: ApiSections = {
  properties: [
    {
      title: 'Content',
      entries: [
        {
          name: 'provider',
          type: 'OgeFileProvider',
          description:
            'Where the files live. Required. A new provider lists everything again from the root.',
        },
        {
          name: 'view',
          type: 'OgeFileView',
          default: "'list'",
          description: 'List or grid; two-way with <code>[(view)]</code>.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeFileManagerMessages&gt;',
          default: '{}',
          description: 'Overrides of the message catalog.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Events',
      entries: [
        {
          name: 'fileOpen',
          type: 'OgeFileItem',
          description:
            'A file was opened (double click, Enter); folders open in place.',
        },
        {
          name: 'folderChange',
          type: 'string | null',
          description: 'The open folder changed (<code>null</code>: the root).',
        },
        {
          name: 'selectionChange',
          type: 'readonly OgeFileItem[]',
          description: 'The selection changed.',
        },
        {
          name: 'deleting',
          type: 'OgeFileDeletingEvent',
          description:
            'Cancelable, before a delete — a confirmation dialog hooks in here.',
        },
        {
          name: 'providerError',
          type: 'unknown',
          description:
            'A provider call failed (the folder shows the load error itself).',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Methods',
      entries: [
        {
          name: 'refresh()',
          type: 'Promise&lt;void&gt;',
          description: 'Lists the open folder again.',
        },
        {
          name: 'open(folderId)',
          type: 'Promise&lt;void&gt;',
          description: 'Opens a folder (<code>null</code>: the root).',
        },
        {
          name: 'upload(files)',
          type: 'Promise&lt;void&gt;',
          description: 'Uploads files into the open folder.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Types',
      entries: [
        {
          name: 'OgeFileProvider',
          type: 'interface',
          description:
            'Where the files live: <code>list(folderId)</code> (required; the items directly inside a folder, <code>null</code> for the root) and the optional <code>createFolder</code>, <code>rename</code>, <code>delete</code>, <code>move(items, targetId)</code> and <code>upload(parentId, files)</code>. A missing operation hides its command.',
        },
        {
          name: 'OgeFileItem',
          type: 'interface',
          description:
            '<code>{ id, name, parentId, isFolder, size?, modified? }</code> — <code>parentId</code> is <code>null</code> at the root; <code>modified</code> is a <code>Date</code> or ISO text.',
        },
        {
          name: 'ogeMemoryFileProvider(items, options?)',
          type: '(items: OgeFileItem[], { newId?, now? }) =&gt; OgeFileProvider',
          description:
            'A provider over an in-memory list: demos, tests, and a starting point for your own (its <code>items()</code> returns the current list).',
        },
        {
          name: 'OgeFileView',
          type: "'list' | 'grid'",
          description: 'Rows with name, size and modified columns, or tiles.',
        },
        {
          name: 'OgeFileSortField',
          type: "'name' | 'size' | 'modified'",
          description:
            'The sortable columns; folders always come first, names sort naturally (<code>a9</code> before <code>a10</code>).',
        },
        {
          name: 'OgeFileDeletingEvent',
          type: 'interface',
          description:
            '<code>{ items, cancel, wait(promise) }</code> — set <code>cancel</code> to keep the items; <code>wait()</code> holds the delete until a confirmation dialog answers.',
        },
        {
          name: 'OgeFileCommand',
          type: "'open' | 'rename' | 'delete' | 'new-folder' | 'upload' | 'refresh'",
          description: 'The commands of the toolbar and the context menu.',
        },
        {
          name: 'OgeFileManagerMessages',
          type: 'interface',
          description:
            'The file manager&#39;s text, under <code>messages.fileManager</code> of the upload config (<code>provideOgeUploadConfig</code>) and the <code>upload.fileManager</code> slice of the locale packs. Defaults in <code>OGE_DEFAULT_FILE_MANAGER_MESSAGES</code>.',
        },
        {
          name: 'OGE_FILE_ITEMS_MIME',
          type: "'application/x-oge-file-items'",
          description:
            'The drag data an item drag carries (a JSON array of ids), for drop targets of your own.',
        },
      ],
    },
  ],
};
