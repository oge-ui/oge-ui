// The calendar's view model — cell grids, weekday names, view labels and the
// navigation arithmetic — lives framework-free in `@oge-ui/behavior`
// (`calendar-core`), shared with the React render layer; re-exported here so
// calendar-internal imports stay unchanged.
export {
  isDayDisabled,
  monthCells,
  yearCells,
  decadeCells,
  weekdayNames,
  viewLabel,
  navigate,
  type CalendarCell,
} from '@oge-ui/behavior';
// resolveFirstDayOfWeek lives in @oge-ui/core date-utils (the scheduler
// shares it); re-exported here so calendar-internal imports stay unchanged.
export { resolveFirstDayOfWeek } from '@oge-ui/core';
