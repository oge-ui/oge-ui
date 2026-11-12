import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React PDF viewer. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 * Section-for-section mirror of `../spreadsheet/pdf.ts`.
 */
export const PDF_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-spreadsheet/pdf': [
          'OgePdfViewer',
          'OgePdfViewerConfigProvider',
        ],
      },
      name: 'PdfPreview',
      jsx: `<>
  {/* npm i pdfjs-dist, and serve
      node_modules/pdfjs-dist/build/pdf.worker.min.mjs from your app. pdf.js
      loads on first use. The toolbar pages, zooms, fits, finds and prints;
      pages are drawn only when they come near the viewport. */}
  <OgePdfViewerConfigProvider
    config={{ workerSrc: '/pdfjs/pdf.worker.min.mjs' }}
  >
    <OgePdfViewer
      source="/demo/spreadsheet/report.pdf"
      style={{ height: 640 }}
    />
  </OgePdfViewerConfigProvider>
</>`,
    }),
  },
  {
    title: 'Controlled view',
    source: reactDemoSource({
      use: { '@oge-ui/react-spreadsheet/pdf': ['OgePdfViewer'] },
      types: { '@oge-ui/react-spreadsheet/pdf': ['OgePdfZoom'] },
      react: ['useState'],
      name: 'ControlledPdf',
      body: `const [page, setPage] = useState(0);
const [zoom, setZoom] = useState<OgePdfZoom>(1);
const [thumbs, setThumbs] = useState(true);`,
      jsx: `<>
  {/* page, zoom and the thumbnail sidebar follow the toolbar and the
      scrolling, and move the viewer when you set them. */}
  <p>
    Page {page + 1} · zoom {String(zoom)}
  </p>
  <OgePdfViewer
    source="/demo/spreadsheet/report.pdf"
    pageIndex={page}
    onPageIndexChange={setPage}
    zoom={zoom}
    onZoomChange={setZoom}
    showThumbnails={thumbs}
    onShowThumbnailsChange={setThumbs}
    style={{ height: 520 }}
  />
</>`,
    }),
  },
  {
    title: 'Bare preview',
    source: reactDemoSource({
      use: { '@oge-ui/react-spreadsheet/pdf': ['OgePdfViewer'] },
      react: ['useState'],
      name: 'BarePdf',
      body: `const [file, setFile] = useState<File | null>(null);`,
      jsx: `<>
  {/* toolbar={false} leaves just the pages, for a preview pane; source
      takes a File the user picked, read in the browser. */}
  <input
    type="file"
    accept="application/pdf"
    aria-label="Choose a PDF"
    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
  />
  <OgePdfViewer
    source={file ?? '/demo/spreadsheet/report.pdf'}
    toolbar={false}
    zoom="fit-page"
    style={{ height: 420 }}
  />
</>`,
    }),
  },
];
