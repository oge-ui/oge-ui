import {
  isGroupInterval,
  type FilterExpr,
  type FilterOperator,
  type GroupDescriptor,
  type SortDescriptor,
} from '../data/load-options';
import type { RowKey } from '../rows/row-node';
import type { GridStateSnapshot } from './grid-state-snapshot';
import type {
  PivotFieldStateEntry,
  PivotGridStateSnapshot,
} from './pivot-grid-state-snapshot';
import type { TreeListStateSnapshot } from './tree-list-state-snapshot';

/**
 * Shape validation for persisted UI-state snapshots.
 *
 * A snapshot restored through `stateKey` comes out of storage the page does
 * not control — `localStorage` another script can write, an HTTP backend, a
 * shared link — and `applyState()` is public API a host may feed anything.
 * Every snapshot therefore passes through one of these sanitizers before it
 * touches component state:
 *
 * - **Prototype keys are fatal.** A `__proto__`, `constructor` or
 *   `prototype` key at ANY depth rejects the whole snapshot (`null`) — it is
 *   never a legitimate state field, only a pollution attempt.
 * - **Unknown keys are dropped**, so storage cannot smuggle extra fields
 *   into the state slices.
 * - **Types are checked per field**; an entry of the wrong shape is skipped
 *   and the rest of the snapshot still applies.
 * - **Nothing throws.** Garbage in → `null` (or a smaller snapshot) out.
 *
 * Results are fresh plain objects built from the validated parts, never the
 * input object itself.
 */

const UNSAFE_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

/** Depth bound for nested filter trees and free-form values. */
const MAX_DEPTH = 32;

/** Whether a property name could reach `Object.prototype` when merged. */
export function isUnsafeStateKey(key: string): boolean {
  return UNSAFE_KEYS.has(key);
}

type Plain = Record<string, unknown>;

function isPlainObject(value: unknown): value is Plain {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** True when an unsafe key appears anywhere inside `value`. */
function hasUnsafeKey(value: unknown, depth = 0): boolean {
  if (depth > MAX_DEPTH) return true; // absurd nesting is not state
  if (Array.isArray(value)) {
    return value.some((item) => hasUnsafeKey(item, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (UNSAFE_KEYS.has(key)) return true;
      if (hasUnsafeKey((value as Plain)[key], depth + 1)) return true;
    }
  }
  return false;
}

/**
 * Parses persisted state text without ever throwing. Returns `undefined`
 * for invalid JSON or JSON that carries a prototype key at any depth.
 */
export function parseStateJson(text: string): unknown {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return undefined;
  }
  return hasUnsafeKey(value) ? undefined : value;
}

/** A JSON-safe deep copy of a free-form value (filter operands, keys, paths). */
function cloneJson(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return undefined;
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value;
  }
  // an in-memory snapshot (`applyState(state())`) may carry Date operands
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : new Date(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneJson(item, depth + 1));
  }
  if (isPlainObject(value)) {
    const out: Plain = {};
    for (const key of Object.keys(value)) {
      if (UNSAFE_KEYS.has(key)) continue;
      const item = cloneJson(value[key], depth + 1);
      if (item !== undefined) out[key] = item;
    }
    return out;
  }
  return undefined;
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isDir = (value: unknown): value is 'asc' | 'desc' =>
  value === 'asc' || value === 'desc';
const isRowKey = (value: unknown): value is RowKey =>
  isString(value) || isFiniteNumber(value);

/** The entries of `value` that `pick` accepts; non-arrays → `undefined`. */
function arrayOf<T>(
  value: unknown,
  pick: (item: unknown) => T | undefined,
): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: T[] = [];
  for (const item of value) {
    const picked = pick(item);
    if (picked !== undefined) out.push(picked);
  }
  return out;
}

const FILTER_OPERATORS: ReadonlySet<FilterOperator> = new Set<FilterOperator>([
  'eq',
  'ne',
  'gt',
  'ge',
  'lt',
  'le',
  'contains',
  'notcontains',
  'startswith',
  'endswith',
  'in',
  'between',
  'isnull',
  'isnotnull',
]);

function sanitizeFilterExpr(value: unknown, depth = 0): FilterExpr | undefined {
  if (depth > MAX_DEPTH || !isPlainObject(value)) return undefined;
  switch (value['type']) {
    case 'binary': {
      const field = value['field'];
      const op = value['op'];
      if (!isString(field) || !FILTER_OPERATORS.has(op as FilterOperator)) {
        return undefined;
      }
      const operand =
        'value' in value ? cloneJson(value['value'], depth + 1) : undefined;
      return operand === undefined
        ? { type: 'binary', field, op: op as FilterOperator }
        : { type: 'binary', field, op: op as FilterOperator, value: operand };
    }
    case 'and':
    case 'or': {
      const operands = arrayOf(value['operands'], (item) =>
        sanitizeFilterExpr(item, depth + 1),
      );
      return operands === undefined
        ? undefined
        : { type: value['type'], operands };
    }
    case 'not': {
      const operand = sanitizeFilterExpr(value['operand'], depth + 1);
      return operand === undefined ? undefined : { type: 'not', operand };
    }
    default:
      return undefined;
  }
}

