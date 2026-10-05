/**
 * The timeline views' framework-free half: a horizontal time axis (day,
 * week, work week at hour scale; month and year at day scale) with one row
 * per grouped leaf — nested levels add group header rows — or a single row
 * without grouping. Bars stack into lanes via the overlap-layout kernel
 * (transposed: the column index becomes the vertical lane). Horizontal
 * grouping lays the leaves out as blocks of one track instead. Rows report
 * fixed heights, so a long resource list virtualizes on core's
 * `OffsetTree` / `computeWindow`.
 */
import {
  OffsetTree,
  addDays,
  computeWindow,
  ogeDateTimeFormat,
  sameDay,
  startOfDay,
  startOfMonth,
} from '@oge-ui/core';
import { blockedIntervals } from './availability';
import { proposeMove, type AppointmentProposal } from './gesture-math';
import type { SchedulerGroupLeaf } from './grouping';
import { groupLeafMatcher } from './grouping';
import { layoutDayColumn } from './layout';
import type { SchedulerAppointment } from './scheduler-model';
import type { SchedulerProposalEvent } from './view-events';
import type {
  OgeSchedulerDisabledSlots,
  OgeSchedulerResource,
  OgeSchedulerResourceItem,
  OgeSchedulerWorkHours,
} from './scheduler-types';
import {
  buildTimeGrid,
  normalizeIntervalCount,
  partitionAllDay,
  resolveHiddenWeekDays,
  segmentTimedAppointments,
  type SchedulerTimelineViewType,
  type TimeGridVm,
} from './view-model';

/** A committed timeline move: time proposal + optional new resource id. */
export type TimelineMoveEvent<T> = SchedulerProposalEvent<T>;

/** The axis unit: hour-scale timelines clip to the hour window; day-scale ones snap to days. */
export type TimelineScale = 'hour' | 'day';

/** The time grid behind a timeline view, with its axis scale. */
export interface TimelineGridVm extends TimeGridVm {
  readonly scale: TimelineScale;
}

/** One positioned timeline bar. */
export interface TimelineBar<T> {
  /** Stable identity of the piece (an appointment may split per day). */
  readonly key: string;
  readonly appointment: SchedulerAppointment<T>;
  readonly leftPct: number;
  readonly widthPct: number;
  readonly lane: number;
  readonly clippedStart: boolean;
  readonly clippedEnd: boolean;
}

/** One timeline row: a resource leaf, a group header, or the single row. */
export interface TimelineRow<T> {
  /**
   * The row's resource id (single level), the leaf (nested levels) or
   * `null` (the unassigned / ungrouped row and group header rows).
   */
  readonly id: unknown;
  readonly text: string;
  readonly color: string | undefined;
  readonly bars: readonly TimelineBar<T>[];
  readonly laneCount: number;
  /** `'group'` rows head a nested level and hold no bars. */
  readonly kind?: 'resource' | 'group';
  /** Nesting depth (0 = outermost level). */
  readonly level?: number;
  /** The row's grouped values (a create / drop prefills them). */
  readonly values?: Readonly<Record<string, unknown>>;
  /** The resource item heading the row (header templates). */
  readonly item?: OgeSchedulerResourceItem;
  readonly resource?: OgeSchedulerResource;
  /** The leaf behind a resource row. */
  readonly leaf?: SchedulerGroupLeaf;
}

/** One hour label of the timeline sub-header. */
export interface TimelineHourLabel {
  readonly pct: number;
  readonly text: string;
}

/** One cell of the timeline's top header (a day, or a month on the year scale). */
export interface TimelineHeaderCell {
  readonly key: string;
  readonly text: string;
  readonly pct: number;
  readonly widthPct: number;
  readonly date: Date;
  readonly today: boolean;
}

/** The timeline view a type is laid out like. */
export function timelineScaleOf(view: SchedulerTimelineViewType): TimelineScale {
  return view === 'timelineMonth' || view === 'timelineYear' ? 'day' : 'hour';
}

/** Options of {@link buildTimelineGrid}. */
export interface TimelineGridOptions {
  readonly intervalCount?: number;
  readonly hiddenWeekDays?: readonly number[];
  readonly weekendDays?: readonly number[];
}

