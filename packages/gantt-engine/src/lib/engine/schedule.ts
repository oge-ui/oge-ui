/**
 * Scheduling math over the dependency graph — pure.
 *
 * - `scheduleGanttProject`: the full engine. A forward pass in topological
 *   order places every auto-scheduled leaf task at the earliest date its
 *   links (with lag/lead) and its constraint allow — pulling tasks earlier as
 *   well as pushing them later — then a backward pass moves ALAP tasks as late
 *   as their successors (or the project finish) allow. Manually scheduled
 *   tasks never move; violations come back as conflicts.
 * - `detectGanttConflicts`: link, constraint and deadline violations of the
 *   current dates (the visual + `schedulingConflict` source).
 * - `computeGanttSlack`: total and free slack per leaf task (backward pass);
 *   `criticalPathKeys` is the zero-total-slack set.
 * - `autoScheduleForward`: the 1.x push-only pass, kept for direct callers.
 *
 * Links touching a summary task are drawn but not scheduled (the summary
 * spans its children). Work calendars give working-day lags and durations.
 */
import { addDays, type RowKey } from '@oge-ui/core';
import type {
  GanttConstraintType,
  GanttDependency,
  GanttDependencyType,
  GanttLagUnit,
  GanttTask,
} from './gantt-model';
import {
  addWorkingDays,
  isWorkingDay,
  nextWorkingDay,
  workingDaysBetween,
  type GanttWorkCalendar,
} from './work-calendar';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
/** Below this, two instants count as equal (rounding of rolled dates). */
const EPSILON_MS = 60_000;

export interface GanttScheduleChange {
  readonly key: RowKey;
  readonly start: Date;
  readonly end: Date;
}

/** A single plan-wide calendar, or a per-task resolver (resource calendars). */
export type GanttCalendarInput =
  GanttWorkCalendar | ((task: GanttTask) => GanttWorkCalendar | undefined);

function calendarResolver(
  calendar: GanttCalendarInput | undefined,
): (task: GanttTask) => GanttWorkCalendar | undefined {
  return typeof calendar === 'function' ? calendar : () => calendar;
}

/**
 * Shifts `date` by a dependency lag. Hours are wall-clock; days are whole
 * working days on a calendar (a positive lag first rolls the base onto a
 * working day), calendar days without one. Fractions of a day add as time.
 */
export function applyGanttLag(
  date: Date,
  lag: number,
  unit: GanttLagUnit,
  calendar?: GanttWorkCalendar,
): Date {
  if (lag === 0 || !Number.isFinite(lag)) return date;
  if (unit === 'hours') return new Date(date.getTime() + lag * HOUR_MS);
  const whole = Math.trunc(lag);
  const fraction = lag - whole;
  if (calendar === undefined) {
    return new Date(addDays(date, whole).getTime() + fraction * DAY_MS);
  }
  const step = whole > 0 ? 1 : -1;
  let cursor = whole > 0 ? nextWorkingDay(date, calendar) : date;
  const guard = 7 + (calendar.holidays?.length ?? 0);
  for (let i = 0; i < Math.abs(whole); i++) {
    cursor = addDays(cursor, step);
    for (let j = 0; j <= guard && !isWorkingDay(cursor, calendar); j++) {
      cursor = addDays(cursor, step);
    }
  }
  return new Date(cursor.getTime() + fraction * DAY_MS);
}

/** A task's length: wall-clock ms, plus working days on a calendar. */
interface Span {
  readonly ms: number;
  readonly days: number;
}

function spanOf(
  start: Date,
  end: Date,
  calendar: GanttWorkCalendar | undefined,
): Span {
  return {
    ms: end.getTime() - start.getTime(),
    days:
      calendar !== undefined ? workingDaysBetween(start, end, calendar) : 0,
  };
}

/** Places a span at `start` (rolled onto a working day on a calendar). */
function placeAt(
  start: Date,
  span: Span,
  calendar: GanttWorkCalendar | undefined,
): { start: Date; end: Date } {
  if (calendar === undefined || span.days === 0) {
    const rolled =
      calendar !== undefined && span.ms > 0
        ? nextWorkingDay(start, calendar)
        : start;
    return { start: rolled, end: new Date(rolled.getTime() + span.ms) };
  }
  const rolled = nextWorkingDay(start, calendar);
  return { start: rolled, end: addWorkingDays(rolled, span.days, calendar) };
}

