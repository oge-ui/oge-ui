import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createOgeWorkbook, type OgeWorkbook } from '../model/workbook';
import {
  OgeSpreadsheetCore,
  type OgeGridPointerInput,
  type OgeSpreadsheetKeyInput,
} from './core';
import type { OgeGridPointerPoint } from './grid-view';
import { createPlainSpreadsheetReactivity } from './reactivity';
import type { OgeViewportPanes } from './viewport';

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
const input = (
  mods: Partial<OgeGridPointerInput> = {},
): OgeGridPointerInput => ({
  pointerId: 1,
  button: 0,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  ...mods,
});

// Calibri 11: a 26 px row-number column and a 20 px letter row, 64 × 20 px cells
const rect = { left: 0, right: 666, top: 0 };
/** A point in the middle of a cell (or, with `x`/`y`, anywhere). */
const over = (row: number, col: number): OgeGridPointerPoint => ({
  clientX: 26 + col * 64 + 10,
  clientY: 20 + row * 20 + 5,
  rect,
  scrollTop: 0,
  scrollLeft: 0,
});
const at = (x: number, y: number): OgeGridPointerPoint => ({
  clientX: x,
  clientY: y,
  rect,
  scrollTop: 0,
  scrollLeft: 0,
});

function book(): OgeWorkbook {
  const workbook = createOgeWorkbook();
  const sheet = workbook.sheets[0];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) sheet.setCell(r, c, { value: r * 3 + c + 1 });
  sheet.addHyperlink({
    range: { top: 4, left: 0, bottom: 4, right: 0 },
    target: 'https://example.com/',
  });
  sheet.setNote(5, 1, { text: 'hello' });
  workbook.addSheet('Two').setCell(0, 0, { value: 'two' });
  workbook.addSheet('Three');
  return workbook;
}

function setup(workbook: OgeWorkbook | null = book()) {
  const c = new OgeSpreadsheetCore({
    reactivity: createPlainSpreadsheetReactivity(),
  });
  if (workbook) c.setWorkbook(workbook);
  const panes = () =>
    c.panes({
      width: 666,
      height: 420,
      scrollTop: 0,
      scrollLeft: 0,
    }) as OgeViewportPanes;
  return { c, panes };
}

