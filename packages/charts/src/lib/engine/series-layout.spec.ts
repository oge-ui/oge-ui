import {
  candleGeometry,
  computeBarSlots,
  computeStacks,
} from './series-layout';
import { buildSeries, type ChartSeriesInput } from './series-model';

interface Row {
  cat: string;
  a: number;
  b: number;
}

const DATA: Row[] = [
  { cat: 'x', a: 10, b: 30 },
  { cat: 'y', a: -5, b: 20 },
];

const CATS = new Map<unknown, number>([
  ['x', 0],
  ['y', 1],
]);

function series(input: ChartSeriesInput<Row>, index = 0) {
  return buildSeries(DATA, input, index, 'category', CATS);
}

describe('computeStacks', () => {
  it('stacks positive values upward, negatives downward, per stack group', () => {
    const list = [
      series({ type: 'stackedBar', argumentField: 'cat', valueField: 'a' }),
      series({ type: 'stackedBar', argumentField: 'cat', valueField: 'b' }, 1),
    ];
    const stacks = computeStacks(list);
    expect(stacks[0]?.[0]).toEqual({ base: 0, top: 10 });
    expect(stacks[1]?.[0]).toEqual({ base: 10, top: 40 });
    // negative branch stacks separately from 0
    expect(stacks[0]?.[1]).toEqual({ base: 0, top: -5 });
    expect(stacks[1]?.[1]).toEqual({ base: 0, top: 20 });
  });

  it('separate stack groups do not accumulate together', () => {
    const list = [
      series({
        type: 'stackedBar',
        argumentField: 'cat',
        valueField: 'a',
        stack: 'g1',
      }),
      series(
        {
          type: 'stackedBar',
          argumentField: 'cat',
          valueField: 'b',
          stack: 'g2',
        },
        1,
      ),
    ];
    const stacks = computeStacks(list);
    expect(stacks[1]?.[0]).toEqual({ base: 0, top: 30 });
  });

  it('fullStackedBar normalizes each argument to 1', () => {
    const list = [
      series({ type: 'fullStackedBar', argumentField: 'cat', valueField: 'a' }),
      series(
        { type: 'fullStackedBar', argumentField: 'cat', valueField: 'b' },
        1,
      ),
    ];
    const stacks = computeStacks(list);
    expect(stacks[0]?.[0]).toEqual({ base: 0, top: 0.25 }); // 10 / 40
    expect(stacks[1]?.[0]).toEqual({ base: 0.25, top: 1 });
  });

  it('non-stacked series map to null', () => {
    const list = [
      series({ type: 'line', argumentField: 'cat', valueField: 'a' }),
    ];
    expect(computeStacks(list)).toEqual([null]);
  });
});

describe('computeBarSlots', () => {
  it('plain bar series get side-by-side slots inside the padded band', () => {
    const list = [
      series({ type: 'bar', argumentField: 'cat', valueField: 'a' }),
      series({ type: 'bar', argumentField: 'cat', valueField: 'b' }, 1),
      series({ type: 'line', argumentField: 'cat', valueField: 'a' }, 2),
    ];
    const slots = computeBarSlots(list, 100, 0.2);
    expect(slots[2]).toBeNull();
    expect(slots[0]).toEqual({ offsetPx: -40, widthPx: 40 });
    expect(slots[1]).toEqual({ offsetPx: 0, widthPx: 40 });
  });

  it('stacked series share one slot per stack group', () => {
    const list = [
      series({ type: 'stackedBar', argumentField: 'cat', valueField: 'a' }),
      series(
        { type: 'stackedBar', argumentField: 'cat', valueField: 'b' },
        1,
      ),
    ];
    const slots = computeBarSlots(list, 100, 0.2);
    expect(slots[0]).toEqual(slots[1]);
    expect(slots[0]?.widthPx).toBe(80);
  });
});

describe('candleGeometry', () => {
  it('splits body and wicks, flags direction', () => {
    expect(
      candleGeometry({ open: 5, high: 9, low: 3, close: 7 }),
    ).toEqual({
      bodyTop: 7,
      bodyBottom: 5,
      wickTop: 9,
      wickBottom: 3,
      rising: true,
    });
    expect(
      candleGeometry({ open: 7, high: 9, low: 3, close: 5 })?.rising,
    ).toBe(false);
    expect(candleGeometry({ open: null, high: 9, low: 3, close: 5 })).toBeNull();
  });
});
