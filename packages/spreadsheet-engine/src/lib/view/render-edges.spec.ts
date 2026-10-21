import { OGE_EN_US_FORMAT_LOCALE } from '../format/format-locale';
import { ogeRichText } from '../model/cell';
import type { OgeCellStyle } from '../model/style';
import { createOgeWorkbook, type OgeWorkbook } from '../model/workbook';
import type { OgeTextMeasurer } from '../paint/cell-text';
import { ogePaintWindow, type OgePaintCell } from '../paint/paint-window';
import { OgeStyleResolver } from '../paint/resolve-style';
import { OgeSheetLayout } from '../paint/sheet-layout';
import { ogeZoomOffset, ogeZoomPaint } from '../paint/zoom';
import { ogePrintTable } from './clipboard';
import {
  ogeRenderPane,
  ogeSelectionShapes,
  type OgeRenderText,
} from './render';

const fixed: OgeTextMeasurer = { measure: (text) => text.length * 7 };

function setup(build: (workbook: OgeWorkbook) => void) {
  const workbook = createOgeWorkbook();
  build(workbook);
  const sheet = workbook.sheets[0];
  const resolver = new OgeStyleResolver(workbook);
  const layout = new OgeSheetLayout(sheet, resolver, { measurer: fixed });
  const cells: OgePaintCell[] = ogePaintWindow(
    sheet,
    layout,
    resolver,
    { top: 0, left: 0, bottom: 8, right: 4 },
    {
      measurer: fixed,
      locale: OGE_EN_US_FORMAT_LOCALE,
      dateSystem: '1900',
      conditional: {
        paint: (row, col) =>
          row === 7 && col === 0
            ? {
                dataBar: {
                  from: 0.5,
                  to: 0.1,
                  color: '#638EC6',
                  negative: true,
                  showValue: false,
                },
              }
            : row === 7 && col === 1
              ? { icon: { set: '3Arrows', index: 1, showValue: false } }
              : row === 7 && col === 2
                ? { icon: { set: '3Arrows', index: 2, showValue: true } }
                : undefined,
      },
    },
  );
  const pane = ogeRenderPane({
    key: 'main',
    sheet,
    axes: layout.zoomed(100),
    cells,
    rows: { first: 0, last: 8 },
    cols: { first: 0, last: 4 },
    originX: 0,
    originY: 0,
    width: 320,
    height: 180,
    showGridLines: true,
    zoom: 100,
    runFont: (cell, run) => resolver.font({ ...cell.font.source, ...run.font }),
  });
  return { workbook, sheet, resolver, layout, cells, pane };
}

const style = (workbook: OgeWorkbook, s: OgeCellStyle) =>
  workbook.styles.intern(s);
const text = (texts: readonly OgeRenderText[], row: number, col: number) =>
  texts.find((t) => t.row === row && t.col === col) as OgeRenderText;

