// @oge-ui/inputs/tree-select — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export { OgeTreeSelect } from './tree-select';
export type {
  OgeTreeSelectDisplayMode,
  OgeTreeSelectSelectionChangedEvent,
  OgeTreeSelectSelectionMode,
} from './tree-select-types';