/** Places a span so it finishes at (or just before) `end`. */
function placeEndingAt(
  end: Date,
  span: Span,
  calendar: GanttWorkCalendar | undefined,
): { start: Date; end: Date } {
  if (calendar === undefined || span.days === 0) {
    return { start: new Date(end.getTime() - span.ms), end };
  }
  let cursor = end;
  let counted = 0;
  const guard = (span.days + 1) * 8 + (calendar.holidays?.length ?? 0);
  for (let i = 0; i < guard && counted < span.days; i++) {
    cursor = addDays(cursor, -1);
    if (isWorkingDay(cursor, calendar)) counted++;
  }
  return placeAt(cursor, span, calendar);
}

/**
 * The earliest start a link allows its successor (lag applied). `span` is
 * the successor's own length (FF / SF bound its finish).
 */
function linkStartBound(
  type: GanttDependencyType,
  lag: number,
  unit: GanttLagUnit,
  predecessor: { start: Date; end: Date },
  spanMs: number,
  calendar: GanttWorkCalendar | undefined,
): Date {
  switch (type) {
    case 'FS':
      return applyGanttLag(predecessor.end, lag, unit, calendar);
    case 'SS':
      return applyGanttLag(predecessor.start, lag, unit, calendar);
    case 'FF':
      return new Date(
        applyGanttLag(predecessor.end, lag, unit, calendar).getTime() - spanMs,
      );
    case 'SF':
      return new Date(
        applyGanttLag(predecessor.start, lag, unit, calendar).getTime() -
          spanMs,
      );
  }
}

/**
 * The latest finish a link allows its predecessor, given the successor's
 * dates (`predecessorMs` is the predecessor's own length).
 */
function linkFinishBound(
  type: GanttDependencyType,
  lag: number,
  unit: GanttLagUnit,
  successor: { start: Date; end: Date },
  predecessorMs: number,
  calendar: GanttWorkCalendar | undefined,
): number {
  switch (type) {
    case 'FS':
      return applyGanttLag(successor.start, -lag, unit, calendar).getTime();
    case 'SS':
      return (
        applyGanttLag(successor.start, -lag, unit, calendar).getTime() +
        predecessorMs
      );
    case 'FF':
      return applyGanttLag(successor.end, -lag, unit, calendar).getTime();
    case 'SF':
      return (
        applyGanttLag(successor.end, -lag, unit, calendar).getTime() +
        predecessorMs
      );
  }
}

/** Leaf links only (a summary spans its children and is never scheduled). */
function leafGraph(
  tasks: readonly GanttTask[],
  dependencies: readonly GanttDependency[],
): {
  readonly leaves: Map<RowKey, GanttTask>;
  readonly incoming: Map<RowKey, GanttDependency[]>;
  readonly outgoing: Map<RowKey, GanttDependency[]>;
  readonly order: RowKey[];
} {
  const leaves = new Map<RowKey, GanttTask>();
  for (const task of tasks) if (!task.isSummary) leaves.set(task.key, task);
  const incoming = new Map<RowKey, GanttDependency[]>();
  const outgoing = new Map<RowKey, GanttDependency[]>();
  for (const dep of dependencies) {
    if (!leaves.has(dep.predecessorKey) || !leaves.has(dep.successorKey)) {
      continue;
    }
    const into = incoming.get(dep.successorKey);
    if (into) into.push(dep);
    else incoming.set(dep.successorKey, [dep]);
    const out = outgoing.get(dep.predecessorKey);
    if (out) out.push(dep);
    else outgoing.set(dep.predecessorKey, [dep]);
  }
  // Kahn's topological order; tasks caught in a cycle follow in input order
  const indegree = new Map<RowKey, number>();
  for (const key of leaves.keys()) {
    indegree.set(key, incoming.get(key)?.length ?? 0);
  }
  const queue = [...leaves.keys()].filter((key) => indegree.get(key) === 0);
  const order: RowKey[] = [];
  const placed = new Set<RowKey>();
  while (queue.length > 0) {
    const key = queue.shift() as RowKey;
    order.push(key);
    placed.add(key);
    for (const dep of outgoing.get(key) ?? []) {
      const left = (indegree.get(dep.successorKey) ?? 0) - 1;
      indegree.set(dep.successorKey, left);
      if (left === 0) queue.push(dep.successorKey);
    }
  }
  for (const key of leaves.keys()) if (!placed.has(key)) order.push(key);
  return { leaves, incoming, outgoing, order };
}

/** What kind of rule a conflict breaks. */
export type GanttConflictKind = 'dependency' | 'constraint' | 'deadline';

