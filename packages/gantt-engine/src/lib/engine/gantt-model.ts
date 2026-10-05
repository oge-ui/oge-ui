/**
 * The normalized Gantt task/dependency model and the field-mapping layer.
 * Tasks form a tree through `@oge-ui/core`'s tree engine (`buildTreeIndex`
 * + `flattenTreeData` — the same kernel behind the tree list), dates
 * normalize via `toLocalDate` and write back via `serializeLikeOriginal`,
 * so string-dated stores round-trip without changing shape.
 */
import {
  buildTreeIndex,
  createFieldAccessor,
  flattenTreeData,
  serializeLikeOriginal,
  toLocalDate,
  type RowKey,
  type ValueAccessor,
} from '@oge-ui/core';

/** A task field accessor: a field name (dotted paths ok) or a getter. */
export type GanttFieldExpr<T> = string | ((item: T) => unknown);

/** The task `*Expr` bundle. */
export interface GanttTaskExprs<T> {
  readonly keyExpr: GanttFieldExpr<T>;
  readonly parentKeyExpr: GanttFieldExpr<T>;
  readonly titleExpr: GanttFieldExpr<T>;
  readonly startExpr: GanttFieldExpr<T>;
  readonly endExpr: GanttFieldExpr<T>;
  readonly progressExpr: GanttFieldExpr<T>;
  readonly colorExpr: GanttFieldExpr<T>;
  readonly baselineStartExpr: GanttFieldExpr<T>;
  readonly baselineEndExpr: GanttFieldExpr<T>;
  readonly resourceIdExpr: GanttFieldExpr<T>;
  /** Scheduling mode per task (`true` = auto-scheduling never moves it). */
  readonly manuallyScheduledExpr?: GanttFieldExpr<T>;
  readonly constraintTypeExpr?: GanttFieldExpr<T>;
  readonly constraintDateExpr?: GanttFieldExpr<T>;
  readonly deadlineExpr?: GanttFieldExpr<T>;
  /** Split-task pieces: `[{ start, end }, …]`. */
  readonly segmentsExpr?: GanttFieldExpr<T>;
  /** Baseline sets: `[{ start, end }, …]`, one entry per baseline. */
  readonly baselinesExpr?: GanttFieldExpr<T>;
  /** Assignment units in % — a number, an array per resource or a map. */
  readonly unitsExpr?: GanttFieldExpr<T>;
  /** Work in hours (effort-driven scheduling). */
  readonly effortExpr?: GanttFieldExpr<T>;
}

/** The task constraint types (MS Project vocabulary). */
export type GanttConstraintType =
  'ASAP' | 'ALAP' | 'SNET' | 'SNLT' | 'FNET' | 'FNLT' | 'MSO' | 'MFO';

/** Every constraint type, in MS Project's `ConstraintType` order 0–7. */
export const GANTT_CONSTRAINT_TYPES: readonly GanttConstraintType[] = [
  'ASAP',
  'ALAP',
  'MSO',
  'MFO',
  'SNET',
  'SNLT',
  'FNET',
  'FNLT',
];

/** Whether a constraint type is anchored to `constraintDate`. */
export function isDatedConstraint(type: GanttConstraintType): boolean {
  return type !== 'ASAP' && type !== 'ALAP';
}

/** One dated piece of a task: a split-task segment or a baseline. */
export interface GanttSegment {
  readonly start: Date;
  readonly end: Date;
}

type GanttFieldName =
  | 'title'
  | 'start'
  | 'end'
  | 'progress'
  | 'color'
  | 'resourceId'
  | 'parentKey'
  | 'manuallyScheduled'
  | 'constraintType'
  | 'constraintDate'
  | 'deadline'
  | 'segments'
  | 'baselines'
  | 'units'
  | 'effort'
  | 'baselineStart'
  | 'baselineEnd';

/** Resolved task accessors + write-back field names. */
export interface ResolvedGanttFields<T> {
  readonly key: ValueAccessor<T>;
  readonly parentKey: ValueAccessor<T>;
  readonly title: ValueAccessor<T>;
  readonly start: ValueAccessor<T>;
  readonly end: ValueAccessor<T>;
  readonly progress: ValueAccessor<T>;
  readonly color: ValueAccessor<T>;
  readonly baselineStart: ValueAccessor<T>;
  readonly baselineEnd: ValueAccessor<T>;
  readonly resourceId: ValueAccessor<T>;
  readonly manuallyScheduled: ValueAccessor<T>;
  readonly constraintType: ValueAccessor<T>;
  readonly constraintDate: ValueAccessor<T>;
  readonly deadline: ValueAccessor<T>;
  readonly segments: ValueAccessor<T>;
  readonly baselines: ValueAccessor<T>;
  readonly units: ValueAccessor<T>;
  readonly effort: ValueAccessor<T>;
  readonly fieldNames: Readonly<Record<GanttFieldName, string | null>>;
}