/** The time grid behind a timeline view. */
export function buildTimelineGrid(
  view: SchedulerTimelineViewType,
  anchorDate: Date,
  firstDayOfWeek: number,
  dayStartHour: number,
  dayEndHour: number,
  cellDuration: number,
  options: TimelineGridOptions = {},
): TimelineGridVm {
  const intervals = normalizeIntervalCount(options.intervalCount);
  if (view === 'timelineMonth' || view === 'timelineYear') {
    const first =
      view === 'timelineMonth'
        ? startOfMonth(anchorDate)
        : new Date(anchorDate.getFullYear(), 0, 1);
    const end =
      view === 'timelineMonth'
        ? new Date(first.getFullYear(), first.getMonth() + intervals, 1)
        : new Date(first.getFullYear() + intervals, 0, 1);
    const hidden = new Set(
      resolveHiddenWeekDays(view, options.hiddenWeekDays, options.weekendDays),
    );
    const days: Date[] = [];
    for (let day = first; day.getTime() < end.getTime(); day = addDays(day, 1)) {
      if (!hidden.has(day.getDay())) days.push(day);
    }
    return {
      days,
      slotStartMinutes: [0],
      windowStartMinutes: 0,
      windowEndMinutes: 1440,
      cellDuration: 1440,
      rangeStart: first,
      rangeEnd: end,
      scale: 'day',
    };
  }
  const grid = buildTimeGrid({
    anchorDate,
    view:
      view === 'timelineDay'
        ? 'day'
        : view === 'timelineWorkWeek'
          ? 'workWeek'
          : 'week',
    firstDayOfWeek,
    dayStartHour,
    dayEndHour,
    cellDuration,
    intervalCount: intervals,
    hiddenWeekDays: options.hiddenWeekDays,
    weekendDays: options.weekendDays,
  });
  return { ...grid, scale: 'hour' };
}

/** The visible day index of `date` (`-1` when hidden / outside). */
function dayIndexOf(grid: TimeGridVm, date: Date): number {
  return grid.days.findIndex((day) => sameDay(day, date));
}

/**
 * Bars of one appointment set, laid out on the global horizontal axis. At
 * hour scale timed items clip to each day's hour window (a piece per day);
 * all-day items — and every item at day scale — become one bar from their
 * first to their last visible day.
 */
export function layoutTimelineBars<T>(
  appointments: readonly SchedulerAppointment<T>[],
  grid: TimeGridVm,
  cellDuration: number,
  scale: TimelineScale = 'hour',
): { bars: TimelineBar<T>[]; laneCount: number } {
  const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
  const totalSpan = windowSpan * grid.days.length;
  if (totalSpan <= 0) return { bars: [], laneCount: 1 };
  const partition =
    scale === 'day'
      ? { timed: [] as SchedulerAppointment<T>[], allDay: [...appointments] }
      : partitionAllDay(appointments);
  // hour scale: timed items clip per day
  const segments = segmentTimedAppointments(partition.timed, grid).map(
    (segment) => ({
      ...segment,
      startMinutes:
        segment.dayIndex * windowSpan +
        (segment.startMinutes - grid.windowStartMinutes),
      endMinutes:
        segment.dayIndex * windowSpan +
        (segment.endMinutes - grid.windowStartMinutes),
    }),
  );
  // day-spanning bars: first..last visible day of the item
  for (const appointment of partition.allDay) {
    const lastMoment =
      appointment.endDate.getTime() > appointment.startDate.getTime()
        ? new Date(appointment.endDate.getTime() - 1)
        : appointment.endDate;
    let first = -1;
    let last = -1;
    grid.days.forEach((day, index) => {
      const dayEnd = addDays(day, 1);
      const covers =
        appointment.startDate.getTime() < dayEnd.getTime() &&
        lastMoment.getTime() >= day.getTime();
      if (!covers) return;
      if (first === -1) first = index;
      last = index;
    });
    if (first === -1) continue;
    segments.push({
      appointment,
      dayIndex: first,
      startMinutes: first * windowSpan,
      endMinutes: (last + 1) * windowSpan,
      clippedStart: startOfDay(appointment.startDate).getTime() <
        grid.days[first].getTime(),
      clippedEnd: startOfDay(lastMoment).getTime() > grid.days[last].getTime(),
    });
  }
  const layouted = layoutDayColumn(
    segments,
    0,
    totalSpan,
    Math.min(cellDuration, windowSpan),
  );
  const laneCount = layouted.reduce(
    (max, item) => Math.max(max, item.columnIndex + 1),
    1,
  );
  return {
    bars: layouted.map((item) => ({
      key: `${String(item.appointment.key)}:${item.dayIndex}`,
      appointment: item.appointment,
      leftPct: item.topFraction * 100,
      widthPct: item.heightFraction * 100,
      lane: item.columnIndex,
      clippedStart: item.clippedStart,
      clippedEnd: item.clippedEnd,
    })),
    laneCount,
  };
}

