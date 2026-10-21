import { OgeAxis } from './axis';
import {
  ogeColumnPadding,
  ogeFontMetrics,
  ogeFontPixelSize,
  ogeHasFontMetrics,
} from '../metrics/font-metrics';
import { ogePlacePictures } from './pictures';
import { createOgeWorkbook } from '../model/workbook';
import { OgeStyleResolver } from './resolve-style';
import { OgeSheetLayout, ogeWrapText } from './sheet-layout';
import { OGE_ESTIMATING_MEASURER } from './cell-text';

describe('OgeAxis', () => {
  it('sums sparse overrides over a default size', () => {
    const axis = new OgeAxis(1_048_576, 20);
    expect(axis.offset(10)).toBe(200);
    axis.set(3, 40);
    axis.set(5, 0);
    expect(axis.size(3)).toBe(40);
    expect(axis.hasOverride(3)).toBe(true);
    expect(axis.offset(4)).toBe(100);
    expect(axis.offset(6)).toBe(120);
    expect(axis.total()).toBe(1_048_576 * 20 + 20 - 20);
    axis.set(3, undefined);
    expect(axis.offset(4)).toBe(80);
    axis.set(-1, 5);
    axis.set(2_000_000, 5);
    expect(axis.offset(2_000_000)).toBe(axis.total());
  });

  it('finds the index at a position, past hidden runs', () => {
    const axis = new OgeAxis(100, 10);
    axis.set(2, 0);
    axis.set(3, 0);
    expect(axis.indexAt(0)).toBe(0);
    expect(axis.indexAt(-5)).toBe(0);
    expect(axis.indexAt(19)).toBe(1);
    // rows 2 and 3 are hidden: position 20 is row 4
    expect(axis.indexAt(20)).toBe(4);
    expect(axis.indexAt(5000)).toBe(99);
    expect(axis.nextVisible(1, 1)).toBe(4);
    expect(axis.nextVisible(4, -1)).toBe(1);
    expect(axis.nextVisible(99, 1)).toBe(-1);
    axis.set(0, 0);
    expect(axis.firstVisibleFrom(0)).toBe(1);
    axis.clear();
    axis.setDefault(0);
    expect(axis.firstVisibleFrom(0)).toBe(99);
    expect(axis.defaultLength).toBe(0);
  });
});

describe('font metrics', () => {
  it('reads the measured table, falls back to Calibri, scales past it', () => {
    expect(ogeFontPixelSize(11)).toBe(15);
    expect(ogeFontMetrics('Calibri', 11)).toEqual({
      maxDigitWidth: 7,
      lineHeight: 20,
      measured: true,
    });
    expect(ogeFontMetrics('arial', 10)).toEqual({
      maxDigitWidth: 7,
      lineHeight: 17,
      measured: true,
    });
    expect(ogeFontMetrics('No Such Font', 11)).toEqual({
      maxDigitWidth: 7,
      lineHeight: 20,
      measured: false,
    });
    expect(ogeFontMetrics(undefined, 11).measured).toBe(false);
    const huge = ogeFontMetrics('Calibri', 144);
    expect(huge.measured).toBe(false);
    expect(huge.maxDigitWidth).toBeGreaterThan(
      ogeFontMetrics('Calibri', 72).maxDigitWidth,
    );
    expect(ogeHasFontMetrics('Segoe UI')).toBe(true);
    expect(ogeHasFontMetrics('Comic Sans MS')).toBe(false);
    expect([4, 7, 9, 14, 21].map(ogeColumnPadding)).toEqual([3, 5, 7, 9, 13]);
  });
});

describe('OgeSheetLayout', () => {
  it('sizes columns from widths, the default width and hidden flags', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    sheet.setColumns(0, 0, { width: 20 });
    sheet.setColumns(1, 1, { hidden: true });
    sheet.setColumns(2, 4, { style: 1 });
    sheet.format = { ...sheet.format, defaultColumnWidth: 12 };
    const layout = new OgeSheetLayout(sheet, new OgeStyleResolver(workbook));
    expect(layout.cols.size(0)).toBe(140);
    expect(layout.cols.size(1)).toBe(0);
    expect(layout.cols.size(2)).toBe(layout.cols.size(9));
    expect(layout.cols.size(9)).toBe(84);
    expect(layout.padding).toBe(5);
    expect(layout.defaultRowHeight).toBe(20);
  });

  it('hides rows of a zero-height sheet but keeps formatted ones, and honours customHeight', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    sheet.format = { ...sheet.format, zeroHeight: true };
    sheet.setRow(2, { style: 1 });
    sheet.setRow(3, { height: 30 });
    const tall = workbook.styles.intern({ font: { size: 24 } });
    sheet.setCell(5, 0, { value: 'big', style: tall });
    let layout = new OgeSheetLayout(sheet, new OgeStyleResolver(workbook));
    expect(layout.rows.size(0)).toBe(0);
    expect(layout.rows.size(2)).toBe(20);
    expect(layout.rows.size(3)).toBe(40);
    expect(layout.rows.size(5)).toBe(42);
    sheet.format = { ...sheet.format, customHeight: true, zeroHeight: false };
    layout = new OgeSheetLayout(sheet, new OgeStyleResolver(workbook));
    expect(layout.rows.size(5)).toBe(20);
  });

  it('wraps by words, breaks long words, keeps line breaks', () => {
    const font = new OgeStyleResolver(createOgeWorkbook()).normalFont;
    const measure = { measure: (text: string) => text.length * 7 };
    expect(ogeWrapText('one two three', 70, font, measure)).toEqual([
      'one two',
      'three',
    ]);
    expect(ogeWrapText('abcdefghijklmnop', 35, font, measure)).toEqual([
      'abcde',
      'fghij',
      'klmno',
      'p',
    ]);
    expect(ogeWrapText('a\n\nb', 70, font, measure)).toEqual(['a', '', 'b']);
    expect(ogeWrapText('x', 0, font, OGE_ESTIMATING_MEASURER)).toEqual(['x']);
  });
});

describe('ogePlacePictures', () => {
  it('places one-cell and absolute pictures and skips hidden or empty ones', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    sheet.setColumns(1, 1, { hidden: true });
    sheet.pictures = [
      {
        image: 'a.png',
        anchor: {
          kind: 'oneCell',
          from: { row: 1, col: 2, rowOffset: 5, colOffset: 500 },
          width: 30,
          height: 20,
        },
      },
      {
        image: 'b.png',
        anchor: { kind: 'absolute', x: 7, y: 9, width: 3, height: 4 },
      },
      {
        image: 'c.png',
        anchor: {
          kind: 'twoCell',
          from: { row: 0, col: 1, rowOffset: 0, colOffset: 10 },
          to: { row: 0, col: 1, rowOffset: 0, colOffset: 10 },
        },
      },
      {
        image: 'd.png',
        hidden: true,
        anchor: { kind: 'absolute', x: 0, y: 0, width: 1, height: 1 },
      },
    ];
    const placed = ogePlacePictures(
      sheet,
      new OgeSheetLayout(sheet, new OgeStyleResolver(workbook)),
    );
    // an offset never leaves its cell: 500 px into a 64 px column stops at its edge
    expect(
      placed.map(({ x, y, width, height }) => ({ x, y, width, height })),
    ).toEqual([
      { x: 128, y: 25, width: 30, height: 20 },
      { x: 7, y: 9, width: 3, height: 4 },
    ]);
  });
});
