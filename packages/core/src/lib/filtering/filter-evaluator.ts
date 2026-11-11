import type { FilterExpr } from '../data/load-options';
import {
  createFieldAccessor,
  type ValueAccessor,
} from '../util/value-accessor';
import { foldText } from '../util/text-fold';
import { isOgeBlank } from './filter-contract';

/**
 * Normalizes a value for comparison:
 * - Dates become epoch millis; ISO-like strings are compared as strings, but
 *   when the *other* side is a Date they are parsed so `Date` data and
 *   `<input type="date">` filter values interoperate.
 */
function normalizePair(a: unknown, b: unknown): [unknown, unknown] {
  if (a instanceof Date || b instanceof Date) {
    const ta =
      a instanceof Date
        ? a.getTime()
        : typeof a === 'string'
          ? Date.parse(a)
          : a;
    const tb =
      b instanceof Date
        ? b.getTime()
        : typeof b === 'string'
          ? Date.parse(b)
          : b;
    return [ta, tb];
  }
  return [a, b];
}

function looseEquals(a: unknown, b: unknown): boolean {
  const [na, nb] = normalizePair(a, b);
  if (na == null || nb == null) return na == null && nb == null;
  if (typeof na === 'string' && typeof nb === 'string') {
    return foldText(na) === foldText(nb);
  }
  return na === nb;
}

/** Ordering comparison for filters: any comparison involving null is false. */
function orderedCompare(a: unknown, b: unknown): number | null {
  const [na, nb] = normalizePair(a, b);
  if (na == null || nb == null) return null;
  if (typeof na === 'number' && typeof nb === 'number') {
    if (Number.isNaN(na) || Number.isNaN(nb)) return null;
    return na < nb ? -1 : na > nb ? 1 : 0;
  }
  if (typeof na === 'string' && typeof nb === 'string') {
    const la = foldText(na);
    const lb = foldText(nb);
    return la < lb ? -1 : la > lb ? 1 : 0;
  }
  const va = na as number | string;
  const vb = nb as number | string;
  if (va < vb) return -1;
  if (va > vb) return 1;
  return 0;
}

/**
 * A hashable key a cell or list value compares under, so `in` / `notin`
 * look a cell up in a `Set` instead of scanning the list per row. Text is
 * folded like {@link looseEquals}; `undefined` and `null` share a key.
 * Dates and ISO strings cross-compare by instant in {@link looseEquals}, so a
 * list holding a Date takes the scanning path instead.
 */
function listKey(value: unknown): string | null {
  if (value == null) return 'z';
  switch (typeof value) {
    case 'string':
      return 's' + foldText(value);
    case 'number':
      return Number.isNaN(value) ? null : 'n' + value;
    case 'boolean':
      return 'b' + value;
    case 'bigint':
      return 'g' + value.toString();
    default:
      return null;
  }
}

/** Compiles a list membership test once per predicate (`in` / `notin`). */
function listMatcher(value: unknown): (cell: unknown) => boolean {
  const values = Array.isArray(value) ? value : [value];
  const keys = new Set<string>();
  for (const candidate of values) {
    const key = listKey(candidate);
    if (key === null) {
      // a Date (or another object) in the list: compare like eq does
      return (cell) => values.some((item) => looseEquals(cell, item));
    }
    keys.add(key);
  }
  return (cell) => {
    if (cell instanceof Date) {
      return values.some((item) => looseEquals(cell, item));
    }
    const key = listKey(cell);
    return key !== null && keys.has(key);
  };
}

function asText(value: unknown): string | null {
  if (value == null) return null;
  return foldText(String(value));
}

/**
 * Folded cell text for the text operators, with Date cells memoized per
 * instant: a search across a date column formats each distinct day once, not
 * once per row (`String(date)` is one of the costliest steps of a search).
 */
function cellText(): (value: unknown) => string | null {
  let dates: Map<number, string> | null = null;
  return (value) => {
    if (value == null) return null;
    if (!(value instanceof Date)) return foldText(String(value));
    const time = value.getTime();
    dates ??= new Map();
    let text = dates.get(time);
    if (text === undefined) {
      text = foldText(String(value));
      dates.set(time, text);
    }
    return text;
  };
}

/**
 * The epoch a constant compares as against Date cells, read once per
 * predicate: a Date filter value is not re-read and an ISO string is not
 * re-parsed for each of 10 000 rows.
 */
function constantEpoch(value: unknown): unknown {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return Date.parse(value);
  return value;
}

/**
 * {@link orderedCompare} against a constant, with the constant's folded text
 * and epoch prepared once. Same results, fewer allocations per row.
 */
function orderedAgainst(value: unknown): (cell: unknown) => number | null {
  if (value == null) return () => null;
  const folded = typeof value === 'string' ? foldText(value) : null;
  const epoch = constantEpoch(value);
  const isDate = value instanceof Date;
  return (cell) => {
    if (cell == null) return null;
    if (cell instanceof Date) {
      const a = cell.getTime();
      const b = epoch as number;
      if (typeof b !== 'number' || Number.isNaN(a) || Number.isNaN(b)) {
        return null;
      }
      return a < b ? -1 : a > b ? 1 : 0;
    }
    if (isDate) return orderedCompare(cell, value);
    if (folded !== null && typeof cell === 'string') {
      const a = foldText(cell);
      return a < folded ? -1 : a > folded ? 1 : 0;
    }
    return orderedCompare(cell, value);
  };
}