/** One scheduling violation. */
export interface GanttSchedulingConflict {
  readonly key: RowKey;
  readonly kind: GanttConflictKind;
  /** The violated constraint (`kind: 'constraint'`). */
  readonly constraintType?: GanttConstraintType;
  /** The violated link (`kind: 'dependency'`). */
  readonly dependencyKey?: RowKey;
  /** The constraint date, deadline or the date the link requires. */
  readonly date?: Date;
}

export interface GanttScheduleOptions {
  readonly calendar?: GanttCalendarInput;
  /**
   * Where ASAP tasks without predecessors start. Unset keeps their current
   * start (only links and constraints move a task).
   */
  readonly projectStart?: Date | null;
}

export interface GanttScheduleResult {
  /** Tasks whose dates changed (store write-back). */
  readonly changes: GanttScheduleChange[];
  /** Violations that remain after scheduling. */
  readonly conflicts: GanttSchedulingConflict[];
}

/**
 * The scheduling engine (see the module docs). Pure: returns the moved tasks
 * and the remaining conflicts; the caller writes the changes back.
 */
export function scheduleGanttProject(
  tasks: readonly GanttTask[],
  dependencies: readonly GanttDependency[],
  options: GanttScheduleOptions = {},
): GanttScheduleResult {
  const calendarFor = calendarResolver(options.calendar);
  const graph = leafGraph(tasks, dependencies);
  const dates = new Map<RowKey, { start: Date; end: Date }>();
  for (const [key, task] of graph.leaves) {
    dates.set(key, { start: task.start, end: task.end });
  }
  const spans = new Map<RowKey, Span>();
  for (const [key, task] of graph.leaves) {
    spans.set(key, spanOf(task.start, task.end, calendarFor(task)));
  }
  const earliest = new Map<RowKey, number>();

  // forward pass
  for (const key of graph.order) {
    const task = graph.leaves.get(key) as GanttTask;
    if (task.manuallyScheduled) continue;
    const calendar = calendarFor(task);
    const span = spans.get(key) as Span;
    let es: number | null = null;
    for (const link of graph.incoming.get(key) ?? []) {
      const predecessor = dates.get(link.predecessorKey);
      if (predecessor === undefined) continue;
      const predecessorTask = graph.leaves.get(link.predecessorKey);
      const bound = linkStartBound(
        link.type,
        link.lag,
        link.lagUnit,
        predecessor,
        span.ms,
        predecessorTask !== undefined ? calendarFor(predecessorTask) : calendar,
      ).getTime();
      es = es === null ? bound : Math.max(es, bound);
    }
    if (es !== null) earliest.set(key, es);
    const base =
      es ?? options.projectStart?.getTime() ?? task.start.getTime();
    const date = task.constraintDate?.getTime();
    let start: number;
    switch (task.constraintType) {
      case 'SNET':
        start = Math.max(es ?? (date as number), date as number);
        break;
      case 'SNLT':
        start = es ?? Math.min(base, date as number);
        break;
      case 'FNET':
        start = Math.max(
          es ?? (date as number) - span.ms,
          (date as number) - span.ms,
        );
        break;
      case 'FNLT':
        start = es ?? Math.min(base, (date as number) - span.ms);
        break;
      case 'MSO':
        start = date as number;
        break;
      case 'MFO':
        dates.set(
          key,
          placeEndingAt(new Date(date as number), span, calendar),
        );
        continue;
      default:
        start = base;
    }
    dates.set(key, placeAt(new Date(start), span, calendar));
  }

  // backward pass: ALAP tasks slide as late as their successors allow
  let projectFinish = 0;
  for (const value of dates.values()) {
    projectFinish = Math.max(projectFinish, value.end.getTime());
  }
  for (let i = graph.order.length - 1; i >= 0; i--) {
    const key = graph.order[i];
    const task = graph.leaves.get(key) as GanttTask;
    if (task.manuallyScheduled || task.constraintType !== 'ALAP') continue;
    const calendar = calendarFor(task);
    const span = spans.get(key) as Span;
    let latestFinish = projectFinish;
    for (const link of graph.outgoing.get(key) ?? []) {
      const successor = dates.get(link.successorKey);
      if (successor === undefined) continue;
      latestFinish = Math.min(
        latestFinish,
        linkFinishBound(
          link.type,
          link.lag,
          link.lagUnit,
          successor,
          span.ms,
          calendar,
        ),
      );
    }
    const current = dates.get(key) as { start: Date; end: Date };
    const placed = placeEndingAt(new Date(latestFinish), span, calendar);
    // never earlier than the forward pass allowed (the links still hold)
    if (placed.start.getTime() > current.start.getTime() + EPSILON_MS) {
      dates.set(key, placed);
    }
  }

  const changes: GanttScheduleChange[] = [];
  for (const [key, task] of graph.leaves) {
    const next = dates.get(key) as { start: Date; end: Date };
    if (
      next.start.getTime() !== task.start.getTime() ||
      next.end.getTime() !== task.end.getTime()
    ) {
      changes.push({ key, start: next.start, end: next.end });
    }
  }
  const scheduled = tasks.map((task) => {
    const next = dates.get(task.key);
    return next === undefined ? task : { ...task, ...next };
  });
  return {
    changes,
    conflicts: detectGanttConflicts(scheduled, dependencies, options.calendar),
  };
}

