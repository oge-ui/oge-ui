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
  type OgeSchedulerView,
  type OgeSchedulerViewOptions,
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
  type OgeSchedulerToolbarMessages,
} from './lib/config';
