// @oge-ui/inputs/check-box-group — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export {
  OgeCheckBoxGroup,
  type OgeCheckBoxGroupItemTemplateContext,
} from './check-box-group';
export {
  type OgeCheckBoxGroupLayout,
  type OgeCheckBoxGroupItemClickEvent,
  type OgeCheckBoxGroupSelectAllEvent,
} from './check-box-group-types';
