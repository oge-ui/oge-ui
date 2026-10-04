import {
  buildCartesianData,
  buildCartesianScene,
  cartesianPointEventColor,
  cartesianSrRows,
  cartesianTooltipRowText,
  chartArgumentText,
  chartLegendSwatch,
  chartValueText,
} from './cartesian-model';
import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';
import type { ChartSeriesInput } from './series-model';

function scene<T>(
  dataSource: readonly T[],
  series: readonly ChartSeriesInput<T>[],
  valueAxis?: Parameters<typeof buildCartesianScene>[0]['valueAxis'],
) {
  return buildCartesianScene({
    data: buildCartesianData({ dataSource, series }),
    valueAxis,
    visualRange: null,
    visibilityOverrides: new Map(),
    width: 600,
    height: 400,
    locale: 'en-US',
  });
}

const words = OGE_DEFAULT_CHARTS_MESSAGES.values;

describe('per-point colour', () => {
  const data = [
    { m: 'Jan', v: 10, c: '#ff0000' },
    { m: 'Feb', v: -5, c: '' },
    { m: 'Mar', v: 20, c: '#00ff00' },
  ];

  it('colorField colours bars; customizePoint wins and describes', () => {
    const s = scene(data, [
      {
        type: 'bar',
        argumentField: 'm',
        valueField: 'v',
        colorField: 'c',
        customizePoint: (info) =>
          info.value !== null && info.value < 0
            ? { color: '#0000ff', description: 'loss' }
            : undefined,
      },
    ]);
    const bars = s.renderSeries[0].bars;
    expect(bars.map((bar) => bar.color)).toEqual([
      '#ff0000',
      '#0000ff',
      '#00ff00',
    ]);
    // the legend swatch shows the distinct point colours
    expect(s.legendItems[0].swatch).toContain('linear-gradient');
    // colour is never the only channel: the sr table speaks the description
    expect(cartesianSrRows(s, 10)[1].cells[0]).toBe('-5, loss');
  });

  it('markers take point colours and marker overrides', () => {
    const s = scene(data, [
      {
        type: 'line',
        argumentField: 'm',
        valueField: 'v',
        customizePoint: (info) =>
          info.pointIndex === 2
            ? { marker: { size: 12 }, color: '#123456' }
            : info.pointIndex === 1
              ? { marker: { visible: false } }
              : null,
      },
    ]);
    const markers = s.renderSeries[0].markers;
    expect(markers).toHaveLength(2);
    expect(markers[1]).toMatchObject({ r: 6, color: '#123456' });
    const event = {
      seriesIndex: 0,
      seriesName: 'Series 1',
      pointIndex: 2,
      point: s.data.seriesList[0].points[2],
      event: new MouseEvent('click'),
    };
    expect(cartesianPointEventColor(s, event)).toBe('#123456');
  });

  it('a single colour is its own swatch', () => {
    expect(chartLegendSwatch(['#111', '#111'])).toBe('#111');
    expect(chartLegendSwatch([])).toBe('transparent');
  });
});

