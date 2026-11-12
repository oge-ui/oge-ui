// @oge-ui/spreadsheet/pdf — the PDF viewer over pdf.js (an optional peer,
// loaded on first use). Its own entry so applications that never show a PDF
// never load it. Explicit named exports only (house rule).
export { OgePdfViewer } from './pdf-viewer';
export { OGE_PDF_VIEWER_CONFIG, provideOgePdfViewerConfig } from './config';
export {
  OGE_DEFAULT_PDF_VIEWER_MESSAGES,
  type OgePdfErrorCode,
  type OgePdfLoadErrorEvent,
  type OgePdfLoadedEvent,
  type OgePdfSource,
  type OgePdfViewerConfig,
  type OgePdfViewerConfigInput,
  type OgePdfViewerMessages,
  type OgePdfZoom,
} from '@oge-ui/spreadsheet-engine/pdf';
