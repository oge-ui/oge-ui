/**
 * The normalized card model and the field-mapping layer between user data
 * (arbitrary item shapes addressed via `*Expr` accessors) and the board
 * engine: column derivation, swimlane grouping, in-column ordering, search
 * filtering and write-back patches that preserve the storage shape. Pure.
 */
import {
  createFieldAccessor,
  foldText,
  toLocalDate,
  type ValueAccessor,
} from '@oge-ui/core';

/** A user item's field accessors: a field name (dotted paths ok) or a getter. */
export type KanbanFieldExpr<T, V> = string | ((item: T) => V);

/** The `*Expr` bundle mapping user items onto the card model. */
export interface KanbanFieldExprs<T> {
  readonly keyExpr: KanbanFieldExpr<T, unknown>;
  readonly columnExpr: KanbanFieldExpr<T, unknown>;
  readonly titleExpr: KanbanFieldExpr<T, unknown>;
  readonly descriptionExpr: KanbanFieldExpr<T, unknown>;
  readonly colorExpr: KanbanFieldExpr<T, unknown>;
  /** In-column sort order; `undefined` = the array order is the board order. */
  readonly orderExpr: KanbanFieldExpr<T, unknown> | undefined;
  readonly swimlaneExpr: KanbanFieldExpr<T, unknown> | undefined;
  readonly tagsExpr: KanbanFieldExpr<T, unknown> | undefined;
  readonly assigneeExpr: KanbanFieldExpr<T, unknown> | undefined;
  readonly dueDateExpr: KanbanFieldExpr<T, unknown> | undefined;
  readonly priorityExpr: KanbanFieldExpr<T, unknown> | undefined;
}

export type KanbanFieldKey =
  | 'key'
  | 'column'
  | 'title'
  | 'description'
  | 'color'
  | 'order'
  | 'swimlane'
  | 'tags'
  | 'assignee'
  | 'dueDate'
  | 'priority';

/** Resolved accessor set (see `resolveKanbanFields`). */
export interface ResolvedKanbanFields<T> {
  readonly key: ValueAccessor<T>;
  readonly column: ValueAccessor<T>;
  readonly title: ValueAccessor<T>;
  readonly description: ValueAccessor<T>;
  readonly color: ValueAccessor<T>;
  readonly order: ValueAccessor<T> | undefined;
  readonly swimlane: ValueAccessor<T> | undefined;
  readonly tags: ValueAccessor<T> | undefined;
  readonly assignee: ValueAccessor<T> | undefined;
  readonly dueDate: ValueAccessor<T> | undefined;
  readonly priority: ValueAccessor<T> | undefined;
  /** Field names for write-back; `null` when the expr is a function or unset. */
  readonly fieldNames: Readonly<Record<KanbanFieldKey, string | null>>;
}

/**
 * A user item normalized into the board's shape. `source` keeps the original
 * item so events and write-backs can hand it back unchanged.
 */
export interface KanbanCard<T = unknown> {
  readonly key: unknown;
  readonly source: T;
  /** Position in the original `dataSource` array (the no-`orderExpr` order). */
  readonly sourceIndex: number;
  readonly column: string;
  readonly title: string;
  readonly description: string | undefined;
  readonly color: string | undefined;
  /** Numeric `orderExpr` value; `null` = fall back to `sourceIndex`. */
  readonly order: number | null;
  readonly swimlane: string | null;
  readonly tags: readonly string[];
  readonly assignees: readonly string[];
  readonly dueDate: Date | null;
  readonly priority: string | null;
}

/** A column definition; board-level input or derived from the data. */
export interface KanbanColumnDef {
  readonly key: string;
  readonly title?: string;
  readonly color?: string;
  /** Soft work-in-progress limit; the badge turns danger when exceeded. */
  readonly wipLimit?: number;
  /** Soft lower bound; the badge turns to the warning tone when underfilled. */
  readonly minCount?: number;
  readonly collapsed?: boolean;
  /** Per-column override of the board's `allowAdding`. */
  readonly allowAdding?: boolean;
  /** `false` = cards may not be dragged *out* of this column. */
  readonly allowDrag?: boolean;
  /** `false` = cards may not be dropped *into* this column. */
  readonly allowDrop?: boolean;
  /** Legal target column keys for cards leaving this column; unset = all. */
  readonly transitionColumns?: readonly string[];
}

/** One column's ordered card list inside one swimlane. */
export interface KanbanColumnGroup<T = unknown> {
  readonly column: KanbanColumnDef;
  readonly cards: readonly KanbanCard<T>[];
}

/** One swimlane row of the board; `key === null` is the single implicit lane. */
export interface KanbanSwimlane<T = unknown> {
  readonly key: string | null;
  readonly columns: readonly KanbanColumnGroup<T>[];
  /** Total cards in the lane (across all its columns). */
  readonly count: number;
}

/** A `*Expr` (field name or getter) as a callable accessor. */
export function toKanbanAccessor<T>(
  expr: KanbanFieldExpr<T, unknown>,
): ValueAccessor<T> {
  return typeof expr === 'string'
    ? createFieldAccessor<T>(expr)
    : (expr as ValueAccessor<T>);
}