describe('data labels', () => {
  const data = [
    { m: 'Jan', v: 10 },
    { m: 'Feb', v: 0 },
    { m: 'Mar', v: 30 },
  ];

  it('positions bar labels outside, inside and at the base', () => {
    const at = (position: 'outside' | 'insideEnd' | 'insideBase') =>
      scene(data, [
        {
          type: 'bar',
          argumentField: 'm',
          valueField: 'v',
          label: { visible: true, position },
        },
      ]).renderSeries[0];
    const outside = at('outside');
    const bar = outside.bars[2];
    expect(outside.labels.find((l) => l.pointIndex === 2)?.y).toBeLessThan(
      bar.y,
    );
    const inside = at('insideEnd').labels.find((l) => l.pointIndex === 2);
    expect(inside?.inside).toBe(true);
    expect(inside?.y).toBeGreaterThan(bar.y);
    expect(inside?.textColor).toBe('#ffffff');
    const base = at('insideBase').labels.find((l) => l.pointIndex === 2);
    expect(base?.y).toBeGreaterThan(inside?.y ?? 0);
  });

  it('format, showForZero, per-point text and visibility', () => {
    const rs = scene(data, [
      {
        type: 'bar',
        argumentField: 'm',
        valueField: 'v',
        label: {
          visible: true,
          showForZero: false,
          format: (info) => `${info.text} u`,
        },
        customizePoint: (info) =>
          info.pointIndex === 2 ? { label: { text: 'max' } } : undefined,
      },
    ]).renderSeries[0];
    expect(rs.labels.map((label) => label.text)).toEqual(['10 u', 'max']);
    const forced = scene(data, [
      {
        type: 'line',
        argumentField: 'm',
        valueField: 'v',
        customizePoint: (info) =>
          info.pointIndex === 0 ? { label: { visible: true } } : undefined,
      },
    ]).renderSeries[0];
    expect(forced.labels.map((label) => label.pointIndex)).toEqual([0]);
  });

  it('hides overlapping labels, keeps them inside the plot, or keeps all', () => {
    const dense = Array.from({ length: 60 }, (_, i) => ({ x: i, v: 50 }));
    const count = (overlap: 'hide' | 'shift' | 'none') =>
      scene(dense, [
        {
          type: 'line',
          argumentField: 'x',
          valueField: 'v',
          label: { visible: true, overlap },
        },
      ]).renderSeries[0].labels.length;
    expect(count('none')).toBe(60);
    expect(count('hide')).toBeLessThan(60);
    expect(count('shift')).toBeGreaterThanOrEqual(count('hide'));
    const s = scene(dense, [
      { type: 'line', argumentField: 'x', valueField: 'v', showLabels: true },
    ]);
    for (const label of s.renderSeries[0].labels) {
      expect(label.x).toBeGreaterThanOrEqual(0);
      expect(label.x).toBeLessThanOrEqual(s.plot.w);
    }
  });

  it('labels never change the accessible data table', () => {
    const plain = scene(data, [
      { type: 'bar', argumentField: 'm', valueField: 'v' },
    ]);
    const labelled = scene(data, [
      {
        type: 'bar',
        argumentField: 'm',
        valueField: 'v',
        label: { visible: true, format: () => 'x' },
      },
    ]);
    expect(cartesianSrRows(labelled, 10)).toEqual(cartesianSrRows(plain, 10));
  });
});

describe('waterfall', () => {
  const data = [
    { step: 'Start', delta: 100 },
    { step: 'Sales', delta: 40 },
    { step: 'Costs', delta: -30 },
    { step: 'Q1', sum: 'intermediate' },
    { step: 'Tax', delta: -10 },
    { step: 'Total', sum: 'total' },
  ];
  const s = scene(data, [
    {
      type: 'waterfall',
      argumentField: 'step',
      valueField: 'delta',
      summaryField: 'sum',
      name: 'Cash',
    },
  ]);

  it('floats deltas from the running total; sums span the right range', () => {
    const stacks = s.data.stacks[0];
    expect(stacks?.map((entry) => entry && [entry.base, entry.top])).toEqual([
      [0, 100],
      [100, 140],
      [140, 110],
      [0, 110],
      [110, 100],
      [0, 100],
    ]);
    const points = s.data.seriesList[0].points;
    expect(points.map((point) => point.kind)).toEqual([
      'up',
      'up',
      'down',
      'intermediate',
      'down',
      'total',
    ]);
    expect(points[3].value).toBe(110);
    expect(points[5].value).toBe(100);
  });

  it('colours by kind, draws connectors and speaks the kind', () => {
    const rs = s.renderSeries[0];
    expect(rs.bars[0].color).toBe('#10b981');
    expect(rs.bars[2].color).toBe('#ef4444');
    expect(rs.bars[5].color).toBe(rs.color);
    expect(rs.bars[2].cls).toBe('oge-chart-waterfall-down');
    expect(rs.segments.filter((seg) => seg.cls.includes('connector'))).toHaveLength(5);
    expect(cartesianSrRows(s, 10)[2].cells[0]).toBe('-30 (decrease)');
    expect(cartesianSrRows(s, 10)[5].cells[0]).toBe('100 (total)');
  });
});

