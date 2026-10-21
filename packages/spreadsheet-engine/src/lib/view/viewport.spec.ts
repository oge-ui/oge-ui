import { createOgeWorkbook } from '../model/workbook';
import { OgeAxis } from '../paint/axis';
import { OgeStyleResolver } from '../paint/resolve-style';
import { OgeSheetLayout } from '../paint/sheet-layout';
import {
  ogeCellAt,
  ogeCellBox,
  ogeRangeBox,
  ogeRevealScroll,
  ogeScrollToCell,
  ogeSheetHeaders,
  ogeViewportPanes,
} from './viewport';

function setup() {
  const workbook = createOgeWorkbook();
  const sheet = workbook.sheets[0];
  const layout = () =>
    new OgeSheetLayout(sheet, new OgeStyleResolver(workbook));
  return { workbook, sheet, layout };
}

// Calibri 11: a 26 px row-number column and a 20 px letter row; the cell area is 640 × 400
const at = (scrollTop = 0, scrollLeft = 0, zoom = 100) => ({
  scrollTop,
  scrollLeft,
  width: 26 + 640,
  height: 20 + 400,
  zoom,
  active: { row: 0, col: 0 },
});

describe('ogeSheetHeaders', () => {
  it('fits at least three digits of the Normal font at the zoom', () => {
    const calibri = { name: 'Calibri', sizePt: 11 };
    expect(ogeSheetHeaders(calibri, 100, 0)).toEqual({
      rowHeaderWidth: 26,
      columnHeaderHeight: 20,
      fontPx: 15,
    });
    expect(ogeSheetHeaders(calibri, 100, 999).rowHeaderWidth).toBe(33);
    expect(ogeSheetHeaders(calibri, 100, 1_048_575).rowHeaderWidth).toBe(54);
    expect(ogeSheetHeaders(calibri, 90, 0)).toMatchObject({
      rowHeaderWidth: 26,
      columnHeaderHeight: 17,
    });
    expect(ogeSheetHeaders(calibri, 200, 0)).toMatchObject({
      rowHeaderWidth: 54,
      columnHeaderHeight: 38,
    });
  });
});

describe('ogeViewportPanes', () => {
  it('windows an empty sheet: headers, overscan and an Excel-like extent', () => {
    const { sheet, layout } = setup();
    const panes = ogeViewportPanes(sheet, layout(), at());
    expect(panes.headers).toMatchObject({
      rowHeaderWidth: 26,
      columnHeaderHeight: 20,
    });
    expect({ width: panes.cellWidth, height: panes.cellHeight }).toEqual({
      width: 640,
      height: 400,
    });
    expect(panes.rows).toEqual({ first: 0, last: 19 + 4 });
    expect(panes.cols).toEqual({ first: 0, last: 9 + 2 });
    expect(panes.frozenRowSpan.last).toBeLessThan(panes.frozenRowSpan.first);
    // a screenful (20 rows, 10 columns) plus the margin past it
    expect(panes.scrollHeight).toBe((20 + 40 + 1) * 20);
    expect(panes.scrollWidth).toBe((10 + 12 + 1) * 64);
    expect(panes.pageRows).toBe(20);
    expect(panes.pageCols).toBe(10);
  });

  it('widens the row-number column once four-digit rows show', () => {
    const { sheet, layout } = setup();
    const panes = ogeViewportPanes(sheet, layout(), at(990 * 20));
    expect(panes.headers.rowHeaderWidth).toBe(33);
    expect(panes.cellWidth).toBe(666 - 33);
  });

  it('reaches past the used range and the active cell', () => {
    const { sheet, layout } = setup();
    sheet.setCell(999, 3, { value: 1 });
    const panes = ogeViewportPanes(sheet, layout(), {
      ...at(),
      active: { row: 5, col: 60 },
    });
    expect(panes.scrollHeight).toBe((999 + 40 + 1) * 20);
    expect(panes.scrollWidth).toBe((60 + 12 + 1) * 64);
  });

  it('keeps frozen rows and columns out of the scrolling window', () => {
    const { sheet, layout } = setup();
    sheet.view = { ...sheet.view, frozenRows: 2, frozenColumns: 1 };
    const panes = ogeViewportPanes(sheet, layout(), at(200, 128));
    expect(panes).toMatchObject({
      frozenRows: 2,
      frozenColumns: 1,
      frozenHeight: 40,
      frozenWidth: 64,
      originY: 40,
      originX: 64,
    });
    expect(panes.frozenRowSpan).toEqual({ first: 0, last: 1 });
    expect(panes.frozenColSpan).toEqual({ first: 0, last: 0 });
    // 200 px past row 3: row 13 shows first, four rows of overscan before it
    expect(panes.rows.first).toBe(12 - 4);
    expect(panes.cols.first).toBe(1);
    expect(ogeViewportPanes(sheet, layout(), at()).rows.first).toBe(2);
    expect(ogeScrollToCell(panes, { row: 10, col: 5 })).toEqual({
      scrollTop: 10 * 20 - 40,
      scrollLeft: 5 * 64 - 64,
    });
    expect(ogeScrollToCell(panes, { row: 0, col: 0 })).toEqual({
      scrollTop: 0,
      scrollLeft: 0,
    });
  });

  it('lays a zoomed sheet out in whole pixels and reads a right-to-left scroll', () => {
    const { sheet, layout } = setup();
    const zoomed = ogeViewportPanes(sheet, layout(), {
      ...at(0, 0, 200),
      width: 54 + 640,
      height: 38 + 400,
    });
    expect(zoomed.headers).toMatchObject({
      rowHeaderWidth: 54,
      columnHeaderHeight: 38,
    });
    expect(zoomed.axes.rows.size(0)).toBe(40);
    expect(zoomed.rows.last).toBe(9 + 4);
    expect(zoomed.cols.last).toBe(4 + 2);
    const rtl = ogeViewportPanes(sheet, layout(), at(0, -640));
    expect(rtl.cols.first).toBe(10 - 2);
  });

  it('skips hidden rows and can hide the headers', () => {
    const { sheet, layout } = setup();
    for (let row = 0; row < 5; row++) sheet.setRow(row, { hidden: true });
    expect(
      ogeViewportPanes(sheet, layout(), { ...at(), overscanRows: 0 }).rows
        .first,
    ).toBe(5);
    const bare = ogeViewportPanes(sheet, layout(), { ...at(), headers: false });
    expect(bare.headers).toMatchObject({
      rowHeaderWidth: 0,
      columnHeaderHeight: 0,
    });
    expect(bare.cellWidth).toBe(666);
    sheet.view = { ...sheet.view, showHeaders: false };
    expect(ogeViewportPanes(sheet, layout(), at()).headers.rowHeaderWidth).toBe(
      0,
    );
  });
});

