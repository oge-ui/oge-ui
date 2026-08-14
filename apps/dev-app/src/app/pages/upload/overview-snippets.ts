import { demoSource } from '../../shared/demo-source';

export const GETTING_STARTED_SNIPPET = demoSource({
  use: { '@oge-ui/upload': ['OgeFileUploader'] },
  template: `<!-- With no uploadUrl this is a file picker: drag & drop, restrictions,
     previews and removal, with everything chosen exposed through [(value)]
     as plain File objects. Add uploadUrl and the same element uploads. -->
<oge-file-uploader
  [(value)]="attachments"
  accept="image/*,.pdf"
  [maxFileSize]="5 * 1024 * 1024"
  [maxFileCount]="5"
/>

<p>{{ attachments().length }} file(s) ready</p>`,
  body: `protected readonly attachments = signal<readonly File[]>([]);`,
});

export const UPLOAD_SNIPPET = demoSource({
  use: { '@oge-ui/upload': ['OgeFileUploader'] },
  template: `<!-- uploadMode decides when bytes move: 'instantly' on selection,
     'useButtons' waits for the Upload button, 'select' never uploads.
     Progress, cancel and retry appear on each row as the transfer needs them. -->
<oge-file-uploader
  uploadUrl="/api/upload"
  uploadMode="useButtons"
  [uploadHeaders]="{ Authorization: 'Bearer demo' }"
  [concurrency]="2"
  (uploaded)="onUploaded($event.file.name, $event.response)"
  (uploadFailed)="onFailed($event.file.name, $event.message)"
/>`,
  body: `protected onUploaded(name: string, response: unknown): void {
  console.log('uploaded', name, response);
}

protected onFailed(name: string, message: string): void {
  console.warn('failed', name, message);
}`,
});

export const CHUNK_SNIPPET = demoSource({
  use: { '@oge-ui/upload': ['OgeFileUploader'] },
  template: `<!-- Chunked transfer sends one slice per request, carrying Kendo-shaped
     metadata so an existing chunked endpoint needs no changes. Pause and
     resume appear only here: a whole-file request has nothing to suspend,
     so the affordance is derived from the transport rather than configured. -->
<oge-file-uploader
  uploadUrl="/api/upload"
  [chunk]="{ size: 512 * 1024, maxAutoRetries: 2, resumable: true }"
  [autoRetry]="{ count: 2, delayMs: 400 }"
  (chunkUploaded)="onChunk($event.chunkIndex, $event.totalChunks)"
/>`,
  body: `protected onChunk(index: number, total: number): void {
  console.log(\`chunk \${index + 1} of \${total}\`);
}`,
});

export const RESTRICTIONS_SNIPPET = demoSource({
  use: { '@oge-ui/upload': ['OgeFileUploader'] },
  template: `<!-- A rejected file stays on the list with its reason next to it, rather
     than vanishing. It is still in value — hiding it would let a required
     field pass while the user can plainly see a file on screen — and the
     bound form control is what goes invalid. -->
<oge-file-uploader
  [allowedFileExtensions]="['.png', '.jpg', '.pdf']"
  [maxFileSize]="1024 * 1024"
  [minFileSize]="1024"
  [maxTotalFileSize]="4 * 1024 * 1024"
  [validateFile]="noSpaces"
  (fileRejected)="lastRejection.set($event.errors[0].message)"
/>

@if (lastRejection(); as reason) {
  <p role="status">{{ reason }}</p>
}`,
  body: `protected readonly lastRejection = signal<string | null>(null);

/** Returns a message to reject, or null to accept. */
protected readonly noSpaces = (file: File): string | null =>
  file.name.includes(' ') ? 'File names must not contain spaces.' : null;`,
});

export const PICTURE_SNIPPET = demoSource({
  use: { '@oge-ui/upload': ['OgeFileUploader'] },
  template: `<!-- listType renders previews instead of a text row. The object URLs
     behind them are owned by the component and revoked on remove, clear
     and destroy — the first long-lived object URLs in the suite. -->
<oge-file-uploader
  accept="image/*"
  listType="pictureCard"
  [previewWidth]="96"
/>`,
});

export const EXTERNAL_ZONE_SNIPPET = demoSource({
  use: {
    '@oge-ui/upload': [
      'OgeFileUploader',
      'OgeUploadDropZone',
      'OgeUploadTrigger',
    ],
  },
  template: `<!-- The drop surface is often a whole panel that has nothing to do with
     the uploader's own markup. That is a different element, which no mode
     value can express — hence a directive, matched by name. -->
<div class="panel" [ogeUploadDropZone]="'attachments'">
  Drop files anywhere in this panel
</div>

<button type="button" [ogeUploadTrigger]="'attachments'">Attach files…</button>

<oge-file-uploader dropZone="attachments" displayMode="compact" />`,
});

export const FORMS_SNIPPET = demoSource({
  use: {
    '@oge-ui/upload': ['OgeFileUploader'],
    '@angular/forms': ['ReactiveFormsModule'],
  },
  helpers: { '@angular/forms': ['FormControl'] },
  template: `<!-- The restrictions are attached to the bound control as a plain
     ValidatorFn, so the form goes invalid without restating maxFileSize as
     a second rule that could drift. Signal Forms binds the same component
     through [formField], and [(value)] works with no forms at all. -->
<oge-file-uploader
  [formControl]="attachments"
  [maxFileSize]="1024 * 1024"
  [required]="true"
/>

<p>valid: {{ attachments.valid }}</p>`,
  body: `protected readonly attachments = new FormControl<readonly File[]>([], {
  nonNullable: true,
});`,
});

export const TEMPLATE_SNIPPET = demoSource({
  use: {
    '@oge-ui/upload': ['OgeFileUploader', 'OgeUploadFileTemplate'],
  },
  template: `<!-- Six slots replace any part of the rendering. The row context arrives
     pre-formatted, so a custom row needs no size formatter of its own. -->
<oge-file-uploader accept="image/*">
  <ng-template ogeUploadFileTemplate let-file let-size="size" let-status="status">
    <strong>{{ file.name }}</strong>
    <span>{{ size }} · {{ status }}</span>
  </ng-template>
</oge-file-uploader>`,
});
