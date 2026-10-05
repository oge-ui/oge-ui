/**
 * The month view's framework-free half: the lane budget, the packed week
 * rows, the "+N more" overflow entries, the chip keyboard order, the
 * pointer-drop cell and the labels.
 */
import {
  ogeDateTimeFormat,
  ogeFormatMessage,
  sameDay,
  startOfDay,
} from '@oge-ui/core';
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
  weekCount = 6,
): { week: number; day: number } {
  const rows = Math.max(1, weekCount);
  const week = Math.min(
    rows - 1,
    Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * rows)),
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
  return ogeDateTimeFormat(locale, { weekday: 'long' }).format(day);
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
    ogeDateTimeFormat(locale, { dateStyle: 'full' }).format(day),
  );
}

/** The "+N more" label. */
export function schedulerMoreText(
  messages: OgeSchedulerGridMessages,
  count: number,
): string {
  return messages.moreLabel.replace('{count}', String(count));
}

/**
 * The "+N more" button's accessible name — "2 more appointments on Monday,
 * August 3, 2026" (an ICU plural through `ogeFormatMessage`).
 */
export function schedulerMoreAriaLabel(
  messages: OgeSchedulerGridMessages,
  count: number,
  day: Date,
  locale: string | undefined,
): string {
  const template =
    messages.moreAppointmentsLabel ??
    '{count, plural, one {# more appointment} other {# more appointments}} on {date}';
  return ogeFormatMessage(
    template,
    {
      count,
      date: ogeDateTimeFormat(locale, { dateStyle: 'full' }).format(day),
    },
    locale,
  );
}

/** The "+N more" popup's accessible name and heading text. */
export function schedulerMorePopupTitle(
  messages: OgeSchedulerGridMessages,
  day: Date,
  locale: string | undefined,
): { readonly label: string; readonly heading: string } {
  const full = ogeDateTimeFormat(locale, { dateStyle: 'full' }).format(day);
  return {
    label: (messages.morePopupLabel ?? 'Appointments on {date}').replace(
      '{date}',
      full,
    ),
    heading: ogeDateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(day),
  };
}

/**
 * Every appointment touching `day`, all-day ones first, then by start —
 * the "+N more" popup's list (the whole day, not only the hidden ones, so
 * the list reads in order).
 */
export function appointmentsOnDay<T>(
  appointments: readonly SchedulerAppointment<T>[],
  day: Date,
): SchedulerAppointment<T>[] {
  const start = startOfDay(day);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  return appointments
    .filter((appointment) =>
      appointment.startDate.getTime() === appointment.endDate.getTime()
        ? appointment.startDate.getTime() >= start.getTime() &&
          appointment.startDate.getTime() < end.getTime()
        : appointment.startDate.getTime() < end.getTime() &&
          appointment.endDate.getTime() > start.getTime(),
    )
    .sort(
      (a, b) =>
        Number(b.displayAllDay) - Number(a.displayAllDay) ||
        a.startDate.getTime() - b.startDate.getTime(),
    );
}

/**
 * The "+N more" popup's arrow keys: Up/Down move between the list's items
 * (clamped), Home/End jump to the ends. `null` = not a list key.
 */
export function morePopupKey(
  key: string,
  index: number,
  count: number,
): number | null {
  if (count === 0) return null;
  switch (key) {
    case 'ArrowDown':
      return Math.min(count - 1, index + 1);
    case 'ArrowUp':
      return Math.max(0, index - 1);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
