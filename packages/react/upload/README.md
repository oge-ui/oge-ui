# @oge-ui/react-upload

React file upload from the OGE UI suite — a drop zone, a real file input, a
list of what was chosen and the transfers that follow — running the **same**
framework-free upload engine (restrictions, chunk planning, the transfer
queue, drag/paste reading) and the same list machine as the Angular
`@oge-ui/upload` package, and the same stylesheet.

The OGE suite is one component engine with a native render layer per
framework: nothing here wraps Angular, and the React layer is heading for full
component and feature parity with the Angular suite, family by family.

## What ships

- **`<OgeFileUploader>`** — drag & drop with directory and paste support,
  client-side restrictions that stay on the row with their reason, image
  previews and a lightbox, per-file progress with rate and ETA, chunked
  resumable transfer with pause, resume and retry, batching, concurrency, a
  pluggable transport adapter (XHR by default — the only API that reports
  request-body progress), the four upload modes (`instantly`, `useButtons`,
  `useForm`, `select`), three list types, three display modes, 28 callbacks
  (every cancelable pre-event included), six render-prop slots and a full
  keyboard and screen-reader contract.
- **`<OgeUploadDropZone>`** / **`<OgeUploadTrigger>`** — feed an uploader from
  a panel or a button anywhere else in the tree, by its `dropZone` name.
- **`<OgeUploadConfigProvider>`** — the React counterpart of
  `provideOgeUploadConfig()`; every default and every message string is
  single-sourced in `@oge-ui/behavior`.
- **`<OgeUploadTransportProvider>`** — the counterpart of the
  `OGE_UPLOAD_TRANSPORT` token: substitute the transport for a subtree (tests,
  static demos, an interceptor-aware client).

## Installation

```sh
npm install @oge-ui/react-upload
```

Requires React 18 or 19. `@oge-ui/behavior`, `@oge-ui/react-layout` (the
progress bar) and `@oge-ui/react-overlay` (the lightbox) come along as regular
dependencies. The components are client components — `'use client'` ships in
the published files.

Import the stylesheets once at your app entry:

```ts
import '@oge-ui/react-upload/styles.css';
import '@oge-ui/react-layout/styles.css';
import '@oge-ui/react-overlay/styles.css';
```

## Quick start

```tsx
'use client';

import { OgeFileUploader } from '@oge-ui/react-upload';

export function Attachments() {
  return <OgeFileUploader uploadUrl="/api/upload" allowedFileExtensions={['.png', '.jpg', '.pdf']} maxFileSize={5 * 1024 * 1024} chunk onUploaded={({ file, response }) => console.log(file.name, response)} />;
}
```

No `uploadUrl`? Then it is a file picker with restrictions and previews, and
everything the user chose lands in `value` / `onValueChange` as plain `File`
objects:

```tsx
const [files, setFiles] = useState<readonly File[]>([]);
<OgeFileUploader uploadMode="select" value={files} onValueChange={setFiles} />;
```

## Docs

Live demos and the full API reference: <https://ogeui.com/components/upload>
(pick **React** in the header). Machine-readable docs for coding assistants
ship inside the package at `node_modules/@oge-ui/react-upload/llms.txt`.

## License

MIT