describe('render model — the rarer text', () => {
  it('rotates, stacks, shrinks and italicises', () => {
    const { pane } = setup((workbook) => {
      const sheet = workbook.sheets[0];
      sheet.setCell(0, 0, {
        value: 'up',
        style: style(workbook, { alignment: { textRotation: 45 } }),
      });
      sheet.setCell(0, 1, {
        value: 'down',
        style: style(workbook, { alignment: { textRotation: 135 } }),
      });
      sheet.setCell(0, 2, {
        value: 'tall',
        style: style(workbook, { alignment: { textRotation: 255 } }),
      });
      sheet.setCell(1, 0, {
        value: 'a much longer text',
        style: style(workbook, {
          alignment: { shrinkToFit: true },
          font: { italic: true },
        }),
      });
      sheet.setCell(2, 0, { value: '' });
    });
    expect(text(pane.texts, 0, 0).style['transform']).toBe('rotate(-45deg)');
    expect(text(pane.texts, 0, 1).style['transform']).toBe('rotate(45deg)');
    expect(text(pane.texts, 0, 2).style).toMatchObject({
      writingMode: 'vertical-rl',
      textOrientation: 'upright',
    });
    const shrunk = text(pane.texts, 1, 0);
    expect(parseFloat(shrunk.style['fontSize'])).toBeLessThan(15);
    expect(shrunk.style['fontStyle']).toBe('italic');
    expect(text(pane.texts, 2, 0)).toBeUndefined();
  });

  it('aligns wrapped lines right or centred, centres across a run, fills', () => {
    const { pane } = setup((workbook) => {
      const sheet = workbook.sheets[0];
      sheet.setRow(0, { height: 45 });
      sheet.setCell(0, 0, {
        value: 'aaa bbb ccc',
        style: style(workbook, {
          alignment: { wrapText: true, horizontal: 'right' },
        }),
      });
      sheet.setCell(0, 1, {
        value: 'aaa bbb ccc',
        style: style(workbook, {
          alignment: { wrapText: true, horizontal: 'center' },
        }),
      });
      sheet.setCell(1, 0, {
        value: 'Title',
        style: style(workbook, {
          alignment: { horizontal: 'centerContinuous' },
        }),
      });
      sheet.setCell(1, 1, {
        style: style(workbook, {
          alignment: { horizontal: 'centerContinuous' },
        }),
      });
      sheet.setCell(2, 0, {
        value: 'ab',
        style: style(workbook, { alignment: { horizontal: 'fill' } }),
      });
    });
    expect(text(pane.texts, 0, 0).lines?.[0].style['textAlign']).toBe('right');
    expect(text(pane.texts, 0, 1).lines?.[0].style['textAlign']).toBe('center');
    // the clip covers both centre-continuous cells; the text centres in it
    expect(text(pane.texts, 1, 0).clip['width']).toBe('128px');
    expect(text(pane.texts, 1, 0).style).toMatchObject({ textAlign: 'center' });
    expect(text(pane.texts, 2, 0).style).toMatchObject({ overflow: 'hidden' });
  });

  it('hides values under value-less bars and icons, draws reversed bars and icons by alignment', () => {
    const { pane } = setup((workbook) => {
      const sheet = workbook.sheets[0];
      sheet.setRow(7, { height: 45 });
      for (const col of [0, 1, 2])
        sheet.setCell(7, col, {
          value: 5,
          style: style(workbook, {
            alignment: { vertical: col === 2 ? 'center' : 'top' },
          }),
        });
    });
    expect(text(pane.texts, 7, 0)).toBeUndefined();
    expect(text(pane.texts, 7, 1)).toBeUndefined();
    expect(text(pane.texts, 7, 2)).toBeDefined();
    const bar = pane.marks.find((m) => m.kind === 'dataBar');
    expect(bar?.style['background']).toContain(
      'linear-gradient(90deg, #638EC6, #ffffff)',
    );
    const icons = pane.marks.filter((m) => m.kind === 'icon');
    expect(icons.map((m) => m.style['top'])).toEqual(['140px', '161px']);
  });

  it('draws accounting underlines in the format colour, raised runs in rich text, pattern tiles without an anchor', () => {
    const { pane } = setup((workbook) => {
      const sheet = workbook.sheets[0];
      sheet.setCell(0, 0, {
        value: 5,
        style: style(workbook, {
          numberFormat: '[Red]0',
          font: { underline: 'singleAccounting' },
        }),
      });
      sheet.setCell(1, 0, {
        value: ogeRichText([
          { text: 'x' },
          { text: '2', font: { vertAlign: 'superscript' } },
        ]),
      });
      sheet.setCell(2, 0, {
        style: style(workbook, {
          fill: {
            type: 'pattern',
            pattern: 'lightGrid',
            fgColor: { rgb: 'FF000000' },
            bgColor: { rgb: 'FFFFFFFF' },
          },
        }),
      });
    });
    expect(
      pane.marks.find((m) => m.kind === 'underline')?.style['background'],
    ).toBe('#FF0000');
    const rich = text(pane.texts, 1, 0);
    expect(rich.runs?.[1].style).toMatchObject({
      verticalAlign: 'super',
      lineHeight: '0',
    });
    expect(rich.runs?.[0].style['lineHeight']).toBe('20px');
    expect(pane.fills[0].style['background']).toMatch(
      /^url\("data:image\/svg\+xml,.*"\) -7px -7px \/ 8px 8px repeat, #/,
    );
  });

  it('skips AutoFilter buttons of hidden columns', () => {
    const { pane } = setup((workbook) => {
      const sheet = workbook.sheets[0];
      sheet.setColumns(1, 1, { hidden: true });
      sheet.autoFilter = {
        range: { top: 0, left: 0, bottom: 3, right: 2 },
        columns: [],
      };
    });
    expect(
      pane.marks.filter((m) => m.kind === 'filter').map((m) => m.col),
    ).toEqual([0, 2]);
  });

  it('leaves out an empty overlay rectangle', () => {
    const { sheet, layout } = setup(() => undefined);
    // a range clamped to nothing past the pane's start
    const shapes = ogeSelectionShapes(
      sheet,
      layout.zoomed(100),
      {
        ranges: [{ top: 0, left: 0, bottom: 0, right: 1 }],
        active: { row: 0, col: 1 },
        anchor: { row: 0, col: 1 },
      },
      { originX: 500, originY: 0, width: 10, height: 10 },
    );
    expect(shapes.overlay).toBe('');
  });
});

