/**
 * Public types of `@oge-ui/scheduler`. Event payload interfaces join this
 * module with the component in the next wave; the engine's internal shapes
 * stay unexported by design.
 */
import type { OgeFormItemData } from '@oge-ui/forms';
import type { SchedulerAppointment } from './engine/scheduler-model';
import type { SchedulerViewType } from './engine/view-model';

/** The scheduler's view types: `'day' | 'week' | 'workWeek' | 'month'`. */
export type OgeSchedulerView = SchedulerViewType;

/** Emphasized working hours; cells outside get the off-hours shading. */
export interface OgeSchedulerWorkHours {
  /** First working hour (fractions allowed, e.g. `8.5`). */
  readonly start: number;
  /** First non-working hour after the block. */
  readonly end: number;
  /** Working weekdays (0 = Sunday); omitted = every rendered day. */
  readonly days?: readonly number[];
}

/** One assignable resource choice. */
export interface OgeSchedulerResourceItem {
  readonly id: unknown;
  readonly text: string;
  readonly color?: string;
}

/** A resource kind appointments can be assigned to (dx `resources` parity). */
export interface OgeSchedulerResource {
  /** Item field holding the assigned resource id. */
  readonly fieldExpr: string;
  readonly items: readonly OgeSchedulerResourceItem[];
  /** Editor label; defaults to the field name. */
  readonly label?: string;
  /** Colors appointments without an own color from this resource. */
  readonly useColorAsDefault?: boolean;
}

/** Fires when an appointment's reminder lead time is reached. */
export interface OgeSchedulerReminderEvent<T = unknown> {
  readonly appointmentData: T;
  readonly appointment: OgeSchedulerAppointment<T>;
}

/** Fires after a drag-to-create cell-range selection lands. */
export interface OgeSchedulerRangeSelectedEvent {
  readonly startDate: Date;
  readonly endDate: Date;
}

/**
 * A user item normalized into the scheduler's shape — the payload of
 * appointment events and template contexts; `source` is the original item.
 */
export type OgeSchedulerAppointment<T = unknown> = SchedulerAppointment<T>;

/** Per-view options: override the time window or slot raster for one view. */
export interface OgeSchedulerViewOptions {
  readonly type: OgeSchedulerView;
  /** Display name in the view switcher (defaults to the messages entry). */
  readonly name?: string;
  readonly dayStartHour?: number;
  readonly dayEndHour?: number;
  readonly cellDuration?: number;
}

/** Cancelable: fires before a new appointment reaches the store. */
export interface OgeSchedulerAppointmentAddingEvent<T = unknown> {
  /** The item about to be inserted (mutable — adjust fields before insert). */
  readonly appointmentData: T;
  /** Set `true` to veto the insert. */
  cancel: boolean;
}

/** Fires after an appointment was inserted. */
export interface OgeSchedulerAppointmentAddedEvent<T = unknown> {
  readonly appointmentData: T;
}

/** Cancelable: fires before an appointment update reaches the store. */
export interface OgeSchedulerAppointmentUpdatingEvent<T = unknown> {
  readonly oldData: T;
  /** The patch about to be applied. */
  readonly newData: Partial<T>;
  /** Set `true` to veto the update. */
  cancel: boolean;
}

/** Fires after an appointment was updated. */
export interface OgeSchedulerAppointmentUpdatedEvent<T = unknown> {
  readonly appointmentData: T;
}

/** Cancelable: fires before an appointment is removed from the store. */
export interface OgeSchedulerAppointmentDeletingEvent<T = unknown> {
  readonly appointmentData: T;
  /** Set `true` to veto the delete. */
  cancel: boolean;
}

/** Fires after an appointment was removed. */
export interface OgeSchedulerAppointmentDeletedEvent<T = unknown> {
  readonly appointmentData: T;
}

/** Fires on appointment chip click / double-click. */
export interface OgeSchedulerAppointmentClickEvent<T = unknown> {
  readonly appointment: OgeSchedulerAppointment<T>;
  /** The raw DOM event. */
  readonly event: MouseEvent;
}

/** Fires on empty-cell click / double-click. */
export interface OgeSchedulerCellClickEvent {
  /** Start date/time of the clicked cell. */
  readonly cellDate: Date;
  /** True in the all-day strip and in month cells. */
  readonly allDay: boolean;
  /** The raw DOM event. */
  readonly event: MouseEvent;
}

/**
 * Cancelable: fires before the appointment editor opens; replace
 * `formItems` to customize the form (dx `onAppointmentFormOpening` parity).
 */
export interface OgeSchedulerEditorShowingEvent<T = unknown> {
  /** The item being edited, or the prefilled draft for a new appointment. */
  readonly appointmentData: T;
  readonly isNew: boolean;
  /** The data-driven form items the editor will render (mutable). */
  formItems: OgeFormItemData[];
  /** Set `true` to keep the editor closed. */
  cancel: boolean;
}
