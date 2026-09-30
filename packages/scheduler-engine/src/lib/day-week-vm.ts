/**
 * The day/week time-grid view's framework-free half: resource-split
 * columns, the per-column overlap layout, the all-day strip lanes, the
 * keyboard chip order, gutter labels, preview/selection geometry, aria
 * labels and the pointer-gesture arithmetic. The Angular and React views
 * render from these results and nothing else.
 */
import { sameDay } from '@oge-ui/core';
import type { OgeSchedulerGridMessages } from './config';
import {
  proposeMove,
  proposeResize,
  type AppointmentProposal,
} from './gesture-math';
import { packLanes, type LaneLayout, type LanedItem } from './lanes';
import { layoutDayColumn, type LayoutedSegment } from './layout';
import type { SchedulerAppointment } from './scheduler-model';
import type {
  OgeSchedulerResource,
  OgeSchedulerResourceItem,
  OgeSchedulerWorkHours,
} from './scheduler-types';
import { durationMinutes, minutesOfDay } from './time-math';
import {
  segmentTimedAppointments,
  type AppointmentSegment,
  type TimeGridVm,
} from './view-model';

/** One rendered time-grid column: a day, split per grouping resource. */
export interface DayWeekColumn {
  readonly day: Date;
  readonly dayIndex: number;
  readonly resIndex: number;
  readonly colIndex: number;
  readonly resourceId: unknown;
  readonly resourceText: string;
}

/** A layouted timed segment with its rendered column index. */
export type DayWeekSegment<T> = LayoutedSegment<T> & { colIndex: number };

/** One rendered all-day bar with its grid placement. */
export type AllDayBar<T> = LanedItem<T>;

/** An absolutely positioned overlay box, in percent of the rows area. */
export interface SchedulerOverlayBox {
  readonly top: number;
  readonly height: number;
  readonly left: number;
  readonly width: number;
}

/** A gutter label (one per full hour). */
export interface SchedulerGutterSlot {
  readonly minutes: number;
  readonly text: string;
}

