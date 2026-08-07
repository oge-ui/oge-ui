import { computed, untracked, type Signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import {
  serializeLikeOriginal,
  type DataRowNode,
  type DataSource,
  type RowKey,
  type RowNode,
} from '@oge-ui/core';
import {
  mapLookupItems,
  type ColumnSource,
  type LookupItem,
  type ResolvedColumn,
} from './column-model';
import type { OgeEditingSlice, OgeEditingOptions } from './editing-slice';

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

/** Fires after every change of a save batch reached the DataSource. */
export interface OgeSavedChangesEvent<T = unknown> {
  changes: OgeDataChange<T>[];
}

/** Cancelable: fires before a cell or row editor opens. */
export interface OgeEditingStartEvent<T = unknown> {
  key: RowKey;
  row: T | undefined;
  /** Field of the cell editor; `undefined` for whole-row editing. */
  field?: string;
  cancel: boolean;
}

/** Cancelable: fires before a new row is inserted into the DataSource. */
export interface OgeRowInsertingEvent {
  key: RowKey;
  values: Record<string, unknown>;
  cancel: boolean;
}

/** Fires after a new row was inserted into the DataSource. */
export interface OgeRowInsertedEvent {
  key: RowKey;
  values: Record<string, unknown>;
}

/** Cancelable: fires before a row update reaches the DataSource. */
export interface OgeRowUpdatingEvent<T = unknown> {
  key: RowKey;
  /** The row as currently loaded, before the update. */
  row: T | undefined;
  values: Record<string, unknown>;
  cancel: boolean;
}

/** Fires after a row was updated in the DataSource. */
export interface OgeRowUpdatedEvent {
  key: RowKey;
  values: Record<string, unknown>;
}

/** Cancelable: fires before a row is removed from the DataSource. */
export interface OgeRowRemovingEvent<T = unknown> {
  key: RowKey;
  row: T | undefined;
  cancel: boolean;
}

/** Fires after a row was removed from the DataSource. */
export interface OgeRowRemovedEvent {
  key: RowKey;
}

export interface EditingModelDeps<
  T,
  S extends ColumnSource<T> = ColumnSource<T>,
> {
  /** The host's `editing` input: `false` disables editing entirely. */
  editing: Signal<false | OgeEditingOptions>;
  /** Editing state slice: which editor is open plus the pending change set. */
  slice: OgeEditingSlice;
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
    /** Fires after a save batch was applied (only the non-canceled changes). */
    savedChanges?(event: OgeSavedChangesEvent<T>): void;
    /** Cancelable: fires before a row editor opens (`startRowEdit`). */
    editingStart?(event: OgeEditingStartEvent<T>): void;
    rowInserting?(event: OgeRowInsertingEvent): void;
    rowInserted?(event: OgeRowInsertedEvent): void;
    rowUpdating?(event: OgeRowUpdatingEvent<T>): void;
    rowUpdated?(event: OgeRowUpdatedEvent): void;
    rowRemoving?(event: OgeRowRemovingEvent<T>): void;
    rowRemoved?(event: OgeRowRemovedEvent): void;
    /** Fires after an edit session ended without saving. */
    editCanceled?(): void;
    /** A DataSource write failed while applying a save batch. */
    dataError?(error: unknown): void;
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
export class EditingModel<
  T = unknown,
  S extends ColumnSource<T> = ColumnSource<T>,
> {
  constructor(private readonly deps: EditingModelDeps<T, S>) {}

  readonly editingOptions = computed<OgeEditingOptions | null>(() => {
    const value = this.deps.editing();
    return value === false ? null : value;
  });

  readonly editMode = computed(() => this.editingOptions()?.mode ?? null);
  readonly canUpdate = computed(
    () =>
      !!this.editingOptions() && this.editingOptions()?.allowUpdating !== false,
  );
  readonly canDelete = computed(() => !!this.editingOptions()?.allowDeleting);
  readonly canAdd = computed(() => !!this.editingOptions()?.allowAdding);

  private newRowCounter = 0;

  /** The flat data node carrying `key`, if it is currently rendered. */
  private dataNodeOf(key: RowKey): DataRowNode<T> | undefined {
    return this.deps
      .flatNodes()
      .find(
        (candidate): candidate is DataRowNode<T> =>
          candidate.kind === 'data' && candidate.key === key,
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
    return (
      (mode === 'row' || mode === 'form') &&
      this.deps.slice.editRowKey() === key
    );
  }

  /** Form mode: the row whose cells are replaced by the inline form. */
  isFormRow(key: RowKey): boolean {
    return this.editMode() === 'form' && this.deps.slice.editRowKey() === key;
  }

  isCellEditorOpen(
    node: DataRowNode<T>,
    column: ResolvedColumn<T, S>,
  ): boolean {
    if (!column.editable || !column.field || !this.canUpdate()) return false;
    const mode = this.editMode();
    if (mode === 'cell' || mode === 'batch') {
      return this.deps.slice.isCellEditing(node.key, column.field);
    }
    return mode === 'row' && this.deps.slice.editRowKey() === node.key;
  }

  /** Reactive controls for the active editor(s), keyed `key::field`. */
  readonly activeControls = computed<ReadonlyMap<string, FormControl<unknown>>>(
    () => {
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
          new FormControl<unknown>(
            untracked(() => this.displayValue(node, column)),
            {
              validators,
            },
          ),
        );
      }
      return map;
    },
  );

  editControl(
    node: DataRowNode<T>,
    column: ResolvedColumn<T, S>,
  ): FormControl<unknown> {
    return this.activeControls().get(
      `${String(node.key)}::${column.field}`,
    ) as FormControl<unknown>;
  }

  /** Row merged with its open editors' current values (cascading lookups). */
  private draftRowOf(node: DataRowNode<T>): T {
    const prefix = `${String(node.key)}::`;
    const draft: Record<string, unknown> = {
      ...(node.data as Record<string, unknown>),
    };
    for (const [mapKey, control] of untracked(this.activeControls)) {
      if (mapKey.startsWith(prefix))
        draft[mapKey.slice(prefix.length)] = control.value;
    }
    return draft as T;
  }

  /** Editor option list — cascading (function) lookups see the row's draft. */
  lookupItemsFor(
    node: DataRowNode<T>,
    column: ResolvedColumn<T, S>,
  ): readonly LookupItem[] | undefined {
    const lookup = column.lookup;
    if (lookup && typeof lookup.dataSource === 'function') {
      return mapLookupItems(
        (lookup.dataSource as (row: T) => readonly unknown[])(
          this.draftRowOf(node),
        ),
        lookup,
      );
    }
    return column.lookupItems;
  }

  private editorValue(
    control: FormControl<unknown>,
    column: ResolvedColumn<T, S>,
    original?: unknown,
  ): unknown {
    const value = control.value;
    if (column.lookupItems) {
      const match = column.lookupItems.find(
        (item) => String(item.value) === String(value),
      );
      return match ? match.value : value;
    }
    if (
      column.dataType === 'number' &&
      value !== null &&
      value !== '' &&
      value !== undefined
    ) {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    }
    if (
      column.dataType === 'date' &&
      (value instanceof Date || value === null)
    ) {
      // the date box edits real Dates — write back in the row's storage shape
      return serializeLikeOriginal(value, original);
    }
    return value;
  }

  /** Commits the single-cell editor (cell → save, batch → pending change). */
  commitActiveCell(): void {
    const cell = this.deps.slice.editCell();
    if (!cell) return;
    const column = this.deps
      .columns()
      .find((candidate) => candidate.field === cell.field);
    const control = this.activeControls().get(
      `${String(cell.key)}::${cell.field}`,
    );
    if (!column || !control) return;
    if (control.invalid) {
      control.markAsTouched();
      return;
    }
    const node = this.dataNodeOf(cell.key);
    const original = node ? column.accessor(node.data) : undefined;
    const value = this.editorValue(control, column, original);
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
      {
        type: 'update',
        key: cell.key,
        data: { [cell.field]: value } as OgeDataChange<T>['data'],
      },
    ]);
  }

  cancelActiveEditor(notify = true): void {
    const hadEditor =
      this.deps.slice.editCell() !== null ||
      this.deps.slice.editRowKey() !== null;
    const rowKey = this.deps.slice.editRowKey();
    if (rowKey !== null && this.deps.slice.isAdded(rowKey)) {
      this.deps.slice.dropAdded(rowKey);
    }
    this.deps.slice.stopEditor();
    if (notify && hadEditor) this.deps.events.editCanceled?.();
  }

  /**
   * Discards pending changes and closes any open editor, emitting
   * `editCanceled` at most once — the imperative `discardChanges()` backend.
   */
  cancelEditing(): void {
    const slice = this.deps.slice;
    const hadWork =
      untracked(slice.hasPending) ||
      slice.editCell() !== null ||
      slice.editRowKey() !== null;
    this.cancelActiveEditor(false);
    this.discardAllChanges(false);
    if (hadWork) this.deps.events.editCanceled?.();
  }

  onEditorBlur(): void {
    const cell = this.deps.slice.editCell();
    if (!cell) return;
    const control = this.activeControls().get(
      `${String(cell.key)}::${cell.field}`,
    );
    if (control && control.valid) this.commitActiveCell();
  }

  /** Tab inside a cell editor: commit and open the next editable column. */
  commitAndNext(
    node: DataRowNode<T>,
    column: ResolvedColumn<T, S>,
    event: Event,
  ): void {
    const mode = this.editMode();
    if (mode !== 'cell' && mode !== 'batch') return;
    event.preventDefault();
    this.commitActiveCell();
    const columns = this.deps.columns();
    const from = columns.findIndex((candidate) => candidate.id === column.id);
    const next = columns
      .slice(from + 1)
      .find((candidate) => candidate.editable && candidate.field);
    if (next?.field) this.deps.slice.startCell(node.key, next.field);
  }

  startRowEdit(node: DataRowNode<T>, event?: Event): void {
    event?.stopPropagation();
    if (!this.notifyEditingStart(node.key, node.data)) return;
    this.deps.slice.startRow(node.key);
  }

  /** Emits the cancelable `editingStart` event; `false` when canceled. */
  notifyEditingStart(key: RowKey, row: T | undefined, field?: string): boolean {
    const event: OgeEditingStartEvent<T> = { key, row, field, cancel: false };
    this.deps.events.editingStart?.(event);
    return !event.cancel;
  }

  /** Saves the row editor (row + popup modes). */
  commitActiveRow(): void {
    const rowKey = this.deps.slice.editRowKey();
    if (rowKey === null) return;
    const node = this.dataNodeOf(rowKey);
    if (!node) return;
    const controls = this.activeControls();
    // added rows keep host-staged fields (e.g. a tree parent reference) that
    // have no editor column — control values overlay them below
    const data: Record<string, unknown> = this.deps.slice.isAdded(rowKey)
      ? { ...this.deps.slice.changes().get(rowKey) }
      : {};
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
      const original = column.accessor(node.data);
      const value = this.editorValue(control, column, original);
      if (value !== original || this.deps.slice.isAdded(rowKey)) {
        data[field] = value;
      }
    }
    if (invalid) return;
    if (!Object.keys(data).length) {
      this.deps.slice.stopEditor();
      return;
    }
    const type = this.deps.slice.isAdded(rowKey) ? 'insert' : 'update';
    void this.runSave([
      { type, key: rowKey, data: data as OgeDataChange<T>['data'] },
    ]);
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
    if (
      mode === 'row' ||
      mode === 'popup' ||
      mode === 'form' ||
      mode === 'cell'
    ) {
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
      changes.push({
        type: 'update',
        key,
        data: data as OgeDataChange<T>['data'],
      });
    }
    for (const key of editing.removed()) {
      if (editing.isAdded(key)) continue;
      changes.push({ type: 'remove', key });
    }
    void this.runSave(changes);
  }

  discardAllChanges(notify = true): void {
    const hadPending = untracked(this.deps.slice.hasPending);
    this.deps.slice.clearPending();
    if (notify && hadPending) this.deps.events.editCanceled?.();
  }

  /** Emits the cancelable per-change pre event; `false` when canceled. */
  private notifyChangeApplying(change: OgeDataChange<T>): boolean {
    const values = (change.data ?? {}) as Record<string, unknown>;
    if (change.type === 'insert') {
      const event: OgeRowInsertingEvent = {
        key: change.key,
        values,
        cancel: false,
      };
      this.deps.events.rowInserting?.(event);
      return !event.cancel;
    }
    const row = this.dataNodeOf(change.key)?.data;
    if (change.type === 'update') {
      const event: OgeRowUpdatingEvent<T> = {
        key: change.key,
        row,
        values,
        cancel: false,
      };
      this.deps.events.rowUpdating?.(event);
      return !event.cancel;
    }
    const event: OgeRowRemovingEvent<T> = {
      key: change.key,
      row,
      cancel: false,
    };
    this.deps.events.rowRemoving?.(event);
    return !event.cancel;
  }

  private notifyChangeApplied(change: OgeDataChange<T>): void {
    const values = (change.data ?? {}) as Record<string, unknown>;
    if (change.type === 'insert') {
      this.deps.events.rowInserted?.({ key: change.key, values });
    } else if (change.type === 'update') {
      this.deps.events.rowUpdated?.({ key: change.key, values });
    } else {
      this.deps.events.rowRemoved?.({ key: change.key });
    }
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
    const applied: OgeDataChange<T>[] = [];
    try {
      for (const change of changes) {
        // canceled changes are discarded with the rest of the pending set
        if (!this.notifyChangeApplying(change)) continue;
        if (change.type === 'update') {
          await source?.update?.(change.key, change.data as Partial<T>);
        } else if (change.type === 'insert') {
          await source?.insert?.(change.data as T);
        } else {
          await source?.remove?.(change.key);
        }
        this.notifyChangeApplied(change);
        applied.push(change);
      }
    } catch (error) {
      this.deps.events.dataError?.(error);
    } finally {
      this.deps.slice.clearPending();
      this.deps.reload();
    }
    if (applied.length) this.deps.events.savedChanges?.({ changes: applied });
  }
}
