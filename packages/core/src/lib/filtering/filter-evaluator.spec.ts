import type { FilterExpr } from '../data/load-options';
import { applyFilter } from '../pipeline/steps/filter.step';
import { buildSearchFilter, createFilterPredicate } from './filter-evaluator';

function binary(
  field: string,
  op: FilterExpr extends { op: infer O } ? O : never,
  value?: unknown,
): FilterExpr {
  return { type: 'binary', field, op, value } as FilterExpr;
}

interface Row {
  name: string | null;
  age: number | null;
  hired: string; // ISO date string
  hiredAt?: Date;
  active: boolean;
}

const row: Row = {
  name: 'Ada Lovelace',
  age: 36,
  hired: '2020-05-15',
  active: true,
};
const nullRow: Row = {
  name: null,
  age: null,
  hired: '2021-01-01',
  active: false,
};

function matches(expr: FilterExpr, target: Row = row): boolean {
  return createFilterPredicate<Row>(expr)(target);
}

describe('createFilterPredicate — operator × dataType matrix', () => {
  describe('eq / ne', () => {
    it('string (case-insensitive)', () => {
      expect(matches(binary('name', 'eq', 'ada lovelace'))).toBe(true);
      expect(matches(binary('name', 'eq', 'Ada'))).toBe(false);
      expect(matches(binary('name', 'ne', 'x'))).toBe(true);
    });
    it('number', () => {
      expect(matches(binary('age', 'eq', 36))).toBe(true);
      expect(matches(binary('age', 'ne', 36))).toBe(false);
    });
    it('boolean', () => {
      expect(matches(binary('active', 'eq', true))).toBe(true);
      expect(matches(binary('active', 'eq', false))).toBe(false);
    });
    it('null semantics: eq null only matches null', () => {
      expect(matches(binary('name', 'eq', null), nullRow)).toBe(true);
      expect(matches(binary('name', 'eq', null))).toBe(false);
      expect(matches(binary('name', 'ne', 'x'), nullRow)).toBe(true);
    });
    it('date: Date value vs ISO string cell', () => {
      expect(matches(binary('hired', 'eq', new Date('2020-05-15')))).toBe(true);
      expect(matches(binary('hired', 'eq', new Date('2020-05-16')))).toBe(
        false,
      );
    });
    it('date: Date cell vs ISO string value', () => {
      const withDate: Row = { ...row, hiredAt: new Date('2020-05-15') };
      expect(matches(binary('hiredAt', 'eq', '2020-05-15'), withDate)).toBe(
        true,
      );
    });
  });

  describe('gt / ge / lt / le', () => {
    it('number', () => {
      expect(matches(binary('age', 'gt', 35))).toBe(true);
      expect(matches(binary('age', 'gt', 36))).toBe(false);
      expect(matches(binary('age', 'ge', 36))).toBe(true);
      expect(matches(binary('age', 'lt', 40))).toBe(true);
      expect(matches(binary('age', 'le', 36))).toBe(true);
      expect(matches(binary('age', 'le', 35))).toBe(false);
    });
    it('string (case-insensitive ordering)', () => {
      expect(matches(binary('name', 'lt', 'b'))).toBe(true);
      expect(matches(binary('name', 'gt', 'B'))).toBe(false);
    });
    it('date strings and Date values', () => {
      expect(matches(binary('hired', 'gt', '2020-01-01'))).toBe(true);
      expect(matches(binary('hired', 'lt', new Date('2021-01-01')))).toBe(true);
      expect(matches(binary('hired', 'gt', new Date('2021-01-01')))).toBe(
        false,
      );
    });
    it('comparisons against null cells are always false', () => {
      expect(matches(binary('age', 'gt', 0), nullRow)).toBe(false);
      expect(matches(binary('age', 'lt', 100), nullRow)).toBe(false);
      expect(matches(binary('age', 'ge', 0), nullRow)).toBe(false);
      expect(matches(binary('age', 'le', 100), nullRow)).toBe(false);
    });
  });

  describe('string operators', () => {
    it('contains / notcontains (case-insensitive)', () => {
      expect(matches(binary('name', 'contains', 'love'))).toBe(true);
      expect(matches(binary('name', 'contains', 'xyz'))).toBe(false);
      expect(matches(binary('name', 'notcontains', 'xyz'))).toBe(true);
    });
    it('startswith / endswith', () => {
      expect(matches(binary('name', 'startswith', 'ada'))).toBe(true);
      expect(matches(binary('name', 'startswith', 'lovelace'))).toBe(false);
      expect(matches(binary('name', 'endswith', 'LACE'))).toBe(true);
    });
    it('null cells never match positive string ops', () => {
      expect(matches(binary('name', 'contains', 'a'), nullRow)).toBe(false);
      expect(matches(binary('name', 'startswith', 'a'), nullRow)).toBe(false);
      expect(matches(binary('name', 'notcontains', 'a'), nullRow)).toBe(true);
    });
    it('numbers coerce to text for contains', () => {
      expect(matches(binary('age', 'contains', '3'))).toBe(true);
    });
  });

  describe('in / between / isnull / isnotnull', () => {
    it('in with mixed candidates', () => {
      expect(matches(binary('age', 'in', [1, 36, 99]))).toBe(true);
      expect(matches(binary('age', 'in', [1, 2]))).toBe(false);
      expect(matches(binary('name', 'in', ['ADA LOVELACE']))).toBe(true);
    });
    it('between is inclusive and supports open ends', () => {
      expect(matches(binary('age', 'between', [30, 40]))).toBe(true);
      expect(matches(binary('age', 'between', [36, 36]))).toBe(true);
      expect(matches(binary('age', 'between', [37, 40]))).toBe(false);
      expect(matches(binary('age', 'between', [null, 40]))).toBe(true);
      expect(
        matches(binary('hired', 'between', ['2020-01-01', '2020-12-31'])),
      ).toBe(true);
    });
    it('isnull / isnotnull', () => {
      expect(matches(binary('name', 'isnull'), nullRow)).toBe(true);
      expect(matches(binary('name', 'isnull'))).toBe(false);
      expect(matches(binary('name', 'isnotnull'))).toBe(true);
    });
  });

  describe('logical composition', () => {
    it('and / or / not nesting', () => {
      const expr: FilterExpr = {
        type: 'and',
        operands: [
          binary('age', 'ge', 30),
          {
            type: 'or',
            operands: [
              binary('name', 'contains', 'ada'),
              binary('name', 'contains', 'grace'),
            ],
          },
          { type: 'not', operand: binary('active', 'eq', false) },
        ],
      };
      expect(matches(expr)).toBe(true);
      expect(matches(expr, nullRow)).toBe(false);
    });
  });
});

describe('applyFilter', () => {
  const rows: Row[] = [row, nullRow];

  it('returns the same reference without a filter', () => {
    expect(applyFilter(rows, null)).toBe(rows);
    expect(applyFilter(rows, undefined)).toBe(rows);
  });

  it('filters rows', () => {
    expect(applyFilter(rows, binary('active', 'eq', true))).toEqual([row]);
  });
});

describe('buildSearchFilter', () => {
  it('builds an or-of-contains across fields', () => {
    const expr = buildSearchFilter(['name', 'city'], 'anka');
    expect(expr).toEqual({
      type: 'or',
      operands: [
        { type: 'binary', field: 'name', op: 'contains', value: 'anka' },
        { type: 'binary', field: 'city', op: 'contains', value: 'anka' },
      ],
    });
  });

  it('returns null for blank text or no fields', () => {
    expect(buildSearchFilter(['a'], '   ')).toBeNull();
    expect(buildSearchFilter([], 'x')).toBeNull();
  });

  it('collapses a single field to the bare expression', () => {
    expect(buildSearchFilter(['name'], 'x')).toEqual({
      type: 'binary',
      field: 'name',
      op: 'contains',
      value: 'x',
    });
  });
});