describe('OgeSpreadsheetCore — pointer', () => {
  it('selects the cell it goes down on, and a click — down and up on one cell — follows a plain one', () => {
    const { c, panes } = setup();
    expect(c.pointerDown(panes(), over(1, 1), null, input())).toBe(true);
    expect(c.selection().active).toEqual({ row: 1, col: 1 });
    expect(c.pointerUp(panes(), over(1, 1), input())).toEqual({
      row: 1,
      col: 1,
      address: 'B2',
      text: '5',
      follow: true,
    });
    c.pointerDown(panes(), over(4, 0), null, input());
    expect(
      c.pointerUp(panes(), over(4, 0), input({ ctrlKey: true })),
    ).toMatchObject({ address: 'A5', follow: false });
    // up on another cell, or with no gesture under way: no click
    c.pointerDown(panes(), over(0, 0), null, input());
    expect(c.pointerUp(panes(), at(5, 5), input())).toBeNull();
    expect(c.pointerUp(panes(), over(0, 0), input())).toBeNull();
  });

  it('drags a range, extending to the nearest cell past the edge; a drag is not a click', () => {
    const { c, panes } = setup();
    c.pointerDown(panes(), over(0, 0), null, input());
    c.pointerMove(panes(), over(0, 0), input());
    expect(c.selection().ranges).toEqual([
      { top: 0, left: 0, bottom: 0, right: 0 },
    ]);
    c.pointerMove(panes(), over(2, 2), input());
    expect(c.selection().ranges).toEqual([
      { top: 0, left: 0, bottom: 2, right: 2 },
    ]);
    // over the row numbers: the nearest cell is in column A
    c.pointerMove(panes(), at(5, 20 + 3 * 20 + 5), input());
    expect(c.selection().ranges).toEqual([
      { top: 0, left: 0, bottom: 3, right: 0 },
    ]);
    // another pointer does not drag
    c.pointerMove(panes(), over(6, 6), input({ pointerId: 2 }));
    expect(c.selection().ranges[0].bottom).toBe(3);
    expect(c.pointerUp(panes(), over(3, 0), input())).toBeNull();
    // after the drag ends, moving only hovers
    c.pointerMove(panes(), over(6, 6), input());
    expect(c.selection().ranges[0].bottom).toBe(3);
    expect(c.hover()).toEqual({ row: 6, col: 6 });
  });

  it('selects columns, rows and everything from the headers — Shift extends, Ctrl adds', () => {
    const { c, panes } = setup();
    c.selectCell(1, 1);
    expect(
      c.pointerDown(
        panes(),
        at(0, 0),
        { kind: 'column-header', col: 3 },
        input({ shiftKey: true }),
      ),
    ).toBe(true);
    expect(c.selection().ranges.at(-1)).toMatchObject({
      left: 1,
      right: 3,
      top: 0,
    });
    c.pointerMove(panes(), over(2, 4), input());
    expect(c.selection().ranges.at(-1)).toMatchObject({ left: 3, right: 4 });
    c.pointerUp(panes(), over(2, 4), input());
    c.pointerDown(
      panes(),
      at(0, 0),
      { kind: 'row-header', row: 2 },
      input({ ctrlKey: true }),
    );
    expect(c.selection().ranges).toHaveLength(2);
    c.pointerMove(panes(), over(5, 1), input());
    expect(c.selection().ranges.at(-1)).toMatchObject({
      top: 2,
      bottom: 5,
      left: 0,
    });
    c.pointerCancel();
    c.pointerMove(panes(), over(8, 1), input());
    expect(c.selection().ranges.at(-1)).toMatchObject({ bottom: 5 });
    c.pointerDown(panes(), at(0, 0), { kind: 'select-all' }, input());
    expect(c.selection().ranges).toEqual([
      { top: 0, left: 0, bottom: 1048575, right: 16383 },
    ]);
  });

  it('ignores other buttons, cells past the grid and a missing workbook', () => {
    const { c, panes } = setup();
    expect(c.pointerDown(panes(), over(1, 1), null, input({ button: 2 }))).toBe(
      false,
    );
    expect(c.pointerDown(panes(), at(5, 5), null, input())).toBe(false);
    const empty = setup(null);
    expect(empty.c.pointerDown(panes(), over(1, 1), null, input())).toBe(false);
    empty.c.pointerMove(panes(), over(1, 1), input());
    expect(empty.c.hover()).toBeNull();
    expect(empty.c.pointerUp(panes(), over(1, 1), input())).toBeNull();
  });

  it('hovers a cell — a link shows the hand, a note opens — until the pointer leaves', () => {
    const { c, panes } = setup();
    c.pointerMove(panes(), over(4, 0), input());
    expect(c.hoverLink()).toBe(true);
    c.pointerMove(panes(), over(5, 1), input());
    expect(c.hoverLink()).toBe(false);
    expect(
      c.notes(panes(), { scrollTop: 0, scrollLeft: 0 }).map((n) => n.key),
    ).toEqual(['5:1']);
    c.pointerMove(panes(), at(5, 5), input());
    expect(c.hover()).toBeNull();
    c.pointerMove(panes(), over(5, 1), input());
    c.pointerLeave();
    expect(c.hover()).toBeNull();
    c.pointerLeave();
    expect(c.notes(panes(), { scrollTop: 0, scrollLeft: 0 })).toEqual([]);
    expect(
      setup(null).c.notes(panes(), { scrollTop: 0, scrollLeft: 0 }),
    ).toEqual([]);
  });
});

