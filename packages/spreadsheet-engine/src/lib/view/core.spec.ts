import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createOgeWorkbook, type OgeWorkbook } from '../model/workbook';
import { ogeCellError } from '../model/cell';
import { OGE_EN_US_FORMAT_LOCALE } from '../format/format-locale';
import { OgeSpreadsheetCore, type OgeSpreadsheetKeyInput } from './core';
import { createPlainSpreadsheetReactivity } from './reactivity';

const key = (
  k: string,
  mods: Partial<OgeSpreadsheetKeyInput> = {},
): OgeSpreadsheetKeyInput => ({
  key: k,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...mods,
});
const page = { rows: 10, cols: 5 };

function core(workbook?: OgeWorkbook): OgeSpreadsheetCore {
  const c = new OgeSpreadsheetCore({
    reactivity: createPlainSpreadsheetReactivity(),
  });
  if (workbook) c.setWorkbook(workbook);
  return c;
}

/** A1:C3 filled, E1 filled, row 5 hidden, B7:C8 merged, column D hidden. */
function sample(): OgeWorkbook {
  const workbook = createOgeWorkbook();
  const sheet = workbook.sheets[0];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) sheet.setCell(r, c, { value: r * 3 + c + 1 });
  sheet.setCell(0, 4, { value: 'far' });
  sheet.setRow(4, { hidden: true });
  sheet.setColumns(3, 3, { hidden: true });
  sheet.addMerge({ top: 6, left: 1, bottom: 7, right: 2 });
  sheet.setCell(6, 1, { value: 'merged' });
  return workbook;
}

const at = (c: OgeSpreadsheetCore) => c.selection().active;

describe('OgeSpreadsheetCore — keyboard', () => {
  it('steps with arrows over hidden rows, hidden columns and merges', () => {
    const c = core(sample());
    c.selectCell(3, 0);
    c.keydown(key('ArrowDown'), page);
    expect(at(c)).toEqual({ row: 5, col: 0 }); // row 5 (index 4) is hidden
    c.selectCell(0, 2);
    c.keydown(key('ArrowRight'), page);
    expect(at(c)).toEqual({ row: 0, col: 4 }); // column D is hidden
    c.selectCell(5, 1);
    c.keydown(key('ArrowDown'), page);
    expect(at(c)).toEqual({ row: 6, col: 1 }); // into the merge: its owner
    expect(c.selection().ranges).toEqual([
      { top: 6, left: 1, bottom: 7, right: 2 },
    ]);
    c.keydown(key('ArrowDown'), page);
    expect(at(c)).toEqual({ row: 8, col: 1 }); // out past its bottom
  });

  it('jumps to data edges with Ctrl+arrows, as Range.End does in Excel', () => {
    const c = core(sample());
    c.selectCell(0, 0);
    // A1:C1 and E1 are filled and D is hidden: Excel's End goes straight to E1
    c.keydown(key('ArrowRight', { ctrlKey: true }), page);
    expect(at(c)).toEqual({ row: 0, col: 4 });
    c.keydown(key('ArrowRight', { ctrlKey: true }), page);
    expect(at(c)).toEqual({ row: 0, col: 16383 }); // the edge
    c.selectCell(1, 0);
    c.keydown(key('ArrowRight', { ctrlKey: true }), page);
    expect(at(c)).toEqual({ row: 1, col: 2 }); // the end of the run
    c.selectCell(0, 0);
    c.keydown(key('ArrowDown', { ctrlKey: true }), page);
    expect(at(c)).toEqual({ row: 2, col: 0 });
    c.keydown(key('ArrowDown', { ctrlKey: true }), page);
    expect(at(c)).toEqual({ row: 1048575, col: 0 });
  });

  it('extends with Shift from the anchor', () => {
    const c = core(sample());
    c.selectCell(1, 1);
    c.keydown(key('ArrowRight', { shiftKey: true }), page);
    c.keydown(key('ArrowDown', { shiftKey: true }), page);
    expect(c.selection().ranges).toEqual([
      { top: 1, left: 1, bottom: 2, right: 2 },
    ]);
    expect(at(c)).toEqual({ row: 1, col: 1 });
    c.keydown(key('ArrowUp', { shiftKey: true, ctrlKey: true }), page);
    expect(c.selection().ranges).toEqual([
      { top: 0, left: 1, bottom: 1, right: 2 },
    ]);
    // the name box shows the active cell, as Excel's does after a selection
    expect(c.nameBox()).toBe('B2');
  });

  it('handles Home, Ctrl+Home with frozen panes, Ctrl+End and Page keys', () => {
    const workbook = sample();
    workbook.sheets[0].view = {
      ...workbook.sheets[0].view,
      frozenRows: 1,
      frozenColumns: 1,
    };
    const c = core(workbook);
    c.selectCell(2, 2);
    c.keydown(key('Home'), page);
    expect(at(c)).toEqual({ row: 2, col: 0 });
    c.keydown(key('Home', { ctrlKey: true }), page);
    expect(at(c)).toEqual({ row: 1, col: 1 });
    c.keydown(key('End', { ctrlKey: true }), page);
    expect(at(c)).toEqual({ row: 6, col: 4 });
    c.selectCell(0, 0);
    c.keydown(key('PageDown'), page);
    expect(at(c)).toEqual({ row: 11, col: 0 }); // ten visible rows down, row 5 skipped
    c.keydown(key('PageDown', { altKey: true }), page);
    expect(at(c)).toEqual({ row: 11, col: 6 }); // five visible columns right, D skipped
  });

  it('cycles Tab and Enter inside a selection', () => {
    const c = core(sample());
    c.selectRange({ top: 0, left: 0, bottom: 1, right: 1 });
    c.keydown(key('Tab'), page);
    expect(at(c)).toEqual({ row: 0, col: 1 });
    c.keydown(key('Tab'), page);
    expect(at(c)).toEqual({ row: 1, col: 0 });
    c.keydown(key('Enter', { shiftKey: true }), page);
    expect(at(c)).toEqual({ row: 0, col: 0 });
    expect(c.selection().ranges).toEqual([
      { top: 0, left: 0, bottom: 1, right: 1 },
    ]);
    c.selectCell(0, 0);
    c.keydown(key('Enter'), page);
    expect(at(c)).toEqual({ row: 1, col: 0 });
  });

  it('selects the region, then all, with Ctrl+A; rows and columns with Space', () => {
    const c = core(sample());
    c.selectCell(1, 1);
    c.keydown(key('a', { ctrlKey: true }), page);
    expect(c.selection().ranges).toEqual([
      { top: 0, left: 0, bottom: 2, right: 2 },
    ]);
    c.keydown(key('a', { ctrlKey: true }), page);
    expect(c.selection().ranges).toEqual([
      { top: 0, left: 0, bottom: 1048575, right: 16383 },
    ]);
    c.selectCell(1, 1);
    c.keydown(key(' ', { shiftKey: true }), page);
    expect(c.selection().ranges).toEqual([
      { top: 1, left: 0, bottom: 1, right: 16383 },
    ]);
    expect(c.announcement()).toBe('2:2 selected, 16,384 cells');
    c.selectCell(1, 1);
    c.keydown(key(' ', { ctrlKey: true }), page);
    expect(c.selection().ranges).toEqual([
      { top: 0, left: 1, bottom: 1048575, right: 1 },
    ]);
    expect(c.nameBox()).toBe('B2');
  });

  it('adds ranges in Shift+F8 mode and leaves it with Escape', () => {
    const c = core(sample());
    c.selectCell(0, 0);
    c.keydown(key('F8', { shiftKey: true }), page);
    c.selectCell(2, 2);
    expect(c.selection().ranges).toHaveLength(2);
    expect(c.keydown(key('Escape'), page)).toBe('none');
    expect(c.addMode()).toBe(false);
    // nothing left to close: the key is the page's
    expect(c.keydown(key('Escape'), page)).toBeNull();
  });

  it('returns actions for the render layer and switches sheets', () => {
    const workbook = sample();
    workbook.addSheet('Two');
    workbook.addSheet('Hidden').state = 'hidden';
    workbook.addSheet('Three');
    const c = core(workbook);
    expect(c.keydown(key('c', { ctrlKey: true }), page)).toBe('copy');
    expect(c.keydown(key('f', { metaKey: true }), page)).toBe('find');
    expect(c.keydown(key('F5'), page)).toBe('goto');
    expect(c.keydown(key('F2', { shiftKey: true }), page)).toBe('none');
    expect(c.openNote()).toBeNull();
    expect(c.keydown(key('x'), page)).toBeNull();
    c.keydown(key('PageDown', { ctrlKey: true }), page);
    expect(c.activeSheet()).toBe(1);
    c.keydown(key('PageDown', { ctrlKey: true }), page);
    expect(c.activeSheet()).toBe(3); // the hidden sheet is skipped
    expect(c.announcement()).toBe('Sheet Three, 3 of 3');
    expect(c.selectSheet(2)).toBe(false);
    c.keydown(key('=', { ctrlKey: true }), page);
    expect(c.zoom()).toBe(110);
    c.keydown(key('-', { ctrlKey: true }), page);
    c.keydown(key('-', { ctrlKey: true }), page);
    expect(c.zoom()).toBe(90);
  });
});

