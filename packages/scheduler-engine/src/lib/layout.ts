/**
 * Overlap layout for one day column of the day/week view.
 *
 * Algorithm (deterministic):
 * 1. Sort segments by start ascending, then end descending (longer first),
 *    then key order for stability.
 * 2. Sweep to build CLUSTERS of transitively overlapping segments: track the
 *    max end seen; when the next segment starts at or after it, the cluster
 *    closes (half-open ranges — back-to-back never clusters).
 * 3. Within a cluster, greedily assign each segment to the first column whose
 *    last occupant ends at or before the segment's start; otherwise open a
 *    new column.
 * 4. Every member of a cluster gets `columnCount` = the cluster's total
 *    column count: `left = columnIndex / columnCount`, `width =
 *    1 / columnCount`. Right-expansion into free columns (FullCalendar
 *    style) is deliberately NOT done in v0.1 — equal widths stay stable
 *    under drag previews; revisit in v0.2.
 * 5. Vertical fractions come from the visible window; segments shorter than
 *    `minRenderMinutes` render at that minimum height (clamped to the window
 *    bottom) so zero-length reminders stay clickable.
 */
import type { AppointmentSegment } from './view-model';

/** A segment with resolved layout fractions (0–1 of the day cell). */
export interface LayoutedSegment<T = unknown> extends AppointmentSegment<T> {
  readonly topFraction: number;
  readonly heightFraction: number;
  readonly leftFraction: number;
  readonly widthFraction: number;
  readonly columnIndex: number;
  readonly columnCount: number;
}

export function layoutDayColumn<T>(
  segments: readonly AppointmentSegment<T>[],
  windowStartMinutes: number,
  windowEndMinutes: number,
  minRenderMinutes: number,
): LayoutedSegment<T>[] {
  const windowSpan = windowEndMinutes - windowStartMinutes;
  if (windowSpan <= 0 || segments.length === 0) return [];

  // effective (render) extents: minimum height applied before clustering so
  // visually overlapping chips also share columns
  const items = segments.map((segment, order) => {
    const renderEnd = Math.min(
      Math.max(segment.endMinutes, segment.startMinutes + minRenderMinutes),
      windowEndMinutes,
    );
    const renderStart = Math.min(
      segment.startMinutes,
      Math.max(renderEnd - minRenderMinutes, windowStartMinutes),
    );
    return { segment, order, renderStart, renderEnd };
  });
  items.sort(
    (a, b) =>
      a.renderStart - b.renderStart ||
      b.renderEnd - a.renderEnd ||
      a.order - b.order,
  );

  const result: LayoutedSegment<T>[] = [];
  let clusterStart = 0;
  let clusterMaxEnd = -Infinity;
  for (let index = 0; index <= items.length; index++) {
    const closes =
      index === items.length || items[index].renderStart >= clusterMaxEnd;
    if (closes && index > clusterStart) {
      const cluster = items.slice(clusterStart, index);
      // greedy column assignment inside the cluster
      const columnEnds: number[] = [];
      const columns = cluster.map((item) => {
        let column = columnEnds.findIndex((end) => end <= item.renderStart);
        if (column === -1) {
          column = columnEnds.length;
          columnEnds.push(item.renderEnd);
        } else {
          columnEnds[column] = item.renderEnd;
        }
        return column;
      });
      const columnCount = columnEnds.length;
      cluster.forEach((item, i) => {
        result.push({
          ...item.segment,
          topFraction: (item.renderStart - windowStartMinutes) / windowSpan,
          heightFraction: (item.renderEnd - item.renderStart) / windowSpan,
          leftFraction: columns[i] / columnCount,
          widthFraction: 1 / columnCount,
          columnIndex: columns[i],
          columnCount,
        });
      });
      clusterStart = index;
      clusterMaxEnd = -Infinity;
    }
    if (index < items.length) {
      clusterMaxEnd = Math.max(clusterMaxEnd, items[index].renderEnd);
    }
  }
  return result;
}
