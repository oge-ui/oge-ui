/**
 * Scheduling math over the dependency graph: constraint resolution
 * (forward pass shifting successors to honor their links) and critical-path
 * detection (zero-slack chains ending at the project finish). Pure.
 */
import type { RowKey } from '@oge-ui/core';
import type {
  GanttDependency,
  GanttDependencyType,
  GanttTask,
} from './gantt-model';

/** The date pair a constraint imposes on a successor. */
function constraintStart(
  type: GanttDependencyType,
  predecessor: { start: Date; end: Date },
  successor: { start: Date; end: Date },
): Date | null {
  const duration = successor.end.getTime() - successor.start.getTime();
  switch (type) {
    case 'FS':
      return new Date(predecessor.end.getTime());
    case 'SS':
      return new Date(predecessor.start.getTime());
    case 'FF':
      return new Date(predecessor.end.getTime() - duration);
    case 'SF':
      return new Date(predecessor.start.getTime() - duration);
  }
}

export interface GanttScheduleChange {
  readonly key: RowKey;
  readonly start: Date;
  readonly end: Date;
}

/**
 * Forward pass: walks the dependency graph in topological order and shifts
 * every successor that starts before its constraint, preserving durations.
 * Returns only the tasks that actually moved. Cycles are guarded by the
 * iteration cap (the model rejects new cycles up front).
 */
export function autoScheduleForward(
  tasks: readonly GanttTask[],
  dependencies: readonly GanttDependency[],
): GanttScheduleChange[] {
  const dates = new Map<RowKey, { start: Date; end: Date }>();
  for (const task of tasks) {
    if (!task.isSummary) dates.set(task.key, { start: task.start, end: task.end });
  }
  const moved = new Map<RowKey, { start: Date; end: Date }>();
  const incoming = new Map<RowKey, GanttDependency[]>();
  for (const dep of dependencies) {
    const bucket = incoming.get(dep.successorKey);
    if (bucket) bucket.push(dep);
    else incoming.set(dep.successorKey, [dep]);
  }

  // relaxation loop: |tasks| passes suffice for a DAG
  for (let pass = 0; pass < tasks.length; pass++) {
    let changed = false;
    for (const [successorKey, links] of incoming) {
      const successor = dates.get(successorKey);
      if (successor === undefined) continue;
      for (const link of links) {
        const predecessor = dates.get(link.predecessorKey);
        if (predecessor === undefined) continue;
        const minStart = constraintStart(link.type, predecessor, successor);
        if (minStart !== null && successor.start.getTime() < minStart.getTime()) {
          const duration = successor.end.getTime() - successor.start.getTime();
          const next = {
            start: minStart,
            end: new Date(minStart.getTime() + duration),
          };
          dates.set(successorKey, next);
          moved.set(successorKey, next);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return [...moved.entries()].map(([key, value]) => ({ key, ...value }));
}

/**
 * Critical path: the zero-slack task chain(s) that determine the project
 * finish. Slack is computed backwards from the latest finish over the
 * dependency graph; tasks (and links joining two critical tasks) with zero
 * slack are critical. Summary tasks are never marked themselves.
 */
export function criticalPathKeys(
  tasks: readonly GanttTask[],
  dependencies: readonly GanttDependency[],
): ReadonlySet<RowKey> {
  const leaf = tasks.filter((task) => !task.isSummary);
  if (leaf.length === 0) return new Set();
  const dates = new Map(leaf.map((task) => [task.key, task]));
  const projectEnd = Math.max(...leaf.map((task) => task.end.getTime()));

  // latest allowed finish per task, seeded by the project end
  const latestFinish = new Map<RowKey, number>();
  for (const task of leaf) latestFinish.set(task.key, projectEnd);

  const outgoing = new Map<RowKey, GanttDependency[]>();
  for (const dep of dependencies) {
    const bucket = outgoing.get(dep.predecessorKey);
    if (bucket) bucket.push(dep);
    else outgoing.set(dep.predecessorKey, [dep]);
  }

  // backward relaxation
  for (let pass = 0; pass < leaf.length; pass++) {
    let changed = false;
    for (const [predecessorKey, links] of outgoing) {
      const predecessor = dates.get(predecessorKey);
      if (predecessor === undefined) continue;
      for (const link of links) {
        const successor = dates.get(link.successorKey);
        const successorLatest = latestFinish.get(link.successorKey);
        if (successor === undefined || successorLatest === undefined) continue;
        const successorSlack = successorLatest - successor.end.getTime();
        const successorLatestStart = successor.start.getTime() + successorSlack;
        let bound: number;
        switch (link.type) {
          case 'FS':
            bound = successorLatestStart;
            break;
          case 'SS':
            bound =
              successorLatestStart +
              (predecessor.end.getTime() - predecessor.start.getTime());
            break;
          case 'FF':
            bound = successorLatest;
            break;
          case 'SF':
            bound =
              successorLatest +
              (predecessor.end.getTime() - predecessor.start.getTime());
            break;
        }
        const current = latestFinish.get(predecessorKey) ?? projectEnd;
        if (bound < current) {
          latestFinish.set(predecessorKey, bound);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const critical = new Set<RowKey>();
  for (const task of leaf) {
    const latest = latestFinish.get(task.key) ?? projectEnd;
    if (latest - task.end.getTime() <= 0) critical.add(task.key);
  }
  return critical;
}
