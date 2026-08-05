import type { SortDescriptor } from '../../data/load-options';
import { compareValues } from '../../util/comparators';
import { createFieldAccessor, type ValueAccessor } from '../../util/value-accessor';

/**
 * Stable multi-key sort. Returns the input array untouched when there is
 * nothing to sort (referential transparency helps memoization later).
 */
export function applySort<T>(
  rows: readonly T[],
  sort: readonly SortDescriptor[] | undefined
): readonly T[] {
  if (!sort?.length || rows.length < 2) return rows;
  const keys: { accessor: ValueAccessor<T>; mult: 1 | -1 }[] = sort.map((descriptor) => ({
    accessor: createFieldAccessor<T>(descriptor.field),
    mult: descriptor.dir === 'desc' ? -1 : 1,
  }));
  // Array.prototype.sort is stable per the ES spec.
  return [...rows].sort((a, b) => {
    for (const { accessor, mult } of keys) {
      const result = compareValues(accessor(a), accessor(b));
      if (result !== 0) return result * mult;
    }
    return 0;
  });
}
