import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FilterExpr, FilterOperator } from '../data/load-options';
import { buildODataQuery } from '../data/odata';
import {
  isOgeBlank,
  OGE_FILTER_OPERATORS,
  ogeFilterOperatorArity,
  ogeFilterOperatorTakesValue,
} from './filter-contract';
import { createFilterPredicate } from './filter-evaluator';

interface Vectors {
  key: string;
  dateFields: string[];
  rows: Record<string, unknown>[];
  cases: { name: string; filter: FilterExpr; expect: unknown[] }[];
}

const vectors = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../../../filter-vectors.json'),
    'utf8',
  ),
) as Vectors;

const dates = new Set(vectors.dateFields);

/** ISO instants on date fields become `Date`s — rows and filter values alike. */
function revive(expr: FilterExpr): FilterExpr {
  if (expr.type === 'binary') {
    if (!dates.has(expr.field) || typeof expr.value !== 'string') return expr;
    return { ...expr, value: new Date(expr.value) };
  }
  if (expr.type === 'not') return { ...expr, operand: revive(expr.operand) };
  return { ...expr, operands: expr.operands.map(revive) };
}

const revivedRows = vectors.rows.map((row) => {
  const out: Record<string, unknown> = { ...row };
  for (const field of dates) {
    if (typeof out[field] === 'string') out[field] = new Date(out[field]);
  }
  return out;
});

function ids(rows: Record<string, unknown>[], filter: FilterExpr): unknown[] {
  const predicate = createFilterPredicate<Record<string, unknown>>(filter);
  return rows.filter(predicate).map((row) => row[vectors.key]);
}

describe('filter contract vectors (@oge-ui/core/filter-vectors.json)', () => {
  it('covers every operator of the contract', () => {
    const used = new Set<string>();
    const walk = (expr: FilterExpr): void => {
      if (expr.type === 'binary') used.add(expr.op);
      else if (expr.type === 'not') walk(expr.operand);
      else expr.operands.forEach(walk);
    };
    vectors.cases.forEach((c) => walk(c.filter));
    expect([...used].sort()).toEqual(Object.keys(OGE_FILTER_OPERATORS).sort());
  });

  describe.each(vectors.cases)('$name', ({ filter, expect: expected }) => {
    it('with dates revived as Date objects', () => {
      expect(ids(revivedRows, revive(filter))).toEqual(expected);
    });
    it('with dates left as ISO strings', () => {
      expect(ids(vectors.rows, filter)).toEqual(expected);
    });
  });
});

describe('operator metadata', () => {
  it('reads the operand shape of each operator', () => {
    expect(ogeFilterOperatorArity('in')).toBe('list');
    expect(ogeFilterOperatorArity('between')).toBe('pair');
    expect(ogeFilterOperatorArity('isblank')).toBe('none');
    const valueless = (
      Object.keys(OGE_FILTER_OPERATORS) as FilterOperator[]
    ).filter((op) => !ogeFilterOperatorTakesValue(op));
    expect(valueless.sort()).toEqual([
      'isblank',
      'isnotblank',
      'isnotnull',
      'isnull',
    ]);
  });

  it('treats null, undefined and whitespace-only text as blank', () => {
    expect(isOgeBlank(null)).toBe(true);
    expect(isOgeBlank(undefined)).toBe(true);
    expect(isOgeBlank(' \t')).toBe(true);
    expect(isOgeBlank(0)).toBe(false);
    expect(isOgeBlank(false)).toBe(false);
    expect(isOgeBlank('x')).toBe(false);
  });
});

describe('OData translation follows the contract', () => {
  const odata = (filter: FilterExpr) =>
    decodeURIComponent(buildODataQuery({ filter }))
      .replace(/^.*\$filter=/, '')
      .replace(/^\((.*)\)$/, '$1'); // the query wraps each filter once

  it('keeps null cells in negations OData would drop', () => {
    expect(
      odata({ type: 'binary', field: 'Note', op: 'notcontains', value: 'x' }),
    ).toBe("(Note eq null) or not contains(Note,'x')");
    expect(
      odata({ type: 'binary', field: 'City', op: 'notin', value: ['A', 'B'] }),
    ).toBe("(City eq null) or (not ((City eq 'A') or (City eq 'B')))");
  });

  it('drops null cells from notin when null is listed', () => {
    expect(
      odata({ type: 'binary', field: 'City', op: 'notin', value: [null, 'A'] }),
    ).toBe("(City ne null) and (not ((City eq 'A')))");
    expect(
      odata({ type: 'binary', field: 'City', op: 'notin', value: [null] }),
    ).toBe('City ne null');
  });

  it('translates empty lists, blanks and open ranges', () => {
    expect(odata({ type: 'binary', field: 'A', op: 'in', value: [] })).toBe(
      'false',
    );
    expect(odata({ type: 'binary', field: 'A', op: 'notin', value: [] })).toBe(
      'true',
    );
    expect(odata({ type: 'binary', field: 'A', op: 'isblank' })).toBe(
      "(A eq null) or (trim(A) eq '')",
    );
    expect(odata({ type: 'binary', field: 'A', op: 'isnotblank' })).toBe(
      "(A ne null) and (trim(A) ne '')",
    );
    expect(
      odata({ type: 'binary', field: 'Q', op: 'between', value: [null, 5] }),
    ).toBe('(Q le 5)');
  });

  it('keeps a comma inside one list value', () => {
    expect(
      odata({ type: 'binary', field: 'N', op: 'in', value: ['Kaya, Mehmet'] }),
    ).toBe("(N eq 'Kaya, Mehmet')");
  });
});
