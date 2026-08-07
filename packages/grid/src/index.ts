// the canonical menu item now lives in @oge-ui/overlay — re-exported here so
// grid consumers keep their import path
export { type OgeMenuItem } from '@oge-ui/overlay';
export {
  OgeGrid,
  type OgeColumnDef,
  type OgeRowClickEvent,
  type OgeContextMenuEvent,
  type OgeHeaderContextMenuEvent,
  type OgeFilterRowOptions,
  type OgeHeaderFilterOptions,
  type OgeSearchPanelOptions,
  type OgePagingOptions,
  type OgeSortingOptions,
  type OgeDataChange,
  type OgeSavingChangesEvent,
  type OgeSavedChangesEvent,
  type OgeEditingStartEvent,
  type OgeInitNewRowEvent,
  type OgeRowInsertingEvent,
  type OgeRowInsertedEvent,
  type OgeRowUpdatingEvent,
  type OgeRowUpdatedEvent,
  type OgeRowRemovingEvent,
  type OgeRowRemovedEvent,
  type OgeSelectionChangedEvent,
  type OgeFocusedRowChangedEvent,
  type OgeExportingEvent,
  type OgeDataErrorEvent,
  type OgeScrollingOptions,
  type OgeGroupingOptions,
  type OgeCellClickEvent,
  type OgeCommandButton,
  type OgeRowReorderedEvent,
  type OgeExportCellArgs,
  type OgeExportColumn,
  type OgeExportData,
  type OgeExportOptions,
} from './lib/grid/grid';
export {
  OgeEditTemplate,
  type OgeEditTemplateContext,
} from './lib/templates/edit-template';
export {
  OgeEditingSlice,
  type OgeEditFormItem,
  type OgeEditMode,
  type OgeEditingOptions,
} from '@oge-ui/grid/foundation';
export {
  OGE_GRID_CONFIG,
  OGE_DEFAULT_GRID_CONFIG,
  OGE_DEFAULT_MESSAGES,
  provideOgeGridConfig,
  type OgeGridConfig,
  type OgeGridConfigInput,
  type OgeGridMessages,
} from './lib/config';
export { type OgeSelectionMode } from './lib/state/selection-slice';
export { SelectionSlice } from './lib/state/selection-slice';
export {
  OgeColumn,
  type OgeDataType,
  type OgeColumnLookup,
} from './lib/columns/column';
export { OgeColumnGroup } from './lib/columns/column-group';
export { formatCellValue } from './lib/columns/value-format';
export {
  OgeCellTemplate,
  type OgeCellTemplateContext,
} from './lib/templates/cell-template';
export {
  OgeHeaderTemplate,
  type OgeHeaderTemplateContext,
} from './lib/templates/header-template';
export {
  OgeDetailTemplate,
  type OgeDetailTemplateContext,
} from './lib/templates/detail-template';
export { OgeNoDataTemplate } from './lib/templates/no-data-template';
export {
  OgeRowTemplate,
  type OgeRowTemplateContext,
} from './lib/templates/row-template';
export { OgeToolbarItem } from './lib/templates/toolbar-item';
export { OgePager } from './lib/pager/pager';
export {
  OgeCellEditor,
  type OgeCellEditorSurface,
} from './lib/editing/cell-editor';
export { GridStateStore } from './lib/state/grid-state.store';
export { SortSlice } from './lib/state/sort-slice';
export { PagingSlice } from './lib/state/paging-slice';
export { FilterSlice } from './lib/state/filter-slice';
export { GroupingSlice } from './lib/state/grouping-slice';
export { ExpansionSlice } from './lib/state/expansion-slice';
export { ColumnsSlice } from './lib/state/columns-slice';
export { GridDataAdapter } from './lib/data/grid-data-adapter';
export {
  OGE_STATE_STORAGE,
  type OgeStateStorage,
} from '@oge-ui/grid/foundation';
export {
  OgeFilterBuilderGroup,
  builderToExpr,
  exprToBuilder,
  describeExpr,
  operatorsFor,
  type OgeBuilderGroup,
  type OgeBuilderCondition,
  type OgeFilterBuilderField,
} from './lib/filter-builder/filter-builder';
