/**
 * The day/week time-grid view's framework-free half: resource-split
 * columns, the per-column overlap layout, the all-day strip lanes, the
 * keyboard chip order, gutter labels, preview/selection geometry, aria
 * labels and the pointer-gesture arithmetic. The Angular and React views
 * render from these results and nothing else.
 */
import { ogeDateTimeFormat, sameDay } from '@oge-ui/core';
import type { OgeSchedulerGridMessages } from './config';
import {
  proposeMove,
  proposeResize,
  type AppointmentProposal,
} from './gesture-math';
import { blockedIntervals, isOffWorkHours } from './availability';
import type {
  DayWeekColumn,
  DayWeekGroupLayout,
  SchedulerGroupLeaf,
} from './grouping';
import { dayWeekPlacement, leafWorkHours } from './grouping';
import { packLanes, type LaneLayout, type LanedItem } from './lanes';
import { layoutDayColumn, type LayoutedSegment } from './layout';
import type { SchedulerAppointment } from './scheduler-model';
import type {
  OgeSchedulerDisabledSlots,
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

export type { DayWeekColumn } from './grouping';

/** A layouted timed segment with its rendered column index. */
export type DayWeekSegment<T> = LayoutedSegment<T> & {
  colIndex: number;
  /** The stacked block (vertical grouping); absent = 0. */
  block?: number;
};

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
      values: {},
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

/**
 * Whether `day` falls on a weekend day (`0` = Sunday … `6` = Saturday).
 * Pass the scheduler's resolved `weekendDays` (`OgeSchedulerCore`
 * `resolvedWeekendDays`, locale-derived by default); omitted, it means
 * Saturday and Sunday.
 */
export function isWeekendDay(
  day: Date,
  weekendDays: readonly number[] = DEFAULT_WEEKEND,
): boolean {
  return weekendDays.includes(day.getDay());
}

const DEFAULT_WEEKEND: readonly number[] = [0, 6];

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
  const format = ogeDateTimeFormat(locale, {
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
  /** The rendered column index. */
  readonly dayIndex: number;
  readonly startMinutes: number;
  readonly endMinutes: number;
  /** The stacked block (vertical grouping); absent = 0. */
  readonly block?: number;
}

/** Geometry of the drag-to-create selection box. */
export function dayWeekSelectionBox(
  selection: DayWeekSelection,
  grid: TimeGridVm,
  colCount: number,
  blockCount = 1,
): SchedulerOverlayBox | null {
  const span = grid.windowEndMinutes - grid.windowStartMinutes;
  if (span <= 0) return null;
  const blocks = Math.max(1, blockCount);
  const block = selection.block ?? 0;
  return {
    top:
      ((block + (selection.startMinutes - grid.windowStartMinutes) / span) /
        blocks) *
      100,
    height:
      ((selection.endMinutes - selection.startMinutes) / span / blocks) * 100,
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
      ogeDateTimeFormat(locale, { dateStyle: 'full' }).format(date),
    )
    .replace(
      '{time}',
      ogeDateTimeFormat(locale, {
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
  const format = ogeDateTimeFormat(locale, {
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

/**
 * The accessible name of a time-grid `role="columnheader"`: the full date,
 * plus the resource when the columns are grouped. The visual header stays
 * `aria-hidden` (it sits outside the scrolling grid); these names ride in a
 * visually hidden first row inside the grid.
 */
export function dayWeekColumnHeaderText(
  column: DayWeekColumn,
  locale: string | undefined,
): string {
  const date = ogeDateTimeFormat(locale, { dateStyle: 'full' }).format(
    column.day,
  );
  return column.resourceText ? `${date}, ${column.resourceText}` : date;
}

/**
 * Whether a time-grid cell is selected (`aria-selected`): while a
 * drag-to-create range is live, the cells it covers in its column;
 * otherwise the roving current cell — selection follows focus.
 */
export function dayWeekCellSelected(
  colIndex: number,
  slotIndex: number,
  slotStartMinutes: number,
  focused: { readonly day: number; readonly slot: number },
  selection: DayWeekSelection | null,
  block = 0,
): boolean {
  if (selection !== null) {
    return (
      colIndex === selection.dayIndex &&
      block === (selection.block ?? 0) &&
      slotStartMinutes >= selection.startMinutes &&
      slotStartMinutes < selection.endMinutes
    );
  }
  return focused.day === colIndex && focused.slot === slotIndex;
}

/**
 * `aria-readonly` for the scheduler's grids: true when no cell can create,
 * change or remove an appointment (`readOnly`, or every `allow*` off).
 */
export function schedulerGridReadOnly(flags: {
  readonly canAdd: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly canDrag: boolean;
  readonly canResize: boolean;
}): boolean {
  return (
    !flags.canAdd &&
    !flags.canUpdate &&
    !flags.canDelete &&
    !flags.canDrag &&
    !flags.canResize
  );
}

/** Short weekday name for a column header. */
export function weekdayShortText(
  day: Date,
  locale: string | undefined,
): string {
  return ogeDateTimeFormat(locale, { weekday: 'short' }).format(day);
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
 * delta → time shift, both snapped. `rtl` inverts the horizontal delta
 * (columns run right-to-left).
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
  rtl = false,
): { proposal: AppointmentProposal; targetRes: number } {
  const span = grid.windowEndMinutes - grid.windowStartMinutes;
  const colWidth = rectWidth / colCount;
  const colDelta = Math.round((rtl ? -deltaX : deltaX) / colWidth);
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

/**
 * An all-day bar drag: day-only move, time of day and flag survive. `rtl`
 * inverts the horizontal delta.
 */
export function allDayDragProposal<T>(
  appointment: SchedulerAppointment<T>,
  deltaX: number,
  rectWidth: number,
  dayCount: number,
  snap: number,
  rtl = false,
): AppointmentProposal {
  const deltaDays = Math.round(
    (rtl ? -deltaX : deltaX) / (rectWidth / dayCount),
  );
  return proposeMove(appointment, deltaDays, 0, snap);
}

/* ---------- grouped layouts (multi-level, orientation, groupByDate) ---------- */

/**
 * Layouted timed segments placed by a {@link DayWeekGroupLayout}: each
 * (day, leaf) bucket runs the column layout once, and its segments carry
 * the rendered column and block. `leafOf` maps an item to its leaf
 * (`-1` / unmatched renders in leaf 0, as the single-level grid always did).
 */
export function layoutGroupedDayWeekSegments<T>(
  timed: readonly SchedulerAppointment<T>[],
  grid: TimeGridVm,
  layout: DayWeekGroupLayout,
  leafOf: (item: T) => number,
  minAppointmentMinutes: number,
): readonly DayWeekSegment<T>[] {
  const segments = segmentTimedAppointments(timed, grid);
  const buckets = new Map<string, AppointmentSegment<T>[]>();
  const placements = new Map<string, { col: number; block: number }>();
  for (const segment of segments) {
    const leaf =
      layout.leaves.length === 0
        ? 0
        : Math.max(0, leafOf(segment.appointment.source));
    const placement = dayWeekPlacement(layout, segment.dayIndex, leaf);
    const key = `${placement.col}:${placement.block}`;
    placements.set(key, placement);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(segment);
    else buckets.set(key, [segment]);
  }
  const result: DayWeekSegment<T>[] = [];
  for (const [key, bucket] of buckets) {
    const placement = placements.get(key) ?? { col: 0, block: 0 };
    for (const item of layoutDayColumn<T>(
      bucket,
      grid.windowStartMinutes,
      grid.windowEndMinutes,
      minAppointmentMinutes,
    )) {
      result.push({ ...item, colIndex: placement.col, block: placement.block });
    }
  }
  return result;
}

/** Chip `top` in percent of the rows area (stacked blocks included). */
export function chipTopPercent<T>(
  segment: DayWeekSegment<T>,
  blockCount: number,
): number {
  return (
    (((segment.block ?? 0) + segment.topFraction) / Math.max(1, blockCount)) *
    100
  );
}

/** Chip `height` in percent of the rows area. */
export function chipHeightPercent<T>(
  segment: DayWeekSegment<T>,
  blockCount: number,
): number {
  return (segment.heightFraction / Math.max(1, blockCount)) * 100;
}

/** Geometry of the live drag/resize preview box in a grouped layout. */
export function dayWeekLayoutPreviewBox(
  proposal: AppointmentProposal,
  leafIndex: number,
  grid: TimeGridVm,
  minAppointmentMinutes: number,
  layout: DayWeekGroupLayout,
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
  const { col, block } = dayWeekPlacement(layout, dayIndex, leafIndex);
  const blocks = Math.max(1, layout.blockCount);
  return {
    top:
      ((block + (startMinutes - grid.windowStartMinutes) / span) / blocks) *
      100,
    height: ((endMinutes - startMinutes) / span / blocks) * 100,
    left: (col / layout.colCount) * 100,
    width: (1 / layout.colCount) * 100,
  };
}

/**
 * A chip drag in a grouped layout: the horizontal delta picks the target
 * column (day × leaf when side by side), the vertical one the time — and,
 * with stacked blocks, the block under the moved chip's top edge, which
 * becomes the new leaf. `rtl` inverts the horizontal delta.
 */
export function dayWeekLayoutDragMove<T>(
  appointment: SchedulerAppointment<T>,
  deltaX: number,
  deltaY: number,
  rectWidth: number,
  rectHeight: number,
  grid: TimeGridVm,
  layout: DayWeekGroupLayout,
  originCol: number,
  originBlock: number,
  originStartMinutes: number,
  snap: number,
  rtl = false,
): { proposal: AppointmentProposal; leafIndex: number } {
  const span = grid.windowEndMinutes - grid.windowStartMinutes;
  const colWidth = rectWidth / layout.colCount;
  const colDelta = Math.round((rtl ? -deltaX : deltaX) / colWidth);
  const newCol = Math.min(
    layout.colCount - 1,
    Math.max(0, originCol + colDelta),
  );
  const originDay = layout.columns[originCol]?.dayIndex ?? 0;
  const targetDay = layout.columns[newCol]?.dayIndex ?? originDay;
  const blocks = Math.max(1, layout.blockCount);
  const blockHeight = rectHeight / blocks;
  let deltaMinutes: number;
  let block = originBlock;
  if (blocks === 1) {
    deltaMinutes = (deltaY / blockHeight) * span;
  } else {
    const originTop =
      originBlock * blockHeight +
      ((originStartMinutes - grid.windowStartMinutes) / span) * blockHeight;
    const newTop = originTop + deltaY;
    block = Math.min(blocks - 1, Math.max(0, Math.floor(newTop / blockHeight)));
    const minutes =
      grid.windowStartMinutes +
      ((newTop - block * blockHeight) / blockHeight) * span;
    deltaMinutes = minutes - originStartMinutes;
  }
  const leafIndex = layout.vertical
    ? block
    : (layout.columns[newCol]?.resIndex ?? 0);
  return {
    proposal: proposeMove(
      appointment,
      originDayIndex(grid, appointment) === -1 ? 0 : targetDay - originDay,
      deltaMinutes,
      snap,
    ),
    leafIndex,
  };
}

/** One all-day bar placed on the strip's columns (1-based grid lines). */
export interface AllDayPlacedBar<T> extends LanedItem<T> {
  readonly colStart: number;
  readonly colEnd: number;
}

/** One clickable all-day strip cell. */
export interface AllDayStripCell {
  readonly key: string;
  readonly day: Date;
  /** The leaf the cell creates for (`-1` ungrouped / per-day strip). */
  readonly leafIndex: number;
  readonly values: Readonly<Record<string, unknown>>;
}

/**
 * The all-day strip of a grouped layout. Resource-major columns pack each
 * leaf's bars into its own block of day columns (so a bar sits above its
 * resource); date-major and stacked layouts keep one strip column per day,
 * as the single-level grid always did.
 */
export function buildLayoutAllDayStrip<T>(
  allDay: readonly SchedulerAppointment<T>[],
  grid: TimeGridVm,
  layout: DayWeekGroupLayout,
  leafOf: (item: T) => number,
): {
  readonly bars: readonly AllDayPlacedBar<T>[];
  readonly laneCount: number;
  readonly columnCount: number;
  readonly cells: readonly AllDayStripCell[];
} {
  const perLeaf =
    layout.leaves.length > 0 && !layout.vertical && !layout.groupByDate;
  if (!perLeaf) {
    const lanes = buildAllDayLayout(allDay, grid);
    return {
      bars: lanes.visible.map((bar) => ({
        ...bar,
        colStart: bar.startDayIndex + 1,
        colEnd: bar.endDayIndex + 2,
      })),
      laneCount: lanes.laneCount,
      columnCount: grid.days.length,
      cells: grid.days.map((day, index) => ({
        key: `d${index}`,
        day,
        leafIndex: -1,
        values: {},
      })),
    };
  }
  const bars: AllDayPlacedBar<T>[] = [];
  let laneCount = 0;
  layout.leaves.forEach((_leaf, leafIndex) => {
    const lanes = buildAllDayLayout(
      allDay.filter(
        (appointment) => Math.max(0, leafOf(appointment.source)) === leafIndex,
      ),
      grid,
    );
    laneCount = Math.max(laneCount, lanes.laneCount);
    const offset = leafIndex * layout.dayCount;
    for (const bar of lanes.visible) {
      bars.push({
        ...bar,
        colStart: offset + bar.startDayIndex + 1,
        colEnd: offset + bar.endDayIndex + 2,
      });
    }
  });
  return {
    bars,
    laneCount,
    columnCount: layout.colCount,
    cells: layout.columns.map((column) => ({
      key: `c${column.colIndex}`,
      day: column.day,
      leafIndex: column.resIndex,
      values: column.values,
    })),
  };
}

/** One rendered grid row of a (possibly block-stacked) time grid. */
export interface DayWeekGridRow {
  /** Global row index (the roving-focus row). */
  readonly index: number;
  readonly block: number;
  readonly slot: number;
  readonly minutes: number;
}

/** Every grid row: `blockCount` blocks of the grid's slot rows. */
export function dayWeekGridRows(
  grid: TimeGridVm,
  blockCount: number,
): readonly DayWeekGridRow[] {
  const slots = grid.slotStartMinutes;
  const rows: DayWeekGridRow[] = [];
  for (let block = 0; block < Math.max(1, blockCount); block++) {
    slots.forEach((minutes, slot) =>
      rows.push({ index: block * slots.length + slot, block, slot, minutes }),
    );
  }
  return rows;
}

/** The grouped values of a cell (vertical: its block's leaf; else its column's). */
export function dayWeekLayoutCellValues(
  layout: DayWeekGroupLayout,
  colIndex: number,
  block: number,
): Readonly<Record<string, unknown>> {
  if (layout.leaves.length === 0) return {};
  return layout.vertical
    ? (layout.leaves[block]?.values ?? {})
    : (layout.columns[colIndex]?.values ?? {});
}

/** The leaf a cell renders (`null` ungrouped). */
export function dayWeekLayoutCellLeaf(
  layout: DayWeekGroupLayout,
  colIndex: number,
  block: number,
): SchedulerGroupLeaf | null {
  if (layout.leaves.length === 0) return null;
  return (
    (layout.vertical
      ? layout.leaves[block]
      : layout.leaves[layout.columns[colIndex]?.resIndex ?? 0]) ?? null
  );
}

/** The key of a cell in {@link dayWeekBlockedCells}' set. */
export function dayWeekCellKey(
  block: number,
  slot: number,
  col: number,
): string {
  return `${block}:${slot}:${col}`;
}

/**
 * Every blocked cell of the grid (`disabledSlots`), keyed by
 * {@link dayWeekCellKey}: a cell is blocked when anything inside its slot
 * is. Computed once per render of the grid, not per cell binding.
 */
export function dayWeekBlockedCells(
  grid: TimeGridVm,
  layout: DayWeekGroupLayout,
  disabled: OgeSchedulerDisabledSlots | null | undefined,
): ReadonlySet<string> {
  const blocked = new Set<string>();
  if (disabled === null || disabled === undefined) return blocked;
  for (let block = 0; block < layout.blockCount; block++) {
    for (const column of layout.columns) {
      const values = dayWeekLayoutCellValues(layout, column.colIndex, block);
      const dayStart = cellDateAt(column.day, grid.windowStartMinutes);
      const dayEnd = cellDateAt(column.day, grid.windowEndMinutes);
      const intervals = blockedIntervals(
        disabled,
        dayStart,
        dayEnd,
        values,
        grid.cellDuration,
      );
      if (intervals.length === 0) continue;
      grid.slotStartMinutes.forEach((minutes, slot) => {
        const start = cellDateAt(column.day, minutes);
        const end = cellDateAt(column.day, minutes + grid.cellDuration);
        if (
          intervals.some(
            (interval) =>
              interval.startDate.getTime() < end.getTime() &&
              interval.endDate.getTime() > start.getTime(),
          )
        ) {
          blocked.add(dayWeekCellKey(block, slot, column.colIndex));
        }
      });
    }
  }
  return blocked;
}

/**
 * Whether a cell is off its working hours: the cell's leaf's own hours
 * (per-resource `workHours` / `workDays`) or the scheduler-wide ones.
 */
export function dayWeekCellOffHours(
  layout: DayWeekGroupLayout,
  colIndex: number,
  block: number,
  day: Date,
  minutes: number,
  global: OgeSchedulerWorkHours | null,
): boolean {
  return isOffWorkHours(
    leafWorkHours(dayWeekLayoutCellLeaf(layout, colIndex, block), global),
    day,
    minutes,
  );
}

/** One now-line (and its optional past shade) box, in percent of the rows area. */
export interface DayWeekNowBox {
  readonly key: string;
  readonly top: number;
  readonly left: number;
  readonly width: number;
  /** Top of the block the line sits in (the shade runs from here to `top`). */
  readonly blockTop: number;
}

/** The now-lines of every column showing today, in every block. */
export function dayWeekNowBoxes(
  grid: TimeGridVm,
  layout: DayWeekGroupLayout,
  now: Date,
  show: boolean,
): readonly DayWeekNowBox[] {
  if (!show) return [];
  const boxes: DayWeekNowBox[] = [];
  const blocks = Math.max(1, layout.blockCount);
  for (const column of layout.columns) {
    const fraction = nowLineFraction(grid, column.dayIndex, now, true);
    if (fraction === null) continue;
    for (let block = 0; block < blocks; block++) {
      boxes.push({
        key: `${block}:${column.colIndex}`,
        top: ((block + fraction) / blocks) * 100,
        blockTop: (block / blocks) * 100,
        left: (column.colIndex / layout.colCount) * 100,
        width: (1 / layout.colCount) * 100,
      });
    }
  }
  return boxes;
}

/**
 * The time-grid cell under a viewport point (external drops, drag-in
 * previews): its column, block, slot start and grouped values, or `null`
 * outside the rows rect. `rtl` mirrors the column axis.
 */
export function dayWeekSlotAt(
  clientX: number,
  clientY: number,
  rect: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  },
  grid: TimeGridVm,
  layout: DayWeekGroupLayout,
  rtl = false,
): {
  readonly col: number;
  readonly block: number;
  readonly slot: number;
  readonly date: Date;
  readonly values: Readonly<Record<string, unknown>>;
} | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
  const rawCol = Math.floor((x / rect.width) * layout.colCount);
  const col = Math.min(
    layout.colCount - 1,
    Math.max(0, rtl ? layout.colCount - 1 - rawCol : rawCol),
  );
  const slots = grid.slotStartMinutes.length;
  const rowIndex = Math.min(
    slots * layout.blockCount - 1,
    Math.floor((y / rect.height) * slots * layout.blockCount),
  );
  const block = Math.floor(rowIndex / slots);
  const slot = rowIndex % slots;
  const column = layout.columns[col];
  if (column === undefined) return null;
  return {
    col,
    block,
    slot,
    date: cellDateAt(column.day, grid.slotStartMinutes[slot]),
    values: dayWeekLayoutCellValues(layout, col, block),
  };
}

/** A cell label with the "unavailable" suffix when the slot is blocked. */
export function withUnavailableLabel(
  label: string,
  blocked: boolean,
  messages: { readonly unavailableLabel?: string },
): string {
  return blocked && messages.unavailableLabel
    ? `${label}, ${messages.unavailableLabel}`
    : label;
}

/** A chip label with the "selected" suffix when the appointment is selected. */
export function withSelectedLabel(
  label: string,
  selected: boolean,
  messages: { readonly selectedLabel?: string },
): string {
  return selected && messages.selectedLabel
    ? `${label}, ${messages.selectedLabel}`
    : label;
}
