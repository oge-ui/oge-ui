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
}

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
  readonly fieldNames: Readonly<
    Record<
      'title' | 'start' | 'end' | 'progress' | 'color' | 'resourceId',
      string | null
    >
  >;
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
  /** Planned (baseline) range rendered as an under-bar, when both parse. */
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
}

/** Normalizes a resource field value: scalar wraps, nullish empties. */
export function normalizeResourceIds(raw: unknown): readonly unknown[] {
  if (raw == null || raw === '') return [];
  return Array.isArray(raw) ? raw : [raw];
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
    fieldNames: {
      title: name(exprs.titleExpr),
      start: name(exprs.startExpr),
      end: name(exprs.endExpr),
      progress: name(exprs.progressExpr),
      color: name(exprs.colorExpr),
      resourceId: name(exprs.resourceIdExpr),
    },
  };
}

/**
 * Builds the visible task rows: tree index + flatten (collapsed keys hide
 * subtrees), normalization (invalid dates drop the row) and summary
 * roll-up — a summary task's start/end span its children and its progress
 * is the duration-weighted child mean, regardless of its own stored dates.
 */
export function buildGanttTasks<T>(
  items: readonly T[],
  fields: ResolvedGanttFields<T>,
  collapsedKeys: ReadonlySet<RowKey>,
): GanttTask<T>[] {
  const keyOf = (item: T): RowKey => fields.key(item) as RowKey;
  const index = buildTreeIndex(items, {
    keyOf,
    parentIdOf: (item) => fields.parentKey(item),
    orphanPolicy: 'promoteToRoot',
  });
  const nodes = flattenTreeData({
    index,
    keyOf,
    collapsedRowKeys: collapsedKeys,
  });

  // pass 1: normalize every present item (visible or not) for roll-up
  const byKey = new Map<RowKey, { start: Date; end: Date; progress: number }>();
  const childrenOf = new Map<RowKey | null, RowKey[]>();
  for (const item of items) {
    const start = toLocalDate(fields.start(item));
    if (start === null) continue;
    const endRaw = toLocalDate(fields.end(item));
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

  const tasks: GanttTask<T>[] = [];
  for (const node of nodes) {
    if (node.kind !== 'data') continue;
    const dates = rollup(node.key);
    if (dates === undefined) continue;
    const item = node.data;
    const colorRaw = fields.color(item);
    const baselineStart = toLocalDate(fields.baselineStart(item));
    const baselineEnd = toLocalDate(fields.baselineEnd(item));
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
      baselineStart:
        baselineStart !== null && baselineEnd !== null
          ? baselineStart
          : undefined,
      baselineEnd:
        baselineStart !== null && baselineEnd !== null
          ? baselineEnd
          : undefined,
      isMilestone:
        node.hasChildren !== true &&
        dates.start.getTime() === dates.end.getTime(),
      isSummary: node.hasChildren === true,
      expanded: node.expanded === true,
      hasChildren: node.hasChildren === true,
      resourceIds: normalizeResourceIds(fields.resourceId(item)),
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
}

/** Write-back patch preserving each field's storage shape. */
export function ganttTaskPatch<T>(
  original: T,
  change: GanttTaskChange,
  fields: ResolvedGanttFields<T>,
): Partial<T> {
  const patch: Record<string, unknown> = {};
  const names = fields.fieldNames;
  if (change.start !== undefined && names.start !== null) {
    patch[names.start] = serializeLikeOriginal(
      change.start,
      fields.start(original),
    );
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
  return patch as Partial<T>;
}

/* ---------------- dependencies ---------------- */

/** Dependency link types (RFC-of-Gantt-land: finish/start combinations). */
export type GanttDependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface GanttDependencyExprs<D> {
  readonly keyExpr: GanttFieldExpr<D>;
  readonly predecessorKeyExpr: GanttFieldExpr<D>;
  readonly successorKeyExpr: GanttFieldExpr<D>;
  readonly typeExpr: GanttFieldExpr<D>;
}

/** A normalized dependency link. */
export interface GanttDependency<D = unknown> {
  readonly key: RowKey;
  readonly source: D;
  readonly predecessorKey: RowKey;
  readonly successorKey: RowKey;
  readonly type: GanttDependencyType;
}

const DEPENDENCY_TYPES: ReadonlySet<string> = new Set(['FS', 'SS', 'FF', 'SF']);

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
