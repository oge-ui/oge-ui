import { demoSource } from '../../shared/demo-source';

export const PDF_GETTING_STARTED_SNIPPET = demoSource({
  use: { '@oge-ui/spreadsheet/pdf': ['OgePdfViewer'] },
  helpers: { '@oge-ui/spreadsheet/pdf': ['provideOgePdfViewerConfig'] },
  after: `// npm i pdfjs-dist, and serve node_modules/pdfjs-dist/build/pdf.worker.min.mjs
// (angular.json assets: { glob: "pdf.worker.min.mjs", input: "node_modules/pdfjs-dist/build", output: "pdfjs" })
export const appConfig = {
  providers: [provideOgePdfViewerConfig({ workerSrc: '/pdfjs/pdf.worker.min.mjs' })],
};`,
  template: `<!-- pdf.js loads on first use. The toolbar pages, zooms, fits, finds
     and prints; pages are drawn only when they come near the viewport. -->
<oge-pdf-viewer source="/demo/spreadsheet/report.pdf" style="height: 640px" />`,
});

export const PDF_CONTROLLED_SNIPPET = demoSource({
  use: { '@oge-ui/spreadsheet/pdf': ['OgePdfViewer'] },
  types: { '@oge-ui/spreadsheet/pdf': ['OgePdfZoom'] },
  body: `readonly page = signal(0);
readonly zoom = signal<OgePdfZoom>(1);
readonly thumbs = signal(true);`,
  template: `<!-- page, zoom and the thumbnail sidebar are two-way: they follow the
     toolbar and the scrolling, and move the viewer when you set them. -->
<p>Page {{ page() + 1 }} · zoom {{ zoom() }}</p>
<oge-pdf-viewer
  source="/demo/spreadsheet/report.pdf"
  [(pageIndex)]="page"
  [(zoom)]="zoom"
  [(showThumbnails)]="thumbs"
  style="height: 520px"
/>`,
});

export const PDF_BARE_SNIPPET = demoSource({
  use: { '@oge-ui/spreadsheet/pdf': ['OgePdfViewer'] },
  body: `readonly file = signal<File | null>(null);

pick(event: Event): void {
  this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
}`,
  template: `<!-- [toolbar]="false" leaves just the pages, for a preview pane; source
     takes a File the user picked, read in the browser. -->
<input
  type="file"
  accept="application/pdf"
  aria-label="Choose a PDF"
  (change)="pick($event)"
/>
<oge-pdf-viewer
  [source]="file() ?? '/demo/spreadsheet/report.pdf'"
  [toolbar]="false"
  zoom="fit-page"
  style="height: 420px"
/>`,
});