/**
 * The timeline rows: one per item of the grouping resource plus a trailing
 * "unassigned" row when needed; without grouping a single combined row.
 */
export function buildTimelineRows<T>(
  appointments: readonly SchedulerAppointment<T>[],
  grid: TimeGridVm,
  cellDuration: number,
  resource: OgeSchedulerResource | null,
  idOf: (item: T) => unknown,
  unassignedLabel: string,
  scale: TimelineScale = 'hour',
): readonly TimelineRow<T>[] {
  if (resource === null) {
    const { bars, laneCount } = layoutTimelineBars(
      appointments,
      grid,
      cellDuration,
      scale,
    );
    return [
      {
        id: null,
        text: unassignedLabel,
        color: undefined,
        bars,
        laneCount,
        kind: 'resource',
        level: 0,
        values: {},
      },
    ];
  }
  const rows: TimelineRow<T>[] = resource.items.map(
    (item: OgeSchedulerResourceItem) => {
      const matches = appointments.filter(
        (appointment) => idOf(appointment.source) === item.id,
      );
      const { bars, laneCount } = layoutTimelineBars(
        matches,
        grid,
        cellDuration,
        scale,
      );
      return {
        id: item.id,
        text: item.text,
        color: item.color,
        bars,
        laneCount,
        kind: 'resource' as const,
        level: 0,
        values: { [resource.fieldExpr]: item.id },
        item,
        resource,
      };
    },
  );
  const unassigned = appointments.filter(
    (appointment) =>
      !resource.items.some((item) => idOf(appointment.source) === item.id),
  );
  if (unassigned.length > 0) {
    const { bars, laneCount } = layoutTimelineBars(
      unassigned,
      grid,
      cellDuration,
      scale,
    );
    rows.push({
      id: null,
      text: unassignedLabel,
      color: undefined,
      bars,
      laneCount,
      kind: 'resource',
      level: 0,
      values: {},
    });
  }
  return rows;
}

/**
 * The rows of a multi-level grouped timeline: a group header row whenever
 * an outer level's item changes, then one resource row per leaf; items
 * matching no leaf collect in a trailing "unassigned" row. A single level
 * gives exactly {@link buildTimelineRows}' rows.
 */
export function buildGroupedTimelineRows<T>(
  appointments: readonly SchedulerAppointment<T>[],
  grid: TimeGridVm,
  cellDuration: number,
  levels: readonly OgeSchedulerResource[],
  leaves: readonly SchedulerGroupLeaf[],
  unassignedLabel: string,
  scale: TimelineScale = 'hour',
): readonly TimelineRow<T>[] {
  if (levels.length <= 1) {
    const resource = levels[0] ?? null;
    return buildTimelineRows(
      appointments,
      grid,
      cellDuration,
      resource,
      (item) =>
        resource === null
          ? null
          : (item as Record<string, unknown>)[resource.fieldExpr],
      unassignedLabel,
      scale,
    );
  }
  const leafOf = groupLeafMatcher<T>(levels, leaves);
  const buckets = leaves.map(() => [] as SchedulerAppointment<T>[]);
  const unassigned: SchedulerAppointment<T>[] = [];
  for (const appointment of appointments) {
    const leaf = leafOf(appointment.source);
    if (leaf === -1) unassigned.push(appointment);
    else buckets[leaf].push(appointment);
  }
  const rows: TimelineRow<T>[] = [];
  leaves.forEach((leaf, index) => {
    const previous = leaves[index - 1];
    for (let level = 0; level < levels.length - 1; level++) {
      const starts =
        previous === undefined ||
        !leaf.path
          .slice(0, level + 1)
          .every((item, depth) => item === previous.path[depth]);
      if (!starts) continue;
      const values: Record<string, unknown> = {};
      for (let depth = 0; depth <= level; depth++) {
        values[levels[depth].fieldExpr] = leaf.path[depth].id;
      }
      rows.push({
        id: null,
        text: leaf.path[level].text,
        color: leaf.path[level].color,
        bars: [],
        laneCount: 0,
        kind: 'group',
        level,
        values,
        item: leaf.path[level],
        resource: levels[level],
      });
    }
    const { bars, laneCount } = layoutTimelineBars(
      buckets[index],
      grid,
      cellDuration,
      scale,
    );
    rows.push({
      id: leaf,
      text: leaf.text,
      color: leaf.color,
      bars,
      laneCount,
      kind: 'resource',
      level: levels.length - 1,
      values: leaf.values,
      item: leaf.path[leaf.path.length - 1],
      resource: levels[levels.length - 1],
      leaf,
    });
  });
  if (unassigned.length > 0) {
    const { bars, laneCount } = layoutTimelineBars(
      unassigned,
      grid,
      cellDuration,
      scale,
    );
    rows.push({
      id: null,
      text: unassignedLabel,
      color: undefined,
      bars,
      laneCount,
      kind: 'resource',
      level: 0,
      values: {},
    });
  }
  return rows;
}