describe('OgeSpreadsheetCore — name box, formula bar, announcements', () => {
  it('shows the cell, the range, a matching name and formulas', () => {
    const workbook = sample();
    const sheet = workbook.sheets[0];
    sheet.setCell(9, 0, { value: 6, formula: '_xlfn.XLOOKUP(1,A1:A3,B1:B3)' });
    sheet.setCell(10, 0, {
      value: 10,
      formula: 'SEQUENCE(3)',
      array: {
        range: { top: 10, left: 0, bottom: 12, right: 0 },
        dynamic: true,
      },
    });
    sheet.setCell(11, 0, { value: 20 });
    sheet.setCell(14, 0, {
      value: 4,
      formula: 'SUM(A1:A2*B1:B2)',
      array: { range: { top: 14, left: 0, bottom: 15, right: 0 } },
    });
    sheet.setCell(15, 0, { value: 5 });
    sheet.setCell(17, 0, {
      value: 45296.5,
      style: workbook.styles.intern({
        numberFormat: 'yyyy-mm-dd',
        numberFormatId: undefined,
      }),
    });
    sheet.setCell(18, 0, {
      value: 0.125,
      style: workbook.styles.intern({ numberFormat: '0%' }),
    });
    sheet.setCell(19, 0, {
      value: '00123',
      style: workbook.styles.intern({ quotePrefix: true }),
    });
    sheet.setCell(20, 0, { value: 1 / 3 });
    sheet.setCell(21, 0, { value: ogeCellError('#N/A') });
    workbook.defineName({ name: 'Block', formula: 'Sheet1!$A$1:$C$3' });
    const c = core(workbook);
    c.selectCell(9, 0);
    expect(c.formulaBar()).toEqual({
      text: '=XLOOKUP(1,A1:A3,B1:B3)',
      ghost: false,
    });
    c.selectCell(11, 0);
    expect(c.formulaBar()).toEqual({ text: '=SEQUENCE(3)', ghost: true });
    c.selectCell(15, 0);
    expect(c.formulaBar()).toEqual({
      text: '{=SUM(A1:A2*B1:B2)}',
      ghost: false,
    });
    c.selectCell(17, 0);
    expect(c.formulaBar().text).toBe('1/5/2024 12:00:00');
    c.selectCell(18, 0);
    expect(c.formulaBar().text).toBe('12.5%');
    c.selectCell(19, 0);
    expect(c.formulaBar().text).toBe("'00123");
    c.selectCell(20, 0);
    expect(c.formulaBar().text).toBe('0.333333333333333');
    c.selectCell(21, 0);
    expect(c.formulaBar().text).toBe('#N/A');
    c.selectRange({ top: 0, left: 0, bottom: 2, right: 2 });
    expect(c.nameBox()).toBe('Block');
    c.selectCell(7, 2);
    expect(c.nameBox()).toBe('B7');
    expect(c.announcement()).toBe('B7, merged, merged B7:C8');
  });

  it('announces selections, links and notes', () => {
    const workbook = sample();
    const sheet = workbook.sheets[0];
    sheet.addHyperlink({
      range: { top: 0, left: 0, bottom: 0, right: 0 },
      target: 'https://example.com',
    });
    sheet.setNote(0, 0, { text: 'Check', author: 'Ann' });
    const c = core(workbook);
    c.selectCell(0, 0);
    expect(c.announcement()).toBe(
      'A1, 1, Link to https://example.com, Alt+Enter to open, Note by Ann: Check',
    );
    c.selectRange({ top: 0, left: 0, bottom: 1, right: 1 });
    expect(c.announcement()).toBe('A1:B2 selected, 4 cells');
  });
});

