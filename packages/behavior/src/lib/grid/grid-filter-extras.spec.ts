import { createFilterPredicate } from '@oge-ui/core';
import {
  ogeAutoListFields,
  ogeDatePresetExpr,
  ogeDatePresetRange,
  ogeFilterCellExpr,
  ogeFilterRangeExpr,
  ogeQualifiesForAutoList,
  ogeResolveDatePresets,
} from './grid-filter-extras';

describe('automatic value lists', () => {
  const repeat = (n: number, distinct: number) =>
    Array.from({ length: n }, (_, i) => `v${i % distinct}`);

  it('needs enough rows, few distinct values and real repetition', () => {
    expect(ogeQualifiesForAutoList(repeat(7, 2))).toBe(false); // 7 rows
    expect(ogeQualifiesForAutoList(repeat(8, 2))).toBe(true);
    expect(ogeQualifiesForAutoList(repeat(40, 20))).toBe(false); // 20 names / 40
    expect(ogeQualifiesForAutoList(repeat(40, 19))).toBe(true);
    expect(ogeQualifiesForAutoList(repeat(200, 26))).toBe(false); // > 25
    // blanks are one value
    expect(
      ogeQualifiesForAutoList(['', null, '  ', 'a', 'a', 'a', 'b', 'b']),
    ).toBe(true);
  });

  it('picks the qualifying fields of a row set', () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      city: ['Ankara', 'İzmir', 'Bursa'][i % 3],
    }));
    expect([
      ...ogeAutoListFields(rows, ['id', 'city'], (row, f) => row[f as 'id']),
    ]).toEqual(['city']);
  });
});

describe('date presets', () => {
  const now = new Date(2026, 10, 11, 15, 30); // Wednesday 11 Nov 2026
  const day = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

  it('covers whole local days, weeks from the locale first day', () => {
    const range = (p: Parameters<typeof ogeDatePresetRange>[0], fdow = 1) => {
      const r = ogeDatePresetRange(p, now, fdow);
      return [day(r.from), day(r.to)];
    };
    expect(range('today')).toEqual([
      [2026, 11, 11],
      [2026, 11, 11],
    ]);
    expect(range('yesterday')).toEqual([
      [2026, 11, 10],
      [2026, 11, 10],
    ]);
    expect(range('thisWeek', 1)).toEqual([
      [2026, 11, 9],
      [2026, 11, 15],
    ]);
    expect(range('thisWeek', 0)).toEqual([
      [2026, 11, 8],
      [2026, 11, 14],
    ]);
    expect(range('thisMonth')).toEqual([
      [2026, 11, 1],
      [2026, 11, 30],
    ]);
    expect(range('last30Days')).toEqual([
      [2026, 10, 13],
      [2026, 11, 11],
    ]);
    expect(range('thisYear')).toEqual([
      [2026, 1, 1],
      [2026, 12, 31],
    ]);
  });

  it('writes a half-open range that keeps the last day whole', () => {
    const test = createFilterPredicate<{ at: Date | null }>(
      ogeDatePresetExpr('at', 'today', now, 1),
    );
    expect(test({ at: new Date(2026, 10, 11, 23, 59) })).toBe(true);
    expect(test({ at: new Date(2026, 10, 12, 0, 0) })).toBe(false);
    expect(test({ at: null })).toBe(false);
  });

  it('resolves the option', () => {
    expect(ogeResolveDatePresets(false)).toEqual([]);
    expect(ogeResolveDatePresets(true)).toHaveLength(6);
    expect(
      ogeResolveDatePresets(['today', 'bogus' as never, 'thisYear']),
    ).toEqual(['today', 'thisYear']);
  });
});

describe('custom and range filter cells', () => {
  it('maps a cell value to an expression', () => {
    expect(ogeFilterCellExpr('q', '', 'eq')).toBeNull();
    expect(ogeFilterCellExpr('q', [], 'eq')).toBeNull();
    expect(ogeFilterCellExpr('q', 5, 'ge')).toEqual({
      type: 'binary',
      field: 'q',
      op: 'ge',
      value: 5,
    });
    expect(ogeFilterCellExpr('q', [1, 9], 'eq')).toEqual({
      type: 'binary',
      field: 'q',
      op: 'between',
      value: [1, 9],
    });
    expect(ogeFilterCellExpr('c', ['a', 'b', 'c'], 'eq')?.type).toBe('binary');
    const calc = ogeFilterCellExpr('q', 3, 'eq', (v) => ({
      type: 'binary',
      field: 'other',
      op: 'eq',
      value: v,
    }));
    expect(calc).toEqual({
      type: 'binary',
      field: 'other',
      op: 'eq',
      value: 3,
    });
  });

  it('drops the filter while the slider spans the whole range', () => {
    const range = { min: 0, max: 100 };
    expect(ogeFilterRangeExpr('q', range, [0, 100])).toBeNull();
    expect(ogeFilterRangeExpr('q', range, [10, 100])).toEqual({
      type: 'binary',
      field: 'q',
      op: 'between',
      value: [10, 100],
    });
  });
});
