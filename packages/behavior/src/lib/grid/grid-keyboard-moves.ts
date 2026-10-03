import type { RowNode } from '@oge-ui/core';
import { resizedColumnWidth } from './grid-column-layout';

/**
 * Keyboard alternatives for every pointer-drag interaction of the grid family
 * (WCAG 2.1.1 Keyboard, 2.5.7 Dragging Movements): column resize, column
 * reorder, row reorder, tree reparenting, group-panel and column-chooser
 * reordering. Pure decisions over structural key events, so both render
 * layers pass their own event (Angular's `KeyboardEvent`, React's synthetic
 * one) unchanged, and both run the same scheme:
 *
 * | Where                  | Keys                                  | Action                        |
 * | ---------------------- | ------------------------------------- | ----------------------------- |
 * | Column header          | Alt+ArrowLeft / Alt+ArrowRight        | resize by 10px (Shift: 1px)   |
 * | Column header          | Ctrl+Shift+ArrowLeft / ArrowRight     | move the column               |
 * | Resize separator       | ArrowLeft / ArrowRight, Home / End    | resize (Shift: 1px), min/max  |
 * | Data row (grid)        | Ctrl+ArrowUp / Ctrl+ArrowDown         | move the row                  |
 * | Data row (tree list)   | Ctrl+ArrowUp/Down, Ctrl+ArrowRight/Left | move, indent / outdent      |
 * | Group-panel chip       | Ctrl+ArrowLeft / ArrowRight, Delete   | reorder groups, ungroup       |
 * | Column-chooser item    | Ctrl+ArrowUp / Ctrl+ArrowDown         | move the column               |
 *
 * Horizontal keys are visual: in a right-to-left grid ArrowLeft points
 * towards the inline end, which is what {@link resizedColumnWidth} already
 * encodes for the pointer.
 */
