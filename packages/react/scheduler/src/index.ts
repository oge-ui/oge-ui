// Public API of @oge-ui/react-scheduler (commercial — see LICENSE).
// Explicit named exports only (house rule): the internal views stay
// unexported, exactly like the Angular package's.
export { OgeScheduler } from './lib/scheduler';
export {
  OgeSchedulerConfigProvider,
  useOgeSchedulerConfig,
} from './lib/scheduler-config';
export type {
  OgeAppointmentRenderContext,
  OgeDateHeaderRenderContext,
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
  OgeSchedulerAppointmentUpdatedEvent,
  OgeSchedulerAppointmentUpdatingEvent,
  OgeSchedulerCellClickEvent,
  OgeSchedulerConfig,
  OgeSchedulerConfigInput,
  OgeSchedulerEditorMessages,
  OgeSchedulerGridMessages,
  OgeSchedulerMenuMessages,
  OgeSchedulerMessages,
  OgeSchedulerPopupMessages,
  OgeSchedulerRangeSelectedEvent,
  OgeSchedulerRecurrenceScopeMessages,
  OgeSchedulerReminderEvent,
  OgeSchedulerResource,
  OgeSchedulerResourceItem,
  OgeSchedulerToolbarMessages,
  OgeSchedulerView,
  OgeSchedulerViewOptions,
  OgeSchedulerWorkHours,
} from '@oge-ui/scheduler-engine';
