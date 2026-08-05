/**
 * Row height / offset model backed by a Fenwick (binary indexed) tree:
 * - `offsetOf(index)`  → O(log n) prefix sum of heights before `index`
 * - `indexAt(offset)`  → O(log n) row index containing a pixel offset
 * - `updateHeight(i)`  → O(log n) point update (measured row heights)
 *
 * Rebuilt only when the flat row list changes shape; height corrections from
 * measurement are point updates.
 */
export class OffsetTree {
  private readonly tree: Float64Array;
  private readonly heights: Float64Array;
  private readonly n: number;
  /** Smallest power of two ≥ n, used for binary lifting in indexAt. */
  private readonly topBit: number;

  constructor(count: number, defaultHeight: number | ((index: number) => number)) {
    this.n = count;
    this.heights = new Float64Array(count);
    this.tree = new Float64Array(count + 1);
    const heightOf = typeof defaultHeight === 'function' ? defaultHeight : () => defaultHeight;
    for (let i = 0; i < count; i++) {
      const h = heightOf(i);
      this.heights[i] = h;
      this.tree[i + 1] += h;
      const parent = i + 1 + ((i + 1) & -(i + 1));
      if (parent <= count) this.tree[parent] += this.tree[i + 1];
    }
    let bit = 1;
    while (bit << 1 <= count) bit <<= 1;
    this.topBit = bit;
  }

  get length(): number {
    return this.n;
  }

  heightAt(index: number): number {
    return this.heights[index];
  }

  updateHeight(index: number, height: number): void {
    const delta = height - this.heights[index];
    if (delta === 0) return;
    this.heights[index] = height;
    for (let i = index + 1; i <= this.n; i += i & -i) {
      this.tree[i] += delta;
    }
  }

  /** Sum of heights of rows [0, index). `offsetOf(length)` is the total height. */
  offsetOf(index: number): number {
    let sum = 0;
    for (let i = Math.min(index, this.n); i > 0; i -= i & -i) {
      sum += this.tree[i];
    }
    return sum;
  }

  get totalHeight(): number {
    return this.offsetOf(this.n);
  }

  /**
   * Index of the row whose [offsetOf(i), offsetOf(i+1)) range contains
   * `offset`. Clamped to [0, length-1]; returns 0 for an empty tree.
   */
  indexAt(offset: number): number {
    if (this.n === 0) return 0;
    if (offset <= 0) return 0;
    // Binary lifting: find largest index with prefix sum <= offset.
    let index = 0;
    let remaining = offset;
    for (let bit = this.topBit; bit > 0; bit >>= 1) {
      const next = index + bit;
      if (next <= this.n && this.tree[next] <= remaining) {
        index = next;
        remaining -= this.tree[next];
      }
    }
    // `index` rows have cumulative height <= offset → offset falls inside row `index`.
    return Math.min(index, this.n - 1);
  }
}
