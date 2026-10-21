import {
  OGE_CELL_ERROR_CODES,
  isOgeCellEmpty,
  isOgeCellError,
  isOgeRichText,
  ogeCellError,
  ogeCellValueType,
  ogeRichText,
  ogeRichTextToString,
  parseOgeCellErrorCode,
} from './cell';
import { OGE_DEFAULT_CELL_STYLE, OgeStyleRegistry } from './style';
import { OGE_DEFAULT_SHEET_VIEW } from './worksheet';
import {
  OGE_DEFAULT_FONT,
  createOgeWorkbook,
  validateOgeDefinedName,
  validateOgeSheetName,
} from './workbook';
import { OGE_SHEET_MAX_COLUMNS, OGE_SHEET_MAX_ROWS } from '../address/address';

describe('cell values', () => {
  it('shares one frozen error value per code', () => {
    expect(ogeCellError('#N/A')).toBe(ogeCellError('#N/A'));
    expect(Object.isFrozen(ogeCellError('#DIV/0!'))).toBe(true);
    expect(isOgeCellError(ogeCellError('#REF!'))).toBe(true);
    expect(isOgeCellError({ kind: 'error', code: '#NOPE' })).toBe(false);
    expect(isOgeCellError('#N/A')).toBe(false);
    expect(OGE_CELL_ERROR_CODES).toHaveLength(16);
  });

  it('reads error literals case-insensitively', () => {
    expect(parseOgeCellErrorCode('#n/a')).toBe('#N/A');
    expect(parseOgeCellErrorCode(' #DIV/0! ')).toBe('#DIV/0!');
    expect(parseOgeCellErrorCode('#WHAT')).toBeNull();
  });

  it('keeps rich text as runs and flattens it on request', () => {
    const rich = ogeRichText([
      { text: 'Net ' },
      { text: 'profit', font: { bold: true } },
    ]);
    expect(isOgeRichText(rich)).toBe(true);
    expect(ogeRichTextToString(rich)).toBe('Net profit');
    expect(isOgeRichText({ kind: 'rich' })).toBe(false);
  });

  it('types values', () => {
    expect(ogeCellValueType(undefined)).toBe('blank');
    expect(ogeCellValueType(1)).toBe('number');
    expect(ogeCellValueType('x')).toBe('text');
    expect(ogeCellValueType(false)).toBe('boolean');
    expect(ogeCellValueType(ogeCellError('#NUM!'))).toBe('error');
    expect(ogeCellValueType(ogeRichText([]))).toBe('rich');
    expect(isOgeCellEmpty({})).toBe(true);
    expect(isOgeCellEmpty({ style: 0 })).toBe(true);
    expect(isOgeCellEmpty({ style: 3 })).toBe(false);
    expect(isOgeCellEmpty({ value: '' })).toBe(false);
  });
});

describe('style registry', () => {
  it('interns equal styles to one id, whatever the key order', () => {
    const styles = new OgeStyleRegistry();
    const a = styles.intern({
      font: { bold: true, size: 12 },
      numberFormat: '0.00',
    });
    const b = styles.intern({
      numberFormat: '0.00',
      font: { size: 12, bold: true },
    });
    expect(a).toBe(b);
    expect(a).toBe(1);
    expect(styles.size).toBe(2);
    expect(styles.intern({})).toBe(0);
    expect(styles.intern({ font: {}, fill: undefined })).toBe(0);
    expect(styles.get(0)).toBe(OGE_DEFAULT_CELL_STYLE);
    expect(styles.get(99)).toBe(OGE_DEFAULT_CELL_STYLE);
    expect(styles.get(undefined)).toBe(OGE_DEFAULT_CELL_STYLE);
  });

  it('freezes what it stores', () => {
    const styles = new OgeStyleRegistry();
    const id = styles.intern({ font: { color: { rgb: 'FF0000' } } });
    const style = styles.get(id);
    expect(Object.isFrozen(style)).toBe(true);
    expect(Object.isFrozen(style.font)).toBe(true);
    expect(Object.isFrozen(style.font?.color)).toBe(true);
  });

  it('merges a patch into an existing style', () => {
    const styles = new OgeStyleRegistry();
    const base = styles.intern({
      font: { name: 'Arial', size: 10 },
      numberFormat: '0%',
    });
    const bold = styles.merge(base, { font: { bold: true } });
    expect(styles.get(bold)).toEqual({
      font: { bold: true, name: 'Arial', size: 10 },
      numberFormat: '0%',
    });
    expect(styles.merge(base, {})).toBe(base);
    // a fill of another type replaces the old one outright
    const solid = styles.merge(0, {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'FFFF00' } },
    });
    const gradient = styles.merge(solid, {
      fill: { type: 'gradient', gradient: 'linear', stops: [] },
    });
    expect(styles.get(gradient).fill).toEqual({
      type: 'gradient',
      gradient: 'linear',
      stops: [],
    });
  });

  it('drops prototype keys from untrusted styles', () => {
    const styles = new OgeStyleRegistry();
    const hostile = JSON.parse(
      '{"font":{"bold":true},"__proto__":{"polluted":1}}',
    );
    const id = styles.intern(hostile);
    expect(Object.getPrototypeOf(styles.get(id))).toBe(Object.prototype);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    const merged = styles.merge(id, JSON.parse('{"__proto__":{"polluted":2}}'));
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(merged).toBe(id);
  });
});

