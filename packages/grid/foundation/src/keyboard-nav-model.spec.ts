import { signal } from '@angular/core';
import type { RowNode } from '@oge-ui/core';
import {
  KeyboardNavModel,
  type KeyboardNavTreeHooks,
} from './keyboard-nav-model';

function dataNode(key: string, i: number): RowNode {
  return { kind: 'data', key, data: {}, sourceIndex: i, level: 0 };
}

function groupNode(key: string): RowNode {
  return {
    kind: 'group',
    key,
    groupField: 'g',
    groupValue: key,
    level: 0,
    expanded: true,
    childCount: 0,
    summaries: [],
  };
}

function detailNode(key: string, parentKey: string): RowNode {
  return { kind: 'detail', key, parentKey, data: {} };
}

/** 0:group 1:data 2:detail 3:data 4:group 5:data 6:data */
const MIXED: readonly RowNode[] = [
  groupNode('g0'),
  dataNode('a', 0),
  detailNode('a-detail', 'a'),
  dataNode('b', 1),
  groupNode('g1'),
  dataNode('c', 2),
  dataNode('d', 3),
];

interface NavOverrides {
  flatNodes?: readonly RowNode[];
  columnCount?: number;
  rtl?: boolean;
  pageSize?: number;
  tree?: KeyboardNavTreeHooks;
}

function createNav(over: NavOverrides = {}) {
  const deps = {
    flatNodes: signal(over.flatNodes ?? MIXED),
    columnCount: signal(over.columnCount ?? 3),
    rtl: signal(over.rtl ?? false),
    pageSize: signal(over.pageSize ?? 2),
    tree: over.tree,
  };
  return { deps, nav: new KeyboardNavModel(deps) };
}

function key(k: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: k, ...init });
}

function makeTree(
  config: {
    expandable?: (row: number) => boolean;
    expanded?: (row: number) => boolean;
    parent?: (row: number) => number;
    firstChild?: (row: number) => number;
  } = {},
) {
  const toggles: Array<{ row: number; expand: boolean }> = [];
  const hooks: KeyboardNavTreeHooks = {
    isExpandable: config.expandable ?? (() => false),
    isExpanded: config.expanded ?? (() => false),
    toggle: (row, expand) => toggles.push({ row, expand }),
    parentRowIndex: config.parent ?? (() => -1),
    firstChildRowIndex: config.firstChild ?? (() => -1),
  };
  return { hooks, toggles };
}

