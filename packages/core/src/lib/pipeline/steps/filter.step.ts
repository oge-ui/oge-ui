import type { FilterExpr } from '../../data/load-options';
import { createFilterPredicate } from '../../filtering/filter-evaluator';

/** Applies a filter tree; returns the input untouched when there is no filter. */
export function applyFilter<T>(
  rows: readonly T[],
  filter: FilterExpr | null | undefined,
): readonly T[] {
  if (!filter || !rows.length) return rows;
  return rows.filter(createFilterPredicate<T>(filter));
}