describe('worksheet cells', () => {
  it('stores sparse cells and drops empty ones', () => {
    const sheet = createOgeWorkbook().sheets[0];
    expect(sheet.setCell(2, 3, { value: 42 })).toBe(true);
    expect(sheet.getValue(2, 3)).toBe(42);
    expect(sheet.cellCount).toBe(1);
    sheet.setCell(2, 3, { value: undefined, style: 0 });
    expect(sheet.getCell(2, 3)).toBeUndefined();
    expect(sheet.cellCount).toBe(0);
    expect(sheet.setCell(OGE_SHEET_MAX_ROWS, 0, { value: 1 })).toBe(false);
    expect(sheet.setCell(0, OGE_SHEET_MAX_COLUMNS, { value: 1 })).toBe(false);
  });

  it('keeps the style when a value is typed over a formula', () => {
    const sheet = createOgeWorkbook().sheets[0];
    sheet.setCell(0, 0, { value: 3, formula: 'A2+1', style: 4 });
    sheet.setValue(0, 0, 'typed');
    expect(sheet.getCell(0, 0)).toEqual({ value: 'typed', style: 4 });
    sheet.setValue(0, 0, undefined);
    expect(sheet.getCell(0, 0)).toEqual({ style: 4 });
  });

  it('visits cells row by row in column order, optionally inside a range', () => {
    const sheet = createOgeWorkbook().sheets[0];
    sheet.setCell(5, 1, { value: 'f' });
    sheet.setCell(0, 9, { value: 'b' });
    sheet.setCell(0, 2, { value: 'a' });
    sheet.setCell(3, 4, { value: 'c' });
    const seen: string[] = [];
    sheet.forEachCell((cell, row, col) =>
      seen.push(`${row},${col}=${String(cell.value)}`),
    );
    expect(seen).toEqual(['0,2=a', '0,9=b', '3,4=c', '5,1=f']);
    const inside: string[] = [];
    sheet.forEachCell((cell) => inside.push(String(cell.value)), {
      top: 0,
      left: 0,
      bottom: 3,
      right: 4,
    });
    expect(inside).toEqual(['a', 'c']);
  });

  it('tracks the used range through edits', () => {
    const sheet = createOgeWorkbook().sheets[0];
    expect(sheet.usedRange()).toBeNull();
    sheet.setCell(4, 2, { value: 1 });
    sheet.setCell(1, 7, { style: 2 });
    expect(sheet.usedRange()).toEqual({ top: 1, left: 2, bottom: 4, right: 7 });
    sheet.setCell(1, 7, undefined);
    expect(sheet.usedRange()).toEqual({ top: 4, left: 2, bottom: 4, right: 2 });
  });
});