/** A normalized task row (already flattened in visible tree order). */
export interface GanttTask<T = unknown> {
  readonly key: RowKey;
  readonly source: T;
  readonly parentKey: RowKey | null;
  readonly level: number;
  readonly title: string;
  readonly start: Date;
  readonly end: Date;
  /** 0–100. */
  readonly progress: number;
  readonly color: string | undefined;
  /** First baseline (the legacy pair), when both dates parse. */
  readonly baselineStart: Date | undefined;
  readonly baselineEnd: Date | undefined;
  /** Zero-duration task rendered as a diamond. */
  readonly isMilestone: boolean;
  /** Has children: rendered as a bracket bar; dates/progress roll up. */
  readonly isSummary: boolean;
  readonly expanded: boolean;
  readonly hasChildren: boolean;
  /** Assigned resource ids, normalized to an array (scalar sources wrap). */
  readonly resourceIds: readonly unknown[];
  /** Outline number (`1.2.3`) from the store order — sorting never renumbers. */
  readonly wbs: string;
  /** `true` = auto-scheduling never moves this task. */
  readonly manuallyScheduled: boolean;
  /** The scheduling constraint; a dated type without a date reads as ASAP. */
  readonly constraintType: GanttConstraintType;
  readonly constraintDate: Date | undefined;
  /** Target finish: a marker, and an overdue state when the task ends later. */
  readonly deadline: Date | undefined;
  /** The pieces of a split task (two or more); `[]` for a single bar. */
  readonly segments: readonly GanttSegment[];
  /** Every baseline set (index = baseline number - 1). */
  readonly baselines: readonly GanttSegment[];
  /** Assignment units in %, aligned with `resourceIds` (default 100). */
  readonly units: readonly number[];
  /** Work in hours, when set (effort-driven scheduling). */
  readonly effort: number | undefined;
}

/** Normalizes a resource field value: scalar wraps, nullish empties. */
export function normalizeResourceIds(raw: unknown): readonly unknown[] {
  if (raw == null || raw === '') return [];
  return Array.isArray(raw) ? raw : [raw];
}

/** Parses `[{ start, end }, …]` (Date or local ISO strings); bad pieces drop. */
export function parseGanttSegments(raw: unknown): GanttSegment[] {
  if (!Array.isArray(raw)) return [];
  const result: GanttSegment[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const start = toLocalDate(record['start']);
    const end = toLocalDate(record['end']);
    if (start === null || end === null) continue;
    result.push(
      end.getTime() >= start.getTime() ? { start, end } : { start, end: start },
    );
  }
  return result;
}

/**
 * Normalizes assignment units (%) against the resource ids: a number applies
 * to every assignment, an array is positional, an object is keyed by the
 * resource id. Missing or invalid entries default to 100.
 */
export function normalizeGanttUnits(
  raw: unknown,
  resourceIds: readonly unknown[],
): number[] {
  const valid = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? value
      : 100;
  if (Array.isArray(raw)) return resourceIds.map((_, i) => valid(raw[i]));
  if (raw !== null && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    return resourceIds.map((id) => valid(record[String(id)]));
  }
  return resourceIds.map(() => valid(raw));
}

/** Reads a constraint type, case-insensitively; anything else is ASAP. */
export function parseGanttConstraintType(raw: unknown): GanttConstraintType {
  if (typeof raw !== 'string') return 'ASAP';
  const upper = raw.toUpperCase() as GanttConstraintType;
  return GANTT_CONSTRAINT_TYPES.includes(upper) ? upper : 'ASAP';
}

function toAccessor<T>(expr: GanttFieldExpr<T>): ValueAccessor<T> {
  return typeof expr === 'string'
    ? createFieldAccessor<T>(expr)
    : (expr as ValueAccessor<T>);
}

