import {
  serializeLikeOriginal,
  type DataRowNode,
  type DataSource,
  type RowKey,
  type RowNode,
} from '@oge-ui/core';
import type { OgeReactivityAdapter } from '../reactivity';
import {
  mapLookupItems,
  type LookupItem,
  type OgeGridResolvedColumn,
} from './grid-columns';
import type {
  OgeEditingOptions,
  OgeGridEditingState,
} from './grid-editing-state';

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

/** What an open editor reports back — the one thing each layer owns itself. */
export interface OgeGridEditorState {
  value: unknown;
  invalid: boolean;
}

/**
 * The seam between the shared editing pipeline and the render layer's own
 * editor controls.
 *
 * Everything about *when* to commit, what a change set contains and how it
 * reaches the DataSource is shared; the controls themselves are not — Angular
 * builds `FormControl`s with its validators, React holds the draft in state.
 * Three questions are all the pipeline needs to ask them.
 */
export interface OgeGridEditorBridge {
  /** The open editor for a cell, or `undefined` when it has none. */
  editorState(key: RowKey, field: string): OgeGridEditorState | undefined;
  /** Reveals an invalid editor's error (Angular: `markAsTouched`). */
  markTouched(key: RowKey, field: string): void;
  /** Current values of every open editor of one row, by field. */
  rowValues(key: RowKey): ReadonlyMap<string, unknown>;
}

export interface OgeGridEditingCoreDeps<T, TSlot = unknown, S = unknown> {
  /** The host's `editing` input: `false` disables editing entirely. */
  editing: () => false | OgeEditingOptions;
  /** Editing state: which editor is open plus the pending change set. */
  state: OgeGridEditingState;
  /** Resolved columns — editors, validators and lookups are derived from them. */
  columns: () => readonly OgeGridResolvedColumn<T, TSlot, S>[];
  /** Flat row list (unsaved added rows already rendered on top). */
  flatNodes: () => readonly RowNode<T>[];
  /** Save target; changes are applied one by one via update/insert/remove. */
  source: () => DataSource<T> | null;
  /** Prompt text for the native confirm dialog on non-batch deletes. */
  confirmDeleteMessage: () => string;
  /** The render layer's editor controls. */
  editors: OgeGridEditorBridge;
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
 * from the editing options, answers the dirty/removed/added row queries, and
 * drives the commit/cancel/save flows — batch changes accumulate in the
 * editing state and reach the DataSource only through the save pipeline.
 *
 * Framework-free (ADR 0001). The editor *controls* are the one part that
 * cannot be shared, so they arrive through {@link OgeGridEditorBridge}: this
 * class never sees a `FormControl` or a React state setter, only the value,
 * the validity and a way to reveal an error.
 */
export class OgeGridEditingCore<T = unknown, TSlot = unknown, S = unknown> {
  readonly editingOptions: () => OgeEditingOptions | null;
  readonly editMode: () => OgeEditingOptions['mode'] | null;
  readonly canUpdate: () => boolean;
  readonly canDelete: () => boolean;
  readonly canAdd: () => boolean;

  private newRowCounter = 0;

  constructor(
    protected readonly deps: OgeGridEditingCoreDeps<T, TSlot, S>,
    rx: OgeReactivityAdapter,
  ) {
    this.editingOptions = rx.derived<OgeEditingOptions | null>(() => {
      const value = this.deps.editing();
      return value === false ? null : value;
    });
    this.editMode = rx.derived(() => this.editingOptions()?.mode ?? null);
    this.canUpdate = rx.derived(
      () =>
        !!this.editingOptions() &&
        this.editingOptions()?.allowUpdating !== false,
    );
    this.canDelete = rx.derived(() => !!this.editingOptions()?.allowDeleting);
    this.canAdd = rx.derived(() => !!this.editingOptions()?.allowAdding);
  }

  /** The flat data node carrying `key`, if it is currently rendered. */
  protected dataNodeOf(key: RowKey): DataRowNode<T> | undefined {
    return this.deps
      .flatNodes()
      .find(
        (candidate): candidate is DataRowNode<T> =>
          candidate.kind === 'data' && candidate.key === key,
      );
  }

