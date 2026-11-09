// @oge-ui/react-spreadsheet/powerpoint — the presentation viewer (ADR 0006).
// Its own entry so spreadsheet-only applications never load it.
export {
  OgePresentation,
  OgeSlideCanvas,
  type OgePresentationProps,
} from './lib/presentation';
export {
  OgePresentationConfigProvider,
  useOgePresentationConfig,
} from './lib/presentation-config';
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
