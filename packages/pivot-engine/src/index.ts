// @oge-ui/pivot-engine — the framework-free pivot grid engine (ADR 0003).
//
// The aggregation engine itself (`PivotEngine`, field configs, the remote
// `OgePivotStore` contract) is MIT and stays in `@oge-ui/core`; this package
// carries everything above it that both render layers would otherwise have
// to duplicate. No Angular or React import anywhere (lint-enforced).
export {
  OgePivotGridCore,
  type OgePivotChipKeyResult,
  type OgePivotGridCoreDeps,
  type OgePivotGridInputs,
  type OgePivotGridKeyResult,
  type OgePivotMatrixKeyResult,
  type OgePivotMenuKeyResult,
  type OgePivotRemoteRequest,
} from './lib/pivot-grid-core';
export {
  OGE_PIVOT_PANEL_AREA_ORDER,
  pivotChipKeyIntent,
  pivotGridExtent,
  pivotGridKeyTarget,
  pivotHeaderCellAt,
  pivotKeyboardPointer,
  pivotMenuKeyTarget,
  type OgePivotChipKeyIntent,
  type OgePivotGridExtent,
  type OgePivotGridNavContext,
  type OgePivotGridPosition,
  type OgePivotKeyLike,
} from './lib/pivot-keyboard';
export { OgePivotStateCore } from './lib/pivot-state-core';
export {
  applyPivotCalculatedFields,
  pivotCalculatedMeasureOf,
  pivotSlotsOf,
  type OgePivotCalculatedCell,
  type OgePivotCalculatedField,
} from './lib/pivot-calculated';
export {
  applyPivotMemberFilters,
  pivotLabelMatches,
  pivotValueMatches,
  type OgePivotLabelFilter,
  type OgePivotLabelFilterOperator,
  type OgePivotMemberFilters,
  type OgePivotTopNFilter,
  type OgePivotValueFilter,
  type OgePivotValueFilterOperator,
} from './lib/pivot-filters';
export {
  toChartSeries,
  type OgePivotChartData,
  type OgePivotChartOptions,
  type OgePivotChartPoint,
  type OgePivotChartSeries,
} from './lib/pivot-chart';
export {
  pivotRowHeaderSegments,
  type OgePivotRowHeaderLayout,
} from './lib/pivot-row-header';
export { focusPivotChip, pivotIsMenuKey, pivotIsRtl } from './lib/pivot-dom';
export {
  OGE_DEFAULT_PIVOT_MESSAGES,
  resolvePivotMessages,
  type OgePivotMessages,
} from './lib/pivot-messages';
export {
  OGE_PIVOT_FIELD_DRAG_TYPE,
  type OgePivotAxisLine,
  type OgePivotCellClickEvent,
  type OgePivotCellPosition,
  type OgePivotCellPrepared,
  type OgePivotCellTemplateContext,
  type OgePivotDragLike,
  type OgePivotFieldDropTarget,
  type OgePivotFieldPointerInput,
  type OgePivotFieldChooserOptions,
  type OgePivotFieldDef,
  type OgePivotFilterPopupState,
  type OgePivotHeaderCell,
  type OgePivotMatrixTemplate,
  type OgePivotMenuItem,
  type OgePivotMenuState,
  type OgePivotPanelArea,
  type OgePivotPointer,
  type OgePivotWindow,
} from './lib/pivot-types';
export {
  applyPivotFieldOverrides,
  buildPivotLoadOptions,
  pivotAreaFields,
  pivotCustomSummariesOf,
  pivotFieldConfigOf,
  pivotFieldFnsOf,
  pivotOverridesFromSnapshot,
  pivotPanelAreas,
  pivotStateSnapshot,
} from './lib/pivot-fields';
export {
  OGE_EMPTY_PIVOT_RESULT,
  OGE_PIVOT_OVERSCAN,
  OGE_PIVOT_VIRTUAL_COLUMN_WIDTH,
  OGE_PIVOT_VIRTUAL_HEADER_HEIGHT,
  OGE_PIVOT_VIRTUAL_ROW_HEADER_WIDTH,
  OGE_PIVOT_VIRTUAL_ROW_HEIGHT,
  pivotAxisDepth,
  pivotAxisLines,
  pivotColumnHeaderCells,
  pivotColumnWindow,
  pivotExpandablePaths,
  pivotHeaderCellKey,
  pivotHeaderCellsInWindow,
  pivotHeaderRows,
  pivotLineOf,
  pivotMatrixKeyTarget,
  pivotMatrixTemplate,
  pivotResultFromPayload,
  pivotRowWindow,
  pivotSlotFlags,
  pivotVirtualColumnWidth,
  pivotWindowIndexes,
  type OgePivotHeaderRow,
} from './lib/pivot-layout';
