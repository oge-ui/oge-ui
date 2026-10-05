/**
 * Undo/redo for the board: a plain (non-reactive) stack of applied store
 * changes. Hosts record what their cancelable pipelines actually applied;
 * undo hands back the inverse operations, which the host replays through
 * the same pipelines — so `cardMoving` / `cardMoved`, `cardUpdating` /
 * `cardUpdated` … fire for an undo exactly as for the original edit, and
 * hosts persisting through those events stay in sync. Items are located by
 * key at replay time, so a host that re-binds `dataSource` from the events
 * (new item objects) keeps a working history.
 */

/** Where a card sat (or lands) in a move. */
export interface KanbanHistoryPlace {
  readonly column: string;
  readonly index: number;
  readonly swimlane: string | null;
}

/** One applied store change. */
export type KanbanHistoryOp<T> =
  | {
      readonly kind: 'insert';
      readonly key: unknown;
      readonly item: T;
      /** Position in the store array. */
      readonly index: number;
    }
  | {
      readonly kind: 'remove';
      readonly key: unknown;
      readonly item: T;
      readonly index: number;
    }
  | {
      readonly kind: 'update';
      readonly key: unknown;
      readonly before: T;
      readonly after: T;
    }
  | {
      readonly kind: 'move';
      readonly key: unknown;
      readonly from: KanbanHistoryPlace;
      readonly to: KanbanHistoryPlace;
    };

/** The operation that reverts `op`. */
export function invertKanbanOp<T>(op: KanbanHistoryOp<T>): KanbanHistoryOp<T> {
  switch (op.kind) {
    case 'insert':
      return { ...op, kind: 'remove' };
    case 'remove':
      return { ...op, kind: 'insert' };
    case 'update':
      return { ...op, before: op.after, after: op.before };
    case 'move':
      return { ...op, from: op.to, to: op.from };
  }
}

/** Default `undoLimit`. */
export const KANBAN_DEFAULT_UNDO_LIMIT = 50;

/**
 * The undo/redo stacks. One step is one user action — a transaction groups
 * the per-card operations of a multi-card move or a bulk delete.
 */
export class KanbanHistory<T> {
  private undoStack: KanbanHistoryOp<T>[][] = [];
  private redoStack: KanbanHistoryOp<T>[][] = [];
  private open: KanbanHistoryOp<T>[] | null = null;
  private depth = 0;
  private replaying = false;

  constructor(private limit: number = KANBAN_DEFAULT_UNDO_LIMIT) {}

  /** Changes the step limit (`0` disables recording and clears). */
  setLimit(limit: number): void {
    this.limit = Math.max(0, Math.floor(limit));
    if (this.limit === 0) this.clear();
    else this.trim();
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Records an applied change (ignored while replaying or disabled). */
  record(op: KanbanHistoryOp<T>): void {
    if (this.replaying || this.limit === 0) return;
    if (this.open !== null) {
      this.open.push(op);
      return;
    }
    this.push([op]);
  }

  /** Runs `fn` with every recorded change grouped into one step. */
  transaction<R>(fn: () => R): R {
    if (this.depth === 0) this.open = [];
    this.depth++;
    try {
      return fn();
    } finally {
      this.depth--;
      if (this.depth === 0) {
        const ops = this.open ?? [];
        this.open = null;
        if (ops.length > 0) this.push(ops);
      }
    }
  }

  /**
   * Pops the newest step and returns the operations that revert it, in
   * replay order. `null` = nothing to undo.
   */
  undo(): KanbanHistoryOp<T>[] | null {
    const step = this.undoStack.pop();
    if (step === undefined) return null;
    this.redoStack.push(step);
    return [...step].reverse().map(invertKanbanOp);
  }

  /** Pops the newest undone step and returns its operations again. */
  redo(): KanbanHistoryOp<T>[] | null {
    const step = this.redoStack.pop();
    if (step === undefined) return null;
    this.undoStack.push(step);
    return [...step];
  }

  /** Runs a replay: changes applied inside are not recorded. */
  replay(fn: () => void): void {
    const previous = this.replaying;
    this.replaying = true;
    try {
      fn();
    } finally {
      this.replaying = previous;
    }
  }

  /** Drops both stacks. */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  private push(step: KanbanHistoryOp<T>[]): void {
    this.undoStack.push(step);
    this.redoStack = [];
    this.trim();
  }

  private trim(): void {
    while (this.undoStack.length > this.limit) this.undoStack.shift();
  }
}

/** The history shortcut of a board keydown, or `null`. */
export function kanbanHistoryShortcut(event: {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}): 'undo' | 'redo' | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (key === 'y' && !event.shiftKey) return 'redo';
  return null;
}

/**
 * Whether a keydown target is an editing surface (text input, textarea,
 * select, contenteditable) whose own undo must win over the board's.
 */
export function isKanbanEditingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (el === null || typeof el.tagName !== 'string') return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea' || tag === 'select') return true;
  if (tag === 'input') {
    const type = (el.getAttribute('type') ?? 'text').toLowerCase();
    return !['button', 'checkbox', 'radio', 'submit', 'reset'].includes(type);
  }
  return el.isContentEditable === true;
}