/**
 * Reads the row id an item belongs to — the resource id (single level) or
 * the leaf object (nested levels) — so `timelineBarCtrlKey` finds the
 * current row and its neighbours.
 */
export function timelineRowIdReader<T>(
  levels: readonly OgeSchedulerResource[],
  leaves: readonly SchedulerGroupLeaf[],
): (item: T) => unknown {
  if (levels.length === 0) return () => null;
  if (levels.length === 1) {
    const field = levels[0].fieldExpr;
    return (item) => (item as Record<string, unknown>)[field];
  }
  const leafOf = groupLeafMatcher<T>(levels, leaves);
  return (item) => {
    const index = leafOf(item);
    return index === -1 ? null : leaves[index];
  };
}

/**
 * Horizontal grouping: the resource rows' bars side by side as blocks of
 * one track (block `i` spans `[i, i + 1) / blocks` of the width), with the
 * row's lane count the widest block's.
 */
export function buildHorizontalTimelineRow<T>(
  rows: readonly TimelineRow<T>[],
  unassignedLabel: string,
): { readonly row: TimelineRow<T>; readonly blocks: readonly TimelineRow<T>[] } {
  const blocks = rows.filter((row) => row.kind !== 'group');
  const count = Math.max(1, blocks.length);
  const bars: TimelineBar<T>[] = [];
  let laneCount = 1;
  blocks.forEach((block, index) => {
    laneCount = Math.max(laneCount, block.laneCount);
    for (const bar of block.bars) {
      bars.push({
        ...bar,
        key: `${index}|${bar.key}`,
        leftPct: (index * 100 + bar.leftPct) / count,
        widthPct: bar.widthPct / count,
      });
    }
  });
  return {
    row: {
      id: null,
      text: unassignedLabel,
      color: undefined,
      bars,
      laneCount,
      kind: 'resource',
      level: 0,
      values: {},
    },
    blocks,
  };
}

/** Hour labels: every hour on the day timeline, every 6 h on the weeks. */
export function timelineHourLabels(
  grid: TimeGridVm,
  view: SchedulerTimelineViewType,
  locale: string | undefined,
): readonly TimelineHourLabel[] {
  if (view === 'timelineMonth' || view === 'timelineYear') {
    return timelineDayTicks(grid, view, locale);
  }
  const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
  const totalSpan = windowSpan * grid.days.length;
  if (totalSpan <= 0) return [];
  const format = ogeDateTimeFormat(locale, { hour: 'numeric' });
  const stepMinutes = view === 'timelineDay' && grid.days.length === 1 ? 60 : 360;
  const labels: TimelineHourLabel[] = [];
  for (let dayIndex = 0; dayIndex < grid.days.length; dayIndex++) {
    for (
      let minutes = grid.windowStartMinutes;
      minutes < grid.windowEndMinutes;
      minutes += stepMinutes
    ) {
      labels.push({
        pct:
          ((dayIndex * windowSpan + (minutes - grid.windowStartMinutes)) /
            totalSpan) *
          100,
        text: format.format(new Date(2000, 0, 1, Math.floor(minutes / 60))),
      });
    }
  }
  return labels;
}

