// @oge-ui/inputs/radio-group — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export { OgeRadioGroup } from './radio-group';
export {
  type OgeRadioGroupItemClickEvent,
  type OgeRadioGroupLayout,
} from './radio-group-types';
