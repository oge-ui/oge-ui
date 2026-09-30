// Public API of @oge-ui/gantt-engine (commercial — see LICENSE).
//
// The framework-free Gantt engine both render layers run: `@oge-ui/gantt`
// (Angular) and `@oge-ui/react-gantt` (React) depend on it and re-export the
// public types under the same names. Explicit named exports only (house rule).
// The Excel / PDF / PNG builders are separate entry points
// (`/export-excel`, `/export-pdf`, `/export-image`) so their optional peers
// load only when imported.

/* ---------------- the controller ---------------- */
export {
  OgeGanttCore,
  type GanttArrow,
  type GanttBar,
  type GanttBarGestureKind,
  type GanttContextMenuState,
  type GanttKeyLike,
  type GanttMenuItemState,
  type GanttMouseLike,
  type GanttResolvedColumn,
  type GanttStripRect,
  type GanttWorkloadRow,
  type OgeGanttCoreEvents,
  type OgeGanttCoreHost,
  type OgeGanttCoreInputs,
} from './lib/gantt-core';
export {
  beginGanttGesture,
  type GanttGestureCallbacks,
  type GanttGestureHandle,
  type GanttPointerLike,
} from './lib/gantt-gesture';
export {
  buildGanttDialogItems,
  fitGanttScaleType,
  formatGanttMessage,
  ganttDataRange,
  ganttWindowRange,
  GANTT_LIST_WIDTH_MAX,
  GANTT_LIST_WIDTH_MIN,
  GANTT_OVERSCAN_ROWS,
  GANTT_SCALE_HEAD_PX,
  sameGanttRange,
  stepGanttScale,
  widenGanttRange,
  type GanttEditorModel,
  type GanttEditorResult,
  type GanttRange,
} from './lib/gantt-view';

/* ---------------- config + messages ---------------- */
export {
  OGE_DEFAULT_GANTT_CONFIG,
  OGE_DEFAULT_GANTT_MESSAGES,
  resolveGanttConfig,
  type OgeGanttAnnouncementMessages,
  type OgeGanttColumnMessages,
  type OgeGanttConfig,
  type OgeGanttConfigInput,
  type OgeGanttDialogMessages,
  type OgeGanttGridMessages,
  type OgeGanttMenuMessages,
  type OgeGanttMessages,
  type OgeGanttToolbarMessages,
} from './lib/gantt-config';

/* ---------------- public types ---------------- */
export type {
  OgeGanttColumn,
  OgeGanttDependency,
  OgeGanttDependencyDeletedEvent,
  OgeGanttDependencyDeletingEvent,
  OgeGanttDependencyInsertedEvent,
  OgeGanttDependencyInsertingEvent,
  OgeGanttDependencyType,
  OgeGanttDialogShowingEvent,
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
} from './lib/gantt-types';

/* ---------------- the kernel ---------------- */
export {
  dependencyAnchors,
  dependencyPath,
  routeDependency,
  type GanttPoint,
} from './lib/engine/dependency-routing';
export {
  chartPxToDate,
  proposeTaskMove,
  proposeTaskProgress,
  proposeTaskResize,
  type GanttTaskProposal,
} from './lib/engine/gantt-gesture-math';
export {
  buildGanttDependencies,
  buildGanttTasks,
  ganttTaskPatch,
  normalizeResourceIds,
  resolveGanttFields,
  wouldCreateCycle,
  type GanttDependency,
  type GanttDependencyExprs,
  type GanttDependencyType,
  type GanttFieldExpr,
  type GanttTask,
  type GanttTaskChange,
  type GanttTaskExprs,
  type ResolvedGanttFields,
} from './lib/engine/gantt-model';
export {
  autoScheduleForward,
  criticalPathKeys,
  type GanttCalendarInput,
  type GanttScheduleChange,
} from './lib/engine/schedule';
export {
  buildGanttScale,
  dateToPx,
  GANTT_SCALE_ORDER,
  GANTT_TICK_WIDTH,
  pxToDate,
  snapToUnit,
  type GanttScale,
  type GanttScaleType,
  type GanttTick,
} from './lib/engine/time-scale';
export {
  addWorkingDays,
  isWorkingDay,
  nextWorkingDay,
  workingDaysBetween,
  type GanttWorkCalendar,
} from './lib/engine/work-calendar';
export {
  buildResourceWorkload,
  type GanttWorkloadSegment,
} from './lib/engine/workload';