/** Escapes a value for use inside a double-quoted attribute selector. */
export function escapeAttr(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Resource items splitting each day column; `null` = ungrouped. */
export function dayWeekGroupItems(
  resource: OgeSchedulerResource | null,
): readonly OgeSchedulerResourceItem[] | null {
  return resource !== null && resource.items.length > 0 ? resource.items : null;
}

/** All rendered columns as (day, resource) pairs. */
export function buildDayWeekColumns(
  days: readonly Date[],
  groupItems: readonly OgeSchedulerResourceItem[] | null,
): readonly DayWeekColumn[] {
  const resCount = groupItems?.length ?? 1;
  return days.flatMap((day, dayIndex) =>
    Array.from({ length: resCount }, (_, resIndex) => ({
      day,
      dayIndex,
      resIndex,
      colIndex: dayIndex * resCount + resIndex,
      resourceId: groupItems?.[resIndex]?.id,
      resourceText: groupItems?.[resIndex]?.text ?? '',
    })),
  );
}

/** The resource subcolumn an appointment renders in (0 when unmatched). */
export function resourceIndexOf<T>(
  appointment: SchedulerAppointment<T>,
  groupItems: readonly OgeSchedulerResourceItem[] | null,
  idOf: (item: T) => unknown,
): number {
  if (groupItems === null) return 0;
  const id = idOf(appointment.source);
  const index = groupItems.findIndex((item) => item.id === id);
  return index === -1 ? 0 : index;
}

/** Whether a cell sits outside the emphasized working hours. */
export function isOffHoursCell(
  workHours: OgeSchedulerWorkHours | null,
  day: Date,
  minutes: number,
): boolean {
  if (workHours === null) return false;
  if (workHours.days !== undefined && !workHours.days.includes(day.getDay())) {
    return true;
  }
  return minutes < workHours.start * 60 || minutes >= workHours.end * 60;
}

/** Saturday or Sunday. */
export function isWeekendDay(day: Date): boolean {
  return day.getDay() === 0 || day.getDay() === 6;
}

/**
 * Layouted timed segments annotated with their rendered column index.
 * Single pass: segments bucket by (day, resource) via a precomputed
 * id->index map, then each bucket runs the O(n log n) column layout — no
 * per-segment searches, so large grouped weeks stay cheap.
 */
export function layoutDayWeekSegments<T>(
  timed: readonly SchedulerAppointment<T>[],
  grid: TimeGridVm,
  groupItems: readonly OgeSchedulerResourceItem[] | null,
  idOf: (item: T) => unknown,
  minAppointmentMinutes: number,
): readonly DayWeekSegment<T>[] {
  const resCount = groupItems?.length ?? 1;
  const resIndexById = new Map<unknown, number>();
  groupItems?.forEach((item, index) => resIndexById.set(item.id, index));
  const segments = segmentTimedAppointments(timed, grid);
  const buckets = new Map<number, AppointmentSegment<T>[]>();
  for (const segment of segments) {
    const resIndex =
      groupItems === null
        ? 0
        : (resIndexById.get(idOf(segment.appointment.source)) ?? 0);
    const colIndex = segment.dayIndex * resCount + resIndex;
    const bucket = buckets.get(colIndex);
    if (bucket) bucket.push(segment);
    else buckets.set(colIndex, [segment]);
  }
  const result: DayWeekSegment<T>[] = [];
  for (const [colIndex, bucket] of buckets) {
    const layoutedBucket: LayoutedSegment<T>[] = layoutDayColumn<T>(
      bucket,
      grid.windowStartMinutes,
      grid.windowEndMinutes,
      minAppointmentMinutes,
    );
    for (const item of layoutedBucket) {
      result.push({ ...item, colIndex });
    }
  }
  return result;
}

/** Packs the all-day appointments of the visible days into strip lanes. */
export function buildAllDayLayout<T>(
  allDay: readonly SchedulerAppointment<T>[],
  grid: TimeGridVm,
): LaneLayout<T> {
  const dayCount = grid.days.length;
  const inputs = allDay.map((appointment) => {
    const startsBefore =
      appointment.startDate.getTime() < grid.rangeStart.getTime();
    const endsAfter = appointment.endDate.getTime() > grid.rangeEnd.getTime();
    const startDayIndex = startsBefore
      ? 0
      : grid.days.findIndex((day) => sameDay(day, appointment.startDate));
    const lastMoment = new Date(appointment.endDate.getTime() - 1);
    let endDayIndex = endsAfter
      ? dayCount - 1
      : grid.days.findIndex((day) => sameDay(day, lastMoment));
    if (endDayIndex === -1) endDayIndex = startDayIndex;
    return {
      appointment,
      startDayIndex: Math.max(0, startDayIndex),
      endDayIndex: Math.max(0, endDayIndex),
      clippedStart: startsBefore,
      clippedEnd: endsAfter,
    };
  });
  return packLanes(inputs, null);
}

/** Chronological chip order for the keyboard cycle (all-day, then timed). */
export function dayWeekChipOrder<T>(
  allDayBars: readonly AllDayBar<T>[],
  layouted: readonly DayWeekSegment<T>[],
): readonly SchedulerAppointment<T>[] {
  const seen = new Set<unknown>();
  const ordered: SchedulerAppointment<T>[] = [];
  const push = (appointment: SchedulerAppointment<T>): void => {
    if (seen.has(appointment.key)) return;
    seen.add(appointment.key);
    ordered.push(appointment);
  };
  allDayBars.forEach((bar) => push(bar.appointment));
  [...layouted]
    .sort(
      (a, b) =>
        a.appointment.startDate.getTime() - b.appointment.startDate.getTime(),
    )
    .forEach((segment) => push(segment.appointment));
  return ordered;
}

/**
 * The chip roving tab index: the focused chip (or the first one) is the
 * single tab stop of the chip layer.
 */
export function chipTabIndexOf<T>(
  order: readonly SchedulerAppointment<T>[],
  focusedKey: unknown,
  appointment: SchedulerAppointment<T>,
): number {
  if (order.length === 0) return -1;
  const active = order.find((entry) => entry.key === focusedKey) ?? order[0];
  return appointment.key === active.key ? 0 : -1;
}

/** Full-hour gutter labels of the time grid. */
export function buildGutterSlots(
  grid: TimeGridVm,
  locale: string | undefined,
): readonly SchedulerGutterSlot[] {
  const format = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: grid.cellDuration % 60 === 0 ? undefined : '2-digit',
  });
  return grid.slotStartMinutes
    .filter((minutes) => minutes % 60 === 0)
    .map((minutes) => ({
      minutes,
      text: format.format(
        new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60),
      ),
    }));
}