describe('OgeSpreadsheetCore — copy, find, links', () => {
  it('copies the active range as text and Excel HTML, guarding formulas', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    sheet.setCell(0, 0, {
      value: 1234.5,
      style: workbook.styles.intern({
        numberFormat: '#,##0.00',
        font: { bold: true },
      }),
    });
    sheet.setCell(0, 1, { value: '=HYPERLINK("x")' });
    sheet.setCell(1, 0, { value: 'two\nlines' });
    sheet.setCell(1, 1, { value: -5 });
    sheet.addMerge({ top: 2, left: 0, bottom: 2, right: 1 });
    sheet.setCell(2, 0, { value: 'merged' });
    const c = core(workbook);
    c.selectRange({ top: 0, left: 0, bottom: 2, right: 1 });
    const content = c.copy();
    expect(content?.text).toBe(
      `1,234.50\t'=HYPERLINK("x")\r\n"two\nlines"\t-5\r\nmerged\t\r\n`,
    );
    expect(content?.cells).toBe(6);
    expect(content?.html).toContain('x:num="1234.5"');
    expect(content?.html).toContain("mso-number-format:'#,##0.00'");
    expect(content?.html).toContain('font-weight:700');
    expect(content?.html).toContain('colspan=2');
    expect(content?.html).toContain(
      'two<br style="mso-data-placement:same-cell">lines',
    );
    expect(content?.html).toContain("'=HYPERLINK(&quot;x&quot;)");
    expect(c.announcement()).toBe('Copied 6 cells');
    c.selectCell(0, 0);
    c.selectCell(2, 2, 'add');
    expect(c.copy()).toBeNull();
    expect(c.announcement()).toBe('Copy works on one selected range at a time');
  });

  it('finds with wildcards, case and whole-cell options, across sheets', () => {
    const workbook = createOgeWorkbook();
    workbook.sheets[0].setCell(0, 0, { value: 'Apple pie' });
    workbook.sheets[0].setCell(3, 1, { value: 'apple' });
    workbook.sheets[0].setCell(5, 0, { value: 42, formula: 'SUM(A1)' });
    workbook.addSheet('Two').setCell(1, 1, { value: 'APPLE' });
    const c = core(workbook);
    c.find('apple');
    expect(c.findState().matches).toHaveLength(2);
    expect(c.announcement()).toBe('1 of 2, A1, Apple pie');
    c.findNext();
    expect(at(c)).toEqual({ row: 3, col: 1 });
    c.findNext();
    expect(at(c)).toEqual({ row: 0, col: 0 });
    c.find('apple', { entireCell: true, matchCase: true });
    expect(c.findState().matches.map((m) => [m.row, m.col])).toEqual([[3, 1]]);
    c.find('a?p*', { workbook: true });
    expect(c.findState().matches.map((m) => m.sheet)).toEqual([0, 0, 1]);
    c.find('=SUM*', { formulas: true });
    expect(c.findState().matches).toEqual([{ sheet: 0, row: 5, col: 0 }]);
    c.find('~*');
    expect(c.findState().matches).toEqual([]);
    expect(c.announcement()).toBe('No matches');
    c.closeFind();
    expect(c.findState().open).toBe(false);
  });

  it('follows internal links, sanitises external ones', () => {
    const workbook = sample();
    const sheet = workbook.sheets[0];
    workbook.addSheet('Target');
    sheet.addHyperlink({
      range: { top: 0, left: 0, bottom: 0, right: 0 },
      target: 'https://example.com/a',
      location: 'part',
    });
    sheet.addHyperlink({
      range: { top: 1, left: 0, bottom: 1, right: 0 },
      location: "'Target'!C3",
    });
    sheet.addHyperlink({
      range: { top: 2, left: 0, bottom: 2, right: 0 },
      target: 'javascript:alert(1)',
    });
    const c = core(workbook);
    expect(c.hyperlinkAt(0, 0)).toMatchObject({
      kind: 'external',
      href: 'https://example.com/a#part',
    });
    expect(c.hyperlinkAt(2, 0)).toBeNull();
    expect(c.followHyperlink(1, 0)?.kind).toBe('internal');
    expect(c.activeSheet()).toBe(1);
    expect(at(c)).toEqual({ row: 2, col: 2 });
    c.selectSheet(0);
    c.selectCell(0, 0);
    expect(c.keydown(key('Enter', { altKey: true }), page)).toBe('open-link');
  });

  it('goes to references and names', () => {
    const workbook = sample();
    workbook.addSheet('Two');
    workbook.defineName({ name: 'Far', formula: 'Two!$D$10' });
    const c = core(workbook);
    expect(c.goTo('C5')).toBe(true);
    expect(at(c)).toEqual({ row: 4, col: 2 });
    expect(c.goTo('Far')).toBe(true);
    expect(c.activeSheet()).toBe(1);
    expect(at(c)).toEqual({ row: 9, col: 3 });
    expect(c.goTo('B:C')).toBe(true);
    expect(c.selection().ranges).toEqual([
      { top: 0, left: 1, bottom: 1048575, right: 2 },
    ]);
    expect(c.goTo('nonsense!!')).toBe(false);
  });
});

