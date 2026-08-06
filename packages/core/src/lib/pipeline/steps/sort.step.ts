import type { SortDescriptor } from '../../data/load-options';
import { compareValues } from '../../util/comparators';
import {
  createFieldAccessor,
  type ValueAccessor,
} from '../../util/value-accessor';

/**
 * Stable multi-key sort. Returns the input array untouched when there is
 * nothing to sort (referential transparency helps memoization later).
 * `sortValues` overrides the accessor per field (custom sort keys).
 *
 * Sort keys are precomputed once per row (Schwartzian transform): accessors —
 * which may walk dotted paths or run user callbacks — run `n` times instead
 * of `2·n·log n` times inside the comparator.
 */
export function applySort<T>(
  rows: readonly T[],
  sort: readonly SortDescriptor[] | undefined,
  sortValues?: Readonly<Record<string, ValueAccessor<T>>>,
): readonly T[] {
  if (!sort?.length || rows.length < 2) return rows;
  const keys: { accessor: ValueAccessor<T>; mult: 1 | -1 }[] = sort.map(
    (descriptor) => ({
      accessor:
        sortValues?.[descriptor.field] ??
        createFieldAccessor<T>(descriptor.field),
      mult: descriptor.dir === 'desc' ? -1 : 1,
    }),
  );
  const decorated = rows.map((row) => {
    const values = new Array<unknown>(keys.length);
    for (let i = 0; i < keys.length; i++) values[i] = keys[i].accessor(row);
    return { row, values };
  });
  // Array.prototype.sort is stable per the ES spec.
  decorated.sort((a, b) => {
    for (let i = 0; i < keys.length; i++) {
      const result = compareValues(a.values[i], b.values[i]);
      if (result !== 0) return result * keys[i].mult;
    }
    return 0;
  });
  return decorated.map((entry) => entry.row);
}