/** Geometry of the live drag/resize preview box. */
export function dayWeekPreviewBox(
  proposal: AppointmentProposal,
  resIndex: number | undefined,
  grid: TimeGridVm,
  minAppointmentMinutes: number,
  colCount: number,
  resCount: number,
): SchedulerOverlayBox | null {
  const dayIndex = grid.days.findIndex((day) =>
    sameDay(day, proposal.startDate),
  );
  if (dayIndex === -1) return null;
  const span = grid.windowEndMinutes - grid.windowStartMinutes;
  if (span <= 0) return null;
  const startMinutes = Math.max(
    minutesOfDay(proposal.startDate),
    grid.windowStartMinutes,
  );
  const length = Math.max(
    durationMinutes(proposal.startDate, proposal.endDate),
    minAppointmentMinutes,
  );
  const endMinutes = Math.min(startMinutes + length, grid.windowEndMinutes);
  const colIndex = dayIndex * resCount + (resIndex ?? 0);
  return {
    top: ((startMinutes - grid.windowStartMinutes) / span) * 100,
    height: ((endMinutes - startMinutes) / span) * 100,
    left: (colIndex / colCount) * 100,
    width: (1 / colCount) * 100,
  };
}

/** A live drag-to-create selection in one column. */
export interface DayWeekSelection {
  readonly dayIndex: number;
  readonly startMinutes: number;
  readonly endMinutes: number;
}

/** Geometry of the drag-to-create selection box. */
export function dayWeekSelectionBox(
  selection: DayWeekSelection,
  grid: TimeGridVm,
  colCount: number,
): SchedulerOverlayBox | null {
  const span = grid.windowEndMinutes - grid.windowStartMinutes;
  if (span <= 0) return null;
  return {
    top: ((selection.startMinutes - grid.windowStartMinutes) / span) * 100,
    height: ((selection.endMinutes - selection.startMinutes) / span) * 100,
    left: (selection.dayIndex / colCount) * 100,
    width: (1 / colCount) * 100,
  };
}

/** A local date at `minutes` past midnight of `day`. */
export function cellDateAt(day: Date, minutes: number): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
  );
}

/** The start date/time of the cell at (`colIndex`, `minutes`). */
export function dayWeekCellDate(
  columns: readonly DayWeekColumn[],
  days: readonly Date[],
  resCount: number,
  colIndex: number,
  minutes: number,
): Date {
  const day = columns[colIndex]?.day ?? days[Math.floor(colIndex / resCount)];
  return cellDateAt(day, minutes);
}

/** The now-line position in a day column (fraction), or `null` when hidden. */
export function nowLineFraction(
  grid: TimeGridVm,
  dayIndex: number,
  now: Date,
  show: boolean,
): number | null {
  if (!show) return null;
  if (!sameDay(grid.days[dayIndex], now)) return null;
  const minutes = minutesOfDay(now);
  if (minutes < grid.windowStartMinutes || minutes > grid.windowEndMinutes) {
    return null;
  }
  const span = grid.windowEndMinutes - grid.windowStartMinutes;
  return span <= 0 ? null : (minutes - grid.windowStartMinutes) / span;
}

/** The grid's accessible name: period label plus the keyboard hint. */
export function schedulerGridAriaLabel(
  messages: OgeSchedulerGridMessages,
  periodLabel: string,
): string {
  const label = messages.gridLabel.replace('{period}', periodLabel);
  return `${label}. ${messages.gridHint}`;
}

/** A time-grid cell's accessible name (resource appended when grouped). */
export function schedulerCellAriaLabel(
  messages: OgeSchedulerGridMessages,
  date: Date,
  locale: string | undefined,
  resourceText?: string,
): string {
  const label = messages.cellLabel
    .replace(
      '{date}',
      new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date),
    )
    .replace(
      '{time}',
      new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date),
    );
  return resourceText ? `${label}, ${resourceText}` : label;
}

/** An appointment chip's accessible name. */
export function schedulerChipAriaLabel<T>(
  messages: OgeSchedulerGridMessages,
  appointment: SchedulerAppointment<T>,
  locale: string | undefined,
): string {
  const format = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return messages.appointmentLabel
    .replace('{text}', appointment.text)
    .replace('{start}', format.format(appointment.startDate))
    .replace('{end}', format.format(appointment.endDate));
}