describe('OgeSpreadsheetCore — opening and painting', () => {
  it('opens a corpus workbook, keeps its saved view and paints it', async () => {
    const c = core();
    expect(c.status()).toBe('empty');
    const bytes = new Uint8Array(
      readFileSync(
        resolve(__dirname, '../../../testing/corpus/structure.xlsx'),
      ),
    );
    const pending = c.open(bytes);
    expect(c.status()).toBe('loading');
    expect(c.announcement()).toBe('Opening workbook…');
    await pending;
    expect(c.status()).toBe('ready');
    // the sheet it opens at replaces "Opening workbook…"
    expect(c.announcement()).toBe('Sheet Main, 1 of 4');
    expect(c.issues()).toEqual([]);
    expect(c.tabs().map((t) => t.name)).toEqual(['Main', 'Data', 'RTL', 'CF']);
    expect(c.tabs()[1].color).toBe('#70AD47');
    // the saved active cell of Main
    expect(c.nameBox()).toBe('C4');
    const cells = c.paint({ top: 0, left: 0, bottom: 10, right: 5 });
    expect(
      cells.find((cell) => cell.row === 0 && cell.col === 0)?.display?.text,
    ).toBe('Name');
    expect(c.layout()?.cols.size(0)).toBe(182);
  });

  it('reports a file it cannot open', async () => {
    const c = core();
    await c.open(new Uint8Array([1, 2, 3]));
    expect(c.status()).toBe('error');
    expect(c.error()?.code).toBe('not-xlsx');
    expect(c.announcement()).toBe(
      'This is not an Excel workbook (.xlsx, .xlsm).',
    );
  });

  it('lets a newer open win over an older one', async () => {
    const c = core();
    const bytes = new Uint8Array(
      readFileSync(resolve(__dirname, '../../../testing/corpus/formulas.xlsx')),
    );
    const first = c.open(new Uint8Array([1, 2, 3]));
    const second = c.open(bytes);
    await Promise.all([first, second]);
    expect(c.status()).toBe('ready');
    expect(c.error()).toBeNull();
  });

  it('places pictures and serves their media', () => {
    const bytes = new Uint8Array(
      readFileSync(resolve(__dirname, '../../../testing/corpus/pictures.xlsx')),
    );
    const c = core();
    return c.open(bytes).then(() => {
      const [first] = c.pictures();
      expect(first.picture.name).toBe('Two cell');
      expect(c.media(first.picture.image)?.type).toBe('image/png');
      expect(c.media('xl/media/missing.png')).toBeUndefined();
    });
  });
});

