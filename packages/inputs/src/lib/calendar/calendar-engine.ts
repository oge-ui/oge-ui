import {
  addMonths,
  monthMatrix,
  sameDay,
  sameMonth,
  startOfDay,
} from '@oge-ui/core';
import type {
  OgeCalendarDisabledDates,
  OgeCalendarZoomLevel,
} from './calendar-types';

/** One rendered calendar cell (a day, a month or a year). */
export interface CalendarCell {
  date: Date;
  text: string;
  disabled: boolean;
  /** Outside the anchor month/year/decade (rendered dimmed). */
  otherPeriod: boolean;
}

/** Pure gating: min/max bound the DAY, `disabledDates` marks individual days. */
export function isDayDisabled(
  date: Date,
  min: Date | undefined,
  max: Date | undefined,
  disabledDates: OgeCalendarDisabledDates | undefined,
): boolean {
  const day = startOfDay(date).getTime();
  if (min && day < startOfDay(min).getTime()) return true;
  if (max && day > startOfDay(max).getTime()) return true;
  if (!disabledDates) return false;
  if (typeof disabledDates === 'function') return disabledDates(date);
  return disabledDates.some((candidate) => sameDay(candidate, date));
}

/** The 42 day cells of the month view. */
export function monthCells(
  anchor: Date,
  firstDayOfWeek: number,
  locale: string | undefined,
  min: Date | undefined,
  max: Date | undefined,
  disabledDates: OgeCalendarDisabledDates | undefined,
): CalendarCell[] {
  const format = new Intl.DateTimeFormat(locale, { day: 'numeric' });
  return monthMatrix(
    anchor.getFullYear(),
    anchor.getMonth(),
    firstDayOfWeek,
  ).map((date) => ({
    date,
    text: format.format(date),
    disabled: isDayDisabled(date, min, max, disabledDates),
    otherPeriod: !sameMonth(date, anchor),
  }));
}

/** The 12 month cells of the year view. */
export function yearCells(
  anchor: Date,
  locale: string | undefined,
  min: Date | undefined,
  max: Date | undefined,
): CalendarCell[] {
  const format = new Intl.DateTimeFormat(locale, { month: 'short' });
  const year = anchor.getFullYear();
  return Array.from({ length: 12 }, (_, month) => {
    const date = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    return {
      date,
      text: format.format(date),
      disabled:
        (min !== undefined && monthEnd.getTime() < startOfDay(min).getTime()) ||
        (max !== undefined && date.getTime() > startOfDay(max).getTime()),
      otherPeriod: false,
    };
  });
}

/** The 12 year cells of the decade view (decade ± the neighbors). */
export function decadeCells(
  anchor: Date,
  min: Date | undefined,
  max: Date | undefined,
): CalendarCell[] {
  const decadeStart = Math.floor(anchor.getFullYear() / 10) * 10;
  return Array.from({ length: 12 }, (_, index) => {
    const year = decadeStart - 1 + index;
    const date = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    return {
      date,
      text: String(year),
      disabled:
        (min !== undefined && yearEnd.getTime() < startOfDay(min).getTime()) ||
        (max !== undefined && date.getTime() > startOfDay(max).getTime()),
      otherPeriod: year < decadeStart || year >= decadeStart + 10,
    };
  });
}

/** Localized weekday header cells, aligned to `firstDayOfWeek`. */
export function weekdayNames(
  locale: string | undefined,
  firstDayOfWeek: number,
): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // 2023-01-01 was a Sunday — a fixed anchor keeps names deterministic
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(2023, 0, 1 + ((firstDayOfWeek + index) % 7))),
  );
}

/** Localized header label of the current view. */
export function viewLabel(
  anchor: Date,
  zoom: OgeCalendarZoomLevel,
  locale: string | undefined,
): string {
  if (zoom === 'month') {
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(anchor);
  }
  if (zoom === 'year') {
    return new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(anchor);
  }
  const decadeStart = Math.floor(anchor.getFullYear() / 10) * 10;
  return `${decadeStart}–${decadeStart + 9}`;
}

/** The anchor after one navigation step at the given zoom (`direction` ±1). */
export function navigate(
  anchor: Date,
  zoom: OgeCalendarZoomLevel,
  direction: 1 | -1,
): Date {
  if (zoom === 'month') return addMonths(anchor, direction);
  if (zoom === 'year') return addMonths(anchor, direction * 12);
  return addMonths(anchor, direction * 120);
}

// resolveFirstDayOfWeek moved to @oge-ui/core date-utils (the scheduler
// shares it); re-exported here so calendar-internal imports stay unchanged.
export { resolveFirstDayOfWeek } from '@oge-ui/core';
