import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React upload overview. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../upload/overview.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): the same eight sections, same order, same
 * example content, React idiom — the one heading that differs is the forms
 * section, which demos the controlled value instead of Angular's `formControl`
 * (a recorded exception).
 */
export const UPLOAD_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-upload': ['OgeFileUploader'] },
      name: 'AttachmentsPicker',
      body: `const [attachments, setAttachments] = useState<readonly File[]>([]);`,
      jsx: `<>
  {/* With no uploadUrl this is a file picker: drag & drop, restrictions,
      previews and removal, with everything chosen exposed through the
      controlled value as plain File objects. Add uploadUrl and the same
      element uploads. */}
  <OgeFileUploader
    value={attachments}
    onValueChange={setAttachments}
    accept="image/*,.pdf"
    maxFileSize={5 * 1024 * 1024}
    maxFileCount={5}
  />

  <p>{attachments.length} file(s) ready</p>
</>`,
    }),
  },
  {
    title: 'Uploading',
    source: reactDemoSource({
      use: { '@oge-ui/react-upload': ['OgeFileUploader'] },
      name: 'UploadForm',
      body: `// uploadMode decides when bytes move: 'instantly' on selection,
// 'useButtons' waits for the Upload button, 'select' never uploads.
// Progress, cancel and retry appear on each row as the transfer needs them.
const onUploaded = (name: string, response: unknown) => console.log('uploaded', name, response);
const onFailed = (name: string, message: string) => console.warn('failed', name, message);`,
      jsx: `<OgeFileUploader
  uploadUrl="/api/upload"
  uploadMode="useButtons"
  uploadHeaders={{ Authorization: 'Bearer demo' }}
  concurrency={2}
  onUploaded={(e) => onUploaded(e.file.name, e.response)}
  onUploadFailed={(e) => onFailed(e.file.name, e.message)}
/>`,
    }),
  },
  {
    title: 'Chunked and resumable',
    source: reactDemoSource({
      use: { '@oge-ui/react-upload': ['OgeFileUploader'] },
      name: 'ChunkedUpload',
      body: `// Chunked transfer sends one slice per request, carrying Kendo-shaped
// metadata so an existing chunked endpoint needs no changes. Pause and
// resume appear only here: a whole-file request has nothing to suspend,
// so the affordance is derived from the transport rather than configured.
const onChunk = (index: number, total: number) => console.log(\`chunk \${index + 1} of \${total}\`);`,
      jsx: `<OgeFileUploader
  uploadUrl="/api/upload"
  chunk={{ size: 512 * 1024, maxAutoRetries: 2, resumable: true }}
  autoRetry={{ count: 2, delayMs: 400 }}
  onChunkUploaded={(e) => onChunk(e.chunkIndex, e.totalChunks)}
/>`,
    }),
  },
  {
    title: 'Restrictions',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-upload': ['OgeFileUploader'] },
      name: 'RestrictedPicker',
      body: `const [lastRejection, setLastRejection] = useState<string | null>(null);

/** Returns a message to reject, or null to accept. */
const noSpaces = (file: File): string | null =>
  file.name.includes(' ') ? 'File names must not contain spaces.' : null;`,
      jsx: `<>
  {/* A rejected file stays on the list with its reason next to it, rather
      than vanishing. It is still in value — hiding it would let a required
      field pass while the user can plainly see a file on screen — and the
      handle's valid flag is what goes false. */}
  <OgeFileUploader
    allowedFileExtensions={['.png', '.jpg', '.pdf']}
    maxFileSize={1024 * 1024}
    minFileSize={1024}
    maxTotalFileSize={4 * 1024 * 1024}
    validateFile={noSpaces}
    onFileRejected={(e) => setLastRejection(e.errors[0].message)}
  />

  {lastRejection && <p role="status">{lastRejection}</p>}
</>`,
    }),
  },
  {
    title: 'Previews',
    source: reactDemoSource({
      use: { '@oge-ui/react-upload': ['OgeFileUploader'] },
      name: 'PicturePicker',
      jsx: `// listType renders previews instead of a text row. The object URLs
// behind them are owned by the component and revoked on remove, clear
// and unmount.
<OgeFileUploader accept="image/*" listType="pictureCard" previewWidth={96} />`,
    }),
  },
  {
    title: 'External drop zone',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-upload': [
          'OgeFileUploader',
          'OgeUploadDropZone',
          'OgeUploadTrigger',
        ],
      },
      name: 'PanelUpload',
      jsx: `<>
  {/* The drop surface is often a whole panel that has nothing to do with
      the uploader's own markup. That is a different element, which no mode
      value can express — hence a wrapper, matched by name. */}
  <OgeUploadDropZone zone="attachments" className="panel">
    Drop files anywhere in this panel
  </OgeUploadDropZone>

  <OgeUploadTrigger zone="attachments">Attach files…</OgeUploadTrigger>

  <OgeFileUploader dropZone="attachments" displayMode="compact" />
</>`,
    }),
  },
  {
    title: 'Controlled value & forms',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-upload': ['OgeFileUploader'] },
      types: { '@oge-ui/react-upload': ['OgeFileUploaderHandle'] },
      name: 'RequiredAttachments',
      body: `// The restrictions live on the uploader, so a form never restates
// maxFileSize as a second rule that could drift: read the handle's
// valid flag (or onFileRejected) and block submission on it. The same
// component is the fileUploader editor of <OgeForm> (@oge-ui/react-forms).
const uploader = useRef<OgeFileUploaderHandle>(null);
const [attachments, setAttachments] = useState<readonly File[]>([]);
const [valid, setValid] = useState(false);`,
      jsx: `<>
  <OgeFileUploader
    ref={uploader}
    value={attachments}
    onValueChange={(files) => {
      setAttachments(files);
      setValid(uploader.current?.valid ?? false);
    }}
    maxFileSize={1024 * 1024}
    required
  />

  <p>valid: {String(valid)}</p>
</>`,
    }),
  },
  {
    title: 'Templates',
    source: reactDemoSource({
      use: { '@oge-ui/react-upload': ['OgeFileUploader'] },
      name: 'CustomRows',
      jsx: `// Six render props replace any part of the rendering. The row context
// arrives pre-formatted, so a custom row needs no size formatter of its own.
<OgeFileUploader
  accept="image/*"
  renderFile={({ file, size, status }) => (
    <>
      <strong>{file.name}</strong>
      <span>{size} · {status}</span>
    </>
  )}
/>`,
    }),
  },
];