describe('OgeSpreadsheetCore — configuration and edge cases', () => {
  it('extends and adds whole rows and columns, clamps cells, steps zoom to its ends', () => {
    const c = core(sample());
    c.selectCell(2, 2);
    c.selectRows(4, 4, 'extend');
    expect(c.selection().ranges).toEqual([
      { top: 4, left: 0, bottom: 4, right: 16383 },
    ]);
    c.selectColumns(1, 0, 'add');
    expect(c.selection().ranges).toHaveLength(2);
    c.selectCell(-5, 99_999);
    expect(at(c)).toEqual({ row: 0, col: 16383 });
    c.setZoom(1000);
    expect(c.zoom()).toBe(400);
    c.stepZoom(1);
    expect(c.zoom()).toBe(400);
    c.setZoom(10);
    c.stepZoom(-1);
    expect(c.zoom()).toBe(10);
    expect(c.announcement()).toBe('Zoom 10%');
  });

  it('takes new messages, a locale and a measurer', () => {
    const workbook = sample();
    workbook.sheets[0].setCell(0, 0, {
      value: 1234.5,
      style: workbook.styles.intern({ numberFormat: '#,##0.00' }),
    });
    const c = core(workbook);
    c.setMessages({ cellAnnouncement: '{text} @ {address}' });
    c.selectCell(0, 0);
    expect(c.announcement()).toBe('1,234.50 @ A1');
    expect(c.text.find).toBe('Find');
    c.setLocale({ ...OGE_EN_US_FORMAT_LOCALE, decimal: ',', group: '.' });
    c.selectCell(0, 0);
    expect(c.announcement()).toBe('1.234,50 @ A1');
    const before = c.version();
    c.setMeasurer({ measure: (text) => text.length * 10 });
    expect(c.version()).toBe(before + 1);
    c.destroy();
  });

  it('hides formulas of a protected sheet and copies only the used part of whole rows', () => {
    const workbook = sample();
    const sheet = workbook.sheets[0];
    sheet.setCell(9, 0, {
      value: 3,
      formula: 'A1+A2',
      style: workbook.styles.intern({ protection: { hidden: true } }),
    });
    const c = core(workbook);
    c.selectCell(9, 0);
    expect(c.formulaBar().text).toBe('=A1+A2');
    sheet.protection = { attributes: { sheet: '1' } };
    expect(c.formulaBar().text).toBe('');
    c.selectRows(0, 0);
    expect(c.copy()?.text).toBe('1\t2\t3\tfar\r\n');
  });

  it('answers without a workbook', () => {
    const c = core();
    expect(c.sheet()).toBeNull();
    expect(c.layout()).toBeNull();
    expect(c.tabs()).toEqual([]);
    expect(c.paint({ top: 0, left: 0, bottom: 1, right: 1 })).toEqual([]);
    expect(c.pictures()).toEqual([]);
    expect(c.nameBox()).toBe('');
    expect(c.formulaBar()).toEqual({ text: '', ghost: false });
    expect(c.copy()).toBeNull();
    expect(c.goTo('A1')).toBe(false);
    expect(c.keydown(key('ArrowDown'), page)).toBeNull();
    expect(c.describeCell(0, 0)).toBe('');
    expect(c.hyperlinkAt(0, 0)).toBeNull();
    c.find('x');
    expect(c.findState().matches).toEqual([]);
    c.findNext();
    expect(c.announcement()).toBe('No matches');
    c.setWorkbook(null);
    expect(c.status()).toBe('empty');
    expect(c.announcement()).toBe('');
  });

  it('remembers each sheet’s selection and zoom', () => {
    const workbook = sample();
    workbook.addSheet('Two');
    const c = core(workbook);
    c.selectCell(4, 4);
    c.setZoom(150);
    c.selectSheet(1);
    expect(at(c)).toEqual({ row: 0, col: 0 });
    expect(c.zoom()).toBe(100);
    c.selectSheet(0);
    expect(at(c)).toEqual({ row: 4, col: 4 });
    expect(c.zoom()).toBe(150);
    expect(c.selectSheet(0)).toBe(true);
    expect(c.selectSheet(7)).toBe(false);
    c.openFind();
    expect(c.findState().open).toBe(true);
    expect(c.keydown(key('Escape'), page)).toBe('none');
    expect(c.findState().open).toBe(false);
    expect(c.keydown(key('End'), page)).toBeNull();
    expect(c.keydown(key(' '), page)).toBeNull();
    expect(c.keydown(key('Enter', { ctrlKey: true }), page)).toBeNull();
    expect(c.keydown(key('Backspace', { ctrlKey: true }), page)).toBe('none');
    expect(c.keydown(key('Backspace'), page)).toBeNull();
    expect(c.keydown(key('F2'), page)).toBeNull();
    expect(c.keydown(key('F8'), page)).toBeNull();
    expect(c.keydown(key('g', { ctrlKey: true }), page)).toBe('goto');
    expect(c.keydown(key(' ', { ctrlKey: true, shiftKey: true }), page)).toBe(
      'none',
    );
    expect(c.selection().ranges).toEqual([
      { top: 0, left: 0, bottom: 1048575, right: 16383 },
    ]);
    expect(c.keydown(key('Enter', { altKey: true }), page)).toBe('none');
  });

  it('moves right-to-left sheets the mirrored way', () => {
    const workbook = sample();
    workbook.sheets[0].view = { ...workbook.sheets[0].view, rightToLeft: true };
    const c = core(workbook);
    c.selectCell(0, 2);
    c.keydown(key('ArrowLeft'), page);
    expect(at(c)).toEqual({ row: 0, col: 4 });
    c.keydown(key('Tab'), page);
    expect(at(c)).toEqual({ row: 0, col: 2 });
  });
});

describe('OgeSpreadsheetCore — more branches', () => {
  it('handles the remaining keys and references', async () => {
    const workbook = sample();
    workbook.sheets[0].setCell(10, 0, { value: true });
    workbook.sheets[0].setCell(11, 0, { value: 2, formula: 'A1*2' });
    workbook.sheets[0].tabColor = { rgb: 'FF123456' };
    workbook.defineName({
      name: 'Secret',
      formula: 'Sheet1!$A$1',
      hidden: true,
    });
    const c = core(workbook);
    expect(c.tabs()[0].color).toBe('#123456');
    c.selectCell(10, 0);
    expect(c.formulaBar().text).toBe('TRUE');
    c.selectCell(11, 0);
    expect(c.announcement()).toBe('A12, 2, formula =A1*2');
    c.selectCell(0, 0);
    // a hidden name never shows in the name box
    expect(c.nameBox()).toBe('A1');
    expect(c.goTo('=B2')).toBe(true);
    expect(at(c)).toEqual({ row: 1, col: 1 });
    expect(c.goTo('3:4')).toBe(true);
    expect(c.selection().ranges).toEqual([
      { top: 2, left: 0, bottom: 3, right: 16383 },
    ]);
    expect(c.goTo('Nope!A1')).toBe(false);
    c.selectCell(20, 0);
    c.keydown(key('PageUp'), page);
    expect(at(c).row).toBeLessThan(20);
    expect(c.keydown(key('ArrowDown', { altKey: true }), page)).toBeNull();
    c.selectCell(3, 3, 'extend');
    expect(c.selection().ranges.length).toBe(1);
    c.selectRange({ top: 1, left: 1, bottom: 2, right: 2 }, { row: 2, col: 2 });
    expect(at(c)).toEqual({ row: 2, col: 2 });
    await c.open(new Blob([new Uint8Array([0, 1])]));
    expect(c.status()).toBe('error');
  });
});

