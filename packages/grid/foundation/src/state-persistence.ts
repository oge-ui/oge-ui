import {
  DestroyRef,
  effect,
  inject,
  untracked,
  type Signal,
} from '@angular/core';
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
 */
export function createStatePersistence<S>(
  options: StatePersistenceOptions<S>,
): void {
  const destroyRef = inject(DestroyRef);
  let restoredKey: string | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let changeSeen = false;

  effect(() => {
    const key = options.stateKey();
    options.beforeRestore?.();
    if (!key || restoredKey === key) return;
    restoredKey = key;
    const raw = untracked(() =>
      options.storage.get(`${options.prefix}:${key}`),
    );
    const apply = (text: string | null): void => {
      if (!text) return;
      try {
        options.apply(JSON.parse(text) as S);
      } catch {
        // corrupt persisted state — start clean
      }
    };
    if (raw !== null && typeof raw === 'object') {
      // async backend (API / IndexedDB) — apply when it resolves, unless
      // the host switched to a different stateKey in the meantime
      void raw.then((text) => {
        if (untracked(options.stateKey) === key) apply(text);
      });
    } else {
      apply(raw);
    }
  });

  effect(() => {
    const snapshot = options.snapshot();
    const key = options.stateKey();
    untracked(() => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (key)
          void options.storage.set(
            `${options.prefix}:${key}`,
            JSON.stringify(snapshot),
          );
        // first run is the initial state, not a change
        if (changeSeen) options.onChange?.(snapshot);
        changeSeen = true;
      }, 250);
    });
  });

  destroyRef.onDestroy(() => clearTimeout(saveTimer));
}
