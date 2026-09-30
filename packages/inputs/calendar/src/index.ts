// @oge-ui/inputs/calendar — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export { OgeCalendar, OgeCalendarCellTemplate } from './calendar';
export {
  type OgeCalendarZoomLevel,
  type OgeCalendarSelectionMode,
  type OgeCalendarRange,
  type OgeCalendarWeekNumberOptions,
  type OgeCalendarDisabledDates,
  type OgeCalendarCellTemplateContext,
  type OgeCalendarCellClickEvent,
} from './calendar-types';
// shared with sibling entry points; not re-exported by @oge-ui/inputs
export { isDayDisabled } from './calendar-engine';