describe('OgeSpreadsheetCore — status bar, panes and zoom', () => {
  it('summarises two or more filled cells in the active cell’s format', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    const money = workbook.styles.intern({ numberFormat: '#,##0.00' });
    sheet.setCell(0, 0, { value: 'Ada' });
    sheet.setCell(0, 1, { value: 4200.5, style: money });
    sheet.setCell(1, 1, { value: 5100, style: money });
    sheet.setCell(2, 1, { value: ogeCellError('#N/A') });
    const c = core(workbook);
    c.selectCell(0, 1);
    expect(c.statusItems()).toEqual([]);
    c.selectCell(1, 1, 'extend');
    expect(c.statusItems().map((i) => i.text)).toEqual([
      'Average: 4,650.25',
      'Count: 2',
      'Sum: 9,300.50',
    ]);
    expect(c.statusItems().map((i) => i.kind)).toEqual([
      'average',
      'count',
      'sum',
    ]);
    // a text cell is active: General
    c.selectRange({ top: 0, left: 0, bottom: 1, right: 1 });
    expect(c.statusItems().map((i) => i.text)).toEqual([
      'Average: 4650.25',
      'Count: 3',
      'Sum: 9300.5',
    ]);
    // an error leaves the count alone
    c.selectRange({ top: 0, left: 1, bottom: 2, right: 1 });
    expect(c.statusItems().map((i) => i.text)).toEqual(['Count: 3']);
    // an empty active cell takes its column's format
    sheet.setColumns(3, 3, { style: money });
    c.setWorkbook(workbook);
    c.selectRange({ top: 0, left: 1, bottom: 1, right: 3 }, { row: 0, col: 3 });
    expect(c.statusItems()[0].text).toBe('Average: 4,650.25');
    expect(core().statusItems()).toEqual([]);
  });

  it('gives panes, paint and pictures at its zoom', () => {
    const workbook = sample();
    workbook.sheets[0].pictures.push({
      image: 'xl/media/image1.png',
      anchor: { kind: 'absolute', x: 10, y: 10, width: 50, height: 20 },
    });
    const c = core(workbook);
    expect(
      core().panes({ width: 100, height: 100, scrollTop: 0, scrollLeft: 0 }),
    ).toBeNull();
    const panes = c.panes({
      width: 666,
      height: 420,
      scrollTop: 0,
      scrollLeft: 0,
    });
    expect(panes).toMatchObject({ zoom: 100, cellWidth: 640, cellHeight: 400 });
    expect(c.paint({ top: 0, left: 0, bottom: 0, right: 0 })[0]).toMatchObject({
      x: 0,
      width: 64,
      height: 20,
    });
    c.setZoom(200);
    expect(
      c.panes({ width: 694, height: 438, scrollTop: 0, scrollLeft: 0 })?.headers
        .rowHeaderWidth,
    ).toBe(54);
    expect(c.paint({ top: 0, left: 0, bottom: 0, right: 0 })[0]).toMatchObject({
      x: 0,
      width: 128,
      height: 40,
    });
    expect(
      c.paint({ top: 0, left: 0, bottom: 0, right: 0 }, 100)[0].width,
    ).toBe(64);
    expect(c.pictures()[0]).toMatchObject({
      x: 20,
      y: 20,
      width: 100,
      height: 40,
    });
    expect(c.pictures(100)[0]).toMatchObject({ x: 10, width: 50 });
  });
});

describe('OgeSpreadsheetCore — dynamic arrays', () => {
  it('finds the spill range over the active cell, and only for dynamic arrays', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    sheet.setCell(13, 0, {
      formula: '_xlfn.SEQUENCE(5,1,10,10)',
      value: 10,
      array: {
        range: { top: 13, left: 0, bottom: 17, right: 0 },
        dynamic: true,
      },
    });
    for (let r = 14; r <= 17; r++)
      sheet.setCell(r, 0, { value: (r - 12) * 10 });
    sheet.setCell(13, 2, {
      formula: 'A1:A3*2',
      value: 0,
      array: { range: { top: 13, left: 2, bottom: 15, right: 2 } },
    });
    const c = core(workbook);
    c.selectCell(15, 0);
    expect(c.spillRange()).toEqual({ top: 13, left: 0, bottom: 17, right: 0 });
    expect(c.formulaBar()).toEqual({
      text: '=SEQUENCE(5,1,10,10)',
      ghost: true,
    });
    c.selectCell(14, 2);
    expect(c.spillRange()).toBeNull();
    c.selectCell(20, 0);
    expect(c.spillRange()).toBeNull();
    expect(core().spillRange()).toBeNull();
  });
});