  /** Row data with pending edits applied (batch dirty view). */
  displayValue(
    node: DataRowNode<T>,
    column: OgeGridResolvedColumn<T, TSlot, S>,
  ): unknown {
    const field = column.field;
    if (field && this.deps.state.hasChange(node.key, field)) {
      return this.deps.state.changeFor(node.key, field);
    }
    return column.accessor(node.data);
  }

  isCellDirty(
    node: DataRowNode<T>,
    column: OgeGridResolvedColumn<T, TSlot, S>,
  ): boolean {
    return (
      this.editMode() === 'batch' &&
      column.field != null &&
      this.deps.state.hasChange(node.key, column.field)
    );
  }

  isRowEditing(key: RowKey): boolean {
    const mode = this.editMode();
    return (
      (mode === 'row' || mode === 'form') &&
      this.deps.state.editRowKey() === key
    );
  }

  /** Form mode: the row whose cells are replaced by the inline form. */
  isFormRow(key: RowKey): boolean {
    return this.editMode() === 'form' && this.deps.state.editRowKey() === key;
  }

  isCellEditorOpen(
    node: DataRowNode<T>,
    column: OgeGridResolvedColumn<T, TSlot, S>,
  ): boolean {
    if (!column.editable || !column.field || !this.canUpdate()) return false;
    const mode = this.editMode();
    if (mode === 'cell' || mode === 'batch') {
      return this.deps.state.isCellEditing(node.key, column.field);
    }
    return mode === 'row' && this.deps.state.editRowKey() === node.key;
  }

  /** Row merged with its open editors' current values (cascading lookups). */
  protected draftRowOf(node: DataRowNode<T>): T {
    const draft: Record<string, unknown> = {
      ...(node.data as Record<string, unknown>),
    };
    for (const [field, value] of this.deps.editors.rowValues(node.key)) {
      draft[field] = value;
    }
    return draft as T;
  }

