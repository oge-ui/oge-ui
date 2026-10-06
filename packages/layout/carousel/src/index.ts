// @oge-ui/layout/carousel — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeCarousel } from './carousel';
export { OgeCarouselSlide } from './carousel-slide';
export {
  OgeCarouselSlideTemplate,
  type OgeCarouselSlideTemplateContext,
} from './templates';
export {
  OGE_CAROUSEL_CONFIG,
  OGE_DEFAULT_CAROUSEL_CONFIG,
  OGE_DEFAULT_CAROUSEL_MESSAGES,
  provideOgeCarouselConfig,
  type OgeCarouselConfig,
  type OgeCarouselConfigInput,
  type OgeCarouselMessages,
} from './config';
export type {
  OgeCarouselAutoplayChangedEvent,
  OgeCarouselChangeSource,
  OgeCarouselIndicators,
  OgeCarouselItem,
  OgeCarouselPickerMode,
  OgeCarouselSlideChangedEvent,
} from './carousel-types';
