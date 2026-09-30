/**
 * What a rendered view reports to the scheduler shell. Both render layers'
 * internal views emit these shapes (React passes the native event), so the
 * shell core handles one vocabulary.
 */
import type { AppointmentProposal } from './gesture-math';
import type { SchedulerAppointment } from './scheduler-model';

/** A chip interaction surfaced to the shell, with its screen rect. */
export interface SchedulerChipEvent<T> {
  readonly appointment: SchedulerAppointment<T>;
  readonly event: MouseEvent | KeyboardEvent;
  readonly rect: DOMRect;
}

/** A cell interaction surfaced to the shell. */
export interface SchedulerCellEvent {
  readonly cellDate: Date;
  readonly allDay: boolean;
  readonly event: MouseEvent | KeyboardEvent;
  /** The cell's resource id when the view is column-grouped. */
  readonly resourceId?: unknown;
}

/** A committed move/resize surfaced to the shell. */
export interface SchedulerProposalEvent<T> {
  readonly appointment: SchedulerAppointment<T>;
  readonly proposal: AppointmentProposal;
  /** Set when a grouped drag landed on a different resource column/row. */
  readonly resourceId?: unknown;
}

/** A drag-to-create range, with the grouped column's resource. */
export interface SchedulerRangeEvent {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly resourceId?: unknown;
}
