import {
  chartMixColor,
  chartRampColor,
  resolveChartColorScale,
  OGE_CHART_EMPTY_COLOR,
} from './color-scale';

describe('chartMixColor / chartRampColor', () => {
  it('short-circuits the ends and mixes in between', () => {
    expect(chartMixColor('red', 'blue', 0)).toBe('red');
    expect(chartMixColor('red', 'blue', 1)).toBe('blue');
    expect(chartMixColor('red', 'blue', 0.25)).toBe(
      'color-mix(in srgb, blue 25%, red)',
    );
  });

  it('spreads three stops evenly (a diverging scale)', () => {
    const colors = ['red', 'white', 'blue'];
    expect(chartRampColor(colors, 0)).toBe('red');
    expect(chartRampColor(colors, 0.5)).toBe('white');
    expect(chartRampColor(colors, 1)).toBe('blue');
    expect(chartRampColor(colors, 0.75)).toBe(
      'color-mix(in srgb, blue 50%, white)',
    );
  });
});

describe('resolveChartColorScale', () => {
  it('linear: the data range by default, tokens as stops, empty for null', () => {
    const scale = resolveChartColorScale(
      undefined,
      [10, null, 30, 20],
      'en-US',
    );
    expect(scale.min).toBe(10);
    expect(scale.max).toBe(30);
    expect(scale.colorOf(10)).toBe('var(--oge-chart-heat-low)');
    expect(scale.colorOf(30)).toBe('var(--oge-chart-heat-high)');
    expect(scale.colorOf(20)).toContain('50%');
    expect(scale.colorOf(null)).toBe(OGE_CHART_EMPTY_COLOR);
    expect(scale.legend.type).toBe('linear');
    expect(scale.legend.gradient).toContain('linear-gradient(to right');
    expect(scale.legend.gradientRtl).toContain('linear-gradient(to left');
    expect(scale.legend.ticks[0].offset).toBe(0);
    expect(scale.legend.ticks.at(-1)?.text).toBe('30');
  });

  it('clamps out-of-domain values to the ends', () => {
    const scale = resolveChartColorScale(
      { min: 0, max: 10, colors: ['a', 'b'] },
      [],
    );
    expect(scale.colorOf(-5)).toBe('a');
    expect(scale.colorOf(50)).toBe('b');
  });

  it('a single distinct value maps to the high end', () => {
    const scale = resolveChartColorScale(undefined, [4, 4]);
    expect(scale.colorOf(4)).toBe('var(--oge-chart-heat-high)');
    expect(scale.legend.ticks).toHaveLength(1);
  });

  it('segmented: flat colour per band, last band end inclusive', () => {
    const scale = resolveChartColorScale(
      {
        type: 'segmented',
        ranges: [
          { start: 0, end: 50, color: 'green', label: 'Low' },
          { start: 50, end: 100, color: 'red' },
        ],
      },
      [],
      'en-US',
    );
    expect(scale.colorOf(10)).toBe('green');
    expect(scale.colorOf(50)).toBe('red');
    expect(scale.colorOf(100)).toBe('red');
    expect(scale.colorOf(101)).toBe(OGE_CHART_EMPTY_COLOR);
    expect(scale.legend.segments.map((s) => s.text)).toEqual([
      'Low',
      '50 – 100',
    ]);
  });

  it('segmented bands without colours ramp the scale colours', () => {
    const scale = resolveChartColorScale(
      {
        type: 'segmented',
        colors: ['a', 'b'],
        ranges: [
          { start: 0, end: 1 },
          { start: 1, end: 2 },
        ],
      },
      [],
    );
    expect(scale.colorOf(0.5)).toBe('a');
    expect(scale.colorOf(1.5)).toBe('b');
  });
});
