import type { GroupedItem } from '../data/data-source';
import type {
  FilterExpr,
  GroupDescriptor,
  GroupInterval,
  SummaryDescriptor,
} from '../data/load-options';
import { resolveFirstDayOfWeek, startOfWeek } from '../util/date-utils';
import { createFieldAccessor } from '../util/value-accessor';
import { computeSummaries, type CustomSummaryMap } from './summaries';

/**
 * Builds the nested group tree from rows that are already sorted by the group
 * fields (the pipeline prepends group fields to the sort). Produces the same
 * `GroupedItem` shape a server returns for `LoadOptions.group`, so the grid's
 * flattening step cannot tell local and remote grouping apart.
 */
export function groupRows<T>(
  rows: readonly T[],
  groups: readonly GroupDescriptor[],
  groupSummary: readonly SummaryDescriptor[] = [],
  customSummaries?: CustomSummaryMap<T>,
): GroupedItem<T>[] {
  if (!groups.length) return [];
  const [current, ...rest] = groups;
  const accessor = createFieldAccessor<T>(current.field);

  const buckets: { key: unknown; rows: T[] }[] = [];
  const bucketIndex = new Map<unknown, number>();
  for (const row of rows) {
    const key = groupKeyOf(accessor(row) ?? null, current.interval);
    // Dates bucket by instant, not by object identity: two `new Date(…)` for
    // the same moment used to become two groups
    const identity = key instanceof Date ? `\u0000date:${key.getTime()}` : key;
    const index = bucketIndex.get(identity);
    if (index === undefined) {
      bucketIndex.set(identity, buckets.length);
      buckets.push({ key, rows: [row] });
    } else {
      buckets[index].rows.push(row);
    }
  }

  return buckets.map((bucket) => ({
    key: bucket.key,
    items: rest.length
      ? groupRows(bucket.rows, rest, groupSummary, customSummaries)
      : bucket.rows,
    count: bucket.rows.length,
    ...(groupSummary.length
      ? {
          summary: computeSummaries(
            bucket.rows,
            groupSummary,
            customSummaries,
          ).map((s) => s.value),
        }
      : {}),
  }));
}

/**
 * The group key of a value: dates (and, with a calendar interval, date
 * strings and timestamps) truncated to the interval's start in local time;
 * with a numeric interval, numbers truncated to their bucket's lower bound
 * (`floor(value / size) * size`); anything else unchanged. Date keys stay
 * `Date`s, so group captions format like the cells.
 */
export function groupKeyOf(value: unknown, interval?: GroupInterval): unknown {
  if (typeof interval === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return value;
    return Math.floor(value / interval) * interval;
  }
  let date: Date | null = null;
  if (value instanceof Date) date = value;
  else if (
    interval &&
    (typeof value === 'string' || typeof value === 'number')
  ) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }
  if (!date || Number.isNaN(date.getTime())) return value;
  switch (interval) {
    case 'hour':
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
      );
    case 'day':
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    case 'week':
      return startOfWeek(date, resolveFirstDayOfWeek(undefined, undefined));
    case 'month':
      return new Date(date.getFullYear(), date.getMonth(), 1);
    case 'quarter':
      return new Date(
        date.getFullYear(),
        Math.floor(date.getMonth() / 3) * 3,
        1,
      );
    case 'year':
      return new Date(date.getFullYear(), 0, 1);
    default:
      return date;
  }
}

/** The start of the bucket after the one `key` opens. */
function nextBucketStart(
  key: Date,
  interval: Exclude<GroupInterval, number>,
): Date {
  const end = new Date(key);
  switch (interval) {
    case 'hour':
      end.setHours(end.getHours() + 1);
      break;
    case 'day':
      end.setDate(end.getDate() + 1);
      break;
    case 'week':
      end.setDate(end.getDate() + 7);
      break;
    case 'month':
      end.setMonth(end.getMonth() + 1);
      break;
    case 'quarter':
      end.setMonth(end.getMonth() + 3);
      break;
    default:
      end.setFullYear(end.getFullYear() + 1);
  }
  return end;
}

/**
 * The filter selecting the rows of one group — `field eq key`, or for a date
 * bucket the half-open range `[start, next start)`, so a day group keeps its
 * 09:00 and 17:30 rows when its children are fetched on demand.
 */
export function groupKeyFilter(
  field: string,
  key: unknown,
  interval?: GroupInterval,
): FilterExpr {
  if (typeof interval === 'number' && typeof key === 'number') {
    return {
      type: 'and',
      operands: [
        { type: 'binary', field, op: 'ge', value: key },
        { type: 'binary', field, op: 'lt', value: key + interval },
      ],
    };
  }
  if (!interval || typeof interval === 'number' || !(key instanceof Date)) {
    return { type: 'binary', field, op: 'eq', value: key };
  }
  const end = nextBucketStart(key, interval);
  return {
    type: 'and',
    operands: [
      { type: 'binary', field, op: 'ge', value: key },
      { type: 'binary', field, op: 'lt', value: end },
    ],
  };
}
