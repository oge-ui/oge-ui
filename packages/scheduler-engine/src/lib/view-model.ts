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
export type SchedulerViewType =
  | 'day'
  | 'week'
  | 'workWeek'
  | 'month'
  | 'agenda'
  | 'timelineDay'
  | 'timelineWeek'
  | 'timelineWorkWeek'
  | 'timelineMonth'
  | 'timelineYear'
  | 'year';

/** The timeline views (a horizontal time axis, one row per resource). */
export type SchedulerTimelineViewType =
  | 'timelineDay'
  | 'timelineWeek'
  | 'timelineWorkWeek'
  | 'timelineMonth'
  | 'timelineYear';

/** Whether `view` is one of the timeline views. */
export function isTimelineView(
  view: SchedulerViewType,
): view is SchedulerTimelineViewType {
  return (
    view === 'timelineDay' ||
    view === 'timelineWeek' ||
    view === 'timelineWorkWeek' ||
    view === 'timelineMonth' ||
    view === 'timelineYear'
  );
}

/** A positive whole interval count (`intervalCount`); anything else is 1. */
export function normalizeIntervalCount(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : 1;
}

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
  /** The weekend `workWeek` drops (0 = Sunday); defaults to `[0, 6]`. */
  readonly weekendDays?: readonly number[];
  /**
   * Periods the grid shows (the view option `intervalCount`): `3` on a day
   * view renders three consecutive days from the anchor, `2` on a week view
   * a fortnight. Default `1`.
   */
  readonly intervalCount?: number;
}

/**
 * The weekdays a view hides: `workWeek` always drops the weekend — the
 * scheduler's resolved `weekendDays`, Saturday and Sunday when omitted.
 */
export function resolveHiddenWeekDays(
  view: SchedulerViewType,
  hiddenWeekDays: readonly number[] | undefined,
  weekendDays: readonly number[] = [0, 6],
): readonly number[] {
  const hidden =
    view === 'workWeek' || view === 'timelineWorkWeek'
      ? [...weekendDays, ...(hiddenWeekDays ?? [])]
      : (hiddenWeekDays ?? []);
  // a grid needs at least one visible day — ignore a config hiding all seven
  return new Set(hidden).size >= 7 ? [] : hidden;
}

/** The built day/week grid: rendered days, slot rows and the data window. */
export interface TimeGridVm {
  /** Rendered day columns — the day view's days, or whole weeks. */
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
  const intervals = normalizeIntervalCount(config.intervalCount);
  const first =
    config.view === 'day'
      ? startOfDay(config.anchorDate)
      : startOfWeek(config.anchorDate, config.firstDayOfWeek);
  const dayCount = config.view === 'day' ? intervals : 7 * intervals;
  const hidden = new Set(
    config.view === 'day'
      ? []
      : resolveHiddenWeekDays(
          config.view,
          config.hiddenWeekDays,
          config.weekendDays,
        ),
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

/** The built month grid: whole week rows of 7 days plus the data window. */
export interface MonthGridVm {
  readonly weeks: readonly (readonly Date[])[];
  readonly rangeStart: Date;
  readonly rangeEnd: Date;
}

/**
 * The month matrix: six week rows for a single month (the fixed layout the
 * month view always had), or every week touching the `intervalCount`
 * months from the anchor's month for a multi-month view.
 */
export function buildMonthGrid(
  anchorDate: Date,
  firstDayOfWeek: number,
  intervalCount = 1,
): MonthGridVm {
  const intervals = normalizeIntervalCount(intervalCount);
  if (intervals === 1) {
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
  const monthStart = startOfMonth(anchorDate);
  const lastDay = addDays(addMonths(monthStart, intervals), -1);
  const first = startOfWeek(monthStart, firstDayOfWeek);
  const weeks: Date[][] = [];
  for (
    let cursor = first;
    cursor.getTime() <= lastDay.getTime();
    cursor = addDays(cursor, 7)
  ) {
    weeks.push(Array.from({ length: 7 }, (_, day) => addDays(cursor, day)));
  }
  return {
    weeks,
    rangeStart: first,
    rangeEnd: addDays(first, weeks.length * 7),
  };
}

/** Half-open `[start, end)` data range a view needs for `anchorDate`. */
export function viewRange(
  view: SchedulerViewType,
  anchorDate: Date,
  firstDayOfWeek: number,
  agendaDuration = 7,
  intervalCount = 1,
): { start: Date; end: Date } {
  const intervals = normalizeIntervalCount(intervalCount);
  if (view === 'day' || view === 'timelineDay') {
    const start = startOfDay(anchorDate);
    return { start, end: addDays(start, intervals) };
  }
  if (view === 'agenda') {
    const start = startOfDay(anchorDate);
    return { start, end: addDays(start, Math.max(1, agendaDuration)) };
  }
  if (
    view === 'week' ||
    view === 'workWeek' ||
    view === 'timelineWeek' ||
    view === 'timelineWorkWeek'
  ) {
    const start = startOfWeek(anchorDate, firstDayOfWeek);
    return { start, end: addDays(start, 7 * intervals) };
  }
  if (view === 'timelineMonth') {
    const start = startOfMonth(anchorDate);
    return { start, end: addMonths(start, intervals) };
  }
  if (view === 'year' || view === 'timelineYear') {
    const start = new Date(anchorDate.getFullYear(), 0, 1);
    return {
      start,
      end: new Date(anchorDate.getFullYear() + intervals, 0, 1),
    };
  }
  const grid = buildMonthGrid(anchorDate, firstDayOfWeek, intervals);
  return { start: grid.rangeStart, end: grid.rangeEnd };
}

/** Steps the anchor date one period (`intervalCount` units) back or forth. */
export function navigateDate(
  view: SchedulerViewType,
  anchorDate: Date,
  direction: -1 | 1,
  agendaDuration = 7,
  intervalCount = 1,
): Date {
  const intervals = normalizeIntervalCount(intervalCount);
  if (view === 'day' || view === 'timelineDay') {
    return addDays(anchorDate, direction * intervals);
  }
  if (view === 'agenda') {
    return addDays(anchorDate, direction * Math.max(1, agendaDuration));
  }
  if (
    view === 'week' ||
    view === 'workWeek' ||
    view === 'timelineWeek' ||
    view === 'timelineWorkWeek'
  ) {
    return addDays(anchorDate, direction * 7 * intervals);
  }
  if (view === 'year' || view === 'timelineYear') {
    return new Date(anchorDate.getFullYear() + direction * intervals, 0, 1);
  }
  return startOfMonth(addMonths(anchorDate, direction * intervals));
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
