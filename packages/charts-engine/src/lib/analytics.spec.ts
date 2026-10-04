import {
  ogeBollingerBands,
  ogeBoxStats,
  ogeEma,
  ogeHistogramBins,
  ogeMacd,
  ogeQuantile,
  ogeRsi,
  ogeSma,
  ogeTrendline,
} from './analytics';

const close = (value: number | null, expected: number, digits = 6): void => {
  expect(value).not.toBeNull();
  expect(value as number).toBeCloseTo(expected, digits);
};

describe('analytics — moving averages', () => {
  it('SMA averages full windows; a gap in the window yields null', () => {
    expect(ogeSma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
    expect(ogeSma([1, null, 3, 4, 5], 2)).toEqual([null, null, null, 3.5, 4.5]);
    // objects carrying a value are accepted too
    expect(ogeSma([{ value: 2 }, { value: 4 }], 2)).toEqual([null, 3]);
  });

  it('EMA seeds with the first SMA and smooths with k = 2/(n+1)', () => {
    const ema = ogeEma([2, 4, 6, 8], 3);
    expect(ema.slice(0, 2)).toEqual([null, null]);
    close(ema[2], 4);
    close(ema[3], 8 * 0.5 + 4 * 0.5);
  });

  it('Bollinger bands are the SMA ± k population deviations', () => {
    const bands = ogeBollingerBands([2, 4, 4, 4, 5, 5, 7, 9], 8, 2);
    const last = bands[7];
    close(last.middle, 5);
    close(last.upper, 9);
    close(last.lower, 1);
    expect(bands[0]).toEqual({ middle: null, upper: null, lower: null });
  });

  it('MACD = fast EMA − slow EMA, signal = EMA of MACD, histogram between', () => {
    const values = Array.from({ length: 40 }, (_, i) => 100 + i);
    const macd = ogeMacd(values, 3, 6, 4);
    const last = macd[39];
    expect(last.macd).not.toBeNull();
    // a straight ramp converges to a constant gap between the two EMAs
    close(last.macd, (6 - 3) / 2, 3);
    close(last.histogram, (last.macd as number) - (last.signal as number));
    expect(macd[2].macd).toBeNull();
  });

  it('RSI is 100 for a rising series and stays inside 0–100', () => {
    const rising = ogeRsi([1, 2, 3, 4, 5, 6], 3);
    expect(rising.slice(0, 3)).toEqual([null, null, null]);
    expect(rising[3]).toBe(100);
    const mixed = ogeRsi([44, 44.3, 44.1, 43.6, 44.3, 44.8, 45.1, 45.4], 4);
    for (const value of mixed.filter((v): v is number => v !== null)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});

describe('analytics — trendlines', () => {
  const linear = [1, 2, 3, 4, 5].map((x) => ({ x, y: 2 * x + 1 }));

  it('linear fit recovers slope/intercept with R² = 1', () => {
    const fit = ogeTrendline(linear, 'linear');
    expect(fit).not.toBeNull();
    close(fit?.coefficients[0] ?? null, 1);
    close(fit?.coefficients[1] ?? null, 2);
    close(fit?.r2 ?? null, 1);
    close(fit?.predict(10) ?? null, 21);
  });

  it('exponential, logarithmic and polynomial fits', () => {
    const exp = ogeTrendline(
      [0, 1, 2, 3].map((x) => ({ x, y: 3 * Math.exp(0.5 * x) })),
      'exponential',
    );
    close(exp?.coefficients[0] ?? null, 3);
    close(exp?.coefficients[1] ?? null, 0.5);
    const log = ogeTrendline(
      [1, 2, 4, 8].map((x) => ({ x, y: 1 + 2 * Math.log(x) })),
      'logarithmic',
    );
    close(log?.predict(16) ?? null, 1 + 2 * Math.log(16));
    expect(log?.predict(-1)).toBeNull();
    const poly = ogeTrendline(
      [0, 1, 2, 3, 4].map((x) => ({ x, y: x * x - 2 * x + 3 })),
      'polynomial',
      { order: 2 },
    );
    close(poly?.predict(5) ?? null, 18, 4);
    close(poly?.r2 ?? null, 1);
  });

  it('moving average follows the data; too few points → null', () => {
    const fit = ogeTrendline(linear, 'movingAverage', { period: 2 });
    expect(fit?.points.map((p) => p.y)).toEqual([4, 6, 8, 10]);
    expect(fit?.r2).toBeNull();
    expect(ogeTrendline([{ x: 1, y: 1 }], 'linear')).toBeNull();
    expect(
      ogeTrendline(
        [
          { x: 1, y: null },
          { x: 2, y: 3 },
        ],
        'linear',
      ),
    ).toBeNull();
  });
});

describe('analytics — box plot & histogram', () => {
  it('quantiles interpolate linearly (Excel .INC)', () => {
    expect(ogeQuantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(ogeQuantile([1, 2, 3, 4], 0.25)).toBe(1.75);
  });

  it('Tukey whiskers stop at 1.5 × IQR and report outliers', () => {
    const stats = ogeBoxStats([1, 2, 3, 4, 5, 6, 7, 8, 100]);
    expect(stats).toMatchObject({ q1: 3, median: 5, q3: 7, low: 1, high: 8 });
    expect(stats?.outliers).toEqual([100]);
    expect(ogeBoxStats([1, 100], 'minMax')).toMatchObject({
      low: 1,
      high: 100,
      outliers: [],
    });
    expect(ogeBoxStats([])).toBeNull();
  });

  it('bins by nice width, explicit width or thresholds; max is inclusive', () => {
    const values = [1, 2, 2, 3, 7, 9, 10];
    const bins = ogeHistogramBins(values, { width: 5 });
    expect(bins.map((bin) => [bin.start, bin.end, bin.count])).toEqual([
      [0, 5, 4],
      [5, 10, 3],
    ]);
    const custom = ogeHistogramBins(values, { thresholds: [0, 3, 10] });
    expect(custom.map((bin) => bin.count)).toEqual([3, 4]);
    expect(custom[0].indexes).toEqual([0, 1, 2]);
    const auto = ogeHistogramBins(values);
    expect(auto.reduce((sum, bin) => sum + bin.count, 0)).toBe(7);
    expect(ogeHistogramBins([])).toEqual([]);
    expect(ogeHistogramBins([4, 4])).toHaveLength(1);
  });
});