/** The day-scale sub-header: weekday initials (month) or day ticks (year). */
function timelineDayTicks(
  grid: TimeGridVm,
  view: SchedulerTimelineViewType,
  locale: string | undefined,
): readonly TimelineHourLabel[] {
  const count = grid.days.length;
  if (count === 0) return [];
  if (view === 'timelineMonth') {
    const format = ogeDateTimeFormat(locale, { weekday: 'narrow' });
    return grid.days.map((day, index) => ({
      pct: (index / count) * 100,
      text: format.format(day),
    }));
  }
  return grid.days.flatMap((day, index) =>
    [1, 8, 15, 22].includes(day.getDate())
      ? [{ pct: (index / count) * 100, text: String(day.getDate()) }]
      : [],
  );
}

/**
 * The top header cells: one per day, or one per month on the year scale
 * (365 day cells would be unreadable).
 */
export function timelineHeaderCells(
  grid: TimeGridVm,
  view: SchedulerTimelineViewType,
  locale: string | undefined,
  now: Date = new Date(),
): readonly TimelineHeaderCell[] {
  const count = grid.days.length;
  if (count === 0) return [];
  if (view === 'timelineYear') {
    const format = ogeDateTimeFormat(locale, { month: 'short' });
    const cells: TimelineHeaderCell[] = [];
    grid.days.forEach((day, index) => {
      const last = cells[cells.length - 1];
      if (last !== undefined && last.date.getMonth() === day.getMonth()) {
        cells[cells.length - 1] = {
          ...last,
          widthPct: last.widthPct + 100 / count,
          today: last.today || sameDay(day, now),
        };
        return;
      }
      cells.push({
        key: `m${day.getFullYear()}-${day.getMonth()}`,
        text: format.format(day),
        pct: (index / count) * 100,
        widthPct: 100 / count,
        date: day,
        today: sameDay(day, now),
      });
    });
    return cells;
  }
  const compact = view === 'timelineMonth';
  return grid.days.map((day, index) => ({
    key: `d${day.getTime()}`,
    text: compact ? String(day.getDate()) : timelineDayText(day, locale),
    pct: (index / count) * 100,
    widthPct: 100 / count,
    date: day,
    today: sameDay(day, now),
  }));
}

/** A timeline day header (`Mon, Aug 3`). */
export function timelineDayText(day: Date, locale: string | undefined): string {
  return ogeDateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(day);
}

/** Where a moment sits on the axis, in percent (`null` when hidden / outside). */
export function timelineAxisPct(grid: TimeGridVm, date: Date): number | null {
  const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
  const totalSpan = windowSpan * grid.days.length;
  if (totalSpan <= 0) return null;
  const index = dayIndexOf(grid, date);
  if (index === -1) return null;
  const minutes = Math.min(
    grid.windowEndMinutes,
    Math.max(grid.windowStartMinutes, date.getHours() * 60 + date.getMinutes()),
  );
  return (
    ((index * windowSpan + (minutes - grid.windowStartMinutes)) / totalSpan) *
    100
  );
}

/** A hatched / shaded box on a timeline track. */
export interface TimelineShadeBox {
  readonly key: string;
  readonly leftPct: number;
  readonly widthPct: number;
  readonly text?: string;
}

/** Maps `[start, end)` onto axis boxes (one per visible day it touches). */
function axisBoxes(
  grid: TimeGridVm,
  start: Date,
  end: Date,
  keyPrefix: string,
  text?: string,
): TimelineShadeBox[] {
  const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
  const totalSpan = windowSpan * grid.days.length;
  if (totalSpan <= 0) return [];
  const boxes: TimelineShadeBox[] = [];
  grid.days.forEach((day, index) => {
    const windowStart = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      0,
      grid.windowStartMinutes,
    );
    const windowEnd = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      0,
      grid.windowEndMinutes,
    );
    const from = Math.max(start.getTime(), windowStart.getTime());
    const to = Math.min(end.getTime(), windowEnd.getTime());
    if (to <= from) return;
    const fromMinutes = (from - windowStart.getTime()) / 60_000;
    const toMinutes = (to - windowStart.getTime()) / 60_000;
    boxes.push({
      key: `${keyPrefix}${index}-${from}`,
      leftPct: ((index * windowSpan + fromMinutes) / totalSpan) * 100,
      widthPct: ((toMinutes - fromMinutes) / totalSpan) * 100,
      text,
    });
  });
  return boxes;
}

