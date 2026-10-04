// @oge-ui/inputs/toggle-group — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export {
  OgeToggleGroup,
  type OgeToggleGroupItemTemplateContext,
  type OgeToggleGroupItemClickEvent,
  type OgeToggleGroupSelectionChangedEvent,
} from './toggle-group';
export { type OgeToggleGroupSelectionMode } from '@oge-ui/behavior';
