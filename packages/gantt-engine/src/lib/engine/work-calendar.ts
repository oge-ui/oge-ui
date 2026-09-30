/**
 * Work-time calendar math (day granularity, local wall time — house rule).
 * A calendar names the working weekdays and the holiday dates; scheduling
 * rolls starts onto working days and measures durations in working days.
 * Pure.
 */

/** The working-time calendar of a plan. */
export interface GanttWorkCalendar {
  /** Working weekdays, 0 = Sunday. Default: Monday–Friday. */
  readonly workingDays?: readonly number[];
  /** Non-working dates on top of the weekly pattern. */
  readonly holidays?: readonly Date[];
}

const DEFAULT_WORKING_DAYS: readonly number[] = [1, 2, 3, 4, 5];
const DAY_MS = 86_400_000;

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function workingDaysOf(calendar: GanttWorkCalendar): readonly number[] {
  const days = calendar.workingDays ?? DEFAULT_WORKING_DAYS;
  // an empty (or full) working week degenerates to plain calendar days
  return days.length === 0 || days.length === 7 ? DEFAULT_WORKING_DAYS : days;
}

/** Whether `date`'s day is a working day under `calendar`. */
export function isWorkingDay(date: Date, calendar: GanttWorkCalendar): boolean {
  if (!workingDaysOf(calendar).includes(date.getDay())) return false;
  return !(calendar.holidays ?? []).some((holiday) => sameDay(holiday, date));
}

/**
 * The first working day at or after `date` (time of day preserved).
 * Bounded: with at least one working weekday a hit is at most 7 + |holidays|
 * days away.
 */
export function nextWorkingDay(date: Date, calendar: GanttWorkCalendar): Date {
  const holidayCount = calendar.holidays?.length ?? 0;
  let current = date;
  for (let i = 0; i <= 7 + holidayCount; i++) {
    if (isWorkingDay(current, calendar)) return current;
    current = new Date(current.getTime() + DAY_MS);
  }
  return date;
}

/**
 * Working days in the half-open range `[start, end)`, counted per calendar
 * date. Sub-day remainders count the day they fall on.
 */
export function workingDaysBetween(
  start: Date,
  end: Date,
  calendar: GanttWorkCalendar,
): number {
  if (end.getTime() <= start.getTime()) return 0;
  let count = 0;
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cursor.getTime() < end.getTime()) {
    if (isWorkingDay(cursor, calendar)) count++;
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
    );
  }
  return count;
}

/**
 * The end of a span of `days` working days starting at `start` (which is
 * rolled onto a working day first). Time of day is preserved; `days: 0`
 * returns the rolled start (a milestone).
 */
export function addWorkingDays(
  start: Date,
  days: number,
  calendar: GanttWorkCalendar,
): Date {
  let cursor = nextWorkingDay(start, calendar);
  if (days <= 0) return cursor;
  let remaining = days;
  // consume the start day, then step day by day counting working days
  while (remaining > 1) {
    cursor = nextWorkingDay(new Date(cursor.getTime() + DAY_MS), calendar);
    remaining--;
  }
  return new Date(cursor.getTime() + DAY_MS);
}
