/**
 * Compares two cell values for sorting.
 *
 * Rules:
 * - `null`/`undefined` are treated as greater than any value, so they sort
 *   last in ascending order (and first in descending order).
 * - Numbers, bigints, booleans and Dates compare numerically.
 * - Strings compare with sensible defaults (case-insensitive, numeric-aware).
 * - Mixed/unknown types fall back to their string representation.
 */
export function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a)) return Number.isNaN(b) ? 0 : 1;
    if (Number.isNaN(b)) return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  }
  if (typeof a === 'bigint' && typeof b === 'bigint') return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
  if (a instanceof Date && b instanceof Date) {
    const ta = a.getTime();
    const tb = b.getTime();
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  }
  if (typeof a === 'string' && typeof b === 'string') return collator.compare(a, b);

  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'accent' });
