import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  OgePdfViewer,
  provideOgePdfViewerConfig,
  type OgePdfZoom,
} from '@oge-ui/spreadsheet/pdf';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { REACT_PDF_SECTIONS, ReactPdfDemos } from '../react-spreadsheet/pdf';
import {
  PDF_BARE_SNIPPET,
  PDF_CONTROLLED_SNIPPET,
  PDF_GETTING_STARTED_SNIPPET,
} from './pdf-snippets';

const SECTIONS = [
  'Getting started',
  'Controlled view',
  'Bare preview',
] as const;

/** Where the dev app serves pdf.js's worker (see `project.json` assets). */
export const DEMO_PDF_WORKER = '/pdfjs/pdf.worker.min.mjs';

@Component({
  selector: 'app-pdf-page',
  imports: [
    DemoCard,
    DocHeader,
    OgePdfViewer,
    PageToc,
    ReactPdfDemos,
    RouterLink,
  ],
  providers: [provideOgePdfViewerConfig({ workerSrc: DEMO_PDF_WORKER })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="PDF viewer"
      category="Spreadsheet"
      categoryLink="/components/spreadsheet"
      [chips]="['pdf.js', 'find in document', 'thumbnails', 'print']"
    >
      <p>
        A read-only PDF viewer over Mozilla's
        <a
          href="https://mozilla.github.io/pdf.js/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-indigo-600 underline dark:text-indigo-400"
          >pdf.js</a
        >: pages drawn as they come near the viewport, page thumbnails, find in
        document with highlights, zoom by steps or to the width or the page, and
        printing. pdf.js renders the pages; the viewer adds the chrome,
        keyboard, text layer for selection and screen readers, and the
        theme-aware toolbar of the other document viewers.
      </p>
      <p>
        <code>pdfjs-dist</code> is an optional peer dependency loaded on first
        use, so an application that never shows a PDF never downloads it. Serve
        its worker (<code>pdf.worker.min.mjs</code>) and name it with
        <code>provideOgePdfViewerConfig(&#123; workerSrc &#125;)</code>. Fonts
        are never evaluated as code and scripts and form actions never run.
        Covered by the same
        <a
          routerLink="/license"
          class="text-indigo-600 underline dark:text-indigo-400"
          >license</a
        >
        as the other document viewers.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-pdf-demos />
    } @else {
      <app-demo-card
        [chips]="['source', 'toolbar', 'keyboard']"
        heading="Getting started"
        description="Point <code>source</code> at a PDF. Page Up, Page Down, Home and End move between pages, Ctrl + / − / 0 zoom, and Enter / Shift+Enter in the find box step through the matches."
        [code]="gettingStartedSnippet"
        language="ts"
      >
        <oge-pdf-viewer
          source="/demo/spreadsheet/report.pdf"
          style="height: 640px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['pageIndex', 'zoom', 'showThumbnails']"
        heading="Controlled view"
        description="<code>[(pageIndex)]</code>, <code>[(zoom)]</code> and <code>[(showThumbnails)]</code> keep the view in your own state: they follow the toolbar and the scrolling, and move the viewer when you set them."
        [code]="controlledSnippet"
        language="ts"
      >
        <p class="mb-2 text-sm text-slate-600 dark:text-slate-300">
          Page {{ page() + 1 }} · zoom {{ zoom() }}
        </p>
        <oge-pdf-viewer
          source="/demo/spreadsheet/report.pdf"
          [(pageIndex)]="page"
          [(zoom)]="zoom"
          [(showThumbnails)]="thumbs"
          style="height: 520px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['toolbar', 'File']"
        heading="Bare preview"
        description='<code>[toolbar]="false"</code> leaves just the pages, for a preview pane; <code>source</code> takes a <code>File</code> the user picked, read in the browser.'
        [code]="bareSnippet"
        language="ts"
      >
        <input
          type="file"
          accept="application/pdf"
          class="mb-2 text-sm"
          aria-label="Choose a PDF"
          (change)="pick($event)"
        />
        <oge-pdf-viewer
          [source]="file() ?? '/demo/spreadsheet/report.pdf'"
          [toolbar]="false"
          zoom="fit-page"
          style="height: 420px"
        />
      </app-demo-card>
    }
  `,
})
export class PdfPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_PDF_SECTIONS;
  protected readonly page = signal(0);
  protected readonly zoom = signal<OgePdfZoom>(1);
  protected readonly thumbs = signal(true);
  protected readonly file = signal<File | null>(null);
  protected readonly gettingStartedSnippet = PDF_GETTING_STARTED_SNIPPET;
  protected readonly controlledSnippet = PDF_CONTROLLED_SNIPPET;
  protected readonly bareSnippet = PDF_BARE_SNIPPET;

  protected pick(event: Event): void {
    this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }
}
