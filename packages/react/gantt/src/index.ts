// Public API of @oge-ui/react-gantt (commercial — see LICENSE).
// Explicit named exports only (house rule). The engine is
// `@oge-ui/gantt-engine` (ADR 0003) — the same one the Angular `@oge-ui/gantt`
// runs; its public types are re-exported here so React consumers import one
// package. The export entries are `/export-excel`, `/export-pdf` and
// `/export-image`.

export { OgeGantt } from './lib/gantt';
export type {
  OgeGanttDialogShowingEvent,
  OgeGanttHandle,
  OgeGanttProps,
  OgeGanttTaskRenderContext,
  OgeGanttTooltipRenderContext,
} from './lib/gantt-types';
export { OgeGanttConfigProvider, useOgeGanttConfig } from './lib/gantt-config';
export {
  OGE_DEFAULT_GANTT_CONFIG,
  OGE_DEFAULT_GANTT_MESSAGES,
} from '@oge-ui/gantt-engine';
export type {
  OgeGanttAnnouncementMessages,
  OgeGanttColumn,
  OgeGanttColumnMessages,
  OgeGanttConfig,
  OgeGanttConfigInput,
  OgeGanttDependency,
  OgeGanttDependencyDeletedEvent,
  OgeGanttDependencyDeletingEvent,
  OgeGanttDependencyInsertedEvent,
  OgeGanttDependencyInsertingEvent,
  OgeGanttDependencyType,
  OgeGanttDialogMessages,
  OgeGanttExportColumn,
  OgeGanttExportData,
  OgeGanttGridMessages,
  OgeGanttMenuMessages,
  OgeGanttMessages,
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
  OgeGanttToolbarMessages,
  OgeGanttWorkCalendar,
} from '@oge-ui/gantt-engine';
