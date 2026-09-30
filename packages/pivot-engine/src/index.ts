// @oge-ui/pivot-engine — the framework-free pivot grid engine (ADR 0003).
//
// The aggregation engine itself (`PivotEngine`, field configs, the remote
// `OgePivotStore` contract) is MIT and stays in `@oge-ui/core`; this package
// carries everything above it that both render layers would otherwise have
// to duplicate. No Angular or React import anywhere (lint-enforced).
export {
  OgePivotGridCore,
  type OgePivotGridCoreDeps,
  type OgePivotGridInputs,
  type OgePivotMatrixKeyResult,
  type OgePivotRemoteRequest,
} from './lib/pivot-grid-core';
export { OgePivotStateCore } from './lib/pivot-state-core';
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
  type OgePivotDragLike,
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
  pivotLineOf,
  pivotMatrixKeyTarget,
  pivotMatrixTemplate,
  pivotResultFromPayload,
  pivotRowWindow,
  pivotSlotFlags,
  pivotVirtualColumnWidth,
  pivotWindowIndexes,
} from './lib/pivot-layout';
