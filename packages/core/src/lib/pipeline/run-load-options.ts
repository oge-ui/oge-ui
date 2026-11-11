import type { LoadOptions } from '../data/load-options';
import type { LoadResult } from '../data/data-source';
import { buildSearchFilter } from '../filtering/filter-evaluator';
import { groupRows } from '../grouping/group-rows';
import { computeSummaries, type CustomSummaryMap } from '../grouping/summaries';
import type { ValueAccessor } from '../util/value-accessor';
import { applyFilter } from './steps/filter.step';
import { applyPaging } from './steps/paginate.step';
import { applySort } from './steps/sort.step';

export interface RunLoadOptionsConfig<T = unknown> {
  /** Fields the global `searchText` is matched against (client-side). */
  searchFields?: readonly string[];
  /** Per-field custom sort keys (`calculateSortValue`); client-side only. */
  sortValues?: Readonly<Record<string, (row: T) => unknown>>;
  /** Custom summary reducers keyed by descriptor `name ?? field`; client-side only. */
  customSummaries?: CustomSummaryMap<T>;
  /**
   * Per-field values filters compare instead of the property
   * (`calculateFilterValue`); client-side only. The global search matches
   * them too, even for fields the rows do not carry.
   */
  filterValues?: Readonly<Record<string, ValueAccessor<T>>>;
  /**
   * Extra text the global search matches per field, beside the property —
   * a lookup column's display text. Fields named here are searched even
   * when `searchFields` leaves them out.
   */
  searchValues?: Readonly<Record<string, ValueAccessor<T>>>;
  /** The sort comparison (`ogeValueComparer`); default `compareValues`. */
  compare?: (a: unknown, b: unknown, field: string) => number;
}

/**
 * The global search over rows: an or-of-contains across `fields`, where a
 * field with a filter value is matched on it and a field with search text
 * is matched on its property and that text together.
 */
export function ogeSearchRows<T>(
  rows: readonly T[],
  searchText: string | undefined,
  config: RunLoadOptionsConfig<T>,
): readonly T[] {
  if (!searchText?.trim() || !rows.length) return rows;
  const base = config.searchFields ?? Object.keys(rows[0] as object);
  const extra = config.searchValues ?? {};
  const fields = [
    ...new Set([
      ...base,
      ...Object.keys(config.filterValues ?? {}),
      ...Object.keys(extra),
    ]),
  ];
  const accessors: Record<string, ValueAccessor<T>> = {
    ...config.filterValues,
  };
  for (const [field, text] of Object.entries(extra)) {
    const own = accessors[field];
    accessors[field] = (row) => {
      const value = own
        ? own(row)
        : (row as Record<string, unknown> | null)?.[field];
      const label = text(row);
      return `${value ?? ''}\u0000${label ?? ''}`;
    };
  }
  return applyFilter(rows, buildSearchFilter(fields, searchText), accessors);
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
  config: RunLoadOptionsConfig<T> = {},
): LoadResult<T> {
  const filtered = applyFilter(rows, options.filter, config.filterValues);
  const searched = ogeSearchRows(filtered, options.searchText, config);

  const summary = options.totalSummary?.length
    ? {
        summary: computeSummaries(
          searched,
          options.totalSummary,
          config.customSummaries,
        ).map((s) => s.value),
      }
    : {};
  const totalCount = options.requireTotalCount
    ? { totalCount: searched.length }
    : {};

  const groups = options.group ?? [];
  if (groups.length) {
    const sorted = applySort(
      searched,
      [
        ...groups.map((g) => ({ field: g.field, dir: g.dir })),
        ...(options.sort ?? []),
      ],
      config.sortValues,
      config.compare,
    );
    const grouped = groupRows(
      sorted,
      groups,
      options.groupSummary ?? [],
      config.customSummaries,
    );
    return {
      data: grouped,
      ...(options.requireGroupCount ? { groupCount: grouped.length } : {}),
      ...totalCount,
      ...summary,
    };
  }

  const sorted = applySort(
    searched,
    options.sort,
    config.sortValues,
    config.compare,
  );
  const paged = applyPaging(sorted, options.skip, options.take);
  return { data: paged, ...totalCount, ...summary };
}
