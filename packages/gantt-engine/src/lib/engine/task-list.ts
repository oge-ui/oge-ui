/**
 * Task-list kernel: column sort, filter matching (ancestors kept), the
 * predecessor-cell grammar (`3FS+2d, 5SS-4h`), cell-editor value
 * conversion, column order/width arithmetic and multi-row selection ranges.
 * Pure — `OgeGanttCore` and both render layers share these decisions.
 */
import { foldText, type RowKey } from '@oge-ui/core';
import type {
  GanttDependency,
  GanttDependencyType,
  GanttLagUnit,
  GanttTask,
} from './gantt-model';

/** Sort direction of a task-list column. */
export type GanttSortDirection = 'asc' | 'desc';

/** The active column sort. */
export interface GanttSort {
  readonly field: string;
  readonly direction: GanttSortDirection;
}

/** The value a built-in column sorts by (custom fields read the item). */
export function ganttSortValue(
  task: GanttTask,
  field: string,
): string | number | null {
  switch (field) {
    case 'title':
      return task.title;
    case 'start':
      return task.start.getTime();
    case 'end':
      return task.end.getTime();
    case 'duration':
      return task.end.getTime() - task.start.getTime();
    case 'progress':
      return task.progress;
    case 'wbs':
      return task.wbs;
    case 'deadline':
      return task.deadline?.getTime() ?? null;
    default: {
      const value = (task.source as Record<string, unknown>)?.[field];
      if (value instanceof Date) return value.getTime();
      if (typeof value === 'number' || typeof value === 'string') return value;
      return value == null ? null : String(value);
    }
  }
}

const collators = new Map<string, Intl.Collator>();

/** One numeric, base-sensitivity collator per locale (core has no cache). */
function ganttCollator(locale: string | undefined): Intl.Collator {
  const id = locale ?? '';
  let collator = collators.get(id);
  if (collator === undefined) {
    try {
      collator = new Intl.Collator(locale, {
        numeric: true,
        sensitivity: 'base',
      });
    } catch {
      collator = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    }
    collators.set(id, collator);
  }
  return collator;
}

/**
 * The store items re-ordered by a column sort. Tree structure is kept by
 * the caller (siblings follow this order); nulls sort last either way, and
 * equal values keep the store order (stable). WBS numbers sort numerically
 * per level (`1.10` after `1.9`).
 */
export function sortGanttItems<T>(
  tasks: readonly GanttTask<T>[],
  sort: GanttSort,
  locale?: string,
): T[] {
  const sign = sort.direction === 'asc' ? 1 : -1;
  const collator = ganttCollator(locale);
  return tasks
    .map((task, index) => ({
      task,
      index,
      value: ganttSortValue(task, sort.field),
    }))
    .sort((a, b) => {
      if (a.value === null || b.value === null) {
        if (a.value === b.value) return a.index - b.index;
        return a.value === null ? 1 : -1;
      }
      const diff =
        typeof a.value === 'number' && typeof b.value === 'number'
          ? a.value - b.value
          : collator.compare(String(a.value), String(b.value));
      return diff !== 0 ? sign * diff : a.index - b.index;
    })
    .map((entry) => entry.task.source);
}

/**
 * The keys a filter shows: every task whose text matches, plus all of its
 * ancestors (the tree stays navigable). `textOf(task, field)` returns the
 * cell text the user sees; matching is fold-insensitive (case, accents).
 * `null` when nothing filters.
 */
export function ganttFilterKeys<T>(
  tasks: readonly GanttTask<T>[],
  fields: readonly string[],
  filters: Readonly<Record<string, string>>,
  search: string,
  textOf: (task: GanttTask<T>, field: string) => string,
): ReadonlySet<RowKey> | null {
  const active = Object.entries(filters)
    .map(([field, text]) => [field, foldText(text.trim())] as const)
    .filter(([, text]) => text !== '');
  const term = foldText(search.trim());
  if (active.length === 0 && term === '') return null;
  const byKey = new Map(tasks.map((task) => [task.key, task]));
  const result = new Set<RowKey>();
  for (const task of tasks) {
    const columnsMatch = active.every(([field, text]) =>
      foldText(textOf(task, field)).includes(text),
    );
    const searchMatch =
      term === '' ||
      fields.some((field) => foldText(textOf(task, field)).includes(term));
    if (!columnsMatch || !searchMatch) continue;
    let current: GanttTask<T> | undefined = task;
    while (current !== undefined && !result.has(current.key)) {
      result.add(current.key);
      current =
        current.parentKey !== null ? byKey.get(current.parentKey) : undefined;
    }
  }
  return result;
}

/** One link written in a predecessor cell. */
export interface GanttPredecessorEntry {
  readonly key: RowKey;
  readonly type: GanttDependencyType;
  readonly lag: number;
  readonly lagUnit: GanttLagUnit;
}