function sanitizeSort(item: unknown): SortDescriptor | undefined {
  if (!isPlainObject(item) || !isString(item['field']) || !isDir(item['dir'])) {
    return undefined;
  }
  return { field: item['field'], dir: item['dir'] };
}

function sanitizeGroup(item: unknown): GroupDescriptor | undefined {
  const sort = sanitizeSort(item);
  if (sort === undefined) return undefined;
  const interval = (item as Plain)['interval'];
  return isGroupInterval(interval) ? { ...sort, interval } : sort;
}

/** `[string, X]` tuples, X validated by `pick`. */
function pairsOf<T>(
  value: unknown,
  pick: (item: unknown) => T | undefined,
): (readonly [string, T])[] | undefined {
  return arrayOf(value, (entry) => {
    if (!Array.isArray(entry) || entry.length !== 2 || !isString(entry[0])) {
      return undefined;
    }
    const picked = pick(entry[1]);
    return picked === undefined ? undefined : ([entry[0], picked] as const);
  });
}

function sanitizeFilterSlice(value: unknown): GridStateSnapshot['filter'] {
  if (!isPlainObject(value)) return undefined;
  const out: {
    row?: (readonly [string, FilterExpr])[];
    header?: (readonly [string, readonly unknown[]])[];
    builder?: FilterExpr | null;
    searchText?: string;
  } = {};
  const row = pairsOf(value['row'], (item) => sanitizeFilterExpr(item));
  if (row !== undefined) out.row = row;
  const header = pairsOf(value['header'], (item) =>
    Array.isArray(item) ? (cloneJson(item) as unknown[]) : undefined,
  );
  if (header !== undefined) out.header = header;
  if (value['builder'] === null) out.builder = null;
  else {
    const builder = sanitizeFilterExpr(value['builder']);
    if (builder !== undefined) out.builder = builder;
  }
  if (isString(value['searchText'])) out.searchText = value['searchText'];
  return out;
}

function sanitizePagingSlice(value: unknown): GridStateSnapshot['paging'] {
  if (!isPlainObject(value)) return undefined;
  const out: { pageIndex?: number; pageSize?: number | null } = {};
  const pageIndex = value['pageIndex'];
  if (isFiniteNumber(pageIndex) && Number.isInteger(pageIndex)) {
    out.pageIndex = Math.max(0, pageIndex);
  }
  const pageSize = value['pageSize'];
  if (pageSize === null) out.pageSize = null;
  else if (
    isFiniteNumber(pageSize) &&
    Number.isInteger(pageSize) &&
    pageSize > 0
  ) {
    out.pageSize = pageSize;
  }
  return out;
}

function sanitizeColumnsSlice(value: unknown): GridStateSnapshot['columns'] {
  if (!isPlainObject(value)) return undefined;
  const out: {
    order?: readonly string[] | null;
    widths?: (readonly [string, number])[];
    pins?: (readonly [string, 'left' | 'right' | false])[];
    hidden?: string[];
  } = {};
  if (value['order'] === null) out.order = null;
  else {
    const order = arrayOf(value['order'], (item) =>
      isString(item) ? item : undefined,
    );
    if (order !== undefined) out.order = order;
  }
  const widths = pairsOf(value['widths'], (item) =>
    isFiniteNumber(item) && item >= 0 ? item : undefined,
  );
  if (widths !== undefined) out.widths = widths;
  const pins = pairsOf(value['pins'], (item) =>
    item === 'left' || item === 'right' || item === false ? item : undefined,
  );
  if (pins !== undefined) out.pins = pins;
  const hidden = arrayOf(value['hidden'], (item) =>
    isString(item) ? item : undefined,
  );
  if (hidden !== undefined) out.hidden = hidden;
  return out;
}

/** The shared sort/filter/paging/columns slices of a grid-like snapshot. */
function sanitizeGridSlices(value: Plain): Omit<GridStateSnapshot, 'group'> {
  const out: {
    sort?: SortDescriptor[];
    filter?: GridStateSnapshot['filter'];
    paging?: GridStateSnapshot['paging'];
    columns?: GridStateSnapshot['columns'];
  } = {};
  const sort = arrayOf(value['sort'], sanitizeSort);
  if (sort !== undefined) out.sort = sort;
  const filter = sanitizeFilterSlice(value['filter']);
  if (filter !== undefined) out.filter = filter;
  const paging = sanitizePagingSlice(value['paging']);
  if (paging !== undefined) out.paging = paging;
  const columns = sanitizeColumnsSlice(value['columns']);
  if (columns !== undefined) out.columns = columns;
  return out;
}

