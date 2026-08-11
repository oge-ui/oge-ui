import type { BpmnDiagram } from './bpmn-model';

/** A named, pure model transformation; returning the same reference marks it a no-op. */
export interface BpmnCommand {
  readonly label: string;
  apply(model: BpmnDiagram): BpmnDiagram;
}

/** Origin of a command-stack change notification. */
export type BpmnCommandStackSource = 'execute' | 'undo' | 'redo' | 'reset';

/** Listener invoked after every model change on the stack. */
export type BpmnCommandStackListener = (
  model: BpmnDiagram,
  source: BpmnCommandStackSource,
) => void;

/**
 * Snapshot-based undo/redo stack over the immutable diagram model. Commands that return the
 * same model reference are treated as no-ops and never pushed; dirtiness is tracked against a
 * save-point reference so undoing back to the saved model reports a clean state.
 */
export class BpmnCommandStack {
  private readonly past: BpmnDiagram[] = [];
  private readonly future: BpmnDiagram[] = [];
  private readonly listeners = new Set<BpmnCommandStackListener>();
  private readonly limit: number;
  private currentModel: BpmnDiagram;
  private savedRef: BpmnDiagram;

  constructor(initial: BpmnDiagram, limit = 100) {
    this.currentModel = initial;
    this.savedRef = initial;
    this.limit = limit;
  }

  /** The current diagram model. */
  get current(): BpmnDiagram {
    return this.currentModel;
  }

  /** True when at least one executed command can be undone. */
  get canUndo(): boolean {
    return this.past.length > 0;
  }

  /** True when at least one undone command can be redone. */
  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** True when the current model differs from the last save point by reference. */
  get isDirty(): boolean {
    return this.currentModel !== this.savedRef;
  }

  /** Applies the command; no-op commands (same reference returned) are not pushed. */
  execute(command: BpmnCommand): BpmnDiagram {
    const next = command.apply(this.currentModel);
    if (next === this.currentModel) {
      return next;
    }
    this.past.push(this.currentModel);
    if (this.past.length > this.limit) {
      this.past.shift();
    }
    this.future.length = 0;
    this.currentModel = next;
    this.notify('execute');
    return next;
  }

  /** Restores the previous model, or returns null when there is nothing to undo. */
  undo(): BpmnDiagram | null {
    const previous = this.past.pop();
    if (previous === undefined) {
      return null;
    }
    this.future.push(this.currentModel);
    this.currentModel = previous;
    this.notify('undo');
    return previous;
  }

  /** Re-applies the most recently undone model, or returns null when there is nothing to redo. */
  redo(): BpmnDiagram | null {
    const next = this.future.pop();
    if (next === undefined) {
      return null;
    }
    this.past.push(this.currentModel);
    this.currentModel = next;
    this.notify('redo');
    return next;
  }

  /** Marks the current model as the save point; the stack reports clean until it changes. */
  markSaved(): void {
    this.savedRef = this.currentModel;
  }

  /** Replaces the model and clears history and the save point, notifying with source `reset`. */
  reset(model: BpmnDiagram): void {
    this.past.length = 0;
    this.future.length = 0;
    this.currentModel = model;
    this.savedRef = model;
    this.notify('reset');
  }

  /** Registers a change listener and returns its unsubscribe function. */
  onChange(listener: BpmnCommandStackListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(source: BpmnCommandStackSource): void {
    for (const listener of this.listeners) {
      listener(this.currentModel, source);
    }
  }
}
