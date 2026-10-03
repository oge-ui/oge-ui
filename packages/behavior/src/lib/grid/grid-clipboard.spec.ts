import { describe, expect, it } from 'vitest';
import {
  buildOgeRangeTsv,
  ogeFillSeries,
  ogeFillTarget,
  ogeGridEditShortcut,
  ogeKeyboardFillPlan,
  parseLocaleNumber,
  parseOgeCellText,
  parseOgeTsv,
  planOgeGridPaste,
} from './grid-clipboard';
import { ogeRangeLattice } from './grid-range-selection';

const messages = {
  booleanTrue: '✓',
  booleanFalse: '✗',
  booleanTrueLabel: 'Yes',
  booleanFalseLabel: 'No',
};

describe('range TSV copy', () => {
  const lattice = ogeRangeLattice(
    [{ anchor: { row: 0, col: 0 }, focus: { row: 1, col: 1 } }],
    () => true,
  );
  const cells = [
    ['Ada', '=HYPERLINK("x")'],
    ['tab\there', '12'],
  ];

  it('writes rows × columns with quoting and the formula guard', () => {
    const tsv = buildOgeRangeTsv(
      lattice,
      (row, col) => cells[row][col],
      (col) => ['Name', 'Note'][col],
    );
    expect(tsv).toBe(
      `Ada\t"'=HYPERLINK(""x"")"\r\n"tab\there"\t12`,
    );
  });

  it('prepends guarded captions with headers: true', () => {
    const tsv = buildOgeRangeTsv(
      lattice,
      (row, col) => cells[row][col],
      (col) => ['Name', '+Note'][col],
      { headers: true },
    );
    expect(tsv.split('\r\n')[0]).toBe("Name\t'+Note");
  });

  it('copies the gaps of several ranges as empty cells', () => {
    const multi = ogeRangeLattice(
      [
        { anchor: { row: 0, col: 0 }, focus: { row: 0, col: 0 } },
        { anchor: { row: 1, col: 1 }, focus: { row: 1, col: 1 } },
      ],
      () => true,
    );
    expect(
      buildOgeRangeTsv(multi, (r, c) => `${r}${c}`, () => ''),
    ).toBe('00\t\r\n\t11');
  });
});

describe('TSV paste parsing', () => {
  it('splits cells and lines, honours quotes, ignores the trailing break', () => {
    expect(parseOgeTsv('a\tb\r\nc\td\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseOgeTsv('"x\ty"\t"say ""hi"""\n"two\nlines"')).toEqual([
      ['x\ty', 'say "hi"'],
      ['two\nlines'],
    ]);
    expect(parseOgeTsv('only')).toEqual([['only']]);
    expect(parseOgeTsv('a\t\tb')).toEqual([['a', '', 'b']]);
  });

  it('lays a block onto data rows below the start, skipping group rows', () => {
    const plan = planOgeGridPaste(
      [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
      ],
      { row: 0, col: 1 },
      { rowCount: 3, columnCount: 3, isDataRow: (row) => row !== 1 },
    );
    expect(plan.cells).toEqual([
      { row: 0, col: 1, value: '1' },
      { row: 0, col: 2, value: '2' },
      { row: 2, col: 1, value: '4' },
      { row: 2, col: 2, value: '5' },
    ]);
    // the third line runs past the last row
    expect(plan.extraRows).toEqual([
      [
        { row: -1, col: 1, value: '7' },
        { row: -1, col: 2, value: '8' },
      ],
    ]);
  });

  it('fills a multi-cell selection with a single copied value', () => {
    const plan = planOgeGridPaste(
      [['x']],
      { row: 0, col: 0 },
      {
        rowCount: 5,
        columnCount: 3,
        isDataRow: () => true,
        selection: { anchor: { row: 1, col: 0 }, focus: { row: 2, col: 1 } },
      },
    );
    expect(plan.cells.map((c) => `${c.row}${c.col}`)).toEqual([
      '10',
      '11',
      '20',
      '21',
    ]);
  });
});

