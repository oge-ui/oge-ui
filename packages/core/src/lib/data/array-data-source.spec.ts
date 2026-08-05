import { ArrayDataSource } from './array-data-source';

interface Row {
  id: number;
  name: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'c' },
  { id: 2, name: 'a' },
  { id: 3, name: 'b' },
];

describe('ArrayDataSource', () => {
  it('loads sorted and paged data with total count', async () => {
    const source = new ArrayDataSource(ROWS, { key: 'id' });
    const result = await source.load({
      sort: [{ field: 'name', dir: 'asc' }],
      skip: 0,
      take: 2,
      requireTotalCount: true,
    });
    expect((result.data as Row[]).map((r) => r.name)).toEqual(['a', 'b']);
    expect(result.totalCount).toBe(3);
  });

  it('supports a getter as data provider', async () => {
    let rows = ROWS.slice(0, 1);
    const source = new ArrayDataSource(() => rows, { key: 'id' });
    expect((await source.load({})).data).toHaveLength(1);
    rows = ROWS;
    expect((await source.load({})).data).toHaveLength(3);
  });

  it('derives keys from the key option', () => {
    const source = new ArrayDataSource(ROWS, { key: (r) => `row-${r.id}` });
    expect(source.keyOf(ROWS[1])).toBe('row-2');
  });

  it('falls back to index-based keys', () => {
    const source = new ArrayDataSource(ROWS);
    expect(source.keyOf(ROWS[2])).toBe(2);
  });
});
