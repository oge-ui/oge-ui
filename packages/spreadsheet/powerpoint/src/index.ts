// @oge-ui/spreadsheet/powerpoint — the presentation viewer (ADR 0006). Its own
// entry so spreadsheet-only applications never load it. Explicit named
// exports only (house rule).
export { OgePresentation, OgeSlideCanvas } from './presentation';
export {
  OGE_PRESENTATION_CONFIG,
  provideOgePresentationConfig,
} from './config';
export {
  OGE_DEFAULT_PRESENTATION_MESSAGES,
  type OgePresentationConfig,
  type OgePresentationConfigInput,
  type OgePresentationErrorCode,
  type OgePresentationLoadErrorEvent,
  type OgePresentationLoadedEvent,
  type OgePresentationMessages,
  type OgePresentationSource,
} from '@oge-ui/spreadsheet-engine/powerpoint';