describe('OgeSpreadsheetCore — notes, find bar and tabs', () => {
  it('opens the active cell’s note with Shift+F2 and closes it with Escape, which then is the page’s', () => {
    const { c, panes } = setup();
    c.selectCell(5, 1);
    expect(c.keydown(key('F2', { shiftKey: true }), page)).toBe('none');
    expect(c.openNote()).toEqual({ row: 5, col: 1 });
    expect(c.notes(panes(), { scrollTop: 0, scrollLeft: 0 })).toHaveLength(1);
    expect(c.keydown(key('Escape'), page)).toBe('none');
    expect(c.openNote()).toBeNull();
    expect(c.keydown(key('Escape'), page)).toBeNull();
    // a new sheet closes it too
    c.keydown(key('F2', { shiftKey: true }), page);
    c.selectSheet(1);
    expect(c.openNote()).toBeNull();
  });

  it('opens the find bar on Ctrl+F, steps through matches on submit and keeps its options', () => {
    const { c } = setup();
    expect(c.keydown(key('f', { ctrlKey: true }), page)).toBe('find');
    expect(c.findState().open).toBe(true);
    c.toggleFindOption('matchCase', '');
    expect(c.findState().options).toEqual({ matchCase: true });
    expect(c.findState().matches).toEqual([]);
    c.submitFind('?');
    expect(c.findState().matches.length).toBe(9);
    expect(c.findState().options).toEqual({ matchCase: true });
    const first = c.findState().index;
    c.submitFind('?');
    expect(c.findState().index).toBe(first + 1);
    c.submitFind('?', -1);
    expect(c.findState().index).toBe(first);
    c.toggleFindOption('workbook', '?');
    expect(c.findState().options).toEqual({ matchCase: true, workbook: true });
    expect(c.findState().matches.length).toBe(10);
  });

  it('moves between sheet tabs with their keys', () => {
    const { c } = setup();
    expect(c.tabKeydown('ArrowRight', false)).toBe(1);
    expect(c.activeSheet()).toBe(1);
    expect(c.tabKeydown('ArrowRight', true)).toBe(0);
    expect(c.tabKeydown('End', false)).toBe(2);
    expect(c.tabKeydown('Tab', false)).toBeNull();
    expect(c.activeSheet()).toBe(2);
  });
});

describe('OgeSpreadsheetCore — requests and scroll memory', () => {
  it('applies a sheet and zoom asked for before a workbook opened, once it opens', () => {
    const { c } = setup(null);
    c.requestSheet(2);
    c.requestZoom(150);
    expect(c.activeSheet()).toBe(0);
    c.setWorkbook(book());
    expect(c.activeSheet()).toBe(2);
    expect(c.zoom()).toBe(150);
    // the sheet it opens at is said last, not the zoom
    expect(c.announcement()).toBe('Sheet Three, 3 of 3');
    // only once: the next workbook opens at its own sheet
    c.setWorkbook(book());
    expect(c.activeSheet()).toBe(0);
    expect(c.zoom()).toBe(100);
    c.requestSheet(1);
    c.requestZoom(75);
    expect(c.activeSheet()).toBe(1);
    expect(c.zoom()).toBe(75);
  });

  it('reopens a sheet where it was left, else at its saved top-left cell', () => {
    const workbook = book();
    workbook.sheets[1].view = {
      ...workbook.sheets[1].view,
      topLeft: { row: 10, col: 2 },
    };
    const { c, panes } = setup(workbook);
    expect(c.sheetScroll(panes())).toEqual({ scrollTop: 0, scrollLeft: 0 });
    c.rememberScroll({ scrollTop: 120, scrollLeft: -64 });
    c.selectSheet(1);
    expect(c.sheetScroll(panes())).toEqual({ scrollTop: 200, scrollLeft: 128 });
    c.rememberScroll({ scrollTop: 40, scrollLeft: 0 });
    c.selectSheet(0);
    expect(c.sheetScroll(panes())).toEqual({ scrollTop: 120, scrollLeft: 64 });
    c.selectSheet(1);
    expect(c.sheetScroll(panes())).toEqual({ scrollTop: 40, scrollLeft: 0 });
    // a new workbook forgets them
    c.setWorkbook(book());
    expect(c.sheetScroll(panes())).toEqual({ scrollTop: 0, scrollLeft: 0 });
  });
});

