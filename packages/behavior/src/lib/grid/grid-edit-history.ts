import type { RowKey } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';

/** One value change an undo can revert. */
export interface OgeGridEditRecord {
  readonly key: RowKey;
  readonly field: string;
  readonly before: unknown;
  readonly after: unknown;
}

/** Why a batch entered the history — what the announcement names. */
export type OgeGridEditSource = 'edit' | 'paste' | 'fill' | 'undo' | 'redo';

/** One undoable step: every value one commit, paste or fill wrote. */
export interface OgeGridEditBatch {
  readonly records: readonly OgeGridEditRecord[];
  readonly source: OgeGridEditSource;
}

/**
 * The grid's undo / redo stacks for cell values (Ctrl+Z / Ctrl+Y).
 *
 * A stack of value batches, not of change sets: an undo writes each record's
 * `before` back through the same apply path a paste uses — staged in batch
 * mode, saved through `savingChanges` otherwise — so undo is an edit like any
 * other, with the same events and the same validation. Row inserts and
 * removals are not recorded (their undo is the batch toolbar's Discard, or
 * the Undo-delete command).
 */
export class OgeGridEditHistory {
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;

  private readonly undoStack: OgeReactiveCell<readonly OgeGridEditBatch[]>;
  private readonly redoStack: OgeReactiveCell<readonly OgeGridEditBatch[]>;

  constructor(
    rx: OgeReactivityAdapter,
    private readonly limit = 100,
  ) {
    this.undoStack = rx.cell<readonly OgeGridEditBatch[]>([]);
    this.redoStack = rx.cell<readonly OgeGridEditBatch[]>([]);
    this.canUndo = rx.derived(() => this.undoStack().length > 0);
    this.canRedo = rx.derived(() => this.redoStack().length > 0);
  }

  /** Records a new step; clears the redo stack (a new branch of history). */
  record(batch: OgeGridEditBatch): void {
    const records = batch.records.filter(
      (record) => !sameValue(record.before, record.after),
    );
    if (!records.length) return;
    const next = [...this.undoStack(), { ...batch, records }];
    this.undoStack.set(next.slice(-this.limit));
    if (this.redoStack().length) this.redoStack.set([]);
  }

  /** Pops the step to undo (moving it onto the redo stack), or `null`. */
  takeUndo(): OgeGridEditBatch | null {
    const stack = this.undoStack();
    const batch = stack[stack.length - 1];
    if (!batch) return null;
    this.undoStack.set(stack.slice(0, -1));
    this.redoStack.set([...this.redoStack(), batch]);
    return batch;
  }

  /** Pops the step to redo (moving it back onto the undo stack), or `null`. */
  takeRedo(): OgeGridEditBatch | null {
    const stack = this.redoStack();
    const batch = stack[stack.length - 1];
    if (!batch) return null;
    this.redoStack.set(stack.slice(0, -1));
    this.undoStack.set([...this.undoStack(), batch]);
    return batch;
  }

  clear(): void {
    if (this.undoStack().length) this.undoStack.set([]);
    if (this.redoStack().length) this.redoStack.set([]);
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return Object.is(a, b);
}