export function resolveGanttFields<T>(
  exprs: GanttTaskExprs<T>,
): ResolvedGanttFields<T> {
  const name = (expr: GanttFieldExpr<T>): string | null =>
    typeof expr === 'string' ? expr : null;
  const manuallyScheduled = exprs.manuallyScheduledExpr ?? 'manuallyScheduled';
  const constraintType = exprs.constraintTypeExpr ?? 'constraintType';
  const constraintDate = exprs.constraintDateExpr ?? 'constraintDate';
  const deadline = exprs.deadlineExpr ?? 'deadline';
  const segments = exprs.segmentsExpr ?? 'segments';
  const baselines = exprs.baselinesExpr ?? 'baselines';
  const units = exprs.unitsExpr ?? 'units';
  const effort = exprs.effortExpr ?? 'effort';
  return {
    key: toAccessor(exprs.keyExpr),
    parentKey: toAccessor(exprs.parentKeyExpr),
    title: toAccessor(exprs.titleExpr),
    start: toAccessor(exprs.startExpr),
    end: toAccessor(exprs.endExpr),
    progress: toAccessor(exprs.progressExpr),
    color: toAccessor(exprs.colorExpr),
    baselineStart: toAccessor(exprs.baselineStartExpr),
    baselineEnd: toAccessor(exprs.baselineEndExpr),
    resourceId: toAccessor(exprs.resourceIdExpr),
    manuallyScheduled: toAccessor(manuallyScheduled),
    constraintType: toAccessor(constraintType),
    constraintDate: toAccessor(constraintDate),
    deadline: toAccessor(deadline),
    segments: toAccessor(segments),
    baselines: toAccessor(baselines),
    units: toAccessor(units),
    effort: toAccessor(effort),
    fieldNames: {
      parentKey: name(exprs.parentKeyExpr),
      title: name(exprs.titleExpr),
      start: name(exprs.startExpr),
      end: name(exprs.endExpr),
      progress: name(exprs.progressExpr),
      color: name(exprs.colorExpr),
      resourceId: name(exprs.resourceIdExpr),
      manuallyScheduled: name(manuallyScheduled),
      constraintType: name(constraintType),
      constraintDate: name(constraintDate),
      deadline: name(deadline),
      segments: name(segments),
      baselines: name(baselines),
      units: name(units),
      effort: name(effort),
      baselineStart: name(exprs.baselineStartExpr),
      baselineEnd: name(exprs.baselineEndExpr),
    },
  };
}

/** View options of `buildGanttTasks` (task-list sort and filter). */
export interface GanttBuildOptions<T> {
  /**
   * The items in display order (column sort). Sibling order follows it; WBS
   * numbers keep following the store order.
   */
  readonly order?: readonly T[];
  /**
   * Only these keys render — a filter passes its matches plus their
   * ancestors; collapsed subtrees open while it applies.
   */
  readonly include?: ReadonlySet<RowKey> | null;
}

/**
 * Builds the visible task rows: tree index + flatten (collapsed keys hide
 * subtrees), normalization (invalid dates drop the row) and summary
 * roll-up — a summary task's start/end span its children and its progress
 * is the duration-weighted child mean, regardless of its own stored dates.
 * A split task (two or more `segments`) spans its pieces.
 */