describe('KeyboardNavModel', () => {
  describe('roving tabindex', () => {
    it('makes only the first data row / first column tabbable before any focus', () => {
      const { nav } = createNav();
      expect(nav.isCellTabbable(1, 0)).toBe(true); // index 0 is a group row
      expect(nav.isCellTabbable(0, 0)).toBe(false);
      expect(nav.isCellTabbable(1, 1)).toBe(false);
      expect(nav.isCellTabbable(3, 0)).toBe(false);
    });

    it('moves the tab stop to the focused cell', () => {
      const { nav } = createNav();
      nav.onCellFocus(3, 2);
      expect(nav.focusedCell()).toEqual({ row: 3, col: 2 });
      expect(nav.isCellTabbable(3, 2)).toBe(true);
      expect(nav.isCellTabbable(1, 0)).toBe(false);
    });
  });

  describe('moveFocusRow', () => {
    it.each([
      { from: 1, direction: 1 as const, steps: 1, expected: 3 }, // skips the detail row
      { from: 3, direction: 1 as const, steps: 1, expected: 5 }, // skips the group row
      { from: 5, direction: -1 as const, steps: 1, expected: 3 },
      { from: 1, direction: 1 as const, steps: 2, expected: 5 },
      { from: 1, direction: 1 as const, steps: 99, expected: 6 }, // clamps at the last data row
      { from: 6, direction: 1 as const, steps: 1, expected: 6 },
      { from: 1, direction: -1 as const, steps: 1, expected: 1 }, // nothing above but a group
    ])(
      'from $from dir $direction steps $steps → $expected',
      ({ from, direction, steps, expected }) => {
        const { nav } = createNav();
        expect(nav.moveFocusRow(from, direction, steps)).toBe(expected);
      },
    );
  });

  describe('handleKey', () => {
    it('returns false when no cell is focused', () => {
      const { nav } = createNav();
      expect(nav.handleKey(key('ArrowDown'))).toBe(false);
      expect(nav.focusedCell()).toBeNull();
    });

    it('returns false for non-navigation keys', () => {
      const { nav } = createNav();
      nav.onCellFocus(1, 0);
      expect(nav.handleKey(key('Enter'))).toBe(false);
      expect(nav.handleKey(key('a'))).toBe(false);
      expect(nav.focusedCell()).toEqual({ row: 1, col: 0 });
    });

    it('ArrowDown/ArrowUp move between data rows, skipping detail and group rows', () => {
      const { nav } = createNav();
      nav.onCellFocus(1, 0);
      expect(nav.handleKey(key('ArrowDown'))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 3, col: 0 });
      expect(nav.handleKey(key('ArrowDown'))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 5, col: 0 });
      expect(nav.handleKey(key('ArrowUp'))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 3, col: 0 });
    });

    it('consumes the key even when the position cannot change', () => {
      const { nav } = createNav();
      nav.onCellFocus(1, 0);
      const cell = nav.focusedCell();
      expect(nav.handleKey(key('ArrowUp'))).toBe(true);
      expect(nav.focusedCell()).toBe(cell); // untouched, not re-set
    });

    it.each([
      {
        name: 'LTR ArrowRight advances',
        rtl: false,
        k: 'ArrowRight',
        col: 1,
        expected: 2,
      },
      {
        name: 'LTR ArrowRight clamps at last',
        rtl: false,
        k: 'ArrowRight',
        col: 2,
        expected: 2,
      },
      {
        name: 'LTR ArrowLeft retreats',
        rtl: false,
        k: 'ArrowLeft',
        col: 1,
        expected: 0,
      },
      {
        name: 'LTR ArrowLeft clamps at 0',
        rtl: false,
        k: 'ArrowLeft',
        col: 0,
        expected: 0,
      },
      {
        name: 'RTL ArrowRight retreats',
        rtl: true,
        k: 'ArrowRight',
        col: 1,
        expected: 0,
      },
      {
        name: 'RTL ArrowRight clamps at 0',
        rtl: true,
        k: 'ArrowRight',
        col: 0,
        expected: 0,
      },
      {
        name: 'RTL ArrowLeft advances',
        rtl: true,
        k: 'ArrowLeft',
        col: 1,
        expected: 2,
      },
      {
        name: 'RTL ArrowLeft clamps at last',
        rtl: true,
        k: 'ArrowLeft',
        col: 2,
        expected: 2,
      },
    ])('$name', ({ rtl, k, col, expected }) => {
      const { nav } = createNav({ rtl });
      nav.onCellFocus(3, col);
      expect(nav.handleKey(key(k))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 3, col: expected });
    });

    it('Home/End jump to the first/last column; Ctrl adds the row jump', () => {
      const { nav } = createNav();
      nav.onCellFocus(3, 1);
      expect(nav.handleKey(key('Home'))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 3, col: 0 });
      expect(nav.handleKey(key('End'))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 3, col: 2 });
      expect(nav.handleKey(key('End', { ctrlKey: true }))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 6, col: 2 }); // last data row
      expect(nav.handleKey(key('Home', { ctrlKey: true }))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 1, col: 0 }); // first data row
    });

    it('PageDown/PageUp move pageSize data rows', () => {
      const { nav } = createNav({ pageSize: 2 });
      nav.onCellFocus(1, 1);
      expect(nav.handleKey(key('PageDown'))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 5, col: 1 }); // 1 → 3 → 5
      expect(nav.handleKey(key('PageDown'))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 6, col: 1 }); // clamped after one step
      expect(nav.handleKey(key('PageUp'))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 3, col: 1 }); // 6 → 5 → 3
    });
  });

  describe('tree hooks (treegrid semantics in column 0)', () => {
    const ALL_DATA: readonly RowNode[] = [
      dataNode('r0', 0),
      dataNode('r1', 1),
      dataNode('r2', 2),
      dataNode('r3', 3),
    ];

    it('expands a collapsed expandable row on the logical expand key', () => {
      const { hooks, toggles } = makeTree({
        expandable: () => true,
        expanded: () => false,
      });
      const { nav } = createNav({ flatNodes: ALL_DATA, tree: hooks });
      nav.onCellFocus(1, 0);
      expect(nav.handleKey(key('ArrowRight'))).toBe(true);
      expect(toggles).toEqual([{ row: 1, expand: true }]);
      expect(nav.focusedCell()).toEqual({ row: 1, col: 0 }); // focus stays put
    });

    it('jumps to the first child when the row is already expanded', () => {
      const { hooks, toggles } = makeTree({
        expandable: () => true,
        expanded: () => true,
        firstChild: (row) => row + 1,
      });
      const { nav } = createNav({ flatNodes: ALL_DATA, tree: hooks });
      nav.onCellFocus(1, 0);
      expect(nav.handleKey(key('ArrowRight'))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 2, col: 0 });
      expect(toggles).toEqual([]);
    });

    it('falls through to a column move when expanded but without a child', () => {
      const { hooks } = makeTree({
        expandable: () => true,
        expanded: () => true,
        firstChild: () => -1,
      });
      const { nav } = createNav({ flatNodes: ALL_DATA, tree: hooks });
      nav.onCellFocus(1, 0);
      expect(nav.handleKey(key('ArrowRight'))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 1, col: 1 });
    });

    it('collapses an expanded row on the logical collapse key', () => {
      const { hooks, toggles } = makeTree({
        expandable: () => true,
        expanded: () => true,
      });
      const { nav } = createNav({ flatNodes: ALL_DATA, tree: hooks });
      nav.onCellFocus(1, 0);
      expect(nav.handleKey(key('ArrowLeft'))).toBe(true);
      expect(toggles).toEqual([{ row: 1, expand: false }]);
    });

    it('jumps to the parent when the row is a leaf or collapsed', () => {
      const { hooks } = makeTree({ parent: (row) => (row > 0 ? 0 : -1) });
      const { nav } = createNav({ flatNodes: ALL_DATA, tree: hooks });
      nav.onCellFocus(2, 0);
      expect(nav.handleKey(key('ArrowLeft'))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 0, col: 0 });
    });

    it('falls through to a column move on a root leaf', () => {
      const { hooks, toggles } = makeTree(); // nothing expandable, no parents
      const { nav } = createNav({ flatNodes: ALL_DATA, tree: hooks });
      nav.onCellFocus(0, 0);
      const cell = nav.focusedCell();
      expect(nav.handleKey(key('ArrowLeft'))).toBe(true); // clamped col move
      expect(nav.focusedCell()).toBe(cell);
      expect(nav.handleKey(key('ArrowRight'))).toBe(true); // leaf expand key → column move
      expect(nav.focusedCell()).toEqual({ row: 0, col: 1 });
      expect(toggles).toEqual([]);
    });

    it('swaps the logical expand/collapse keys in RTL', () => {
      const { hooks, toggles } = makeTree({
        expandable: () => true,
        expanded: (row) => row === 1,
      });
      const { nav } = createNav({
        flatNodes: ALL_DATA,
        rtl: true,
        tree: hooks,
      });
      nav.onCellFocus(2, 0); // collapsed
      expect(nav.handleKey(key('ArrowLeft'))).toBe(true); // logical expand in RTL
      expect(toggles).toEqual([{ row: 2, expand: true }]);
      nav.onCellFocus(1, 0); // expanded
      expect(nav.handleKey(key('ArrowRight'))).toBe(true); // logical collapse in RTL
      expect(toggles).toEqual([
        { row: 2, expand: true },
        { row: 1, expand: false },
      ]);
    });

    it('ignores tree semantics outside column 0', () => {
      const { hooks, toggles } = makeTree({
        expandable: () => true,
        expanded: () => false,
      });
      const { nav } = createNav({ flatNodes: ALL_DATA, tree: hooks });
      nav.onCellFocus(1, 1);
      expect(nav.handleKey(key('ArrowRight'))).toBe(true);
      expect(nav.focusedCell()).toEqual({ row: 1, col: 2 });
      expect(toggles).toEqual([]);
    });
  });
});
