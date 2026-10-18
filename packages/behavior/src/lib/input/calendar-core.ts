import {
  ogeDateTimeFormat,
  addMonths,
  monthMatrix,
  sameDay,
  sameMonth,
  startOfDay,
  type WeekNumberRule,
} from '@oge-ui/core';

// The pure date arithmetic lives in `@oge-ui/core` (`date-utils`);
// re-exported here so the React render layer reaches it through its one
// behavior dependency, exactly like the slider and color math.
export {
  addDays,
  addMonths,
  addYears,
  monthMatrix,
  resolveFirstDayOfWeek,
  sameDay,
  sameMonth,
  startOfDay,
  toLocalDate,
  weekNumber,
  type WeekNumberRule,
} from '@oge-ui/core';

/** What the date editor edits: a day, a time of day, or both. */
export type OgeDateBoxType = 'date' | 'time' | 'datetime';

/** Picker commit policy: on pick, or via the OK/Cancel footer. */
export type OgeDateBoxApplyValueMode = 'instantly' | 'useButtons';

/** Display text: `Intl.DateTimeFormatOptions` or a custom formatter. */
export type OgeDateBoxDisplayFormat =
  Intl.DateTimeFormatOptions | ((date: Date) => string);

/** Time picker layout: one interval list, or hour + minute columns. */
export type OgeDateBoxTimeView = 'list' | 'columns';

/** Calendar drill levels (century is deliberately not replicated). */
export type OgeCalendarZoomLevel = 'month' | 'year' | 'decade';

/** Single, multiple or range (start–end with hover preview) day selection. */
export type OgeCalendarSelectionMode = 'single' | 'multiple' | 'range';

/** Two-ended range value (`[start, end]`, either end may be open). */
export type OgeCalendarRange = readonly [Date | null, Date | null];

/** Options object form of `showWeekNumbers`. */
export interface OgeCalendarWeekNumberOptions {
  rule: WeekNumberRule;
}

/** `Date[]` or a predicate marking unselectable days. */
export type OgeCalendarDisabledDates =
  readonly Date[] | ((date: Date) => boolean);

/** A day/month/year cell was activated. */
export interface OgeCalendarCellClickEvent {
  date: Date;
  view: OgeCalendarZoomLevel;
  event: Event;
}

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
  const format = ogeDateTimeFormat(locale, { day: 'numeric' });
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
  const format = ogeDateTimeFormat(locale, { month: 'short' });
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
  const format = ogeDateTimeFormat(locale, { weekday: 'short' });
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
    return ogeDateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(anchor);
  }
  if (zoom === 'year') {
    return ogeDateTimeFormat(locale, { year: 'numeric' }).format(anchor);
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

/**
 * How the visible calendar view changed — the direction its enter motion
 * takes: `next`/`prev` slide in from the end/start side (month, year or
 * decade paging), `zoom-out` (month → year → decade) and `zoom-in` scale in.
 */
export type OgeCalendarViewMotion = 'next' | 'prev' | 'zoom-in' | 'zoom-out';

const ZOOM_DEPTH: Readonly<Record<OgeCalendarZoomLevel, number>> = {
  month: 0,
  year: 1,
  decade: 2,
};

/**
 * Identity of the visible view: one key per month (`month` zoom), year or
 * decade. The render layers key the view container on it, so a page or zoom
 * change re-creates the container (and runs its enter keyframe) while moving
 * the focus inside the same view does not.
 */
export function calendarViewKey(
  anchor: Date,
  zoom: OgeCalendarZoomLevel,
): string {
  const year = anchor.getFullYear();
  if (zoom === 'month') return `m${year}-${anchor.getMonth()}`;
  if (zoom === 'year') return `y${year}`;
  return `d${Math.floor(year / 10)}`;
}

/** A visible calendar view: its anchor date and drill level. */
export interface OgeCalendarView {
  readonly anchor: Date;
  readonly zoom: OgeCalendarZoomLevel;
}

/**
 * The motion from one view to the next — `null` when the view did not change
 * or there was no previous one (the first render never animates).
 */
export function calendarViewMotion(
  previous: OgeCalendarView | null,
  next: OgeCalendarView,
): OgeCalendarViewMotion | null {
  if (!previous) return null;
  const depth = ZOOM_DEPTH[next.zoom] - ZOOM_DEPTH[previous.zoom];
  if (depth !== 0) return depth > 0 ? 'zoom-out' : 'zoom-in';
  if (
    calendarViewKey(previous.anchor, previous.zoom) ===
    calendarViewKey(next.anchor, next.zoom)
  )
    return null;
  return next.anchor.getTime() > previous.anchor.getTime() ? 'next' : 'prev';
}
