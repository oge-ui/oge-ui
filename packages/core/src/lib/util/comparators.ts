/**
 * Compares two cell values for sorting.
 *
 * Rules:
 * - `null`/`undefined` are treated as greater than any value, so they sort
 *   last in ascending order (and first in descending order).
 * - Numbers, bigints, booleans and Dates compare numerically.
 * - Strings compare with sensible defaults (case-insensitive, numeric-aware)
 *   under `collator` — the runtime's default locale unless one is passed
 *   (see {@link ogeCollator}).
 * - Mixed/unknown types fall back to their string representation.
 */
export function compareValues(
  a: unknown,
  b: unknown,
  collator: Intl.Collator = defaultCollator,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a)) return Number.isNaN(b) ? 0 : 1;
    if (Number.isNaN(b)) return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  }
  if (typeof a === 'bigint' && typeof b === 'bigint')
    return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === 'boolean' && typeof b === 'boolean')
    return a === b ? 0 : a ? 1 : -1;
  if (a instanceof Date && b instanceof Date) {
    const ta = a.getTime();
    const tb = b.getTime();
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  }
  if (typeof a === 'string' && typeof b === 'string')
    return collator.compare(a, b);

  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

const COLLATOR_OPTIONS: Intl.CollatorOptions = {
  numeric: true,
  sensitivity: 'accent',
};

const defaultCollator = /* @__PURE__ */ new Intl.Collator(
  undefined,
  COLLATOR_OPTIONS,
);

const collators = /* @__PURE__ */ new Map<string, Intl.Collator>();

/**
 * The shared text collator of a locale (numeric-aware, case-insensitive),
 * cached so a sort of 10 000 rows builds one, not one per comparison.
 * `undefined` is the runtime default. In `tr`, `ı` sorts before `i` and `I`
 * is the capital of `ı`, as a Turkish reader expects.
 */
export function ogeCollator(locale?: string): Intl.Collator {
  if (locale === undefined) return defaultCollator;
  let collator = collators.get(locale);
  if (!collator) {
    try {
      collator = new Intl.Collator(locale, COLLATOR_OPTIONS);
    } catch {
      collator = defaultCollator; // an invalid tag sorts like the default
    }
    collators.set(locale, collator);
  }
  return collator;
}

/** A host comparer of two non-null cell values of `field`. */
export type OgeValueCompare = (a: unknown, b: unknown, field: string) => number;

/** What a sort compares with: a locale for text, or a comparer of its own. */
export interface OgeValueComparerOptions {
  /** BCP 47 locale strings sort in; unset = the runtime default. */
  readonly locale?: string | undefined;
  /**
   * Replaces the built-in comparison for non-null values. Blank cells keep
   * sorting last (ascending) without reaching it.
   */
  readonly compare?: OgeValueCompare | undefined;
}

/**
 * The comparer a sort runs, per field: {@link compareValues} under the
 * locale's collator, or the host's `compare` with nulls kept last.
 */
export function ogeValueComparer(
  options: OgeValueComparerOptions = {},
): (a: unknown, b: unknown, field: string) => number {
  const { compare } = options;
  if (compare) {
    return (a, b, field) => {
      if (a == null || b == null) return compareValues(a, b);
      return compare(a, b, field);
    };
  }
  const collator = ogeCollator(options.locale);
  return (a, b) => compareValues(a, b, collator);
}