/** The blocked (hatched) boxes of a row with grouped `values`. */
export function timelineBlockedBoxes(
  grid: TimeGridVm,
  disabled: OgeSchedulerDisabledSlots | null | undefined,
  values: Readonly<Record<string, unknown>>,
  stepMinutes: number,
): readonly TimelineShadeBox[] {
  if (disabled === null || disabled === undefined) return [];
  return blockedIntervals(
    disabled,
    grid.rangeStart,
    grid.rangeEnd,
    values,
    Math.max(1, stepMinutes),
  ).flatMap((interval, index) =>
    axisBoxes(grid, interval.startDate, interval.endDate, `b${index}-`, interval.text),
  );
}

/** The off-hours boxes of a row (hour scale only — a day scale shades whole non-working days). */
export function timelineOffHoursBoxes(
  grid: TimelineGridVm,
  workHours: OgeSchedulerWorkHours | null,
): readonly TimelineShadeBox[] {
  if (workHours === null) return [];
  const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
  const totalSpan = windowSpan * grid.days.length;
  if (totalSpan <= 0) return [];
  const boxes: TimelineShadeBox[] = [];
  grid.days.forEach((day, index) => {
    const offDay =
      workHours.days !== undefined && !workHours.days.includes(day.getDay());
    const pieces: [number, number][] = offDay
      ? [[grid.windowStartMinutes, grid.windowEndMinutes]]
      : grid.scale === 'day'
        ? []
        : [
            [grid.windowStartMinutes, Math.min(grid.windowEndMinutes, workHours.start * 60)],
            [Math.max(grid.windowStartMinutes, workHours.end * 60), grid.windowEndMinutes],
          ];
    for (const [from, to] of pieces) {
      if (to <= from) continue;
      boxes.push({
        key: `o${index}-${from}`,
        leftPct:
          ((index * windowSpan + (from - grid.windowStartMinutes)) / totalSpan) *
          100,
        widthPct: ((to - from) / totalSpan) * 100,
      });
    }
  });
  return boxes;
}

/**
 * A bar drag's horizontal arithmetic: whole days plus a slot-snapped time
 * shift, and the preview's new inline-start edge (`startLeftPct` is the
 * bar's `inset-inline-start` %). `rtl` inverts the pointer delta: time runs
 * right-to-left, so dragging left moves later.
 */
export function timelineDragMove<T>(
  appointment: SchedulerAppointment<T>,
  deltaX: number,
  trackWidth: number,
  grid: TimeGridVm,
  snap: number,
  startLeftPct: number,
  rtl = false,
): { proposal: AppointmentProposal; leftPct: number } {
  if (rtl) deltaX = -deltaX;
  const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
  const totalSpan = windowSpan * grid.days.length;
  const dayWidth = trackWidth / grid.days.length;
  const deltaDays = Math.round(deltaX / dayWidth);
  const deltaMinutes =
    ((deltaX - deltaDays * dayWidth) / dayWidth) * windowSpan;
  const proposal = proposeMove(appointment, deltaDays, deltaMinutes, snap);
  const deltaPct =
    ((deltaDays * windowSpan + Math.round(deltaMinutes / snap) * snap) /
      totalSpan) *
    100;
  return { proposal, leftPct: startLeftPct + deltaPct };
}

/**
 * The horizontal-grouping twin of {@link timelineDragMove}: the pointer
 * picks the target block (leaf) and the time inside it. `startLeftPct` is
 * the bar's start in percent of the whole track.
 */
export function timelineBlockDragMove<T>(
  appointment: SchedulerAppointment<T>,
  deltaX: number,
  trackWidth: number,
  grid: TimeGridVm,
  snap: number,
  startLeftPct: number,
  blockCount: number,
  rtl = false,
): { proposal: AppointmentProposal; leftPct: number; block: number } {
  const blocks = Math.max(1, blockCount);
  const dx = rtl ? -deltaX : deltaX;
  const blockWidth = trackWidth / blocks;
  const startPx = (startLeftPct / 100) * trackWidth;
  const originBlock = Math.min(blocks - 1, Math.max(0, Math.floor(startPx / blockWidth)));
  const newStart = startPx + dx;
  const block = Math.min(blocks - 1, Math.max(0, Math.floor(newStart / blockWidth)));
  const withinOld = startPx - originBlock * blockWidth;
  const withinNew = newStart - block * blockWidth;
  const inner = timelineDragMove(
    appointment,
    withinNew - withinOld,
    blockWidth,
    grid,
    snap,
    (withinOld / blockWidth) * 100,
  );
  return {
    proposal: inner.proposal,
    leftPct: (block * 100 + inner.leftPct) / blocks,
    block,
  };
}

