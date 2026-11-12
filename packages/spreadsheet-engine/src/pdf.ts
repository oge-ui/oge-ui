// @oge-ui/spreadsheet-engine/pdf — the PDF viewer core over pdf.js (an
// optional peer, loaded on first use). A separate entry so applications that
// never show a PDF never load it. Explicit named exports only (house rule).

export { ogeCheckSpreadsheetLicense } from './lib/license';

export {
  OGE_DEFAULT_PDF_VIEWER_CONFIG,
  OGE_DEFAULT_PDF_VIEWER_MESSAGES,
  OGE_PDF_ZOOM_STEPS,
  OgePdfViewerCore,
  ogePdfFindMatches,
  ogePdfScale,
  ogeVisiblePdfPages,
  resolveOgePdfViewerConfig,
  type OgePdfErrorCode,
  type OgePdfLoadErrorEvent,
  type OgePdfLoadedEvent,
  type OgePdfMatch,
  type OgePdfPageSize,
  type OgePdfPageText,
  type OgePdfRect,
  type OgePdfSource,
  type OgePdfViewerConfig,
  type OgePdfViewerConfigInput,
  type OgePdfViewerCoreOptions,
  type OgePdfViewerMessages,
  type OgePdfZoom,
} from './lib/pdf/viewer-core';

export type {
  OgePdfJs,
  OgePdfJsDocument,
  OgePdfJsLoadingTask,
  OgePdfJsPage,
  OgePdfJsRenderTask,
  OgePdfJsTextContent,
  OgePdfJsTextItem,
  OgePdfJsViewport,
} from './lib/pdf/pdfjs-types';
