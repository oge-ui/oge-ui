import { createOgeWorkbook } from '../model/workbook';
import { ogeCellError, ogeRichText } from '../model/cell';
import { OGE_EN_US_FORMAT_LOCALE } from '../format/format-locale';
import { OgeStyleResolver } from '../paint/resolve-style';
import { OgeSheetLayout } from '../paint/sheet-layout';
import { OgeSpreadsheetCore } from './core';
import {
  OGE_DEFAULT_SPREADSHEET_MESSAGES,
  resolveOgeSpreadsheetMessages,
} from './messages';
import { ogeCopyRange } from './clipboard';
import { ogeFindMatchLabel, ogeFindPattern } from './find';
import {
  ogeCellSelection,
  ogeCurrentRegion,
  ogeDataEdge,
  ogeExpandToMerges,
  ogeSelectionContains,
  ogeSelectionSize,
} from './navigation';
import { createPlainSpreadsheetReactivity } from './reactivity';

describe('messages', () => {
  it('words issues, errors and counts from templates, in the viewer locale', () => {
    const m = OGE_DEFAULT_SPREADSHEET_MESSAGES;
    const say = new OgeSpreadsheetCore({
      reactivity: createPlainSpreadsheetReactivity(),
    });
    expect(m.issues['macros-kept']).toBe('Macros are kept but never run');
    expect(say.formatMessage(m.issuesSummary, { count: 1 })).toBe(
      '1 thing is not shown as in Excel',
    );
    expect(say.formatMessage(m.issuesSummary, { count: 4 })).toBe(
      '4 things are not shown as in Excel',
    );
    expect(m.errors.xlsb).toBe('Binary workbooks (.xlsb) cannot be opened.');
    expect(say.formatMessage(m.copied, { cells: 1 })).toBe('Copied 1 cell');
    expect(say.formatMessage(m.copied, { cells: 1200 })).toBe(
      'Copied 1,200 cells',
    );
    expect(say.formatMessage(m.hasNote, { text: 'x' })).toBe('Note: x');
    expect(say.formatMessage(m.hasNoteBy, { author: 'Ada', text: '{x}' })).toBe(
      'Note by Ada: {x}',
    );
    expect(say.formatMessage(m.zoomLabel, { percent: 150 })).toBe('Zoom 150%');
    expect(say.formatMessage(m.findResult, { index: 2, total: 9 })).toBe(
      '2 of 9',
    );
    expect(resolveOgeSpreadsheetMessages(undefined)).toBe(m);
    expect(resolveOgeSpreadsheetMessages({ find: 'Bul' }).find).toBe('Bul');
  });
});

describe('navigation helpers', () => {
  it('grows ranges through chained merges', () => {
    const sheet = createOgeWorkbook().sheets[0];
    sheet.addMerge({ top: 0, left: 1, bottom: 1, right: 2 });
    sheet.addMerge({ top: 1, left: 3, bottom: 3, right: 3 });
    expect(
      ogeExpandToMerges(sheet, { top: 0, left: 0, bottom: 0, right: 1 }),
    ).toEqual({ top: 0, left: 0, bottom: 1, right: 2 });
    expect(
      ogeExpandToMerges(sheet, { top: 1, left: 2, bottom: 1, right: 3 }),
    ).toEqual({ top: 0, left: 1, bottom: 3, right: 3 });
  });

  it('walks data edges in every direction', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    for (const [r, c] of [
      [5, 5],
      [5, 6],
      [5, 9],
      [2, 5],
      [9, 5],
    ])
      sheet.setCell(r, c, { value: 1 });
    const layout = new OgeSheetLayout(sheet, new OgeStyleResolver(workbook));
    const edge = (row: number, col: number, dr: number, dc: number) =>
      ogeDataEdge(sheet, layout, { row, col }, dr, dc);
    expect(edge(5, 6, 0, -1)).toEqual({ row: 5, col: 5 });
    expect(edge(5, 5, 0, -1)).toEqual({ row: 5, col: 0 });
    expect(edge(5, 9, 0, -1)).toEqual({ row: 5, col: 6 });
    expect(edge(5, 5, -1, 0)).toEqual({ row: 2, col: 5 });
    expect(edge(2, 5, -1, 0)).toEqual({ row: 0, col: 5 });
    expect(edge(0, 0, -1, 0)).toEqual({ row: 0, col: 0 });
    expect(edge(5, 0, 0, 1)).toEqual({ row: 5, col: 5 });
  });

  it('finds the current region and measures selections', () => {
    const sheet = createOgeWorkbook().sheets[0];
    sheet.setCell(1, 1, { value: 1 });
    sheet.setCell(2, 2, { value: 2 });
    sheet.setCell(2, 4, { value: 3 });
    expect(ogeCurrentRegion(sheet, { row: 1, col: 1 })).toEqual({
      top: 1,
      left: 1,
      bottom: 2,
      right: 2,
    });
    expect(ogeCurrentRegion(sheet, { row: 0, col: 0 })).toEqual({
      top: 0,
      left: 0,
      bottom: 2,
      right: 2,
    });
    const selection = {
      ...ogeCellSelection(0, 0),
      ranges: [
        { top: 0, left: 0, bottom: 1, right: 1 },
        { top: 5, left: 5, bottom: 5, right: 5 },
      ],
    };
    expect(ogeSelectionSize(selection)).toBe(5);
    expect(ogeSelectionContains(selection, 5, 5)).toBe(true);
    expect(ogeSelectionContains(selection, 4, 4)).toBe(false);
  });
});

