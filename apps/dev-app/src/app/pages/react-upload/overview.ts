import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import type { OgeUploadAdapter } from '@oge-ui/behavior';
import {
  OgeFileUploader,
  OgeUploadDropZone,
  OgeUploadTrigger,
  type OgeFileUploaderHandle,
} from '@oge-ui/react-upload';
import { DemoCard } from '../../shared/demo-card';
import { FakeUploadServer } from '../../shared/fake-upload-server';
import { ReactHost } from '../../shared/react-host';
import { UPLOAD_OVERVIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same eight sections as the Angular overview
 * (`docs/REACT-PARITY.md`: pages mirror section for section); the forms
 * section demos the controlled value instead of `formControl` (a recorded
 * exception).
 */
export const REACT_UPLOAD_OVERVIEW_SECTIONS = [
  'Getting started',
  'Uploading',
  'Chunked and resumable',
  'Restrictions',
  'Previews',
  'External drop zone',
  'Controlled value & forms',
  'Templates',
] as const;

function GettingStartedDemo(): ReactNode {
  const [attachments, setAttachments] = useState<readonly File[]>([]);
  return createElement(
    'div',
    null,
    createElement(OgeFileUploader, {
      value: attachments,
      onValueChange: setAttachments,
      accept: 'image/*,.pdf',
      maxFileSize: 5 * 1024 * 1024,
      maxFileCount: 5,
      pastable: true,
    }),
    createElement('p', null, `${attachments.length} file(s) ready`),
  );
}

function UploadingDemo({ adapter }: { adapter: OgeUploadAdapter }): ReactNode {
  return createElement(OgeFileUploader, {
    uploadUrl: '/api/upload',
    uploadMode: 'useButtons',
    uploadAdapter: adapter,
    concurrency: 2,
  });
}

function ChunkDemo({ adapter }: { adapter: OgeUploadAdapter }): ReactNode {
  return createElement(OgeFileUploader, {
    uploadUrl: '/api/upload',
    uploadAdapter: adapter,
    chunk: { size: 64, maxAutoRetries: 2 },
    uploadMode: 'useButtons',
  });
}

const noSpaces = (file: File): string | null =>
  file.name.includes(' ') ? 'File names must not contain spaces.' : null;

function RestrictionsDemo(): ReactNode {
  return createElement(OgeFileUploader, {
    allowedFileExtensions: ['.png', '.jpg', '.pdf'],
    maxFileSize: 1024 * 1024,
    maxTotalFileSize: 4 * 1024 * 1024,
    validateFile: noSpaces,
  });
}

function PreviewsDemo(): ReactNode {
  return createElement(OgeFileUploader, {
    accept: 'image/*',
    listType: 'pictureCard',
    previewWidth: 96,
  });
}

function ExternalZoneDemo(): ReactNode {
  return createElement(
    'div',
    null,
    createElement(
      OgeUploadDropZone,
      { zone: 'react-demo-attachments', className: 'app-drop-panel' },
      'Drop files anywhere in this panel',
    ),
    createElement(
      OgeUploadTrigger,
      { zone: 'react-demo-attachments' },
      'Attach files…',
    ),
    createElement(OgeFileUploader, {
      dropZone: 'react-demo-attachments',
      displayMode: 'compact',
    }),
  );
}

function FormsDemo(): ReactNode {
  const uploader = useRef<OgeFileUploaderHandle>(null);
  const [attachments, setAttachments] = useState<readonly File[]>([]);
  const [valid, setValid] = useState(false);
  return createElement(
    'div',
    null,
    createElement(OgeFileUploader, {
      ref: uploader,
      value: attachments,
      onValueChange: (files) => {
        setAttachments(files);
        setValid(uploader.current?.valid ?? false);
      },
      maxFileSize: 1024,
      required: true,
    }),
    createElement('p', null, `valid: ${String(valid)}`),
  );
}

function TemplatesDemo(): ReactNode {
  return createElement(OgeFileUploader, {
    accept: 'image/*',
    renderFile: ({ file, size, status }) =>
      createElement(
        'span',
        null,
        createElement('strong', null, file.name),
        createElement('span', null, ` — ${size} · ${status}`),
      ),
  });
}

/**
 * The React half of the upload overview — the same eight demo sections as
 * the Angular page, with the same example content, rendered as real React
 * trees inside `/components/upload` when the reader has chosen React
 * (ADR 0002). The transfer demos run against the page's in-browser
 * `FakeUploadServer`, exactly like the Angular view.
 */
@Component({
  selector: 'app-react-upload-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React uploader carries the class names but no styles of its own —
  // the docs pull the same SCSS the package build compiles, plus the
  // progress bar (layout) and the lightbox (overlay) it composes.
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/upload/src/styles.scss',
    '../../../../../../packages/react/layout/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['value / onValueChange', 'accept', 'maxFileSize']"
      heading="Getting started"
      description="No <code>uploadUrl</code>, so nothing is sent: this is a picker with restrictions and previews. Drop files on the zone, paste a screenshot, or press Enter to browse."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="gettingStarted" />
    </app-demo-card>

    <app-demo-card
      [chips]="['uploadMode', 'progress', 'cancel', 'retry']"
      heading="Uploading"
      description="<code>uploadMode='useButtons'</code> waits for the Upload button. Each row grows the affordances its state needs — progress, cancel, then retry. The request log shows exactly what would go over the wire."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="uploading" />
      <button type="button" (click)="server.clearLog()">Clear log</button>
      <pre class="app-request-log">{{ log() }}</pre>
    </app-demo-card>

    <app-demo-card
      [chips]="['chunk', 'pause', 'resume', 'auto retry']"
      heading="Chunked and resumable"
      description="One request per slice, carrying Kendo-shaped metadata. The scripted server fails chunk 2 once, so auto-retry is visible; Pause and Resume appear only here, because a whole-file request has nothing to suspend."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="chunked" />
      <pre class="app-request-log">{{ log() }}</pre>
    </app-demo-card>

    <app-demo-card
      [chips]="['allowedFileExtensions', 'maxTotalFileSize', 'validateFile']"
      heading="Restrictions"
      description="A rejected file stays on the list with its reason next to it. It remains in <code>value</code> — hiding it would let a required field pass while a file is plainly on screen — and the handle's <code>valid</code> flag is what goes false."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="restrictions" />
    </app-demo-card>

    <app-demo-card
      [chips]="['listType', 'previewWidth']"
      heading="Previews"
      description="Image rows render a thumbnail from an object URL the component owns and revokes on remove, clear and unmount."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="previews" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeUploadDropZone', 'OgeUploadTrigger']"
      heading="External drop zone"
      description="The drop surface is often a panel with nothing to do with the uploader's own markup — a different element, which no mode value can express."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="externalZone" />
    </app-demo-card>

    <app-demo-card
      [chips]="['value', 'required', 'handle.valid']"
      heading="Controlled value & forms"
      description="The controlled <code>value</code> pair binds the same component; the restrictions stay on the uploader and the handle's <code>valid</code> flag tells the form, so nothing is restated. Inside <code>&amp;lt;OgeForm&amp;gt;</code> this is the <code>fileUploader</code> editor."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="forms" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderFile']"
      heading="Templates"
      description="Six render props replace any part of the rendering. The row context arrives pre-formatted, so a custom row needs no size formatter of its own."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="templates" />
    </app-demo-card>
  `,
})
export class ReactUploadOverviewDemos {
  protected readonly demos = UPLOAD_OVERVIEW_DEMOS;
  protected readonly server = inject(FakeUploadServer);
  private readonly adapter = this.server.adapter();

  constructor() {
    // The chunk demo promises a scripted failure on the second slice — the
    // only way to show auto-retry without asking the reader to unplug.
    this.server.failAt.set(1);
  }

  protected log(): string {
    const entries = this.server.requestLog();
    return entries.length > 0 ? entries.join('\n') : '(no requests yet)';
  }

  protected readonly gettingStarted = () => createElement(GettingStartedDemo);
  protected readonly uploading = () =>
    createElement(UploadingDemo, { adapter: this.adapter });
  protected readonly chunked = () =>
    createElement(ChunkDemo, { adapter: this.adapter });
  protected readonly restrictions = () => createElement(RestrictionsDemo);
  protected readonly previews = () => createElement(PreviewsDemo);
  protected readonly externalZone = () => createElement(ExternalZoneDemo);
  protected readonly forms = () => createElement(FormsDemo);
  protected readonly templates = () => createElement(TemplatesDemo);
}
