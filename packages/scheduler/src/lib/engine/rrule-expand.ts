/**
 * Recurrence expansion over the documented RFC 5545 subset (see rrule.ts).
 * Pure and Intl-free: all stepping uses `@oge-ui/core`'s local wall-time
 * date math. COUNT is honored from the series start even when the queried
 * range lies far later, with a hard iteration cap as a runaway backstop.
 */
import { addDays, addMonths, sameDay, startOfWeek } from '@oge-ui/core';
import type { RecurrenceRule } from './rrule';

/** Runaway backstop: no series expands past this many occurrences. */
const MAX_OCCURRENCES = 1000;

function sameMinute(a: Date, b: Date): boolean {
  return (
    sameDay(a, b) &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes()
  );
}

/** Whether `date` is excluded: exact-minute stamps or date-only exceptions. */
function isException(date: Date, exceptions: readonly Date[]): boolean {
  return exceptions.some((exception) =>
    exception.getHours() === 0 &&
    exception.getMinutes() === 0 &&
    exception.getSeconds() === 0
      ? sameDay(exception, date)
      : sameMinute(exception, date),
  );
}

/** Ordinal-BYDAY resolution: the `2TU` / `-1FR` day of a month, or null. */
function ordinalWeekday(
  year: number,
  month: number,
  ordinal: number,
  weekday: number,
): Date | null {
  if (ordinal > 0) {
    const first = new Date(year, month, 1);
    const lead = (weekday - first.getDay() + 7) % 7;
    const day = 1 + lead + (ordinal - 1) * 7;
    const date = new Date(year, month, day);
    return date.getMonth() === month ? date : null;
  }
  // -1 = last such weekday of the month
  const last = new Date(year, month + 1, 0);
  const back = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - back);
}

function withTime(day: Date, template: Date): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    template.getHours(),
    template.getMinutes(),
    template.getSeconds(),
  );
}

/** Candidate starts of one period (unsorted-safe; caller sorts). */
function periodCandidates(
  rule: RecurrenceRule,
  periodAnchor: Date,
  seriesStart: Date,
): Date[] {
  switch (rule.freq) {
    case 'daily':
      return [periodAnchor];
    case 'weekly': {
      const weekdays =
        rule.byDay !== undefined && rule.byDay.length > 0
          ? rule.byDay.map((entry) => entry.weekday)
          : [seriesStart.getDay()];
      const weekStart = startOfWeek(periodAnchor, rule.weekStart);
      return weekdays.map((weekday) =>
        withTime(
          addDays(weekStart, (weekday - rule.weekStart + 7) % 7),
          seriesStart,
        ),
      );
    }
    case 'monthly': {
      const year = periodAnchor.getFullYear();
      const month = periodAnchor.getMonth();
      if (rule.byMonthDay !== undefined && rule.byMonthDay.length > 0) {
        const lastDay = new Date(year, month + 1, 0).getDate();
        return rule.byMonthDay
          .map((dayOfMonth) =>
            dayOfMonth === -1 ? lastDay : dayOfMonth,
          )
          .filter((dayOfMonth) => dayOfMonth >= 1 && dayOfMonth <= lastDay)
          .map((dayOfMonth) =>
            withTime(new Date(year, month, dayOfMonth), seriesStart),
          );
      }
      if (rule.byDay !== undefined && rule.byDay.length > 0) {
        return rule.byDay
          .map((entry) =>
            ordinalWeekday(year, month, entry.ordinal ?? 1, entry.weekday),
          )
          .filter((day): day is Date => day !== null)
          .map((day) => withTime(day, seriesStart));
      }
      const lastDay = new Date(year, month + 1, 0).getDate();
      if (seriesStart.getDate() > lastDay) return []; // Jan 31 monthly skips Feb
      return [
        withTime(new Date(year, month, seriesStart.getDate()), seriesStart),
      ];
    }
    case 'yearly': {
      const year = periodAnchor.getFullYear();
      const months =
        rule.byMonth !== undefined && rule.byMonth.length > 0
          ? rule.byMonth.map((m) => m - 1)
          : [seriesStart.getMonth()];
      const candidates: Date[] = [];
      for (const month of months) {
        if (rule.byDay !== undefined && rule.byDay.length > 0) {
          for (const entry of rule.byDay) {
            const day = ordinalWeekday(
              year,
              month,
              entry.ordinal ?? 1,
              entry.weekday,
            );
            if (day !== null) candidates.push(withTime(day, seriesStart));
          }
          continue;
        }
        const dayOfMonth =
          rule.byMonthDay !== undefined && rule.byMonthDay.length > 0
            ? rule.byMonthDay[0]
            : seriesStart.getDate();
        const lastDay = new Date(year, month + 1, 0).getDate();
        const resolved = dayOfMonth === -1 ? lastDay : dayOfMonth;
        if (resolved >= 1 && resolved <= lastDay) {
          candidates.push(
            withTime(new Date(year, month, resolved), seriesStart),
          );
        }
      }
      return candidates;
    }
  }
}

