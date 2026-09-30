// @oge-ui/inputs/slider — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export { OgeSlider } from './slider';
export { OgeRangeSlider } from './range-slider';
export {
  type OgeSliderDragStartedEvent,
  type OgeSliderOrientation,
  type OgeSliderSlideEndedEvent,
  type OgeSliderValueIndicator,
} from './slider-types';
