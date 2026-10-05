/**
 * Week numbers for the month rows and the day/week headers. ISO 8601 is
 * Monday-first with the "4-day" rule; `'locale'` asks `Intl.Locale` week
 * data for the first day and the minimal days of week 1 (the US numbers the
 * week holding January 1st as week 1, Sunday-first).
 */
import { addDays, startOfWeek } from '@oge-ui/core';
import type { OgeSchedulerWeekNumberRule } from './scheduler-types';

/**
 * The minimal number of days of the new year week 1 must hold, from the
 * locale's `Intl.Locale` week data; `1` (the week containing January 1st)
 * where the engine has none.
 */
export function resolveMinimalDays(locale: string | undefined): number {
  try {
    const info = new Intl.Locale(
      locale ??
        (typeof navigator === 'undefined' ? 'en-US' : navigator.language),
    ) as unknown as {
      weekInfo?: { minimalDays?: number };
      getWeekInfo?: () => { minimalDays?: number };
    };
    const weekInfo = info.getWeekInfo?.() ?? info.weekInfo;
    const days = weekInfo?.minimalDays;
    if (typeof days === 'number' && days >= 1 && days <= 7) return days;
  } catch {
    // older engines: fall through
  }
  return 1;
}

function dayNumber(date: Date): number {
  return Math.round(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
}

/**
 * The week number of `date` for weeks starting on `firstDayOfWeek` (0 =
 * Sunday) where week 1 is the first week holding at least `minimalDays`
 * days of the year. ISO 8601 is `(1, 4)`.
 */
export function weekNumberOf(
  date: Date,
  firstDayOfWeek: number,
  minimalDays: number,
): number {
  const weekStart = startOfWeek(date, firstDayOfWeek);
  // the day of the week that decides which year the week counts for
  const pivotOffset = 7 - Math.min(7, Math.max(1, minimalDays));
  const weekYear = addDays(weekStart, pivotOffset).getFullYear();
  let firstWeek = startOfWeek(new Date(weekYear, 0, 1), firstDayOfWeek);
  if (addDays(firstWeek, pivotOffset).getFullYear() < weekYear) {
    firstWeek = addDays(firstWeek, 7);
  }
  return Math.round((dayNumber(weekStart) - dayNumber(firstWeek)) / 7) + 1;
}

/**
 * The scheduler's week number: `'iso'` (Monday-first, 4-day rule) or the
 * locale's own numbering on the scheduler's first day of week.
 */
export function schedulerWeekNumber(
  date: Date,
  rule: OgeSchedulerWeekNumberRule,
  firstDayOfWeek: number,
  locale: string | undefined,
): number {
  return rule === 'iso'
    ? weekNumberOf(date, 1, 4)
    : weekNumberOf(date, firstDayOfWeek, resolveMinimalDays(locale));
}

/** The visual badge (`W32`) and its accessible text (`Week 32`). */
export function schedulerWeekNumberTexts(
  week: number,
  messages: { readonly weekNumber: string; readonly weekNumberLabel: string },
): { readonly badge: string; readonly label: string } {
  return {
    badge: messages.weekNumber.replace('{week}', String(week)),
    label: messages.weekNumberLabel.replace('{week}', String(week)),
  };
}

/**
 * The week numbers a set of rendered days spans, in order and de-duplicated
 * (a fortnight view shows `W32–33`).
 */
export function weekNumbersOfDays(
  days: readonly Date[],
  rule: OgeSchedulerWeekNumberRule,
  firstDayOfWeek: number,
  locale: string | undefined,
): readonly number[] {
  const numbers: number[] = [];
  for (const day of days) {
    const week = schedulerWeekNumber(day, rule, firstDayOfWeek, locale);
    if (numbers[numbers.length - 1] !== week) numbers.push(week);
  }
  return numbers;
}
