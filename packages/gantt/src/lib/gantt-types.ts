/**
 * Public types of `@oge-ui/gantt`. They are single-sourced in
 * `@oge-ui/gantt-engine` (ADR 0003) and re-exported here under the same
 * names, so the Angular and React Gantt share one vocabulary.
 */
import type { OgeFormItemData } from '@oge-ui/forms';
import type { OgeGanttDialogShowingEvent as EngineDialogShowingEvent } from '@oge-ui/gantt-engine';

export type {
  OgeGanttCellEditorType,
  OgeGanttColumnReorderedEvent,
  OgeGanttColumnResizedEvent,
  OgeGanttConflictKind,
  OgeGanttConstraintType,
  OgeGanttDependencyUpdatedEvent,
  OgeGanttDependencyUpdatingEvent,
  OgeGanttLagUnit,
  OgeGanttSchedulingConflict,
  OgeGanttSchedulingConflictEvent,
  OgeGanttSegment,
  OgeGanttSelectionMode,
  OgeGanttSlack,
  OgeGanttSortChangedEvent,
  OgeGanttSortDirection,
  OgeGanttViewMode,
  OgeGanttZoomPreset,
  OgeGanttColumn,
  OgeGanttDependency,
  OgeGanttDependencyDeletedEvent,
  OgeGanttDependencyDeletingEvent,
  OgeGanttDependencyInsertedEvent,
  OgeGanttDependencyInsertingEvent,
  OgeGanttDependencyType,
  OgeGanttExportColumn,
  OgeGanttExportData,
  OgeGanttResource,
  OgeGanttScaleType,
  OgeGanttSelectionChangedEvent,
  OgeGanttStripLine,
  OgeGanttTask,
  OgeGanttTaskClickEvent,
  OgeGanttTaskDeletedEvent,
  OgeGanttTaskDeletingEvent,
  OgeGanttTaskInsertedEvent,
  OgeGanttTaskInsertingEvent,
  OgeGanttTaskTitlePosition,
  OgeGanttTaskUpdatedEvent,
  OgeGanttTaskUpdatingEvent,
  OgeGanttWorkCalendar,
} from '@oge-ui/gantt-engine';

/**
 * Cancelable: before the task dialog opens; replace `formItems` to
 * customize the form (dx `onTaskEditDialogShowing` parity). The items are
 * this layer's `OgeFormItemData`, so a replacement may carry templates.
 */
export type OgeGanttDialogShowingEvent<
  T = unknown,
  I extends OgeFormItemData = OgeFormItemData,
> = EngineDialogShowingEvent<T, I>;