export function buildGanttTasks<T>(
  items: readonly T[],
  fields: ResolvedGanttFields<T>,
  collapsedKeys: ReadonlySet<RowKey>,
  options: GanttBuildOptions<T> = {},
): GanttTask<T>[] {
  const keyOf = (item: T): RowKey => fields.key(item) as RowKey;
  const include = options.include ?? null;
  const index = buildTreeIndex(options.order ?? items, {
    keyOf,
    parentIdOf: (item) => fields.parentKey(item),
    orphanPolicy: 'promoteToRoot',
  });
  const nodes = flattenTreeData({
    index,
    keyOf,
    collapsedRowKeys: include !== null ? new Set() : collapsedKeys,
  });

  // pass 1: normalize every present item (visible or not) for roll-up
  const byKey = new Map<RowKey, { start: Date; end: Date; progress: number }>();
  const childrenOf = new Map<RowKey | null, RowKey[]>();
  const segmentsOf = new Map<RowKey, GanttSegment[]>();
  // store order (not view order): it drives the WBS numbers below
  for (const item of items) {
    const segments = parseGanttSegments(fields.segments(item));
    let start = toLocalDate(fields.start(item));
    let endRaw = toLocalDate(fields.end(item));
    if (segments.length > 1) {
      segments.sort((a, b) => a.start.getTime() - b.start.getTime());
      start = segments[0].start;
      endRaw = new Date(
        Math.max(...segments.map((segment) => segment.end.getTime())),
      );
      segmentsOf.set(keyOf(item), segments);
    }
    if (start === null) continue;
    const end =
      endRaw !== null && endRaw.getTime() >= start.getTime() ? endRaw : start;
    const rawProgress = fields.progress(item);
    const progress =
      typeof rawProgress === 'number' && Number.isFinite(rawProgress)
        ? Math.min(100, Math.max(0, rawProgress))
        : 0;
    const key = keyOf(item);
    byKey.set(key, { start, end, progress });
    const parent = index.parentOf.get(key) ?? null;
    const bucket = childrenOf.get(parent);
    if (bucket) bucket.push(key);
    else childrenOf.set(parent, [key]);
  }

  // pass 2: roll up summaries bottom-up (levels are finite; recurse)
  const rolled = new Map<
    RowKey,
    { start: Date; end: Date; progress: number }
  >();
  const rollup = (
    key: RowKey,
  ): { start: Date; end: Date; progress: number } | undefined => {
    const cached = rolled.get(key);
    if (cached !== undefined) return cached;
    const own = byKey.get(key);
    const childKeys = childrenOf.get(key);
    if (childKeys === undefined || childKeys.length === 0) {
      if (own !== undefined) rolled.set(key, own);
      return own;
    }
    let start: Date | null = null;
    let end: Date | null = null;
    let weighted = 0;
    let totalMs = 0;
    for (const childKey of childKeys) {
      const child = rollup(childKey);
      if (child === undefined) continue;
      if (start === null || child.start.getTime() < start.getTime()) {
        start = child.start;
      }
      if (end === null || child.end.getTime() > end.getTime()) {
        end = child.end;
      }
      const ms = Math.max(1, child.end.getTime() - child.start.getTime());
      weighted += child.progress * ms;
      totalMs += ms;
    }
    const result =
      start !== null && end !== null
        ? {
            start,
            end,
            progress: totalMs > 0 ? Math.round(weighted / totalMs) : 0,
          }
        : own;
    if (result !== undefined) rolled.set(key, result);
    return result;
  };

  // outline numbers follow the store order, so a column sort never renumbers
  const wbs = new Map<RowKey, string>();
  const number = (parent: RowKey | null, prefix: string): void => {
    (childrenOf.get(parent) ?? []).forEach((key, i) => {
      const label = prefix === '' ? String(i + 1) : `${prefix}.${i + 1}`;
      wbs.set(key, label);
      number(key, label);
    });
  };
  number(null, '');

  const tasks: GanttTask<T>[] = [];
  for (const node of nodes) {
    if (node.kind !== 'data') continue;
    if (include !== null && !include.has(node.key)) continue;
    const dates = rollup(node.key);
    if (dates === undefined) continue;
    const item = node.data;
    const colorRaw = fields.color(item);
    const legacyStart = toLocalDate(fields.baselineStart(item));
    const legacyEnd = toLocalDate(fields.baselineEnd(item));
    const parsedBaselines = parseGanttSegments(fields.baselines(item));
    const baselines =
      parsedBaselines.length > 0
        ? parsedBaselines
        : legacyStart !== null && legacyEnd !== null
          ? [{ start: legacyStart, end: legacyEnd }]
          : [];
    const resourceIds = normalizeResourceIds(fields.resourceId(item));
    const constraintDate = toLocalDate(fields.constraintDate(item));
    let constraintType = parseGanttConstraintType(fields.constraintType(item));
    if (isDatedConstraint(constraintType) && constraintDate === null) {
      constraintType = 'ASAP';
    }
    const effortRaw = fields.effort(item);
    const isSummary = node.hasChildren === true;
    tasks.push({
      key: node.key,
      source: item,
      parentKey: node.parentKey ?? null,
      level: node.level,
      title: String(fields.title(item) ?? ''),
      start: dates.start,
      end: dates.end,
      progress: dates.progress,
      color:
        typeof colorRaw === 'string' && colorRaw !== '' ? colorRaw : undefined,
      baselineStart: baselines[0]?.start,
      baselineEnd: baselines[0]?.end,
      isMilestone:
        !isSummary && dates.start.getTime() === dates.end.getTime(),
      isSummary,
      expanded: node.expanded === true,
      hasChildren: isSummary,
      resourceIds,
      wbs: wbs.get(node.key) ?? '',
      manuallyScheduled: fields.manuallyScheduled(item) === true,
      constraintType,
      constraintDate: constraintDate ?? undefined,
      deadline: toLocalDate(fields.deadline(item)) ?? undefined,
      segments: isSummary ? [] : (segmentsOf.get(node.key) ?? []),
      baselines,
      units: normalizeGanttUnits(fields.units(item), resourceIds),
      effort:
        typeof effortRaw === 'number' && Number.isFinite(effortRaw)
          ? effortRaw
          : undefined,
    });
  }
  return tasks;
}

