/**
 * Pluggable persistence backend for `stateKey` (default: localStorage).
 *
 * Both methods may return promises, so the backend can just as well be an
 * HTTP API or IndexedDB.
 */
export interface OgeStateStorage {
  get(key: string): string | null | Promise<string | null>;
  set(key: string, value: string): void | Promise<void>;
}

export interface OgeGridStatePersistenceOptions<S> {
  /** Storage namespace, e.g. `'oge-grid'` → entry `oge-grid:<key>`. */
  prefix: string;
  storage: OgeStateStorage;
  /** Current persistable snapshot — read when a restore takes the baseline. */
  snapshot: () => S;
  /** The stateKey in force right now — guards a stale async restore. */
  stateKey: () => string | undefined;
  apply(snapshot: S): void;
  /** Debounced change notification; the initial snapshot does not fire it. */
  onChange?: (snapshot: S) => void;
  /** Save/notify debounce. Default 250 ms. */
  debounceMs?: number;
}

/**
 * `stateKey` persistence for a grid-like component: restore once per key
 * (sync or async storage, stale-key guarded) and a debounced save + change
 * notification.
 *
 * Framework-free (ADR 0001). *When* to restore and when a new snapshot exists
 * is the host's scheduling decision — Angular watches with `effect()`, React
 * with `useEffect` — so this class exposes {@link restore} and
 * {@link noteSnapshot} instead of subscribing to anything itself. Everything
 * that makes persistence correct rather than merely present lives here: the
 * once-per-key guard, the stale-async-response guard, the
 * restored-state-is-the-baseline rule and the debounce.
 */
export class OgeGridStatePersistenceCore<S> {
  private restoredKey: string | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  /** JSON of the last persisted/announced snapshot; null until the baseline is taken. */
  private lastJson: string | null = null;

  constructor(private readonly options: OgeGridStatePersistenceOptions<S>) {}

  /**
   * Restores the state stored under `key`, at most once per key. A `null`
   * or empty key does nothing, which is what an unset `stateKey` means.
   */
  restore(key: string | undefined): void {
    if (!key || this.restoredKey === key) return;
    this.restoredKey = key;
    const raw = this.options.storage.get(`${this.options.prefix}:${key}`);
    const apply = (text: string | null): void => {
      if (!text) return;
      try {
        this.options.apply(JSON.parse(text) as S);
        // restored state becomes the new baseline — no save/onChange echo,
        // while the next real user change still reports against it
        this.lastJson = JSON.stringify(this.options.snapshot());
      } catch {
        // corrupt persisted state — start clean
      }
    };
    if (raw !== null && typeof raw === 'object') {
      // async backend (API / IndexedDB) — apply when it resolves, unless
      // the host switched to a different stateKey in the meantime
      void raw.then((text) => {
        if (this.options.stateKey() === key) apply(text);
      });
    } else {
      apply(raw);
    }
  }

  /**
   * Reports the snapshot the host currently holds. The first one is the
   * baseline, not a change: comparing against it (instead of skipping one
   * debounce tick) means a user change landing within the first debounce
   * window is still reported, and identical snapshots never re-save.
   */
  noteSnapshot(snapshot: S, key: string | undefined): void {
    const json = JSON.stringify(snapshot);
    if (this.lastJson === null) {
      this.lastJson = json;
      return;
    }
    if (json === this.lastJson) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.lastJson = json;
      if (key) {
        void this.options.storage.set(`${this.options.prefix}:${key}`, json);
      }
      this.options.onChange?.(snapshot);
    }, this.options.debounceMs ?? 250);
  }

  /** Cancels a pending save. The host calls this when it is torn down. */
  dispose(): void {
    clearTimeout(this.saveTimer);
  }
}
