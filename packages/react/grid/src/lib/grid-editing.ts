'use client';

import {
  OgeGridEditingCore,
  type OgeEditingOptions,
  type OgeGridEditingCoreDeps,
  type OgeGridEditingState,
  type OgeGridEditorBridge,
  type OgeGridEditorState,
  type OgeGridResolvedColumn,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
} from '@oge-ui/behavior';

import type { DataRowNode, DataSource, RowKey, RowNode } from '@oge-ui/core';
import type { OgeGridColumnProps, OgeGridValidator } from './grid-types';

/** `key::field` — the draft map's key. */
const draftKey = (key: RowKey, field: string): string =>
  `${String(key)}::${field}`;

/**
 * Rules seen returning a promise: the sync pass (run on every render) skips
 * them, so a server check runs once per typed value, not once per render.
 */
const asyncRules = /* @__PURE__ */ new WeakSet<object>();
/** Rules seen returning a plain message — never re-run by the async pass. */
const syncRules = /* @__PURE__ */ new WeakSet<object>();

const isPromise = (value: unknown): value is Promise<string | null> =>
  !!value && typeof value === 'object' && 'then' in value;

/** One open editor: its current value and whatever rejects it. */
export interface OgeGridEditorEntry {
  value: unknown;
  /** First failing validator's message, or `null` when the value is accepted. */
  error: string | null;
  /** Whether the user has left the editor once — gates showing `error`. */
  touched: boolean;
  /** An async rule is still checking this value (`aria-busy`). */
  pending: boolean;
}

/** One async check of a draft value: its outcome once settled. */
interface AsyncCheck {
  value: unknown;
  pending: boolean;
  error: string | null;
  settled: Promise<void>;
}

/**
 * The draft state of one edit session.
 *
 * Keyed by session so it never has to be *cleared*: opening a different cell
 * or row changes the key, and a stale map is simply not the current one. A
 * reducer-style write with no side effect in any derived — the alternative,
 * resetting drafts from inside a memo when the session changed, is a write
 * during read and loops the moment anything else reads it.
 */
interface DraftState {
  session: string;
  values: ReadonlyMap<string, unknown>;
  touched: ReadonlySet<string>;
}

const EMPTY_DRAFTS: DraftState = {
  session: '',
  values: new Map(),
  touched: new Set(),
};

export interface OgeGridEditingModelDeps<T, TSlot> {
  editing: () => false | OgeEditingOptions;
  state: OgeGridEditingState;
  columns: () => readonly OgeGridResolvedColumn<
    T,
    TSlot,
    OgeGridColumnProps<T>
  >[];
  flatNodes: () => readonly RowNode<T>[];
  source: () => DataSource<T> | null;
  confirmDeleteMessage: () => string;
  /** Message for a `required` column left empty. */
  requiredMessage: () => string;
  events: OgeGridEditingCoreDeps<T, TSlot, OgeGridColumnProps<T>>['events'];
  reload(): void;
}

/**
 * The React half of the grid's editing engine.
 *
 * Everything about *when* to commit, what a change set contains and how it
 * reaches the DataSource is `OgeGridEditingCore`, shared verbatim with the
 * Angular grid. What cannot be shared is the editor controls: Angular builds
 * `FormControl`s and lets `Validators` decide validity, React holds the draft
 * in state and runs the column's validators itself. This class is that half —
 * it fills in {@link OgeGridEditorBridge} and nothing else.
 */
export class OgeGridEditingModel<T, TSlot> extends OgeGridEditingCore<
  T,
  TSlot,
  OgeGridColumnProps<T>