  /** Editor option list — cascading (function) lookups see the row's draft. */
  lookupItemsFor(
    node: DataRowNode<T>,
    column: OgeGridResolvedColumn<T, TSlot, S>,
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

  /** Coerces a raw editor value into the shape the row stores. */
  protected editorValue(
    raw: unknown,
    column: OgeGridResolvedColumn<T, TSlot, S>,
    original?: unknown,
  ): unknown {
    const value = raw;
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
    const cell = this.deps.state.editCell();
    if (!cell) return;
    const column = this.deps
      .columns()
      .find((candidate) => candidate.field === cell.field);
    const editor = this.deps.editors.editorState(cell.key, cell.field);
    if (!column || !editor) return;
    if (editor.invalid) {
      this.deps.editors.markTouched(cell.key, cell.field);
      return;
    }
    const node = this.dataNodeOf(cell.key);
    const original = node ? column.accessor(node.data) : undefined;
    const value = this.editorValue(editor.value, column, original);
    if (this.editMode() === 'batch') {
      if (value !== original || this.deps.state.isAdded(cell.key)) {
        this.deps.state.setChange(cell.key, cell.field, value);
      }
      this.deps.state.stopEditor();
      return;
    }
    // cell mode: immediate write-back
    if (value === original) {
      this.deps.state.stopEditor();
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
      this.deps.state.editCell() !== null ||
      this.deps.state.editRowKey() !== null;
    const rowKey = this.deps.state.editRowKey();
    if (rowKey !== null && this.deps.state.isAdded(rowKey)) {
      this.deps.state.dropAdded(rowKey);
    }
    this.deps.state.stopEditor();
    if (notify && hadEditor) this.deps.events.editCanceled?.();
  }

  /**
   * Discards pending changes and closes any open editor, emitting
   * `editCanceled` at most once — the imperative `discardChanges()` backend.
   */
  cancelEditing(): void {
    const state = this.deps.state;
    const hadWork =
      state.hasPending() ||
      state.editCell() !== null ||
      state.editRowKey() !== null;
    this.cancelActiveEditor(false);
    this.discardAllChanges(false);
    if (hadWork) this.deps.events.editCanceled?.();
  }

  onEditorBlur(): void {
    const cell = this.deps.state.editCell();
    if (!cell) return;
    const editor = this.deps.editors.editorState(cell.key, cell.field);
    if (editor && !editor.invalid) this.commitActiveCell();
  }

  /** Tab inside a cell editor: commit and open the next editable column. */
  commitAndNext(
    node: DataRowNode<T>,
    column: OgeGridResolvedColumn<T, TSlot, S>,
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
    if (next?.field) this.deps.state.startCell(node.key, next.field);
  }

  startRowEdit(node: DataRowNode<T>, event?: Event): void {
    event?.stopPropagation();
    if (!this.notifyEditingStart(node.key, node.data)) return;
    this.deps.state.startRow(node.key);
  }

  /** Emits the cancelable `editingStart` event; `false` when canceled. */
  notifyEditingStart(key: RowKey, row: T | undefined, field?: string): boolean {
    const event: OgeEditingStartEvent<T> = { key, row, field, cancel: false };
    this.deps.events.editingStart?.(event);
    return !event.cancel;
  }

  /** Saves the row editor (row + popup modes). */
  commitActiveRow(): void {
    const rowKey = this.deps.state.editRowKey();
    if (rowKey === null) return;
    const node = this.dataNodeOf(rowKey);
    if (!node) return;
    // added rows keep host-staged fields (e.g. a tree parent reference) that
    // have no editor column — editor values overlay them below
    const data: Record<string, unknown> = this.deps.state.isAdded(rowKey)
      ? { ...this.deps.state.changes().get(rowKey) }
      : {};
    let invalid = false;
    for (const column of this.deps.columns()) {
      const field = column.field;
      if (!field || !column.editable) continue;
      const editor = this.deps.editors.editorState(rowKey, field);
      if (!editor) continue;
      if (editor.invalid) {
        this.deps.editors.markTouched(rowKey, field);
        invalid = true;
        continue;
      }
      const original = column.accessor(node.data);
      const value = this.editorValue(editor.value, column, original);
      if (value !== original || this.deps.state.isAdded(rowKey)) {
        data[field] = value;
      }
    }
    if (invalid) return;
    if (!Object.keys(data).length) {
      this.deps.state.stopEditor();
      return;
    }
    const type = this.deps.state.isAdded(rowKey) ? 'insert' : 'update';
    void this.runSave([
      { type, key: rowKey, data: data as OgeDataChange<T>['data'] },
    ]);
  }

  deleteRow(node: DataRowNode<T>, event?: Event): void {
    event?.stopPropagation();
    if (this.deps.state.isAdded(node.key)) {
      this.deps.state.dropAdded(node.key);
      return;
    }
    if (this.editMode() === 'batch') {
      this.deps.state.toggleRemoved(node.key);
      return;
    }
    const editing = this.deps.editing();
    if (
      editing &&
      editing.confirmDelete &&
      typeof confirm === 'function' &&
      !confirm(this.deps.confirmDeleteMessage())
    ) {
      return;
    }
    void this.runSave([{ type: 'remove', key: node.key }]);
  }

  addNewRow(): void {
    const key = `oge-new-${++this.newRowCounter}`;
    this.deps.state.addRow(key);
    const mode = this.editMode();
    if (
      mode === 'row' ||
      mode === 'popup' ||
      mode === 'form' ||
      mode === 'cell'
    ) {
      this.deps.state.startRow(key);
    }
  }

  /** Batch toolbar: save everything pending. */
  saveAllChanges(): void {
    const editing = this.deps.state;
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
    const hadPending = this.deps.state.hasPending();
    this.deps.state.clearPending();
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

  protected async runSave(changes: OgeDataChange<T>[]): Promise<void> {
    if (!changes.length) {
      this.deps.state.stopEditor();
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
      this.deps.state.clearPending();
      this.deps.reload();
    }
    if (applied.length) this.deps.events.savedChanges?.({ changes: applied });
  }
}