/**
 * Violations of the current dates: a successor starting before its link
 * allows, a date constraint that does not hold, a task finishing after its
 * deadline. Summary links are skipped, like in scheduling.
 */
export function detectGanttConflicts(
  tasks: readonly GanttTask[],
  dependencies: readonly GanttDependency[],
  calendar?: GanttCalendarInput,
): GanttSchedulingConflict[] {
  const calendarFor = calendarResolver(calendar);
  const graph = leafGraph(tasks, dependencies);
  const conflicts: GanttSchedulingConflict[] = [];
  for (const key of graph.order) {
    const task = graph.leaves.get(key) as GanttTask;
    const taskCalendar = calendarFor(task);
    const spanMs = task.end.getTime() - task.start.getTime();
    for (const link of graph.incoming.get(key) ?? []) {
      const predecessor = graph.leaves.get(link.predecessorKey);
      if (predecessor === undefined) continue;
      const bound = linkStartBound(
        link.type,
        link.lag,
        link.lagUnit,
        predecessor,
        spanMs,
        calendarFor(predecessor) ?? taskCalendar,
      );
      if (task.start.getTime() < bound.getTime() - EPSILON_MS) {
        conflicts.push({
          key,
          kind: 'dependency',
          dependencyKey: link.key,
          date: bound,
        });
      }
    }
    const date = task.constraintDate;
    if (date !== undefined) {
      const start = task.start.getTime();
      const end = task.end.getTime();
      const at = date.getTime();
      const broken =
        (task.constraintType === 'SNET' && start < at - EPSILON_MS) ||
        (task.constraintType === 'SNLT' && start > at + EPSILON_MS) ||
        (task.constraintType === 'FNET' && end < at - EPSILON_MS) ||
        (task.constraintType === 'FNLT' && end > at + EPSILON_MS) ||
        (task.constraintType === 'MSO' && Math.abs(start - at) > EPSILON_MS) ||
        (task.constraintType === 'MFO' && Math.abs(end - at) > EPSILON_MS);
      if (broken) {
        conflicts.push({
          key,
          kind: 'constraint',
          constraintType: task.constraintType,
          date,
        });
      }
    }
    if (
      task.deadline !== undefined &&
      task.end.getTime() > task.deadline.getTime() + EPSILON_MS
    ) {
      conflicts.push({ key, kind: 'deadline', date: task.deadline });
    }
  }
  return conflicts;
}

/** Total and free slack of one leaf task, in days. */
export interface GanttSlack {
  /** How far the task can slip without moving the project finish. */
  readonly totalSlack: number;
  /** How far it can slip without moving any successor. */
  readonly freeSlack: number;
}

function toDays(
  ms: number,
  from: Date,
  calendar: GanttWorkCalendar | undefined,
): number {
  if (calendar === undefined) return Math.round((ms / DAY_MS) * 100) / 100;
  if (Math.abs(ms) < EPSILON_MS) return 0;
  const to = new Date(from.getTime() + ms);
  return ms > 0
    ? workingDaysBetween(from, to, calendar)
    : -workingDaysBetween(to, from, calendar);
}

/**
 * Total / free slack per leaf task from the current dates (backward pass
 * from the project finish, lag-aware). On a calendar the values are working
 * days; otherwise calendar days rounded to two decimals.
 */
