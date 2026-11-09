// @oge-ui/spreadsheet-engine/powerpoint — the pptx reader and presentation
// model (ADR 0006). A separate entry so spreadsheet-only applications never
// load it. Explicit named exports only (house rule).

export {
  OGE_EMU_PER_POINT,
  OgePptxError,
  readOgePptx,
  readOgePptxSync,
  type OgePptxErrorCode,
  type OgePptxReadOptions,
  type OgePptxReadResult,
  type OgePptxSource,
} from './lib/powerpoint/read-pptx';

export { ogeCheckSpreadsheetLicense } from './lib/license';

export { ogeCreateSlideCanvasMeasurer } from './lib/powerpoint/canvas-measurer';

export {
  OGE_DEFAULT_PRESENTATION_CONFIG,
  OGE_DEFAULT_PRESENTATION_MESSAGES,
  OgePresentationCore,
  resolveOgePresentationConfig,
  type OgePresentationConfig,
  type OgePresentationConfigInput,
  type OgePresentationCoreOptions,
  type OgePresentationErrorCode,
  type OgePresentationLoadErrorEvent,
  type OgePresentationLoadedEvent,
  type OgePresentationMessages,
  type OgePresentationSource,
} from './lib/powerpoint/viewer-core';

export {
  ogeRenderSlide,
  ogeSlideFontFamily,
  type OgeSlidePaint,
  type OgeSlideRender,
  type OgeSlideRenderGradient,
  type OgeSlideRenderImage,
  type OgeSlideRenderNode,
  type OgeSlideRenderOptions,
  type OgeSlideRenderPath,
  type OgeSlideRenderText,
} from './lib/powerpoint/render';

export {
  ogeLayoutSlideText,
  type OgeSlideFont,
  type OgeSlideLaidFragment,
  type OgeSlideLaidLine,
  type OgeSlideTextMeasurer,
} from './lib/powerpoint/text-layout';

export type {
  OgePresentation,
  OgeSlide,
  OgeSlideBullet,
  OgeSlideColor,
  OgeSlideElement,
  OgeSlideFill,
  OgeSlideFrame,
  OgeSlideGradientStop,
  OgeSlideLine,
  OgeSlideParagraph,
  OgeSlidePicture,
  OgeSlidePictureRef,
  OgeSlideShape,
  OgeSlideSpacing,
  OgeSlideTable,
  OgeSlideTableCell,
  OgeSlideTextBody,
  OgeSlideTextRun,
} from './lib/powerpoint/model';