describe('worksheet rows and columns', () => {
  it('reports row heights, hidden rows and the default', () => {
    const sheet = createOgeWorkbook().sheets[0];
    expect(sheet.rowHeight(0)).toBe(15);
    sheet.setRow(0, { height: 30 });
    sheet.setRow(1, { hidden: true, height: 30 });
    expect(sheet.rowHeight(0)).toBe(30);
    expect(sheet.rowHeight(1)).toBe(0);
    expect(sheet.formattedRows()).toEqual([0, 1]);
    sheet.setRow(0, {});
    expect(sheet.getRow(0)).toBeUndefined();
    expect(sheet.setRow(-1, { height: 1 })).toBe(false);
  });

  it('splits, overwrites and joins column spans', () => {
    const sheet = createOgeWorkbook().sheets[0];
    sheet.setColumns(0, OGE_SHEET_MAX_COLUMNS - 1, { width: 12 });
    sheet.setColumns(3, 5, { width: 20 });
    expect(sheet.columnSpans()).toEqual([
      { first: 0, last: 2, width: 12 },
      { first: 3, last: 5, width: 20 },
      { first: 6, last: OGE_SHEET_MAX_COLUMNS - 1, width: 12 },
    ]);
    expect(sheet.columnWidth(4)).toBe(20);
    expect(sheet.columnWidth(9000)).toBe(12);
    sheet.setColumns(3, 5, { width: 12 });
    expect(sheet.columnSpans()).toEqual([
      { first: 0, last: OGE_SHEET_MAX_COLUMNS - 1, width: 12 },
    ]);
    sheet.setColumns(10, 10, undefined);
    expect(sheet.getColumn(10)).toBeUndefined();
    expect(sheet.columnSpans()).toHaveLength(2);
  });

  it('treats hidden columns as zero wide and unformatted ones as default', () => {
    const sheet = createOgeWorkbook().sheets[0];
    sheet.setColumns(2, 2, { width: 30, hidden: true });
    expect(sheet.columnWidth(2)).toBe(0);
    expect(sheet.columnWidth(3)).toBeUndefined();
    sheet.format = { ...sheet.format, defaultColumnWidth: 10.7109375 };
    expect(sheet.columnWidth(3)).toBe(10.7109375);
    expect(sheet.setColumns(0, OGE_SHEET_MAX_COLUMNS, { width: 1 })).toBe(
      false,
    );
  });
});

describe('merged cells', () => {
  it('refuses single cells, overlaps and out-of-sheet ranges', () => {
    const sheet = createOgeWorkbook().sheets[0];
    expect(sheet.addMerge({ top: 0, left: 0, bottom: 1, right: 2 })).toBe(true);
    expect(sheet.addMerge({ top: 1, left: 2, bottom: 3, right: 3 })).toBe(
      false,
    );
    expect(sheet.addMerge({ top: 5, left: 5, bottom: 5, right: 5 })).toBe(
      false,
    );
    expect(
      sheet.addMerge({ top: 0, left: 0, bottom: OGE_SHEET_MAX_ROWS, right: 0 }),
    ).toBe(false);
    expect(sheet.mergeAt(1, 1)).toEqual({
      top: 0,
      left: 0,
      bottom: 1,
      right: 2,
    });
    expect(
      sheet.mergesIn({ top: 1, left: 2, bottom: 9, right: 9 }),
    ).toHaveLength(1);
    expect(sheet.removeMergeAt(0, 2)).toBe(true);
    expect(sheet.merges).toHaveLength(0);
    expect(sheet.removeMergeAt(0, 2)).toBe(false);
  });
});

