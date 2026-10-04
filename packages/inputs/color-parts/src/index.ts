// @oge-ui/inputs/color-parts — base entry point of the color editors.
// shared with sibling entry points (color box, color gradient, color
// palette); not re-exported by @oge-ui/inputs — internal parts, not public API.
export { OgeColorSurface, type OgeColorSurfaceChange } from './color-surface';
export { OgeColorSlider, type OgeColorSliderChange } from './color-slider';
export {
  OgeColorSwatchGrid,
  type OgeColorPalettePick,
} from './color-swatch-grid';
export {
  OgeColorChannelInputs,
  type OgeColorChannelChange,
} from './color-channel-inputs';