> {
  /** Draft values of the open editor(s), by `key::field`. */
  private readonly drafts: OgeReactiveCell<DraftState>;
  /** The open editor(s) with their values and validation, by `key::field`. */
  readonly activeEditors: () => ReadonlyMap<string, OgeGridEditorEntry>;
  /** Identity of the current edit session — the drafts are scoped to it. */
  private readonly session: () => string;
  /** Async rule results per `key::field` — the latest checked value wins. */
  private readonly asyncChecks: OgeReactiveCell<
    ReadonlyMap<string, AsyncCheck>
  >;

  constructor(
    private readonly react: OgeGridEditingModelDeps<T, TSlot>,
    rx: OgeReactivityAdapter,
  ) {
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
        editing: react.editing,
        state: react.state,
        columns: react.columns,
        flatNodes: react.flatNodes,
        source: react.source,
        confirmDeleteMessage: react.confirmDeleteMessage,
        editors,
        events: react.events,
        reload: react.reload,
      },
      rx,
    );

    this.drafts = rx.cell<DraftState>(EMPTY_DRAFTS);
    this.asyncChecks = rx.cell<ReadonlyMap<string, AsyncCheck>>(new Map());

    this.session = rx.derived(() => {
      const cell = react.state.editCell();
      const rowKey = react.state.editRowKey();
      if (cell) return `cell:${String(cell.key)}::${cell.field}`;
      if (rowKey !== null && rowKey !== undefined)
        return `row:${String(rowKey)}`;
      return '';
    });

    this.activeEditors = rx.derived(() => {
      const map = new Map<string, OgeGridEditorEntry>();
      const session = this.session();
      if (!session || !this.editMode()) return map;
      const cell = react.state.editCell();
      const rowKey = react.state.editRowKey();
      const targetKey = cell ? cell.key : rowKey;
      if (targetKey === null || targetKey === undefined) return map;
      const node = this.dataNodeOf(targetKey);
      if (!node) return map;
      const drafts = this.drafts();
      const live = drafts.session === session ? drafts : EMPTY_DRAFTS;
      for (const column of react.columns()) {
        const field = column.field;
        if (!field || !column.editable) continue;
        if (cell && field !== cell.field) continue;
        const id = draftKey(targetKey, field);
        const value = live.values.has(id)
          ? live.values.get(id)
          : this.displayValue(node, column);
        const sync = this.validate(value, node.data, column);
        // an async rule's verdict counts only for the value it checked
        const check = this.asyncChecks().get(id);
        const current = check && Object.is(check.value, value) ? check : null;
        map.set(id, {
          value,
          error: sync ?? (current && !current.pending ? current.error : null),
          touched: live.touched.has(id),
          pending: sync === null && !!current?.pending,
        });
      }
      return map;
    });

    editors.editorState = (key, field) => this.editorStateOf(key, field);
    editors.markTouched = (key, field) => this.markTouchedAt(key, field);
    editors.rowValues = (key) => this.rowValuesOf(key);
    editors.whenValidated = (key, field) => {
      const check = this.asyncChecks().get(draftKey(key, field));
      return check?.pending ? check.settled : Promise.resolve();
    };
    editors.validateValue = async (_key, field, value, row) => {
      const column = react.columns().find((c) => c.field === field);
      if (!column) return true;
      if (this.validate(value, row as T, column) !== null) return false;
      return (await this.validateAsync(value, row as T, column)) === null;
    };
  }

  /**
   * First failing sync rule's message, or `null` when the sync rules accept
   * the value. A rule returning a promise is async — see `validateAsync`.
   */
  private validate(
    value: unknown,
    row: T,
    column: OgeGridResolvedColumn<T, TSlot, OgeGridColumnProps<T>>,
  ): string | null {
    const spec = column.source;
    if (!spec) return null;
    if (
      spec.required &&
      (value === null || value === undefined || value === '')
    ) {
      return this.react.requiredMessage();
    }
    for (const rule of spec.validators ?? []) {
      if (asyncRules.has(rule)) continue;
      const message = (rule as OgeGridValidator<T>)(value, row);
      if (isPromise(message)) {
        asyncRules.add(rule);
        continue;
      }
      syncRules.add(rule);
      if (message) return message;
    }
    return null;
  }

  /** The async rules' first failing message (sync results are skipped). */
  private async validateAsync(
    value: unknown,
    row: T,
    column: OgeGridResolvedColumn<T, TSlot, OgeGridColumnProps<T>>,
  ): Promise<string | null> {
    const pending = (column.source?.validators ?? [])
      .map((rule) => (rule as OgeGridValidator<T>)(value, row))
      .filter(isPromise);
    for (const message of await Promise.all(pending)) {
      if (message) return message;
    }
    return null;
  }

  /** Starts the async rules for a new draft value, if the column has any. */
  private checkAsync(key: RowKey, field: string, value: unknown): void {
    const column = this.react.columns().find((c) => c.field === field);
    const node = this.dataNodeOf(key);
    if (!column || !node) return;
    const rules = column.source?.validators ?? [];
    if (!rules.length) return;
    const id = draftKey(key, field);
    const promises: Promise<string | null>[] = [];
    for (const rule of rules) {
      // known-sync rules already ran in the render pass
      if (syncRules.has(rule)) continue;
      const result = (rule as OgeGridValidator<T>)(value, node.data);
      if (isPromise(result)) {
        asyncRules.add(rule);
        promises.push(result);
      } else syncRules.add(rule);
    }
    if (!promises.length) return;
    let done!: () => void;
    const settled = new Promise<void>((resolve) => (done = resolve));
    const next = new Map(this.asyncChecks());
    next.set(id, { value, pending: true, error: null, settled });
    this.asyncChecks.set(next);
    void Promise.all(promises)
      .then((messages) => messages.find((message) => !!message) ?? null)
      .catch(() => this.react.requiredMessage())
      .then((error) => {
        const current = this.asyncChecks().get(id);
        if (current?.settled === settled) {
          const map = new Map(this.asyncChecks());
          map.set(id, { value, pending: false, error, settled });
          this.asyncChecks.set(map);
        }
        done();
      });
  }

  private editorStateOf(
    key: RowKey,
    field: string,
  ): OgeGridEditorState | undefined {
    const entry = this.activeEditors().get(draftKey(key, field));
    return entry
      ? {
          value: entry.value,
          invalid: entry.error !== null,
          pending: entry.pending,
        }
      : undefined;
  }

  private markTouchedAt(key: RowKey, field: string): void {
    const id = draftKey(key, field);
    const session = this.session();
    const current = this.drafts();
    const live = current.session === session ? current : EMPTY_DRAFTS;
    if (live.touched.has(id)) return;
    this.drafts.set({
      session,
      values: live.values,
      touched: new Set([...live.touched, id]),
    });
  }

  private rowValuesOf(key: RowKey): ReadonlyMap<string, unknown> {
    const prefix = `${String(key)}::`;
    const values = new Map<string, unknown>();
    for (const [id, entry] of this.activeEditors()) {
      if (id.startsWith(prefix))
        values.set(id.slice(prefix.length), entry.value);
    }
    return values;
  }

  /** The open editor for a cell, or `undefined` when it has none. */
  editorAt(
    node: DataRowNode<T>,
    column: OgeGridResolvedColumn<T, TSlot, OgeGridColumnProps<T>>,
  ): OgeGridEditorEntry | undefined {
    return column.field
      ? this.activeEditors().get(draftKey(node.key, column.field))
      : undefined;
  }

  /** Writes a draft value — the React counterpart of `control.setValue()`. */
  setEditorValue(key: RowKey, field: string, value: unknown): void {
    const session = this.session();
    if (!session) return;
    const current = this.drafts();
    const live = current.session === session ? current : EMPTY_DRAFTS;
    const values = new Map(live.values);
    values.set(draftKey(key, field), value);
    this.drafts.set({ session, values, touched: live.touched });
    this.checkAsync(key, field, value);
  }

  /** Marks an editor touched, revealing its error. */
  touchEditor(key: RowKey, field: string): void {
    this.markTouchedAt(key, field);
  }
}
