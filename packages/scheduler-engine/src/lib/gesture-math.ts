/**
 * Pure drag/resize proposal math: the component-side gesture machines
 * translate pointer deltas into day/minute deltas, call these functions and
 * render the returned proposal as a preview — the model mutates only once,
 * when the gesture commits.
 */
import { addDays, addMinutes } from '@oge-ui/core';
import type { SchedulerAppointment } from './scheduler-model';
import { snapToSlot } from './time-math';
import type { TimeGridVm } from './view-model';

/** The proposed new extent of an appointment mid-gesture. */
export interface AppointmentProposal {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly allDay: boolean;
}

/**
 * Move proposal: shifts both ends by whole days and slot-snapped minutes,
 * preserving duration. Month/all-day drags pass `deltaMinutes: 0` so the
 * time of day survives the move (dx parity).
 */
export function proposeMove<T>(
  appointment: SchedulerAppointment<T>,
  deltaDays: number,
  deltaMinutes: number,
  cellDuration: number,
): AppointmentProposal {
  const snapped = snapToSlot(deltaMinutes, cellDuration, 'round');
  return {
    startDate: addMinutes(addDays(appointment.startDate, deltaDays), snapped),
    endDate: addMinutes(addDays(appointment.endDate, deltaDays), snapped),
    allDay: appointment.allDay,
  };
}

/**
 * Resize proposal for the `start` (top) or `end` (bottom) edge; the result
 * never shrinks below one `cellDuration`.
 */
export function proposeResize<T>(
  appointment: SchedulerAppointment<T>,
  edge: 'start' | 'end',
  deltaMinutes: number,
  cellDuration: number,
): AppointmentProposal {
  const snapped = snapToSlot(deltaMinutes, cellDuration, 'round');
  let startDate = appointment.startDate;
  let endDate = appointment.endDate;
  if (edge === 'start') {
    startDate = addMinutes(startDate, snapped);
    const max = addMinutes(endDate, -cellDuration);
    if (startDate.getTime() > max.getTime()) startDate = max;
  } else {
    endDate = addMinutes(endDate, snapped);
    const min = addMinutes(startDate, cellDuration);
    if (endDate.getTime() < min.getTime()) endDate = min;
  }
  return { startDate, endDate, allDay: appointment.allDay };
}

/**
 * Hit test: a pointer offset inside the slot grid → the day column and the
 * slot-snapped minutes-of-day under it (the `viewport.ts` analog of the BPMN
 * engine, in one dimension per axis).
 */
export function pointToGridPosition(
  offsetX: number,
  offsetY: number,
  gridWidth: number,
  gridHeight: number,
  grid: TimeGridVm,
): { dayIndex: number; minutes: number } {
  const dayCount = grid.days.length;
  const dayIndex = Math.min(
    dayCount - 1,
    Math.max(0, Math.floor((offsetX / gridWidth) * dayCount)),
  );
  const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
  const rawMinutes =
    grid.windowStartMinutes + (offsetY / gridHeight) * windowSpan;
  const clamped = Math.min(
    Math.max(rawMinutes, grid.windowStartMinutes),
    grid.windowEndMinutes,
  );
  return {
    dayIndex,
    minutes: snapToSlot(clamped, grid.cellDuration, 'floor'),
  };
}

/** Vertical fraction (0–1) of a minutes-of-day value inside the window. */
export function fractionForMinutes(minutes: number, grid: TimeGridVm): number {
  const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
  if (windowSpan <= 0) return 0;
  return Math.min(
    1,
    Math.max(0, (minutes - grid.windowStartMinutes) / windowSpan),
  );
}
