import { OGE_SHEET_MAX_ROWS } from '../address/address';
import { OGE_EN_US_FORMAT_LOCALE } from '../format/format-locale';
import { ogeRichText } from '../model/cell';
import type { OgeCellStyle } from '../model/style';
import { createOgeWorkbook, type OgeWorkbook } from '../model/workbook';
import type { OgeTextMeasurer } from '../paint/cell-text';
import { ogePaintWindow, type OgePaintCell } from '../paint/paint-window';
import { OgeStyleResolver } from '../paint/resolve-style';
import { OgeSheetLayout } from '../paint/sheet-layout';
import { ogeCellSelection } from './navigation';
import {
  ogeFontCss,
  ogeHeaderCells,
  ogeRenderPane,
  ogeSelectionShapes,
  type OgeRenderText,
} from './render';

const fixed: OgeTextMeasurer = { measure: (text) => text.length * 7 };

function render(
  build: (workbook: OgeWorkbook) => void,
  options: { showGridLines?: boolean; originX?: number; originY?: number } = {},
) {
  const workbook = createOgeWorkbook();
  build(workbook);
  const sheet = workbook.sheets[0];
  const resolver = new OgeStyleResolver(workbook);
  const layout = new OgeSheetLayout(sheet, resolver, { measurer: fixed });
  const window = { top: 0, left: 0, bottom: 4, right: 3 };
  const cells: OgePaintCell[] = ogePaintWindow(
    sheet,
    layout,
    resolver,
    window,
    {
      measurer: fixed,
      locale: OGE_EN_US_FORMAT_LOCALE,
      dateSystem: '1900',
    },
  );
  const pane = ogeRenderPane({
    key: 'main',
    sheet,
    axes: layout.zoomed(100),
    cells,
    rows: { first: 0, last: 4 },
    cols: { first: 0, last: 3 },
    originX: options.originX ?? 0,
    originY: options.originY ?? 0,
    width: 256,
    height: 100,
    showGridLines: options.showGridLines ?? true,
    zoom: 100,
    runFont: (cell, run) => resolver.font({ ...cell.font.source, ...run.font }),
  });
  return { workbook, sheet, layout, pane };
}

const text = (
  pane: { texts: readonly OgeRenderText[] },
  row: number,
  col: number,
) => pane.texts.find((t) => t.row === row && t.col === col) as OgeRenderText;
const intern = (workbook: OgeWorkbook, style: OgeCellStyle) =>
  workbook.styles.intern(style);

