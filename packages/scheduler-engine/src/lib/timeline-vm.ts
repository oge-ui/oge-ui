/**
 * The timeline view's framework-free half: a horizontal time axis (day or
 * week) with one row per resource of the grouping field — or a single row
 * without grouping. Bars stack into lanes via the overlap-layout kernel
 * (transposed: the column index becomes the vertical lane).
 */
import { sameDay } from '@oge-ui/core';
import { proposeMove, type AppointmentProposal } from './gesture-math';
import { layoutDayColumn } from './layout';
import type { SchedulerAppointment } from './scheduler-model';
import type { SchedulerProposalEvent } from './view-events';
import type {
  OgeSchedulerResource,
  OgeSchedulerResourceItem,
} from './scheduler-types';
import {
  buildTimeGrid,
  partitionAllDay,
  segmentTimedAppointments,
  type TimeGridVm,
} from './view-model';

/** A committed timeline move: time proposal + optional new resource id. */
export type TimelineMoveEvent<T> = SchedulerProposalEvent<T>;

/** One positioned timeline bar. */
export interface TimelineBar<T> {
  readonly appointment: SchedulerAppointment<T>;
  readonly leftPct: number;
  readonly widthPct: number;
  readonly lane: number;
  readonly clippedStart: boolean;
  readonly clippedEnd: boolean;
}

/** One timeline row (a resource, or the single unassigned row). */
export interface TimelineRow<T> {
  readonly id: unknown;
  readonly text: string;
  readonly color: string | undefined;
  readonly bars: readonly TimelineBar<T>[];
  readonly laneCount: number;
}

/** One hour label of the timeline sub-header. */
export interface TimelineHourLabel {
  readonly pct: number;
  readonly text: string;
}

/** The time grid behind a timeline view. */
export function buildTimelineGrid(
  view: 'timelineDay' | 'timelineWeek',
  anchorDate: Date,
  firstDayOfWeek: number,
  dayStartHour: number,
  dayEndHour: number,
  cellDuration: number,
): TimeGridVm {
  return buildTimeGrid({
    anchorDate,
    view: view === 'timelineDay' ? 'day' : 'week',
    firstDayOfWeek,
    dayStartHour,
    dayEndHour,
    cellDuration,
  });
}

/** Bars of one appointment set, laid out on the global horizontal axis. */
export function layoutTimelineBars<T>(
  appointments: readonly SchedulerAppointment<T>[],
  grid: TimeGridVm,
  cellDuration: number,
): { bars: TimelineBar<T>[]; laneCount: number } {
  const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
  const totalSpan = windowSpan * grid.days.length;
  if (totalSpan <= 0) return { bars: [], laneCount: 1 };
  const { timed, allDay } = partitionAllDay(appointments);
  // all-day items become full-day bars; timed items clip per day
  const segments = segmentTimedAppointments(timed, grid).map((segment) => ({
    ...segment,
    startMinutes:
      segment.dayIndex * windowSpan +
      (segment.startMinutes - grid.windowStartMinutes),
    endMinutes:
      segment.dayIndex * windowSpan +
      (segment.endMinutes - grid.windowStartMinutes),
  }));
  for (const appointment of allDay) {
    grid.days.forEach((day, dayIndex) => {
      const dayEnd = new Date(day.getTime() + 86_400_000);
      if (
        appointment.startDate.getTime() < dayEnd.getTime() &&
        appointment.endDate.getTime() > day.getTime()
      ) {
        segments.push({
          appointment,
          dayIndex,
          startMinutes: dayIndex * windowSpan,
          endMinutes: (dayIndex + 1) * windowSpan,
          clippedStart: !sameDay(appointment.startDate, day),
          clippedEnd: appointment.endDate.getTime() > dayEnd.getTime(),
        });
      }
    });
  }
  const layouted = layoutDayColumn(segments, 0, totalSpan, cellDuration);
  const laneCount = layouted.reduce(
    (max, item) => Math.max(max, item.columnIndex + 1),
    1,
  );
  return {
    bars: layouted.map((item) => ({
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
): readonly TimelineRow<T>[] {
  if (resource === null) {
    const { bars, laneCount } = layoutTimelineBars(
      appointments,
      grid,
      cellDuration,
    );
    return [
      { id: null, text: unassignedLabel, color: undefined, bars, laneCount },
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
      );
      return {
        id: item.id,
        text: item.text,
        color: item.color,
        bars,
        laneCount,
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
    );
    rows.push({
      id: null,
      text: unassignedLabel,
      color: undefined,
      bars,
      laneCount,
    });
  }
  return rows;
}

/** Hour labels: every hour on the day timeline, every 6 h on the week. */
export function timelineHourLabels(
  grid: TimeGridVm,
  view: 'timelineDay' | 'timelineWeek',
  locale: string | undefined,
): readonly TimelineHourLabel[] {
  const windowSpan = grid.windowEndMinutes - grid.windowStartMinutes;
  const totalSpan = windowSpan * grid.days.length;
  if (totalSpan <= 0) return [];
  const format = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
  const stepMinutes = view === 'timelineDay' ? 60 : 360;
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

/** A timeline day header (`Mon, Aug 3`). */
export function timelineDayText(day: Date, locale: string | undefined): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(day);
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
