import type { RowKey } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';

export type OgeEditMode = 'cell' | 'row' | 'batch' | 'popup' | 'form';

/** One entry of `formItems`: which field the form/popup editor shows, and how. */
export interface OgeEditFormItem {
  field: string;
  /** Override the label (defaults to the column caption). */
  label?: string;
  /** Form-layout columns this editor spans. Default 1. */
  colSpan?: number;
}

export interface OgeEditingOptions {
  mode: OgeEditMode;
  allowUpdating?: boolean;
  allowAdding?: boolean;
  allowDeleting?: boolean;
  /** Ask for confirmation (native dialog) before a non-batch delete. */
  confirmDelete?: boolean;
  /**
   * Fields shown by the `form` and `popup` editors — selection, order,
   * labels and column spans. Default: every editable column.
   */
  formItems?: readonly (string | OgeEditFormItem)[];
  /** Fixed number of form-layout columns; default: responsive auto-fit. */
  formColCount?: number;
}

/** The open editor, or `null`. */
export interface OgeEditingCell {
  readonly key: RowKey;
  readonly field: string;
}

/**
 * Editing state: which editor is open plus the pending (batch) change set.
 * Pending changes are UI state — they reach the DataSource only on save.
 *
 * Framework-free (ADR 0001): the cells come from the caller's
 * {@link OgeReactivityAdapter}, so the grid's editing semantics are one
 * implementation for both render layers.
 */
export class OgeGridEditingState {
  /** Active single-cell editor (cell/batch modes). */
  readonly editCell: () => OgeEditingCell | null;
  /** Row in full edit (row/popup modes). */
  readonly editRowKey: () => RowKey | null;
  /** Pending field changes per row key. */
  readonly changes: () => ReadonlyMap<
    RowKey,
    Readonly<Record<string, unknown>>
  >;
  /** Rows marked for deletion (batch). */
  readonly removed: () => ReadonlySet<RowKey>;
  /** Newly added (unsaved) rows, rendered on top. */
  readonly added: () => readonly RowKey[];
  readonly hasPending: () => boolean;

  private readonly _editCell: OgeReactiveCell<OgeEditingCell | null>;
  private readonly _editRowKey: OgeReactiveCell<RowKey | null>;
  private readonly _changes: OgeReactiveCell<
    ReadonlyMap<RowKey, Readonly<Record<string, unknown>>>
  >;
  private readonly _removed: OgeReactiveCell<ReadonlySet<RowKey>>;
  private readonly _added: OgeReactiveCell<readonly RowKey[]>;

  constructor(rx: OgeReactivityAdapter) {
    this._editCell = rx.cell<OgeEditingCell | null>(null);
    this._editRowKey = rx.cell<RowKey | null>(null);
    this._changes = rx.cell<
      ReadonlyMap<RowKey, Readonly<Record<string, unknown>>>
    >(new Map());
    this._removed = rx.cell<ReadonlySet<RowKey>>(new Set());
    this._added = rx.cell<readonly RowKey[]>([]);

    this.editCell = () => this._editCell();
    this.editRowKey = () => this._editRowKey();
    this.changes = () => this._changes();
    this.removed = () => this._removed();
    this.added = () => this._added();

    this.hasPending = rx.derived(
      () =>
        this._changes().size > 0 ||
        this._removed().size > 0 ||
        this._added().length > 0,
    );
  }

  startCell(key: RowKey, field: string): void {
    this._editCell.set({ key, field });
    this._editRowKey.set(null);
  }

  startRow(key: RowKey): void {
    this._editRowKey.set(key);
    this._editCell.set(null);
  }

  stopEditor(): void {
    this._editCell.set(null);
    this._editRowKey.set(null);
  }

  isCellEditing(key: RowKey, field: string): boolean {
    const cell = this._editCell();
    return cell !== null && cell.key === key && cell.field === field;
  }

  setChange(key: RowKey, field: string, value: unknown): void {
    const next = new Map(this._changes());
    next.set(key, { ...(next.get(key) ?? {}), [field]: value });
    this._changes.set(next);
  }

  setRowChanges(key: RowKey, values: Record<string, unknown>): void {
    const next = new Map(this._changes());
    next.set(key, { ...(next.get(key) ?? {}), ...values });
    this._changes.set(next);
  }

  changeFor(key: RowKey, field: string): unknown {
    const change = this._changes().get(key);
    return change && field in change ? change[field] : undefined;
  }

  hasChange(key: RowKey, field: string): boolean {
    const change = this._changes().get(key);
    return change !== undefined && field in change;
  }

  discardRow(key: RowKey): void {
    const next = new Map(this._changes());
    if (next.delete(key)) this._changes.set(next);
  }

  toggleRemoved(key: RowKey): void {
    const next = new Set(this._removed());
    if (!next.delete(key)) next.add(key);
    this._removed.set(next);
  }

  isRemoved(key: RowKey): boolean {
    return this._removed().has(key);
  }

  addRow(key: RowKey): void {
    this._added.set([key, ...this._added()]);
  }

  isAdded(key: RowKey): boolean {
    return this._added().includes(key);
  }

  dropAdded(key: RowKey): void {
    this._added.set(this._added().filter((candidate) => candidate !== key));
    this.discardRow(key);
  }

  clearPending(): void {
    this._changes.set(new Map());
    this._removed.set(new Set());
    this._added.set([]);
    this.stopEditor();
  }
}
