/**
 * Hit testing: nearest argument lookup via binary search over the sorted
 * numeric argument list (the tooltip/crosshair hot path is O(log n), the
 * performance contract for 10k+ points). Pure.
 */

/**
 * Index of the value in sorted `args` nearest to `target`
 * (-1 for an empty list).
 */
export function nearestIndex(
  args: readonly number[],
  target: number,
): number {
  const n = args.length;
  if (n === 0) return -1;
  if (target <= args[0]) return 0;
  if (target >= args[n - 1]) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (args[mid] <= target) lo = mid;
    else hi = mid;
  }
  return target - args[lo] <= args[hi] - target ? lo : hi;
}

/**
 * The sorted unique numeric arguments across series point lists, with a
 * lookup from argument value → per-series point indices. Built once per
 * data change, reused by every pointer move.
 */
export interface ArgumentIndex {
  readonly sortedArgs: readonly number[];
  /** Per sorted arg: series index → point index (sparse, -1 = none). */
  readonly pointIndexAt: (
    argPosition: number,
    seriesIndex: number,
  ) => number;
}

export function buildArgumentIndex(
  seriesArgs: readonly (readonly (number | null)[])[],
): ArgumentIndex {
  const set = new Set<number>();
  for (const args of seriesArgs) {
    for (const arg of args) if (arg !== null) set.add(arg);
  }
  const sortedArgs = [...set].sort((a, b) => a - b);
  const position = new Map(sortedArgs.map((arg, index) => [arg, index]));
  // seriesIndex → argPosition → pointIndex
  const lookup: Int32Array[] = seriesArgs.map((args) => {
    const table = new Int32Array(sortedArgs.length).fill(-1);
    for (let pointIndex = 0; pointIndex < args.length; pointIndex++) {
      const arg = args[pointIndex];
      if (arg === null) continue;
      const argPosition = position.get(arg);
      if (argPosition !== undefined) table[argPosition] = pointIndex;
    }
    return table;
  });
  return {
    sortedArgs,
    pointIndexAt: (argPosition, seriesIndex) =>
      lookup[seriesIndex]?.[argPosition] ?? -1,
  };
}
