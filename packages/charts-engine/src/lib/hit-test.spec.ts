import { buildArgumentIndex, nearestIndex } from './hit-test';

describe('nearestIndex', () => {
  const args = [0, 10, 20, 50, 100];

  it('finds the nearest value with binary search', () => {
    expect(nearestIndex(args, 12)).toBe(1);
    expect(nearestIndex(args, 16)).toBe(2);
    expect(nearestIndex(args, 49)).toBe(3);
  });

  it('clamps outside the range and handles empties', () => {
    expect(nearestIndex(args, -5)).toBe(0);
    expect(nearestIndex(args, 999)).toBe(4);
    expect(nearestIndex([], 1)).toBe(-1);
  });

  it('ties resolve to the earlier value', () => {
    expect(nearestIndex(args, 15)).toBe(1);
  });

  it('stays O(log n) on large inputs (smoke)', () => {
    const big = Array.from({ length: 50_000 }, (_, i) => i * 2);
    const start = performance.now();
    for (let i = 0; i < 10_000; i++) nearestIndex(big, i * 7);
    expect(performance.now() - start).toBeLessThan(200);
  });
});

describe('buildArgumentIndex', () => {
  it('merges per-series arguments and maps back to point indices', () => {
    const index = buildArgumentIndex([
      [10, 30, null],
      [20, 30],
    ]);
    expect(index.sortedArgs).toEqual([10, 20, 30]);
    expect(index.pointIndexAt(0, 0)).toBe(0); // arg 10 → series 0 point 0
    expect(index.pointIndexAt(0, 1)).toBe(-1); // arg 10 missing in series 1
    expect(index.pointIndexAt(2, 0)).toBe(1);
    expect(index.pointIndexAt(2, 1)).toBe(1);
    expect(index.pointIndexAt(1, 5)).toBe(-1); // unknown series
  });
});
