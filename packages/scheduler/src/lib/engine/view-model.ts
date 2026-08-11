/**
 * Pure view-model builders for the three scheduler views: the day/week time
 * grid, the month matrix, period navigation and the segmentation of timed
 * appointments into per-day, window-clipped pieces the layout engine
 * consumes. Date construction goes through `@oge-ui/core` date-utils only.
 */
import {
  addDays,
  addMonths,
  monthMatrix,
  rangesOverlap,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@oge-ui/core';
import type { SchedulerAppointment } from './scheduler-model';
import { minutesOfDay, slotCount } from './time-math';

/** The scheduler's view types (string union, house rule — never an enum). */
export type SchedulerViewType = 'day' | 'week' | 'workWeek' | 'month';

/** Configuration of a day/week time grid. */
export interface TimeGridConfig {
  readonly anchorDate: Date;
  readonly view: 'day' | 'week' | 'workWeek';
  readonly firstDayOfWeek: number;
  readonly dayStartHour: number;
  readonly dayEndHour: number;
  readonly cellDuration: number;
  /** Weekdays (0 = Sunday) removed from week-shaped grids. */
  readonly hiddenWeekDays?: readonly number[];
}

/** The weekdays a view hides: `workWeek` always drops the weekend. */
export function resolveHiddenWeekDays(
  view: SchedulerViewType,
  hiddenWeekDays: readonly number[] | undefined,
): readonly number[] {
  const hidden =
    view === 'workWeek'
      ? [0, 6, ...(hiddenWeekDays ?? [])]
      : (hiddenWeekDays ?? []);
  // a grid needs at least one visible day — ignore a config hiding all seven
  return new Set(hidden).size >= 7 ? [] : hidden;
}

/** The built day/week grid: rendered days, slot rows and the data window. */
export interface TimeGridVm {
  /** Rendered day columns — 1 (day view) or 7 (week view, week-aligned). */
  readonly days: readonly Date[];
  /** Start minute-of-day of every rendered slot row. */
  readonly slotStartMinutes: readonly number[];
  readonly windowStartMinutes: number;
  readonly windowEndMinutes: number;
  readonly cellDuration: number;
  /** Half-open `[rangeStart, rangeEnd)` bounds for the data query. */
  readonly rangeStart: Date;
  readonly rangeEnd: Date;
}

export function buildTimeGrid(config: TimeGridConfig): TimeGridVm {
  const first =
    config.view === 'day'
      ? startOfDay(config.anchorDate)
      : startOfWeek(config.anchorDate, config.firstDayOfWeek);
  const dayCount = config.view === 'day' ? 1 : 7;
  const hidden = new Set(
    config.view === 'day'
      ? []
      : resolveHiddenWeekDays(config.view, config.hiddenWeekDays),
  );
  const days = Array.from({ length: dayCount }, (_, index) =>
    addDays(first, index),
  ).filter((day) => !hidden.has(day.getDay()));
  const rows = slotCount(
    config.dayStartHour,
    config.dayEndHour,
    config.cellDuration,
  );
  const windowStartMinutes = config.dayStartHour * 60;
  return {
    days,
    slotStartMinutes: Array.from(
      { length: rows },
      (_, index) => windowStartMinutes + index * config.cellDuration,
    ),
    windowStartMinutes,
    windowEndMinutes: config.dayEndHour * 60,
    cellDuration: config.cellDuration,
    rangeStart: first,
    rangeEnd: addDays(first, dayCount),
  };
}

/** The built month grid: 6 week rows of 7 days plus the data window. */
export interface MonthGridVm {
  readonly weeks: readonly (readonly Date[])[];
  readonly rangeStart: Date;
  readonly rangeEnd: Date;
}

export function buildMonthGrid(
  anchorDate: Date,
  firstDayOfWeek: number,
): MonthGridVm {
  const days = monthMatrix(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    firstDayOfWeek,
  );
  const weeks = Array.from({ length: 6 }, (_, week) =>
    days.slice(week * 7, week * 7 + 7),
  );
  return {
    weeks,
    rangeStart: days[0],
    rangeEnd: addDays(days[41], 1),
  };
}

/** Half-open `[start, end)` data range a view needs for `anchorDate`. */
export function viewRange(
  view: SchedulerViewType,
  anchorDate: Date,
  firstDayOfWeek: number,
): { start: Date; end: Date } {
  if (view === 'day') {
    const start = startOfDay(anchorDate);
    return { start, end: addDays(start, 1) };
  }
  if (view === 'week' || view === 'workWeek') {
    const start = startOfWeek(anchorDate, firstDayOfWeek);
    return { start, end: addDays(start, 7) };
  }
  const grid = buildMonthGrid(anchorDate, firstDayOfWeek);
  return { start: grid.rangeStart, end: grid.rangeEnd };
}

/** Steps the anchor date one period backwards or forwards. */
export function navigateDate(
  view: SchedulerViewType,
  anchorDate: Date,
  direction: -1 | 1,
): Date {
  if (view === 'day') return addDays(anchorDate, direction);
  if (view === 'week' || view === 'workWeek') {
    return addDays(anchorDate, direction * 7);
  }
  return startOfMonth(addMonths(anchorDate, direction));
}

/** One per-day piece of a timed appointment, clipped to the visible window. */
export interface AppointmentSegment<T = unknown> {
  readonly appointment: SchedulerAppointment<T>;
  /** Index into `TimeGridVm.days`. */
  readonly dayIndex: number;
  /** Clipped to `[windowStartMinutes, windowEndMinutes]`. */
  readonly startMinutes: number;
  readonly endMinutes: number;
  /** True when the appointment continues before/after this segment. */
  readonly clippedStart: boolean;
  readonly clippedEnd: boolean;
}

/** Splits appointments into all-day-strip items vs timed items. */
export function partitionAllDay<T>(
  appointments: readonly SchedulerAppointment<T>[],
): {
  allDay: SchedulerAppointment<T>[];
  timed: SchedulerAppointment<T>[];
} {
  const allDay: SchedulerAppointment<T>[] = [];
  const timed: SchedulerAppointment<T>[] = [];
  for (const appointment of appointments) {
    (appointment.displayAllDay ? allDay : timed).push(appointment);
  }
  return { allDay, timed };
}

/**
 * Segments timed appointments into per-day pieces for the given grid:
 * midnight-crossing appointments split per calendar day, each piece clipped
 * to the visible hour window; pieces fully outside the window (or the grid's
 * day range) are dropped. All-day items must be partitioned out beforehand.
 */
export function segmentTimedAppointments<T>(
  appointments: readonly SchedulerAppointment<T>[],
  grid: TimeGridVm,
): AppointmentSegment<T>[] {
  const segments: AppointmentSegment<T>[] = [];
  for (const appointment of appointments) {
    if (
      !rangesOverlap(
        appointment.startDate,
        appointment.endDate,
        grid.rangeStart,
        grid.rangeEnd,
      ) &&
      appointment.startDate.getTime() !== appointment.endDate.getTime()
    ) {
      continue;
    }
    for (let dayIndex = 0; dayIndex < grid.days.length; dayIndex++) {
      const day = grid.days[dayIndex];
      const dayStart = day;
      const dayEnd = addDays(day, 1);
      const startsBefore = appointment.startDate.getTime() < dayStart.getTime();
      const endsAfter = appointment.endDate.getTime() > dayEnd.getTime();
      const zeroLength =
        appointment.startDate.getTime() === appointment.endDate.getTime();
      const intersects = zeroLength
        ? appointment.startDate.getTime() >= dayStart.getTime() &&
          appointment.startDate.getTime() < dayEnd.getTime()
        : rangesOverlap(
            appointment.startDate,
            appointment.endDate,
            dayStart,
            dayEnd,
          );
      if (!intersects) continue;
      const rawStart = startsBefore ? 0 : minutesOfDay(appointment.startDate);
      const rawEnd = endsAfter
        ? 1440
        : zeroLength
          ? minutesOfDay(appointment.endDate)
          : appointment.endDate.getTime() === dayEnd.getTime()
            ? 1440
            : minutesOfDay(appointment.endDate);
      // clip to the visible hour window; drop pieces entirely outside it
      const start = Math.max(rawStart, grid.windowStartMinutes);
      const end = Math.min(rawEnd, grid.windowEndMinutes);
      if (end < start || (end === start && !zeroLength)) continue;
      if (
        zeroLength &&
        (start > grid.windowEndMinutes || end < grid.windowStartMinutes)
      )
        continue;
      segments.push({
        appointment,
        dayIndex,
        startMinutes: start,
        endMinutes: end,
        clippedStart: startsBefore || rawStart < grid.windowStartMinutes,
        clippedEnd: endsAfter || rawEnd > grid.windowEndMinutes,
      });
    }
  }
  return segments;
}
