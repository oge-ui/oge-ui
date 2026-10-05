/**
 * Card filtering and per-column sorting: the programmatic `filter` (a
 * predicate or a declarative expression), the filter chip bar's choices and
 * toggles, and the `columnSort` comparators applied to each grouped cell.
 * Both render layers derive the visible board through these. Pure.
 */
import { foldText } from '@oge-ui/core';
import type { KanbanCard, KanbanSwimlane } from './board-model';
import { isKanbanOverdue } from './board-view';

/**
 * A declarative card filter. Inside one field the values are alternatives
 * (any of), across fields every set field must match (all of) — the usual
 * chip-filter semantics. Unset or empty fields do not filter.
 */
export interface OgeKanbanFilterExpression {
  /** Cards carrying at least one of these tags. */
  readonly tags?: readonly string[];
  /** Cards assigned to at least one of these people. */
  readonly assignees?: readonly string[];
  /** Cards with one of these priorities. */
  readonly priorities?: readonly string[];
  /** Cards in one of these columns. */
  readonly columns?: readonly string[];
  /** Cards in one of these swimlanes. */
  readonly swimlanes?: readonly string[];
  /** Fold-insensitive text over title, description, tags and assignees. */
  readonly text?: string;
  /** `true` = only overdue cards; `false` = only cards that are not overdue. */
  readonly overdue?: boolean;
}

/** The board's programmatic filter: a card predicate or an expression. */
export type OgeKanbanFilter<T = unknown> =
  ((card: KanbanCard<T>) => boolean) | OgeKanbanFilterExpression;

/** The chip groups of the filter bar. */
export type OgeKanbanFilterChipKind = 'tags' | 'assignees' | 'priorities';

const anyOf = (
  wanted: readonly string[] | undefined,
  values: readonly string[],
): boolean =>
  wanted === undefined ||
  wanted.length === 0 ||
  values.some((value) => wanted.includes(value));

/** Whether an expression filters nothing at all. */
export function isKanbanFilterEmpty(
  expression: OgeKanbanFilterExpression | null | undefined,
): boolean {
  if (expression == null) return true;
  return (
    !expression.tags?.length &&
    !expression.assignees?.length &&
    !expression.priorities?.length &&
    !expression.columns?.length &&
    !expression.swimlanes?.length &&
    (expression.text ?? '').trim() === '' &&
    expression.overdue === undefined
  );
}

/**
 * Compiles a filter (predicate or expression) into a card predicate;
 * `null` when it filters nothing, so the caller can skip the pass.
 */
