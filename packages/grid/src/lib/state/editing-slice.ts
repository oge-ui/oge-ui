import { computed, signal } from '@angular/core';
import type { RowKey } from '@oge-ui/core';

export type OgeEditMode = 'cell' | 'row' | 'batch' | 'popup';

export interface OgeEditingOptions {
  mode: OgeEditMode;
  allowUpdating?: boolean;
  allowAdding?: boolean;
  allowDeleting?: boolean;
  /** Ask for confirmation (native dialog) before a non-batch delete. */
  confirmDelete?: boolean;
}

/**
 * Editing state slice: which editor is open plus the pending (batch) change
 * set. Pending changes are UI state — they reach the DataSource only on save.
 */
export class EditingSlice {
  /** Active single-cell editor (cell/batch modes). */
  private readonly _editCell = signal<{ key: RowKey; field: string } | null>(null);
  /** Row in full edit (row/popup modes). */
  private readonly _editRowKey = signal<RowKey | null>(null);
  /** Pending field changes per row key. */
  private readonly _changes = signal<ReadonlyMap<RowKey, Readonly<Record<string, unknown>>>>(
    new Map()
  );
  /** Rows marked for deletion (batch). */
  private readonly _removed = signal<ReadonlySet<RowKey>>(new Set());
  /** Newly added (unsaved) rows, rendered on top. */
  private readonly _added = signal<readonly RowKey[]>([]);

  readonly editCell = this._editCell.asReadonly();
  readonly editRowKey = this._editRowKey.asReadonly();
  readonly changes = this._changes.asReadonly();
  readonly removed = this._removed.asReadonly();
  readonly added = this._added.asReadonly();

  readonly hasPending = computed(
    () => this._changes().size > 0 || this._removed().size > 0 || this._added().length > 0
  );

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