/**
 * Validates an untrusted grid state snapshot (see the module comment).
 * `null` when the input is not an object or carries a prototype key.
 */
export function sanitizeGridStateSnapshot(
  value: unknown,
): GridStateSnapshot | null {
  if (!isPlainObject(value) || hasUnsafeKey(value)) return null;
  const out: GridStateSnapshot = sanitizeGridSlices(value);
  const group = arrayOf(value['group'], sanitizeGroup);
  return group === undefined ? out : { ...out, group };
}

/** Validates an untrusted tree-list state snapshot (grid slices + expansion). */
export function sanitizeTreeListStateSnapshot(
  value: unknown,
): TreeListStateSnapshot | null {
  if (!isPlainObject(value) || hasUnsafeKey(value)) return null;
  const out: TreeListStateSnapshot = sanitizeGridSlices(value);
  const expansion = value['expansion'];
  if (!isPlainObject(expansion)) return out;
  const toggled = arrayOf(expansion['toggled'], (item) =>
    isRowKey(item) ? item : undefined,
  );
  return toggled === undefined ? out : { ...out, expansion: { toggled } };
}

const PIVOT_AREAS = new Set(['row', 'column', 'data', 'filter']);
const PIVOT_SUMMARY_TYPES = new Set([
  'sum',
  'avg',
  'min',
  'max',
  'count',
  'custom',
]);
const PIVOT_DISPLAY_MODES = new Set([
  'none',
  'absoluteVariation',
  'percentVariation',
  'percentOfColumnTotal',
  'percentOfRowTotal',
  'percentOfColumnGrandTotal',
  'percentOfRowGrandTotal',
  'percentOfGrandTotal',
]);

const sanitizePath = (item: unknown): unknown[] | undefined =>
  Array.isArray(item) ? (cloneJson(item) as unknown[]) : undefined;

function sanitizePivotField(item: unknown): PivotFieldStateEntry | undefined {
  if (!isPlainObject(item) || !isString(item['id'])) return undefined;
  const area = item['area'];
  if (area !== null && !PIVOT_AREAS.has(area as string)) return undefined;
  const out: {
    -readonly [K in keyof PivotFieldStateEntry]: PivotFieldStateEntry[K];
  } = {
    id: item['id'],
    area: area as PivotFieldStateEntry['area'],
  };
  if (isFiniteNumber(item['areaIndex'])) out.areaIndex = item['areaIndex'];
  if (PIVOT_SUMMARY_TYPES.has(item['summaryType'] as string)) {
    out.summaryType = item[
      'summaryType'
    ] as PivotFieldStateEntry['summaryType'];
  }
  if (PIVOT_DISPLAY_MODES.has(item['summaryDisplayMode'] as string)) {
    out.summaryDisplayMode = item[
      'summaryDisplayMode'
    ] as PivotFieldStateEntry['summaryDisplayMode'];
  }
  if (isDir(item['sortOrder'])) out.sortOrder = item['sortOrder'];
  if (isString(item['sortBySummaryField'])) {
    out.sortBySummaryField = item['sortBySummaryField'];
  }
  const summaryPath = sanitizePath(item['sortBySummaryPath']);
  if (summaryPath !== undefined) out.sortBySummaryPath = summaryPath;
  const filterValues = sanitizePath(item['filterValues']);
  if (filterValues !== undefined) out.filterValues = filterValues;
  if (item['filterType'] === 'include' || item['filterType'] === 'exclude') {
    out.filterType = item['filterType'];
  }
  return out;
}

/** Validates an untrusted pivot grid state snapshot. */
export function sanitizePivotGridStateSnapshot(
  value: unknown,
): PivotGridStateSnapshot | null {
  if (!isPlainObject(value) || hasUnsafeKey(value)) return null;
  const out: {
    -readonly [K in keyof PivotGridStateSnapshot]: PivotGridStateSnapshot[K];
  } = {};
  const fields = arrayOf(value['fields'], sanitizePivotField);
  if (fields !== undefined) out.fields = fields;
  const rows = arrayOf(value['rowExpandedPaths'], sanitizePath);
  if (rows !== undefined) out.rowExpandedPaths = rows;
  const columns = arrayOf(value['columnExpandedPaths'], sanitizePath);
  if (columns !== undefined) out.columnExpandedPaths = columns;
  if (typeof value['fieldPanelCollapsed'] === 'boolean') {
    out.fieldPanelCollapsed = value['fieldPanelCollapsed'];
  }
  return out;
}
