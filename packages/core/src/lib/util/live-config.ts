/**
 * A config object whose properties follow a reactive source — the mechanism
 * behind `provideOge<X>Config(() => ({ … }))`, which lets an app switch the
 * UI language (or locale, or any default) at runtime without a reload.
 *
 * `read` resolves the whole config (defaults merged) and is wrapped in the
 * caller's memo primitive (`derive` — Angular's `computed`), so it re-runs
 * only when a signal it reads changes. Every top-level property becomes a
 * getter over that memo: a component that merges `config.messages` inside
 * its own `computed` depends on the source through the getter and
 * re-renders when it changes; code that reads a property once keeps the
 * value of that moment.
 *
 * The property set is fixed by the first resolution — configs have a static
 * shape (defaults always fill every key), only the values change.
 */
export function ogeLiveConfig<T extends object>(
  read: () => T,
  derive: <V>(compute: () => V) => () => V,
): T {
  const current = derive(read);
  const live = {} as T;
  for (const key of Object.keys(current()) as (keyof T)[]) {
    Object.defineProperty(live, key, {
      enumerable: true,
      get: () => current()[key],
    });
  }
  return live;
}
