/**
 * Month-view week-row layout: every appointment intersecting the week maps
 * onto a `LaneInput` (multi-day/all-day span bars sort before single-day
 * timed items, which order by start time), clips to the row and delegates to
 * `packLanes` with the row's lane cap.
 */
import { addDays, rangesOverlap, sameDay, startOfDay } from '@oge-ui/core';
import { packLanes, type LaneInput, type LaneLayout } from './lanes';
import type { SchedulerAppointment } from './scheduler-model';

/**
 * Builds the packed lanes of one month-view week row (`weekDays` = 7
 * consecutive days). `maxLanes` is the row's visible lane budget; overflow
 * feeds the "+N more" affordance.
 */
export function buildMonthWeekLanes<T>(
  appointments: readonly SchedulerAppointment<T>[],
  weekDays: readonly Date[],
  maxLanes: number | null,
): LaneLayout<T> {
  const weekStart = weekDays[0];
  const weekEnd = addDays(weekDays[6], 1);

  const inputs: {
    input: LaneInput<T>;
    multiDay: boolean;
    startMs: number;
  }[] = [];
  for (const appointment of appointments) {
    const zeroLength =
      appointment.startDate.getTime() === appointment.endDate.getTime();
    const intersects = zeroLength
      ? appointment.startDate.getTime() >= weekStart.getTime() &&
        appointment.startDate.getTime() < weekEnd.getTime()
      : rangesOverlap(
          appointment.startDate,
          appointment.endDate,
          weekStart,
          weekEnd,
        );
    if (!intersects) continue;

    const firstDay = startOfDay(appointment.startDate);
    // half-open end: an appointment ending at midnight does not occupy that day
    const lastMoment = zeroLength
      ? appointment.endDate
      : new Date(appointment.endDate.getTime() - 1);
    const lastDay = startOfDay(
      lastMoment.getTime() < firstDay.getTime() ? firstDay : lastMoment,
    );

    let startDayIndex = weekDays.findIndex((day) => sameDay(day, firstDay));
    const clippedStart = startDayIndex === -1;
    if (clippedStart) startDayIndex = 0;
    let endDayIndex = weekDays.findIndex((day) => sameDay(day, lastDay));
    const clippedEnd = endDayIndex === -1;
    if (clippedEnd) endDayIndex = 6;

    inputs.push({
      input: {
        appointment,
        startDayIndex,
        endDayIndex,
        clippedStart,
        clippedEnd,
      },
      multiDay:
        appointment.displayAllDay || endDayIndex > startDayIndex || clippedStart || clippedEnd,
      startMs: appointment.startDate.getTime(),
    });
  }

  // span bars first, then timed single-day items by start time; stable
  inputs.sort(
    (a, b) =>
      a.input.startDayIndex - b.input.startDayIndex ||
      Number(b.multiDay) - Number(a.multiDay) ||
      a.startMs - b.startMs,
  );
  return packLanes(
    inputs.map((entry) => entry.input),
    maxLanes,
  );
}
