import { OGE_EN_US_FORMAT_LOCALE } from '../format/format-locale';
import { createOgeWorkbook, type OgeWorkbook } from '../model/workbook';
import type { OgeTextMeasurer } from './cell-text';
import { ogePaintWindow, type OgePaintCell } from './paint-window';
import { ogePlacePictures } from './pictures';
import { OgeStyleResolver } from './resolve-style';
import { OgeSheetLayout } from './sheet-layout';
import {
  ogeZoomFont,
  ogeZoomOffset,
  ogeZoomPaint,
  ogeZoomPictures,
} from './zoom';

const fixed: OgeTextMeasurer = { measure: (text) => text.length * 7 };

function setup(build: (workbook: OgeWorkbook) => void = () => undefined) {
  const workbook = createOgeWorkbook();
  build(workbook);
  const sheet = workbook.sheets[0];
  const resolver = new OgeStyleResolver(workbook);
  const layout = new OgeSheetLayout(sheet, resolver, { measurer: fixed });
  const cells = ogePaintWindow(
    sheet,
    layout,
    resolver,
    { top: 0, left: 0, bottom: 10, right: 6 },
    {
      measurer: fixed,
      locale: OGE_EN_US_FORMAT_LOCALE,
      dateSystem: '1900',
    },
  );
  return { workbook, sheet, resolver, layout, cells };
}

const find = (cells: readonly OgePaintCell[], row: number, col: number) =>
  cells.find((c) => c.row === row && c.col === col) as OgePaintCell;

describe('ogeZoomFont', () => {
  it('draws at the zoomed whole-pixel size with that size’s metrics', () => {
    const { resolver } = setup();
    const normal = resolver.normalFont;
    expect(ogeZoomFont(normal, 100)).toBe(normal);
    const doubled = ogeZoomFont(normal, 200);
    expect(doubled).toMatchObject({
      sizePt: 11,
      sizePx: 29,
      maxDigitWidth: 15,
      lineHeight: 38,
    });
    expect(doubled.css).toBe('29px "Calibri", Carlito, sans-serif');
    expect(ogeZoomFont(normal, 200)).toBe(doubled);
    const styled = resolver.font({
      bold: true,
      italic: true,
      vertAlign: 'subscript',
    });
    expect(ogeZoomFont(styled, 50).css).toBe(
      'italic bold 4.62px "Calibri", Carlito, sans-serif',
    );
  });
});

describe('ogeZoomOffset', () => {
  it('is exact on boundaries and proportional inside a column', () => {
    const { layout } = setup((workbook) =>
      workbook.sheets[0].setColumns(1, 1, { hidden: true }),
    );
    const zoomed = layout.zoomed(150).cols;
    expect(ogeZoomOffset(layout.cols, zoomed, 0)).toBe(0);
    expect(ogeZoomOffset(layout.cols, zoomed, 64)).toBe(96);
    // column B is hidden: C starts where B did
    expect(ogeZoomOffset(layout.cols, zoomed, 128)).toBe(96 + 96);
    expect(ogeZoomOffset(layout.cols, zoomed, 32)).toBe(48);
  });
});

describe('ogeZoomPaint', () => {
  it('returns the cells untouched at 100%', () => {
    const { layout, cells } = setup((workbook) =>
      workbook.sheets[0].setCell(0, 0, { value: 1 }),
    );
    expect(ogeZoomPaint(cells, layout, 100)).toBe(cells);
  });

  it('moves boxes, clips, margins and line boxes to the zoom', () => {
    const { layout, cells } = setup((workbook) => {
      const sheet = workbook.sheets[0];
      sheet.setCell(0, 0, { value: 'x'.repeat(12) });
      sheet.setCell(2, 1, {
        value: 'merged',
        style: workbook.styles.intern({
          alignment: { vertical: 'center', indent: 1 },
        }),
      });
      sheet.addMerge({ top: 2, left: 1, bottom: 3, right: 2 });
    });
    const zoomed = ogeZoomPaint(cells, layout, 200);
    const spill = find(zoomed, 0, 0);
    expect({ x: spill.x, width: spill.width, height: spill.height }).toEqual({
      x: 0,
      width: 128,
      height: 40,
    });
    // 84 px of text spilled 27 px into B at 100%: 54 px at 200%
    expect(find(cells, 0, 0).clipRight).toBe(64 + 27);
    expect(spill.clipRight).toBe(128 + 54);
    expect(spill.textWidth).toBe(168);
    expect(spill.font.sizePx).toBe(29);
    // margin ceil(15 / 4) and indent round(9 × 15 / 7) at 200%
    const merged = find(zoomed, 2, 1);
    expect(merged).toMatchObject({
      x: 128,
      y: 80,
      width: 256,
      height: 80,
      inset: 4 + 19,
    });
    expect(merged.lineTop).toBe(Math.floor((80 - 38) / 2));
  });

  it('places pictures on the zoomed cells', () => {
    const { sheet, layout } = setup((workbook) => {
      workbook.sheets[0].pictures.push({
        image: 'xl/media/image1.png',
        anchor: {
          kind: 'twoCell',
          from: { row: 1, col: 1, rowOffset: 10, colOffset: 32 },
          to: { row: 3, col: 2, rowOffset: 0, colOffset: 0 },
        },
      });
    });
    const placed = ogePlacePictures(sheet, layout);
    expect(ogeZoomPictures(placed, layout, 100)).toBe(placed);
    expect(ogeZoomPictures(placed, layout, 200)[0]).toMatchObject({
      x: 128 + 64,
      y: 40 + 20,
      width: 64,
      height: 120 - 60,
    });
  });
});