export function compileKanbanFilter<T>(
  filter: OgeKanbanFilter<T> | null | undefined,
  now: Date = new Date(),
): ((card: KanbanCard<T>) => boolean) | null {
  if (filter == null) return null;
  if (typeof filter === 'function') return filter;
  if (isKanbanFilterEmpty(filter)) return null;
  const needle = foldText((filter.text ?? '').trim());
  return (card) => {
    if (!anyOf(filter.tags, card.tags)) return false;
    if (!anyOf(filter.assignees, card.assignees)) return false;
    if (
      filter.priorities?.length &&
      (card.priority === null || !filter.priorities.includes(card.priority))
    ) {
      return false;
    }
    if (filter.columns?.length && !filter.columns.includes(card.column)) {
      return false;
    }
    if (
      filter.swimlanes?.length &&
      (card.swimlane === null || !filter.swimlanes.includes(card.swimlane))
    ) {
      return false;
    }
    if (filter.overdue !== undefined) {
      const overdue =
        card.dueDate !== null && isKanbanOverdue(card.dueDate, now);
      if (overdue !== filter.overdue) return false;
    }
    if (needle !== '') {
      const haystack = [
        card.title,
        card.description ?? '',
        ...card.tags,
        ...card.assignees,
      ];
      if (!haystack.some((text) => foldText(text).includes(needle))) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Applies every predicate in order (`null` entries are skipped). Returns the
 * input array itself when nothing filters, so memoized views stay stable.
 */
export function applyKanbanFilters<T>(
  cards: readonly KanbanCard<T>[],
  predicates: readonly (((card: KanbanCard<T>) => boolean) | null)[],
): readonly KanbanCard<T>[] {
  const active = predicates.filter(
    (entry): entry is (card: KanbanCard<T>) => boolean => entry !== null,
  );
  if (active.length === 0) return cards;
  return cards.filter((card) => active.every((test) => test(card)));
}

/** The values each chip group offers, in first-seen data order. */
export interface KanbanFilterChoices {
  readonly tags: readonly string[];
  readonly assignees: readonly string[];
  readonly priorities: readonly string[];
}

/** The chip bar's choices: the distinct tags, assignees and priorities. */
export function kanbanFilterChoices<T>(
  cards: readonly KanbanCard<T>[],
): KanbanFilterChoices {
  const tags = new Set<string>();
  const assignees = new Set<string>();
  const priorities = new Set<string>();
  for (const card of cards) {
    for (const tag of card.tags) tags.add(tag);
    for (const person of card.assignees) assignees.add(person);
    if (card.priority !== null) priorities.add(card.priority);
  }
  return {
    tags: [...tags],
    assignees: [...assignees],
    priorities: [...priorities],
  };
}

/** Whether `value` is an active chip of `kind` in the expression. */
export function isKanbanFilterChipActive(
  expression: OgeKanbanFilterExpression,
  kind: OgeKanbanFilterChipKind,
  value: string,
): boolean {
  return expression[kind]?.includes(value) ?? false;
}

/** Toggles one chip; returns a new expression (the input is never mutated). */
export function toggleKanbanFilterChip(
  expression: OgeKanbanFilterExpression,
  kind: OgeKanbanFilterChipKind,
  value: string,
): OgeKanbanFilterExpression {
  const current = expression[kind] ?? [];
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];
  return { ...expression, [kind]: next };
}

/* ---------------- per-column sort ---------------- */

/** What a column sorts its cards by; `'order'` is the board's own order. */
export type OgeKanbanSortField = 'order' | 'title' | 'priority' | 'dueDate';

/** One column's sort: a field + direction, or a comparator. */
export type OgeKanbanColumnSortSpec<T = unknown> =
  | {
      readonly field: OgeKanbanSortField;
      readonly direction?: 'asc' | 'desc';
    }
  | ((a: KanbanCard<T>, b: KanbanCard<T>) => number);

/** `columnSort`: per column key; a `'*'` entry applies to every other column. */
export type OgeKanbanColumnSort<T = unknown> = Readonly<
  Record<string, OgeKanbanColumnSortSpec<T>>
>;

/**
 * The default priority ranking (highest first), matched case-insensitively;
 * numeric priorities compare as numbers (larger = higher).
 */
export const KANBAN_DEFAULT_PRIORITY_ORDER: readonly string[] = [
  'urgent',
  'critical',
  'highest',
  'high',
  'medium',
  'normal',
  'low',
  'lowest',
];

/**
 * A priority's rank — lower is more important. Unknown strings rank after
 * every known one (alphabetically among themselves via the comparator);
 * `null` ranks last.
 */
export function kanbanPriorityRank(
  priority: string | null,
  order: readonly string[] = KANBAN_DEFAULT_PRIORITY_ORDER,
): number {
  if (priority === null) return Number.POSITIVE_INFINITY;
  const numeric = Number(priority);
  if (priority.trim() !== '' && Number.isFinite(numeric)) return -numeric;
  const index = order.findIndex(
    (entry) => entry.toLowerCase() === priority.toLowerCase(),
  );
  return index >= 0 ? index : order.length;
}

/** The board's own in-cell order (`orderExpr`, then data position). */
function compareOrder(a: KanbanCard, b: KanbanCard): number {
  const orderA = a.order ?? a.sourceIndex;
  const orderB = b.order ?? b.sourceIndex;
  return orderA - orderB || a.sourceIndex - b.sourceIndex;
}

/**
 * The comparator of one column's sort spec. Ascending priority means the
 * most important first; empty due dates sort last in both directions.
 */
export function kanbanSortComparer<T>(
  spec: OgeKanbanColumnSortSpec<T>,
  locale?: string,
  priorityOrder?: readonly string[],
): (a: KanbanCard<T>, b: KanbanCard<T>) => number {
  if (typeof spec === 'function') {
    return (a, b) => spec(a, b) || compareOrder(a, b);
  }
  const sign = spec.direction === 'desc' ? -1 : 1;
  switch (spec.field) {
    case 'title':
      return (a, b) =>
        sign *
          a.title.localeCompare(b.title, locale, { sensitivity: 'base' }) ||
        compareOrder(a, b);
    case 'priority':
      return (a, b) => {
        const rankA = kanbanPriorityRank(a.priority, priorityOrder);
        const rankB = kanbanPriorityRank(b.priority, priorityOrder);
        if (rankA === rankB) {
          return (
            (a.priority ?? '').localeCompare(b.priority ?? '', locale) ||
            compareOrder(a, b)
          );
        }
        if (!Number.isFinite(rankA)) return 1;
        if (!Number.isFinite(rankB)) return -1;
        return sign * (rankA - rankB);
      };
    case 'dueDate':
      return (a, b) => {
        if (a.dueDate === null && b.dueDate === null) return compareOrder(a, b);
        if (a.dueDate === null) return 1;
        if (b.dueDate === null) return -1;
        return (
          sign * (a.dueDate.getTime() - b.dueDate.getTime()) ||
          compareOrder(a, b)
        );
      };
    default:
      return (a, b) => sign * compareOrder(a, b);
  }
}

/** The spec that applies to a column (`'*'` is the fallback), if any. */
export function kanbanColumnSortSpec<T>(
  sort: OgeKanbanColumnSort<T> | undefined,
  column: string,
): OgeKanbanColumnSortSpec<T> | undefined {
  if (sort === undefined) return undefined;
  const spec = sort[column] ?? sort['*'];
  if (spec === undefined) return undefined;
  if (
    typeof spec !== 'function' &&
    spec.field === 'order' &&
    spec.direction !== 'desc'
  ) {
    return undefined; // the board's own order — nothing to re-sort
  }
  return spec;
}

/**
 * Re-sorts every cell whose column has a sort spec. Lanes without any
 * sorted column are returned unchanged (same object), so memoized views
 * and drag geometry stay stable.
 */
export function sortKanbanLanes<T>(
  lanes: readonly KanbanSwimlane<T>[],
  sort: OgeKanbanColumnSort<T> | undefined,
  locale?: string,
  priorityOrder?: readonly string[],
): readonly KanbanSwimlane<T>[] {
  if (sort === undefined || Object.keys(sort).length === 0) return lanes;
  const comparers = new Map<
    string,
    ((a: KanbanCard<T>, b: KanbanCard<T>) => number) | null
  >();
  const comparerFor = (column: string) => {
    if (!comparers.has(column)) {
      const spec = kanbanColumnSortSpec(sort, column);
      comparers.set(
        column,
        spec === undefined
          ? null
          : kanbanSortComparer(spec, locale, priorityOrder),
      );
    }
    return comparers.get(column) ?? null;
  };
  return lanes.map((lane) => {
    let changed = false;
    const columns = lane.columns.map((cell) => {
      const compare = comparerFor(cell.column.key);
      if (compare === null || cell.cards.length < 2) return cell;
      changed = true;
      return { column: cell.column, cards: [...cell.cards].sort(compare) };
    });
    return changed ? { ...lane, columns } : lane;
  });
}

/**
 * The next `columnSort` after the column menu picked a field or a
 * direction for one column. Picking `'order'` ascending removes the entry.
 */
export function setKanbanColumnSort<T>(
  sort: OgeKanbanColumnSort<T> | undefined,
  column: string,
  field: OgeKanbanSortField,
  direction: 'asc' | 'desc',
): OgeKanbanColumnSort<T> {
  const next: Record<string, OgeKanbanColumnSortSpec<T>> = { ...sort };
  if (field === 'order' && direction === 'asc') delete next[column];
  else next[column] = { field, direction };
  return next;
}

/** The field + direction the column menu shows as checked. */
export function kanbanActiveSort<T>(
  sort: OgeKanbanColumnSort<T> | undefined,
  column: string,
): { field: OgeKanbanSortField | null; direction: 'asc' | 'desc' } {
  const spec = sort?.[column] ?? sort?.['*'];
  if (spec === undefined) return { field: 'order', direction: 'asc' };
  if (typeof spec === 'function') return { field: null, direction: 'asc' };
  return { field: spec.field, direction: spec.direction ?? 'asc' };
}
