/**
 * Versioned stored state (`stateMigrations`). A host whose saved grid state
 * changes shape — a column renamed, a filter rewritten — lists one step per
 * format change; the snapshot records how many steps it has been through
 * (`version`), and a restore runs the missing ones before the sanitizer sees
 * the result. An old entry is upgraded in place instead of being thrown away
 * on the next release.
 */

/** A stored snapshot as plain JSON, before validation. */
export type OgeStoredState = Record<string, unknown>;

/** One format step: upgrades a state of version `n` to `n + 1`. */
export type OgeStateMigration = (state: OgeStoredState) => OgeStoredState;

const isPlain = (value: unknown): value is OgeStoredState =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** The format version a stored state carries (`0` when it has none). */
export function ogeStateVersion(value: unknown): number {
  if (!isPlain(value)) return 0;
  const version = value['version'];
  return typeof version === 'number' &&
    Number.isInteger(version) &&
    version >= 0
    ? version
    : 0;
}

/**
 * Runs the steps a stored state has not been through and stamps the current
 * version (`migrations.length`). A state from a newer release, or one that
 * is not an object, passes through for the sanitizer to judge.
 *
 * Should a step throw or return something that is not an object, the column
 * layout (`columns`: widths, order, pins, hidden) and the page size are kept
 * and the rest dropped — a broken migration costs the filters, never the
 * widths the user dragged.
 */
export function ogeMigrateState(
  value: unknown,
  migrations: readonly OgeStateMigration[] | undefined,
): unknown {
  if (!migrations?.length || !isPlain(value)) return value;
  const current = migrations.length;
  const from = ogeStateVersion(value);
  if (from >= current) return value;
  let state: OgeStoredState = { ...value };
  try {
    for (let step = from; step < current; step++) {
      const next = migrations[step]({ ...state });
      if (!isPlain(next)) throw new TypeError('not a state object');
      state = next;
    }
  } catch {
    const kept: OgeStoredState = { version: current };
    if (isPlain(value['columns'])) kept['columns'] = value['columns'];
    const paging = value['paging'];
    if (isPlain(paging) && 'pageSize' in paging) {
      kept['paging'] = { pageSize: paging['pageSize'] };
    }
    return kept;
  }
  return { ...state, version: current };
}