describe('ogeRenderPane', () => {
  it('places fills a pixel up and left, and draws gridlines unless hidden', () => {
    const { pane } = render((workbook) => {
      workbook.sheets[0].setCell(1, 1, {
        value: 'x',
        style: intern(workbook, {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { rgb: 'FFFFFF00' },
          },
        }),
      });
    });
    expect(pane.fills).toEqual([
      {
        key: '1:1',
        style: {
          left: '63px',
          top: '19px',
          width: '65px',
          height: '21px',
          background: '#FFFF00',
        },
      },
    ]);
    expect(pane.gridlines).toContain('M63.5 0V20');
    expect(
      render(() => undefined, { showGridLines: false }).pane.gridlines,
    ).toBe('');
  });

  it('positions left, right and centred text inside the margins', () => {
    const { pane } = render((workbook) => {
      const sheet = workbook.sheets[0];
      sheet.setCell(0, 0, { value: 'left' });
      sheet.setCell(1, 0, { value: 12 });
      sheet.setCell(2, 0, {
        value: 'mid',
        style: intern(workbook, { alignment: { horizontal: 'center' } }),
      });
      sheet.setCell(3, 0, {
        value: 'in',
        style: intern(workbook, {
          alignment: { horizontal: 'left', indent: 1 },
        }),
      });
    });
    // the clip box stops before the cell's own gridline
    expect(text(pane, 0, 0)).toMatchObject({
      text: 'left',
      clip: { left: '0px', top: '0px', width: '63px', height: '19px' },
    });
    expect(text(pane, 0, 0).style).toMatchObject({
      left: '2px',
      top: '0px',
      lineHeight: '20px',
      color: '#000000',
      whiteSpace: 'pre',
    });
    // numbers sit right: a margin and a pixel inside the gridline, as Excel draws them
    expect(text(pane, 1, 0).style).toMatchObject({ right: '3px' });
    // centred on the cell's middle pixel
    expect(text(pane, 2, 0).style).toMatchObject({
      textAlign: 'center',
      left: '-1px',
      width: '65px',
    });
    // indent: 9 px a level for Calibri 11
    expect(text(pane, 3, 0).style).toMatchObject({ left: '11px' });
  });

  it('spills text over empty neighbours and keeps the gridline it crosses hidden', () => {
    const { pane } = render((workbook) =>
      workbook.sheets[0].setCell(0, 0, { value: 'x'.repeat(12) }),
    );
    expect(text(pane, 0, 0).clip).toMatchObject({ left: '0px', width: '91px' });
    expect(pane.gridlines).toContain('M63.5 20V100');
  });

  it('wraps lines, justifies them and repeats fill characters', () => {
    const { pane } = render((workbook) => {
      const sheet = workbook.sheets[0];
      sheet.setRow(0, { height: 45 });
      sheet.setCell(0, 0, {
        value: 'aaa bbb ccc',
        style: intern(workbook, { alignment: { horizontal: 'justify' } }),
      });
      sheet.setCell(1, 0, {
        value: 5,
        style: intern(workbook, { numberFormat: '"$"* 0' }),
      });
    });
    const wrapped = text(pane, 0, 0);
    expect(
      wrapped.lines?.map((l) => [l.text, l.style['textAlignLast']]),
    ).toEqual([
      ['aaa bbb', 'justify'],
      ['ccc', 'auto'],
    ]);
    expect(wrapped.style).toMatchObject({ left: '2px', width: '59px' });
    const repeat = text(pane, 1, 0);
    expect(repeat.repeat).toEqual({ before: '$', char: ' ', after: '5' });
    expect(repeat.text).toBeNull();
  });

  it('gives rich text its runs with their own fonts and colours', () => {
    const { pane } = render((workbook) =>
      workbook.sheets[0].setCell(0, 0, {
        value: ogeRichText([
          { text: 'a' },
          { text: 'b', font: { bold: true, color: { rgb: 'FFFF0000' } } },
        ]),
      }),
    );
    const rich = text(pane, 0, 0);
    expect(rich.text).toBeNull();
    expect(rich.runs?.map((r) => [r.text, r.style['color']])).toEqual([
      ['a', '#000000'],
      ['b', '#FF0000'],
    ]);
    expect(rich.runs?.[1].style['fontWeight']).toBe('700');
  });

  it('marks notes, AutoFilter buttons, icons and data bars', () => {
    const { pane } = render((workbook) => {
      const sheet = workbook.sheets[0];
      sheet.setCell(0, 0, { value: 'Head' });
      sheet.setNote(0, 0, { text: 'note' });
      sheet.autoFilter = {
        range: { top: 0, left: 0, bottom: 3, right: 1 },
        columns: [{ offset: 1, xml: '' }],
      };
    });
    const note = pane.marks.find((m) => m.kind === 'note');
    expect(note).toMatchObject({
      row: 0,
      col: 0,
      points: '0,0 6,0 6,6',
      style: { left: '57px', top: '0px', width: '6px' },
    });
    const filters = pane.marks.filter((m) => m.kind === 'filter');
    expect(filters.map((f) => [f.col, f.filtered])).toEqual([
      [0, false],
      [1, true],
    ]);
    expect(filters[0].style).toMatchObject({
      left: '46px',
      top: '2px',
      width: '17px',
    });
  });

  it('marks a table’s filter buttons, but hidden ones, and its resize handle', () => {
    const table = (
      top: number,
      left: number,
      bottom: number,
      right: number,
      filter: boolean,
    ) => ({
      id: 1,
      name: 'T',
      displayName: 'T',
      range: { top, left, bottom, right },
      headerRowCount: 1,
      totalsRowCount: 0,
      columns: [],
      ...(filter
        ? {
            autoFilter: {
              range: { top, left, bottom, right },
              columns: [{ offset: 1, xml: '', hiddenButton: true }],
            },
          }
        : {}),
    });
    const { pane } = render((workbook) => {
      const sheet = workbook.sheets[0];
      // one inside the pane, one past its bottom, one without buttons
      sheet.tables.push(
        table(0, 0, 2, 2),
        table(3, 3, 9, 4, true),
        table(1, 3, 2, 3, false),
      );
      sheet.setRow(0, { hidden: true });
    });
    const filters = pane.marks.filter((m) => m.kind === 'filter');
    // the first table's header row is hidden; the second's has a hidden button
    expect(filters.map((f) => [f.row, f.col])).toEqual([[3, 3]]);
    const handles = pane.marks.filter((m) => m.kind === 'tableHandle');
    expect(handles.map((h) => [h.row, h.col])).toEqual([
      [2, 2],
      [2, 3],
    ]);
    // a 4 px step inside the last cell's gridlines
    expect(handles[0]).toMatchObject({
      points: '2,0 4,0 4,4 0,4 0,2 2,2',
      style: { left: '187px', top: '35px', width: '4px', height: '4px' },
    });
  });

  it('works in pane pixels', () => {
    const { pane } = render(
      (workbook) => workbook.sheets[0].setCell(2, 2, { value: 'x' }),
      { originX: 64, originY: 20 },
    );
    expect(text(pane, 2, 2).clip).toMatchObject({ left: '64px', top: '20px' });
  });
});