/** Chip `left` in percent of the rows area. */
export function chipLeftPercent<T>(
  segment: DayWeekSegment<T>,
  colCount: number,
): number {
  return ((segment.colIndex + segment.leftFraction) / colCount) * 100;
}

/** Chip `width` in percent of the rows area. */
export function chipWidthPercent<T>(
  segment: LayoutedSegment<T>,
  colCount: number,
): number {
  return (segment.widthFraction / colCount) * 100;
}

/** Stable identity of one rendered segment (an appointment × day). */
export function segmentKey<T>(segment: LayoutedSegment<T>): string {
  return `${String(segment.appointment.key)}:${segment.dayIndex}`;
}

/** Short weekday name for a column header. */
export function weekdayShortText(
  day: Date,
  locale: string | undefined,
): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day);
}

/* ---------- pointer-gesture arithmetic ---------- */

/**
 * The drag-to-create range for the pointer at `clientY`, snapped and
 * anchored at the pressed slot (always at least one snap long).
 */
export function dragSelectionRange(
  clientY: number,
  rectTop: number,
  rectHeight: number,
  grid: TimeGridVm,
  anchorMinutes: number,
  snap: number,
): { startMinutes: number; endMinutes: number } {
  const span = grid.windowEndMinutes - grid.windowStartMinutes;
  const rawMinutes =
    grid.windowStartMinutes + ((clientY - rectTop) / rectHeight) * span;
  const snapped = Math.min(
    grid.windowEndMinutes,
    Math.max(grid.windowStartMinutes, Math.round(rawMinutes / snap) * snap),
  );
  return snapped >= anchorMinutes
    ? {
        startMinutes: anchorMinutes,
        endMinutes: Math.max(snapped, anchorMinutes + snap),
      }
    : { startMinutes: snapped, endMinutes: anchorMinutes + snap };
}

/** The day index an appointment's start renders in (`-1` outside). */
export function originDayIndex<T>(
  grid: TimeGridVm,
  appointment: SchedulerAppointment<T>,
): number {
  return grid.days.findIndex((day) => sameDay(day, appointment.startDate));
}

/**
 * A chip drag: horizontal delta → target column (day × resource), vertical
 * delta → time shift, both snapped.
 */
export function dayWeekDragMove<T>(
  appointment: SchedulerAppointment<T>,
  deltaX: number,
  deltaY: number,
  rectWidth: number,
  rectHeight: number,
  grid: TimeGridVm,
  colCount: number,
  resCount: number,
  originDay: number,
  originRes: number,
  snap: number,
): { proposal: AppointmentProposal; targetRes: number } {
  const span = grid.windowEndMinutes - grid.windowStartMinutes;
  const colWidth = rectWidth / colCount;
  const colDelta = Math.round(deltaX / colWidth);
  const originCol = Math.max(0, originDay) * resCount + originRes;
  const newCol = Math.min(colCount - 1, Math.max(0, originCol + colDelta));
  const deltaDays = Math.floor(newCol / resCount) - Math.max(0, originDay);
  const targetRes = newCol % resCount;
  const deltaMinutes = (deltaY / rectHeight) * span;
  return {
    proposal: proposeMove(
      appointment,
      originDay === -1 ? 0 : deltaDays,
      deltaMinutes,
      snap,
    ),
    targetRes,
  };
}

/** A chip edge resize from a vertical pointer delta. */
export function dayWeekResizeProposal<T>(
  appointment: SchedulerAppointment<T>,
  edge: 'start' | 'end',
  deltaY: number,
  rectHeight: number,
  grid: TimeGridVm,
  snap: number,
): AppointmentProposal {
  const span = grid.windowEndMinutes - grid.windowStartMinutes;
  return proposeResize(appointment, edge, (deltaY / rectHeight) * span, snap);
}

/** An all-day bar drag: day-only move, time of day and flag survive. */
export function allDayDragProposal<T>(
  appointment: SchedulerAppointment<T>,
  deltaX: number,
  rectWidth: number,
  dayCount: number,
  snap: number,
): AppointmentProposal {
  const deltaDays = Math.round(deltaX / (rectWidth / dayCount));
  return proposeMove(appointment, deltaDays, 0, snap);
}
