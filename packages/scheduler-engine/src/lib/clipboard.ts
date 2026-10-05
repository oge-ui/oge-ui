/**
 * Copy / paste planning (Ctrl+C on chips, Ctrl+V into the focused slot):
 * the copied appointments keep their relative offsets, the earliest lands
 * on the target slot, and each copy becomes a standalone item — a copied
 * occurrence drops its series' rule, and the key field is removed so the
 * store (or the `appointmentAdding` handler) assigns a fresh one.
 */
import {
  addDays,
  addMinutes,
  serializeLikeOriginal,
  startOfDay,
} from '@oge-ui/core';
import type {
  ResolvedSchedulerFields,
  SchedulerAppointment,
} from './scheduler-model';
import { minutesOfDay } from './time-math';

/** Whole calendar days from `from`'s day to `to`'s day (DST-safe). */
export function calendarDayDiff(from: Date, to: Date): number {
  const a = startOfDay(from);
  const b = startOfDay(to);
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86_400_000,
  );
}

/** One copied appointment, frozen at copy time. */
export interface SchedulerClipboardEntry<T> {
  readonly source: T;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly allDay: boolean;
  /** Whether it was copied from a recurring series' occurrence. */
  readonly occurrence: boolean;
}

/** Freezes the appointments being copied, chronologically. */
export function schedulerClipboardEntries<T>(
  appointments: readonly SchedulerAppointment<T>[],
): readonly SchedulerClipboardEntry<T>[] {
  return [...appointments]
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .map((appointment) => ({
      source: appointment.source,
      startDate: appointment.startDate,
      endDate: appointment.endDate,
      allDay: appointment.allDay,
      occurrence:
        appointment.seriesKey !== null ||
        appointment.recurrenceRule !== undefined,
    }));
}

/** Where pasted items land. */
export interface SchedulerPasteTarget {
  readonly date: Date;
  /** A month / all-day target keeps each copy's time of day. */
  readonly allDay: boolean;
  /** Grouped resource values of the target slot. */
  readonly values: Readonly<Record<string, unknown>>;
}

/**
 * The items a paste inserts. `keyField` (the string `keyExpr`, `'id'` by
 * default) is removed from each copy; resource fields of a grouped target
 * overwrite the copies' own.
 */
export function planSchedulerPaste<T>(
  entries: readonly SchedulerClipboardEntry<T>[],
  target: SchedulerPasteTarget,
  fields: ResolvedSchedulerFields<T>,
  keyField: string | null,
): T[] {
  if (entries.length === 0) return [];
  const anchor = entries[0];
  // wall-time shift (calendar days + minutes), so a paste across a DST
  // change keeps every copy's clock time
  const shiftDays = calendarDayDiff(anchor.startDate, target.date);
  const shiftMinutes = target.allDay
    ? 0
    : minutesOfDay(target.date) - minutesOfDay(anchor.startDate);
  const shift = (date: Date): Date =>
    addMinutes(addDays(date, shiftDays), shiftMinutes);
  return entries.map((entry) => {
    const item: Record<string, unknown> = {
      ...(entry.source as Record<string, unknown>),
    };
    if (keyField !== null) delete item[keyField];
    const start = shift(entry.startDate);
    const end = shift(entry.endDate);
    const names = fields.fieldNames;
    if (names.startDate !== null) {
      item[names.startDate] = serializeLikeOriginal(
        start,
        fields.startDate(entry.source),
      );
    }
    if (names.endDate !== null) {
      item[names.endDate] = serializeLikeOriginal(
        end,
        fields.endDate(entry.source),
      );
    }
    if (entry.occurrence) {
      if (names.recurrenceRule !== null) delete item[names.recurrenceRule];
      if (names.recurrenceException !== null) {
        delete item[names.recurrenceException];
      }
    }
    for (const [field, value] of Object.entries(target.values)) {
      item[field] = value;
    }
    return item as T;
  });
}
