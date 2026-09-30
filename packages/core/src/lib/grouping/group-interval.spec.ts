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
