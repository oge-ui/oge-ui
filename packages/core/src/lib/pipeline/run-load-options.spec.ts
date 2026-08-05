import { applyPaging } from './steps/paginate.step';
import { applySort } from './steps/sort.step';
import { runLoadOptions } from './run-load-options';

interface Row {
  id: number;
  name: string | null;
  dept: string;
  salary: number;
}

const ROWS: Row[] = [
  { id: 1, name: 'Cem', dept: 'B', salary: 300 },
  { id: 2, name: 'Ali', dept: 'A', salary: 100 },
  { id: 3, name: null, dept: 'A', salary: 200 },
  { id: 4, name: 'Ali', dept: 'B', salary: 200 },
];

describe('applySort', () => {
  it('returns the same reference when there is nothing to sort', () => {
    expect(applySort(ROWS, undefined)).toBe(ROWS);
    expect(applySort(ROWS, [])).toBe(ROWS);
  });

  it('does not mutate the input', () => {
    const copy = [...ROWS];
    applySort(ROWS, [{ field: 'salary', dir: 'asc' }]);
    expect(ROWS).toEqual(copy);
  });

  it('sorts ascending with nulls last', () => {
    const sorted = applySort(ROWS, [{ field: 'name', dir: 'asc' }]);
    expect(sorted.map((r) => r.name)).toEqual(['Ali', 'Ali', 'Cem', null]);
  });

  it('sorts by multiple keys', () => {
    const sorted = applySort(ROWS, [
      { field: 'dept', dir: 'asc' },
      { field: 'salary', dir: 'desc' },
    ]);
    expect(sorted.map((r) => r.id)).toEqual([3, 2, 1, 4]);
  });

  it('is stable: equal keys keep their original order', () => {
    const sorted = applySort(ROWS, [{ field: 'salary', dir: 'asc' }]);
    // id 3 comes before id 4 (both salary 200) because it appears first in the input
    expect(sorted.map((r) => r.id)).toEqual([2, 3, 4, 1]);
  });

  it('sorts dotted paths', () => {
    const nested = [{ a: { b: 2 } }, { a: { b: 1 } }];
    const sorted = applySort(nested, [{ field: 'a.b', dir: 'asc' }]);
    expect(sorted.map((r) => r.a.b)).toEqual([1, 2]);
  });
});

describe('applyPaging', () => {
  it('returns the same reference without a window', () => {
    expect(applyPaging(ROWS)).toBe(ROWS);
  });

  it('applies skip/take', () => {
    expect(applyPaging([1, 2, 3, 4, 5], 1, 2)).toEqual([2, 3]);
    expect(applyPaging([1, 2, 3], 0, 10)).toEqual([1, 2, 3]);
    expect(applyPaging([1, 2, 3], 2)).toEqual([3]);
  });
});

describe('runLoadOptions', () => {
  it('sorts then pages and reports totalCount', () => {
    const result = runLoadOptions(ROWS, {
      sort: [{ field: 'salary', dir: 'asc' }],
      skip: 1,
      take: 2,
      requireTotalCount: true,
    });
    expect((result.data as Row[]).map((r) => r.id)).toEqual([3, 4]);
    expect(result.totalCount).toBe(4);
  });

  it('omits totalCount unless required', () => {
    expect(runLoadOptions(ROWS, {}).totalCount).toBeUndefined();
  });

  it('sorts 10k rows well under the 50ms budget', () => {
    const rows = Array.from({ length: 10_000 }, (_, i) => ({
      id: i,
      value: (i * 2654435761) % 100_000,
    }));
    const start = performance.now();
    runLoadOptions(rows, { sort: [{ field: 'value', dir: 'asc' }], requireTotalCount: true });
    expect(performance.now() - start).toBeLessThan(50);
  });
});
