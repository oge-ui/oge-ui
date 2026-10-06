// Public API of @oge-ui/react-scheduler (commercial — see LICENSE).
// Explicit named exports only (house rule): the internal views stay
// unexported, exactly like the Angular package's.
export { OgeScheduler } from './lib/scheduler';
export {
  OgeSchedulerConfigProvider,
  useOgeSchedulerConfig,
} from './lib/scheduler-config';
export {
  useOgeSchedulerDraggable,
  type OgeSchedulerDraggableOptions,
  type OgeSchedulerDraggableProps,
} from './lib/use-scheduler-draggable';
export type {
  OgeAppointmentRenderContext,
  OgeDateHeaderRenderContext,
  OgeResourceHeaderRenderContext,
  OgeSchedulerCellRenderContext,
  OgeSchedulerEditorShowingEvent,
  OgeSchedulerHandle,
  OgeSchedulerProps,
} from './lib/scheduler-types';
// The vocabulary, the defaults and the message catalog come from
// `@oge-ui/scheduler-engine` — re-exported so consumers import one package.
export {
  OGE_DEFAULT_SCHEDULER_CONFIG,
  OGE_DEFAULT_SCHEDULER_MESSAGES,
} from '@oge-ui/scheduler-engine';
export type {
  OgeSchedulerAnnouncementMessages,
  OgeSchedulerAppointment,
  OgeSchedulerAppointmentAddedEvent,
  OgeSchedulerAppointmentAddingEvent,
  OgeSchedulerAppointmentClickEvent,
  OgeSchedulerAppointmentDeletedEvent,
  OgeSchedulerAppointmentDeletingEvent,
  OgeSchedulerAppointmentDroppedEvent,
  OgeSchedulerAppointmentUpdatedEvent,
  OgeSchedulerAppointmentUpdatingEvent,
  OgeSchedulerBlockedRange,
  OgeSchedulerCellClickEvent,
  OgeSchedulerConfig,
  OgeSchedulerConfigInput,
  OgeSchedulerConflictCheck,
  OgeSchedulerDataSource,
  OgeSchedulerDataSourceInput,
  OgeSchedulerDisabledSlots,
  OgeSchedulerDragOutEvent,
  OgeSchedulerEditorMessages,
  OgeSchedulerExportData,
  OgeSchedulerExportMessages,
  OgeSchedulerGridMessages,
  OgeSchedulerGroupOrientation,
  OgeSchedulerLoadOptions,
  OgeSchedulerMenuMessages,
  OgeSchedulerMessages,
  OgeSchedulerMoreMode,
  OgeSchedulerPopupMessages,
  OgeSchedulerRangeSelectedEvent,
  OgeSchedulerRecurrenceScopeMessages,
  OgeSchedulerReminderEvent,
  OgeSchedulerResource,
  OgeSchedulerResourceItem,
  OgeSchedulerToolbarMessages,
  OgeSchedulerView,
  OgeSchedulerViewOptions,
  OgeSchedulerWeekNumberRule,
  OgeSchedulerWorkHours,
  SchedulerPasteTarget,
} from '@oge-ui/scheduler-engine';
