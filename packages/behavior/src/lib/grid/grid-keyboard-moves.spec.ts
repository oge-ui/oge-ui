import type { RowNode } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { OgeGridStateCore } from './grid-state-core';
import {
  clampColumnWidth,
  ogeAdjacentDataRow,
  ogeChooserMoveDirection,
  ogeColumnMoveTarget,
  ogeColumnSeparatorKeyCommand,
  ogeColumnWidthBounds,
  ogeGridHeaderKeyCommand,
  ogeGridHeaderKeyShortcuts,
  ogeGroupChipKeyCommand,
  ogeListMoveTarget,
  ogeRowMoveDirection,
  ogeSeparatorTargetWidth,
  ogeTreeRowKeyMove,
  type OgeKeyInput,
  type OgeMovableColumn,
} from './grid-keyboard-moves';

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

function key(
  name: string,
  mods: Partial<Omit<OgeKeyInput, 'key'>> = {},
): OgeKeyInput {
  return {
    key: name,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...mods,
  };
}

describe('ogeGridHeaderKeyCommand', () => {
  it('resizes on Alt+Arrow (10px, Shift 1px) and mirrors in RTL', () => {
    expect(
      ogeGridHeaderKeyCommand(key('ArrowRight', { altKey: true }), false),
    ).toEqual({ kind: 'resize', delta: 10 });
    expect(
      ogeGridHeaderKeyCommand(key('ArrowLeft', { altKey: true }), false),
    ).toEqual({ kind: 'resize', delta: -10 });
    expect(
      ogeGridHeaderKeyCommand(
        key('ArrowRight', { altKey: true, shiftKey: true }),
        false,
      ),
    ).toEqual({ kind: 'resize', delta: 1 });
    // RTL: the resize edge is the physical left — ArrowLeft widens
    expect(
      ogeGridHeaderKeyCommand(key('ArrowLeft', { altKey: true }), true),
    ).toEqual({ kind: 'resize', delta: 10 });
  });

  it('moves on Ctrl+Shift+Arrow (Meta too), logical in RTL', () => {
    expect(
      ogeGridHeaderKeyCommand(
        key('ArrowRight', { ctrlKey: true, shiftKey: true }),
        false,
      ),
    ).toEqual({ kind: 'move', direction: 1 });
    expect(
      ogeGridHeaderKeyCommand(
        key('ArrowLeft', { metaKey: true, shiftKey: true }),
        false,
      ),
    ).toEqual({ kind: 'move', direction: -1 });
    expect(
      ogeGridHeaderKeyCommand(
        key('ArrowRight', { ctrlKey: true, shiftKey: true }),
        true,
      ),
    ).toEqual({ kind: 'move', direction: -1 });
  });

  it('leaves plain arrows, Ctrl+Arrow and other keys to the grid', () => {
    expect(ogeGridHeaderKeyCommand(key('ArrowRight'), false)).toBeNull();
    expect(
      ogeGridHeaderKeyCommand(key('ArrowRight', { ctrlKey: true }), false),
    ).toBeNull();
    expect(
      ogeGridHeaderKeyCommand(key('ArrowDown', { altKey: true }), false),
    ).toBeNull();
    expect(
      ogeGridHeaderKeyCommand(
        key('ArrowRight', { altKey: true, ctrlKey: true }),
        false,
      ),
    ).toBeNull();
  });

  it('advertises only the enabled shortcuts', () => {
    expect(ogeGridHeaderKeyShortcuts({ resize: true, move: true })).toBe(
      'Alt+ArrowLeft Alt+ArrowRight Control+Shift+ArrowLeft Control+Shift+ArrowRight',
    );
    expect(ogeGridHeaderKeyShortcuts({ resize: false, move: true })).toBe(
      'Control+Shift+ArrowLeft Control+Shift+ArrowRight',
    );
    expect(ogeGridHeaderKeyShortcuts({ resize: false, move: false })).toBe(
      null,
    );
  });
});