describe('ogeFontCss', () => {
  it('turns a paint font into CSS', () => {
    const resolver = new OgeStyleResolver(createOgeWorkbook());
    expect(
      ogeFontCss(
        resolver.font({
          underline: 'double',
          strike: true,
          vertAlign: 'superscript',
        }),
        '#123456',
      ),
    ).toMatchObject({
      color: '#123456',
      textDecorationLine: 'underline line-through',
      textDecorationStyle: 'double',
      verticalAlign: 'super',
    });
    expect(
      ogeFontCss(resolver.font({ vertAlign: 'subscript' }), null),
    ).toMatchObject({ color: '#000000', verticalAlign: 'sub' });
  });
});

describe('ogeSelectionShapes', () => {
  const setup = () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    const layout = new OgeSheetLayout(sheet, new OgeStyleResolver(workbook));
    return { sheet, axes: layout.zoomed(100) };
  };
  const pane = { originX: 0, originY: 0, width: 640, height: 400 };

  it('draws one cell as a 2 px border with a white inner line, and the fill handle when asked', () => {
    const { sheet, axes } = setup();
    // C4 at 128..191 × 60..79, as measured on Excel's C4
    const viewer = ogeSelectionShapes(
      sheet,
      axes,
      ogeCellSelection(3, 2),
      pane,
    );
    // a viewer has no fill handle, as Excel's own viewer
    expect(viewer.handle).toBeNull();
    expect(viewer.moat).toBeNull();
    const shapes = ogeSelectionShapes(
      sheet,
      axes,
      ogeCellSelection(3, 2),
      pane,
      null,
      { fillHandle: true },
    );
    expect(viewer.frame).toEqual(shapes.frame);
    expect(shapes.overlay).toBe('');
    expect(shapes.frame).toEqual({
      left: '126px',
      top: '58px',
      width: '67px',
      height: '23px',
    });
    expect(shapes.inner).toEqual({
      left: '128px',
      top: '60px',
      width: '63px',
      height: '19px',
    });
    expect(shapes.handle).toEqual({
      left: '189px',
      top: '77px',
      width: '5px',
      height: '5px',
    });
    expect(shapes.moat).toEqual({
      left: '188px',
      top: '76px',
      width: '6px',
      height: '6px',
    });
  });

  it('shades a range except inside the active cell', () => {
    const { sheet, axes } = setup();
    const selection = {
      ranges: [{ top: 3, left: 2, bottom: 4, right: 3 }],
      active: { row: 3, col: 2 },
      anchor: { row: 3, col: 2 },
    };
    const shapes = ogeSelectionShapes(sheet, axes, selection, pane);
    expect(shapes.overlay).toBe('M129 61h125v37h-125ZM128 60v19h63v-19Z');
  });

  it('clamps whole columns to the pane, drops the handle, and outlines the active cell of several ranges', () => {
    const { sheet, axes } = setup();
    const column = {
      ranges: [{ top: 0, left: 1, bottom: OGE_SHEET_MAX_ROWS - 1, right: 1 }],
      active: { row: 0, col: 1 },
      anchor: { row: 0, col: 1 },
    };
    const shapes = ogeSelectionShapes(sheet, axes, column, pane, null, {
      fillHandle: true,
    });
    expect(shapes.frame?.['height']).toBe('411px');
    expect(shapes.handle).toBeNull();
    const two = {
      ranges: [
        { top: 0, left: 0, bottom: 1, right: 0 },
        { top: 5, left: 5, bottom: 5, right: 5 },
      ],
      active: { row: 5, col: 5 },
      anchor: { row: 5, col: 5 },
    };
    const multi = ogeSelectionShapes(sheet, axes, two, pane);
    expect(multi.frame).toBeNull();
    expect(multi.active).toEqual({
      left: '319px',
      top: '99px',
      width: '65px',
      height: '21px',
    });
    expect(multi.overlay).toBe('M1 1h61v37h-61Z');
  });
});