describe('OgeSpreadsheetCore — the chrome’s lists', () => {
  function sheets(): OgeWorkbook {
    const workbook = sample();
    workbook.addSheet('Budget');
    workbook.addSheet('Archive').state = 'hidden';
    workbook.addSheet('Notes');
    return workbook;
  }

  it('lists the visible sheets, opens on the active one and moves like a menu', () => {
    const c = core(sheets());
    c.selectSheet(1);
    c.openMenu('sheets');
    expect(c.menu()).toEqual({ kind: 'sheets', focus: 1 });
    expect(c.menuItems().map((item) => [item.label, item.checked])).toEqual([
      ['Sheet1', false],
      ['Budget', true],
      ['Notes', false],
    ]);
    expect(c.menuKeydown('ArrowDown')).toBe('focus');
    expect(c.menu().focus).toBe(2);
    c.menuKeydown('ArrowDown');
    expect(c.menu().focus).toBe(0); // round to the first
    c.menuKeydown('ArrowUp');
    expect(c.menu().focus).toBe(2);
    c.menuKeydown('Home');
    expect(c.menu().focus).toBe(0);
    c.menuKeydown('End');
    expect(c.menu().focus).toBe(2);
    // a character goes to the next item it starts, round the end
    c.menuKeydown('b');
    expect(c.menu().focus).toBe(1);
    expect(c.menuKeydown('z')).toBe('focus');
    expect(c.menu().focus).toBe(1);
    expect(c.menuKeydown('Shift')).toBeNull();
    c.menuKeydown('n');
    expect(c.menuKeydown('Enter')).toBe('picked');
    expect(c.menu().kind).toBeNull();
    expect(c.activeSheet()).toBe(3);
    expect(c.announcement()).toBe('Sheet Notes, 3 of 3');
  });

  it('opens at an end from the opener’s arrows, and closes on Escape and Tab', () => {
    const c = core(sheets());
    c.openMenu('sheets', 'last');
    expect(c.menu().focus).toBe(2);
    expect(c.menuKeydown('Escape')).toBe('close');
    expect(c.menu().kind).toBeNull();
    c.openMenu('sheets', 'first');
    expect(c.menu().focus).toBe(0);
    expect(c.menuKeydown('Tab')).toBe('leave');
    expect(c.menuKeydown('ArrowDown')).toBeNull(); // nothing open
    c.openMenu('sheets');
    c.setWorkbook(sample()); // a new workbook closes it
    expect(c.menu().kind).toBeNull();
  });

  it('lists the names Excel’s name box does, sorted, and goes to the one picked', () => {
    const workbook = sheets();
    workbook.defineName({ name: 'zeta', formula: 'Sheet1!$B$2' });
    workbook.defineName({ name: 'Alpha', formula: 'Budget!$A$1:$B$2' });
    workbook.defineName({ name: 'Rate', formula: '0.07' });
    workbook.defineName({
      name: 'Hidden',
      formula: 'Sheet1!$A$1',
      hidden: true,
    });
    workbook.defineName({
      name: '_xlnm.Print_Area',
      formula: 'Sheet1!$A$1:$C$3',
      sheet: 0,
    });
    workbook.defineName({ name: 'Local', formula: 'Budget!$C$3', sheet: 1 });
    const c = core(workbook);
    expect(c.definedNames()).toEqual(['Alpha', 'zeta']);
    c.selectSheet(1);
    expect(c.definedNames()).toEqual(['Alpha', 'Local', 'zeta']);
    c.openMenu('names');
    // nothing is checked: the first item takes focus
    expect(c.menu()).toEqual({ kind: 'names', focus: 0 });
    c.pickMenuItem(2);
    expect(c.activeSheet()).toBe(0);
    expect(at(c)).toEqual({ row: 1, col: 1 });
    expect(c.nameBox()).toBe('zeta');
    // a workbook without names opens no list
    const plain = core(sample());
    plain.openMenu('names');
    expect(plain.menu().kind).toBeNull();
    expect(plain.menuItems()).toEqual([]);
  });

  it('expands the formula bar with its button and Ctrl+Shift+U', () => {
    const c = core(sample());
    expect(c.formulaExpanded()).toBe(false);
    c.toggleFormulaBar();
    expect(c.formulaExpanded()).toBe(true);
    expect(c.keydown(key('U', { ctrlKey: true, shiftKey: true }), page)).toBe(
      'none',
    );
    expect(c.formulaExpanded()).toBe(false);
    expect(c.keydown(key('u', { ctrlKey: true }), page)).toBeNull();
  });

  it('says which label reads on a tab colour', () => {
    const workbook = sheets();
    workbook.sheets[0].tabColor = { rgb: 'FF70AD47' };
    workbook.sheets[1].tabColor = { rgb: 'FF002060' };
    const tabs = core(workbook).tabs();
    expect(tabs[0]).toMatchObject({ color: '#70AD47', ink: 'dark' });
    expect(tabs[1]).toMatchObject({ color: '#002060', ink: 'light' });
    expect(tabs[2].ink).toBeUndefined();
  });
});

