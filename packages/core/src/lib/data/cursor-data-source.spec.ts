import { CursorDataSource, type CursorPageRequest } from './cursor-data-source';

interface Row {
  id: number;
}

/** A fake cursor endpoint over `count` rows; the cursor is the next id. */
function endpoint(count: number, pageSize = 10) {
  const calls: CursorPageRequest<number>[] = [];
  const fetchPage = async (request: CursorPageRequest<number>) => {
    calls.push(request);
    const start = request.cursor ?? 0;
    const end = Math.min(count, start + request.pageSize);
    const items: Row[] = [];
    for (let id = start; id < end; id++) items.push({ id });
    return { items, nextCursor: end < count ? end : null };
  };
  const source = new CursorDataSource<Row, number>({
    key: 'id',
    pageSize,
    fetchPage,
  });
  return { source, calls };
}

const ids = (rows: readonly unknown[]) => (rows as Row[]).map((r) => r.id);

describe('CursorDataSource', () => {
  it('walks the cursor chain until the window is covered', async () => {
    const { source, calls } = endpoint(100);
    const result = await source.load({ skip: 15, take: 10 });
    expect(ids(result.data)).toEqual([15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
    expect(calls.map((c) => c.cursor)).toEqual([null, 10, 20]);
    // the total stays open until the last page arrives
    expect(result.totalCount).toBeUndefined();
    expect(source.hasMore).toBe(true);
  });

  it('serves an already fetched window without a request', async () => {
    const { source, calls } = endpoint(100);
    await source.load({ skip: 0, take: 30 });
    const before = calls.length;
    const again = await source.load({ skip: 10, take: 10 });
    expect(ids(again.data)[0]).toBe(10);
    expect(calls.length).toBe(before);
  });

  it('reports the total once the chain ends', async () => {
    const { source } = endpoint(25);
    const result = await source.load({ skip: 20, take: 20 });
    expect(ids(result.data)).toEqual([20, 21, 22, 23, 24]);
    expect(result.totalCount).toBe(25);
    expect(source.hasMore).toBe(false);
  });

  it('loads everything when no window is asked for', async () => {
    const { source } = endpoint(35);
    const result = await source.load({});
    expect(result.data).toHaveLength(35);
    expect(result.totalCount).toBe(35);
  });

  it('shares one sequential walk between concurrent windows', async () => {
    const { source, calls } = endpoint(100);
    const [a, b] = await Promise.all([
      source.load({ skip: 0, take: 20 }),
      source.load({ skip: 20, take: 20 }),
    ]);
    expect(ids(a.data)[0]).toBe(0);
    expect(ids(b.data)[0]).toBe(20);
    expect(calls.map((c) => c.cursor)).toEqual([null, 10, 20, 30]);
  });

  it('passes the query without skip/take and restarts when it changes', async () => {
    const { source, calls } = endpoint(100);
    await source.load({
      skip: 0,
      take: 10,
      sort: [{ field: 'id', dir: 'asc' }],
    });
    expect(calls[0]).toEqual({
      sort: [{ field: 'id', dir: 'asc' }],
      cursor: null,
      pageSize: 10,
    });
    await source.load({ skip: 0, take: 10, searchText: 'x' });
    expect(calls.at(-1)?.cursor).toBeNull();
    expect(calls.at(-1)?.searchText).toBe('x');
  });

  it('never mixes rows of a superseded query into the new one', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const source = new CursorDataSource<Row, number>({
      key: 'id',
      pageSize: 2,
      fetchPage: async ({ cursor, searchText }) => {
        if (searchText === 'slow') await gate;
        const base = searchText === 'slow' ? 1000 : 0;
        const start = cursor ?? 0;
        return {
          items: [{ id: base + start }, { id: base + start + 1 }],
          nextCursor: start + 2 < 6 ? start + 2 : null,
        };
      },
    });
    const stale = source.load({ skip: 0, take: 2, searchText: 'slow' });
    const fresh = await source.load({ skip: 0, take: 4 });
    release();
    await stale;
    expect(ids(fresh.data)).toEqual([0, 1, 2, 3]);
    const again = await source.load({ skip: 0, take: 4 });
    expect(ids(again.data)).toEqual([0, 1, 2, 3]);
  });

  it('ends the chain on an empty page even if a cursor comes back', async () => {
    const source = new CursorDataSource<Row, number>({
      key: 'id',
      fetchPage: async () => ({ items: [], nextCursor: 7 }),
    });
    const result = await source.load({ skip: 0, take: 50 });
    expect(result.data).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('recovers after a failed fetch', async () => {
    let fail = true;
    const source = new CursorDataSource<Row, number>({
      key: 'id',
      pageSize: 5,
      fetchPage: async ({ cursor }) => {
        if (fail) throw new Error('offline');
        const start = cursor ?? 0;
        return {
          items: [0, 1, 2, 3, 4].map((i) => ({ id: start + i })),
          nextCursor: null,
        };
      },
    });
    await expect(source.load({ skip: 0, take: 5 })).rejects.toThrow('offline');
    fail = false;
    const result = await source.load({ skip: 0, take: 5 });
    expect(ids(result.data)).toEqual([0, 1, 2, 3, 4]);
  });

  it('invalidate() starts over from the first page', async () => {
    const { source, calls } = endpoint(30);
    await source.load({ skip: 0, take: 10 });
    source.invalidate();
    expect(source.loadedCount).toBe(0);
    await source.load({ skip: 0, take: 10 });
    expect(calls.map((c) => c.cursor)).toEqual([null, null]);
  });

  it('keys rows and defaults to server sort/filter without grouping', () => {
    const { source } = endpoint(1);
    expect(source.keyOf({ id: 4 })).toBe(4);
    expect(source.capabilities).toEqual({
      sort: true,
      filter: true,
      group: false,
      paging: true,
      summary: false,
    });
  });
});
