// @oge-ui/inputs/color-palette — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export { OgeColorPalette } from './color-palette';
export {
  OGE_COLOR_PALETTE_PRESETS,
  type OgeColorPalettePreset,
  type OgeColorPalettePresetData,
} from '@oge-ui/behavior';
