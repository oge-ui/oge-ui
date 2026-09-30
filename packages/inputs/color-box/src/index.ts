// @oge-ui/inputs/color-box — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export { OgeColorBox } from './color-box';
export {
  type OgeColorBoxView,
  type OgeColorBoxApplyValueMode,
  OGE_DEFAULT_COLOR_PALETTE,
} from './color-box-types';
