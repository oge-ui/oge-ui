import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgePdfViewer,
  OgePdfViewerConfigProvider,
  type OgePdfZoom,
} from '@oge-ui/react-spreadsheet/pdf';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { PDF_DEMOS } from './pdf-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_PDF_SECTIONS = [
  'Getting started',
  'Controlled view',
  'Bare preview',
] as const;

const SOURCE = '/demo/spreadsheet/report.pdf';
/** Where the dev app serves pdf.js's worker (see `project.json` assets). */
const CONFIG = { workerSrc: '/pdfjs/pdf.worker.min.mjs' };

const withWorker = (child: ReactNode): ReactNode =>
  createElement(OgePdfViewerConfigProvider, { config: CONFIG }, child);

function ControlledDemo(): ReactNode {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState<OgePdfZoom>(1);
  const [thumbs, setThumbs] = useState(true);
  return withWorker(
    createElement(
      'div',
      null,
      createElement(
        'p',
        { className: 'mb-2 text-sm text-slate-600 dark:text-slate-300' },
        `Page ${page + 1} · zoom ${String(zoom)}`,
      ),
      createElement(OgePdfViewer, {
        source: SOURCE,
        pageIndex: page,
        onPageIndexChange: setPage,
        zoom,
        onZoomChange: setZoom,
        showThumbnails: thumbs,
        onShowThumbnailsChange: setThumbs,
        style: { height: 520 },
      }),
    ),
  );
}

function BareDemo(): ReactNode {
  const [file, setFile] = useState<File | null>(null);
  return withWorker(
    createElement(
      'div',
      null,
      createElement('input', {
        type: 'file',
        accept: 'application/pdf',
        className: 'mb-2 text-sm',
        'aria-label': 'Choose a PDF',
        onChange: (event: { target: HTMLInputElement }) =>
          setFile(event.target.files?.[0] ?? null),
      }),
      createElement(OgePdfViewer, {
        source: file ?? SOURCE,
        toolbar: false,
        zoom: 'fit-page',
        style: { height: 420 },
      }),
    ),
  );
}

@Component({
  selector: 'app-react-pdf-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React viewer carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/react/spreadsheet/src/styles.scss'],
  template: `
    <app-demo-card
      [chips]="['source', 'toolbar', 'keyboard']"
      heading="Getting started"
      description="Point <code>source</code> at a PDF. Page Up, Page Down, Home and End move between pages, Ctrl + / − / 0 zoom, and Enter / Shift+Enter in the find box step through the matches."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="gettingStarted" />
    </app-demo-card>

    <app-demo-card
      [chips]="['pageIndex', 'zoom', 'showThumbnails']"
      heading="Controlled view"
      description="<code>pageIndex</code>, <code>zoom</code> and <code>showThumbnails</code> with their <code>on…Change</code> callbacks keep the view in your own state: they follow the toolbar and the scrolling, and move the viewer when you set them."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="controlled" />
    </app-demo-card>

    <app-demo-card
      [chips]="['toolbar', 'File']"
      heading="Bare preview"
      description="<code>toolbar={false}</code> leaves just the pages, for a preview pane; <code>source</code> takes a <code>File</code> the user picked, read in the browser."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="bare" />
    </app-demo-card>
  `,
})
export class ReactPdfDemos {
  protected readonly demos = PDF_DEMOS;
  protected readonly gettingStarted = () =>
    withWorker(
      createElement(OgePdfViewer, { source: SOURCE, style: { height: 640 } }),
    );
  protected readonly controlled = () => createElement(ControlledDemo);
  protected readonly bare = () => createElement(BareDemo);
}
