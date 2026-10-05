import {
  buildSchedulerICalendar,
  schedulerItemsFromICalendar,
  type OgeSchedulerICalendarExportOptions,
  type OgeSchedulerICalendarImportOptions,
} from '@oge-ui/scheduler-engine/export-ical';
import type { OgeSchedulerHandle } from './lib/scheduler-types';

// The RFC 5545 codec is the framework-free one both render layers share;
// re-exported so this entry point stands on its own.
export {
  buildSchedulerICalendar,
  parseOgeICalendar,
  schedulerItemsFromICalendar,
  type OgeICalEvent,
  type OgeSchedulerICalendarExportOptions,
  type OgeSchedulerICalendarImportOptions,
} from '@oge-ui/scheduler-engine/export-ical';

/**
 * Exports every appointment as an iCalendar (`.ics`) document — series stay
 * series (`RRULE` / `RDATE` / `EXDATE`) — and downloads it unless
 * `download: false`; the React face of `@oge-ui/scheduler/export-ical`.
 * Returns the text.
 *
 * ```tsx
 * const scheduler = useRef<OgeSchedulerHandle<Appt>>(null);
 * const { exportToICalendar } = await import('@oge-ui/react-scheduler/export-ical');
 * exportToICalendar(scheduler.current!, { filename: 'team.ics' });
 * ```
 */
export function exportToICalendar<T extends object>(
  scheduler: OgeSchedulerHandle<T>,
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
 * Imports an iCalendar document through `addAppointment` (the cancelable
 * `onAppointmentAdding` pipeline): every `VEVENT` becomes an item in the
 * scheduler's field shape. Returns the items built.
 */
export function importICalendar<T extends object>(
  scheduler: OgeSchedulerHandle<T>,
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
