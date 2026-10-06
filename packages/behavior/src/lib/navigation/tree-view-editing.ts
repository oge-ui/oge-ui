/**
 * In-place label editing for the tree view (F2 / double-click), shared by
 * both render layers: who may edit, what a key means inside the editor, and
 * the commit pipeline (`itemEditing` → validation → `itemEdited`).
 *
 * The tree never writes the new label into the data — exactly like its
 * drag & drop, it reports the change and the application applies it
 * (`itemEdited`), so a tree bound to external data stays the single source
 * of truth.
 */
import type { RowKey } from '@oge-ui/core';
import type { OgeTreeViewNode } from './tree-view-core';

/** Which nodes may be renamed: all, none, or decided per item. */
export type OgeTreeAllowEditing<T> = boolean | ((item: T) => boolean);

/**
 * Validates an edited label before it commits. Return `true` / `null` /
 * `undefined` to accept, `false` to reject with the catalog's `editInvalid`
 * text, or a string to reject with that message. A rejected value keeps the
 * editor open with the message shown.
 */
export type OgeTreeEditValidator<T> = (
  value: string,
  item: T,
) => boolean | string | null | undefined;

/** Cancelable pre-event of the label editor opening. */
export interface OgeTreeEditStartingEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  /** The label the editor opens with. */
  readonly value: string;
  readonly event?: Event;
  /** Set to `true` to keep the editor closed. */
  cancel: boolean;
}

/** Cancelable pre-event of an edited label committing. */
export interface OgeTreeEditingEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  /** The label before the edit. */
  readonly previousValue: string;
  /** The label the user typed. */
  readonly value: string;
  readonly event?: Event;
  /** Set to `true` to discard the edit (the editor closes). */
  cancel: boolean;
}

/**
 * Emitted after an edit passed `itemEditing` and validation. The tree does
 * not mutate the data — write `value` into your own item.
 */
export interface OgeTreeEditedEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly previousValue: string;
  readonly value: string;
  readonly event?: Event;
}

/** Whether this row may open the label editor. */
export function treeCanEditNode<T>(
  allow: OgeTreeAllowEditing<T>,
  node: OgeTreeViewNode<T> | undefined,
  treeDisabled: boolean,
): boolean {
  if (!node || treeDisabled) return false;
  if (node.filler || node.more || node.disabled) return false;
  return typeof allow === 'function' ? allow(node.item) : allow;
}

/**
 * The opening pipeline: the permission check, then the cancelable
 * `itemEditStarting`. Returns whether the editor may open.
 */
export function runTreeEditStart<T>(input: {
  node: OgeTreeViewNode<T> | undefined;
  allow: OgeTreeAllowEditing<T>;
  treeDisabled: boolean;
  event?: Event;
  emitStarting(event: OgeTreeEditStartingEvent<T>): void;
}): boolean {
  const { node } = input;
  if (!node || !treeCanEditNode(input.allow, node, input.treeDisabled)) {
    return false;
  }
  const starting: OgeTreeEditStartingEvent<T> = {
    key: node.key,
    item: node.item,
    value: node.text,
    event: input.event,
    cancel: false,
  };
  input.emitStarting(starting);
  return !starting.cancel;
}

/** What a key pressed inside the editor means. */
export type OgeTreeEditKeyAction = 'commit' | 'cancel' | null;

/** Enter commits, Escape cancels; everything else is typing. */
export function planTreeEditKey(key: string): OgeTreeEditKeyAction {
  if (key === 'Enter') return 'commit';
  if (key === 'Escape') return 'cancel';
  return null;
}

/** Whether a key on a focused row opens the editor (APG/desktop: F2). */
export function isTreeEditKey(event: {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}): boolean {
  return (
    event.key === 'F2' && !event.ctrlKey && !event.altKey && !event.metaKey
  );
}

/** Outcome of {@link runTreeEditCommit}. */
export interface OgeTreeEditCommitResult {
  /**
   * `committed` — events fired, close the editor; `unchanged` / `empty` /
   * `cancelled` — close without an `itemEdited`; `invalid` — keep the
   * editor open and show {@link error}.
   */
  readonly status:
    'committed' | 'unchanged' | 'empty' | 'cancelled' | 'invalid';
  readonly error?: string;
}

/** Inputs of {@link runTreeEditCommit}. */
export interface OgeTreeEditCommitInput<T> {
  key: RowKey;
  item: T;
  previousValue: string;
  value: string;
  event?: Event;
  validate?: OgeTreeEditValidator<T>;
  /** Message used when `validate` returns `false`. */
  invalidMessage: string;
  emitEditing(event: OgeTreeEditingEvent<T>): void;
  emitEdited(event: OgeTreeEditedEvent<T>): void;
}

/**
 * The commit pipeline both layers run: an unchanged or blank label closes
 * quietly (a blank name is never a rename — the desktop file-manager rule),
 * then validation, then the cancelable `itemEditing`, then `itemEdited`.
 * Validation runs before the pre-event so `itemEditing` only ever sees a
 * value that would commit.
 */
export function runTreeEditCommit<T>(
  input: OgeTreeEditCommitInput<T>,
): OgeTreeEditCommitResult {
  const { value, previousValue } = input;
  if (value === previousValue) return { status: 'unchanged' };
  if (value.trim() === '') return { status: 'empty' };
  const verdict = input.validate?.(value, input.item);
  if (verdict === false) {
    return { status: 'invalid', error: input.invalidMessage };
  }
  if (typeof verdict === 'string') {
    return { status: 'invalid', error: verdict };
  }
  const editing: OgeTreeEditingEvent<T> = {
    key: input.key,
    item: input.item,
    previousValue,
    value,
    event: input.event,
    cancel: false,
  };
  input.emitEditing(editing);
  if (editing.cancel) return { status: 'cancelled' };
  input.emitEdited({
    key: input.key,
    item: input.item,
    previousValue,
    value,
    event: input.event,
  });
  return { status: 'committed' };
}
