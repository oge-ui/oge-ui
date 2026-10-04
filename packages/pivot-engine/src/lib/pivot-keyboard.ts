import type { PivotArea } from '@oge-ui/core';
import type { OgePivotHeaderCell, OgePivotMenuItem } from './pivot-types';

/**
 * A position in the pivot's single APG grid, in 0-based grid coordinates:
 * rows `0 … headerDepth - 1` are the column-header rows, the rest are value
 * rows; column 0 is the row-header column, columns `1 …` are the leaf
 * columns. The top-left corner (header rows × column 0) is not navigable.
 */
export interface OgePivotGridPosition {
  readonly row: number;
  readonly col: number;
}

/** What the grid navigation needs to know about the current layout. */
export interface OgePivotGridNavContext {
  /** Rows in the column-header block (≥ 1). */
  readonly headerDepth: number;
  /** Value rows (row leaves). */
  readonly rowCount: number;
  /** Value columns (column leaves). */
  readonly columnCount: number;
  /** Every column-header cell (not just the virtual window). */
  readonly headerCells: readonly OgePivotHeaderCell[];
}

/** The rectangle (end-exclusive) one grid element covers. */
export interface OgePivotGridExtent {
  readonly rowStart: number;
  readonly rowEnd: number;
  readonly colStart: number;
  readonly colEnd: number;
}

/** The modifier facts a keyboard decision reads — `KeyboardEvent` fits. */
export interface OgePivotKeyLike {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
}

/** Field-panel areas in their visual order (Ctrl+Up/Down walks this list). */
export const OGE_PIVOT_PANEL_AREA_ORDER: readonly PivotArea[] = [
  'filter',
  'row',
  'column',
  'data',
];

/** The column-header cell covering a header-row grid position, if any. */
export function pivotHeaderCellAt(
  headerCells: readonly OgePivotHeaderCell[],
  row: number,
  col: number,
): OgePivotHeaderCell | undefined {
  return headerCells.find(
    (cell) =>
      cell.rowStart - 1 <= row &&
      row < cell.rowEnd - 1 &&
      cell.columnStart <= col &&
      col < cell.columnStart + cell.span,
  );
}

/**
 * The element a grid position lands on, as its extent — `null` for the
 * corner, out-of-range positions, or a header gap.
 */
export function pivotGridExtent(
  pos: OgePivotGridPosition,
  ctx: OgePivotGridNavContext,
): OgePivotGridExtent | null {
  const { row, col } = pos;
  const lastRow = ctx.headerDepth + ctx.rowCount - 1;
  if (row < 0 || col < 0 || row > lastRow || col > ctx.columnCount) return null;
  if (row < ctx.headerDepth) {
    if (col === 0) return null;
    const cell = pivotHeaderCellAt(ctx.headerCells, row, col);
    if (!cell) return null;
    return {
      rowStart: cell.rowStart - 1,
      rowEnd: cell.rowEnd - 1,
      colStart: cell.columnStart,
      colEnd: cell.columnStart + cell.span,
    };
  }
  return { rowStart: row, rowEnd: row + 1, colStart: col, colEnd: col + 1 };
}

/**
 * The APG grid keyboard over headers and value cells as one composite:
 * arrows step past the current element's span (a spanning header is one
 * stop), Home/End go to the row's first/last cell, Ctrl+Home/End to the
 * grid's first/last cell. `rtl` mirrors the horizontal arrows. Returns
 * `null` for keys the grid does not own; a position equal to `pos` means
 * "handled, nowhere to go" (the edge).
 */