describe('copy and find helpers', () => {
  it('copies booleans, errors, rich text and styles; skips hidden rows and columns', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    const styled = workbook.styles.intern({
      font: {
        italic: true,
        underline: 'single',
        strike: true,
        color: { rgb: 'FF336699' },
      },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'FFFFFF00' } },
      border: {
        top: { style: 'double' },
        left: { style: 'dashed' },
        right: { style: 'thin', color: { rgb: 'FFFF0000' } },
        bottom: { style: 'medium' },
      },
      alignment: { horizontal: 'distributed', vertical: 'top', wrapText: true },
    });
    sheet.setCell(0, 0, { value: true, style: styled });
    sheet.setCell(0, 1, { value: ogeCellError('#DIV/0!') });
    sheet.setCell(0, 2, {
      value: ogeRichText([
        { text: 'ri' },
        { text: 'ch', font: { bold: true } },
      ]),
    });
    sheet.setCell(1, 0, { value: 'hidden row' });
    sheet.setCell(0, 3, { value: 'hidden column' });
    sheet.setCell(2, 0, {
      value: 0.5,
      style: workbook.styles.intern({
        alignment: { horizontal: 'center', vertical: 'center' },
      }),
    });
    sheet.addMerge({ top: 2, left: 1, bottom: 3, right: 2 });
    sheet.setRow(1, { hidden: true });
    sheet.setColumns(3, 3, { hidden: true });
    const resolver = new OgeStyleResolver(workbook);
    const layout = new OgeSheetLayout(sheet, resolver);
    const content = ogeCopyRange(
      workbook,
      sheet,
      layout,
      resolver,
      { top: 0, left: 0, bottom: 2, right: 3 },
      OGE_EN_US_FORMAT_LOCALE,
    );
    expect(content.text).toBe('TRUE\t#DIV/0!\trich\r\n0.5\t\t\r\n');
    expect(content.html).toContain('x:bool="TRUE"');
    expect(content.html).toContain('font-style:italic');
    expect(content.html).toContain('text-decoration:underline line-through');
    expect(content.html).toContain('border-top:3pt double windowtext');
    expect(content.html).toContain('border-left:0.5pt dashed windowtext');
    expect(content.html).toContain('border-right:0.5pt solid #FF0000');
    expect(content.html).toContain('text-align:justify');
    expect(content.html).toContain('vertical-align:top');
    expect(content.html).toContain('white-space:normal');
    expect(content.html).toContain('vertical-align:middle');
    // the merge is cut to the copied range
    expect(content.html).toContain('colspan=2');
    expect(content.html).not.toContain('rowspan');
  });

  it('builds wildcard patterns and labels matches', () => {
    expect(ogeFindPattern('a*b?c').test('aXXbYc')).toBe(true);
    expect(ogeFindPattern('~*').test('*')).toBe(true);
    expect(ogeFindPattern('~?').test('x')).toBe(false);
    expect(ogeFindPattern('1.5').test('125')).toBe(false);
    expect(ogeFindPattern('abc', { entireCell: true }).test('xabc')).toBe(
      false,
    );
    expect(ogeFindPattern('ABC', { matchCase: true }).test('abc')).toBe(false);
    const workbook = createOgeWorkbook();
    expect(ogeFindMatchLabel(workbook, { sheet: 0, row: 2, col: 1 })).toBe(
      'Sheet1!B3',
    );
  });
});

