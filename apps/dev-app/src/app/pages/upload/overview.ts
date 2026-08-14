import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  OgeFileUploader,
  OgeUploadDropZone,
  OgeUploadFileTemplate,
  OgeUploadTrigger,
} from '@oge-ui/upload';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FakeUploadServer } from '../../shared/fake-upload-server';
import { PageToc } from '../../shared/page-toc';
import {
  CHUNK_SNIPPET,
  EXTERNAL_ZONE_SNIPPET,
  FORMS_SNIPPET,
  GETTING_STARTED_SNIPPET,
  PICTURE_SNIPPET,
  RESTRICTIONS_SNIPPET,
  TEMPLATE_SNIPPET,
  UPLOAD_SNIPPET,
} from './overview-snippets';

const SECTIONS = [
  'Getting started',
  'Uploading',
  'Chunked and resumable',
  'Restrictions',
  'Previews',
  'External drop zone',
  'Angular forms',
  'Templates',
] as const;

@Component({
  selector: 'app-upload-overview',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    ReactiveFormsModule,
    RouterLink,
    OgeFileUploader,
    OgeUploadDropZone,
    OgeUploadFileTemplate,
    OgeUploadTrigger,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Upload"
      category="Upload"
      categoryLink="/components/upload"
      [chips]="['drag & drop', 'chunked', 'resumable', 'forms']"
    >
      <p>
        A file uploader that is useful before it touches the network. With no
        <code>uploadUrl</code> it is a picker: drag &amp; drop (folders and
        pasted screenshots included), restrictions that stay on the row with
        their reason, image previews, and everything chosen exposed through
        <code>[(value)]</code> as plain <code>File</code> objects. Add a URL and
        the same element uploads — through a pluggable adapter, chunked and
        resumable on request.
      </p>
      <p>
        <strong>XHR, not <code>fetch</code></strong
        >: <code>xhr.upload.onprogress</code> is the only browser API that
        reports request-body progress, which is why every reference library uses
        it too. Apps whose auth lives in an interceptor can swap in
        <code>createHttpClientUploadAdapter</code> in one line.
      </p>
      <p>
        There is no WAI-ARIA APG pattern for file upload, so the accessibility
        contract is assembled from primitives and written down: the real
        <code>&lt;input type="file"&gt;</code> stays in the accessibility tree,
        the drop zone <em>is</em> a button (so the keyboard reaches the same
        dialog and nothing nests inside an interactive element), the list is a
        <code>list</code> with a roving tab stop, <kbd>Delete</kbd> removes the
        focused row, and every change is announced politely.
        <a routerLink="/components/upload/api">Full API reference →</a>
      </p>
      <p class="app-note">
        The demos below run against an in-browser
        <code>FakeUploadServer</code>, not the network. This site is a static
        deploy, so a real <code>POST /api/upload</code> would be answered by the
        SPA rewrite with a <strong>200</strong> — a demo on the real transport
        would appear to succeed while doing nothing.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['[(value)]', 'accept', 'maxFileSize']"
      heading="Getting started"
      description="No <code>uploadUrl</code>, so nothing is sent: this is a picker with restrictions and previews. Drop files on the zone, paste a screenshot, or press Enter to browse."
      [code]="gettingStartedSnippet"
      language="ts"
    >
      <oge-file-uploader
        [(value)]="attachments"
        accept="image/*,.pdf"
        [maxFileSize]="5 * 1024 * 1024"
        [maxFileCount]="5"
        [pastable]="true"
      />
      <p>{{ attachments().length }} file(s) ready</p>
    </app-demo-card>

    <app-demo-card
      [chips]="['uploadMode', 'progress', 'cancel', 'retry']"
      heading="Uploading"
      description="<code>uploadMode='useButtons'</code> waits for the Upload button. Each row grows the affordances its state needs — progress, cancel, then retry. The request log shows exactly what would go over the wire."
      [code]="uploadSnippet"
      language="ts"
    >
      <oge-file-uploader
        uploadUrl="/api/upload"
        uploadMode="useButtons"
        [uploadAdapter]="server.adapter()"
        [concurrency]="2"
      />
      <button type="button" (click)="server.clearLog()">Clear log</button>
      <pre class="app-request-log">{{ log() }}</pre>
    </app-demo-card>

    <app-demo-card
      [chips]="['chunk', 'pause', 'resume', 'auto retry']"
      heading="Chunked and resumable"
      description="One request per slice, carrying Kendo-shaped metadata. The scripted server fails chunk 2 once, so auto-retry is visible; Pause and Resume appear only here, because a whole-file request has nothing to suspend."
      [code]="chunkSnippet"
      language="ts"
    >
      <oge-file-uploader
        uploadUrl="/api/upload"
        [uploadAdapter]="server.adapter()"
        [chunk]="{ size: 64, maxAutoRetries: 2 }"
        uploadMode="useButtons"
      />
      <pre class="app-request-log">{{ log() }}</pre>
    </app-demo-card>

    <app-demo-card
      [chips]="['allowedFileExtensions', 'maxTotalFileSize', 'validateFile']"
      heading="Restrictions"
      description="A rejected file stays on the list with its reason next to it. It remains in <code>value</code> — hiding it would let a required field pass while a file is plainly on screen — and the bound control is what goes invalid."
      [code]="restrictionsSnippet"
      language="ts"
    >
      <oge-file-uploader
        [allowedFileExtensions]="['.png', '.jpg', '.pdf']"
        [maxFileSize]="1024 * 1024"
        [maxTotalFileSize]="4 * 1024 * 1024"
        [validateFile]="noSpaces"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['listType', 'previewWidth']"
      heading="Previews"
      description="Image rows render a thumbnail from an object URL the component owns and revokes on remove, clear and destroy."
      [code]="pictureSnippet"
      language="ts"
    >
      <oge-file-uploader
        accept="image/*"
        listType="pictureCard"
        [previewWidth]="96"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['ogeUploadDropZone', 'ogeUploadTrigger']"
      heading="External drop zone"
      description="The drop surface is often a panel with nothing to do with the uploader's own markup — a different element, which no mode value can express."
      [code]="externalZoneSnippet"
      language="ts"
    >
      <div class="app-drop-panel" [ogeUploadDropZone]="'demo-attachments'">
        Drop files anywhere in this panel
      </div>
      <button type="button" [ogeUploadTrigger]="'demo-attachments'">
        Attach files…
      </button>
      <oge-file-uploader dropZone="demo-attachments" displayMode="compact" />
    </app-demo-card>

    <app-demo-card
      [chips]="['formControl', 'validator', 'required']"
      heading="Angular forms"
      description="Reactive forms, Signal Forms and plain <code>[(value)]</code> all bind the same component. The restrictions reach the control as a plain <code>ValidatorFn</code>, so nothing is restated."
      [code]="formsSnippet"
      language="ts"
    >
      <oge-file-uploader
        [formControl]="formAttachments"
        [maxFileSize]="1024"
        [required]="true"
      />
      <p>valid: {{ formAttachments.valid }}</p>
    </app-demo-card>

    <app-demo-card
      [chips]="['ogeUploadFileTemplate']"
      heading="Templates"
      description="Six slots replace any part of the rendering. The row context arrives pre-formatted, so a custom row needs no size formatter of its own."
      [code]="templateSnippet"
      language="ts"
    >
      <oge-file-uploader accept="image/*">
        <ng-template
          ogeUploadFileTemplate
          let-file
          let-size="size"
          let-status="status"
        >
          <strong>{{ file.name }}</strong>
          <span>&nbsp;— {{ size }} · {{ status }}</span>
        </ng-template>
      </oge-file-uploader>
    </app-demo-card>
  `,
})
export class UploadOverviewPage {
  protected readonly sections = SECTIONS;
  protected readonly server = inject(FakeUploadServer);

  constructor() {
    // The chunk demo promises a scripted failure on the second slice — the
    // only way to show auto-retry without asking the reader to unplug.
    this.server.failAt.set(1);
  }

  protected readonly attachments = signal<readonly File[]>([]);
  protected readonly formAttachments = new FormControl<readonly File[]>([], {
    nonNullable: true,
  });

  protected readonly noSpaces = (file: File): string | null =>
    file.name.includes(' ') ? 'File names must not contain spaces.' : null;

  protected log(): string {
    const entries = this.server.requestLog();
    return entries.length > 0 ? entries.join('\n') : '(no requests yet)';
  }

  protected readonly gettingStartedSnippet = GETTING_STARTED_SNIPPET;
  protected readonly uploadSnippet = UPLOAD_SNIPPET;
  protected readonly chunkSnippet = CHUNK_SNIPPET;
  protected readonly restrictionsSnippet = RESTRICTIONS_SNIPPET;
  protected readonly pictureSnippet = PICTURE_SNIPPET;
  protected readonly externalZoneSnippet = EXTERNAL_ZONE_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;
  protected readonly templateSnippet = TEMPLATE_SNIPPET;
}