describe('OgeSpreadsheetCore — outline', () => {
  /** Rows 13–18 grouped (15–16 one level deeper) under the summary on row 19; columns E:F under G. */
  function grouped(): OgeWorkbook {
    const workbook = sample();
    const sheet = workbook.sheets[0];
    for (const row of [12, 13, 14, 15, 16, 17])
      sheet.setRow(row, { outlineLevel: row === 14 || row === 15 ? 2 : 1 });
    sheet.setColumns(4, 5, { outlineLevel: 1 });
    return workbook;
  }
  const hidden = (c: OgeSpreadsheetCore) =>
    [12, 13, 14, 15, 16, 17].filter((row) => c.sheet()?.getRow(row)?.hidden);

  it('toggles a group from its button and says which rows went', () => {
    const c = core(grouped());
    const version = c.version();
    expect(c.toggleOutlineGroup('rows', 0)).toBe(true);
    expect(hidden(c)).toEqual([12, 13, 14, 15, 16, 17]);
    expect(c.announcement()).toBe('Rows 13 to 18 hidden');
    expect(c.version()).toBeGreaterThan(version);
    expect(c.outline()?.rows.groups[0].collapsed).toBe(true);
    c.toggleOutlineGroup('rows', 0);
    expect(hidden(c)).toEqual([]);
    expect(c.announcement()).toBe('Rows 13 to 18 shown');
    c.toggleOutlineGroup('columns', 0);
    expect(c.announcement()).toBe('Columns E to F hidden');
    expect(c.toggleOutlineGroup('rows', 9)).toBe(false);
  });

  it('stripes a table over its visible rows, again after a group closes', () => {
    const workbook = grouped();
    workbook.sheets[0].tables.push({
      id: 1,
      name: 'Grouped',
      displayName: 'Grouped',
      range: { top: 11, left: 0, bottom: 19, right: 1 },
      headerRowCount: 1,
      totalsRowCount: 0,
      columns: [],
      style: {
        name: 'TableStyleMedium2',
        showFirstColumn: false,
        showLastColumn: false,
        showRowStripes: true,
        showColumnStripes: false,
      },
    });
    const c = core(workbook);
    const striped = () =>
      c
        .paint({ top: 12, left: 0, bottom: 19, right: 0 })
        .filter((cell) => cell.fill)
        .map((cell) => cell.row);
    // data rows 12–19: the first, third … rows are striped
    expect(striped()).toEqual([12, 14, 16, 18]);
    c.toggleOutlineGroup('rows', 0);
    // 12–17 hidden: 18 is the first visible data row, 19 the second
    expect(striped()).toEqual([18]);
  });

  it('draws a sparkline without the rows a group hides, again after it closes', () => {
    const workbook = grouped();
    const sheet = workbook.sheets[0];
    for (let row = 12; row <= 19; row++) sheet.setValue(row, 7, row);
    sheet.sparklineGroups.push({
      type: 'line',
      sparklines: [{ cell: { row: 20, col: 0 }, ref: 'H13:H20' }],
      colors: {},
      lineWeight: 0.75,
      markers: false,
      high: false,
      low: false,
      first: false,
      last: false,
      negative: false,
      displayXAxis: false,
      displayHidden: false,
      displayEmptyCellsAs: 'gap',
      minAxisType: 'individual',
      maxAxisType: 'individual',
      rightToLeft: false,
    });
    const c = core(workbook);
    const points = () =>
      c
        .paint({ top: 20, left: 0, bottom: 20, right: 0 })
        .find((cell) => cell.sparkline)?.sparkline?.values;
    expect(points()).toEqual([12, 13, 14, 15, 16, 17, 18, 19]);
    c.toggleOutlineGroup('rows', 0);
    expect(points()).toEqual([18, 19]);
    // the panes are hidden from assistive tech: the cell names its sparkline
    expect(c.describeCell(20, 0)).toBe('A21, blank, line sparkline of H13:H20');
    sheet.sparklineGroups.push({
      ...sheet.sparklineGroups[0],
      type: 'stacked',
      sparklines: [
        { cell: { row: 20, col: 0 }, ref: "'Other sheet'!B1:B9" },
        { cell: { row: 21, col: 0 } },
      ],
    });
    // a later group's sparkline in the same cell is the one drawn; one without data none
    expect(c.describeCell(20, 0)).toBe(
      "A21, blank, win/loss sparkline of 'Other sheet'!B1:B9",
    );
    expect(c.describeCell(21, 0)).toBe('A22, blank');
  });

  it('shows a level from its button', () => {
    const c = core(grouped());
    expect(c.showOutlineLevel('rows', 2)).toBe(true);
    expect(hidden(c)).toEqual([14, 15]);
    expect(c.announcement()).toBe('Level 2 shown');
    c.showOutlineLevel('rows', 1);
    expect(hidden(c)).toEqual([12, 13, 14, 15, 16, 17]);
    expect(c.showOutlineLevel('rows', 4)).toBe(false);
    expect(c.showOutlineLevel('rows', 0)).toBe(false);
  });

  it('hides and shows details from the keyboard, rows before columns', () => {
    const c = core(grouped());
    c.selectCell(14, 0);
    // Alt+Shift+Up in the inner group hides it
    expect(
      c.keydown(key('ArrowUp', { altKey: true, shiftKey: true }), page),
    ).toBe('none');
    expect(hidden(c)).toEqual([14, 15]);
    // on its summary, Alt+Shift+Down shows it again — and the cell says how
    c.selectCell(16, 0);
    expect(c.describeCell(16, 0)).toContain(
      'details hidden, Alt+Shift+Down to show',
    );
    c.keydown(key('ArrowDown', { altKey: true, shiftKey: true }), page);
    expect(hidden(c)).toEqual([]);
    // outside every row group: the columns' group
    c.selectCell(2, 4);
    c.keydown(key('ArrowUp', { altKey: true, shiftKey: true }), page);
    expect(c.sheet()?.getColumn(4)?.hidden).toBe(true);
    // nothing to show here: the key stays the page's
    c.selectCell(30, 10);
    expect(
      c.keydown(key('ArrowDown', { altKey: true, shiftKey: true }), page),
    ).toBeNull();
  });
});