describe('cell text parsing', () => {
  it('parses numbers in the locale and as plain literals', () => {
    expect(parseLocaleNumber('1,234.5', 'en-US')).toBe(1234.5);
    expect(parseLocaleNumber('1.234,5', 'de-DE')).toBe(1234.5);
    expect(parseLocaleNumber('-3e2', 'de-DE')).toBe(-300);
    expect(parseLocaleNumber('abc', 'en-US')).toBeNull();
    expect(
      parseOgeCellText('12', { dataType: 'number' }, messages),
    ).toEqual({ ok: true, value: 12 });
    expect(parseOgeCellText('x', { dataType: 'number' }, messages)).toEqual({
      ok: false,
    });
    expect(parseOgeCellText(' ', { dataType: 'number' }, messages)).toEqual({
      ok: true,
      value: null,
    });
  });

  it('parses ISO dates as local dates', () => {
    const result = parseOgeCellText(
      '2026-03-14',
      { dataType: 'date' },
      messages,
    );
    expect(result.ok).toBe(true);
    const date = (result as { value: Date }).value;
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
      2026, 2, 14,
    ]);
  });

  it('parses booleans from words and glyphs', () => {
    const column = { dataType: 'boolean' as const };
    expect(parseOgeCellText('Yes', column, messages)).toEqual({
      ok: true,
      value: true,
    });
    expect(parseOgeCellText('✗', column, messages)).toEqual({
      ok: true,
      value: false,
    });
    expect(parseOgeCellText('maybe', column, messages)).toEqual({ ok: false });
  });

  it('maps lookup display text back to the stored value', () => {
    const column = {
      dataType: 'number' as const,
      lookupItems: [
        { value: 1, text: 'İstanbul' },
        { value: 2, text: 'Ankara' },
      ],
    };
    expect(parseOgeCellText('istanbul', column, messages)).toEqual({
      ok: true,
      value: 1,
    });
    expect(parseOgeCellText('2', column, messages)).toEqual({
      ok: true,
      value: 2,
    });
    expect(parseOgeCellText('Izmir', column, messages)).toEqual({ ok: false });
  });
});

describe('fill', () => {
  it('extends arithmetic number series and repeats anything else', () => {
    expect(ogeFillSeries([1, 3], 3)).toEqual([5, 7, 9]);
    expect(ogeFillSeries([0.1, 0.2], 2)).toEqual([0.3, 0.4]);
    expect(ogeFillSeries([5], 2)).toEqual([5, 5]);
    expect(ogeFillSeries([1, 5, 2], 4)).toEqual([1, 5, 2, 1]);
    expect(ogeFillSeries(['a', 'b'], 3)).toEqual(['a', 'b', 'a']);
  });

  it('walks a series backwards for fill up / left', () => {
    expect(ogeFillSeries([10, 20], 2, true)).toEqual([0, -10]);
  });

  it('extends dates by whole days and numbered texts', () => {
    const out = ogeFillSeries(
      [new Date(2026, 2, 28), new Date(2026, 2, 29)],
      2,
    ) as Date[];
    expect(out.map((d) => d.getDate())).toEqual([30, 31]);
    expect(ogeFillSeries(['Item 08', 'Item 09'], 2)).toEqual([
      'Item 10',
      'Item 11',
    ]);
  });

  it('picks the fill direction from where the pointer left the range', () => {
    const source = { top: 1, bottom: 2, left: 1, right: 1 };
    expect(ogeFillTarget(source, { row: 4, col: 1 })?.target).toEqual({
      top: 3,
      bottom: 4,
      left: 1,
      right: 1,
    });
    expect(ogeFillTarget(source, { row: 2, col: 3 })?.direction).toBe('right');
    expect(ogeFillTarget(source, { row: 2, col: 1 })).toBeNull();
  });

  it('plans Ctrl+D / Ctrl+R copy fills Excel style', () => {
    const range = { top: 2, bottom: 4, left: 0, right: 1 };
    expect(ogeKeyboardFillPlan(range, 'down', (r) => r - 1)).toEqual({
      source: { top: 2, bottom: 2, left: 0, right: 1 },
      target: { top: 3, bottom: 4, left: 0, right: 1 },
    });
    const row = { top: 2, bottom: 2, left: 0, right: 0 };
    expect(ogeKeyboardFillPlan(row, 'down', () => 1)?.source.top).toBe(1);
    expect(ogeKeyboardFillPlan(row, 'down', () => -1)).toBeNull();
    expect(ogeKeyboardFillPlan(row, 'right', () => -1)).toBeNull();
  });

  it('maps the edit shortcuts', () => {
    expect(ogeGridEditShortcut({ key: 'z', ctrlKey: true })).toBe('undo');
    expect(ogeGridEditShortcut({ key: 'Z', metaKey: true, shiftKey: true })).toBe(
      'redo',
    );
    expect(ogeGridEditShortcut({ key: 'y', ctrlKey: true })).toBe('redo');
    expect(ogeGridEditShortcut({ key: 'd', ctrlKey: true })).toBe('fillDown');
    expect(ogeGridEditShortcut({ key: 'r', ctrlKey: true })).toBe('fillRight');
    expect(ogeGridEditShortcut({ key: 'd' })).toBeNull();
  });
});
