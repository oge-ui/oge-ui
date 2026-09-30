/**
 * Resource workload aggregation: per resource, the merged time segments of
 * its assigned leaf tasks with a concurrency count — `count > 1` marks an
 * overallocation. Pure sweep over interval endpoints.
 */
import type { GanttTask } from './gantt-model';

export interface GanttWorkloadSegment {
  readonly start: Date;
  readonly end: Date;
  /** Concurrent assignments in this segment; `> 1` = overallocated. */
  readonly count: number;
}

/**
 * Segments per resource id, in chronological order. Summary tasks are
 * skipped (their children carry the work); zero-length milestones too.
 */
export function buildResourceWorkload(
  tasks: readonly GanttTask[],
  resourceIds: readonly unknown[],
): ReadonlyMap<unknown, readonly GanttWorkloadSegment[]> {
  const result = new Map<unknown, readonly GanttWorkloadSegment[]>();
  for (const id of resourceIds) {
    const intervals = tasks.filter(
      (task) =>
        !task.isSummary &&
        task.end.getTime() > task.start.getTime() &&
        task.resourceIds.includes(id),
    );
    if (intervals.length === 0) {
      result.set(id, []);
      continue;
    }
    // sweep: +1 at each start, -1 at each end
    const points = new Map<number, number>();
    for (const task of intervals) {
      points.set(
        task.start.getTime(),
        (points.get(task.start.getTime()) ?? 0) + 1,
      );
      points.set(task.end.getTime(), (points.get(task.end.getTime()) ?? 0) - 1);
    }
    const sorted = [...points.entries()].sort((a, b) => a[0] - b[0]);
    const segments: GanttWorkloadSegment[] = [];
    let count = 0;
    let prev = 0;
    for (const [time, delta] of sorted) {
      if (count > 0) {
        segments.push({ start: new Date(prev), end: new Date(time), count });
      }
      count += delta;
      prev = time;
    }
    result.set(id, segments);
  }
  return result;
}
