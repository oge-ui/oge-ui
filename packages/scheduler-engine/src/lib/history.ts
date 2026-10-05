/**
 * The scheduler's undo/redo log — a plain, non-reactive structure the core
 * owns. Every applied store change is recorded as an operation; the
 * operations of one user action (a recurring occurrence detach is an
 * update plus an insert, a paste is several inserts) group into one entry
 * through `transaction()`. Undo replays the inverse operations through the
 * normal cancelable CRUD pipelines, so the `-ing` / `-ed` events fire for
 * an undo exactly as for the original edit (the grid family's rule).
 */

/** One applied store change. */
export type SchedulerHistoryOp<T> =
  | { readonly kind: 'insert'; readonly item: T }
  | { readonly kind: 'update'; readonly before: T; readonly after: T }
  | { readonly kind: 'remove'; readonly item: T };

/** One undoable step. */
export interface SchedulerHistoryEntry<T> {
  readonly ops: readonly SchedulerHistoryOp<T>[];
}

/** Bounded undo / redo stacks with transaction grouping. */
export class SchedulerEditHistory<T> {
  private readonly undoStack: SchedulerHistoryEntry<T>[] = [];
  private readonly redoStack: SchedulerHistoryEntry<T>[] = [];
  private pending: SchedulerHistoryOp<T>[] | null = null;
  private depth = 0;
  /** Where recorded ops go while an undo / redo replays. */
  private replay: 'undo' | 'redo' | null = null;

  constructor(private limit: () => number) {}

  /** Records one applied change (inside a transaction when one is open). */
  record(op: SchedulerHistoryOp<T>): void {
    if (this.limit() <= 0) return;
    if (this.depth > 0 && this.pending !== null) {
      this.pending.push(op);
      return;
    }
    this.push({ ops: [op] });
  }

  /** Groups every change `run` applies into one entry. */
  transaction<R>(run: () => R): R {
    this.depth++;
    if (this.depth === 1) this.pending = [];
    try {
      return run();
    } finally {
      this.depth--;
      if (this.depth === 0) {
        const ops = this.pending ?? [];
        this.pending = null;
        if (ops.length > 0) this.push({ ops });
      }
    }
  }

  private push(entry: SchedulerHistoryEntry<T>): void {
    if (this.replay === 'undo') {
      this.redoStack.push(entry);
      return;
    }
    this.undoStack.push(entry);
    const limit = this.limit();
    while (this.undoStack.length > limit) this.undoStack.shift();
    if (this.replay === null) this.redoStack.length = 0;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Pops the last entry and lets `apply` replay its ops in reverse (the
   * caller inverts each one); the changes recorded meanwhile become the
   * redo entry. Returns whether there was anything to undo.
   */
  undo(apply: (ops: readonly SchedulerHistoryOp<T>[]) => void): boolean {
    const entry = this.undoStack.pop();
    if (entry === undefined) return false;
    this.replay = 'undo';
    try {
      this.transaction(() => apply([...entry.ops].reverse()));
    } finally {
      this.replay = null;
    }
    return true;
  }

  /** The redo twin of {@link undo}. */
  redo(apply: (ops: readonly SchedulerHistoryOp<T>[]) => void): boolean {
    const entry = this.redoStack.pop();
    if (entry === undefined) return false;
    this.replay = 'redo';
    try {
      this.transaction(() => apply([...entry.ops].reverse()));
    } finally {
      this.replay = null;
    }
    return true;
  }

  /** Forgets everything (a new data source was bound). */
  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}

/** The inverse of an applied op — what an undo applies. */
export function invertHistoryOp<T>(
  op: SchedulerHistoryOp<T>,
): SchedulerHistoryOp<T> {
  switch (op.kind) {
    case 'insert':
      return { kind: 'remove', item: op.item };
    case 'remove':
      return { kind: 'insert', item: op.item };
    case 'update':
      return { kind: 'update', before: op.after, after: op.before };
  }
}

/**
 * The patch that turns an item back into `target`: every own key of
 * `target`, plus `undefined` for keys only `current` has (a field the edit
 * added, such as a fresh recurrence exception).
 */
export function restorePatch<T>(current: T, target: T): Partial<T> {
  const patch: Record<string, unknown> = { ...(target as object) };
  for (const key of Object.keys(current as object)) {
    if (!(key in (target as object))) patch[key] = undefined;
  }
  return patch as Partial<T>;
}