const toAccessor = toKanbanAccessor;

/** Resolves every `*Expr` into a callable accessor + write-back field names. */
export function resolveKanbanFields<T>(
  exprs: KanbanFieldExprs<T>,
): ResolvedKanbanFields<T> {
  const name = (
    expr: KanbanFieldExpr<T, unknown> | undefined,
  ): string | null => (typeof expr === 'string' ? expr : null);
  const optional = (
    expr: KanbanFieldExpr<T, unknown> | undefined,
  ): ValueAccessor<T> | undefined =>
    expr === undefined ? undefined : toAccessor(expr);
  return {
    key: toAccessor(exprs.keyExpr),
    column: toAccessor(exprs.columnExpr),
    title: toAccessor(exprs.titleExpr),
    description: toAccessor(exprs.descriptionExpr),
    color: toAccessor(exprs.colorExpr),
    order: optional(exprs.orderExpr),
    swimlane: optional(exprs.swimlaneExpr),
    tags: optional(exprs.tagsExpr),
    assignee: optional(exprs.assigneeExpr),
    dueDate: optional(exprs.dueDateExpr),
    priority: optional(exprs.priorityExpr),
    fieldNames: {
      key: name(exprs.keyExpr),
      column: name(exprs.columnExpr),
      title: name(exprs.titleExpr),
      description: name(exprs.descriptionExpr),
      color: name(exprs.colorExpr),
      order: name(exprs.orderExpr),
      swimlane: name(exprs.swimlaneExpr),
      tags: name(exprs.tagsExpr),
      assignee: name(exprs.assigneeExpr),
      dueDate: name(exprs.dueDateExpr),
      priority: name(exprs.priorityExpr),
    },
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** `assigneeExpr` / `tagsExpr` accept a single value or an array (dx parity). */
function asStringList(value: unknown): readonly string[] {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((entry) => (entry == null ? '' : String(entry)))
    .filter((entry) => entry !== '');
}

/**
 * Normalizes one user item. A card with no resolvable column key lands in
 * `''` (the untitled column) rather than being dropped — losing cards
 * silently is worse than showing a stray column.
 */
export function normalizeCard<T>(
  item: T,
  sourceIndex: number,
  fields: ResolvedKanbanFields<T>,
): KanbanCard<T> {
  const orderRaw = fields.order?.(item);
  const swimlaneRaw = fields.swimlane?.(item);
  const priorityRaw = fields.priority?.(item);
  return {
    key: fields.key(item),
    source: item,
    sourceIndex,
    column: asString(fields.column(item)) ?? '',
    title: asString(fields.title(item)) ?? '',
    description: asString(fields.description(item)),
    color: asString(fields.color(item)),
    order:
      typeof orderRaw === 'number' && Number.isFinite(orderRaw)
        ? orderRaw
        : null,
    swimlane:
      asString(swimlaneRaw) ??
      (swimlaneRaw == null ? null : String(swimlaneRaw)),
    tags: fields.tags ? asStringList(fields.tags(item)) : [],
    assignees: fields.assignee ? asStringList(fields.assignee(item)) : [],
    dueDate: fields.dueDate ? toLocalDate(fields.dueDate(item)) : null,
    priority:
      priorityRaw == null || priorityRaw === '' ? null : String(priorityRaw),
  };
}

/** Normalizes the whole data source, preserving array positions. */
export function normalizeCards<T>(
  items: readonly T[],
  fields: ResolvedKanbanFields<T>,
): KanbanCard<T>[] {
  return items.map((item, index) => normalizeCard(item, index, fields));
}

/**
 * The effective column list: the declared columns when given, otherwise
 * derived from the cards' distinct column keys in first-seen order.
 */
export function deriveColumns<T>(
  declared: readonly KanbanColumnDef[] | undefined,
  cards: readonly KanbanCard<T>[],
): KanbanColumnDef[] {
  if (declared !== undefined && declared.length > 0) return [...declared];
  const seen = new Set<string>();
  const derived: KanbanColumnDef[] = [];
  for (const card of cards) {
    if (seen.has(card.column)) continue;
    seen.add(card.column);
    derived.push({ key: card.column, title: card.column });
  }
  return derived;
}

/** Applies a persisted column order (unknown keys keep their position at the end). */
export function orderColumns(
  columns: readonly KanbanColumnDef[],
  columnOrder: readonly string[] | undefined,
): KanbanColumnDef[] {
  if (columnOrder === undefined || columnOrder.length === 0) {
    return [...columns];
  }
  const rank = new Map(columnOrder.map((key, index) => [key, index]));
  return [...columns].sort(
    (a, b) =>
      (rank.get(a.key) ?? columnOrder.length) -
      (rank.get(b.key) ?? columnOrder.length),
  );
}

/** In-column comparator: `orderExpr` value, then source position (stable). */
function compareCards(a: KanbanCard, b: KanbanCard): number {
  const orderA = a.order ?? a.sourceIndex;
  const orderB = b.order ?? b.sourceIndex;
  return orderA - orderB || a.sourceIndex - b.sourceIndex;
}

/**
 * Groups cards into swimlane × column cells, each cell ordered. Without a
 * `swimlaneExpr` every card lands in the single `key: null` lane. Swimlanes
 * appear in first-seen data order; cards in a column the board does not
 * declare are dropped from the view (they stay in the data).
 */
export function groupBoard<T>(
  cards: readonly KanbanCard<T>[],
  columns: readonly KanbanColumnDef[],
  hasSwimlanes: boolean,
): KanbanSwimlane<T>[] {
  const laneKeys: (string | null)[] = [];
  const lanes = new Map<string | null, Map<string, KanbanCard<T>[]>>();
  const columnKeys = new Set(columns.map((column) => column.key));
  for (const card of cards) {
    if (!columnKeys.has(card.column)) continue;
    const laneKey = hasSwimlanes ? card.swimlane : null;
    let lane = lanes.get(laneKey);
    if (lane === undefined) {
      lane = new Map();
      lanes.set(laneKey, lane);
      laneKeys.push(laneKey);
    }
    const cell = lane.get(card.column);
    if (cell === undefined) lane.set(card.column, [card]);
    else cell.push(card);
  }
  if (laneKeys.length === 0) laneKeys.push(null);
  return laneKeys.map((laneKey) => {
    const lane = lanes.get(laneKey);
    let count = 0;
    const cells = columns.map((column) => {
      const cell = lane?.get(column.key) ?? [];
      cell.sort(compareCards);
      count += cell.length;
      return { column, cards: cell };
    });
    return { key: laneKey, columns: cells, count };
  });
}

/**
 * Fold-matched search over the given accessors (defaults: title +
 * description + tags + assignees). An empty query returns the input array.
 */
export function filterCards<T>(
  cards: readonly KanbanCard<T>[],
  query: string,
  extraAccessors?: readonly ValueAccessor<T>[],
): readonly KanbanCard<T>[] {
  const needle = foldText(query.trim());
  if (needle === '') return cards;
  return cards.filter((card) => {
    const haystack = [
      card.title,
      card.description ?? '',
      ...card.tags,
      ...card.assignees,
    ];
    if (extraAccessors !== undefined) {
      for (const accessor of extraAccessors) {
        const value = accessor(card.source);
        if (value != null) haystack.push(String(value));
      }
    }
    return haystack.some((text) => foldText(text).includes(needle));
  });
}

/** The target of a card move: column, lane and the in-cell insertion index. */
export interface KanbanMoveTarget {
  readonly column: string;
  readonly swimlane: string | null;
  /** Insertion index into the target cell's ordered card list. */
  readonly index: number;
}

/**
 * The `orderExpr` value for inserting between `prev` and `next` (either may
 * be `null` at the edges): the midpoint, or an integer step at the ends.
 * Returns `null` when the midpoint collides with a neighbour — the caller
 * must renumber the cell (see `renumberPatches`).
 */
export function orderBetween(
  prev: number | null,
  next: number | null,
): number | null {
  if (prev === null && next === null) return 0;
  if (prev === null) return (next as number) - 1;
  if (next === null) return prev + 1;
  const mid = (prev + next) / 2;
  return mid > prev && mid < next ? mid : null;
}

/**
 * Deep-sets `path` (dotted) on a shallow clone chain of `source`, so the
 * original item is never mutated. Missing intermediate objects are created.
 */
export function withFieldValue<T>(source: T, path: string, value: unknown): T {
  const segments = path.split('.');
  const root: Record<string, unknown> = {
    ...(source as Record<string, unknown>),
  };
  let cursor = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const next = cursor[segment];
    cursor[segment] =
      typeof next === 'object' && next !== null
        ? { ...(next as Record<string, unknown>) }
        : {};
    cursor = cursor[segment] as Record<string, unknown>;
  }
  cursor[segments[segments.length - 1]] = value;
  return root as T;
}

/**
 * A moved card's updated source item: column (always), swimlane (when
 * mapped) and `orderExpr` value (when mapped and provided). Function exprs
 * have no field name — those fields are skipped and the caller's
 * past-tense event payload is the only record of the change.
 */
export function applyMoveToItem<T>(
  card: KanbanCard<T>,
  target: KanbanMoveTarget,
  order: number | null,
  fields: ResolvedKanbanFields<T>,
): T {
  let item = card.source;
  const names = fields.fieldNames;
  if (names.column !== null) {
    item = withFieldValue(item, names.column, target.column);
  }
  if (names.swimlane !== null && target.swimlane !== null) {
    item = withFieldValue(item, names.swimlane, target.swimlane);
  }
  if (names.order !== null && order !== null) {
    item = withFieldValue(item, names.order, order);
  }
  return item;
}

/**
 * Sequential renumber patches (0, 1, 2, …) for one cell's cards — the
 * fallback when `orderBetween` has no room left. Returns `[card, order]`
 * pairs for every card whose stored order differs.
 */
export function renumberPatches<T>(
  cards: readonly KanbanCard<T>[],
): [KanbanCard<T>, number][] {
  const patches: [KanbanCard<T>, number][] = [];
  cards.forEach((card, index) => {
    if (card.order !== index) patches.push([card, index]);
  });
  return patches;
}