/** A date/progress change produced by editing or gestures. */
export interface GanttTaskChange {
  readonly start?: Date;
  readonly end?: Date;
  readonly progress?: number;
  readonly title?: string;
  readonly color?: string;
  readonly resourceIds?: readonly unknown[];
  readonly segments?: readonly GanttSegment[];
  readonly baselines?: readonly GanttSegment[];
  readonly units?: number | readonly number[];
  readonly effort?: number;
  readonly manuallyScheduled?: boolean;
  readonly constraintType?: GanttConstraintType;
  /** `null` clears the date. */
  readonly constraintDate?: Date | null;
  /** `null` clears the deadline. */
  readonly deadline?: Date | null;
}

function serializeSegments(
  segments: readonly GanttSegment[],
  sample: unknown,
): { start: unknown; end: unknown }[] {
  return segments.map((segment) => ({
    start: serializeLikeOriginal(segment.start, sample),
    end: serializeLikeOriginal(segment.end, sample),
  }));
}

/** The stored date shape of a `[{ start }]` field, else of the start field. */
function segmentSample(raw: unknown, fallback: unknown): unknown {
  if (Array.isArray(raw) && raw[0] !== null && typeof raw[0] === 'object') {
    return (raw[0] as Record<string, unknown>)['start'];
  }
  return fallback;
}

/** Write-back patch preserving each field's storage shape. */
export function ganttTaskPatch<T>(
  original: T,
  change: GanttTaskChange,
  fields: ResolvedGanttFields<T>,
): Partial<T> {
  const patch: Record<string, unknown> = {};
  const names = fields.fieldNames;
  const startSample = fields.start(original);
  if (change.start !== undefined && names.start !== null) {
    patch[names.start] = serializeLikeOriginal(change.start, startSample);
  }
  if (change.end !== undefined && names.end !== null) {
    patch[names.end] = serializeLikeOriginal(change.end, fields.end(original));
  }
  if (change.progress !== undefined && names.progress !== null) {
    patch[names.progress] = Math.min(100, Math.max(0, change.progress));
  }
  if (change.title !== undefined && names.title !== null) {
    patch[names.title] = change.title;
  }
  if (change.color !== undefined && names.color !== null) {
    patch[names.color] = change.color;
  }
  if (change.resourceIds !== undefined && names.resourceId !== null) {
    // preserve the storage shape: array stores stay arrays; scalar (or
    // absent) stores stay scalar while at most one id is assigned
    const originalRaw = fields.resourceId(original);
    patch[names.resourceId] =
      Array.isArray(originalRaw) || change.resourceIds.length > 1
        ? [...change.resourceIds]
        : (change.resourceIds[0] ?? null);
  }
  if (change.segments !== undefined && names.segments !== null) {
    const raw = fields.segments(original);
    patch[names.segments] = serializeSegments(
      change.segments,
      segmentSample(raw, startSample),
    );
  }
  if (change.baselines !== undefined && names.baselines !== null) {
    const raw = fields.baselines(original);
    patch[names.baselines] = serializeSegments(
      change.baselines,
      segmentSample(raw, startSample),
    );
  }
  if (change.units !== undefined && names.units !== null) {
    patch[names.units] =
      typeof change.units === 'number' ? change.units : [...change.units];
  }
  if (change.effort !== undefined && names.effort !== null) {
    patch[names.effort] = change.effort;
  }
  if (
    change.manuallyScheduled !== undefined &&
    names.manuallyScheduled !== null
  ) {
    patch[names.manuallyScheduled] = change.manuallyScheduled;
  }
  if (change.constraintType !== undefined && names.constraintType !== null) {
    patch[names.constraintType] = change.constraintType;
  }
  if (change.constraintDate !== undefined && names.constraintDate !== null) {
    patch[names.constraintDate] = serializeLikeOriginal(
      change.constraintDate,
      fields.constraintDate(original) ?? startSample,
    );
  }
  if (change.deadline !== undefined && names.deadline !== null) {
    patch[names.deadline] = serializeLikeOriginal(
      change.deadline,
      fields.deadline(original) ?? startSample,
    );
  }
  return patch as Partial<T>;
}

