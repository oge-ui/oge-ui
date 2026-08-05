import { computed, untracked, type Signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import type { DataRowNode, DataSource, RowKey, RowNode } from '@oge-ui/core';
import {
  mapLookupItems,
  type ColumnSource,
  type LookupItem,
  type ResolvedColumn,
} from './column-model';
import type { EditingSlice, OgeEditingOptions } from './editing-slice';

export interface OgeDataChange<T = unknown> {
  type: 'insert' | 'update' | 'remove';
  key: RowKey;
  data?: Record<string, unknown> & Partial<T>;
}

/** Cancelable; set `cancel = true` in the handler to abort the save. */
export interface OgeSavingChangesEvent<T = unknown> {
  changes: OgeDataChange<T>[];
  cancel: boolean;
}

export interface EditingModelDeps<T, S extends ColumnSource<T> = ColumnSource<T>> {
  /** The host's `editing` input: `false` disables editing entirely. */
  editing: Signal<false | OgeEditingOptions>;
  /** Editing state slice: which editor is open plus the pending change set. */
  slice: EditingSlice;
  /** Resolved columns — editors, validators and lookups are derived from them. */
  columns: Signal<readonly ResolvedColumn<T, S>[]>;
  /** Flat row list (unsaved added rows already rendered on top). */
  flatNodes: Signal<readonly RowNode<T>[]>;
  /** Save target; changes are applied one by one via update/insert/remove. */
  source: Signal<DataSource<T> | null>;
  /** Prompt text for the native confirm dialog on non-batch deletes. */
  confirmDeleteMessage: Signal<string>;
  events: {
    /** Fires before changes reach the DataSource; cancelable via the event. */
    savingChanges(event: OgeSavingChangesEvent<T>): void;
  };
  /** Re-runs the current load after a save reached the DataSource. */
  reload(): void;
}

/**
 * Editing engine shared by grid-like components: derives mode and permissions
 * from the editing options, builds the reactive `FormControl`s for the open
 * editor(s), answers the dirty/removed/added row queries, and drives the
 * commit/cancel/save flows — batch changes accumulate in the editing slice
 * and reach the DataSource only through `runSave`. Hosted as a plain field by
 * the component (slice pattern — no DI).
 */
export class EditingModel<T = unknown, S extends ColumnSource<T> = ColumnSource<T>> {
  constructor(private readonly deps: EditingModelDeps<T, S>) {}

  readonly editingOptions = computed<OgeEditingOptions | null>(() => {
    const value = this.deps.editing();
    return value === false ? null : value;
  });

  readonly editMode = computed(() => this.editingOptions()?.mode ?? null);
  readonly canUpdate = computed(
    () => !!this.editingOptions() && this.editingOptions()?.allowUpdating !== false
  );
  readonly canDelete = computed(() => !!this.editingOptions()?.allowDeleting);
  readonly canAdd = computed(() => !!this.editingOptions()?.allowAdding);

  private newRowCounter = 0;

  /** The flat data node carrying `key`, if it is currently rendered. */
  private dataNodeOf(key: RowKey): DataRowNode<T> | undefined {
    return this.deps
      .flatNodes()
      .find(
        (candidate): candidate is DataRowNode<T> => candidate.kind === 'data' && candidate.key === key
      );
  }

  /** Row data with pending edits applied (batch dirty view). */
  displayValue(node: DataRowNode<T>, column: ResolvedColumn<T, S>): unknown {
    const field = column.field;
    if (field && this.deps.slice.hasChange(node.key, field)) {
      return this.deps.slice.changeFor(node.key, field);
    }
    return column.accessor(node.data);
  }

  isCellDirty(node: DataRowNode<T>, column: ResolvedColumn<T, S>): boolean {
    return (
      this.editMode() === 'batch' &&
      column.field != null &&
      this.deps.slice.hasChange(node.key, column.field)
    );
  }

  isRowEditing(key: RowKey): boolean {
    const mode = this.editMode();
    return (mode === 'row' || mode === 'form') && this.deps.slice.editRowKey() === key;
  }

  /** Form mode: the row whose cells are replaced by the inline form. */
  isFormRow(key: RowKey): boolean {
    return this.editMode() === 'form' && this.deps.slice.editRowKey() === key;
  }

  isCellEditorOpen(node: DataRowNode<T>, column: ResolvedColumn<T, S>): boolean {
    if (!column.editable || !column.field || !this.canUpdate()) return false;
    const mode = this.editMode();
    if (mode === 'cell' || mode === 'batch') {
      return this.deps.slice.isCellEditing(node.key, column.field);
    }
    return mode === 'row' && this.deps.slice.editRowKey() === node.key;
  }

  /** Reactive controls for the active editor(s), keyed `key::field`. */
  readonly activeControls = computed<ReadonlyMap<string, FormControl<unknown>>>(() => {
    const map = new Map<string, FormControl<unknown>>();
    const mode = this.editMode();
    if (!mode) return map;
    const cell = this.deps.slice.editCell();
    const rowKey = this.deps.slice.editRowKey();
    const targetKey = cell?.key ?? rowKey;
    if (targetKey === null || targetKey === undefined) return map;
    const node = this.dataNodeOf(targetKey);
    if (!node) return map;
    for (const column of this.deps.columns()) {
      const field = column.field;
      if (!field || !column.editable) continue;
      if (cell && field !== cell.field) continue;
      const validators = [...(column.source?.validators() ?? [])];
      if (column.source?.required()) validators.push(Validators.required);
      map.set(
        `${String(targetKey)}::${field}`,
        new FormControl<unknown>(untracked(() => this.displayValue(node, column)), {
          validators,
        })
      );
    }
    return map;
  });

  editControl(node: DataRowNode<T>, column: ResolvedColumn<T, S>): FormControl<unknown> {
    return this.activeControls().get(`${String(node.key)}::${column.field}`) as FormControl<unknown>;
  }

  /** Row merged with its open editors' current values (cascading lookups). */
  private draftRowOf(node: DataRowNode<T>): T {
    const prefix = `${String(node.key)}::`;
    const draft: Record<string, unknown> = { ...(node.data as Record<string, unknown>) };
    for (const [mapKey, control] of untracked(this.activeControls)) {
      if (mapKey.startsWith(prefix)) draft[mapKey.slice(prefix.length)] = control.value;
    }
    return draft as T;
  }

  /** Editor option list — cascading (function) lookups see the row's draft. */
  lookupItemsFor(
    node: DataRowNode<T>,
    column: ResolvedColumn<T, S>
  ): readonly LookupItem[] | undefined {
    const lookup = column.lookup;
    if (lookup && typeof lookup.dataSource === 'function') {
      return mapLookupItems(
        (lookup.dataSource as (row: T) => readonly unknown[])(this.draftRowOf(node)),
        lookup
      );
    }
    return column.lookupItems;
  }

  private editorValue(control: FormControl<unknown>, column: ResolvedColumn<T, S>): unknown {
    const value = control.value;
    if (column.lookupItems) {
      const match = column.lookupItems.find((item) => String(item.value) === String(value));
      return match ? match.value : value;
    }
    if (column.dataType === 'number' && value !== null && value !== '' && value !== undefined) {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  }

  /** Commits the single-cell editor (cell → save, batch → pending change). */
  commitActiveCell(): void {
    const cell = this.deps.slice.editCell();
    if (!cell) return;
    const column = this.deps.columns().find((candidate) => candidate.field === cell.field);
    const control = this.activeControls().get(`${String(cell.key)}::${cell.field}`);
    if (!column || !control) return;
    if (control.invalid) {
      control.markAsTouched();
      return;
    }
    const node = this.dataNodeOf(cell.key);
    const value = this.editorValue(control, column);
    const original = node ? column.accessor(node.data) : undefined;
    if (this.editMode() === 'batch') {
      if (value !== original || this.deps.slice.isAdded(cell.key)) {
        this.deps.slice.setChange(cell.key, cell.field, value);
      }
      this.deps.slice.stopEditor();
      return;
    }
    // cell mode: immediate write-back
    if (value === original) {
      this.deps.slice.stopEditor();
      return;
    }
    void this.runSave([
      { type: 'update', key: cell.key, data: { [cell.field]: value } as OgeDataChange<T>['data'] },
    ]);
  }

  cancelActiveEditor(): void {
    const rowKey = this.deps.slice.editRowKey();
    if (rowKey !== null && this.deps.slice.isAdded(rowKey)) {
      this.deps.slice.dropAdded(rowKey);
    }
    this.deps.slice.stopEditor();
  }

  onEditorBlur(): void {
    const cell = this.deps.slice.editCell();
    if (!cell) return;
    const control = this.activeControls().get(`${String(cell.key)}::${cell.field}`);
    if (control && control.valid) this.commitActiveCell();
  }

  /** Tab inside a cell editor: commit and open the next editable column. */
  commitAndNext(node: DataRowNode<T>, column: ResolvedColumn<T, S>, event: Event): void {
    const mode = this.editMode();
    if (mode !== 'cell' && mode !== 'batch') return;
    event.preventDefault();
    this.commitActiveCell();
    const columns = this.deps.columns();
    const from = columns.findIndex((candidate) => candidate.id === column.id);
    const next = columns.slice(from + 1).find((candidate) => candidate.editable && candidate.field);
    if (next?.field) this.deps.slice.startCell(node.key, next.field);
  }

  startRowEdit(node: DataRowNode<T>, event?: Event): void {
    event?.stopPropagation();
    this.deps.slice.startRow(node.key);
  }

  /** Saves the row editor (row + popup modes). */
  commitActiveRow(): void {
    const rowKey = this.deps.slice.editRowKey();
    if (rowKey === null) return;
    const node = this.dataNodeOf(rowKey);
    if (!node) return;
    const controls = this.activeControls();
    const data: Record<string, unknown> = {};
    let invalid = false;
    for (const column of this.deps.columns()) {
      const field = column.field;
      if (!field || !column.editable) continue;
      const control = controls.get(`${String(rowKey)}::${field}`);
      if (!control) continue;
      if (control.invalid) {
        control.markAsTouched();
        invalid = true;
        continue;
      }
      const value = this.editorValue(control, column);
      if (value !== column.accessor(node.data) || this.deps.slice.isAdded(rowKey)) {
        data[field] = value;
      }
    }
    if (invalid) return;
    if (!Object.keys(data).length) {
      this.deps.slice.stopEditor();
      return;
    }
    const type = this.deps.slice.isAdded(rowKey) ? 'insert' : 'update';
    void this.runSave([{ type, key: rowKey, data: data as OgeDataChange<T>['data'] }]);
  }

  deleteRow(node: DataRowNode<T>, event?: Event): void {
    event?.stopPropagation();
    if (this.deps.slice.isAdded(node.key)) {
      this.deps.slice.dropAdded(node.key);
      return;
    }
    if (this.editMode() === 'batch') {
      this.deps.slice.toggleRemoved(node.key);
      return;
    }
    const editing = this.deps.editing();
    if (
      editing &&
      editing.confirmDelete &&
      typeof confirm === 'function' &&
      !confirm(untracked(this.deps.confirmDeleteMessage))
    ) {
      return;
    }
    void this.runSave([{ type: 'remove', key: node.key }]);
  }

  addNewRow(): void {
    const key = `oge-new-${++this.newRowCounter}`;
    this.deps.slice.addRow(key);
    const mode = this.editMode();
    if (mode === 'row' || mode === 'popup' || mode === 'form' || mode === 'cell') {
      this.deps.slice.startRow(key);
    }
  }

  /** Batch toolbar: save everything pending. */
  saveAllChanges(): void {
    const editing = this.deps.slice;
    const changes: OgeDataChange<T>[] = [];
    for (const key of editing.added()) {
      if (editing.removed().has(key)) continue;
      changes.push({
        type: 'insert',
        key,
        data: (editing.changes().get(key) ?? {}) as OgeDataChange<T>['data'],
      });
    }
    for (const [key, data] of editing.changes()) {
      if (editing.isAdded(key) || editing.removed().has(key)) continue;
      changes.push({ type: 'update', key, data: data as OgeDataChange<T>['data'] });
    }
    for (const key of editing.removed()) {
      if (editing.isAdded(key)) continue;
      changes.push({ type: 'remove', key });
    }
    void this.runSave(changes);
  }

  discardAllChanges(): void {
    this.deps.slice.clearPending();
  }

  private async runSave(changes: OgeDataChange<T>[]): Promise<void> {
    if (!changes.length) {
      this.deps.slice.stopEditor();
      return;
    }
    const event: OgeSavingChangesEvent<T> = { changes, cancel: false };
    this.deps.events.savingChanges(event);
    if (event.cancel) return;
    const source = this.deps.source();
    try {
      for (const change of changes) {
        if (change.type === 'update') {
          await source?.update?.(change.key, change.data as Partial<T>);
        } else if (change.type === 'insert') {
          await source?.insert?.(change.data as T);
        } else {
          await source?.remove?.(change.key);
        }
      }
    } finally {
      this.deps.slice.clearPending();
      this.deps.reload();
    }
  }
}