describe('column separator keys and bounds', () => {
  it('maps the APG window-splitter keys', () => {
    expect(ogeColumnSeparatorKeyCommand(key('ArrowRight'), false)).toEqual({
      kind: 'resize',
      delta: 10,
    });
    expect(
      ogeColumnSeparatorKeyCommand(key('ArrowLeft', { shiftKey: true }), true),
    ).toEqual({ kind: 'resize', delta: 1 });
    expect(ogeColumnSeparatorKeyCommand(key('Home'), false)).toEqual({
      kind: 'min',
    });
    expect(ogeColumnSeparatorKeyCommand(key('End'), false)).toEqual({
      kind: 'max',
    });
    expect(ogeColumnSeparatorKeyCommand(key('Escape'), false)).toEqual({
      kind: 'exit',
    });
    expect(ogeColumnSeparatorKeyCommand(key('Enter'), false)).toEqual({
      kind: 'exit',
    });
    expect(ogeColumnSeparatorKeyCommand(key('Tab'), false)).toBeNull();
    expect(
      ogeColumnSeparatorKeyCommand(key('ArrowRight', { altKey: true }), false),
    ).toBeNull();
  });

  it('clamps to minWidth / maxWidth with a 50px floor', () => {
    const bounds = ogeColumnWidthBounds(80, 200, 1000);
    expect(bounds).toEqual({ min: 80, max: 200 });
    expect(clampColumnWidth(30, bounds)).toBe(80);
    expect(clampColumnWidth(250, bounds)).toBe(200);
    expect(clampColumnWidth(120.4, bounds)).toBe(120);
    expect(ogeColumnWidthBounds(undefined, undefined, 900)).toEqual({
      min: 50,
      max: 900,
    });
    expect(ogeColumnWidthBounds(10, undefined, 20)).toEqual({
      min: 50,
      max: 50,
    });
    // a maxWidth below the min never inverts the range
    expect(ogeColumnWidthBounds(120, 60, 900)).toEqual({ min: 120, max: 120 });
  });

  it('turns a separator command into a target width', () => {
    const bounds = { min: 60, max: 300 };
    expect(
      ogeSeparatorTargetWidth({ kind: 'resize', delta: 10 }, 295, bounds),
    ).toBe(300);
    expect(ogeSeparatorTargetWidth({ kind: 'min' }, 200, bounds)).toBe(60);
    expect(ogeSeparatorTargetWidth({ kind: 'max' }, 200, bounds)).toBe(300);
    expect(ogeSeparatorTargetWidth({ kind: 'exit' }, 200, bounds)).toBeNull();
  });
});

describe('ogeColumnMoveTarget', () => {
  const col = (
    id: string,
    pinned: OgeMovableColumn['pinned'] = false,
    bandCaption?: string,
  ): OgeMovableColumn => ({ id, pinned, bandCaption });

  it('steps one column and stops at the edges', () => {
    const columns = [col('a'), col('b'), col('c')];
    expect(ogeColumnMoveTarget(columns, 'a', 1)).toEqual({
      anchorId: 'b',
      position: 'after',
      toIndex: 1,
    });
    expect(ogeColumnMoveTarget(columns, 'c', -1)).toEqual({
      anchorId: 'b',
      position: 'before',
      toIndex: 1,
    });
    expect(ogeColumnMoveTarget(columns, 'a', -1)).toBeNull();
    expect(ogeColumnMoveTarget(columns, 'c', 1)).toBeNull();
    expect(ogeColumnMoveTarget(columns, 'zz', 1)).toBeNull();
  });

  it('never crosses a pinned-group boundary', () => {
    const columns = [col('p', 'left'), col('a'), col('b'), col('r', 'right')];
    expect(ogeColumnMoveTarget(columns, 'a', -1)).toBeNull();
    expect(ogeColumnMoveTarget(columns, 'b', 1)).toBeNull();
    expect(ogeColumnMoveTarget(columns, 'p', 1)).toBeNull();
  });

  it('keeps banded columns inside their band and steps over whole bands', () => {
    const columns = [
      col('a'),
      col('x1', false, 'X'),
      col('x2', false, 'X'),
      col('b'),
    ];
    expect(ogeColumnMoveTarget(columns, 'x1', 1)).toEqual({
      anchorId: 'x2',
      position: 'after',
      toIndex: 2,
    });
    expect(ogeColumnMoveTarget(columns, 'x1', -1)).toBeNull();
    expect(ogeColumnMoveTarget(columns, 'x2', 1)).toBeNull();
    expect(ogeColumnMoveTarget(columns, 'a', 1)).toEqual({
      anchorId: 'x2',
      position: 'after',
      toIndex: 2,
    });
    expect(ogeColumnMoveTarget(columns, 'b', -1)).toEqual({
      anchorId: 'x1',
      position: 'before',
      toIndex: 1,
    });
  });

  it('applies through the column state exactly where it says', () => {
    const state = new OgeGridStateCore(rx);
    const base = ['a', 'b', 'c', 'd'];
    const target = ogeColumnMoveTarget(
      base.map((id) => col(id)),
      'a',
      1,
    );
    expect(target).not.toBeNull();
    if (!target) return;
    state.columns.reorder(base, 'a', target.anchorId, target.position);
    expect(state.columns.order()).toEqual(['b', 'a', 'c', 'd']);
    // after the last column: the end of the order
    state.columns.reorder(['b', 'a', 'c', 'd'], 'b', 'd', 'after');
    expect(state.columns.order()).toEqual(['a', 'c', 'd', 'b']);
  });

  it('merges ids missing from a stored order at their base position', () => {
    const state = new OgeGridStateCore(rx);
    state.columns.setOrder(['b', 'a']);
    state.columns.reorder(['b', 'a', 'c'], 'b', 'c', 'after');
    expect(state.columns.order()).toEqual(['a', 'c', 'b']);
  });

  it('steps through a flat id list (column chooser)', () => {
    expect(ogeListMoveTarget(['a', 'b'], 'a', 1)).toEqual({
      anchorId: 'b',
      position: 'after',
      toIndex: 1,
    });
    expect(ogeListMoveTarget(['a', 'b'], 'a', -1)).toBeNull();
    expect(ogeListMoveTarget(['a', 'b'], 'q', 1)).toBeNull();
  });
});

