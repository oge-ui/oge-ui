/**
 * View models of the two list-shaped views and the chip/popup texts: the
 * agenda (day-grouped rows), the year overview (twelve mini months with
 * per-day counts) and the colors and time lines every chip and the
 * appointment popup render.
 */
import {
  ogeDateTimeFormat,
  addDays,
  contrastForeground,
  parseColor,
  rangesOverlap,
  sameDay,
  sameMonth,
  startOfDay,
} from '@oge-ui/core';
import type { SchedulerAppointment } from './scheduler-model';
import { buildMonthGrid } from './view-model';

/* ---------- agenda ---------- */

/** One agenda day group. */
export interface AgendaDay<T> {
  readonly day: Date;
  readonly appointments: readonly SchedulerAppointment<T>[];
}

/**
 * Day-grouped appointments for `agendaDuration` days from the anchor.
 * Empty days are skipped (dx parity); all-day rows sort first.
 */
export function buildAgendaDays<T>(
  anchorDate: Date,
  agendaDuration: number,
  appointments: readonly SchedulerAppointment<T>[],
): readonly AgendaDay<T>[] {
  const first = startOfDay(anchorDate);
  const count = Math.max(1, agendaDuration);
  const groups: AgendaDay<T>[] = [];
  for (let index = 0; index < count; index++) {
    const day = addDays(first, index);
    const dayEnd = addDays(day, 1);
    const matches = appointments
      .filter(
        (appointment) =>
          rangesOverlap(
            appointment.startDate,
            appointment.endDate,
            day,
            dayEnd,
          ) ||
          (appointment.startDate.getTime() === appointment.endDate.getTime() &&
            sameDay(appointment.startDate, day)),
      )
      .sort(
        (a, b) =>
          Number(b.displayAllDay) - Number(a.displayAllDay) ||
          a.startDate.getTime() - b.startDate.getTime(),
      );
    if (matches.length > 0) groups.push({ day, appointments: matches });
  }
  return groups;
}

/** An agenda day heading (`Thursday, August 2026`). */
export function agendaDayText(day: Date, locale: string | undefined): string {
  return ogeDateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    year: 'numeric',
  }).format(day);
}

/** An agenda row's time column (`allDayLabel` for all-day rows). */
export function agendaTimeText<T>(
  appointment: SchedulerAppointment<T>,
  day: Date,
  locale: string | undefined,
  allDayLabel: string,
): string {
  if (appointment.displayAllDay) return allDayLabel;
  const format = ogeDateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const start = sameDay(appointment.startDate, day)
    ? format.format(appointment.startDate)
    : format.format(day);
  return `${start} – ${format.format(appointment.endDate)}`;
}

/* ---------- year ---------- */

/** One mini-month cell. */
export interface YearCell {
  readonly day: Date;
  readonly otherMonth: boolean;
  readonly count: number;
}

/** One mini month of the year grid. */
export interface YearMonth {
  readonly anchor: Date;
  readonly title: string;
  readonly weeks: readonly (readonly YearCell[])[];
}

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

/** Appointment counts per local day key (`y-m-d`). */
export function countAppointmentsByDay<T>(
  appointments: readonly SchedulerAppointment<T>[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const appointment of appointments) {
    const cursor = new Date(
      appointment.startDate.getFullYear(),
      appointment.startDate.getMonth(),
      appointment.startDate.getDate(),
    );
    const lastMs = Math.max(
      appointment.endDate.getTime() - 1,
      appointment.startDate.getTime(),
    );
    for (let guard = 0; guard < 366; guard++) {
      if (cursor.getTime() > lastMs) break;
      const key = dayKey(cursor);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return counts;
}

/** The twelve mini months of `year`. */
export function buildYearMonths(
  year: number,
  firstDayOfWeek: number,
  counts: ReadonlyMap<string, number>,
  locale: string | undefined,
): readonly YearMonth[] {
  const titleFormat = ogeDateTimeFormat(locale, { month: 'long' });
  return Array.from({ length: 12 }, (_, month) => {
    const anchor = new Date(year, month, 1);
    const grid = buildMonthGrid(anchor, firstDayOfWeek);
    return {
      anchor,
      title: titleFormat.format(anchor),
      weeks: grid.weeks.map((week) =>
        week.map((day) => ({
          day,
          otherMonth: !sameMonth(day, anchor),
          count: counts.get(dayKey(day)) ?? 0,
        })),
      ),
    };
  });
}

/** Narrow weekday initial of the year view headers. */
export function yearWeekdayText(day: Date, locale: string | undefined): string {
  return ogeDateTimeFormat(locale, { weekday: 'narrow' }).format(day);
}

/** A year cell's accessible name, with the count when busy. */
export function yearCellLabel(
  cell: YearCell,
  locale: string | undefined,
): string {
  const date = ogeDateTimeFormat(locale, { dateStyle: 'full' }).format(
    cell.day,
  );
  return cell.count > 0 ? `${date} (${cell.count})` : date;
}

/* ---------- chips & popup ---------- */

/** A chip's readable foreground over its own color, `null` for the default. */
export function chipForeground(color: string | undefined): string | null {
  if (color === undefined) return null;
  const parsed = parseColor(color);
  return parsed === null ? null : contrastForeground(parsed);
}

/** A chip's time line (`9:00 AM – 10:00 AM`). */
export function chipTimeText<T>(
  appointment: SchedulerAppointment<T>,
  locale: string | undefined,
): string {
  const format = ogeDateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${format.format(appointment.startDate)} – ${format.format(appointment.endDate)}`;
}

/** The appointment popup's date/time line (dates only when all-day). */
export function popupTimeText<T>(
  appointment: SchedulerAppointment<T>,
  locale: string | undefined,
): string {
  const format = ogeDateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: appointment.allDay ? undefined : 'short',
  });
  return `${format.format(appointment.startDate)} – ${format.format(appointment.endDate)}`;
}