describe('zoom — the rarer cells', () => {
  it('scales a rich line box, a hidden column offset, and cells without a measured text width', () => {
    const { layout, cells } = setup((workbook) => {
      const sheet = workbook.sheets[0];
      sheet.setCell(0, 0, {
        value: ogeRichText([{ text: 'big', font: { size: 22 } }]),
      });
      sheet.setCell(1, 0, {
        value: 'wrap me please',
        style: style(workbook, { alignment: { wrapText: true } }),
      });
      sheet.setColumns(2, 2, { hidden: true });
    });
    const zoomed = ogeZoomPaint(cells, layout, 200);
    const rich = zoomed.find((c) => c.row === 0 && c.col === 0) as OgePaintCell;
    expect(rich.lineHeight).toBeGreaterThan(2 * 20);
    expect(zoomed.find((c) => c.row === 1)?.textWidth).toBeUndefined();
    // an offset inside a hidden column lands on its (zero-width) start
    expect(ogeZoomOffset(layout.cols, layout.zoomed(200).cols, 128)).toBe(256);
  });
});

describe('print table — styles', () => {
  it('prints fonts, colours, alignment, wrapping and every border kind', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    sheet.setCell(0, 0, {
      value: 'x',
      style: style(workbook, {
        font: {
          italic: true,
          color: { rgb: 'FF336699' },
          underline: 'single',
          strike: true,
        },
        alignment: {
          vertical: 'center',
          wrapText: true,
          horizontal: 'distributed',
        },
        border: {
          top: { style: 'double' },
          bottom: { style: 'dashed' },
          left: { style: 'thick', color: { rgb: 'FFFF0000' } },
        },
      }),
    });
    sheet.setCell(0, 2, {
      value: 'y',
      style: style(workbook, { alignment: { vertical: 'top' } }),
    });
    sheet.setColumns(1, 1, { hidden: true });
    const resolver = new OgeStyleResolver(workbook);
    const layout = new OgeSheetLayout(sheet, resolver);
    const table = ogePrintTable(
      workbook,
      sheet,
      layout,
      resolver,
      { top: 0, left: 0, bottom: 0, right: 2 },
      OGE_EN_US_FORMAT_LOCALE,
    );
    expect(table.columns).toEqual([64, 64]);
    const [first, second] = table.rows[0].cells;
    expect(first.style).toMatchObject({
      fontStyle: 'italic',
      color: '#336699',
      verticalAlign: 'middle',
      whiteSpace: 'pre-wrap',
      textDecorationLine: 'underline line-through',
      borderTop: '3px double #000000',
      borderBottom: '1px dashed #000000',
      borderLeft: '3px solid #FF0000',
      textAlign: 'justify',
    });
    expect(second.style['verticalAlign']).toBe('top');
  });
});
