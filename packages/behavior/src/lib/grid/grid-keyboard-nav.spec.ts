import { describe, expect, it } from 'vitest';
import type { RowNode } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  OgeGridKeyboardNavCore,
  type OgeGridKeyboardNavTreeHooks,
} from './grid-keyboard-nav';

/**
 * The Angular seam (`@oge-ui/grid/foundation`'s `KeyboardNavModel`) carries the
 * exhaustive key-by-key suite. What this spec proves is the part only a
 * framework-free test can: the machine runs on a reactivity adapter that is
 * nothing but closures — no signals, no scheduler, no framework — which is the
 * contract the React grid will bind to.
 */
const rx: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next: T) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

const dataNode = (key: string, i: number): RowNode => ({
  kind: 'data',
  key,
  data: {},
  sourceIndex: i,
  level: 0,
});

const groupNode = (key: string): RowNode => ({
  kind: 'group',
  key,
  groupField: 'g',
  groupValue: key,
  level: 0,
  expanded: true,
  childCount: 0,
  summaries: [],
});

/** 0:group 1:data 2:data 3:group 4:data */
const MIXED: readonly RowNode[] = [
  groupNode('g0'),
  dataNode('a', 0),
  dataNode('b', 1),
  groupNode('g1'),
  dataNode('c', 2),
];

interface Overrides {
  flatNodes?: readonly RowNode[];
  columnCount?: number;
  rtl?: boolean;
  pageSize?: number;
  tree?: OgeGridKeyboardNavTreeHooks;
}

function createNav(over: Overrides = {}) {
  return new OgeGridKeyboardNavCore(
    {
      flatNodes: () => over.flatNodes ?? MIXED,
      columnCount: () => over.columnCount ?? 3,
      rtl: () => over.rtl ?? false,
      pageSize: () => over.pageSize ?? 2,
      tree: over.tree,
    },
    rx,
  );
}

const key = (k: string, init: KeyboardEventInit = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', { key: k, ...init });

describe('OgeGridKeyboardNavCore on a plain-closure adapter', () => {
  it('seeds the roving tab stop on the first data row, not the first row', () => {
    const nav = createNav();
    expect(nav.isCellTabbable(0, 0)).toBe(false); // the group row
    expect(nav.isCellTabbable(1, 0)).toBe(true);
    expect(nav.isCellTabbable(1, 1)).toBe(false);
  });

  it('moves the tab stop to whatever the user focused', () => {
    const nav = createNav();
    nav.onCellFocus(2, 1);
    expect(nav.focusedCell()).toEqual({ row: 2, col: 1 });
    expect(nav.isCellTabbable(1, 0)).toBe(false);
    expect(nav.isCellTabbable(2, 1)).toBe(true);
  });

  it('skips non-data rows when arrowing down', () => {
    const nav = createNav();
    nav.onCellFocus(2, 0);
    expect(nav.handleKey(key('ArrowDown'))).toBe(true);
    // row 3 is a group header — the focus lands on row 4
    expect(nav.focusedCell()).toEqual({ row: 4, col: 0 });
  });

  it('consumes navigation keys and leaves everything else alone', () => {
    const nav = createNav();
    nav.onCellFocus(1, 0);
    expect(nav.handleKey(key('ArrowRight'))).toBe(true);
    expect(nav.focusedCell()).toEqual({ row: 1, col: 1 });
    expect(nav.handleKey(key('a'))).toBe(false);
    expect(nav.focusedCell()).toEqual({ row: 1, col: 1 });
  });

  it('mirrors the horizontal arrows under RTL', () => {
    const nav = createNav({ rtl: true });
    nav.onCellFocus(1, 1);
    nav.handleKey(key('ArrowRight'));
    expect(nav.focusedCell()).toEqual({ row: 1, col: 0 });
    nav.handleKey(key('ArrowLeft'));
    expect(nav.focusedCell()).toEqual({ row: 1, col: 1 });
  });

  it('expands, then descends, on the logical expand key of a treegrid', () => {
    let expanded = false;
    const tree: OgeGridKeyboardNavTreeHooks = {
      isExpandable: (row) => row === 1,
      isExpanded: () => expanded,
      toggle: (_row, expand) => {
        expanded = expand;
      },
      parentRowIndex: () => -1,
      firstChildRowIndex: () => 2,
    };
    const nav = createNav({ tree });
    nav.onCellFocus(1, 0);

    expect(nav.handleKey(key('ArrowRight'))).toBe(true);
    expect(expanded).toBe(true);
    expect(nav.focusedCell()).toEqual({ row: 1, col: 0 }); // expand only

    expect(nav.handleKey(key('ArrowRight'))).toBe(true);
    expect(nav.focusedCell()).toEqual({ row: 2, col: 0 }); // then descend
  });

  it('reads its deps live — a shrinking column count clamps the next move', () => {
    let columnCount = 3;
    const nav = new OgeGridKeyboardNavCore(
      {
        flatNodes: () => MIXED,
        columnCount: () => columnCount,
        rtl: () => false,
        pageSize: () => 2,
      },
      rx,
    );
    nav.onCellFocus(1, 0);
    columnCount = 1;
    nav.handleKey(key('ArrowRight'));
    expect(nav.focusedCell()).toEqual({ row: 1, col: 0 });
  });
});
