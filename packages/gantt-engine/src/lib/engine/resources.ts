/**
 * Resource kernel: effort-driven durations, the per-period utilization
 * histogram (assignment units against capacity) and the resource-centric
 * row model of the resource view. Pure.
 */
import type { RowKey } from '@oge-ui/core';
import type { GanttTask } from './gantt-model';
import { addWorkingDays, type GanttWorkCalendar } from './work-calendar';

const DAY_MS = 86_400_000;

/**
 * Effort-driven finish: `effort` hours spread over the assigned units
 * (`totalUnits` in %, 100 = one full-time resource) at `hoursPerDay`, in
 * whole working days (calendar) or calendar days. `null` when there is
 * nothing to drive (no effort, no units).
 */
export function effortDrivenEnd(
  start: Date,
  effort: number | undefined,
  totalUnits: number,
  hoursPerDay: number,
  calendar?: GanttWorkCalendar | null,
): Date | null {
  if (effort === undefined || effort <= 0 || totalUnits <= 0) return null;
  const perDay = Math.max(0.01, hoursPerDay) * (totalUnits / 100);
  const days = Math.max(1, Math.ceil(effort / perDay - 1e-9));
  if (calendar) return addWorkingDays(start, days, calendar);
  return new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + days,
    start.getHours(),
    start.getMinutes(),
  );
}

/** One resource as the histogram reads it. */
export interface GanttHistogramResource {
  readonly id: unknown;
  readonly text: string;
  /** Capacity in % (100 = one full-time resource). */
  readonly capacity?: number;
}

/** One period cell of a histogram row. */
export interface GanttHistogramCell {
  readonly start: Date;
  readonly end: Date;
  /** Allocated units in % over the period (time-weighted). */
  readonly load: number;
  /** `load` exceeds the resource's capacity. */
  readonly over: boolean;
}

/** One resource row of the histogram. */
export interface GanttHistogramRow {
  readonly id: unknown;
  readonly text: string;
  readonly capacity: number;
  readonly cells: readonly GanttHistogramCell[];
  /** The highest period load. */
  readonly peak: number;
  /** Periods over capacity. */
  readonly overCount: number;
}

/**
 * Utilization per resource and period: for every period
 * `[periods[i], periods[i + 1])`, the sum over the resource's leaf
 * assignments of `units × overlap / period length`. Summary tasks and
 * milestones carry no work.
 */
export function buildResourceHistogram(
  tasks: readonly GanttTask[],
  resources: readonly GanttHistogramResource[],
  periods: readonly Date[],
): GanttHistogramRow[] {
  const work = tasks.filter(
    (task) =>
      !task.isSummary &&
      task.end.getTime() > task.start.getTime() &&
      task.resourceIds.length > 0,
  );
  return resources.map((resource) => {
    const capacity = resource.capacity ?? 100;
    const assigned = work
      .map((task) => {
        const index = task.resourceIds.indexOf(resource.id);
        return index < 0 ? null : { task, units: task.units[index] ?? 100 };
      })
      .filter((entry): entry is { task: GanttTask; units: number } =>
        entry !== null,
      );
    const cells: GanttHistogramCell[] = [];
    let peak = 0;
    let overCount = 0;
    for (let i = 0; i + 1 < periods.length; i++) {
      const start = periods[i].getTime();
      const end = periods[i + 1].getTime();
      const length = Math.max(1, end - start);
      let load = 0;
      for (const { task, units } of assigned) {
        const overlap =
          Math.min(end, task.end.getTime()) -
          Math.max(start, task.start.getTime());
        if (overlap > 0) load += (units * overlap) / length;
      }
      load = Math.round(load * 10) / 10;
      const over = load > capacity + 0.05;
      if (over) overCount++;
      peak = Math.max(peak, load);
      cells.push({
        start: periods[i],
        end: periods[i + 1],
        load,
        over,
      });
    }
    return {
      id: resource.id,
      text: resource.text,
      capacity,
      cells,
      peak,
      overCount,
    };
  });
}

/** Prefix of the synthetic row keys of the resource view. */
export const GANTT_RESOURCE_ROW_PREFIX = 'oge-resource:';

/** One row of the resource view: a resource group or one of its tasks. */
export interface GanttResourceViewRow<T> {
  readonly task: GanttTask<T>;
  /** The real task behind an assignment row; `null` on a group row. */
  readonly realKey: RowKey | null;
}

/**
 * Resource-centric rows: one summary-like group row per resource (plus an
 * "unassigned" group when `unassignedText` is given and needed) with its
 * leaf tasks beneath. Group rows span their tasks; assignment rows are copies
 * of the real task under a composite key (a task assigned twice appears
 * twice) whose `source` is the real item, so editing writes the store.
 */
export function buildResourceViewRows<T>(
  tasks: readonly GanttTask<T>[],
  resources: readonly { readonly id: unknown; readonly text: string }[],
  collapsedKeys: ReadonlySet<RowKey>,
  unassignedText: string | null,
): GanttResourceViewRow<T>[] {
  const leaves = tasks.filter((task) => !task.isSummary);
  const groups: { id: string; text: string; members: GanttTask<T>[] }[] =
    resources.map((resource) => ({
      id: String(resource.id),
      text: resource.text,
      members: leaves.filter((task) => task.resourceIds.includes(resource.id)),
    }));
  if (unassignedText !== null) {
    const known = new Set(resources.map((resource) => resource.id));
    const loose = leaves.filter(
      (task) => !task.resourceIds.some((id) => known.has(id)),
    );
    if (loose.length > 0) {
      groups.push({ id: '', text: unassignedText, members: loose });
    }
  }
  const rows: GanttResourceViewRow<T>[] = [];
  for (const group of groups) {
    const key = `${GANTT_RESOURCE_ROW_PREFIX}${group.id}`;
    const members = group.members;
    const start =
      members.length > 0
        ? new Date(Math.min(...members.map((task) => task.start.getTime())))
        : new Date();
    const end =
      members.length > 0
        ? new Date(Math.max(...members.map((task) => task.end.getTime())))
        : start;
    let weighted = 0;
    let total = 0;
    for (const task of members) {
      const ms = Math.max(1, task.end.getTime() - task.start.getTime());
      weighted += task.progress * ms;
      total += ms;
    }
    const expanded = !collapsedKeys.has(key);
    rows.push({
      realKey: null,
      task: {
        key,
        source: null as unknown as T,
        parentKey: null,
        level: 0,
        title: group.text,
        start,
        end,
        progress: total > 0 ? Math.round(weighted / total) : 0,
        color: undefined,
        baselineStart: undefined,
        baselineEnd: undefined,
        isMilestone: false,
        isSummary: members.length > 0,
        expanded,
        hasChildren: members.length > 0,
        resourceIds: [],
        wbs: '',
        manuallyScheduled: true,
        constraintType: 'ASAP',
        constraintDate: undefined,
        deadline: undefined,
        segments: [],
        baselines: [],
        units: [],
        effort: undefined,
      },
    });
    if (!expanded) continue;
    for (const task of members) {
      rows.push({
        realKey: task.key,
        task: {
          ...task,
          key: `${key}:${String(task.key)}`,
          parentKey: key,
          level: 1,
          isSummary: false,
          hasChildren: false,
          expanded: false,
        },
      });
    }
  }
  return rows;
}

/** Calendar-day length of a span (for labels). */
export function ganttSpanDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}
