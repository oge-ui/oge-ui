import type { FilterExpr } from '../data/load-options';
import { createFieldAccessor } from '../util/value-accessor';

/**
 * Normalizes a value for comparison:
 * - Dates become epoch millis; ISO-like strings are compared as strings, but
 *   when the *other* side is a Date they are parsed so `Date` data and
 *   `<input type="date">` filter values interoperate.
 */
function normalizePair(a: unknown, b: unknown): [unknown, unknown] {
  if (a instanceof Date || b instanceof Date) {
    const ta = a instanceof Date ? a.getTime() : typeof a === 'string' ? Date.parse(a) : a;
    const tb = b instanceof Date ? b.getTime() : typeof b === 'string' ? Date.parse(b) : b;
    return [ta, tb];
  }
  return [a, b];
}

function looseEquals(a: unknown, b: unknown): boolean {
  const [na, nb] = normalizePair(a, b);
  if (na == null || nb == null) return na == null && nb == null;
  if (typeof na === 'string' && typeof nb === 'string') {
    return na.toLocaleLowerCase() === nb.toLocaleLowerCase();
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
    const la = na.toLocaleLowerCase();
    const lb = nb.toLocaleLowerCase();
    return la < lb ? -1 : la > lb ? 1 : 0;
  }
  const va = na as number | string;
  const vb = nb as number | string;
  if (va < vb) return -1;
  if (va > vb) return 1;
  return 0;
}

function asText(value: unknown): string | null {
  if (value == null) return null;
  return String(value).toLocaleLowerCase();
}

/**
 * Compiles a FilterExpr tree into a row predicate. String matching is
 * case-insensitive (DevExtreme-style defaults).
 */
export function createFilterPredicate<T = unknown>(expr: FilterExpr): (row: T) => boolean {
  switch (expr.type) {
    case 'and': {
      const predicates = expr.operands.map((operand) => createFilterPredicate<T>(operand));
      return (row) => predicates.every((p) => p(row));
    }
    case 'or': {
      const predicates = expr.operands.map((operand) => createFilterPredicate<T>(operand));
      return (row) => predicates.some((p) => p(row));
    }
    case 'not': {
      const inner = createFilterPredicate<T>(expr.operand);
      return (row) => !inner(row);
    }
  }

  const accessor = createFieldAccessor<T>(expr.field);
  const { op, value } = expr;
  switch (op) {
    case 'eq':
      return (row) => looseEquals(accessor(row), value);
    case 'ne':
      return (row) => !looseEquals(accessor(row), value);
    case 'gt':
      return (row) => (orderedCompare(accessor(row), value) ?? -1) > 0;
    case 'ge':
      return (row) => (orderedCompare(accessor(row), value) ?? -1) >= 0;
    case 'lt':
      return (row) => (orderedCompare(accessor(row), value) ?? 1) < 0;
    case 'le':
      return (row) => (orderedCompare(accessor(row), value) ?? 1) <= 0;
    case 'contains':
      return (row) => {
        const cell = asText(accessor(row));
        const needle = asText(value);
        return cell != null && needle != null && cell.includes(needle);
      };
    case 'notcontains':
      return (row) => {
        const cell = asText(accessor(row));
        const needle = asText(value);
        return cell == null || needle == null || !cell.includes(needle);
      };
    case 'startswith':
      return (row) => {
        const cell = asText(accessor(row));
        const needle = asText(value);
        return cell != null && needle != null && cell.startsWith(needle);
      };
    case 'endswith':
      return (row) => {
        const cell = asText(accessor(row));
        const needle = asText(value);
        return cell != null && needle != null && cell.endsWith(needle);
      };
    case 'in': {
      const values = Array.isArray(value) ? value : [value];
      return (row) => {
        const cell = accessor(row);
        return values.some((candidate) => looseEquals(cell, candidate));
      };
    }
    case 'between': {
      const [min, max] = Array.isArray(value) ? value : [undefined, undefined];
      return (row) => {
        const cell = accessor(row);
        const lower = min == null || (orderedCompare(cell, min) ?? -1) >= 0;
        const upper = max == null || (orderedCompare(cell, max) ?? 1) <= 0;
        return lower && upper;
      };
    }
    case 'isnull':
      return (row) => accessor(row) == null;
    case 'isnotnull':
      return (row) => accessor(row) != null;
  }
}

/** Builds a case-insensitive `contains` filter across the given fields. */
export function buildSearchFilter(fields: readonly string[], text: string): FilterExpr | null {
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