export function pivotGridKeyTarget(
  event: OgePivotKeyLike,
  pos: OgePivotGridPosition,
  ctx: OgePivotGridNavContext,
  rtl = false,
): OgePivotGridPosition | null {
  const here = pivotGridExtent(pos, ctx);
  if (!here) return null;
  const ctrl = !!(event.ctrlKey || event.metaKey);
  if (event.altKey || (ctrl && event.key.startsWith('Arrow'))) return null;
  const lastRow = ctx.headerDepth + ctx.rowCount - 1;
  const lastCol = ctx.columnCount;
  const firstColOf = (row: number) => (row < ctx.headerDepth ? 1 : 0);
  let key = event.key;
  if (rtl && key === 'ArrowLeft') key = 'ArrowRight';
  else if (rtl && key === 'ArrowRight') key = 'ArrowLeft';
  let next: OgePivotGridPosition;
  switch (key) {
    case 'ArrowRight':
      next = { row: pos.row, col: here.colEnd };
      break;
    case 'ArrowLeft':
      next = { row: pos.row, col: here.colStart - 1 };
      break;
    case 'ArrowDown':
      next = { row: here.rowEnd, col: pos.col };
      break;
    case 'ArrowUp':
      next = { row: here.rowStart - 1, col: pos.col };
      break;
    case 'Home':
      next = ctrl
        ? { row: 0, col: firstColOf(0) }
        : { row: pos.row, col: firstColOf(pos.row) };
      break;
    case 'End':
      next = ctrl
        ? { row: lastRow, col: lastCol }
        : { row: pos.row, col: lastCol };
      break;
    default:
      return null;
  }
  return pivotGridExtent(next, ctx) ? next : pos;
}

/**
 * Menu keyboard (APG menu): Down/Up wrap over the enabled items, Home/End
 * jump, Escape/Tab close. Returns the index to focus, `'close'`, or `null`.
 */
export function pivotMenuKeyTarget(
  key: string,
  index: number,
  items: readonly OgePivotMenuItem[],
): number | 'close' | null {
  if (key === 'Escape' || key === 'Tab') return 'close';
  const enabled = items
    .map((item, i) => (item.disabled ? -1 : i))
    .filter((i) => i >= 0);
  if (!enabled.length) return null;
  const at = enabled.indexOf(index);
  switch (key) {
    case 'ArrowDown':
      return enabled[at < 0 ? 0 : (at + 1) % enabled.length];
    case 'ArrowUp':
      return enabled[
        at < 0 ? enabled.length - 1 : (at - 1 + enabled.length) % enabled.length
      ];
    case 'Home':
      return enabled[0];
    case 'End':
      return enabled[enabled.length - 1];
    default:
      return null;
  }
}

/** What a key on a field chip asks for. */
export type OgePivotChipKeyIntent =
  | { readonly kind: 'menu' }
  | { readonly kind: 'reorder'; readonly delta: -1 | 1 }
  | { readonly kind: 'area'; readonly delta: -1 | 1 }
  | { readonly kind: 'remove' };

/**
 * Field-chip keyboard: Enter / Space / Shift+F10 / ContextMenu open the
 * field menu; Ctrl+Left/Right reorder within the area (mirrored in RTL);
 * Ctrl+Up/Down move to the previous/next area; Delete removes the field.
 * Moves only apply to chips placed in an area (`inArea`).
 */
export function pivotChipKeyIntent(
  event: OgePivotKeyLike,
  inArea: boolean,
  rtl = false,
): OgePivotChipKeyIntent | null {
  const ctrl = !!(event.ctrlKey || event.metaKey);
  const { key } = event;
  if (
    (!ctrl && (key === 'Enter' || key === ' ')) ||
    key === 'ContextMenu' ||
    (event.shiftKey && key === 'F10')
  )
    return { kind: 'menu' };
  if (!inArea) return null;
  if (ctrl && (key === 'ArrowLeft' || key === 'ArrowRight')) {
    const forward = (key === 'ArrowRight') !== rtl;
    return { kind: 'reorder', delta: forward ? 1 : -1 };
  }
  if (ctrl && (key === 'ArrowUp' || key === 'ArrowDown'))
    return { kind: 'area', delta: key === 'ArrowDown' ? 1 : -1 };
  if (key === 'Delete') return { kind: 'remove' };
  return null;
}

/**
 * A pointer stand-in that anchors a keyboard-opened menu below an element —
 * at its inline-start corner (the right edge in RTL, where the menu opens
 * leftwards).
 */
export function pivotKeyboardPointer(
  event: { preventDefault(): void; stopPropagation(): void },
  rect: {
    readonly left: number;
    readonly right?: number;
    readonly bottom: number;
  },
  rtl = false,
): {
  readonly clientX: number;
  readonly clientY: number;
  preventDefault(): void;
  stopPropagation(): void;
} {
  return {
    clientX: rtl ? (rect.right ?? rect.left) : rect.left,
    clientY: rect.bottom,
    preventDefault: () => event.preventDefault(),
    stopPropagation: () => event.stopPropagation(),
  };
}
