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
import { OgeSheetLayout } from './sheet-layout';
import { OGE_ESTIMATING_MEASURER, ogeWrapText } from './cell-text';

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

  it('fits the rows a sheet lists and gives the others its default, as Excel shows them on open', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    const big = workbook.styles.intern({ font: { size: 20 } });
    const small = workbook.styles.intern({ font: { size: 9 } });
    const sizes = (...rows: number[]) => {
      const layout = new OgeSheetLayout(sheet, new OgeStyleResolver(workbook));
      return rows.map((row) => layout.rows.size(row));
    };
    // a height without customHeight is a fit Excel makes again
    sheet.setRow(0, { height: 30 });
    sheet.setValue(0, 0, 1);
    sheet.setRow(1, { height: 10 });
    sheet.setCell(1, 0, { value: 1, style: big });
    // a custom height holds; without one, the sheet's defaultRowHeight
    sheet.setRow(2, { height: 30, customHeight: true });
    sheet.setRow(3, { customHeight: true });
    // a row style is its empty cells' — below Normal too
    sheet.setRow(4, { style: small });
    sheet.setCell(4, 0, { value: 1, style: small });
    sheet.setRow(5, { style: big });
    expect(sizes(0, 1, 2, 3, 4, 5, 6)).toEqual([20, 35, 40, 20, 16, 35, 20]);
    // a custom default holds for the rows the sheet does not list only
    sheet.format = {
      ...sheet.format,
      defaultRowHeight: 30,
      customHeight: true,
    };
    expect(sizes(0, 3, 6)).toEqual([20, 40, 40]);
    // a zero-height sheet hides the rows it does not list, and no others
    sheet.format = {
      ...sheet.format,
      defaultRowHeight: 15,
      customHeight: false,
      zeroHeight: true,
    };
    sheet.setRow(7, { customHeight: false });
    expect(sizes(0, 3, 6, 7, 8)).toEqual([20, 20, 0, 20, 0]);
  });

  it('counts column styles for the cells a row leaves empty', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    const big = workbook.styles.intern({ font: { size: 20 } });
    const small = workbook.styles.intern({ font: { size: 9 } });
    sheet.setColumns(1, 1, { style: big });
    // A1 alone: B1 is an empty 20 pt cell; A2 and B2 are Normal cells
    sheet.setValue(0, 0, 1);
    sheet.setValue(1, 0, 1);
    sheet.setValue(1, 1, 1);
    // a Normal row style wins over the column's
    sheet.setRow(2, { style: 0 });
    sheet.setValue(2, 0, 1);
    let layout = new OgeSheetLayout(sheet, new OgeStyleResolver(workbook));
    expect([0, 1, 2, 3].map((row) => layout.rows.size(row))).toEqual([
      35, 20, 20, 35,
    ]);
    // every column 9 pt: an empty row is 12 pt
    sheet.setColumns(0, 16383, { style: small });
    layout = new OgeSheetLayout(sheet, new OgeStyleResolver(workbook));
    expect(layout.defaultRowHeight).toBe(16);
    expect(layout.rows.size(0)).toBe(20);
  });

  it('keeps the height a file stores where the fit hangs on measuring text', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    const wrap = workbook.styles.intern({ alignment: { wrapText: true } });
    const unknown = workbook.styles.intern({ font: { name: 'Nonesuch' } });
    const text = 'one two three four five six seven eight';
    sheet.setCell(0, 0, { value: text, style: wrap });
    sheet.setCell(1, 0, { value: text, style: wrap });
    sheet.setRow(1, { height: 45 });
    sheet.setCell(2, 0, { value: 'x', style: unknown });
    sheet.setRow(2, { height: 30 });
    const resolver = new OgeStyleResolver(workbook);
    const layout = new OgeSheetLayout(sheet, resolver);
    const lines = ogeWrapText(
      text,
      64 - 5,
      resolver.get(wrap).font,
      OGE_ESTIMATING_MEASURER,
    ).length;
    expect(lines).toBeGreaterThan(1);
    expect(layout.rows.size(0)).toBe(lines * 20);
    expect(layout.rows.size(1)).toBe(60);
    expect(layout.rows.size(2)).toBe(40);
  });

  it('snaps row heights down to whole pixels, as Excel shows them', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    // heights other tools save off the pixel grid, and the px Excel 2024 shows
    const measured: [number, number][] = [
      [0.6, 0],
      [1.2, 1],
      [12.6, 16],
      [13.8, 18],
      [15.6, 20],
      [18.6, 24],
      [33.6, 44],
      [408.95, 545],
    ];
    measured.forEach(([height], row) =>
      sheet.setRow(row, { height, customHeight: true }),
    );
    sheet.format = {
      ...sheet.format,
      defaultRowHeight: 12.6,
      customHeight: true,
    };
    const layout = new OgeSheetLayout(sheet, new OgeStyleResolver(workbook));
    expect(measured.map((_, row) => layout.rows.size(row))).toEqual(
      measured.map(([, px]) => px),
    );
    expect(layout.defaultRowHeight).toBe(16);
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