describe('box plot & histogram', () => {
  it('box plot from raw values: box, median, whiskers, outliers', () => {
    const s = scene(
      [
        { g: 'A', values: [1, 2, 3, 4, 5, 6, 7, 8, 100] },
        { g: 'B', values: [4, 5, 6] },
      ],
      [{ type: 'boxPlot', argumentField: 'g', valuesField: 'values' }],
    );
    const rs = s.renderSeries[0];
    expect(rs.bars).toHaveLength(2);
    expect(rs.bars[0].cls).toBe('oge-chart-box');
    expect(rs.segments.filter((seg) => seg.cls === 'oge-chart-box-median')).toHaveLength(2);
    expect(rs.dots).toHaveLength(1);
    // the value axis reaches the outlier
    expect(s.valueScales[0].max).toBeGreaterThanOrEqual(100);
    expect(
      chartValueText(s.data.seriesList[0].points[0], 'en-US', words),
    ).toBe('Min 1, Q1 3, Median 5, Q3 7, Max 8, 1 outliers');
  });

  it('box plot from precomputed quartiles', () => {
    const s = scene(
      [{ g: 'A', lo: 1, q1: 2, med: 3, q3: 4, hi: 6, out: [9] }],
      [
        {
          type: 'boxPlot',
          argumentField: 'g',
          lowField: 'lo',
          q1Field: 'q1',
          medianField: 'med',
          q3Field: 'q3',
          highField: 'hi',
          outliersField: 'out',
        },
      ],
    );
    const point = s.data.seriesList[0].points[0];
    expect(point.value).toBe(3);
    expect(point.outliers).toEqual([9]);
    expect(s.renderSeries[0].dots).toHaveLength(1);
  });

  it('histogram bins the values; bars span the bins and speak the range', () => {
    const s = scene(
      [1, 2, 2, 3, 7, 9, 10].map((v) => ({ v })),
      [{ type: 'histogram', valueField: 'v', bins: { width: 5 } }],
    );
    const points = s.data.seriesList[0].points;
    expect(points.map((point) => point.value)).toEqual([4, 3]);
    expect(s.data.argKind).toBe('linear');
    const bars = s.renderSeries[0].bars;
    expect(bars).toHaveLength(2);
    // adjacent bins: the second bar starts where the first ends (±1px gap)
    expect(Math.abs(bars[1].x - (bars[0].x + bars[0].w))).toBeLessThanOrEqual(
      1.01,
    );
    expect(chartArgumentText('linear', points[0], 'en-US', words)).toBe(
      '0 – 5',
    );
    expect(s.valueScales[0].min).toBe(0);
  });
});

describe('pareto', () => {
  const data = [
    { cause: 'Late', n: 10 },
    { cause: 'Broken', n: 50 },
    { cause: 'Wrong', n: 40 },
  ];

  it('sorts categories by value and accumulates the share', () => {
    const s = scene(data, [
      { type: 'pareto', argumentField: 'cause', valueField: 'n' },
    ]);
    expect(s.data.categories).toEqual(['Broken', 'Wrong', 'Late']);
    const cumulative = s.data.seriesList[0].points.map(
      (point) => point.extra?.cumulative,
    );
    expect(cumulative).toEqual([1, 0.5, 0.9]);
    const rs = s.renderSeries[0];
    expect(rs.extraPaths[0].cls).toBe('oge-chart-pareto-line');
    expect(rs.dots).toHaveLength(3);
    expect(
      chartValueText(s.data.seriesList[0].points[1], 'en-US', words),
    ).toBe('50 (cumulative 50%)');
  });

  it('the cumulative axis spans 0–100', () => {
    const s = scene(
      data,
      [
        {
          type: 'pareto',
          argumentField: 'cause',
          valueField: 'n',
          cumulativeAxis: 1,
        },
      ],
      [{}, { position: 'end' }],
    );
    expect(s.valueScales[1].max).toBeGreaterThanOrEqual(100);
    expect(s.valueScales[1].min).toBe(0);
  });
});

