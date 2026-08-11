/**
 * Horizontal lane packing shared by the all-day strip and the month view's
 * week rows: items spanning day columns are stacked into as few lanes as
 * possible; when a lane cap applies, hidden items are counted per day for
 * the "+N more" affordance.
 */
import type { SchedulerAppointment } from './scheduler-model';

/** One item to pack: an appointment mapped onto a row's day columns. */
export interface LaneInput<T = unknown> {
  readonly appointment: SchedulerAppointment<T>;
  /** Inclusive day-column span within the row. */
  readonly startDayIndex: number;
  readonly endDayIndex: number;
  /** True when the appointment continues beyond the row's edges. */
  readonly clippedStart: boolean;
  readonly clippedEnd: boolean;
}

/** A packed item with its assigned lane. */
export interface LanedItem<T = unknown> extends LaneInput<T> {
  readonly lane: number;
}

/** The packed layout of one row. */
export interface LaneLayout<T = unknown> {
  readonly visible: readonly LanedItem<T>[];
  readonly laneCount: number;
  /** Per-day hidden counts for "+N more" (only days with overflow appear). */
  readonly overflowByDay: ReadonlyMap<number, number>;
  readonly hiddenByDay: ReadonlyMap<
    number,
    readonly SchedulerAppointment<T>[]
  >;
}

/**
 * Packs items into lanes: sorted by start day ascending, span descending,
 * input order for stability; each item takes the first lane free across its
 * whole span. With `maxLanes` set, items that would need a further lane go
 * hidden and count into `overflowByDay` for every day they cover.
 */
export function packLanes<T>(
  items: readonly LaneInput<T>[],
  maxLanes: number | null,
): LaneLayout<T> {
  const sorted = items
    .map((item, order) => ({ item, order }))
    .sort(
      (a, b) =>
        a.item.startDayIndex - b.item.startDayIndex ||
        b.item.endDayIndex -
          b.item.startDayIndex -
          (a.item.endDayIndex - a.item.startDayIndex) ||
        a.order - b.order,
    );

  // laneOccupancy[lane] = last occupied day index (inclusive) per lane
  const laneEnds: number[] = [];
  const visible: LanedItem<T>[] = [];
  const overflowByDay = new Map<number, number>();
  const hiddenByDay = new Map<number, SchedulerAppointment<T>[]>();

  for (const { item } of sorted) {
    let lane = laneEnds.findIndex((end) => end < item.startDayIndex);
    if (lane === -1) {
      if (maxLanes !== null && laneEnds.length >= maxLanes) {
        for (let day = item.startDayIndex; day <= item.endDayIndex; day++) {
          overflowByDay.set(day, (overflowByDay.get(day) ?? 0) + 1);
          const hidden = hiddenByDay.get(day);
          if (hidden) hidden.push(item.appointment);
          else hiddenByDay.set(day, [item.appointment]);
        }
        continue;
      }
      lane = laneEnds.length;
      laneEnds.push(item.endDayIndex);
    } else {
      laneEnds[lane] = item.endDayIndex;
    }
    visible.push({ ...item, lane });
  }

  return { visible, laneCount: laneEnds.length, overflowByDay, hiddenByDay };
}