describe('workbook', () => {
  it('starts with one sheet and the Office defaults', () => {
    const workbook = createOgeWorkbook();
    expect(workbook.sheets.map((s) => s.name)).toEqual(['Sheet1']);
    expect(workbook.dateSystem).toBe('1900');
    expect(workbook.defaultFont).toBe(OGE_DEFAULT_FONT);
    expect(workbook.sheets[0].view).toBe(OGE_DEFAULT_SHEET_VIEW);
    const localized = createOgeWorkbook({
      newSheetName: 'Sayfa',
      dateSystem: '1904',
    });
    expect(localized.sheets[0].name).toBe('Sayfa1');
    expect(localized.dateSystem).toBe('1904');
  });

  it('adds, finds, moves and removes sheets', () => {
    const workbook = createOgeWorkbook();
    workbook.addSheet();
    workbook.addSheet('Data', 0);
    expect(workbook.sheets.map((s) => s.name)).toEqual([
      'Data',
      'Sheet1',
      'Sheet2',
    ]);
    expect(workbook.sheet('data')?.name).toBe('Data');
    expect(workbook.sheet(2)?.name).toBe('Sheet2');
    expect(workbook.moveSheet(0, 2)).toBe(true);
    expect(workbook.sheets.map((s) => s.name)).toEqual([
      'Sheet1',
      'Sheet2',
      'Data',
    ]);
    expect(workbook.removeSheet(1)).toBe(true);
    expect(workbook.sheets.map((s) => s.name)).toEqual(['Sheet1', 'Data']);
    expect(workbook.addSheet().name).toBe('Sheet3');
    expect(workbook.moveSheet(0, 9)).toBe(false);
  });

  it('keeps at least one sheet and refuses bad names', () => {
    const workbook = createOgeWorkbook();
    expect(workbook.removeSheet(0)).toBe(false);
    expect(() => workbook.addSheet('sheet1')).toThrow(RangeError);
    expect(() => workbook.addSheet('a/b')).toThrow(RangeError);
    expect(() => workbook.renameSheet(0, 'History')).toThrow(RangeError);
    workbook.renameSheet(0, 'Summary');
    expect(workbook.sheets[0].name).toBe('Summary');
  });

  it('validates sheet names like Excel', () => {
    expect(validateOgeSheetName('Q1 2026')).toBeNull();
    expect(validateOgeSheetName('')).toBe('empty');
    expect(validateOgeSheetName('x'.repeat(32))).toBe('too-long');
    for (const bad of ['a:b', 'a\\b', 'a/b', 'a?b', 'a*b', 'a[b', 'a]b']) {
      expect(validateOgeSheetName(bad)).toBe('invalid-character');
    }
    expect(validateOgeSheetName("'quoted")).toBe('apostrophe-edge');
    expect(validateOgeSheetName("it's")).toBeNull();
    expect(validateOgeSheetName('history')).toBe('reserved');
    expect(validateOgeSheetName('DATA', ['Data'])).toBe('duplicate');
  });

  it('validates defined names like Excel', () => {
    expect(validateOgeDefinedName('TaxRate')).toBeNull();
    expect(validateOgeDefinedName('_xlnm.Print_Area')).toBeNull();
    expect(validateOgeDefinedName('\\backslash')).toBeNull();
    expect(validateOgeDefinedName('Satış.Oranı')).toBeNull();
    expect(validateOgeDefinedName('ABCD1')).toBeNull(); // past column XFD
    expect(validateOgeDefinedName('')).toBe('empty');
    expect(validateOgeDefinedName('x'.repeat(256))).toBe('too-long');
    expect(validateOgeDefinedName('1st')).toBe('invalid-start');
    expect(validateOgeDefinedName('tax rate')).toBe('invalid-character');
    for (const reference of [
      'A1',
      'xfd1048576',
      'R',
      'c',
      'R1C1',
      'RC',
      'R5',
      'C12',
    ]) {
      expect(validateOgeDefinedName(reference)).toBe('cell-reference');
    }
  });

  it('scopes defined names to sheets and follows sheet moves', () => {
    const workbook = createOgeWorkbook();
    workbook.addSheet('Second');
    workbook.defineName({ name: 'Rate', formula: '0.2' });
    workbook.defineName({ name: 'rate', formula: '0.3', sheet: 1 });
    expect(workbook.findName('RATE')?.formula).toBe('0.2');
    expect(workbook.findName('Rate', 1)?.formula).toBe('0.3');
    expect(workbook.findName('Rate', 0)?.formula).toBe('0.2');
    workbook.defineName({ name: 'Rate', formula: '0.25' });
    expect(workbook.names).toHaveLength(2);
    workbook.moveSheet(1, 0);
    expect(workbook.findName('Rate', 0)?.formula).toBe('0.3');
    workbook.addSheet('Front', 0);
    expect(workbook.findName('Rate', 1)?.formula).toBe('0.3');
    workbook.removeSheet(1);
    expect(workbook.names).toEqual([{ name: 'Rate', formula: '0.25' }]);
    expect(workbook.removeName('rate')).toBe(true);
    expect(workbook.removeName('rate')).toBe(false);
    expect(() => workbook.defineName({ name: 'A1', formula: '1' })).toThrow(
      RangeError,
    );
    expect(() =>
      workbook.defineName({ name: 'Ok', formula: '1', sheet: 7 }),
    ).toThrow(RangeError);
  });

  it('keeps the active sheet on the same sheet through edits', () => {
    const workbook = createOgeWorkbook();
    workbook.addSheet('B');
    workbook.addSheet('C');
    workbook.activeSheet = 1; // B
    workbook.addSheet('Front', 0);
    expect(workbook.sheets[workbook.activeSheet].name).toBe('B');
    workbook.moveSheet(2, 0);
    expect(workbook.sheets[workbook.activeSheet].name).toBe('B');
    workbook.removeSheet(0);
    expect(workbook.sheets[workbook.activeSheet].name).toBe('Front');
  });
});
