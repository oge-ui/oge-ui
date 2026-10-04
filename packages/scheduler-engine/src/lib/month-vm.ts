/**
 * The month view's framework-free half: the lane budget, the packed week
 * rows, the "+N more" overflow entries, the chip keyboard order, the
 * pointer-drop cell and the labels.
 */
import { sameDay, startOfDay } from '@oge-ui/core';
import type { OgeSchedulerGridMessages } from './config';
import type { LaneLayout } from './lanes';
import { buildMonthWeekLanes } from './month-layout';
import type { SchedulerAppointment } from './scheduler-model';

/** One "+N more" button of a week row. */
export interface MonthOverflowEntry {
  readonly dayIndex: number;
  readonly count: number;
}

/** The month view's lane budget per cell; `'auto'` means 3. */
export function monthMaxLanes(raw: number | 'auto'): number {
  return raw === 'auto' ? 3 : Math.max(1, raw);
}

/** The packed lanes of every week row. */
export function buildMonthWeekLayouts<T>(
  appointments: readonly SchedulerAppointment<T>[],
  weeks: readonly (readonly Date[])[],
  maxLanes: number,
): readonly LaneLayout<T>[] {
  return weeks.map((week) => buildMonthWeekLanes(appointments, week, maxLanes));
}

/** Per-row overflow buttons, sorted by day. */
export function monthOverflowEntries<T>(
  weekLanes: readonly LaneLayout<T>[],
): readonly (readonly MonthOverflowEntry[])[] {
  return weekLanes.map((layout) =>
    [...layout.overflowByDay.entries()]
      .map(([dayIndex, count]) => ({ dayIndex, count }))
      .sort((a, b) => a.dayIndex - b.dayIndex),
  );
}

/** Chronological order of the visible chips for the keyboard cycle. */
export function monthChipOrder<T>(
  weekLanes: readonly LaneLayout<T>[],
): readonly SchedulerAppointment<T>[] {
  const seen = new Set<unknown>();
  const ordered: SchedulerAppointment<T>[] = [];
  for (const layout of weekLanes) {
    for (const item of layout.visible) {
      if (seen.has(item.appointment.key)) continue;
      seen.add(item.appointment.key);
      ordered.push(item.appointment);
    }
  }
  return ordered;
}

/**
 * The (week, day) cell under a pointer position inside the month area. In
 * `rtl` the first weekday is the rightmost column.
 */
export function monthDropCell(
  clientX: number,
  clientY: number,
  rect: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  },
  rtl = false,
): { week: number; day: number } {
  const week = Math.min(
    5,
    Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * 6)),
  );
  const day = Math.min(
    6,
    Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * 7)),
  );
  return { week, day: rtl ? 6 - day : day };
}

/** Index (0–41) of the day an appointment starts on, `-1` outside the grid. */
export function monthOriginIndex<T>(
  weeks: readonly (readonly Date[])[],
  appointment: SchedulerAppointment<T>,
): number {
  const days = weeks.flat();
  return days.findIndex((day) =>
    sameDay(day, startOfDay(appointment.startDate)),
  );
}

/**
 * The accessible name of a month-grid `role="columnheader"`: the long
 * weekday name (the visual header shows the short one).
 */
export function monthColumnHeaderText(
  day: Date,
  locale: string | undefined,
): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(day);
}

/** Whether a month cell is selected (`aria-selected`) — the roving current day. */
export function monthCellSelected(
  weekIndex: number,
  dayIndex: number,
  focused: { readonly week: number; readonly day: number },
): boolean {
  return focused.week === weekIndex && focused.day === dayIndex;
}

/** A month (or all-day) cell's accessible name. */
export function schedulerDayCellAriaLabel(
  messages: OgeSchedulerGridMessages,
  day: Date,
  locale: string | undefined,
): string {
  return messages.dayCellLabel.replace(
    '{date}',
    new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(day),
  );
}

/** The "+N more" label. */
export function schedulerMoreText(
  messages: OgeSchedulerGridMessages,
  count: number,
): string {
  return messages.moreLabel.replace('{count}', String(count));
}
