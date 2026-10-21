/**
 * Offsets along one axis — rows or columns — where nearly every index has
 * the default size: 1,048,576 rows cost memory only for the rows that
 * differ. Offsets are a prefix sum over the sorted overrides; lookups are
 * binary searches, so a jump to row 900,000 costs the same as row 10.
 */
export class OgeAxis {
  private readonly overrides = new Map<number, number>();
  private sorted: Int32Array | null = null;
  /** `deltas[k]`: sum of (size − default) over the first k overrides. */
  private deltas: Float64Array | null = null;

  constructor(
    /** Number of indices (rows or columns in the sheet). */
    readonly count: number,
    private defaultSize: number,
  ) {}

  /** The size of an index without an override. */
  get defaultLength(): number {
    return this.defaultSize;
  }

  setDefault(size: number): void {
    this.defaultSize = Math.max(0, size);
    this.sorted = null;
  }

  /** Sets an index's size; `undefined` returns it to the default. */
  set(index: number, size: number | undefined): void {
    if (index < 0 || index >= this.count) return;
    if (size === undefined) this.overrides.delete(index);
    else this.overrides.set(index, Math.max(0, size));
    this.sorted = null;
  }

  /**
   * This axis at a zoom factor: every size rounded to whole pixels on its
   * own, the way Excel lays a zoomed sheet out (measured at 90%: columns of
   * 182, 98 and 98 px become 164, 88 and 88).
   */
  scaled(factor: number): OgeAxis {
    const axis = new OgeAxis(this.count, Math.round(this.defaultSize * factor));
    for (const [index, size] of this.overrides)
      axis.overrides.set(index, Math.round(size * factor));
    return axis;
  }

  /** Removes every override. */
  clear(): void {
    this.overrides.clear();
    this.sorted = null;
  }

  /** Size of an index (0 when hidden). */
  size(index: number): number {
    return this.overrides.get(index) ?? this.defaultSize;
  }

  /** Whether an index has its own size. */
  hasOverride(index: number): boolean {
    return this.overrides.has(index);
  }

  private build(): void {
    if (this.sorted) return;
    const keys = Int32Array.from(this.overrides.keys()).sort();
    const deltas = new Float64Array(keys.length + 1);
    for (let k = 0; k < keys.length; k++) {
      deltas[k + 1] =
        deltas[k] +
        ((this.overrides.get(keys[k]) as number) - this.defaultSize);
    }
    this.sorted = keys;
    this.deltas = deltas;
  }

  /** How many overrides lie before `index`. */
  private before(index: number): number {
    const keys = this.sorted as Int32Array;
    let low = 0;
    let high = keys.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (keys[mid] < index) low = mid + 1;
      else high = mid;
    }
    return low;
  }

  /** Where an index starts (px from the axis start). `count` gives the total. */
  offset(index: number): number {
    this.build();
    const i = Math.max(0, Math.min(index, this.count));
    return i * this.defaultSize + (this.deltas as Float64Array)[this.before(i)];
  }

  /** The whole length. */
  total(): number {
    return this.offset(this.count);
  }

  /**
   * The index whose span holds `position` — the last index starting at or
   * before it, so a run of hidden indices resolves to the visible one after
   * them. Clamped to the axis.
   */
  indexAt(position: number): number {
    if (position <= 0) return this.firstVisibleFrom(0);
    let low = 0;
    let high = this.count - 1;
    while (low < high) {
      const mid = (low + high + 1) >>> 1;
      if (this.offset(mid) <= position) low = mid;
      else high = mid - 1;
    }
    return low;
  }

  /** The first index at or after `index` with a size, or `count - 1`. */
  firstVisibleFrom(index: number): number {
    for (let i = Math.max(0, index); i < this.count; i++) {
      if (this.size(i) > 0) return i;
    }
    return this.count - 1;
  }

  /** The next index after `index` with a size, in `step` direction; `-1` when none. */
  nextVisible(index: number, step: 1 | -1): number {
    for (let i = index + step; i >= 0 && i < this.count; i += step) {
      if (this.size(i) > 0) return i;
    }
    return -1;
  }
}
