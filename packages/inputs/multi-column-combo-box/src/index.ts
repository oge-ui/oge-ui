// @oge-ui/inputs/multi-column-combo-box — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export { OgeMultiColumnComboBox } from './multi-column-combo-box';
export {
  type OgeComboBoxColumn,
  type OgeComboBoxCellTemplateContext,
  type OgeMultiColumnComboBoxSelectionMode,
  type OgeMultiColumnComboBoxSelectionChangedEvent,
  type OgeMultiColumnComboBoxRowClickEvent,
} from './multi-column-combo-box-types';
