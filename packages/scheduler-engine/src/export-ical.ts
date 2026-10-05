/**
 * `@oge-ui/scheduler-engine/export-ical` — iCalendar (RFC 5545) export and
 * import shared by both scheduler render layers. Dependency-free; a
 * separate entry so apps that never exchange `.ics` files never load it.
 */
import {
  buildOgeICalendar,
  parseOgeICalendar,
  resolveICalOverrides,
  type OgeICalEvent,
  type OgeICalendarOptions,
} from './lib/ical';
import { formatExceptionStamps } from './lib/editor';
import type { OgeSchedulerExportData } from './lib/export-data';
import {
  parseRecurrenceException,
  parseRecurrenceRule,
  serializeRecurrenceRule,
} from './lib/rrule';
import type { ResolvedSchedulerFields } from './lib/scheduler-model';

export {
  buildOgeICalendar,
  escapeICalText,
  foldICalLine,
  formatICalDate,
  formatICalDateTime,
  formatICalUtc,
  parseICalDuration,
  parseOgeICalendar,
  resolveICalOverrides,
  unescapeICalText,
  type OgeICalEvent,
  type OgeICalendarOptions,
} from './lib/ical';

/** Options of the scheduler `.ics` export. */
export interface OgeSchedulerICalendarExportOptions extends OgeICalendarOptions {
  /** Download file name. Default: `calendar.ics`. */
  readonly filename?: string;
  /** Set `false` to only return the text (no download). Default: `true`. */
  readonly download?: boolean;
}

/** Options of the scheduler `.ics` import. */
export interface OgeSchedulerICalendarImportOptions {
  /** Writes each event's `UID` into this item field (e.g. your key field). */
  readonly uidField?: string;
}

const dayAfter = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
const startOfDayOf = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * The events of a scheduler export: one per appointment, series kept as
 * series (`RRULE`, `RDATE`, `EXDATE` from the rule block and the exception
 * field). An all-day appointment ends on the day after its last day.
 */
export function schedulerICalEvents<T>(
  data: OgeSchedulerExportData<T>,
): OgeICalEvent[] {
  return data.appointments.map((appointment) => {
    const allDay = appointment.allDay;
    const start = allDay ? startOfDayOf(appointment.startDate) : appointment.startDate;
    let end = appointment.endDate;
    if (allDay) {
      const endDay = startOfDayOf(end);
      end =
        end.getTime() === endDay.getTime() && end.getTime() > start.getTime()
          ? end
          : dayAfter(endDay);
    }
    let recurrenceRule: string | undefined;
    let rDates: Date[] = [];
    let exDates: Date[] = [];
    if (appointment.recurrenceRule !== undefined) {
      const rule = parseRecurrenceRule(appointment.recurrenceRule);
      if (rule !== null) {
        recurrenceRule = serializeRecurrenceRule({
          ...rule,
          dtStart: undefined,
          rDates: undefined,
          exDates: undefined,
        });
        rDates = [...(rule.rDates ?? [])];
        exDates = [...(rule.exDates ?? [])];
      } else if (/^FREQ=/i.test(appointment.recurrenceRule.trim())) {
        // a rule outside the expander's subset still travels verbatim
        recurrenceRule = appointment.recurrenceRule.trim();
      }
    }
    if (recurrenceRule !== undefined && appointment.recurrenceException) {
      exDates.push(...parseRecurrenceException(appointment.recurrenceException));
    }
    return {
      uid: `${String(appointment.key)}@oge-ui`,
      summary: appointment.text,
      ...(appointment.description ? { description: appointment.description } : {}),
      ...(appointment.location ? { location: appointment.location } : {}),
      startDate: start,
      endDate: end,
      allDay,
      ...(recurrenceRule !== undefined ? { recurrenceRule } : {}),
      ...(rDates.length > 0 ? { rDates } : {}),
      ...(exDates.length > 0 ? { exDates } : {}),
      ...(appointment.color ? { color: appointment.color } : {}),
    };
  });
}

/** The `.ics` text of a scheduler export. */
export function buildSchedulerICalendar<T>(
  data: OgeSchedulerExportData<T>,
  options: OgeICalendarOptions = {},
): string {
  return buildOgeICalendar(schedulerICalEvents(data), options);
}

/**
 * Items in the scheduler's field shape from an iCalendar document — every
 * `VEVENT` mapped through the string `*Expr` field names (function exprs
 * have nowhere to write and are skipped), overrides folded in
 * (`RECURRENCE-ID` → series `EXDATE` + a standalone item).
 */
export function schedulerItemsFromICalendar<T>(
  text: string,
  fields: ResolvedSchedulerFields<T>,
  options: OgeSchedulerICalendarImportOptions = {},
): T[] {
  const names = fields.fieldNames;
  return resolveICalOverrides(parseOgeICalendar(text)).map((event) => {
    const item: Record<string, unknown> = {};
    const set = (field: string | null, value: unknown): void => {
      if (field !== null && value !== undefined) item[field] = value;
    };
    set(names.text, event.summary);
    set(names.startDate, event.startDate);
    set(names.endDate, event.endDate);
    if (event.allDay) set(names.allDay, true);
    set(names.location, event.location);
    set(names.description, event.description);
    set(names.color, event.color);
    if (event.recurrenceRule !== undefined) {
      const rdates =
        event.rDates && event.rDates.length > 0
          ? `\nRDATE:${event.rDates
              .map((date) => formatExceptionStamps([date.getTime()]))
              .join(',')}`
          : '';
      set(names.recurrenceRule, `${event.recurrenceRule}${rdates}`);
      if (event.exDates && event.exDates.length > 0) {
        set(
          names.recurrenceException,
          formatExceptionStamps(event.exDates.map((date) => date.getTime())),
        );
      }
    }
    if (options.uidField !== undefined) item[options.uidField] = event.uid;
    return item as T;
  });
}
