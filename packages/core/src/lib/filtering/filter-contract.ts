import type { FilterOperator } from '../data/load-options';

/**
 * The filter contract: what every {@link FilterOperator} means, including how
 * it treats null and blank cells. The client evaluator
 * (`createFilterPredicate`) implements it; a server that receives the same
 * `FilterExpr` (through `LoadOptions.filter` or `distinct()`) should implement
 * it too, so a filter returns the same rows whether the grid filters in memory
 * or the server does. `@oge-ui/core/filter-vectors.json` carries test vectors
 * — rows, expressions and the expected row ids — that a server test suite can
 * run against its own translation.
 *
 * Rules that hold for every operator:
 * - Logic is two-valued. Every leaf is either true or false for a row — never
 *   "unknown" as in SQL — and `not` is the plain complement. A SQL
 *   translation therefore wraps negations as `NOT COALESCE(expr, FALSE)` or
 *   spells the null branch out, as the table does.
 * - Text compares case- and accent-insensitively after locale-independent
 *   folding: `İzmir`, `IZMIR` and `izmir` are equal, `ı` folds to `i`.
 * - A date compared with an ISO string parses the string. Day filters are
 *   half-open ranges `[day 00:00, next day 00:00)` in local time, so a row
 *   stamped 17:30 on the last day of a range is inside it.
 * - A list value (`in`, `notin`) is an array; its items are never split on
 *   commas, so `"Kaya, Mehmet"` stays one value.
 */

/** How many operands an operator takes. */
export type OgeFilterOperatorArity = 'none' | 'one' | 'list' | 'pair';

/** One operator of the published filter contract. */
export interface OgeFilterOperatorInfo {
  /** Shape of `FilterExpr.value`. */
  readonly arity: OgeFilterOperatorArity;
  /** What a row must satisfy. */
  readonly meaning: string;
  /** What happens to a row whose cell is null (or blank). */
  readonly blanks: string;
  /** The SQL a server translation is expected to produce. */
  readonly sql: string;
}

/**
 * The operand shape of every operator — the only part of the contract the
 * runtime needs, kept apart from the prose below so a bundle that checks an
 * arity does not carry the documentation strings.
 */
export const OGE_FILTER_OPERATOR_ARITY: Readonly<
  Record<FilterOperator, OgeFilterOperatorArity>
> = {
  eq: 'one',
  ne: 'one',
  gt: 'one',
  ge: 'one',
  lt: 'one',
  le: 'one',
  contains: 'one',
  notcontains: 'one',
  startswith: 'one',
  endswith: 'one',
  in: 'list',
  notin: 'list',
  between: 'pair',
  isnull: 'none',
  isnotnull: 'none',
  isblank: 'none',
  isnotblank: 'none',
};

/** Every filter operator with its meaning, null rule and reference SQL. */
export const OGE_FILTER_OPERATORS = {
  eq: {
    arity: 'one',
    meaning: 'The cell equals the value (text folded, dates by instant).',
    blanks: 'A null cell matches only a null value.',
    sql: 'f = v  (f IS NULL when v is null)',
  },
  ne: {
    arity: 'one',
    meaning: 'The cell does not equal the value.',
    blanks: 'Null cells are included (they are not equal to the value).',
    sql: '(f <> v OR f IS NULL)',
  },
  gt: {
    arity: 'one',
    meaning: 'The cell is greater than the value.',
    blanks: 'Null cells never match an ordering comparison.',
    sql: 'f > v',
  },
  ge: {
    arity: 'one',
    meaning: 'The cell is greater than or equal to the value.',
    blanks: 'Null cells never match an ordering comparison.',
    sql: 'f >= v',
  },
  lt: {
    arity: 'one',
    meaning: 'The cell is less than the value.',
    blanks: 'Null cells never match an ordering comparison.',
    sql: 'f < v',
  },
  le: {
    arity: 'one',
    meaning: 'The cell is less than or equal to the value.',
    blanks: 'Null cells never match an ordering comparison.',
    sql: 'f <= v',
  },
  contains: {
    arity: 'one',
    meaning: 'The cell text contains the value text.',
    blanks: 'Null cells never match.',
    sql: "f LIKE '%' || v || '%'",
  },
  notcontains: {
    arity: 'one',
    meaning: 'The cell text does not contain the value text.',
    blanks: 'Null cells are included.',
    sql: "(f NOT LIKE '%' || v || '%' OR f IS NULL)",
  },
  startswith: {
    arity: 'one',
    meaning: 'The cell text starts with the value text.',
    blanks: 'Null cells never match.',
    sql: "f LIKE v || '%'",
  },
  endswith: {
    arity: 'one',
    meaning: 'The cell text ends with the value text.',
    blanks: 'Null cells never match.',
    sql: "f LIKE '%' || v",
  },
  in: {
    arity: 'list',
    meaning:
      'The cell equals one of the listed values. An empty list matches no row: "nothing selected" is not "no filter".',
    blanks: 'A null cell matches when the list contains null.',
    sql: 'f IN (…)  (OR f IS NULL when the list holds null; FALSE when empty)',
  },
  notin: {
    arity: 'list',
    meaning:
      'The cell equals none of the listed values. An empty list matches every row.',
    blanks: 'Null cells are included unless the list contains null.',
    sql: '(f NOT IN (…) OR f IS NULL)  (AND f IS NOT NULL when the list holds null)',
  },
  between: {
    arity: 'pair',
    meaning:
      'The cell lies within [from, to], both ends included; a null end leaves that side open. Grid day ranges are sent as ge / lt pairs instead (half-open by day).',
    blanks: 'Null cells never match.',
    sql: 'f >= from AND f <= to',
  },
  isnull: {
    arity: 'none',
    meaning: 'The cell is null or undefined.',
    blanks: 'An empty string is not null.',
    sql: 'f IS NULL',
  },
  isnotnull: {
    arity: 'none',
    meaning: 'The cell is neither null nor undefined.',
    blanks: 'An empty string is not null, so it matches.',
    sql: 'f IS NOT NULL',
  },
  isblank: {
    arity: 'none',
    meaning:
      'The cell is null, undefined, or text that is empty after trimming.',
    blanks: 'Matches exactly the blank cells.',
    sql: "(f IS NULL OR TRIM(f) = '')",
  },
  isnotblank: {
    arity: 'none',
    meaning: 'The cell has a value other than empty or whitespace-only text.',
    blanks: 'Blank cells never match.',
    sql: "(f IS NOT NULL AND TRIM(f) <> '')",
  },
} as const satisfies Readonly<Record<FilterOperator, OgeFilterOperatorInfo>>;

/** The operand shape of a filter operator. */
export function ogeFilterOperatorArity(
  op: FilterOperator,
): OgeFilterOperatorArity {
  return OGE_FILTER_OPERATOR_ARITY[op] ?? 'one';
}

/** Whether an operator takes a value (`isnull`, `isblank` and their negations do not). */
export function ogeFilterOperatorTakesValue(op: FilterOperator): boolean {
  return ogeFilterOperatorArity(op) !== 'none';
}

/** Whether a cell counts as blank: null, undefined or whitespace-only text. */
export function isOgeBlank(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.trim() === '');
}
