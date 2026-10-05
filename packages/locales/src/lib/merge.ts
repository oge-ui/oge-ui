import type { OgeDeepPartial } from './locale-pack';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Lays a pack's slice over a complete catalog, nested blocks key by key —
 * so every key the slice does not carry keeps the catalog's string. The
 * family providers merge `messages` one level deep (a nested block such as
 * the grid's `operators` or the scheduler's `toolbar` is replaced whole);
 * merging through this first means a pack written for an older release can
 * never blank out a string a newer release added. Neither argument is
 * mutated; `undefined` values in the slice are ignored.
 *
 * ```ts
 * provideOgeSchedulerConfig({
 *   locale: tr.locale,
 *   messages: ogeMergeMessages(OGE_DEFAULT_SCHEDULER_MESSAGES, tr.scheduler),
 * });
 * ```
 */
export function ogeMergeMessages<T extends object>(
  defaults: T,
  slice: OgeDeepPartial<T> | undefined,
): T {
  if (!slice) return defaults;
  const out: Record<string, unknown> = { ...(defaults as object) };
  for (const [key, value] of Object.entries(slice)) {
    if (value === undefined) continue;
    const base = out[key];
    out[key] =
      isPlainObject(base) && isPlainObject(value)
        ? ogeMergeMessages(base, value as OgeDeepPartial<typeof base>)
        : value;
  }
  return out as T;
}
