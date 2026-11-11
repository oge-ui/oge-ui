import { ArrayDataSource } from './array-data-source';

interface Ticket {
  id: number;
  status: number;
  first: string;
  last: string;
  opened: Date;
}

const STATUS = ['Open', 'In progress', 'Closed'];
const rows: Ticket[] = [
  {
    id: 1,
    status: 0,
    first: 'Ada',
    last: 'Kaya',
    opened: new Date(2026, 0, 3),
  },
  { id: 2, status: 1, first: 'Can', last: 'Öz', opened: new Date(2026, 1, 9) },
  {
    id: 3,
    status: 2,
    first: 'Ece',
    last: 'Ilgaz',
    opened: new Date(2026, 2, 1),
  },
  {
    id: 4,
    status: 1,
    first: 'Ali',
    last: 'Kaya',
    opened: new Date(2026, 2, 5),
  },
];

describe('ArrayDataSource display values', () => {
  const source = new ArrayDataSource(rows, {
    key: 'id',
    // a derived column filtered on its own text
    filterValues: { name: (row) => `${row.first} ${row.last}` },
    // a lookup column searched on its labels
    searchValues: { status: (row) => STATUS[row.status] },
  });
  const ids = (options: Parameters<typeof source.loadSync>[0]) =>
    source.loadSync(options).data.map((r) => (r as Ticket).id);

  it('filters a field through its filter value', () => {
    expect(
      ids({
        filter: {
          type: 'binary',
          field: 'name',
          op: 'contains',
          value: 'ali k',
        },
      }),
    ).toEqual([4]);
  });

  it('searches lookup labels beside the stored values', () => {
    expect(ids({ searchText: 'progress' })).toEqual([2, 4]);
    expect(ids({ searchText: 'ilgaz' })).toEqual([3]);
    // the derived field is searched through its filter value
    expect(ids({ searchText: 'ada kaya' })).toEqual([1]);
  });

  it('lists distinct filter values', async () => {
    expect(await source.distinct('name', { search: 'kaya' })).toEqual([
      'Ada Kaya',
      'Ali Kaya',
    ]);
  });
});

describe('filter compilation (performance budget)', () => {
  const N = 10_000;
  const big = Array.from({ length: N }, (_, i) => ({
    id: i,
    city: `City ${i % 400}`,
    at: new Date(2026, 0, 1 + (i % 365)),
    iso: new Date(2026, 0, 1 + (i % 365)).toISOString(),
  }));
  const source = new ArrayDataSource(big, { key: 'id' });

  it('filters 10 000 rows by a 200-item list and a date range quickly', () => {
    const list = Array.from({ length: 200 }, (_, i) => `City ${i * 2}`);
    const started = performance.now();
    const result = source.loadSync({
      filter: {
        type: 'and',
        operands: [
          { type: 'binary', field: 'city', op: 'in', value: list },
          {
            type: 'binary',
            field: 'at',
            op: 'ge',
            value: new Date(2026, 5, 1),
          },
          { type: 'binary', field: 'iso', op: 'lt', value: '2026-12-01' },
        ],
      },
      requireTotalCount: true,
    });
    const elapsed = performance.now() - started;
    expect(result.totalCount).toBeGreaterThan(0);
    // generous: the shared Set and the epoch prepared once keep it ~5 ms
    expect(elapsed).toBeLessThan(250);
  });

  it('lists the distinct values of 10 000 rows quickly', async () => {
    const started = performance.now();
    const values = await source.distinct('city');
    expect(values).toHaveLength(400);
    expect(performance.now() - started).toBeLessThan(250);
  });
});
