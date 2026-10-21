import { OGE_EN_US_FORMAT_LOCALE } from '../format/format-locale';
import type { OgeBorderStyle, OgeCellStyle } from '../model/style';
import { createOgeWorkbook, type OgeWorkbook } from '../model/workbook';
import type { OgeTextMeasurer } from './cell-text';
import { ogeBorderStrokes, ogeGridlinePath, type OgeDrawPane } from './draw';
import { ogePaintWindow } from './paint-window';
import { OgeStyleResolver } from './resolve-style';
import { OgeSheetLayout } from './sheet-layout';

const fixed: OgeTextMeasurer = { measure: (text) => text.length * 7 };
const pane: OgeDrawPane = {
  top: 0,
  left: 0,
  bottom: 1,
  right: 1,
  originX: 0,
  originY: 0,
};

function draw(
  build: (workbook: OgeWorkbook) => void,
  window: OgeDrawPane = pane,
) {
  const workbook = createOgeWorkbook();
  build(workbook);
  const sheet = workbook.sheets[0];
  const resolver = new OgeStyleResolver(workbook);
  const layout = new OgeSheetLayout(sheet, resolver, { measurer: fixed });
  const cells = ogePaintWindow(
    sheet,
    layout,
    resolver,
    {
      top: window.top,
      left: window.left,
      bottom: window.bottom,
      right: window.right,
    },
    {
      measurer: fixed,
      locale: OGE_EN_US_FORMAT_LOCALE,
      dateSystem: '1900',
    },
  );
  return {
    grid: ogeGridlinePath(sheet, layout.zoomed(100), window, cells),
    strokes: ogeBorderStrokes(cells, window),
  };
}

const style = (workbook: OgeWorkbook, s: OgeCellStyle) =>
  workbook.styles.intern(s);
const box = (s: OgeBorderStyle) => ({
  border: {
    top: { style: s },
    right: { style: s },
    bottom: { style: s },
    left: { style: s },
  },
});

describe('ogeGridlinePath', () => {
  it('draws each row’s and column’s last pixel', () => {
    const { grid } = draw(() => undefined);
    // two columns of 64 px, two rows of 20 px
    expect(grid).toBe('M63.5 0V40M127.5 0V40M0 19.5H128M0 39.5H128');
  });

  it('lets a fill hide the four gridlines around its cell', () => {
    const { grid } = draw((workbook) => {
      workbook.sheets[0].setCell(1, 1, {
        style: style(workbook, {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { rgb: 'FFFFFF00' },
          },
        }),
      });
    });
    // column A's line stops above B2, column B's too; row 1's line stops at B, row 2's line too
    expect(grid).toBe('M63.5 0V20M127.5 0V20M0 19.5H64M0 39.5H64');
  });

  it('hides the gridlines inside a merge and those a spilling text crosses', () => {
    const merged = draw((workbook) =>
      workbook.sheets[0].addMerge({ top: 0, left: 0, bottom: 1, right: 0 }),
    );
    expect(merged.grid).toBe('M63.5 0V40M127.5 0V40M64 19.5H128M0 39.5H128');
    const spill = draw((workbook) =>
      workbook.sheets[0].setCell(0, 0, { value: 'x'.repeat(12) }),
    );
    expect(spill.grid).toBe('M63.5 20V40M127.5 0V40M0 19.5H128M0 39.5H128');
  });

  it('skips hidden rows and columns and works in pane pixels', () => {
    const { grid } = draw(
      (workbook) => workbook.sheets[0].setColumns(1, 1, { hidden: true }),
      { top: 0, left: 0, bottom: 0, right: 2, originX: 10, originY: 5 },
    );
    expect(grid).toBe('M53.5 -5V15M117.5 -5V15M-10 14.5H118');
    expect(draw(() => undefined, { ...pane, bottom: -1 }).grid).toBe('');
  });
});

