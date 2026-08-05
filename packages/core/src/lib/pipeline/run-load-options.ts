import type { LoadOptions } from '../data/load-options';
import type { LoadResult } from '../data/data-source';
import { buildSearchFilter } from '../filtering/filter-evaluator';
import { groupRows } from '../grouping/group-rows';
import { computeSummaries } from '../grouping/summaries';
import { applyFilter } from './steps/filter.step';
import { applyPaging } from './steps/paginate.step';
import { applySort } from './steps/sort.step';

export interface RunLoadOptionsConfig {
  /** Fields the global `searchText` is matched against (client-side). */
  searchFields?: readonly string[];
}

/**
 * Client-side execution of LoadOptions over an in-memory array:
 * filter → search → sort → (group + summaries | paging).
 * When grouping is active the full grouped tree is returned (no paging) —
 * expansion/flattening happens on the consumer side.
 */
export function runLoadOptions<T>(
  rows: readonly T[],
  options: LoadOptions,
  config: RunLoadOptionsConfig = {}
): LoadResult<T> {
  const filtered = applyFilter(rows, options.filter);
  const searchFields =
    config.searchFields ?? (rows.length ? Object.keys(rows[0] as object) : []);
  const searchFilter = options.searchText
    ? buildSearchFilter(searchFields, options.searchText)
    : null;
  const searched = applyFilter(filtered, searchFilter);

  const summary = options.totalSummary?.length
    ? { summary: computeSummaries(searched, options.totalSummary).map((s) => s.value) }
    : {};
  const totalCount = options.requireTotalCount ? { totalCount: searched.length } : {};

  const groups = options.group ?? [];
  if (groups.length) {
    const sorted = applySort(searched, [
      ...groups.map((g) => ({ field: g.field, dir: g.dir })),
      ...(options.sort ?? []),
    ]);
    const grouped = groupRows(sorted, groups, options.groupSummary ?? []);
    return {
      data: grouped,
      ...(options.requireGroupCount ? { groupCount: grouped.length } : {}),
      ...totalCount,
      ...summary,
    };
  }

  const sorted = applySort(searched, options.sort);
  const paged = applyPaging(sorted, options.skip, options.take);
  return { data: paged, ...totalCount, ...summary };
}
