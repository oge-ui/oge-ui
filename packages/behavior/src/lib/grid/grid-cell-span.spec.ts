import { describe, expect, it } from 'vitest';
import type { RowNode } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { OGE_NO_SPANS, computeOgeGridSpans } from './grid-cell-span';
import { OgeGridKeyboardNavCore } from './grid-keyboard-nav';

interface Row {
  region: string;
  city: string;
  note: string;
}

const data = (key: string, row: Row, i: number): RowNode<Row> => ({
  kind: 'data',
  key,
  data: row,
  sourceIndex: i,
  level: 0,
});

const group: RowNode<Row> = {
  kind: 'group',
  key: 'g',
  groupField: 'region',
  groupValue: 'x',
  level: 0,
  expanded: true,
  childCount: 0,
  summaries: [],
};

/** 0..2 data (EU, EU, EU), 3 group, 4..5 data (EU, US) */
const nodes: RowNode<Row>[] = [
  data('a', { region: 'EU', city: 'Rome', note: 'wide' }, 0),
  data('b', { region: 'EU', city: 'Oslo', note: '' }, 1),
  data('c', { region: 'EU', city: 'Lyon', note: '' }, 2),
  group,
  data('d', { region: 'EU', city: 'Kyiv', note: '' }, 3),
  data('e', { region: 'US', city: 'Reno', note: '' }, 4),
];

const columns = [
  { field: 'region', accessor: (r: Row) => r.region, mergeCells: true },
  { field: 'city', accessor: (r: Row) => r.city },
  { field: 'note', accessor: (r: Row) => r.note },
];

describe('cell spans', () => {
  it('is the empty layout without spans', () => {
    expect(
      computeOgeGridSpans({
        nodes,
        columns: columns.map((c) => ({ ...c, mergeCells: false })),
      }),
    ).toBe(OGE_NO_SPANS);
  });

  it('merges equal adjacent values without crossing non-data rows', () => {
    const layout = computeOgeGridSpans({ nodes, columns });
    expect(layout.extentOf(0, 0)).toEqual({ rowSpan: 3, colSpan: 1 });
    expect(layout.ownerOf(2, 0)).toEqual({ row: 0, col: 0 });
    // the group row ends the run: row 4 starts its own (single) cell
    expect(layout.extentOf(4, 0)).toBeNull();
    expect(layout.ownerOf(4, 0)).toBeNull();
  });

  it('applies cellSpan first and truncates later overlaps', () => {
    const layout = computeOgeGridSpans({
      nodes,
      columns,
      cellSpan: (row, column) =>
        row.note === 'wide' && column.field === 'city' ? { colSpan: 5 } : null,
    });
    // clamped to the column count
    expect(layout.extentOf(0, 1)).toEqual({ rowSpan: 1, colSpan: 2 });
    expect(layout.ownerOf(0, 2)).toEqual({ row: 0, col: 1 });
    expect(layout.extentOf(0, 0)).toEqual({ rowSpan: 3, colSpan: 1 });
  });

  it('routes the keyboard past a merged area and into its owner', () => {
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
    const layout = computeOgeGridSpans({ nodes, columns });
    const nav = new OgeGridKeyboardNavCore<Row>(
      {
        flatNodes: () => nodes,
        columnCount: () => 3,
        rtl: () => false,
        pageSize: () => 2,
        spans: () => layout,
      },
      rx,
    );
    const key = (k: string) => ({ key: k }) as KeyboardEvent;
    nav.focusedCell.set({ row: 0, col: 0 });
    nav.handleKey(key('ArrowDown'));
    // rows 1 and 2 are covered by the owner: the move lands on row 4
    expect(nav.focusedCell()).toEqual({ row: 4, col: 0 });
    nav.focusedCell.set({ row: 2, col: 1 });
    nav.handleKey(key('ArrowLeft'));
    // (2,0) is covered: focus snaps to its owner
    expect(nav.focusedCell()).toEqual({ row: 0, col: 0 });
  });
});