describe('ogeBorderStrokes', () => {
  const only = (s: OgeBorderStyle) =>
    draw(
      (workbook) =>
        workbook.sheets[0].setCell(1, 1, {
          value: 1,
          style: style(workbook, box(s)),
        }),
      { ...pane, bottom: 2, right: 2 },
    ).strokes;

  it('lays a thin border on the gridline, from the gridline before the cell', () => {
    // B2 spans x 64..127, y 20..39
    expect(only('thin')).toEqual([
      {
        color: null,
        width: 1,
        dash: null,
        dashOffset: 0,
        crisp: true,
        d: 'M63 19.5H128M63 39.5H128M63.5 19V40M127.5 19V40',
      },
    ]);
  });

  it('puts medium on the gridline and the pixel before it, thick and double around it', () => {
    expect(only('medium')[0].d).toBe('M62 19H128M62 39H128M63 18V40M127 18V40');
    expect(only('thick')[0].d).toBe(
      'M62 19.5H129M62 39.5H129M63.5 18V41M127.5 18V41',
    );
    const [double] = only('double');
    expect(double.width).toBe(1);
    // outer lines take the thick extent, inner ones stop a pixel short
    expect(double.d).toContain('M62 18.5H129'); // top, outer (above)
    expect(double.d).toContain('M64 20.5H127'); // top, inner (below)
    expect(double.d).toContain('M62 40.5H129'); // bottom, outer (below)
  });

  it('anchors dash patterns to the grid window, in Excel’s measured phases', () => {
    const dashed = only('dashed')[0];
    expect(dashed).toMatchObject({ dash: '3 1', dashOffset: 2 });
    expect(only('dotted')[0]).toMatchObject({ dash: '2 2', dashOffset: 0 });
    expect(only('dashDot')[0]).toMatchObject({
      dash: '9 3 3 3',
      dashOffset: 63 % 18,
    });
    expect(only('dashDotDot')[0]).toMatchObject({
      dash: '9 3 3 3 3 3',
      dashOffset: 63 % 24,
    });
    expect(only('mediumDashed')[0]).toMatchObject({
      dash: '9 3',
      width: 2,
      dashOffset: 62 % 12,
    });
    const slant = only('slantDashDot');
    expect(new Set(slant.map((s) => s.dash))).toEqual(
      new Set(['11 1 5 1', '10 2 4 2']),
    );
    expect(slant.every((s) => s.width === 1)).toBe(true);
  });

  it('draws diagonals corner to corner and keeps colours apart', () => {
    const strokes = draw((workbook) =>
      workbook.sheets[0].setCell(0, 0, {
        value: 1,
        style: style(workbook, {
          border: {
            diagonal: { style: 'thin', color: { rgb: 'FFFF0000' } },
            diagonalUp: true,
            diagonalDown: true,
            top: { style: 'thin' },
          },
        }),
      }),
    ).strokes;
    // gridline corner to gridline corner, aliased as Excel draws them
    const diagonal = strokes.find((s) => s.color === '#FF0000');
    expect(diagonal).toMatchObject({
      crisp: true,
      d: 'M-0.5 19.5L63.5 -0.5M-0.5 -0.5L63.5 19.5',
    });
    expect(strokes.find((s) => s.color === null)?.d).toBe('M-1 -0.5H64');
  });
});

describe('borders and gridlines together', () => {
  it('hides the gridline a border lies on, so dash gaps show white', () => {
    const { grid } = draw((workbook) => {
      workbook.sheets[0].setCell(0, 0, {
        value: 1,
        style: workbook.styles.intern({
          border: { bottom: { style: 'dashed' }, right: { style: 'dotted' } },
        }),
      });
    });
    // column A's line starts below A1, row 1's line starts after A1
    expect(grid).toBe('M63.5 20V40M127.5 0V40M64 19.5H128M0 39.5H128');
  });

  it('measures the dash phase from the grid window corner (the headers included)', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    // B10 of a Calibri 11 sheet, as on Excel's Borders capture: 26 px of row header, 20 px of letters
    // a stored width of 22 is 154 px for Calibri 11, as column A of that sheet
    sheet.setColumns(0, 0, { width: 22 });
    sheet.setCell(9, 1, {
      value: 1,
      style: workbook.styles.intern({
        border: {
          top: { style: 'dashDot' },
          left: { style: 'dashDot' },
          right: { style: 'dashDot' },
        },
      }),
    });
    const resolver = new OgeStyleResolver(workbook);
    const layout = new OgeSheetLayout(sheet, resolver, { measurer: fixed });
    const cells = ogePaintWindow(
      sheet,
      layout,
      resolver,
      { top: 0, left: 0, bottom: 12, right: 2 },
      { measurer: fixed, locale: OGE_EN_US_FORMAT_LOCALE, dateSystem: '1900' },
    );
    expect(layout.cols.size(0)).toBe(154);
    const strokes = ogeBorderStrokes(cells, {
      top: 0,
      left: 0,
      bottom: 12,
      right: 2,
      originX: 0,
      originY: 0,
      dashOriginX: 26,
      dashOriginY: 20,
    });
    // the top line starts at window x 187 − 8 = 179 (pattern position 17), the left one at window y 199 (1),
    // the right one at the cell's first row, window y 200 (2) — Excel's pixels
    expect(strokes.map((s) => s.dashOffset).sort((a, b) => a - b)).toEqual([
      1, 2, 17,
    ]);
  });
});
