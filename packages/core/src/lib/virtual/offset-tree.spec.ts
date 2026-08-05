import { OffsetTree } from './offset-tree';
import { computeWindow } from './viewport-window';

/** Deterministic PRNG for reproducible property tests. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Naive O(n) reference implementation. */
class NaiveOffsets {
  constructor(private readonly heights: number[]) {}
  offsetOf(index: number): number {
    let sum = 0;
    for (let i = 0; i < Math.min(index, this.heights.length); i++) sum += this.heights[i];
    return sum;
  }
  get totalHeight(): number {
    return this.offsetOf(this.heights.length);
  }
  indexAt(offset: number): number {
    if (!this.heights.length) return 0;
    if (offset <= 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.heights.length; i++) {
      sum += this.heights[i];
      if (offset < sum) return i;
    }
    return this.heights.length - 1;
  }
}

describe('OffsetTree', () => {
  it('computes offsets for uniform heights', () => {
    const tree = new OffsetTree(100, 36);
    expect(tree.offsetOf(0)).toBe(0);
    expect(tree.offsetOf(10)).toBe(360);
    expect(tree.totalHeight).toBe(3600);
    expect(tree.indexAt(0)).toBe(0);
    expect(tree.indexAt(359.9)).toBe(9);
    expect(tree.indexAt(360)).toBe(10);
    expect(tree.indexAt(999_999)).toBe(99);
  });

  it('handles an empty tree', () => {
    const tree = new OffsetTree(0, 36);
    expect(tree.totalHeight).toBe(0);
    expect(tree.indexAt(100)).toBe(0);
  });

  it('applies point height updates', () => {
    const tree = new OffsetTree(10, 30);
    tree.updateHeight(3, 100);
    expect(tree.heightAt(3)).toBe(100);
    expect(tree.offsetOf(4)).toBe(3 * 30 + 100);
    expect(tree.totalHeight).toBe(9 * 30 + 100);
    expect(tree.indexAt(3 * 30 + 50)).toBe(3);
  });

  it('matches a naive reference under randomized heights and updates (property test)', () => {
    const rand = mulberry32(1234);
    for (let run = 0; run < 20; run++) {
      const n = 1 + Math.floor(rand() * 300);
      const heights = Array.from({ length: n }, () => 10 + Math.floor(rand() * 90));
      const tree = new OffsetTree(n, (i) => heights[i]);
      const updates = Math.floor(rand() * 20);
      for (let u = 0; u < updates; u++) {
        const index = Math.floor(rand() * n);
        const height = 10 + Math.floor(rand() * 190);
        heights[index] = height;
        tree.updateHeight(index, height);
      }
      const naive = new NaiveOffsets(heights);
      expect(tree.totalHeight).toBeCloseTo(naive.totalHeight, 6);
      for (let probe = 0; probe < 50; probe++) {
        const index = Math.floor(rand() * (n + 1));
        expect(tree.offsetOf(index)).toBeCloseTo(naive.offsetOf(index), 6);
        const offset = rand() * naive.totalHeight * 1.1;
        expect(tree.indexAt(offset)).toBe(naive.indexAt(offset));
      }
    }
  });
});

describe('computeWindow', () => {
  it('returns the visible slice plus overscan', () => {
    const tree = new OffsetTree(1000, 30);
    const window = computeWindow(3000, 300, tree, 4);
    // rows 100..110 visible, overscan 4 → 96..115
    expect(window.start).toBe(96);
    expect(window.end).toBe(115);
    expect(window.offsetY).toBe(96 * 30);
    expect(window.totalHeight).toBe(30_000);
  });

  it('clamps at the start and end of the list', () => {
    const tree = new OffsetTree(100, 30);
    const top = computeWindow(0, 300, tree, 4);
    expect(top.start).toBe(0);
    const bottom = computeWindow(999_999, 300, tree, 4);
    expect(bottom.end).toBe(100);
    expect(bottom.start).toBeLessThan(bottom.end);
  });

  it('renders nothing for an empty list', () => {
    const tree = new OffsetTree(0, 30);
    expect(computeWindow(0, 300, tree)).toEqual({ start: 0, end: 0, offsetY: 0, totalHeight: 0 });
  });

  it('covers the viewport with variable heights', () => {
    const rand = mulberry32(99);
    const heights = Array.from({ length: 500 }, () => 20 + Math.floor(rand() * 100));
    const tree = new OffsetTree(500, (i) => heights[i]);
    for (let probe = 0; probe < 30; probe++) {
      const scrollTop = rand() * tree.totalHeight;
      const window = computeWindow(scrollTop, 400, tree, 2);
      const clampedTop = Math.min(Math.max(0, scrollTop), tree.totalHeight - 400);
      // rendered block must fully cover the visible range
      expect(window.offsetY).toBeLessThanOrEqual(clampedTop);
      expect(tree.offsetOf(window.end)).toBeGreaterThanOrEqual(
        Math.min(clampedTop + 400, tree.totalHeight)
      );
    }
  });
});