export interface OgeKeyInput {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

/** Pixels one Alt+Arrow / separator Arrow press resizes a column by. */
export const OGE_COLUMN_RESIZE_STEP = 10;
/** Pixels one Shift-modified resize press changes a column by. */
export const OGE_COLUMN_RESIZE_FINE_STEP = 1;
/** Narrowest width any column resizes to, whatever its `minWidth`. */
export const OGE_COLUMN_RESIZE_FLOOR = 50;

/** Keyboard shortcuts a header cell advertises through `aria-keyshortcuts`. */
export function ogeGridHeaderKeyShortcuts(options: {
  resize: boolean;
  move: boolean;
}): string | null {
  const keys: string[] = [];
  if (options.resize) keys.push('Alt+ArrowLeft', 'Alt+ArrowRight');
  if (options.move)
    keys.push('Control+Shift+ArrowLeft', 'Control+Shift+ArrowRight');
  return keys.length ? keys.join(' ') : null;
}

const ctrl = (event: OgeKeyInput): boolean => event.ctrlKey || event.metaKey;

/** +1 / -1 visual step of a horizontal arrow key, or 0 for anything else. */
function horizontalStep(key: string): 1 | -1 | 0 {
  if (key === 'ArrowRight') return 1;
  if (key === 'ArrowLeft') return -1;
  return 0;
}

/**
 * Logical width change of a visual horizontal step: positive widens. The
 * resize edge is the column's inline end, so this is the pointer rule of
 * {@link resizedColumnWidth} with the step as the pointer delta.
 */
function resizeDelta(step: 1 | -1, fine: boolean, rtl: boolean): number {
  const px = fine ? OGE_COLUMN_RESIZE_FINE_STEP : OGE_COLUMN_RESIZE_STEP;
  return resizedColumnWidth(0, 0, step * px, rtl);
}

/** What a key on a focused column header asks for. */
export type OgeGridHeaderKeyCommand =
  | { readonly kind: 'resize'; readonly delta: number }
  /** `direction` is logical: `1` moves towards the end of the column order. */
  | { readonly kind: 'move'; readonly direction: 1 | -1 };

/**
 * Alt+ArrowLeft/Right resizes (Shift for 1px steps), Ctrl+Shift+ArrowLeft/Right
 * moves the column. `null` for every other key — plain arrows stay with the
 * grid's cell navigation.
 */
export function ogeGridHeaderKeyCommand(
  event: OgeKeyInput,
  rtl: boolean,
): OgeGridHeaderKeyCommand | null {
  const step = horizontalStep(event.key);
  if (step === 0) return null;
  if (event.altKey && !ctrl(event))
    return { kind: 'resize', delta: resizeDelta(step, event.shiftKey, rtl) };
  if (ctrl(event) && event.shiftKey && !event.altKey)
    return { kind: 'move', direction: (rtl ? -step : step) as 1 | -1 };
  return null;
}

/** What a key on a focused resize separator asks for. */
export type OgeColumnSeparatorKeyCommand =
  | { readonly kind: 'resize'; readonly delta: number }
  | { readonly kind: 'min' }
  | { readonly kind: 'max' }
  /** Enter / Escape: hand focus back to the header cell. */
  | { readonly kind: 'exit' };

/** APG window-splitter keys on a vertical column separator. */
export function ogeColumnSeparatorKeyCommand(
  event: OgeKeyInput,
  rtl: boolean,
): OgeColumnSeparatorKeyCommand | null {
  if (event.altKey || ctrl(event)) return null;
  const step = horizontalStep(event.key);
  if (step !== 0)
    return { kind: 'resize', delta: resizeDelta(step, event.shiftKey, rtl) };
  switch (event.key) {
    case 'Home':
      return { kind: 'min' };
    case 'End':
      return { kind: 'max' };
    case 'Enter':
    case 'Escape':
      return { kind: 'exit' };
    default:
      return null;
  }
}

/** Resize range of one column, in px. */
export interface OgeColumnWidthBounds {
  readonly min: number;
  readonly max: number;
}

/**
 * The range a column may be resized within: its `minWidth` (never below
 * {@link OGE_COLUMN_RESIZE_FLOOR}) up to its `maxWidth`, or — unbounded —
 * `ceiling` (the separator's `aria-valuemax` needs a number).
 */
export function ogeColumnWidthBounds(
  minWidth: number | undefined,
  maxWidth: number | undefined,
  ceiling: number,
): OgeColumnWidthBounds {
  const min = Math.max(OGE_COLUMN_RESIZE_FLOOR, Math.round(minWidth ?? 0));
  const max =
    maxWidth !== undefined
      ? Math.max(min, Math.round(maxWidth))
      : Math.max(min, Math.round(ceiling));
  return { min, max };
}

/** Clamps a requested width into the bounds (rounded to whole pixels). */
export function clampColumnWidth(
  width: number,
  bounds: OgeColumnWidthBounds,
): number {
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(width)));
}

/** The width a separator command produces, or `null` for `exit`. */
export function ogeSeparatorTargetWidth(
  command: OgeColumnSeparatorKeyCommand,
  current: number,
  bounds: OgeColumnWidthBounds,
): number | null {
  switch (command.kind) {
    case 'resize':
      return clampColumnWidth(current + command.delta, bounds);
    case 'min':
      return bounds.min;
    case 'max':
      return bounds.max;
    default:
      return null;
  }
}

/** What a keyboard column move needs to know about each column. */
export interface OgeMovableColumn {
  readonly id: string;
  readonly pinned: false | 'left' | 'right';
  readonly bandCaption: string | undefined;
}

/** Where a keyboard-moved column lands. */
export interface OgeColumnMoveTarget {
  /** Column the moved one is placed next to. */
  readonly anchorId: string;
  readonly position: 'before' | 'after';
  /** Zero-based index of the moved column afterwards. */
  readonly toIndex: number;
}

/**
 * One keyboard step of a column through the visible order. A column never
 * leaves its pinned group (left / unpinned / right), and never leaves its
 * band; an unbanded column steps over a neighbouring band as a whole, so a
 * band is never split. `null` when the column is already at the edge.
 */