export function computeGanttSlack(
  tasks: readonly GanttTask[],
  dependencies: readonly GanttDependency[],
  calendar?: GanttCalendarInput,
): ReadonlyMap<RowKey, GanttSlack> {
  const calendarFor = calendarResolver(calendar);
  const graph = leafGraph(tasks, dependencies);
  const result = new Map<RowKey, GanttSlack>();
  if (graph.leaves.size === 0) return result;
  let projectFinish = -Infinity;
  for (const task of graph.leaves.values()) {
    projectFinish = Math.max(projectFinish, task.end.getTime());
  }
  const lateFinish = new Map<RowKey, number>();
  const lateDates = (key: RowKey): { start: Date; end: Date } => {
    const task = graph.leaves.get(key) as GanttTask;
    const finish = lateFinish.get(key) ?? projectFinish;
    const ms = task.end.getTime() - task.start.getTime();
    return { start: new Date(finish - ms), end: new Date(finish) };
  };
  for (let i = graph.order.length - 1; i >= 0; i--) {
    const key = graph.order[i];
    const task = graph.leaves.get(key) as GanttTask;
    const ms = task.end.getTime() - task.start.getTime();
    let finish = projectFinish;
    for (const link of graph.outgoing.get(key) ?? []) {
      if (!graph.leaves.has(link.successorKey)) continue;
      finish = Math.min(
        finish,
        linkFinishBound(
          link.type,
          link.lag,
          link.lagUnit,
          lateDates(link.successorKey),
          ms,
          calendarFor(task),
        ),
      );
    }
    lateFinish.set(key, finish);
  }
  for (const [key, task] of graph.leaves) {
    const taskCalendar = calendarFor(task);
    const totalMs = (lateFinish.get(key) ?? projectFinish) - task.end.getTime();
    let freeMs = totalMs;
    for (const link of graph.outgoing.get(key) ?? []) {
      const successor = graph.leaves.get(link.successorKey);
      if (successor === undefined) continue;
      const ms = task.end.getTime() - task.start.getTime();
      const bound = linkFinishBound(
        link.type,
        link.lag,
        link.lagUnit,
        successor,
        ms,
        taskCalendar,
      );
      freeMs = Math.min(freeMs, bound - task.end.getTime());
    }
    result.set(key, {
      totalSlack: toDays(totalMs, task.end, taskCalendar),
      freeSlack: toDays(Math.min(freeMs, totalMs), task.end, taskCalendar),
    });
  }
  return result;
}

/**
 * Critical path: the zero-slack task chain(s) that determine the project
 * finish (lag-aware backward pass). Summary tasks are never marked.
 */
export function criticalPathKeys(
  tasks: readonly GanttTask[],
  dependencies: readonly GanttDependency[],
): ReadonlySet<RowKey> {
  const slack = computeGanttSlack(tasks, dependencies);
  const critical = new Set<RowKey>();
  for (const [key, value] of slack) {
    if (value.totalSlack <= 0) critical.add(key);
  }
  return critical;
}

/**
 * Forward pass (1.x behaviour): walks the dependency graph and shifts every
 * successor that starts before its link allows (lag included), preserving
 * durations — never earlier. With a work calendar shifted starts roll onto
 * working days and durations are kept in working days. Returns only the
 * tasks that moved. `scheduleGanttProject` is the full engine.
 */
export function autoScheduleForward(
  tasks: readonly GanttTask[],
  dependencies: readonly GanttDependency[],
  calendar?: GanttCalendarInput,
): GanttScheduleChange[] {
  const calendarFor = calendarResolver(calendar);
  const graph = leafGraph(tasks, dependencies);
  const dates = new Map<RowKey, { start: Date; end: Date }>();
  for (const [key, task] of graph.leaves) {
    dates.set(key, { start: task.start, end: task.end });
  }
  const moved = new Map<RowKey, { start: Date; end: Date }>();
  for (const key of graph.order) {
    const task = graph.leaves.get(key) as GanttTask;
    const taskCalendar = calendarFor(task);
    const current = dates.get(key) as { start: Date; end: Date };
    const span = spanOf(current.start, current.end, taskCalendar);
    let minStart: number | null = null;
    for (const link of graph.incoming.get(key) ?? []) {
      const predecessor = dates.get(link.predecessorKey);
      if (predecessor === undefined) continue;
      const bound = linkStartBound(
        link.type,
        link.lag,
        link.lagUnit,
        predecessor,
        span.ms,
        taskCalendar,
      ).getTime();
      minStart = minStart === null ? bound : Math.max(minStart, bound);
    }
    if (minStart === null || current.start.getTime() >= minStart) continue;
    const next = placeAt(new Date(minStart), span, taskCalendar);
    if (next.start.getTime() <= current.start.getTime()) continue;
    dates.set(key, next);
    moved.set(key, next);
  }
  return [...moved.entries()].map(([key, value]) => ({ key, ...value }));
}
