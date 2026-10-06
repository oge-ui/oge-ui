/**
 * The rich-text editor's own undo/redo history (W8e). The browser's native
 * contenteditable history cannot be used: the editor re-renders the DOM
 * from its model, which the native stack would record as foreign edits and
 * "undo" into a document the model never had. So every committed command
 * pushes the state *before* it here, and Ctrl+Z restores model states.
 *
 * Typing coalesces: consecutive single-character insertions (or deletions)
 * within `coalesceMs` that continue from the previous caret become one
 * entry, so undo removes a word rather than a letter — the behaviour of
 * every reference editor. A space or a line break ends the run.
 */
import type { OgeEditorDoc, OgeEditorSelection } from './editor-model';

/** One restorable point in time. */
export interface OgeEditorHistoryEntry {
  readonly doc: OgeEditorDoc;
  readonly selection: OgeEditorSelection;
}

/** What produced a change — decides whether it merges into the previous entry. */
export type OgeEditorChangeKind =
  'typing' | 'deleting' | 'format' | 'structure' | 'paste' | 'other';

/** Options of {@link OgeEditorHistory}. */
export interface OgeEditorHistoryOptions {
  /** Most entries kept on the undo stack. Default `100`. */
  readonly limit?: number;
  /** Window within which typing coalesces, in ms. Default `1000`. */
  readonly coalesceMs?: number;
  /** Clock seam for tests. */
  readonly now?: () => number;
}

/** A bounded two-stack history of model states. */
export class OgeEditorHistory {
  private undoStack: OgeEditorHistoryEntry[] = [];
  private redoStack: OgeEditorHistoryEntry[] = [];
  private lastKind: OgeEditorChangeKind | null = null;
  private lastTime = 0;
  private readonly limit: number;
  private readonly coalesceMs: number;
  private readonly now: () => number;

  constructor(options: OgeEditorHistoryOptions = {}) {
    this.limit = Math.max(1, options.limit ?? 100);
    this.coalesceMs = options.coalesceMs ?? 1000;
    this.now =
      options.now ??
      (() =>
        typeof performance !== 'undefined' ? performance.now() : Date.now());
  }

  /** `true` when there is something to undo. */
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** `true` when there is something to redo. */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Records `before` — the state a change is about to replace. `text` is
   * the typed text for `'typing'` changes (a space or newline ends a run).
   */
  record(
    before: OgeEditorHistoryEntry,
    kind: OgeEditorChangeKind,
    text = '',
  ): void {
    const time = this.now();
    const coalesce =
      (kind === 'typing' || kind === 'deleting') &&
      this.lastKind === kind &&
      time - this.lastTime <= this.coalesceMs &&
      this.undoStack.length > 0 &&
      !/\s/.test(text);
    this.lastKind = kind === 'typing' && /\s/.test(text) ? 'other' : kind;
    this.lastTime = time;
    this.redoStack = [];
    if (coalesce) return;
    this.undoStack.push(before);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
  }

  /** Ends the current typing run (the caret moved, focus left). */
  breakRun(): void {
    this.lastKind = null;
  }

  /** Steps back: returns the state to restore, given the current one. */
  undo(current: OgeEditorHistoryEntry): OgeEditorHistoryEntry | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push(current);
    this.lastKind = null;
    return entry;
  }

  /** Steps forward again. */
  redo(current: OgeEditorHistoryEntry): OgeEditorHistoryEntry | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push(current);
    this.lastKind = null;
    return entry;
  }

  /** Forgets everything (a new value was loaded). */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.lastKind = null;
  }
}
