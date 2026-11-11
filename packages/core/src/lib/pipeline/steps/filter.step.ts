import type { FilterExpr } from '../../data/load-options';
import { createFilterPredicate } from '../../filtering/filter-evaluator';
import type { ValueAccessor } from '../../util/value-accessor';

/**
 * Applies a filter tree; returns the input untouched when there is no filter.
 * The tree compiles once per call (`createFilterPredicate`), never per row.
 * `accessors` replace the property read of the fields they name.
 */
export function applyFilter<T>(
  rows: readonly T[],
  filter: FilterExpr | null | undefined,
  accessors?: Readonly<Record<string, ValueAccessor<T>>>,
): readonly T[] {
  if (!filter || !rows.length) return rows;
  return rows.filter(
    createFilterPredicate<T>(filter, accessors ? { accessors } : undefined),
  );
}