export function ogeColumnMoveTarget(
  columns: readonly OgeMovableColumn[],
  id: string,
  direction: 1 | -1,
): OgeColumnMoveTarget | null {
  const from = columns.findIndex((column) => column.id === id);
  if (from < 0) return null;
  const self = columns[from];
  const sameGroup = (index: number): boolean =>
    index >= 0 &&
    index < columns.length &&
    columns[index].pinned === self.pinned;
  let next = from + direction;
  if (!sameGroup(next)) return null;
  const neighbour = columns[next];
  if (self.bandCaption !== undefined) {
    if (neighbour.bandCaption !== self.bandCaption) return null;
  } else if (neighbour.bandCaption !== undefined) {
    // step over the whole band block
    const band = neighbour.bandCaption;
    while (
      sameGroup(next + direction) &&
      columns[next + direction].bandCaption === band
    )
      next += direction;
  }
  const anchor = columns[next];
  return {
    anchorId: anchor.id,
    position: direction === 1 ? 'after' : 'before',
    toIndex: next,
  };
}

/**
 * Ctrl+ArrowUp / Ctrl+ArrowDown on a grid row: `-1` / `1`, else `null`.
 * Shift and Alt are left alone (Shift+Ctrl extends selections elsewhere).
 */
export function ogeRowMoveDirection(event: OgeKeyInput): 1 | -1 | null {
  if (!ctrl(event) || event.altKey || event.shiftKey) return null;
  if (event.key === 'ArrowDown') return 1;
  if (event.key === 'ArrowUp') return -1;
  return null;
}

/** Index of the next data row from `from` in `direction`, or -1 at an edge. */
export function ogeAdjacentDataRow<T>(
  nodes: readonly RowNode<T>[],
  from: number,
  direction: 1 | -1,
): number {
  for (let i = from + direction; i >= 0 && i < nodes.length; i += direction)
    if (nodes[i].kind === 'data') return i;
  return -1;
}

/** A keyboard move of a tree row. */
export type OgeTreeRowKeyMove = 'up' | 'down' | 'indent' | 'outdent';

/**
 * Ctrl+ArrowUp/Down move a tree row among its siblings; Ctrl+ArrowRight
 * indents it under its previous sibling and Ctrl+ArrowLeft outdents it to its
 * parent's level — logical, so the two swap in a right-to-left grid.
 */
export function ogeTreeRowKeyMove(
  event: OgeKeyInput,
  rtl: boolean,
): OgeTreeRowKeyMove | null {
  if (!ctrl(event) || event.altKey || event.shiftKey) return null;
  switch (event.key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowRight':
      return rtl ? 'outdent' : 'indent';
    case 'ArrowLeft':
      return rtl ? 'indent' : 'outdent';
    default:
      return null;
  }
}

/** What a key on a group-panel chip asks for. */
export type OgeGroupChipKeyCommand =
  | { readonly kind: 'move'; readonly direction: 1 | -1 }
  | { readonly kind: 'remove' };

/** Ctrl+ArrowLeft/Right reorders a grouping (visual), Delete/Backspace removes it. */
export function ogeGroupChipKeyCommand(
  event: OgeKeyInput,
  rtl: boolean,
): OgeGroupChipKeyCommand | null {
  if (event.key === 'Delete' || event.key === 'Backspace')
    return ctrl(event) || event.altKey ? null : { kind: 'remove' };
  const step = horizontalStep(event.key);
  if (step === 0 || !ctrl(event) || event.altKey || event.shiftKey) return null;
  return { kind: 'move', direction: (rtl ? -step : step) as 1 | -1 };
}

/** Ctrl+ArrowUp / Ctrl+ArrowDown on a column-chooser item: `-1` / `1`. */
export function ogeChooserMoveDirection(event: OgeKeyInput): 1 | -1 | null {
  return ogeRowMoveDirection(event);
}

/** One keyboard step through a flat id list: the anchor + side, or `null`. */
export function ogeListMoveTarget(
  ids: readonly string[],
  id: string,
  direction: 1 | -1,
): OgeColumnMoveTarget | null {
  const from = ids.indexOf(id);
  const next = from + direction;
  if (from < 0 || next < 0 || next >= ids.length) return null;
  return {
    anchorId: ids[next],
    position: direction === 1 ? 'after' : 'before',
    toIndex: next,
  };
}