/**
 * Parses a predecessor cell — comma/semicolon separated `<key><type?><lag?>`
 * entries, MS Project style: `3`, `3SS`, `3FS+2d`, `4FF-1.5h`. Keys are the
 * task keys (matched against `keys`, longest first, so `task-1` is not read
 * as `task` with a one-day lead). Returns `null` when any entry is invalid.
 */
export function parseGanttPredecessors(
  text: string,
  keys: readonly RowKey[],
): GanttPredecessorEntry[] | null {
  const known = [...keys]
    .map((key) => ({ key, text: String(key) }))
    .sort((a, b) => b.text.length - a.text.length);
  const result: GanttPredecessorEntry[] = [];
  for (const raw of text.split(/[,;]/)) {
    const token = raw.trim();
    if (token === '') continue;
    const match = known.find((entry) =>
      token.toLowerCase().startsWith(entry.text.toLowerCase()),
    );
    if (match === undefined) return null;
    const rest = token.slice(match.text.length).replace(/\s+/g, '');
    const parsed =
      /^(FS|SS|FF|SF)?(?:([+-])(\d+(?:[.,]\d+)?)(d|h|days?|hours?|t|s)?)?$/i.exec(
        rest,
      );
    if (parsed === null) return null;
    const [, type, sign, amount, unit] = parsed;
    const value =
      amount !== undefined ? Number(amount.replace(',', '.')) : 0;
    result.push({
      key: match.key,
      type: (type?.toUpperCase() as GanttDependencyType | undefined) ?? 'FS',
      lag: sign === '-' ? -value : value,
      lagUnit: unit !== undefined && /^h/i.test(unit) ? 'hours' : 'days',
    });
  }
  return result;
}

/** A lag as `+2d` / `-4h` (empty for none); suffixes come from messages. */
export function formatGanttLag(
  lag: number,
  unit: GanttLagUnit,
  suffix: { readonly days: string; readonly hours: string },
): string {
  if (lag === 0) return '';
  const amount = Math.abs(lag);
  const text = (unit === 'hours' ? suffix.hours : suffix.days).replace(
    '{value}',
    String(amount),
  );
  return `${lag > 0 ? '+' : '-'}${text}`;
}

/** The predecessor cell text of a task: `3`, `3SS+2d, 5`. */
export function formatGanttPredecessors(
  links: readonly GanttDependency[],
  suffix: { readonly days: string; readonly hours: string },
): string {
  return links
    .map((link) => {
      const lag = formatGanttLag(link.lag, link.lagUnit, suffix);
      const type = link.type === 'FS' && lag === '' ? '' : link.type;
      return `${String(link.predecessorKey)}${type}${lag}`;
    })
    .join(', ');
}

/** The editor kinds a task-list cell can open. */
export type GanttCellEditorType =
  'text' | 'number' | 'date' | 'duration' | 'predecessor';

/** `yyyy-MM-dd` for an `<input type="date">`. */
export function ganttDateInputValue(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses `yyyy-MM-dd` (local midnight) or `null`. */
export function parseGanttDateInput(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (match === null) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Moves `field` to `toIndex` in a column order (other fields keep their
 * relative order). Out-of-range indexes clamp.
 */
export function moveGanttColumn(
  order: readonly string[],
  field: string,
  toIndex: number,
): string[] {
  const from = order.indexOf(field);
  if (from < 0) return [...order];
  const next = order.filter((entry) => entry !== field);
  next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, field);
  return next;
}

/** Min / max task-list column width while resizing, in px. */
export const GANTT_COLUMN_WIDTH_MIN = 40;
export const GANTT_COLUMN_WIDTH_MAX = 600;

/** Clamps a resized column width. */
export function clampGanttColumnWidth(width: number): number {
  return Math.round(
    Math.min(GANTT_COLUMN_WIDTH_MAX, Math.max(GANTT_COLUMN_WIDTH_MIN, width)),
  );
}

/**
 * The selection after a click: plain replaces, Ctrl/Meta toggles, Shift
 * selects the visible range from the anchor (inclusive).
 */
export function nextGanttSelection(
  current: readonly RowKey[],
  visible: readonly RowKey[],
  anchor: RowKey | null,
  clicked: RowKey,
  modifiers: { readonly toggle: boolean; readonly range: boolean },
): RowKey[] {
  if (modifiers.range && anchor !== null) {
    const from = visible.indexOf(anchor);
    const to = visible.indexOf(clicked);
    if (from >= 0 && to >= 0) {
      const [lo, hi] = from <= to ? [from, to] : [to, from];
      const range = visible.slice(lo, hi + 1);
      return modifiers.toggle
        ? [...new Set([...current, ...range])]
        : range;
    }
  }
  if (modifiers.toggle) {
    return current.includes(clicked)
      ? current.filter((key) => key !== clicked)
      : [...current, clicked];
  }
  return [clicked];
}
