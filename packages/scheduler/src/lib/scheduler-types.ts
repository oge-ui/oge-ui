/**
 * Public types of `@oge-ui/scheduler`. The vocabulary is single-sourced in
 * `@oge-ui/scheduler-engine` (shared with `@oge-ui/react-scheduler`, ADR
 * 0003) and re-exported here so every import path is unchanged. Only the
 * editor-showing event is this layer's own: its form items carry Angular's
 * `TemplateRef` slots.
 */
import type { OgeFormItemData } from '@oge-ui/forms';
import type { OgeSchedulerEditorShowingEvent as EditorShowingEventBase } from '@oge-ui/scheduler-engine';

export type {
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
  OgeSchedulerConflictCheck,
  OgeSchedulerDataSource,
  OgeSchedulerDataSourceInput,
  OgeSchedulerDisabledSlots,
  OgeSchedulerDragOutEvent,
  OgeSchedulerGroupOrientation,
  OgeSchedulerLoadOptions,
  OgeSchedulerMoreMode,
  OgeSchedulerRangeSelectedEvent,
  OgeSchedulerReminderEvent,
  OgeSchedulerResource,
  OgeSchedulerResourceItem,
  OgeSchedulerView,
  OgeSchedulerViewOptions,
  OgeSchedulerWeekNumberRule,
  OgeSchedulerWorkHours,
} from '@oge-ui/scheduler-engine';

/**
 * Cancelable: fires before the appointment editor opens; replace
 * `formItems` to customize the form (dx `onAppointmentFormOpening` parity).
 */
export type OgeSchedulerEditorShowingEvent<T = unknown> =
  EditorShowingEventBase<T, OgeFormItemData>;
