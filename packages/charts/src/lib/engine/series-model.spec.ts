import {
  buildSeries,
  collectCategories,
  numericArgument,
  seriesValueExtent,
  type ChartSeriesInput,
} from './series-model';

interface Row {
  month: string;
  sales?: number | null;
  cost?: number;
  meta?: { deep: number };
}

const DATA: Row[] = [
  { month: 'Jan', sales: 10, cost: 4, meta: { deep: 1 } },
  { month: 'Feb', sales: null, cost: 5 },
  { month: 'Mar', sales: 30, cost: 6 },
];

const LINE: ChartSeriesInput<Row> = {
  type: 'line',
  argumentField: 'month',
  valueField: 'sales',
  name: 'Sales',
};

describe('collectCategories', () => {
  it('collects the argument union in first-appearance order', () => {
    expect(collectCategories(DATA, [LINE])).toEqual(['Jan', 'Feb', 'Mar']);
  });
});

describe('buildSeries', () => {
  const categories = new Map<unknown, number>([
    ['Jan', 0],
    ['Feb', 1],
    ['Mar', 2],
  ]);

  it('extracts points with category positions; null value = gap', () => {
    const series = buildSeries(DATA, LINE, 0, 'category', categories);
    expect(series.name).toBe('Sales');
    expect(series.points.map((p) => p.argNumeric)).toEqual([0, 1, 2]);
    expect(series.points.map((p) => p.value)).toEqual([10, null, 30]);
    expect(series.points[0].source).toBe(DATA[0]);
  });

  it('reads dotted paths and getter functions', () => {
    const dotted = buildSeries(
      DATA,
      { type: 'line', argumentField: 'month', valueField: 'meta.deep' },
      0,
      'category',
      categories,
    );
    expect(dotted.points[0].value).toBe(1);
    const getter = buildSeries(
      DATA,
      {
        type: 'line',
        argumentField: (row) => row.month,
        valueField: (row) => (row.cost ?? 0) * 2,
      },
      1,
      'category',
      categories,
    );
    expect(getter.points.map((p) => p.value)).toEqual([8, 10, 12]);
    expect(getter.name).toBe('Series 2');
  });

  it('candlestick reads OHLC; rangeArea reads both bounds', () => {
    const ohlc = [{ t: 1, o: 5, h: 9, l: 3, c: 7 }];
    const candle = buildSeries(
      ohlc,
      {
        type: 'candlestick',
        argumentField: 't',
        openField: 'o',
        highField: 'h',
        lowField: 'l',
        closeField: 'c',
      },
      0,
      'linear',
      new Map(),
    );
    expect(candle.points[0]).toMatchObject({ open: 5, high: 9, low: 3, close: 7 });
    const range = buildSeries(
      [{ t: 1, lo: 2, hi: 8 }],
      { type: 'rangeArea', argumentField: 't', value1Field: 'lo', value2Field: 'hi' },
      0,
      'linear',
      new Map(),
    );
    expect(range.points[0].value2).toBe(2);
    expect(range.points[0].value).toBe(8);
  });
});

describe('numericArgument', () => {
  it('resolves per axis kind', () => {
    expect(numericArgument(5, 'linear', new Map())).toBe(5);
    expect(numericArgument('x', 'category', new Map([['x', 3]]))).toBe(3);
    expect(numericArgument('unknown', 'category', new Map())).toBeNull();
    const date = new Date(2026, 0, 5);
    expect(numericArgument(date, 'time', new Map())).toBe(date.getTime());
    // string dates parse as LOCAL wall time (house rule)
    expect(numericArgument('2026-01-05', 'time', new Map())).toBe(
      new Date(2026, 0, 5).getTime(),
    );
    expect(numericArgument(Number.NaN, 'linear', new Map())).toBeNull();
  });
});

describe('seriesValueExtent', () => {
  const categories = new Map<unknown, number>();

  it('spans values, ignoring gaps; null when nothing plots', () => {
    const series = buildSeries(
      DATA,
      LINE,
      0,
      'category',
      new Map([
        ['Jan', 0],
        ['Feb', 1],
        ['Mar', 2],
      ]),
    );
    expect(seriesValueExtent(series)).toEqual({ min: 10, max: 30 });
    const empty = buildSeries(
      [],
      LINE,
      0,
      'category',
      categories,
    );
    expect(seriesValueExtent(empty)).toBeNull();
  });

  it('candlestick extent spans low..high', () => {
    const candle = buildSeries(
      [{ t: 1, o: 5, h: 9, l: 3, c: 7 }],
      {
        type: 'candlestick',
        argumentField: 't',
        openField: 'o',
        highField: 'h',
        lowField: 'l',
        closeField: 'c',
      },
      0,
      'linear',
      categories,
    );
    expect(seriesValueExtent(candle)).toEqual({ min: 3, max: 9 });
  });
});
