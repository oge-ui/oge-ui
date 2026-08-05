import type { GroupedItem } from '../data/data-source';
import type { GroupDescriptor, SummaryDescriptor } from '../data/load-options';
import { createFieldAccessor } from '../util/value-accessor';
import { computeSummaries } from './summaries';

/**
 * Builds the nested group tree from rows that are already sorted by the group
 * fields (the pipeline prepends group fields to the sort). Produces the same
 * `GroupedItem` shape a server returns for `LoadOptions.group`, so the grid's
 * flattening step cannot tell local and remote grouping apart.
 */
export function groupRows<T>(
  rows: readonly T[],
  groups: readonly GroupDescriptor[],
  groupSummary: readonly SummaryDescriptor[] = []
): GroupedItem<T>[] {
  if (!groups.length) return [];
  const [current, ...rest] = groups;
  const accessor = createFieldAccessor<T>(current.field);

  const buckets: { key: unknown; rows: T[] }[] = [];
  const bucketIndex = new Map<unknown, number>();
  for (const row of rows) {
    const key = accessor(row) ?? null;
    const index = bucketIndex.get(key);
    if (index === undefined) {
      bucketIndex.set(key, buckets.length);
      buckets.push({ key, rows: [row] });
    } else {
      buckets[index].rows.push(row);
    }
  }

  return buckets.map((bucket) => ({
    key: bucket.key,
    items: rest.length ? groupRows(bucket.rows, rest, groupSummary) : bucket.rows,
    count: bucket.rows.length,
    ...(groupSummary.length
      ? { summary: computeSummaries(bucket.rows, groupSummary).map((s) => s.value) }
      : {}),
  }));
}
