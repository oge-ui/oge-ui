// @oge-ui/inputs/color-gradient — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export { OgeColorGradient } from './color-gradient';
export {
  contrastRatio,
  contrastLevels,
  type OgeContrastLevels,
} from '@oge-ui/behavior';
