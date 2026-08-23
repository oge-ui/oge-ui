import {
  DestroyRef,
  effect,
  inject,
  untracked,
  type Signal,
} from '@angular/core';
import { OgeGridStatePersistenceCore } from '@oge-ui/behavior';
import type { OgeStateStorage } from './state-storage';

export interface StatePersistenceOptions<S> {
  /** Storage key input; a new key re-triggers the restore. */
  stateKey: Signal<string | undefined>;
  /** Storage namespace, e.g. `'oge-grid'` → entry `oge-grid:<key>`. */
  prefix: string;
  storage: OgeStateStorage;
  /** Current persistable snapshot (drives the debounced save). */
  snapshot: Signal<S>;
  apply(snapshot: S): void;
  /**
   * Extra reactive reads registered before restoring — e.g. content-projected
   * column directives, so the restore re-runs once they exist.
   */
  beforeRestore?: () => void;
  /** Debounced change notification; the initial snapshot does not fire it. */
  onChange?: (snapshot: S) => void;
}

/**
 * Wires stateKey persistence for a grid-like component: restore once per key
 * (sync or async storage, stale-key guarded) and a 250 ms debounced save +
 * change notification. Must run in an injection context (component
 * constructor or field initializer).
 *
 * Since ADR 0001's grid phase the rules live in `@oge-ui/behavior`'s
 * `OgeGridStatePersistenceCore`, shared verbatim with the React grid. What
 * stays here is only what is genuinely Angular: the two effects that decide
 * *when* to restore and when a new snapshot exists, and the `DestroyRef`
 * teardown.
 */
export function createStatePersistence<S>(
  options: StatePersistenceOptions<S>,
): void {
  const destroyRef = inject(DestroyRef);
  const core = new OgeGridStatePersistenceCore<S>({
    prefix: options.prefix,
    storage: options.storage,
    snapshot: () => untracked(options.snapshot),
    stateKey: () => untracked(options.stateKey),
    apply: options.apply,
    onChange: options.onChange,
  });

  effect(() => {
    const key = options.stateKey();
    options.beforeRestore?.();
    untracked(() => core.restore(key));
  });

  effect(() => {
    const snapshot = options.snapshot();
    const key = options.stateKey();
    untracked(() => core.noteSnapshot(snapshot, key));
  });

  destroyRef.onDestroy(() => core.dispose());
}
