import {
  pivotChipKeyIntent,
  pivotGridExtent,
  pivotGridKeyTarget,
  pivotHeaderCellAt,
  pivotKeyboardPointer,
  pivotMenuKeyTarget,
  type OgePivotGridNavContext,
} from './pivot-keyboard';
import type { OgePivotHeaderCell } from './pivot-types';

const header = (
  text: string,
  rowStart: number,
  rowEnd: number,
  columnStart: number,
  span: number,
): OgePivotHeaderCell => ({
  text,
  path: [text],
  level: rowStart - 1,
  expanded: span > 1,
  hasChildren: span > 1,
  isTotal: false,
  isGrandTotal: false,
  rowStart,
  rowEnd,
  columnStart,
  span,
});

// two header rows: "2024" spans Q1 + Q2 + its subtotal slot, "Grand Total"
// spans both rows; three value rows
const CELLS = [
  header('2024', 1, 2, 1, 3),
  header('Q1', 2, 3, 1, 1),
  header('Q2', 2, 3, 2, 1),
  header('2024 Total', 2, 3, 3, 1),
  header('Grand Total', 1, 3, 4, 1),
];
const CTX: OgePivotGridNavContext = {
  headerDepth: 2,
  rowCount: 3,
  columnCount: 4,
  headerCells: CELLS,
};
const key = (k: string, extra: Record<string, boolean> = {}) => ({
  key: k,
  ...extra,
});

describe('pivotHeaderCellAt / pivotGridExtent', () => {
  it('finds the spanning header that covers a position', () => {
    expect(pivotHeaderCellAt(CELLS, 0, 2)?.text).toBe('2024');
    expect(pivotHeaderCellAt(CELLS, 1, 4)?.text).toBe('Grand Total');
    expect(pivotHeaderCellAt(CELLS, 1, 2)?.text).toBe('Q2');
  });

  it('maps positions to element extents; the corner is not navigable', () => {
    expect(pivotGridExtent({ row: 0, col: 0 }, CTX)).toBeNull();
    expect(pivotGridExtent({ row: 0, col: 2 }, CTX)).toEqual({
      rowStart: 0,
      rowEnd: 1,
      colStart: 1,
      colEnd: 4,
    });
    expect(pivotGridExtent({ row: 2, col: 0 }, CTX)).toEqual({
      rowStart: 2,
      rowEnd: 3,
      colStart: 0,
      colEnd: 1,
    });
    expect(pivotGridExtent({ row: 5, col: 0 }, CTX)).toBeNull();
    expect(pivotGridExtent({ row: 2, col: 5 }, CTX)).toBeNull();
  });
});

describe('pivotGridKeyTarget', () => {
  it('steps over a spanning header as one stop', () => {
    expect(
      pivotGridKeyTarget(key('ArrowRight'), { row: 0, col: 1 }, CTX),
    ).toEqual({ row: 0, col: 4 });
    expect(
      pivotGridKeyTarget(key('ArrowLeft'), { row: 0, col: 4 }, CTX),
    ).toEqual({ row: 0, col: 3 });
  });

  it('keeps the origin column when moving down out of a span', () => {
    expect(
      pivotGridKeyTarget(key('ArrowDown'), { row: 0, col: 2 }, CTX),
    ).toEqual({ row: 1, col: 2 });
    // the two-row grand total drops straight to the first value row
    expect(
      pivotGridKeyTarget(key('ArrowDown'), { row: 0, col: 4 }, CTX),
    ).toEqual({ row: 2, col: 4 });
  });

  it('moves between headers and value cells', () => {
    expect(pivotGridKeyTarget(key('ArrowUp'), { row: 2, col: 1 }, CTX)).toEqual(
      { row: 1, col: 1 },
    );
    expect(
      pivotGridKeyTarget(key('ArrowLeft'), { row: 2, col: 1 }, CTX),
    ).toEqual({ row: 2, col: 0 });
  });

  it('stays at the edges and never lands on the corner', () => {
    expect(pivotGridKeyTarget(key('ArrowUp'), { row: 2, col: 0 }, CTX)).toEqual(
      { row: 2, col: 0 },
    );
    expect(
      pivotGridKeyTarget(key('ArrowLeft'), { row: 1, col: 1 }, CTX),
    ).toEqual({ row: 1, col: 1 });
    expect(
      pivotGridKeyTarget(key('ArrowDown'), { row: 4, col: 3 }, CTX),
    ).toEqual({ row: 4, col: 3 });
  });

  it('jumps with Home/End and Ctrl+Home/End', () => {
    expect(pivotGridKeyTarget(key('Home'), { row: 3, col: 3 }, CTX)).toEqual({
      row: 3,
      col: 0,
    });
    expect(pivotGridKeyTarget(key('Home'), { row: 1, col: 3 }, CTX)).toEqual({
      row: 1,
      col: 1,
    });
    expect(pivotGridKeyTarget(key('End'), { row: 3, col: 0 }, CTX)).toEqual({
      row: 3,
      col: 4,
    });
    expect(
      pivotGridKeyTarget(
        key('Home', { ctrlKey: true }),
        { row: 3, col: 3 },
        CTX,
      ),
    ).toEqual({ row: 0, col: 1 });
    expect(
      pivotGridKeyTarget(
        key('End', { ctrlKey: true }),
        { row: 2, col: 0 },
        CTX,
      ),
    ).toEqual({ row: 4, col: 4 });
  });

  it('mirrors the horizontal arrows in RTL and ignores other keys', () => {
    expect(
      pivotGridKeyTarget(key('ArrowLeft'), { row: 2, col: 1 }, CTX, true),
    ).toEqual({ row: 2, col: 2 });
    expect(
      pivotGridKeyTarget(
        key('ArrowRight', { ctrlKey: true }),
        { row: 2, col: 1 },
        CTX,
      ),
    ).toBeNull();
    expect(pivotGridKeyTarget(key('a'), { row: 2, col: 1 }, CTX)).toBeNull();
    expect(
      pivotGridKeyTarget(key('ArrowUp'), { row: 0, col: 0 }, CTX),
    ).toBeNull();
  });
});