/* ---------------- dependencies ---------------- */

/** Dependency link types (RFC-of-Gantt-land: finish/start combinations). */
export type GanttDependencyType = 'FS' | 'SS' | 'FF' | 'SF';

/** Unit of a dependency lag. */
export type GanttLagUnit = 'days' | 'hours';

export interface GanttDependencyExprs<D> {
  readonly keyExpr: GanttFieldExpr<D>;
  readonly predecessorKeyExpr: GanttFieldExpr<D>;
  readonly successorKeyExpr: GanttFieldExpr<D>;
  readonly typeExpr: GanttFieldExpr<D>;
  /** Lag amount (negative = lead); default field `lag`. */
  readonly lagExpr?: GanttFieldExpr<D>;
  /** `'days'` (working days on a calendar) or `'hours'`; default `lagUnit`. */
  readonly lagUnitExpr?: GanttFieldExpr<D>;
}

/** A normalized dependency link. */
export interface GanttDependency<D = unknown> {
  readonly key: RowKey;
  readonly source: D;
  readonly predecessorKey: RowKey;
  readonly successorKey: RowKey;
  readonly type: GanttDependencyType;
  /** Lag (positive) or lead (negative) in `lagUnit`; 0 without one. */
  readonly lag: number;
  readonly lagUnit: GanttLagUnit;
}

const DEPENDENCY_TYPES: ReadonlySet<string> = new Set(['FS', 'SS', 'FF', 'SF']);

/** Reads a lag value: finite numbers and numeric strings; anything else 0. */
export function parseGanttLag(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  }
  return 0;
}

/**
 * Normalizes dependency items; links referencing unknown tasks or carrying
 * an unsupported type are dropped (never rendered half-broken).
 */
export function buildGanttDependencies<D>(
  items: readonly D[],
  exprs: GanttDependencyExprs<D>,
  taskKeys: ReadonlySet<RowKey>,
): GanttDependency<D>[] {
  const key = toAccessor(exprs.keyExpr);
  const predecessor = toAccessor(exprs.predecessorKeyExpr);
  const successor = toAccessor(exprs.successorKeyExpr);
  const type = toAccessor(exprs.typeExpr);
  const lagOf = toAccessor(exprs.lagExpr ?? 'lag');
  const lagUnitOf = toAccessor(exprs.lagUnitExpr ?? 'lagUnit');
  const result: GanttDependency<D>[] = [];
  items.forEach((item, index) => {
    const from = predecessor(item) as RowKey;
    const to = successor(item) as RowKey;
    if (!taskKeys.has(from) || !taskKeys.has(to) || from === to) return;
    const rawType = type(item);
    const linkType =
      typeof rawType === 'string' && DEPENDENCY_TYPES.has(rawType)
        ? (rawType as GanttDependencyType)
        : 'FS';
    result.push({
      key: (key(item) as RowKey) ?? index,
      source: item,
      predecessorKey: from,
      successorKey: to,
      type: linkType,
      lag: parseGanttLag(lagOf(item)),
      lagUnit: lagUnitOf(item) === 'hours' ? 'hours' : 'days',
    });
  });
  return result;
}

/**
 * Whether adding `from → to` would close a cycle over the existing links
 * (successor-direction DFS from `to` looking for `from`).
 */
export function wouldCreateCycle(
  dependencies: readonly GanttDependency[],
  from: RowKey,
  to: RowKey,
): boolean {
  if (from === to) return true;
  const successorsOf = new Map<RowKey, RowKey[]>();
  for (const dep of dependencies) {
    const bucket = successorsOf.get(dep.predecessorKey);
    if (bucket) bucket.push(dep.successorKey);
    else successorsOf.set(dep.predecessorKey, [dep.successorKey]);
  }
  const stack = [to];
  const seen = new Set<RowKey>();
  while (stack.length > 0) {
    const current = stack.pop() as RowKey;
    if (current === from) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of successorsOf.get(current) ?? []) stack.push(next);
  }
  return false;
}
