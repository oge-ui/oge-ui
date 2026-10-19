import { interpolateChartPath } from './chart-path-tween';
import { linePath, splinePath, baselineAreaPath } from './path-builder';

/** The numbers of a path, in order. */
const nums = (d: string | null): number[] =>
  (d ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
/** The commands of a path, in order. */
const cmds = (d: string | null): string => (d ?? '').replace(/[^A-Z]/g, '');

describe('interpolateChartPath', () => {
  it('lerps a path of the same structure number by number', () => {
    const from = linePath([
      { x: 0, y: 100 },
      { x: 50, y: 100 },
      { x: 100, y: 100 },
    ]);
    const to = linePath([
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 20 },
    ]);
    const tween = interpolateChartPath(from, to, 200);
    expect(tween(0)).toBe(from);
    expect(tween(0.5)).toBe('M 0 50 L 50 75 L 100 60');
    expect(tween(1)).toBe(to);
  });

  it('keeps curves curved when the structure matches', () => {
    const points = (y: number) => [
      { x: 0, y },
      { x: 40, y: y + 20 },
      { x: 80, y },
    ];
    const tween = interpolateChartPath(
      splinePath(points(10)),
      splinePath(points(50)),
      0,
    );
    expect(cmds(tween(0.5))).toBe('MCC');
  });

  it('resamples when the point counts differ, and lands exactly on the target', () => {
    const from = linePath([
      { x: 0, y: 10 },
      { x: 100, y: 10 },
    ]);
    const to = linePath([
      { x: 0, y: 0 },
      { x: 25, y: 40 },
      { x: 50, y: 0 },
      { x: 75, y: 40 },
      { x: 100, y: 0 },
    ]);
    const tween = interpolateChartPath(from, to, 0);
    const mid = tween(0.5);
    // both sides resampled to the larger count: a polyline of 5 points
    expect(cmds(mid)).toBe('MLLLL');
    const ys = nums(mid).filter((_, i) => i % 2 === 1);
    // halfway between the flat line (10) and the zig-zag
    expect(ys[0]).toBeCloseTo(5, 5);
    expect(ys[1]).toBeGreaterThan(10);
    // the start and end stay pinned to the plot edges
    const xs = nums(mid).filter((_, i) => i % 2 === 0);
    expect(xs[0]).toBe(0);
    expect(xs[xs.length - 1]).toBe(100);
    expect(tween(1)).toBe(to);
  });

  it('resamples an area outline edge by edge', () => {
    const from = baselineAreaPath(
      [
        { x: 0, y: 20 },
        { x: 100, y: 20 },
      ],
      100,
    );
    const to = baselineAreaPath(
      [
        { x: 0, y: 40 },
        { x: 50, y: 10 },
        { x: 100, y: 40 },
      ],
      100,
    );
    const mid = interpolateChartPath(from, to, 100)(0.5);
    expect(mid?.endsWith('Z')).toBe(true);
    const values = nums(mid);
    const ys = values.filter((_, i) => i % 2 === 1);
    // the bottom edge never leaves the baseline (top and bottom don't mix)
    const bottom = ys.slice(Math.ceil(ys.length / 2));
    expect(bottom.every((y) => y === 100)).toBe(true);
  });

  it('grows a new path from the baseline and shrinks a removed one to it', () => {
    const d = linePath([
      { x: 0, y: 10 },
      { x: 100, y: 30 },
    ]);
    const enter = interpolateChartPath(null, d, 200);
    expect(enter(0)).toBe('M 0 200 L 100 200');
    expect(enter(0.5)).toBe('M 0 105 L 100 115');
    expect(enter(1)).toBe(d);
    const exit = interpolateChartPath(d, null, 200);
    expect(exit(0.5)).toBe('M 0 105 L 100 115');
    expect(exit(1)).toBeNull();
  });

  it('pairs gap runs and grows an extra run from the baseline', () => {
    const from = linePath([
      { x: 0, y: 10 },
      { x: 50, y: 10 },
    ]);
    const to = linePath([
      { x: 0, y: 20 },
      { x: 50, y: 20 },
      { x: 60, y: null },
      { x: 80, y: 0 },
      { x: 100, y: 0 },
    ]);
    const mid = interpolateChartPath(from, to, 100)(0.5);
    expect(cmds(mid)).toBe('MLML');
    expect(nums(mid)).toEqual([0, 15, 50, 15, 80, 50, 100, 50]);
  });

  it('switches unknown paths at the end instead of morphing them', () => {
    const tween = interpolateChartPath(
      'M 0 0 a 5 5 0 0 1 10 0',
      'M 0 0 L 1 1',
      0,
    );
    expect(tween(0.5)).toBe('M 0 0 a 5 5 0 0 1 10 0');
    expect(tween(1)).toBe('M 0 0 L 1 1');
  });

  it('extrapolates on a spring overshoot and continues from any frame', () => {
    const a = 'M 0 0 L 10 0';
    const b = 'M 0 0 L 10 10';
    expect(interpolateChartPath(a, b, 0)(1.1)).toBe(b);
    const over = interpolateChartPath(a, b, 0)(0.99);
    expect(nums(over)[3]).toBeCloseTo(9.9, 5);
    // a retarget starts from the frame on screen
    const retarget = interpolateChartPath(over, 'M 0 0 L 10 -10', 0);
    expect(nums(retarget(0))).toEqual(nums(over));
  });
});