describe('OgeSpreadsheetCore — frame, media and browser work', () => {
  const pictures = () =>
    new Uint8Array(
      readFileSync(resolve(__dirname, '../../../testing/corpus/pictures.xlsx')),
    );

  it('builds the grid frame with the pictures’ object URLs, and lets them go with the workbook', async () => {
    let next = 0;
    const revoked: string[] = [];
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:${++next}`);
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation((url) => void revoked.push(url));
    try {
      const { c, panes } = setup(null);
      expect(c.gridView(panes())).toBeNull();
      await c.open(pictures());
      const view = c.gridView(panes());
      const shown = view?.render.flatMap((pane) => pane.pictures) ?? [];
      expect(shown.length).toBeGreaterThan(0);
      expect(shown[0].url).toMatch(/^blob:/);
      expect(view?.headerFont['fontSize']).toBe('15px');
      expect(c.pictureUrl('xl/media/missing.png')).toBeNull();
      const made = next;
      c.gridView(panes());
      expect(next).toBe(made);
      c.destroy();
      expect(revoked.length).toBe(made);
      const version = c.version();
      c.revive();
      expect(c.version()).toBe(version + 1);
      c.gridView(panes());
      expect(next).toBeGreaterThan(made);
      c.setWorkbook(createOgeWorkbook());
      expect(revoked.length).toBe(next);
    } finally {
      create.mockRestore();
      revoke.mockRestore();
    }
  });

  it("draws the active sheet's charts in the frame, once a zoom, and names them for assistive tech", async () => {
    const { c, panes } = setup(null);
    await c.open(
      new Uint8Array(
        readFileSync(resolve(__dirname, '../../../testing/corpus/charts.xlsx')),
      ),
    );
    expect(c.chartLabels()).toHaveLength(8);
    expect(c.chartLabels()[0]).toBe('Sales by quarter, clustered columns');
    const placed = c.charts();
    expect(placed).toHaveLength(8);
    const first = placed[0];
    if (!first) throw new Error('no chart');
    const view = c.chartView(first);
    expect(c.chartView(first)).toBe(view);
    expect(view.paths.length).toBeGreaterThan(10);
    // the first row of charts reaches the 420 px window; the others wait
    const shown =
      c.gridView(panes())?.render.flatMap((pane) => pane.charts) ?? [];
    expect(shown.map((chart) => chart.view.label)).toEqual([
      'Sales by quarter',
      'Stacked sales',
    ]);
    c.setZoom(150);
    expect(c.chartView(c.charts()[0] ?? first)).not.toBe(view);
  });

  it('leaves hidden and empty charts out, and draws in the theme’s body font', () => {
    const workbook = createOgeWorkbook();
    workbook.themeFonts = { minor: 'Aptos' };
    const sheet = workbook.sheets[0];
    const model = {
      part: 'xl/charts/chart1.xml',
      groups: [
        {
          kind: 'bar' as const,
          grouping: 'clustered' as const,
          varyColors: false,
          axes: [],
          series: [
            {
              index: 0,
              order: 0,
              categories: { labels: ['A'] },
              values: { values: [1] },
              shape: {},
            },
          ],
        },
      ],
      axes: [],
      legend: { position: 'b' as const, overlay: false, font: {}, hidden: [] },
      plotVisibleOnly: true,
      blanksAs: 'gap' as const,
      area: {},
      plotArea: {},
      font: {},
      roundedCorners: false,
      style: 2,
    };
    const box = {
      kind: 'absolute' as const,
      x: 10,
      y: 10,
      width: 200,
      height: 120,
    };
    sheet?.charts.push(
      { anchor: box, chart: model, name: 'Shown' },
      { anchor: box, chart: model, name: 'Hidden', hidden: true },
      { anchor: { ...box, width: 0 }, chart: model, name: 'Flat' },
      { anchor: box, chart: model },
    );
    const { c } = setup(workbook);
    expect(c.chartLabels()).toEqual(['Shown', 'Flat']);
    expect(c.charts().map((placed) => placed.chart.name)).toEqual([
      'Shown',
      undefined,
    ]);
    const first = c.charts()[0];
    if (!first) throw new Error('no chart');
    const label = c.chartView(first).texts.find((t) => t.text === 'Series1');
    expect(label?.style['fontFamily']).toContain('Aptos');
    expect(setup(null).c.charts()).toEqual([]);
  });

  it('opens a URL, and reports one it cannot fetch', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response(pictures()));
    try {
      const { c } = setup(null);
      await c.open('/pictures.xlsx');
      expect(c.status()).toBe('ready');
      expect(fetch).toHaveBeenCalledWith(
        '/pictures.xlsx',
        expect.objectContaining({ credentials: 'same-origin' }),
      );
      fetch.mockImplementation(async () => new Response(null, { status: 404 }));
      await c.open('/missing.xlsx');
      expect(c.status()).toBe('error');
      expect(c.error()?.code).toBe('fetch-failed');
      expect(c.announcement()).toBe('The workbook could not be downloaded.');
      // a newer open while the fetch runs wins
      fetch.mockImplementation(async () => new Response(pictures()));
      const first = c.open('/pictures.xlsx');
      const second = c.open(new Uint8Array([1, 2, 3]));
      await Promise.all([first, second]);
      expect(c.error()?.code).toBe('not-xlsx');
    } finally {
      fetch.mockRestore();
    }
  });

  it('tells cell text, and copies or prints only where it can', async () => {
    const { c } = setup();
    expect(c.cellText(1, 1)).toBe('5');
    expect(setup(null).c.cellText(0, 0)).toBe('');
    // no clipboard in Node, and no document unless the render layer passes one
    expect(await c.copyToClipboard()).toBe(false);
    expect(c.print(null)).toBe(false);
    const frame = {
      setAttribute: vi.fn(),
      style: {},
      remove: vi.fn(),
      contentDocument: null,
      contentWindow: null,
    };
    const host = {
      createElement: vi.fn(() => frame),
      body: { appendChild: vi.fn() },
    } as unknown as Document;
    // the table is built; this frame has no document to print it in
    expect(c.print(host)).toBe(false);
    expect(frame.remove).toHaveBeenCalled();
    expect(setup(null).c.print(host)).toBe(false);
    expect(await setup(null).c.copyToClipboard()).toBe(false);
  });
});

describe('OgeSpreadsheetCore — worded state', () => {
  it('words the load error, the find count and the zoom in the current catalog', async () => {
    const { c } = setup(null);
    expect(c.errorText()).toBe('');
    await c.open(new Uint8Array([1, 2, 3]));
    expect(c.errorText()).toBe('This is not an Excel workbook (.xlsx, .xlsm).');
    c.setWorkbook(book());
    expect(c.findCount()).toBe('');
    c.find('Grace-not-there');
    expect(c.findCount()).toBe('No matches');
    c.find('?');
    expect(c.findCount()).toMatch(/^1 of \d+$/);
    expect(c.zoomText()).toBe('Zoom 100%');
    c.setMessages({
      zoomLabel: 'Yakınlaştırma %{percent}',
      noMatches: 'Eşleşme yok',
    });
    c.setZoom(150);
    expect(c.zoomText()).toBe('Yakınlaştırma %150');
    expect(c.announcement()).toBe('Yakınlaştırma %150');
    c.find('Grace-not-there');
    expect(c.findCount()).toBe('Eşleşme yok');
  });
});

describe('OgeSpreadsheetCore — header clicks', () => {
  it('make the band’s first visible cell active, as Excel does, and never scroll', () => {
    const { c, panes } = setup();
    c.selectCell(6, 2);
    const reveal = c.reveal().token;
    c.pointerDown(
      panes(),
      at(0, 0),
      { kind: 'column-header', col: 3 },
      input(),
    );
    expect(c.selection().active).toEqual({ row: 0, col: 3 });
    c.pointerUp(panes(), at(0, 0), input());
    c.pointerDown(panes(), at(0, 0), { kind: 'row-header', row: 89 }, input());
    expect(c.selection().active).toEqual({ row: 89, col: 0 });
    c.pointerUp(panes(), at(0, 0), input());
    expect(c.reveal().token).toBe(reveal);
    // the keyboard keeps the active cell: Ctrl+Space selects its column
    c.selectCell(6, 2);
    c.keydown(key(' ', { ctrlKey: true }), page);
    expect(c.selection().active).toEqual({ row: 6, col: 2 });
  });

  it('skip a hidden first row or column', () => {
    const workbook = book();
    workbook.sheets[0].setRow(0, { hidden: true });
    workbook.sheets[0].setColumns(0, 0, { hidden: true });
    const { c, panes } = setup(workbook);
    c.pointerDown(
      panes(),
      at(0, 0),
      { kind: 'column-header', col: 2 },
      input(),
    );
    expect(c.selection().active).toEqual({ row: 1, col: 2 });
    c.pointerUp(panes(), at(0, 0), input());
    c.pointerDown(panes(), at(0, 0), { kind: 'row-header', row: 4 }, input());
    expect(c.selection().active).toEqual({ row: 4, col: 1 });
  });
});

describe('OgeSpreadsheetCore — outline buttons', () => {
  it('toggles a group and shows a level from the gutter, without selecting', () => {
    const workbook = book();
    const sheet = workbook.sheets[0];
    for (const row of [3, 4, 5]) sheet.setRow(row, { outlineLevel: 1 });
    const { c, panes } = setup(workbook);
    c.selectCell(1, 1);
    expect(
      c.pointerDown(
        panes(),
        at(5, 5),
        { kind: 'outline', axis: 'rows', group: 0 },
        input(),
      ),
    ).toBe(true);
    expect(sheet.getRow(3)?.hidden).toBe(true);
    expect(c.selection().active).toEqual({ row: 1, col: 1 });
    expect(c.pointerUp(panes(), at(5, 5), input())).toBeNull();
    c.pointerDown(
      panes(),
      at(5, 5),
      { kind: 'outline-level', axis: 'rows', level: 2 },
      input(),
    );
    expect(sheet.getRow(3)?.hidden).toBeUndefined();
    // a gutter takes the grid's start: the cell under a point moves with it
    expect(panes().startX).toBe(26 + 26);
    expect(c.pointerDown(panes(), at(30, 30), null, input())).toBe(false);
  });
});

describe('OgeSpreadsheetCore — header edges', () => {
  const scroll = { scrollTop: 0, scrollLeft: 0 };
  // column B ends at sheet x 128 (client 154), row 2 at sheet y 40 (client 60)
  const columnB = { kind: 'column-header', col: 1 } as const;
  const columnC = { kind: 'column-header', col: 2 } as const;
  const row2 = { kind: 'row-header', row: 1 } as const;

  it('drags a column header’s edge: Excel’s tooltip follows it, the column takes the width', () => {
    const { c, panes } = setup();
    c.pointerMove(panes(), at(152, 10), input(), columnB);
    expect(c.resizeHover()).toEqual({ axis: 'columns', index: 1 });
    c.pointerMove(panes(), at(140, 10), input(), columnB);
    expect(c.resizeHover()).toBeNull();
    // just past the edge, over C's header: still B's edge
    expect(c.pointerDown(panes(), at(155, 10), columnC, input())).toBe(true);
    expect(c.resizing()).toEqual({ axis: 'columns', index: 1, pixels: 64 });
    expect(c.selection().active).toEqual({ row: 0, col: 0 });
    c.pointerMove(panes(), at(191, 10), input());
    expect(c.resizing()?.pixels).toBe(100);
    expect(c.resizeGuide(panes(), scroll)).toEqual({
      axis: 'columns',
      line: {
        insetInlineStart: '189px',
        top: '0',
        width: '1px',
        height: `${20 + panes().cellHeight}px`,
      },
      tip: 'Width: 13.57 (100 pixels)',
      tipStyle: { insetInlineStart: '195px', top: '2px' },
    });
    expect(c.pointerUp(panes(), at(191, 10), input())).toBeNull();
    expect(c.resizing()).toBeNull();
    expect(c.resizeGuide(panes(), scroll)).toBeNull();
    expect(panes().axes.cols.size(1)).toBe(100);
    expect(c.announcement()).toBe('Column B: Width: 13.57 (100 pixels)');
  });

  it('resizes the selected columns with the one dragged, hides them at zero, and Escape drops a drag', () => {
    const { c, panes } = setup();
    c.selectColumns(1, 3, 'replace');
    c.pointerDown(panes(), at(154, 10), columnB, input());
    c.pointerMove(panes(), at(164, 10), input());
    c.pointerUp(panes(), at(164, 10), input());
    expect([1, 2, 3].map((col) => panes().axes.cols.size(col))).toEqual([
      74, 74, 74,
    ]);
    expect(c.announcement()).toBe('Columns B to D: Width: 9.86 (74 pixels)');
    // dragged back past the column's start: hidden, as Excel hides it
    c.pointerDown(panes(), at(164, 10), columnB, input());
    c.pointerMove(panes(), at(60, 10), input());
    expect(c.resizeGuide(panes(), scroll)?.tip).toBe('Width: 0.00 (0 pixels)');
    c.pointerUp(panes(), at(60, 10), input());
    expect(c.sheet()?.getColumn(2)?.hidden).toBe(true);
    expect(c.announcement()).toBe('Columns B to D hidden');
    // Escape: the edge stays where it was
    c.pointerDown(
      panes(),
      at(90, 10),
      { kind: 'column-header', col: 0 },
      input(),
    );
    expect(c.resizing()).not.toBeNull();
    expect(c.keydown(key('Escape'), page)).toBe('none');
    expect(c.resizing()).toBeNull();
    c.pointerMove(panes(), at(200, 10), input());
    c.pointerUp(panes(), at(200, 10), input());
    expect(panes().axes.cols.size(0)).toBe(64);
  });

  it('AutoFits a column or row on a double-click on its edge, and nothing elsewhere', () => {
    const { c, panes } = setup();
    // A holds one-digit numbers: one General slot, the padding and 2 px
    expect(
      c.doubleClick(panes(), at(89, 10), { kind: 'column-header', col: 0 }),
    ).toBe(true);
    expect(panes().axes.cols.size(0)).toBe(14);
    expect(c.announcement()).toBe('Column A fitted to its contents');
    expect(c.doubleClick(panes(), at(60, 10), columnB)).toBe(false);
    expect(c.doubleClick(panes(), at(60, 10), null)).toBe(false);
    // the grid captured the pointer: the header comes from the point
    c.resizeColumns([1], 64);
    // (A is 14 px now: B ends 26 + 14 + 64 px in)
    expect(c.doubleClick(panes(), at(104, 10), null)).toBe(true);
    expect(panes().axes.cols.size(1)).toBe(14);
    expect(c.doubleClick(panes(), at(104, 300), null)).toBe(false);
    // a row's edge
    c.resizeRows([1], 40);
    expect(c.doubleClick(panes(), at(10, 80), row2)).toBe(true);
    expect(panes().axes.rows.size(1)).toBe(20);
    expect(c.sheet()?.getRow(1)?.customHeight).toBeUndefined();
  });

  it('drags a row header’s edge to a height in points', () => {
    const { c, panes } = setup();
    c.pointerMove(panes(), at(10, 59), input(), row2);
    expect(c.resizeHover()).toEqual({ axis: 'rows', index: 1 });
    expect(c.pointerDown(panes(), at(10, 60), row2, input())).toBe(true);
    c.pointerMove(panes(), at(10, 70), input());
    expect(c.resizeGuide(panes(), scroll)).toMatchObject({
      axis: 'rows',
      line: { top: '69px', height: '1px' },
      tip: 'Height: 22.50 (30 pixels)',
    });
    c.pointerUp(panes(), at(10, 70), input());
    expect(c.sheet()?.getRow(1)).toMatchObject({
      height: 22.5,
      customHeight: true,
    });
    expect(c.announcement()).toBe('Row 2: Height: 22.50 (30 pixels)');
  });

  it('gives a finger more room, and leaves a protected sheet alone unless it allows formatting', () => {
    const { c, panes } = setup();
    c.pointerMove(panes(), at(160, 10), input(), columnC);
    expect(c.resizeHover()).toBeNull();
    c.pointerMove(
      panes(),
      at(160, 10),
      input({ pointerType: 'touch' }),
      columnC,
    );
    expect(c.resizeHover()).toEqual({ axis: 'columns', index: 1 });
    const sheet = c.sheet();
    if (!sheet) throw new Error('no sheet');
    sheet.protection = { attributes: { sheet: '1' } };
    c.pointerMove(panes(), at(154, 10), input(), columnB);
    expect(c.resizeHover()).toBeNull();
    expect(c.canResize('columns')).toBe(false);
    expect(c.resizeColumns([1], 80)).toBe(false);
    expect(c.autofitRows([0])).toBe(false);
    // a header click on the edge selects the column instead
    c.pointerDown(panes(), at(154, 10), columnB, input());
    expect(c.resizing()).toBeNull();
    sheet.protection = { attributes: { sheet: '1', formatColumns: '0' } };
    expect(c.canResize('columns')).toBe(true);
    expect(c.canResize('rows')).toBe(false);
  });

  it('opens the whole selected columns’ menu on Shift+F10, under the header, and acts on them', () => {
    const { c, panes } = setup();
    // a cell selection has no header menu
    expect(c.keydown(key('F10', { shiftKey: true }), page)).toBeNull();
    c.selectColumns(1, 2, 'replace');
    expect(c.keydown(key('F10', { shiftKey: true }), page)).toBe('header-menu');
    expect(c.keydown(key('ContextMenu'), page)).toBe('header-menu');
    expect(c.openHeaderMenu(panes(), scroll)).toBe(true);
    expect(c.menu()).toEqual({
      kind: 'columns',
      focus: 0,
      style: { insetInlineStart: '90px', top: '20px' },
    });
    expect(c.menuItems().map((item) => item.label)).toEqual([
      'Column width…',
      'AutoFit column width',
      'Hide',
      'Unhide',
    ]);
    c.pickMenuItem(2);
    expect(c.menu().kind).toBeNull();
    expect([1, 2].map((col) => c.sheet()?.getColumn(col)?.hidden)).toEqual([
      true,
      true,
    ]);
    expect(c.announcement()).toBe('Columns B to C hidden');
    c.openHeaderMenu(panes(), scroll);
    c.pickMenuItem(3);
    expect([1, 2].map((col) => panes().axes.cols.size(col))).toEqual([64, 64]);
    expect(c.announcement()).toBe('Columns B to C shown');
    // nothing hidden: Unhide changes nothing
    expect(c.unhide('columns', [1, 2])).toBe(false);
    c.openHeaderMenu(panes(), scroll);
    c.pickMenuItem(1);
    expect(c.announcement()).toBe('Columns B to C fitted to their contents');
  });

  it('asks a column width in characters and a row height in points, as Excel’s dialogs do', () => {
    const { c, panes } = setup();
    c.selectColumns(1, 1, 'replace');
    c.openHeaderMenu(panes(), scroll);
    c.pickMenuItem(0);
    expect(c.sizeDialog()).toEqual({
      axis: 'columns',
      targets: [1],
      value: '8.43',
      invalid: false,
    });
    expect(c.submitSizeDialog('300')).toBe(false);
    expect(c.sizeDialog()).toMatchObject({ value: '300', invalid: true });
    expect(c.submitSizeDialog('wide')).toBe(false);
    expect(c.submitSizeDialog('')).toBe(false);
    expect(c.submitSizeDialog(' 12,5 ')).toBe(true);
    expect(c.sizeDialog()).toBeNull();
    expect(panes().axes.cols.size(1)).toBe(93);
    expect(c.announcement()).toBe('Column B: Width: 12.57 (93 pixels)');
    // rows: points
    c.selectRows(3, 3, 'replace');
    expect(c.keydown(key('F10', { shiftKey: true }), page)).toBe('header-menu');
    c.openHeaderMenu(panes(), scroll);
    expect(c.menu().style).toEqual({ insetInlineStart: '26px', top: '100px' });
    expect(c.menuItems()[0].label).toBe('Row height…');
    c.pickMenuItem(0);
    expect(c.sizeDialog()?.value).toBe('15');
    expect(c.submitSizeDialog('410')).toBe(false);
    expect(c.submitSizeDialog('30')).toBe(true);
    expect(panes().axes.rows.size(3)).toBe(40);
    // closing changes nothing
    c.openSizeDialog('rows', [3]);
    c.closeSizeDialog();
    expect(c.sizeDialog()).toBeNull();
    expect(panes().axes.rows.size(3)).toBe(40);
  });

  it('opens a header’s menu on a right-click, selecting the column first unless it is selected', () => {
    const { c, panes } = setup();
    expect(c.contextMenu(panes(), at(60, 60), null, scroll)).toBe(false);
    expect(c.contextMenu(panes(), at(180, 10), columnC, scroll)).toBe(true);
    expect(c.selection().ranges).toEqual([
      { top: 0, left: 2, bottom: 1048575, right: 2 },
    ]);
    expect(c.menu()).toMatchObject({
      kind: 'columns',
      style: { insetInlineStart: '180px', top: '10px' },
    });
    // a right-click inside the selection keeps it
    c.closeMenu();
    c.selectColumns(1, 3, 'replace');
    c.contextMenu(panes(), at(180, 10), null, scroll);
    expect(c.selection().ranges[0]).toMatchObject({ left: 1, right: 3 });
    // rows
    c.contextMenu(panes(), at(10, 70), null, scroll);
    expect(c.menu().kind).toBe('rows');
    expect(c.selection().ranges[0]).toMatchObject({ top: 2, bottom: 2 });
    // a protected sheet keeps the browser's own menu
    const sheet = c.sheet();
    if (!sheet) throw new Error('no sheet');
    sheet.protection = { attributes: { sheet: '1' } };
    expect(c.contextMenu(panes(), at(180, 10), columnC, scroll)).toBe(false);
    expect(c.keydown(key('F10', { shiftKey: true }), page)).toBeNull();
  });

  it('follows the pointer the mirrored way on a right-to-left sheet', () => {
    const workbook = book();
    workbook.sheets[0].view = { ...workbook.sheets[0].view, rightToLeft: true };
    const { c, panes } = setup(workbook);
    // B ends 26 + 128 px from the right edge
    expect(c.pointerDown(panes(), at(666 - 154, 10), columnB, input())).toBe(
      true,
    );
    c.pointerMove(panes(), at(666 - 164, 10), input());
    c.pointerUp(panes(), at(666 - 164, 10), input());
    expect(panes().axes.cols.size(1)).toBe(74);
  });
});
