import { groupKeyOf, groupRows } from './group-rows';

describe('date grouping', () => {
  it('buckets equal instants together even as distinct Date objects', () => {
    const rows = [
      { at: new Date(2026, 8, 1, 10) },
      { at: new Date(2026, 8, 1, 10) },
    ];
    const groups = groupRows(rows, [{ field: 'at', dir: 'asc' }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
  });

  it("interval 'day' merges different times of one calendar day", () => {
    const rows = [
      { at: new Date(2026, 8, 1, 9) },
      { at: new Date(2026, 8, 1, 17, 30) },
      { at: new Date(2026, 8, 2, 8) },
    ];
    const groups = groupRows(rows, [
      { field: 'at', dir: 'asc', interval: 'day' },
    ]);
    expect(groups.map((g) => g.count)).toEqual([2, 1]);
    expect(groups[0].key).toEqual(new Date(2026, 8, 1));
  });

  it('month and year truncate; ISO strings parse only with an interval', () => {
    expect(groupKeyOf(new Date(2026, 8, 17), 'month')).toEqual(
      new Date(2026, 8, 1),
    );
    expect(groupKeyOf(new Date(2026, 8, 17), 'year')).toEqual(
      new Date(2026, 0, 1),
    );
    expect(groupKeyOf('2026-09-17T12:00:00', 'day')).toEqual(
      new Date(2026, 8, 17),
    );
    expect(groupKeyOf('2026-09-17')).toBe('2026-09-17');
    expect(groupKeyOf('Izmir', 'day')).toBe('Izmir');
    expect(groupKeyOf(null, 'day')).toBeNull();
  });
});

describe('groupKeyFilter', () => {
  it('eq for plain keys, a half-open range for date buckets', async () => {
    const { groupKeyFilter } = await import('./group-rows');
    expect(groupKeyFilter('city', 'Izmir')).toEqual({
      type: 'binary',
      field: 'city',
      op: 'eq',
      value: 'Izmir',
    });
    expect(groupKeyFilter('at', new Date(2026, 11, 31), 'day')).toEqual({
      type: 'and',
      operands: [
        {
          type: 'binary',
          field: 'at',
          op: 'ge',
          value: new Date(2026, 11, 31),
        },
        { type: 'binary', field: 'at', op: 'lt', value: new Date(2027, 0, 1) },
      ],
    });
  });
});

describe('hour / week / quarter and numeric intervals', () => {
  it('truncates dates to the hour, the week start and the quarter', async () => {
    const { resolveFirstDayOfWeek, startOfWeek } = await import(
      '../util/date-utils'
    );
    const at = new Date(2026, 4, 14, 17, 45);
    expect(groupKeyOf(at, 'hour')).toEqual(new Date(2026, 4, 14, 17));
    expect(groupKeyOf(at, 'quarter')).toEqual(new Date(2026, 3, 1));
    expect(groupKeyOf(at, 'week')).toEqual(
      startOfWeek(at, resolveFirstDayOfWeek(undefined, undefined)),
    );
  });

  it('buckets numbers by width and filters the half-open range', async () => {
    const { groupKeyFilter } = await import('./group-rows');
    expect(groupKeyOf(149, 50)).toBe(100);
    expect(groupKeyOf(-1, 50)).toBe(-50);
    expect(groupKeyOf('x', 50)).toBe('x');
    expect(groupKeyFilter('n', 100, 50)).toEqual({
      type: 'and',
      operands: [
        { type: 'binary', field: 'n', op: 'ge', value: 100 },
        { type: 'binary', field: 'n', op: 'lt', value: 150 },
      ],
    });
    expect(groupKeyFilter('d', new Date(2026, 3, 1), 'quarter')).toEqual({
      type: 'and',
      operands: [
        { type: 'binary', field: 'd', op: 'ge', value: new Date(2026, 3, 1) },
        { type: 'binary', field: 'd', op: 'lt', value: new Date(2026, 6, 1) },
      ],
    });
  });

  it('groups rows into numeric buckets', () => {
    const groups = groupRows(
      [{ n: 5 }, { n: 12 }, { n: 18 }, { n: 31 }],
      [{ field: 'n', dir: 'asc', interval: 10 }],
    );
    expect(groups.map((g) => [g.key, g.count])).toEqual([
      [0, 1],
      [10, 2],
      [30, 1],
    ]);
  });
});
