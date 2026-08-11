/**
 * The 50k-point performance smoke: extraction + layout + a single-path
 * build must stay comfortably interactive. Thresholds are generous (CI
 * machines vary) — they catch complexity regressions, not jitter.
 */
import { linePath, type PathPoint } from './path-builder';
import { createLinearScale } from './scale';
import { buildSeries } from './series-model';

describe('50k point smoke', () => {
  const N = 50_000;
  const data = Array.from({ length: N }, (_, i) => ({
    t: i,
    v: Math.sin(i / 500) * 100 + (i % 97),
  }));

  it('extracts, scales and builds one path under the budget', () => {
    const start = performance.now();
    const series = buildSeries(
      data,
      { type: 'line', argumentField: 't', valueField: 'v' },
      0,
      'linear',
      new Map(),
    );
    const x = createLinearScale({ min: 0, max: N, rangePx: 1000 });
    const y = createLinearScale({
      min: -100,
      max: 200,
      rangePx: 400,
      inverted: true,
    });
    const points: PathPoint[] = series.points.map((point) => ({
      x: x.toPx(point.argNumeric ?? 0),
      y: point.value === null ? null : y.toPx(point.value),
    }));
    const path = linePath(points);
    const elapsed = performance.now() - start;
    expect(path.length).toBeGreaterThan(N); // one command per point
    expect((path.match(/M /g) ?? []).length).toBe(1); // no gaps → one subpath
    expect(elapsed).toBeLessThan(1500);
  });
});
