/**
 * Timezone-safe date math for the whole suite. Every function constructs
 * dates via local `new Date(y, m, d, …)` and reads local getters — never
 * `Date.parse`, never ISO-string round-trips, never `toISOString` for day
 * math. This module is the only sanctioned entry point for calendar/date-box
 * arithmetic (ARCHITECTURE.md: Intl-only, no DateAdapter, no date library).
 */

/** Week-number rules (ISO-like variants). */
export type WeekNumberRule = 'firstDay' | 'firstFourDays' | 'fullWeek';

/** Midnight (local) of the given date. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Midnight (local) of the following day — exclusive upper bound for day ranges. */
export function nextDay(date: Date): Date {
  return addDays(startOfDay(date), 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

/** Month arithmetic that clamps the day (Jan 31 + 1 month → Feb 28/29). */
export function addMonths(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(
    year,
    month,
    Math.min(date.getDate(), lastDay),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

export function sameDay(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Clamps into `[min, max]`; either bound may be undefined (unbounded). */
export function clampDate(date: Date, min?: Date, max?: Date): Date {
  if (min && date.getTime() < min.getTime()) return min;
  if (max && date.getTime() > max.getTime()) return max;
  return date;
}

/**
 * The 6×7 day matrix of a month view: always 42 consecutive days starting on
 * the `firstDayOfWeek`-aligned day at or before the 1st of the month.
 */
export function monthMatrix(
  year: number,
  month: number,
  firstDayOfWeek: number,
): Date[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - firstDayOfWeek + 7) % 7;
  const start = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

/**
 * Week number of the year under the given rule:
 * `firstDay` — week 1 contains Jan 1; `firstFourDays` — ISO 8601 (week 1 has
 * ≥ 4 January days); `fullWeek` — week 1 is the first complete week.
 */
export function weekNumber(date: Date, rule: WeekNumberRule): number {
  // normalize to the week's Thursday-equivalent pivot per rule, using Monday
  // as the ISO week start for firstFourDays and Sunday otherwise
  const weekStart = rule === 'firstFourDays' ? 1 : 0;
  const day = startOfDay(date);
  const dayIndex = (day.getDay() - weekStart + 7) % 7;
  const weekStartDate = addDays(day, -dayIndex);
  const jan1 = new Date(weekStartDate.getFullYear(), 0, 1);
  let yearForWeek = weekStartDate.getFullYear();
  let reference = jan1;
  // pivot day inside this week that decides the week's year membership:
  // firstDay → the week END (week 1 CONTAINS Jan 1), firstFourDays → the ISO
  // Thursday, fullWeek → the week START (straddling weeks stay in the old year)
  const pivotOffset =
    rule === 'firstFourDays' ? 3 : rule === 'firstDay' ? 6 : 0;
  const pivot = addDays(weekStartDate, pivotOffset);
  if (pivot.getFullYear() !== yearForWeek) {
    yearForWeek = pivot.getFullYear();
    reference = new Date(yearForWeek, 0, 1);
  }
  const refIndex = (reference.getDay() - weekStart + 7) % 7;
  const firstWeekStart =
    rule === 'firstDay'
      ? addDays(reference, -refIndex)
      : rule === 'firstFourDays'
        ? refIndex <= 3
          ? addDays(reference, -refIndex)
          : addDays(reference, 7 - refIndex)
        : refIndex === 0
          ? reference
          : addDays(reference, 7 - refIndex);
  const diffDays = Math.round(
    (weekStartDate.getTime() - firstWeekStart.getTime()) / 86_400_000,
  );
  return Math.floor(diffDays / 7) + 1;
}

/**
 * Serializes `next` in the storage shape of `original`: `Date` stays `Date`,
 * a `yyyy-MM-dd`(THH:mm…) string round-trips as `yyyy-MM-dd` — so grid
 * editors never silently change a row's storage type.
 */
export function serializeLikeOriginal(
  next: Date | null,
  original: unknown,
): unknown {
  if (next === null) return null;
  if (original instanceof Date || original == null) return next;
  if (typeof original === 'string') {
    const y = String(next.getFullYear()).padStart(4, '0');
    const m = String(next.getMonth() + 1).padStart(2, '0');
    const d = String(next.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return next;
}

/**
 * Best-effort conversion of a stored cell value into a local `Date`:
 * `Date` passes through, `yyyy-MM-dd`(THH:mm…) strings parse as LOCAL dates
 * (never via `Date.parse`, which treats date-only strings as UTC), numbers
 * are epoch millis. Anything else → `null`.
 */
export function toLocalDate(value: unknown): Date | null {
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(
        value,
      );
    if (!match) return null;
    const [, y, m, d, hh, mm, ss] = match;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh ?? 0),
      Number(mm ?? 0),
      Number(ss ?? 0),
    );
  }
  return null;
}