describe('pivotMenuKeyTarget', () => {
  const items = [{ text: 'a', disabled: true }, { text: 'b' }, { text: 'c' }];

  it('wraps over the enabled items', () => {
    expect(pivotMenuKeyTarget('ArrowDown', 1, items)).toBe(2);
    expect(pivotMenuKeyTarget('ArrowDown', 2, items)).toBe(1);
    expect(pivotMenuKeyTarget('ArrowUp', 1, items)).toBe(2);
    expect(pivotMenuKeyTarget('Home', 2, items)).toBe(1);
    expect(pivotMenuKeyTarget('End', 1, items)).toBe(2);
    expect(pivotMenuKeyTarget('ArrowDown', -1, items)).toBe(1);
  });

  it('closes on Escape / Tab and ignores the rest', () => {
    expect(pivotMenuKeyTarget('Escape', 1, items)).toBe('close');
    expect(pivotMenuKeyTarget('Tab', 1, items)).toBe('close');
    expect(pivotMenuKeyTarget('x', 1, items)).toBeNull();
    expect(
      pivotMenuKeyTarget('ArrowDown', 0, [{ text: 'x', disabled: true }]),
    ).toBeNull();
  });
});

describe('pivotChipKeyIntent', () => {
  it('opens the menu from Enter, Space, Shift+F10 and the menu key', () => {
    for (const event of [
      key('Enter'),
      key(' '),
      key('F10', { shiftKey: true }),
      key('ContextMenu'),
    ])
      expect(pivotChipKeyIntent(event, false)).toEqual({ kind: 'menu' });
  });

  it('reorders, changes area and removes only inside an area', () => {
    const ctrl = { ctrlKey: true };
    expect(pivotChipKeyIntent(key('ArrowRight', ctrl), true)).toEqual({
      kind: 'reorder',
      delta: 1,
    });
    expect(
      pivotChipKeyIntent(key('ArrowLeft', { metaKey: true }), true),
    ).toEqual({ kind: 'reorder', delta: -1 });
    expect(pivotChipKeyIntent(key('ArrowRight', ctrl), true, true)).toEqual({
      kind: 'reorder',
      delta: -1,
    });
    expect(pivotChipKeyIntent(key('ArrowDown', ctrl), true)).toEqual({
      kind: 'area',
      delta: 1,
    });
    expect(pivotChipKeyIntent(key('ArrowUp', ctrl), true)).toEqual({
      kind: 'area',
      delta: -1,
    });
    expect(pivotChipKeyIntent(key('Delete'), true)).toEqual({ kind: 'remove' });
    expect(pivotChipKeyIntent(key('Delete'), false)).toBeNull();
    expect(pivotChipKeyIntent(key('ArrowRight'), true)).toBeNull();
  });
});

describe('pivotKeyboardPointer', () => {
  it('anchors below the element and forwards the event calls', () => {
    const calls: string[] = [];
    const pointer = pivotKeyboardPointer(
      {
        preventDefault: () => calls.push('prevent'),
        stopPropagation: () => calls.push('stop'),
      },
      { left: 12, bottom: 40 },
    );
    expect([pointer.clientX, pointer.clientY]).toEqual([12, 40]);
    pointer.preventDefault();
    pointer.stopPropagation();
    expect(calls).toEqual(['prevent', 'stop']);
  });
});
