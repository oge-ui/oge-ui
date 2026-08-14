import type { OgeCalendarZoomLevel } from '@oge-ui/behavior';

// The calendar vocabulary lives framework-free in `@oge-ui/behavior`
// (`calendar-core`), shared with the React render layer; re-exported here so
// existing imports keep working. Only the Angular template-slot context stays
// local — `$implicit` has no meaning outside Angular.
export type {
  OgeCalendarZoomLevel,
  OgeCalendarSelectionMode,
  OgeCalendarRange,
  OgeCalendarWeekNumberOptions,
  OgeCalendarDisabledDates,
  OgeCalendarCellClickEvent,
} from '@oge-ui/behavior';

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
