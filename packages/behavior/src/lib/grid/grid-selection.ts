import type { FilterExpr, RowKey } from '@oge-ui/core';

/**
 * How a grid responds to selection gestures: row selection (`single`,
 * `multiple` with Ctrl/Shift, `checkbox` column) or `cell` — rectangular
 * cell ranges (click, Shift+click, drag, Shift+Arrow, Ctrl+click for more
 * ranges) with TSV copy / paste and the fill handle.
 */
export type OgeGridSelectionMode =
  'none' | 'single' | 'multiple' | 'checkbox' | 'cell';

/** What a click on a row should do to the selection. */
export type OgeGridSelectionIntent = 'none' | 'selectOnly' | 'toggle' | 'range';

/** The modifier keys a selection gesture carries. */
export interface OgeGridSelectionModifiers {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

/**
 * The selection gesture table, in one place: Shift extends a range, Ctrl (or
 * Cmd) toggles, checkbox mode toggles on a plain click, and everything else
 * replaces the selection. `single` never ranges or toggles.
 */
export function rowClickSelectionIntent(
  mode: OgeGridSelectionMode,
  event: OgeGridSelectionModifiers,
): OgeGridSelectionIntent {
  if (mode === 'none' || mode === 'cell') return 'none';
  if (mode === 'single') return 'selectOnly';
  if (event.shiftKey) return 'range';
  if (event.ctrlKey || event.metaKey || mode === 'checkbox') return 'toggle';
  return 'selectOnly';
}

/** Inputs of {@link allRowsSelected} / {@link someRowsSelected}. */
export interface OgeGridSelectAllState {
  /** Keys of the rendered data rows. */
  keys: readonly RowKey[];
  /** Currently selected keys (key-tracking mode). */
  selected: ReadonlySet<RowKey>;
  /** Rows in the whole filtered set, across pages. */
  totalCount: number;
  /**
   * `'allPages'` (default) means the header checkbox speaks for the whole
   * filtered set, so it only reads as checked once the selection covers it —
   * `'page'` judges the rendered page alone.
   */
  selectAllMode: 'allPages' | 'page';
}

/** Whether the header select-all checkbox reads as checked. */
export function allRowsSelected(state: OgeGridSelectAllState): boolean {
  if (!state.keys.length) return false;
  if (
    state.selectAllMode === 'page' ||
    state.selected.size >= state.totalCount
  ) {
    return state.keys.every((key) => state.selected.has(key));
  }
  return false;
}

/** Whether it reads as indeterminate. */
export function someRowsSelected(state: OgeGridSelectAllState): boolean {
  return state.selected.size > 0 && !allRowsSelected(state);
}

// --- deferred selection -----------------------------------------------------

/**
 * Deferred selection tracks no key set: the selection *is* a serializable
 * `FilterExpr`, so selecting everything over a huge remote set never fetches a
 * single key. These helpers are how that expression grows and shrinks.
 */
export function keyEqualsExpr(
  keyField: string | null,
  key: RowKey,
): FilterExpr | null {
  return keyField
    ? { type: 'binary', field: keyField, op: 'eq', value: key }
    : null;
}

/**
 * Adds or removes one key from a deferred selection expression. Removing the
 * last selected key yields `null` — "nothing selected" — rather than an
 * expression that matches nothing.
 */
export function deferredToggleExpr(
  current: FilterExpr | null,
  keyExpr: FilterExpr,
  isSelected: boolean,
): FilterExpr | null {
  if (isSelected) {
    return current
      ? { type: 'and', operands: [current, { type: 'not', operand: keyExpr }] }
      : null;
  }
  return current ? { type: 'or', operands: [current, keyExpr] } : keyExpr;
}