describe('financial, stacked lines, trendlines & indicators', () => {
  const prices = Array.from({ length: 30 }, (_, i) => ({
    d: i,
    o: 100 + i,
    h: 104 + i,
    l: 98 + i,
    c: i % 2 === 0 ? 102 + i : 99 + i,
  }));

  it('ohlc draws three ticks per point and inspects like candlesticks', () => {
    const s = scene(prices, [
      {
        type: 'ohlc',
        argumentField: 'd',
        openField: 'o',
        highField: 'h',
        lowField: 'l',
        closeField: 'c',
      },
    ]);
    const rs = s.renderSeries[0];
    expect(rs.candles).toHaveLength(0);
    expect(rs.segments).toHaveLength(90);
    expect(rs.segments[3].cls).toContain('oge-chart-ohlc-falling');
    expect(s.valueScales[0].max).toBeGreaterThanOrEqual(133);
  });

  it('stacked lines and spline areas accumulate; full-stacked normalizes', () => {
    const data = [
      { x: 1, a: 1, b: 3 },
      { x: 2, a: 2, b: 2 },
    ];
    const lines = scene(data, [
      { type: 'stackedLine', argumentField: 'x', valueField: 'a' },
      { type: 'stackedLine', argumentField: 'x', valueField: 'b' },
    ]);
    expect(lines.data.stacks[1]?.map((entry) => entry?.top)).toEqual([4, 4]);
    expect(lines.renderSeries[1].areaPathD).toBeNull();
    const full = scene(data, [
      { type: 'fullStackedSplineArea', argumentField: 'x', valueField: 'a' },
      { type: 'fullStackedSplineArea', argumentField: 'x', valueField: 'b' },
    ]);
    expect(full.data.stacks[1]?.map((entry) => entry?.top)).toEqual([1, 1]);
    expect(full.renderSeries[1].areaPathD).toContain('C');
  });

  it('trendlines draw over the series and report R² in the tooltip', () => {
    const data = [1, 2, 3, 4].map((x) => ({ x, y: x * 2 }));
    const s = scene(data, [
      {
        type: 'scatter',
        argumentField: 'x',
        valueField: 'y',
        name: 'Y',
        trendline: { type: 'linear', showR2: true },
      },
    ]);
    expect(s.data.trends[0]?.r2).toBeCloseTo(1);
    expect(s.renderSeries[0].extraPaths[0].cls).toBe('oge-chart-trendline');
    const row = cartesianTooltipRowText(s, {
      seriesIndex: 0,
      seriesName: 'Y',
      pointIndex: 1,
      point: s.data.seriesList[0].points[1],
      event: new MouseEvent('pointermove'),
    });
    expect(row).toBe('Y: 4 · trend 4, R² 1');
  });

  it('indicator series compute SMA/EMA/Bollinger/MACD/RSI with default names', () => {
    const series = (
      indicator: NonNullable<ChartSeriesInput['indicator']>,
    ): ChartSeriesInput<(typeof prices)[number]> => ({
      type: 'indicator',
      argumentField: 'd',
      closeField: 'c',
      indicator,
    });
    const s = scene(prices, [
      series({ type: 'sma', period: 5 }),
      series({ type: 'bollinger', period: 5 }),
      series({ type: 'macd', fastPeriod: 3, slowPeriod: 6, signalPeriod: 3 }),
      series({ type: 'rsi', period: 5 }),
    ]);
    expect(s.data.seriesList.map((entry) => entry.name)).toEqual([
      'SMA (5)',
      'Bollinger (5, 2)',
      'MACD (3, 6, 3)',
      'RSI (5)',
    ]);
    expect(s.data.seriesList[0].points[3].value).toBeNull();
    expect(s.data.seriesList[0].points[4].value).not.toBeNull();
    const [, bollinger, macd, rsi] = s.renderSeries;
    expect(bollinger.extraPaths.map((path) => path.cls)).toEqual([
      'oge-chart-indicator-band',
      'oge-chart-indicator-line',
      'oge-chart-indicator-line',
    ]);
    expect(macd.bars.length).toBeGreaterThan(0);
    expect(rsi.segments.map((seg) => seg.cls)).toEqual([
      'oge-chart-indicator-level',
      'oge-chart-indicator-level',
    ]);
    // indicators draw no markers
    expect(bollinger.markers).toHaveLength(0);
    expect(
      chartValueText(s.data.seriesList[1].points[10], 'en-US', words),
    ).toMatch(/\(upper [\d.,]+, lower [\d.,]+\)$/);
  });
});
