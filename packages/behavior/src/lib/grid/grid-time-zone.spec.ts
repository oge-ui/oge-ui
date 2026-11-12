import { createFilterPredicate, type FilterExpr } from '@oge-ui/core';
import {
  dateFilterExpr,
  dateRangeFilterExpr,
  ogeCompileColumnFormat,
  ogeZonedWall,
} from './grid-columns';
import { ogeDatePresetExpr } from './grid-filter-extras';
import {
  groupHeaderValuesByDate,
  headerConditionExpr,
  parseHeaderConditionExpr,
} from './grid-header-conditions';

const utc = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(Date.UTC(y, m - 1, d, h, min));
const wallDay = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const bounds = (expr: FilterExpr | null) =>
  expr?.type === 'and'
    ? expr.operands.map((o) =>
        o.type === 'binary' ? (o.value as Date).toISOString() : '',
      )
    : [];

describe('zoned date columns', () => {
  it('formats a Date as its wall clock in the zone', () => {
    const format = ogeCompileColumnFormat(undefined, 'en-US', 'UTC', 'date');
    // 2026-03-05 02:00 UTC is still the 4th in New York, the 5th in UTC
    expect(format?.(utc(2026, 3, 5, 2))).toBe('3/5/2026');
    const ny = ogeCompileColumnFormat(
      undefined,
      'en-US',
      'America/New_York',
      'date',
    );
    expect(ny?.(utc(2026, 3, 5, 2))).toBe('3/4/2026');
    // a host format receives the wall clock too
    const own = ogeCompileColumnFormat(
      (v) => String((v as Date).getDate()),
      'en-US',
      'UTC',
      'datetime',
    );
    expect(own?.(utc(2026, 3, 5, 23, 30))).toBe('5');
    // non-date columns and zone-less columns are untouched
    expect(ogeCompileColumnFormat(undefined, 'en-US', 'UTC', 'number')).toBe(
      undefined,
    );
    expect(ogeZonedWall('x', 'UTC')).toBe('x');
  });

  it('filters whole days of the zone', () => {
    const range = dateRangeFilterExpr(
      'at',
      wallDay(2026, 3, 5),
      wallDay(2026, 3, 5),
      'UTC',
    );
    expect(bounds(range)).toEqual([
      '2026-03-05T00:00:00.000Z',
      '2026-03-06T00:00:00.000Z',
    ]);
    const eq = dateFilterExpr(
      'at',
      'eq',
      wallDay(2026, 3, 5),
      'America/New_York',
    );
    expect(bounds(eq)).toEqual([
      '2026-03-05T05:00:00.000Z',
      '2026-03-06T05:00:00.000Z',
    ]);
    const test = createFilterPredicate<{ at: Date }>(eq);
    expect(test({ at: utc(2026, 3, 6, 4, 59) })).toBe(true); // 23:59 NY
    expect(test({ at: utc(2026, 3, 5, 4, 59) })).toBe(false);
  });

  it("builds quick dates from the zone's today", () => {
    // 01:00 UTC on 6 Mar is still 5 Mar in New York
    const expr = ogeDatePresetExpr(
      'at',
      'today',
      utc(2026, 3, 6, 1),
      1,
      'America/New_York',
    );
    expect(bounds(expr)).toEqual([
      '2026-03-05T05:00:00.000Z',
      '2026-03-06T05:00:00.000Z',
    ]);
  });

  it('round-trips a header condition through the zone', () => {
    const filter = {
      first: { operator: 'eq' as const, value: wallDay(2026, 11, 1) },
      second: { operator: 'eq' as const, value: null },
      logic: 'and' as const,
    };
    const expr = headerConditionExpr('at', 'date', filter, 'America/New_York');
    expect(bounds(expr)).toEqual([
      '2026-11-01T04:00:00.000Z',
      // the 1st of November 2026 is the 25-hour DST day in New York
      '2026-11-02T05:00:00.000Z',
    ]);
    const back = parseHeaderConditionExpr(expr, 'date', 'America/New_York');
    expect(back.first.operator).toBe('eq');
    expect((back.first.value as Date).getTime()).toBe(
      wallDay(2026, 11, 1).getTime(),
    );
  });

  it("groups the date tree by the zone's days", () => {
    const late = utc(2026, 12, 31, 23); // 1 Jan in Istanbul
    const tree = groupHeaderValuesByDate(
      [late],
      '',
      '(Blank)',
      () => 'x',
      undefined,
      'en-US',
      'Europe/Istanbul',
    );
    expect(tree[0].key).toBe('2027');
    expect(tree[0].children[0].key).toBe('2027-01');
    expect(tree[0].values).toEqual([late]);
  });
});
