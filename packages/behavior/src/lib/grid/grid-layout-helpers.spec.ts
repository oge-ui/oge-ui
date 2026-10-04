import { describe, expect, it } from 'vitest';
import type { RowNode } from '@oge-ui/core';
import {
  ogeFirstVisibleRow,
  ogeIsTextTruncated,
  ogeMeasureAutoWidth,
  ogeStickyGroupChain,
} from './grid-auto-fit';
import { ogeGroupValueText } from './grid-grouping';
import {
  ogePagerInfoContext,
  ogePagerPages,
  ogeParsePageInput,
} from './grid-pager';
import {
  findOgeRowDragParticipant,
  ogeRowDropPosition,
  registerOgeRowDragParticipant,
  type OgeRowDragParticipant,
} from './grid-row-drag-group';

const box = (scrollWidth: number, clientWidth = 0): Element => {
  const element = document.createElement('div');
  Object.defineProperty(element, 'scrollWidth', { value: scrollWidth });
  Object.defineProperty(element, 'clientWidth', { value: clientWidth });
  Object.defineProperty(element, 'scrollHeight', { value: 10 });
  Object.defineProperty(element, 'clientHeight', { value: 10 });
  return element;
};

describe('auto-fit and overflow hint', () => {
  it('fits the widest of header and cells, with slack', () => {
    expect(ogeMeasureAutoWidth(box(80), [box(120.4), box(60)])).toBe(123);
    expect(ogeMeasureAutoWidth(null, [])).toBeNull();
  });

  it('detects truncated text', () => {
    expect(ogeIsTextTruncated(box(200, 100))).toBe(true);
    expect(ogeIsTextTruncated(box(100, 100))).toBe(false);
    expect(ogeIsTextTruncated(null)).toBe(false);
  });
});

describe('sticky group rows', () => {
  const group = (key: string, level: number): RowNode => ({
    kind: 'group',
    key,
    groupField: 'g',
    groupValue: key,
    level,
    expanded: true,
    childCount: 1,
    summaries: [],
  });
  const data = (key: string): RowNode => ({
    kind: 'data',
    key,
    data: {},
    sourceIndex: 0,
    level: 2,
  });
  // 0:A 1:A1 2:d 3:d 4:A2 5:d 6:B 7:B1 8:d
  const nodes = [
    group('A', 0),
    group('A1', 1),
    data('a'),
    data('b'),
    group('A2', 1),
    data('c'),
    group('B', 0),
    group('B1', 1),
    data('d'),
  ];

  it('chains the enclosing groups of the first visible row', () => {
    expect(ogeStickyGroupChain(nodes, 3).map((n) => n.key)).toEqual([
      'A',
      'A1',
    ]);
    expect(ogeStickyGroupChain(nodes, 5).map((n) => n.key)).toEqual([
      'A',
      'A2',
    ]);
    // a group row on top only repeats its parents
    expect(ogeStickyGroupChain(nodes, 7).map((n) => n.key)).toEqual(['B']);
    expect(ogeStickyGroupChain(nodes, 0)).toEqual([]);
  });

  it('finds the first row reaching below a y by binary search', () => {
    const rows = [0, 1, 2, 3].map((index) => {
      const row = document.createElement('div');
      row.dataset['rowindex'] = String(index + 10);
      row.getBoundingClientRect = () =>
        ({ top: index * 30, bottom: index * 30 + 30 }) as DOMRect;
      return row;
    });
    expect(
      ogeFirstVisibleRow(rows, 45, (row) =>
        Number((row as HTMLElement).dataset['rowindex']),
      ),
    ).toBe(11);
    expect(ogeFirstVisibleRow([], 0, () => 0)).toBe(-1);
  });
});

describe('group interval captions', () => {
  const messages = {
    groupWeekPattern: 'Week of {date}',
    groupQuarterPattern: 'Q{quarter} {year}',
    groupRangePattern: '{from} – {to}',
  };

  it('labels quarters, weeks and numeric buckets', () => {
    expect(
      ogeGroupValueText(
        new Date(2026, 3, 1),
        { dataType: 'date' },
        'quarter',
        messages,
      ),
    ).toBe('Q2 2026');
    expect(ogeGroupValueText(100, { dataType: 'number' }, 50, messages)).toBe(
      '100 – 150',
    );
    expect(
      ogeGroupValueText(
        new Date(2026, 3, 6),
        { dataType: 'date' },
        'week',
        messages,
      ).startsWith('Week of'),
    ).toBe(true);
    expect(
      ogeGroupValueText('x', { dataType: 'string' }, undefined, messages),
    ).toBe('x');
  });
});

describe('pager decisions', () => {
  it('windows the page list and parses the go-to-page input', () => {
    expect(ogePagerPages(5, 0)).toEqual([0, 1, 2, 3, 4]);
    expect(ogePagerPages(20, 10)).toEqual([0, 8, 9, 10, 11, 12, 19]);
    expect(ogeParsePageInput('3', 10)).toBe(2);
    expect(ogeParsePageInput('99', 10)).toBe(9);
    expect(ogeParsePageInput('0', 10)).toBe(0);
    expect(ogeParsePageInput('x', 10)).toBeNull();
  });

  it('builds the info slot context', () => {
    expect(
      ogePagerInfoContext({
        pageIndex: 1,
        pageCount: 3,
        totalCount: 25,
        pageSize: 10,
        text: '25 rows',
      }),
    ).toMatchObject({ firstRow: 11, lastRow: 20 });
    expect(
      ogePagerInfoContext({
        pageIndex: 0,
        pageCount: 1,
        totalCount: 0,
        pageSize: 10,
        text: '',
      }),
    ).toMatchObject({ firstRow: 0, lastRow: 0 });
  });
});

describe('row drag groups', () => {
  it('finds the innermost participant of the group containing the hit', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    const cell = document.createElement('span');
    inner.appendChild(cell);
    outer.appendChild(inner);
    const participant = (
      id: string,
      element: Element,
      group = 'g',
    ): OgeRowDragParticipant => ({
      componentId: id,
      group,
      element: () => element,
      resolve: () => null,
      over: () => undefined,
      drop: () => undefined,
    });
    const offs = [
      registerOgeRowDragParticipant(participant('outer', outer)),
      registerOgeRowDragParticipant(participant('inner', inner)),
      registerOgeRowDragParticipant(participant('other', inner, 'h')),
    ];
    expect(findOgeRowDragParticipant(cell, 'g')?.componentId).toBe('inner');
    expect(findOgeRowDragParticipant(outer, 'g')?.componentId).toBe('outer');
    expect(findOgeRowDragParticipant(cell, 'none')).toBeNull();
    offs.forEach((off) => off());
    expect(findOgeRowDragParticipant(cell, 'g')).toBeNull();
  });

  it('splits a row into before / inside / after zones', () => {
    const rect = { top: 0, height: 40 };
    expect(ogeRowDropPosition(rect, 5, true)).toBe('before');
    expect(ogeRowDropPosition(rect, 20, true)).toBe('inside');
    expect(ogeRowDropPosition(rect, 35, true)).toBe('after');
    expect(ogeRowDropPosition(rect, 15, false)).toBe('before');
    expect(ogeRowDropPosition(rect, 25, false)).toBe('after');
  });
});