describe('row, tree, group and chooser keys', () => {
  it('moves grid rows on Ctrl/Meta+ArrowUp/Down only', () => {
    expect(ogeRowMoveDirection(key('ArrowDown', { ctrlKey: true }))).toBe(1);
    expect(ogeRowMoveDirection(key('ArrowUp', { metaKey: true }))).toBe(-1);
    expect(ogeRowMoveDirection(key('ArrowDown'))).toBeNull();
    expect(
      ogeRowMoveDirection(key('ArrowDown', { ctrlKey: true, shiftKey: true })),
    ).toBeNull();
    expect(ogeChooserMoveDirection(key('ArrowUp', { ctrlKey: true }))).toBe(-1);
  });

  it('finds the adjacent data row, skipping group rows', () => {
    const nodes = [
      { kind: 'group' },
      { kind: 'data' },
      { kind: 'group' },
      { kind: 'data' },
    ] as unknown as RowNode<unknown>[];
    expect(ogeAdjacentDataRow(nodes, 1, 1)).toBe(3);
    expect(ogeAdjacentDataRow(nodes, 3, -1)).toBe(1);
    expect(ogeAdjacentDataRow(nodes, 1, -1)).toBe(-1);
    expect(ogeAdjacentDataRow(nodes, 3, 1)).toBe(-1);
  });

  it('maps tree moves logically', () => {
    const ctrlKey = { ctrlKey: true };
    expect(ogeTreeRowKeyMove(key('ArrowUp', ctrlKey), false)).toBe('up');
    expect(ogeTreeRowKeyMove(key('ArrowDown', ctrlKey), false)).toBe('down');
    expect(ogeTreeRowKeyMove(key('ArrowRight', ctrlKey), false)).toBe('indent');
    expect(ogeTreeRowKeyMove(key('ArrowLeft', ctrlKey), false)).toBe('outdent');
    expect(ogeTreeRowKeyMove(key('ArrowLeft', ctrlKey), true)).toBe('indent');
    expect(ogeTreeRowKeyMove(key('ArrowRight'), false)).toBeNull();
  });

  it('reorders and removes group chips', () => {
    expect(
      ogeGroupChipKeyCommand(key('ArrowRight', { ctrlKey: true }), false),
    ).toEqual({ kind: 'move', direction: 1 });
    expect(
      ogeGroupChipKeyCommand(key('ArrowRight', { ctrlKey: true }), true),
    ).toEqual({ kind: 'move', direction: -1 });
    expect(ogeGroupChipKeyCommand(key('Delete'), false)).toEqual({
      kind: 'remove',
    });
    expect(ogeGroupChipKeyCommand(key('Backspace'), false)).toEqual({
      kind: 'remove',
    });
    expect(ogeGroupChipKeyCommand(key('ArrowRight'), false)).toBeNull();
  });

  it('moves a grouping through the grouping state', () => {
    const state = new OgeGridStateCore(rx);
    state.grouping.groupBy('a');
    state.grouping.groupBy('b');
    expect(state.grouping.move('a', 1)).toBe(1);
    expect(state.grouping.descriptors().map((d) => d.field)).toEqual([
      'b',
      'a',
    ]);
    expect(state.grouping.move('a', 1)).toBe(-1);
    expect(state.grouping.move('zz', -1)).toBe(-1);
  });
});
