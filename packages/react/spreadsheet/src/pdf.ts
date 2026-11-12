// @oge-ui/react-spreadsheet/pdf — the PDF viewer over pdf.js (an optional
// peer, loaded on first use). Its own entry so applications that never show a
// PDF never load it.
export {
  OgePdfViewer,
  type OgePdfViewerHandle,
  type OgePdfViewerProps,
} from './lib/pdf-viewer';
export {
  OgePdfViewerConfigProvider,
  useOgePdfViewerConfig,
} from './lib/pdf-viewer-config';
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
