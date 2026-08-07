import type { WeekNumberRule } from '@oge-ui/core';

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

/** Context of the `[ogeCalendarCellTemplate]` slot. */
export interface OgeCalendarCellTemplateContext {
  /** The cell's date (first-of-month/year for zoomed-out views). */
  $implicit: Date;
  view: OgeCalendarZoomLevel;
  /** Default display text of the cell. */
  text: string;
  disabled: boolean;
  selected: boolean;
  today: boolean;
  /** Day belongs to the previous/next month (month view only). */
  otherPeriod: boolean;
}

/** A day/month/year cell was activated. */
export interface OgeCalendarCellClickEvent {
  date: Date;
  view: OgeCalendarZoomLevel;
  event: Event;
}
