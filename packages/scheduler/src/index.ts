// Public API of @oge-ui/scheduler (commercial — see LICENSE).
// Explicit named exports only (house rule): internal view components and the
// engine stay unexported.

export { OgeScheduler } from './lib/scheduler/scheduler';
export {
  OgeAppointmentTemplate,
  OgeDateHeaderTemplate,
  OgeSchedulerCellTemplate,
  type OgeAppointmentTemplateContext,
  type OgeDateHeaderTemplateContext,
  type OgeSchedulerCellTemplateContext,
} from './lib/scheduler/scheduler-templates';
export {
  type OgeSchedulerAppointment,
  type OgeSchedulerAppointmentAddedEvent,
  type OgeSchedulerAppointmentAddingEvent,
  type OgeSchedulerAppointmentClickEvent,
  type OgeSchedulerAppointmentDeletedEvent,
  type OgeSchedulerAppointmentDeletingEvent,
  type OgeSchedulerAppointmentUpdatedEvent,
  type OgeSchedulerAppointmentUpdatingEvent,
  type OgeSchedulerCellClickEvent,
  type OgeSchedulerEditorShowingEvent,
  type OgeSchedulerRangeSelectedEvent,
  type OgeSchedulerReminderEvent,
  type OgeSchedulerResource,
  type OgeSchedulerResourceItem,
  type OgeSchedulerView,
  type OgeSchedulerViewOptions,
  type OgeSchedulerWorkHours,
} from './lib/scheduler-types';
export {
  OGE_DEFAULT_SCHEDULER_CONFIG,
  OGE_DEFAULT_SCHEDULER_MESSAGES,
  OGE_SCHEDULER_CONFIG,
  provideOgeSchedulerConfig,
  type OgeSchedulerAnnouncementMessages,
  type OgeSchedulerConfig,
  type OgeSchedulerConfigInput,
  type OgeSchedulerEditorMessages,
  type OgeSchedulerGridMessages,
  type OgeSchedulerMessages,
  type OgeSchedulerPopupMessages,
  type OgeSchedulerRecurrenceScopeMessages,
  type OgeSchedulerToolbarMessages,
} from './lib/config';
