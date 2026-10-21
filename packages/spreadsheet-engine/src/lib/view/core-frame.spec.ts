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
