import { computed, untracked, type TemplateRef } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import type { DataRowNode, DataSource, RowKey, RowNode } from '@oge-ui/core';
import {
  OgeGridEditingCore,
  type OgeGridEditorBridge,
  type OgeGridEditorState,
} from '@oge-ui/behavior';
import type { ColumnSource, ResolvedColumn } from './column-model';
import type { OgeEditingSlice, OgeEditingOptions } from './editing-slice';
import { SIGNAL_ADAPTER } from './signal-adapter';

// The change/event vocabulary is framework-free and lives in
// `@oge-ui/behavior`; re-exported so this entry point keeps its public surface.
export type {
  OgeDataChange,
  OgeEditingStartEvent,
  OgeRowInsertedEvent,
  OgeRowInsertingEvent,
  OgeRowRemovedEvent,
  OgeRowRemovingEvent,
  OgeRowUpdatedEvent,
  OgeRowUpdatingEvent,
  OgeSavedChangesEvent,
  OgeSavingChangesEvent,
} from '@oge-ui/behavior';

import type {
  OgeEditingStartEvent,
  OgeRowInsertedEvent,
  OgeRowInsertingEvent,
  OgeRowRemovedEvent,
  OgeRowRemovingEvent,
  OgeRowUpdatedEvent,
  OgeRowUpdatingEvent,
  OgeSavedChangesEvent,
  OgeSavingChangesEvent,
} from '@oge-ui/behavior';

export interface EditingModelDeps<
  T,
  S extends ColumnSource<T> = ColumnSource<T>,
> {
  /** The host's `editing` input: `false` disables editing entirely. */
  editing: () => false | OgeEditingOptions;
  /** Editing state slice: which editor is open plus the pending change set. */
  slice: OgeEditingSlice;
  /** Resolved columns — editors, validators and lookups are derived from them. */
  columns: () => readonly ResolvedColumn<T, S>[];
  /** Flat row list (unsaved added rows already rendered on top). */
  flatNodes: () => readonly RowNode<T>[];
  /** Save target; changes are applied one by one via update/insert/remove. */
  source: () => DataSource<T> | null;
  /** Prompt text for the native confirm dialog on non-batch deletes. */
  confirmDeleteMessage: () => string;
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

/** `key::field` — the control map's key. */
const controlKey = (key: RowKey, field: string): string =>
  `${String(key)}::${field}`;

/**
 * Editing engine shared by grid-like components: derives mode and permissions
 * from the editing options, builds the reactive `FormControl`s for the open
 * editor(s), answers the dirty/removed/added row queries, and drives the
 * commit/cancel/save flows — batch changes accumulate in the editing slice
 * and reach the DataSource only through the save pipeline. Hosted as a plain
 * field by the component (slice pattern — no DI).
 *
 * Since ADR 0001's grid phase the pipeline itself is `@oge-ui/behavior`'s
 * `OgeGridEditingCore`, shared verbatim with the React grid. What stays here
 * is the half that genuinely cannot be shared: the `FormControl`s, their
 * validators, and the `untracked` reads that keep template-called helpers from
 * subscribing to the control map.
 */
export class EditingModel<
  T = unknown,
  S extends ColumnSource<T> = ColumnSource<T>,
> extends OgeGridEditingCore<T, TemplateRef<object>, S> {
  /** Reactive controls for the active editor(s), keyed `key::field`. */
  readonly activeControls = computed<ReadonlyMap<string, FormControl<unknown>>>(
    () => {
      const map = new Map<string, FormControl<unknown>>();
      const mode = this.editMode();
      if (!mode) return map;
      const cell = this.ng.slice.editCell();
      const rowKey = this.ng.slice.editRowKey();
      const targetKey = cell?.key ?? rowKey;
      if (targetKey === null || targetKey === undefined) return map;
      const node = this.dataNodeOf(targetKey);
      if (!node) return map;
      for (const column of this.ng.columns()) {
        const field = column.field;
        if (!field || !column.editable) continue;
        if (cell && field !== cell.field) continue;
        const validators = [...(column.source?.validators() ?? [])];
        if (column.source?.required()) validators.push(Validators.required);
        map.set(
          controlKey(targetKey, field),
          new FormControl<unknown>(
            untracked(() => this.displayValue(node, column)),
            { validators },
          ),
        );
      }
      return map;
    },
  );

  constructor(private readonly ng: EditingModelDeps<T, S>) {
    // The bridge is handed to `super()`, so it cannot close over `this` yet.
    // It is filled in immediately after — the core only ever calls it later,
    // from a handler.
    const editors: OgeGridEditorBridge = {
      editorState: () => undefined,
      markTouched: () => undefined,
      rowValues: () => new Map(),
    };
    super(
      {
        editing: ng.editing,
        state: ng.slice,
        columns: ng.columns,
        flatNodes: ng.flatNodes,
        source: ng.source,
        confirmDeleteMessage: () => untracked(ng.confirmDeleteMessage),
        editors,
        events: ng.events,
        reload: ng.reload,
      },
      SIGNAL_ADAPTER,
    );
    editors.editorState = (key, field) => this.editorStateOf(key, field);
    editors.markTouched = (key, field) => this.markTouchedAt(key, field);
    editors.rowValues = (key) => this.rowValuesOf(key);
  }

  private editorStateOf(
    key: RowKey,
    field: string,
  ): OgeGridEditorState | undefined {
    const control = this.activeControls().get(controlKey(key, field));
    return control
      ? { value: control.value, invalid: control.invalid }
      : undefined;
  }

  private markTouchedAt(key: RowKey, field: string): void {
    this.activeControls().get(controlKey(key, field))?.markAsTouched();
  }

  /**
   * Read untracked on purpose: `lookupItemsFor` is called from the template
   * for cascading lookups, and depending on the control map there would make
   * every keystroke re-run the surrounding view.
   */
  private rowValuesOf(key: RowKey): ReadonlyMap<string, unknown> {
    const prefix = `${String(key)}::`;
    const values = new Map<string, unknown>();
    for (const [mapKey, control] of untracked(this.activeControls)) {
      if (mapKey.startsWith(prefix)) {
        values.set(mapKey.slice(prefix.length), control.value);
      }
    }
    return values;
  }

  editControl(
    node: DataRowNode<T>,
    column: ResolvedColumn<T, S>,
  ): FormControl<unknown> {
    return this.activeControls().get(
      controlKey(node.key, column.field as string),
    ) as FormControl<unknown>;
  }

  /** See the core: the reads below happen in handlers, never in a view. */
  override cancelEditing(): void {
    untracked(() => super.cancelEditing());
  }

  override discardAllChanges(notify = true): void {
    untracked(() => super.discardAllChanges(notify));
  }
}
