// Public API of @oge-ui/gantt (commercial — see LICENSE).
// Explicit named exports only (house rule): internal panes and the engine
// stay unexported.

export { OgeGantt } from './lib/gantt/gantt';
export {
  OgeGanttTaskTemplate,
  OgeGanttTooltipTemplate,
  type OgeGanttTaskTemplateContext,
  type OgeGanttTooltipTemplateContext,
} from './lib/gantt/gantt-templates';
export {
  type OgeGanttColumn,
  type OgeGanttDependency,
  type OgeGanttDependencyDeletedEvent,
  type OgeGanttDependencyDeletingEvent,
  type OgeGanttDependencyInsertedEvent,
  type OgeGanttDependencyInsertingEvent,
  type OgeGanttDependencyType,
  type OgeGanttDialogShowingEvent,
  type OgeGanttExportColumn,
  type OgeGanttExportData,
  type OgeGanttScaleType,
  type OgeGanttSelectionChangedEvent,
  type OgeGanttStripLine,
  type OgeGanttTask,
  type OgeGanttTaskClickEvent,
  type OgeGanttTaskDeletedEvent,
  type OgeGanttTaskDeletingEvent,
  type OgeGanttTaskInsertedEvent,
  type OgeGanttTaskInsertingEvent,
  type OgeGanttTaskTitlePosition,
  type OgeGanttTaskUpdatedEvent,
  type OgeGanttTaskUpdatingEvent,
  type OgeGanttWorkCalendar,
} from './lib/gantt-types';
export {
  OGE_DEFAULT_GANTT_CONFIG,
  OGE_DEFAULT_GANTT_MESSAGES,
  OGE_GANTT_CONFIG,
  provideOgeGanttConfig,
  type OgeGanttAnnouncementMessages,
  type OgeGanttColumnMessages,
  type OgeGanttConfig,
  type OgeGanttConfigInput,
  type OgeGanttDialogMessages,
  type OgeGanttGridMessages,
  type OgeGanttMessages,
  type OgeGanttToolbarMessages,
} from './lib/config';
