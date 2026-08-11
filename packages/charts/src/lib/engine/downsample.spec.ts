import { downsamplePath } from './downsample';
import type { PathPoint } from './path-builder';

describe('downsamplePath (LTTB)', () => {
  const wave = (n: number): PathPoint[] =>
    Array.from({ length: n }, (_, i) => ({
      x: i,
      y: Math.sin(i / 20) * 100,
    }));

  it('passes small inputs through untouched', () => {
    const points = wave(100);
    expect(downsamplePath(points, 200)).toEqual(points);
  });

  it('reduces to roughly the target while keeping the endpoints', () => {
    const points = wave(10_000);
    const sampled = downsamplePath(points, 500);
    expect(sampled.length).toBeGreaterThan(400);
    expect(sampled.length).toBeLessThan(600);
    expect(sampled[0]).toEqual(points[0]);
    expect(sampled[sampled.length - 1]).toEqual(points[points.length - 1]);
  });

  it('preserves extreme spikes (the point of LTTB)', () => {
    const points = wave(10_000);
    points[5_000] = { x: 5_000, y: 10_000 }; // lone spike
    const sampled = downsamplePath(points, 300);
    expect(sampled.some((point) => point.y === 10_000)).toBe(true);
  });

  it('keeps gap markers between runs and samples each run independently', () => {
    const points: PathPoint[] = [
      ...wave(5_000),
      { x: 5_000, y: null },
      ...wave(5_000).map((point) => ({ x: point.x + 5_001, y: point.y })),
    ];
    const sampled = downsamplePath(points, 400);
    expect(sampled.filter((point) => point.y === null).length).toBe(1);
    expect(sampled.length).toBeLessThan(500);
  });

  it('is fast on 200k points (smoke)', () => {
    const points = wave(200_000);
    const start = performance.now();
    downsamplePath(points, 1_000);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
