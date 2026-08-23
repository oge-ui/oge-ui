import type { RowNode } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';

/**
 * Hierarchy hooks that add tree-grid keyboard semantics (expand/collapse on
 * the logical Right/Left arrows in the first column, per WAI-ARIA treegrid).
 * Row arguments are flat node indices.
 */
export interface OgeGridKeyboardNavTreeHooks {
  isExpandable(row: number): boolean;
  isExpanded(row: number): boolean;
  toggle(row: number, expand: boolean): void;
  /** Flat index of the row's parent, or -1 when none. */
  parentRowIndex(row: number): number;
  /** Flat index of the row's first child, or -1 when none. */
  firstChildRowIndex(row: number): number;
}

/** Reactive getters the owning component wires into the machine. */
export interface OgeGridKeyboardNavDeps<T> {
  flatNodes: () => readonly RowNode<T>[];
  /** Number of navigable columns. */
  columnCount: () => number;
  rtl: () => boolean;
  /** Rows a PageUp/PageDown jump covers. */
  pageSize: () => number;
  /** Present on tree hosts; absent on plain grids. */
  tree?: OgeGridKeyboardNavTreeHooks;
}

/** Flat node index + visible column index. */
export interface OgeGridFocusedCell {
  readonly row: number;
  readonly col: number;
}

/**
 * Excel-like cell navigation over the flat row list: roving tabindex,
 * arrow/Home/End/Page movement that skips non-data rows, RTL-aware
 * horizontal arrows, and optional treegrid expand/collapse semantics.
 *
 * Framework-free (ADR 0001): reactive state is created through the caller's
 * {@link OgeReactivityAdapter}, so Angular hands it signals and React hands it
 * a store — the navigation semantics themselves exist once, for both.
 */
export class OgeGridKeyboardNavCore<T = unknown> {
  /** Focused cell, or `null` while nothing has been focused yet. */
  readonly focusedCell: OgeReactiveCell<OgeGridFocusedCell | null>;

  private readonly firstDataRowIndex: () => number;

  constructor(
    private readonly deps: OgeGridKeyboardNavDeps<T>,
    rx: OgeReactivityAdapter,
  ) {
    this.focusedCell = rx.cell<OgeGridFocusedCell | null>(null);
    this.firstDataRowIndex = rx.derived(() =>
      this.deps.flatNodes().findIndex((node) => node.kind === 'data'),
    );
  }

  /** Roving tabindex: only one cell participates in the tab order. */
  isCellTabbable(row: number, col: number): boolean {
    const focused = this.focusedCell();
    if (focused) return focused.row === row && focused.col === col;
    return row === this.firstDataRowIndex() && col === 0;
  }

  onCellFocus(row: number, col: number): void {
    const current = this.focusedCell();
    if (current?.row !== row || current.col !== col)
      this.focusedCell.set({ row, col });
  }

  /** Moves `steps` data rows in `direction`, skipping non-data nodes. */
  moveFocusRow(from: number, direction: 1 | -1, steps = 1): number {
    const nodes = this.deps.flatNodes();
    let index = from;
    let remaining = steps;
    while (remaining > 0) {
      let next = index + direction;
      while (next >= 0 && next < nodes.length && nodes[next].kind !== 'data')
        next += direction;
      if (next < 0 || next >= nodes.length) break;
      index = next;
      remaining -= 1;
    }
    return index;
  }

  /**
   * Handles a navigation key. Returns true when the key was consumed (the
   * host must then call `event.preventDefault()`); the focused cell is
   * updated in place. Non-navigation keys return false untouched.
   */
  handleKey(event: KeyboardEvent): boolean {
    const cell = this.focusedCell();
    if (!cell) return false;
    const nodes = this.deps.flatNodes();
    const lastCol = this.deps.columnCount() - 1;
    const rtl = this.deps.rtl();
    let { row, col } = cell;

    const tree = this.deps.tree;
    if (
      tree &&
      col === 0 &&
      (event.key === 'ArrowRight' || event.key === 'ArrowLeft')
    ) {
      // logical direction: "expand" points into the text flow
      const isExpandKey = rtl
        ? event.key === 'ArrowLeft'
        : event.key === 'ArrowRight';
      if (isExpandKey) {
        if (tree.isExpandable(row) && !tree.isExpanded(row)) {
          tree.toggle(row, true);
          return true;
        }
        if (tree.isExpandable(row) && tree.isExpanded(row)) {
          const child = tree.firstChildRowIndex(row);
          if (child >= 0) {
            this.focusedCell.set({ row: child, col });
            return true;
          }
        }
        // leaf: fall through to the plain column move below
      } else {
        if (tree.isExpandable(row) && tree.isExpanded(row)) {
          tree.toggle(row, false);
          return true;
        }
        const parent = tree.parentRowIndex(row);
        if (parent >= 0) {
          this.focusedCell.set({ row: parent, col });
          return true;
        }
        // root: fall through to the plain column move below
      }
    }

    switch (event.key) {
      case 'ArrowDown':
        row = this.moveFocusRow(row, 1);
        break;
      case 'ArrowUp':
        row = this.moveFocusRow(row, -1);
        break;
      case 'ArrowRight':
        // arrows move visually: in RTL the next column lies to the left
        col = rtl ? Math.max(0, col - 1) : Math.min(lastCol, col + 1);
        break;
      case 'ArrowLeft':
        col = rtl ? Math.min(lastCol, col + 1) : Math.max(0, col - 1);
        break;
      case 'Home':
        if (event.ctrlKey) row = this.moveFocusRow(-1, 1);
        col = 0;
        break;
      case 'End':
        if (event.ctrlKey) row = this.moveFocusRow(nodes.length, -1);
        col = lastCol;
        break;
      case 'PageDown':
        row = this.moveFocusRow(row, 1, this.deps.pageSize());
        break;
      case 'PageUp':
        row = this.moveFocusRow(row, -1, this.deps.pageSize());
        break;
      default:
        return false;
    }
    if (row !== cell.row || col !== cell.col)
      this.focusedCell.set({ row, col });
    return true;
  }
}