/** {@link looseEquals} against a constant, prepared once per predicate. */
function equalsTo(value: unknown): (cell: unknown) => boolean {
  if (value == null) return (cell) => cell == null;
  if (value instanceof Date) {
    const epoch = value.getTime();
    return (cell) =>
      cell instanceof Date
        ? cell.getTime() === epoch
        : looseEquals(cell, value);
  }
  if (typeof value === 'string') {
    const folded = foldText(value);
    return (cell) =>
      typeof cell === 'string'
        ? foldText(cell) === folded
        : looseEquals(cell, value);
  }
  return (cell) => looseEquals(cell, value);
}

/** Options of {@link createFilterPredicate}. */
export interface OgeFilterPredicateOptions<T = unknown> {
  /**
   * Per-field value readers that replace the plain property path — what a
   * column's `calculateFilterValue` (or a lookup's display text) compares
   * as on the client. Fields without one read the row's property.
   */
  readonly accessors?: Readonly<Record<string, ValueAccessor<T>>>;
}

/**
 * Compiles a FilterExpr tree into a row predicate, following the published
 * filter contract (`OGE_FILTER_OPERATORS`): two-valued logic, folded
 * case- and accent-insensitive text, negations that keep null cells. Every
 * constant (folded needles, list sets) is prepared once here, not per row.
 */
export function createFilterPredicate<T = unknown>(
  expr: FilterExpr,
  options?: OgeFilterPredicateOptions<T>,
): (row: T) => boolean {
  switch (expr.type) {
    case 'and': {
      const predicates = expr.operands.map((operand) =>
        createFilterPredicate<T>(operand, options),
      );
      return (row) => predicates.every((p) => p(row));
    }
    case 'or': {
      const predicates = expr.operands.map((operand) =>
        createFilterPredicate<T>(operand, options),
      );
      return (row) => predicates.some((p) => p(row));
    }
    case 'not': {
      const inner = createFilterPredicate<T>(expr.operand, options);
      return (row) => !inner(row);
    }
  }

  const accessor =
    options?.accessors?.[expr.field] ?? createFieldAccessor<T>(expr.field);
  const { op, value } = expr;
  switch (op) {
    case 'eq': {
      const equals = equalsTo(value);
      return (row) => equals(accessor(row));
    }
    case 'ne': {
      const equals = equalsTo(value);
      return (row) => !equals(accessor(row));
    }
    case 'gt': {
      const order = orderedAgainst(value);
      return (row) => (order(accessor(row)) ?? -1) > 0;
    }
    case 'ge': {
      const order = orderedAgainst(value);
      return (row) => (order(accessor(row)) ?? -1) >= 0;
    }
    case 'lt': {
      const order = orderedAgainst(value);
      return (row) => (order(accessor(row)) ?? 1) < 0;
    }
    case 'le': {
      const order = orderedAgainst(value);
      return (row) => (order(accessor(row)) ?? 1) <= 0;
    }
    // The needle is constant per predicate — fold it once at compile time,
    // not once per row (matters when filtering large sets).
    case 'contains': {
      const needle = asText(value);
      const textOf = cellText();
      return (row) => {
        const cell = textOf(accessor(row));
        return cell != null && needle != null && cell.includes(needle);
      };
    }
    case 'notcontains': {
      const needle = asText(value);
      const textOf = cellText();
      return (row) => {
        const cell = textOf(accessor(row));
        return cell == null || needle == null || !cell.includes(needle);
      };
    }
    case 'startswith': {
      const needle = asText(value);
      const textOf = cellText();
      return (row) => {
        const cell = textOf(accessor(row));
        return cell != null && needle != null && cell.startsWith(needle);
      };
    }
    case 'endswith': {
      const needle = asText(value);
      const textOf = cellText();
      return (row) => {
        const cell = textOf(accessor(row));
        return cell != null && needle != null && cell.endsWith(needle);
      };
    }
    case 'in': {
      const matches = listMatcher(value);
      return (row) => matches(accessor(row));
    }
    case 'notin': {
      const matches = listMatcher(value);
      return (row) => !matches(accessor(row));
    }
    case 'between': {
      const [min, max] = Array.isArray(value) ? value : [undefined, undefined];
      const fromMin = min == null ? null : orderedAgainst(min);
      const toMax = max == null ? null : orderedAgainst(max);
      return (row) => {
        const cell = accessor(row);
        if (cell == null) return false;
        const lower = fromMin === null || (fromMin(cell) ?? -1) >= 0;
        const upper = toMax === null || (toMax(cell) ?? 1) <= 0;
        return lower && upper;
      };
    }
    case 'isnull':
      return (row) => accessor(row) == null;
    case 'isnotnull':
      return (row) => accessor(row) != null;
    case 'isblank':
      return (row) => isOgeBlank(accessor(row));
    case 'isnotblank':
      return (row) => !isOgeBlank(accessor(row));
  }
}

/** Builds a case-insensitive `contains` filter across the given fields. */
export function buildSearchFilter(
  fields: readonly string[],
  text: string,
): FilterExpr | null {
  const trimmed = text.trim();
  if (!trimmed || !fields.length) return null;
  const operands: FilterExpr[] = fields.map((field) => ({
    type: 'binary',
    field,
    op: 'contains',
    value: trimmed,
  }));
  return operands.length === 1 ? operands[0] : { type: 'or', operands };
}
