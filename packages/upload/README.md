# @oge-ui/upload

File uploader for Angular 22 — a drop zone, a real file input, and a list of
what was chosen. Signal-based, standalone, MIT.

```bash
npm install @oge-ui/upload
```

```html
<oge-file-uploader [(value)]="attachments" accept="image/*,.pdf" [maxFileSize]="5 * 1024 * 1024" [maxFileCount]="10" />
```

## What it does

- **Selection from everywhere** — the file dialog, drag & drop (including
  dropped folders), and paste.
- **Restrictions that explain themselves** — extension, minimum and maximum
  file size, file count and total size. A rejected file stays on the list with
  the reason next to it rather than disappearing.
- **Image previews** with object URLs the component owns and revokes.
- **Angular forms, three ways at once** — standalone `[(value)]`, reactive
  forms through `ControlValueAccessor`, and Signal Forms through the
  `FormValueControl` contract. The restrictions are attached to the bound
  control, so the form goes invalid without restating them as a `ValidatorFn`.
- **A keyboard and screen-reader contract**, not an afterthought: the drop zone
  is a real button, the list is a real list with a roving tab stop, `Delete`
  removes the focused row, and every change is announced politely.

## Customization

Every string lives in `OgeUploadMessages`; override them app-wide with
`provideOgeUploadConfig({ messages: { … } })` or per instance with
`[messages]`. Six template slots (`*ogeUploadFileTemplate`,
`*ogeUploadHeaderTemplate`, `*ogeUploadDropZoneTemplate`,
`*ogeUploadEmptyTemplate`, `*ogeUploadToolbarTemplate`,
`*ogeUploadIconTemplate`) replace any part of the rendering.

## Docs

- Live demos and the full API reference: <https://ogeui.com/components/upload>
- Machine-readable reference for coding assistants:
  `node_modules/@oge-ui/upload/llms.txt`

## License

MIT — free forever, like the rest of the open tier. See [LICENSE](LICENSE).