describe('cell geometry', () => {
  it('boxes cells, merges and ranges at a zoom, and finds the cell under a point', () => {
    const { sheet, layout } = setup();
    sheet.addMerge({ top: 1, left: 1, bottom: 2, right: 3 });
    const geometry = layout();
    const axes = geometry.zoomed(100);
    expect(ogeCellBox(sheet, axes, 0, 0)).toEqual({
      x: 0,
      y: 0,
      width: 64,
      height: 20,
    });
    expect(ogeCellBox(sheet, axes, 2, 2)).toEqual({
      x: 64,
      y: 20,
      width: 192,
      height: 40,
    });
    expect(ogeRangeBox(axes, { top: 0, left: 0, bottom: 1, right: 1 })).toEqual(
      { x: 0, y: 0, width: 128, height: 40 },
    );
    expect(ogeCellAt(sheet, axes, 130, 45)).toEqual({ row: 1, col: 1 });
    expect(ogeCellAt(sheet, axes, 10, 10)).toEqual({ row: 0, col: 0 });
    expect(ogeCellAt(sheet, axes, -5, -5)).toEqual({ row: 0, col: 0 });
    // at 90% a 64 px column is 58 px and a 20 px row 18 px
    expect(ogeCellBox(sheet, geometry.zoomed(90), 0, 1)).toEqual({
      x: 58,
      y: 0,
      width: 58,
      height: 18,
    });
  });

  it('rounds each zoomed size on its own and caches the last zoom', () => {
    const axis = new OgeAxis(10, 98);
    axis.set(0, 182);
    axis.set(3, 0);
    const zoomed = axis.scaled(0.9);
    expect([
      zoomed.size(0),
      zoomed.size(1),
      zoomed.size(2),
      zoomed.size(3),
    ]).toEqual([164, 88, 88, 0]);
    expect(zoomed.offset(3)).toBe(164 + 88 + 88);
    const { layout } = setup();
    const geometry = layout();
    expect(geometry.zoomed(100).rows).toBe(geometry.rows);
    expect(geometry.zoomed(75)).toBe(geometry.zoomed(75));
    const before = geometry.zoomed(75);
    geometry.refresh();
    expect(geometry.zoomed(75)).not.toBe(before);
  });
});

describe('ogeRevealScroll', () => {
  const origin = { scrollTop: 0, scrollLeft: 0 };

  it('scrolls as little as it can', () => {
    const { sheet, layout } = setup();
    const panes = ogeViewportPanes(sheet, layout(), at());
    // row 31 (y 600..620) below a 400 px view: its bottom lands on the view's bottom
    expect(ogeRevealScroll(sheet, panes, { row: 30, col: 0 }, origin)).toEqual({
      scrollTop: 220,
      scrollLeft: 0,
    });
    expect(ogeRevealScroll(sheet, panes, { row: 3, col: 3 }, origin)).toEqual(
      origin,
    );
    expect(
      ogeRevealScroll(
        sheet,
        panes,
        { row: 2, col: 1 },
        { scrollTop: 500, scrollLeft: 300 },
      ),
    ).toEqual({ scrollTop: 40, scrollLeft: 64 });
    expect(
      ogeRevealScroll(sheet, panes, { row: 0, col: 12 }, origin).scrollLeft,
    ).toBe(13 * 64 - 640);
  });

  it('never scrolls for a frozen cell; a cell taller than the view shows its top', () => {
    const { sheet, layout } = setup();
    sheet.view = { ...sheet.view, frozenRows: 1, frozenColumns: 1 };
    sheet.setRow(20, { height: 600 });
    const geometry = layout();
    const panes = ogeViewportPanes(sheet, geometry, at());
    const current = { scrollTop: 100, scrollLeft: 100 };
    expect(ogeRevealScroll(sheet, panes, { row: 0, col: 0 }, current)).toEqual(
      current,
    );
    expect(
      ogeRevealScroll(sheet, panes, { row: 20, col: 1 }, origin).scrollTop,
    ).toBe(geometry.rows.offset(20) - 20);
    // zoomed: column F spans 512..640 past the frozen column, the room is 512
    const zoomed = ogeViewportPanes(sheet, geometry, {
      ...at(0, 0, 200),
      width: 54 + 640,
      height: 38 + 400,
    });
    expect(
      ogeRevealScroll(sheet, zoomed, { row: 1, col: 5 }, current).scrollLeft,
    ).toBe(128);
  });
});