describe('reactivity', () => {
  it('plain cells hold values; derived values recompute', () => {
    const r = createPlainSpreadsheetReactivity();
    const cell = r.cell(1);
    const double = r.derived(() => cell() * 2);
    cell.set(4);
    expect(double()).toBe(8);
  });
});

describe('find and display edges', () => {
  it('skips hidden sheets, searches values when a cell has no formula, ignores an empty query', async () => {
    const { ogeFindAll } = await import('./find');
    const workbook = createOgeWorkbook();
    workbook.sheets[0].setCell(0, 0, { value: 'x' });
    workbook.addSheet('Hidden').state = 'hidden';
    workbook.sheets[1].setCell(0, 0, { value: 'x' });
    workbook.addSheet('Three').setCell(4, 4, { value: 'x' });
    const resolver = new OgeStyleResolver(workbook);
    expect(
      ogeFindAll(workbook, resolver, 'x', 2, OGE_EN_US_FORMAT_LOCALE, {
        workbook: true,
      }).map((m) => m.sheet),
    ).toEqual([2, 0]);
    expect(
      ogeFindAll(workbook, resolver, 'x', 0, OGE_EN_US_FORMAT_LOCALE, {
        formulas: true,
      }),
    ).toHaveLength(1);
    expect(
      ogeFindAll(workbook, resolver, '', 0, OGE_EN_US_FORMAT_LOCALE),
    ).toEqual([]);
  });

  it('formats text through a text section with colour and fill', async () => {
    const { ogeCellDisplay } = await import('../paint/cell-text');
    const workbook = createOgeWorkbook();
    const resolver = new OgeStyleResolver(workbook);
    const style = resolver.get(
      workbook.styles.intern({ numberFormat: '[Blue]"<"@*->"' }),
    );
    const display = ogeCellDisplay({ value: 'hi' }, style, {
      width: 200,
      padding: 5,
      measurer: { measure: (t) => t.length * 7 },
      locale: OGE_EN_US_FORMAT_LOCALE,
      dateSystem: '1900',
    });
    expect(display).toMatchObject({
      text: '<hi>',
      kind: 'text',
      color: '#0000FF',
      fill: { char: '-', index: 3 },
    });
    expect(
      ogeCellDisplay(undefined, style, {
        width: 1,
        padding: 5,
        measurer: { measure: () => 0 },
        locale: OGE_EN_US_FORMAT_LOCALE,
        dateSystem: '1900',
      }),
    ).toBeNull();
  });
});

describe('ogePrintTable', () => {
  it('lays a range out for printing: spans, styles, hidden rows left out, gridlines on request', async () => {
    const { ogePrintTable } = await import('./clipboard');
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    const bold = workbook.styles.intern({
      font: { bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'FFFFFF00' } },
      border: { bottom: { style: 'medium' } },
      alignment: { horizontal: 'center' },
    });
    sheet.setCell(0, 0, { value: 'Title', style: bold });
    sheet.addMerge({ top: 0, left: 0, bottom: 0, right: 1 });
    sheet.setCell(1, 0, { value: 'hidden' });
    sheet.setRow(1, { hidden: true });
    sheet.setCell(2, 0, { value: 12.5 });
    sheet.setCell(2, 1, { value: 'x' });
    const resolver = new OgeStyleResolver(workbook);
    const layout = new OgeSheetLayout(sheet, resolver);
    const table = ogePrintTable(
      workbook,
      sheet,
      layout,
      resolver,
      { top: 0, left: 0, bottom: 2, right: 1 },
      OGE_EN_US_FORMAT_LOCALE,
    );
    expect(table.columns).toEqual([64, 64]);
    expect(table.rows.map((r) => r.cells.map((c) => c.text))).toEqual([
      ['Title'],
      ['12.5', 'x'],
    ]);
    expect(table.rows[0].cells[0]).toMatchObject({
      colSpan: 2,
      rowSpan: 1,
      style: {
        fontWeight: '700',
        background: '#FFFF00',
        borderBottom: '2px solid #000000',
        textAlign: 'center',
      },
    });
    expect(table.rows[1].cells[0].style['textAlign']).toBe('right');
    expect(table.rows[1].cells[1].style['borderTop']).toBeUndefined();
    sheet.pageSetup = { ...sheet.pageSetup, printGridLines: true };
    const gridded = ogePrintTable(
      workbook,
      sheet,
      layout,
      resolver,
      { top: 2, left: 1, bottom: 2, right: 1 },
      OGE_EN_US_FORMAT_LOCALE,
    );
    expect(gridded.rows[0].cells[0].style['borderTop']).toBe(
      '1px solid #c0c0c0',
    );
  });
});
