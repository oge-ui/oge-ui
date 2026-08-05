import { ODataDataSource, buildODataQuery } from './odata';

describe('buildODataQuery', () => {
  it('serializes paging, sorting and count', () => {
    const query = buildODataQuery({
      skip: 40,
      take: 20,
      sort: [
        { field: 'name', dir: 'asc' },
        { field: 'price', dir: 'desc' },
      ],
      requireTotalCount: true,
    });
    expect(query).toBe(`$skip=40&$top=20&$orderby=${encodeURIComponent('name,price desc')}&$count=true`);
  });

  it('serializes the full filter operator matrix', () => {
    const query = buildODataQuery({
      filter: {
        type: 'and',
        operands: [
          { type: 'binary', field: 'price', op: 'ge', value: 10 },
          { type: 'binary', field: 'name', op: 'contains', value: "o'brien" },
          { type: 'binary', field: 'status', op: 'in', value: ['a', 'b'] },
          { type: 'binary', field: 'age', op: 'between', value: [18, 65] },
          { type: 'not', operand: { type: 'binary', field: 'deleted', op: 'eq', value: true } },
          { type: 'binary', field: 'closedAt', op: 'isnull' },
        ],
      },
    });
    const filter = decodeURIComponent(query.replace('$filter=', ''));
    expect(filter).toContain('price ge 10');
    expect(filter).toContain("contains(name,'o''brien')");
    expect(filter).toContain("(status eq 'a') or (status eq 'b')");
    expect(filter).toContain('(age ge 18) and (age le 65)');
    expect(filter).toContain('not (deleted eq true)');
    expect(filter).toContain('closedAt eq null');
  });

  it('folds searchText over searchFields into the filter', () => {
    const query = buildODataQuery(
      { searchText: 'ada', filter: { type: 'binary', field: 'active', op: 'eq', value: true } },
      { searchFields: ['firstName', 'lastName'] }
    );
    const filter = decodeURIComponent(query.replace('$filter=', ''));
    expect(filter).toBe("(active eq true) and ((contains(firstName,'ada') or contains(lastName,'ada')))");
  });

  it('returns an empty string when nothing is requested', () => {
    expect(buildODataQuery({})).toBe('');
  });
});

describe('ODataDataSource', () => {
  it('requests the built URL and maps value/@odata.count', async () => {
    const calls: string[] = [];
    const fetchFn = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ value: [{ id: 1 }, { id: 2 }], '@odata.count': 42 }),
      } as Response;
    }) as typeof fetch;
    const source = new ODataDataSource<{ id: number }>({
      url: 'https://api.test/odata/Items',
      key: 'id',
      fetchFn,
    });
    const result = await source.load({ skip: 0, take: 2, requireTotalCount: true });
    expect(calls[0]).toBe('https://api.test/odata/Items?$top=2&$count=true');
    expect(result.data).toHaveLength(2);
    expect(result.totalCount).toBe(42);
    expect(source.keyOf({ id: 7 })).toBe(7);
  });

  it('throws a descriptive error on HTTP failure', async () => {
    const fetchFn = (async () =>
      ({ ok: false, status: 500, statusText: 'Server Error', json: async () => ({}) }) as Response) as typeof fetch;
    const source = new ODataDataSource<{ id: number }>({
      url: 'https://api.test/odata/Items',
      key: 'id',
      fetchFn,
    });
    await expect(source.load({})).rejects.toThrow('ODataDataSource: 500 Server Error');
  });
});