/** The row index under a pointer (`fallback` when outside every row). */
export function timelineRowAt(
  clientY: number,
  rowRects: readonly { readonly top: number; readonly bottom: number }[],
  fallback: number,
): number {
  const index = rowRects.findIndex(
    (rect) => clientY >= rect.top && clientY <= rect.bottom,
  );
  return index === -1 ? fallback : index;
}

/**
 * The time under a pointer on a track (external drops, paste targets): the
 * slot-snapped start of the slot at `offsetX` px of `trackWidth`.
 */
export function timelineDateAt(
  grid: TimeGridVm,
  offsetX: number,
  trackWidth: number,
  snap: number,
  rtl = false,
): Date | null {
  if (trackWidth <= 0 || grid.days.length === 0) return null;
  const x = rtl ? trackWidth - offsetX : offsetX;
  const fraction = Math.min(0.999999, Math.max(0, x / trackWidth));
  const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
  const position = fraction * grid.days.length;
  const index = Math.floor(position);
  const day = grid.days[index];
  const minutes =
    grid.windowStartMinutes +
    Math.floor(((position - index) * windowSpan) / snap) * snap;
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    0,
    Math.min(grid.windowEndMinutes - Math.min(snap, windowSpan), minutes),
  );
}

/* ---------- row virtualization ---------- */

/** Lane pitch and the fixed heights the rows render at (px, border included). */
export const OGE_SCHEDULER_TIMELINE_LANE_PX = 26;
export const OGE_SCHEDULER_TIMELINE_GROUP_ROW_PX = 29;

/** A row's rendered height (px) — the track's lanes plus its padding and border. */
export function timelineRowHeight<T>(row: TimelineRow<T>): number {
  if (row.kind === 'group') return OGE_SCHEDULER_TIMELINE_GROUP_ROW_PX;
  return 9 + Math.max(1, row.laneCount) * OGE_SCHEDULER_TIMELINE_LANE_PX;
}

/** The rendered slice of a virtualized row list. */
export interface TimelineVirtualWindow {
  readonly start: number;
  readonly end: number;
  /** Spacer heights (px) before and after the rendered rows. */
  readonly padStart: number;
  readonly padEnd: number;
  readonly totalHeight: number;
}

/** Rows rendered before the scroller has a measured height (SSR, jsdom). */
const UNMEASURED_ROWS = 40;

/**
 * The window of rows to render for `scrollTop` / `viewportHeight` (px,
 * relative to the first row) — core's `OffsetTree` + `computeWindow`, the
 * suite's shared virtualization math, over the rows' fixed heights.
 */
export function timelineVirtualWindow<T>(
  rows: readonly TimelineRow<T>[],
  scrollTop: number,
  viewportHeight: number,
  overscan = 6,
): TimelineVirtualWindow {
  const tree = new OffsetTree(rows.length, (index) =>
    timelineRowHeight(rows[index]),
  );
  const totalHeight = tree.totalHeight;
  if (viewportHeight <= 0) {
    const end = Math.min(rows.length, UNMEASURED_ROWS);
    return {
      start: 0,
      end,
      padStart: 0,
      padEnd: totalHeight - tree.offsetOf(end),
      totalHeight,
    };
  }
  const window = computeWindow(scrollTop, viewportHeight, tree, overscan);
  return {
    start: window.start,
    end: window.end,
    padStart: window.offsetY,
    padEnd: totalHeight - tree.offsetOf(window.end),
    totalHeight,
  };
}

/** Whether a row list should virtualize (`'auto'`: more than 50 rows). */
export function shouldVirtualizeTimeline(
  mode: boolean | 'auto',
  rowCount: number,
): boolean {
  return mode === true || (mode === 'auto' && rowCount > 50);
}
