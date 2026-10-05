import type { OgeScheduler } from '@oge-ui/scheduler';
import {
  buildSchedulerICalendar,
  schedulerItemsFromICalendar,
  type OgeSchedulerICalendarExportOptions,
  type OgeSchedulerICalendarImportOptions,
} from '@oge-ui/scheduler-engine/export-ical';

// The RFC 5545 codec is framework-free, so it lives in
// `@oge-ui/scheduler-engine` and both render layers call the same one.
// Re-exported so this entry point stands on its own.
export {
  buildSchedulerICalendar,
  parseOgeICalendar,
  schedulerItemsFromICalendar,
  type OgeICalEvent,
  type OgeSchedulerICalendarExportOptions,
  type OgeSchedulerICalendarImportOptions,
} from '@oge-ui/scheduler-engine/export-ical';

/**
 * Exports every appointment of the scheduler as an iCalendar (`.ics`)
 * document — series stay series (`RRULE` / `RDATE` / `EXDATE`), all-day
 * events end on the following day (`VALUE=DATE`) — and downloads it unless
 * `download: false`. Returns the text.
 *
 * ```ts
 * const { exportToICalendar } = await import('@oge-ui/scheduler/export-ical');
 * exportToICalendar(this.scheduler(), { filename: 'team.ics', calendarName: 'Team' });
 * ```
 */
export function exportToICalendar<T extends object>(
  scheduler: OgeScheduler<T>,
  options: OgeSchedulerICalendarExportOptions = {},
): string {
  const text = buildSchedulerICalendar(scheduler.getExportData(), options);
  if (options.download !== false && typeof document !== 'undefined') {
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = options.filename ?? 'calendar.ics';
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return text;
}

/**
 * Imports an iCalendar document: every `VEVENT` becomes an item in the
 * scheduler's field shape (`RECURRENCE-ID` overrides folded into their
 * series) and goes through `addAppointment` — the cancelable
 * `appointmentAdding` pipeline. Returns the items built.
 *
 * ```ts
 * const { importICalendar } = await import('@oge-ui/scheduler/export-ical');
 * importICalendar(this.scheduler(), await file.text(), { uidField: 'id' });
 * ```
 */
export function importICalendar<T extends object>(
  scheduler: OgeScheduler<T>,
  text: string,
  options: OgeSchedulerICalendarImportOptions = {},
): T[] {
  const items = schedulerItemsFromICalendar<T>(
    text,
    scheduler.getExportData().fields,
    options,
  );
  for (const item of items) scheduler.addAppointment(item);
  return items;
}
