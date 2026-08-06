import type { PivotGroupInterval } from './pivot-types';

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Maps a raw value into its group-interval bucket key. Date parts become
 * numbers (year 2024, quarter 1-4, month 1-12, day 1-31, dayOfWeek 0-6);
 * numeric intervals bucket to the range start. `null` stays `null`.
 */
export function intervalKey(value: unknown, interval: PivotGroupInterval | undefined): unknown {
  if (interval === undefined || value == null) return value ?? null;
  if (typeof interval === 'number') {
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num) || interval <= 0) return value;
    return num - (((num % interval) + interval) % interval);
  }
  const date = asDate(value);
  if (!date) return value;
  switch (interval) {
    case 'year':
      return date.getFullYear();
    case 'quarter':
      return Math.floor(date.getMonth() / 3) + 1;
    case 'month':
      return date.getMonth() + 1;
    case 'day':
      return date.getDate();
    case 'dayOfWeek':
      return date.getDay();
  }
}

/**
 * Inclusive [from, to] raw-value range matching an interval bucket — used to
 * translate an axis path back into a serializable filter for remote sources.
 * Returns null when the bucket cannot be expressed as a range (`quarter`,
 * `month`, `day`, `dayOfWeek` recur across years and need the server side to
 * apply the same interval function).
 */
export function intervalRange(
  bucket: unknown,
  interval: PivotGroupInterval | undefined
): { from: unknown; to: unknown } | null {
  if (interval === undefined) return null;
  if (typeof interval === 'number') {
    const start = typeof bucket === 'number' ? bucket : Number(bucket);
    if (Number.isNaN(start)) return null;
    return { from: start, to: start + interval };
  }
  if (interval === 'year' && typeof bucket === 'number') {
    return {
      from: new Date(bucket, 0, 1).toISOString(),
      to: new Date(bucket + 1, 0, 1).toISOString(),
    };
  }
  return null;
}