/** First moment a period can produce candidates in (loose lower bound). */
function periodFloor(rule: RecurrenceRule, anchor: Date): Date {
  switch (rule.freq) {
    case 'daily':
      return anchor;
    case 'weekly':
      return startOfWeek(anchor, rule.weekStart);
    case 'monthly':
      return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    case 'yearly':
      return new Date(anchor.getFullYear(), 0, 1);
  }
}

function nextPeriod(rule: RecurrenceRule, anchor: Date): Date {
  switch (rule.freq) {
    case 'daily':
      return addDays(anchor, rule.interval);
    case 'weekly':
      return addDays(anchor, 7 * rule.interval);
    case 'monthly':
      return addMonths(anchor, rule.interval);
    case 'yearly':
      return addMonths(anchor, 12 * rule.interval);
  }
}

/**
 * Occurrence starts of a series inside the half-open `[rangeStart, rangeEnd)`
 * window, honoring INTERVAL, COUNT ⊕ UNTIL and the exception list. The
 * series start itself is always occurrence #1 (RFC: DTSTART is the first
 * instance) unless excluded.
 */
export function expandRecurrence(
  rule: RecurrenceRule,
  seriesStart: Date,
  rangeStart: Date,
  rangeEnd: Date,
  exceptions: readonly Date[] = [],
): Date[] {
  const result: Date[] = [];
  let counted = 0;
  let periodAnchor = seriesStart;
  let iterations = 0;

  while (iterations++ < MAX_OCCURRENCES) {
    const candidates = periodCandidates(rule, periodAnchor, seriesStart)
      .filter((candidate) => candidate.getTime() >= seriesStart.getTime())
      .sort((a, b) => a.getTime() - b.getTime());

    for (const candidate of candidates) {
      if (
        rule.until !== undefined &&
        candidate.getTime() > rule.until.getTime()
      ) {
        continue; // later periods cannot rewind, the floor check stops us
      }
      counted++;
      if (rule.count !== undefined && counted > rule.count) return result;
      if (
        candidate.getTime() < rangeEnd.getTime() &&
        candidate.getTime() >= rangeStart.getTime() &&
        !isException(candidate, exceptions)
      ) {
        result.push(candidate);
      }
      if (counted >= MAX_OCCURRENCES) return result;
    }

    periodAnchor = nextPeriod(rule, periodAnchor);
    const floor = periodFloor(rule, periodAnchor);
    if (floor.getTime() >= rangeEnd.getTime()) return result;
    if (rule.until !== undefined && floor.getTime() > rule.until.getTime()) {
      return result;
    }
  }
  return result;
}

/** Appends an exception stamp (`yyyyMMddTHHmmss`) to an EXDATE list. */
export function appendException(
  existing: string | undefined,
  occurrenceStart: Date,
): string {
  const y = String(occurrenceStart.getFullYear()).padStart(4, '0');
  const m = String(occurrenceStart.getMonth() + 1).padStart(2, '0');
  const d = String(occurrenceStart.getDate()).padStart(2, '0');
  const hh = String(occurrenceStart.getHours()).padStart(2, '0');
  const mm = String(occurrenceStart.getMinutes()).padStart(2, '0');
  const ss = String(occurrenceStart.getSeconds()).padStart(2, '0');
  const stamp = `${y}${m}${d}T${hh}${mm}${ss}`;
  return existing === undefined || existing === ''
    ? stamp
    : `${existing},${stamp}`;
}