describe('ogeHeaderCells', () => {
  it('labels, measures and marks header cells', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    sheet.setColumns(1, 1, { hidden: true });
    const axes = new OgeSheetLayout(
      sheet,
      new OgeStyleResolver(workbook),
    ).zoomed(100);
    const selection = {
      ranges: [
        { top: 0, left: 2, bottom: OGE_SHEET_MAX_ROWS - 1, right: 2 },
        { top: 1, left: 0, bottom: 1, right: 0 },
      ],
      active: { row: 1, col: 0 },
      anchor: { row: 1, col: 0 },
    };
    expect(
      ogeHeaderCells('columns', axes, { first: 0, last: 3 }, 0, selection),
    ).toEqual([
      { index: 0, label: 'A', offset: 0, size: 64, state: 'selected' },
      // B is hidden: C carries Excel's double line before it
      {
        index: 2,
        label: 'C',
        offset: 64,
        size: 64,
        state: 'full',
        afterHidden: true,
      },
      { index: 3, label: 'D', offset: 128, size: 64, state: 'none' },
    ]);
    expect(
      ogeHeaderCells('rows', axes, { first: 0, last: 2 }, 20, selection).map(
        (h) => [h.label, h.offset, h.state],
      ),
    ).toEqual([
      ['1', -20, 'selected'],
      ['2', 0, 'selected'],
      ['3', 20, 'selected'],
    ]);
  });
});

describe('ogeSelectionShapes — spill', () => {
  it('frames a spill range over its boundary gridlines', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    const axes = new OgeSheetLayout(
      sheet,
      new OgeStyleResolver(workbook),
    ).zoomed(100);
    const shapes = ogeSelectionShapes(
      sheet,
      axes,
      ogeCellSelection(14, 0),
      { originX: 0, originY: 0, width: 640, height: 400 },
      { top: 13, left: 0, bottom: 17, right: 0 },
    );
    expect(shapes.spill).toEqual({
      left: '-1px',
      top: '259px',
      width: '65px',
      height: '101px',
    });
    expect(
      ogeSelectionShapes(sheet, axes, ogeCellSelection(14, 0), {
        originX: 0,
        originY: 0,
        width: 640,
        height: 400,
      }).spill,
    ).toBeNull();
  });
});

describe('ogeRenderPane — underlines', () => {
  it('places single and double underlines like Excel and draws accounting ones across the cell', () => {
    const { pane } = render((workbook) => {
      const sheet = workbook.sheets[0];
      sheet.setCell(0, 0, {
        value: 'u',
        style: workbook.styles.intern({ font: { underline: 'single' } }),
      });
      sheet.setCell(1, 0, {
        value: 'u',
        style: workbook.styles.intern({ font: { underline: 'double' } }),
      });
      sheet.setCell(2, 0, {
        value: 'u',
        style: workbook.styles.intern({
          font: { underline: 'singleAccounting' },
        }),
      });
      sheet.setCell(3, 0, {
        value: 'u',
        style: workbook.styles.intern({
          font: { underline: 'doubleAccounting', strike: true },
        }),
      });
    });
    expect(text(pane, 0, 0).style).toMatchObject({
      textDecorationLine: 'underline',
      textUnderlineOffset: '2px',
      textDecorationThickness: '1px',
    });
    expect(text(pane, 1, 0).style).toMatchObject({
      textDecorationStyle: 'double',
      textUnderlineOffset: '1px',
    });
    // accounting: no text decoration, a line across the text area 3 px above the gridline
    expect(text(pane, 2, 0).style['textDecorationLine']).toBeUndefined();
    const single = pane.marks.filter(
      (m) => m.kind === 'underline' && m.row === 2,
    );
    expect(single.map((m) => m.style)).toEqual([
      {
        left: '2px',
        top: '56px',
        width: '59px',
        height: '1px',
        background: '#000000',
      },
    ]);
    const double = pane.marks.filter(
      (m) => m.kind === 'underline' && m.row === 3,
    );
    expect(double.map((m) => m.style['top'])).toEqual(['75px', '77px']);
    expect(text(pane, 3, 0).style['textDecorationLine']).toBe('line-through');
  });
});

describe('ogeRenderPane — super- and subscript cells', () => {
  it('draws them as a small run in a full-size line box', () => {
    const { pane } = render((workbook) => {
      workbook.sheets[0].setCell(0, 0, {
        value: 'x2',
        style: workbook.styles.intern({ font: { vertAlign: 'superscript' } }),
      });
    });
    const cell = text(pane, 0, 0);
    expect(cell.text).toBeNull();
    expect(cell.style['fontSize']).toBe('15px');
    expect(cell.runs?.[0]).toMatchObject({
      text: 'x2',
      style: { verticalAlign: 'super' },
    });
    expect(cell.runs?.[0].style['fontSize']).toBe('9.9px');
  });
});
