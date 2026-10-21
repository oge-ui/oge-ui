import { createOgeWorkbook, type OgeWorkbook } from '../model/workbook';
import type { OgeCellStyle } from '../model/style';
import { OGE_EN_US_FORMAT_LOCALE } from '../format/format-locale';
import { ogeCellError, ogeRichText } from '../model/cell';
import type { OgeTextMeasurer } from './cell-text';
import {
  ogeIndentPixels,
  ogeLineTop,
  ogePaintWindow,
  ogeTextMargin,
  type OgePaintCell,
} from './paint-window';
import { OgeStyleResolver } from './resolve-style';
import { OgeSheetLayout } from './sheet-layout';

/** Every character 7 px wide — widths are easy to reason about. */
const fixed: OgeTextMeasurer = { measure: (text) => text.length * 7 };

function paint(
  workbook: OgeWorkbook,
  range = { top: 0, left: 0, bottom: 20, right: 10 },
) {
  const sheet = workbook.sheets[0];
  const resolver = new OgeStyleResolver(workbook);
  const layout = new OgeSheetLayout(sheet, resolver, { measurer: fixed });
  return ogePaintWindow(sheet, layout, resolver, range, {
    measurer: fixed,
    locale: OGE_EN_US_FORMAT_LOCALE,
    dateSystem: '1900',
  });
}

const find = (cells: OgePaintCell[], row: number, col: number) =>
  cells.find((c) => c.row === row && c.col === col);

function book(cells: [number, number, unknown, OgeCellStyle?][]): OgeWorkbook {
  const workbook = createOgeWorkbook();
  const sheet = workbook.sheets[0];
  for (const [row, col, value, style] of cells) {
    sheet.setCell(row, col, {
      value: value as never,
      ...(style ? { style: workbook.styles.intern(style) } : {}),
    });
  }
  return workbook;
}

describe('ogePaintWindow — text spill', () => {
  it('spills left-aligned text right over empty cells, up to a value', () => {
    // 20 characters = 140 px in a 64 px column (59 px of room)
    const cells = paint(
      book([
        [0, 0, 'x'.repeat(20)],
        [0, 2, 'stop'],
      ]),
    );
    const a = find(cells, 0, 0) as OgePaintCell;
    expect(a.x).toBe(0);
    expect(a.clipLeft).toBe(0);
    // B is empty, C holds a value: the text may paint up to C's left edge
    expect(a.clipRight).toBe(128);
    expect(a.textWidth).toBe(140);
  });

  it('spills right-aligned text left, centred text both ways', () => {
    const right = paint(
      book([[0, 3, 'y'.repeat(20), { alignment: { horizontal: 'right' } }]]),
    );
    const r = find(right, 0, 3) as OgePaintCell;
    expect(r.clipRight).toBe(256);
    expect(r.clipLeft).toBeLessThan(192);
    const centred = paint(
      book([[0, 3, 'z'.repeat(20), { alignment: { horizontal: 'center' } }]]),
    );
    const c = find(centred, 0, 3) as OgePaintCell;
    expect(c.clipLeft).toBeLessThan(192);
    expect(c.clipRight).toBeGreaterThan(256);
  });

  it('never spills numbers, wrapped, shrunk, rotated or merged text', () => {
    const workbook = book([
      [0, 0, 123456789012345, { numberFormat: '0' }],
      [1, 0, 'w'.repeat(20), { alignment: { wrapText: true } }],
      [2, 0, 's'.repeat(20), { alignment: { shrinkToFit: true } }],
      [3, 0, 'r'.repeat(20), { alignment: { textRotation: 45 } }],
      [4, 0, 'm'.repeat(20)],
    ]);
    workbook.sheets[0].addMerge({ top: 4, left: 0, bottom: 4, right: 1 });
    const cells = paint(workbook);
    for (const row of [0, 1, 3, 4]) {
      const cell = find(cells, row, 0) as OgePaintCell;
      expect({ row, right: cell.clipRight }).toEqual({
        row,
        right: cell.x + cell.width,
      });
    }
    expect(find(cells, 0, 0)?.display?.hashed).toBe(true);
    // shrink-to-fit scales the text into the room instead
    expect(find(cells, 2, 0)?.scale).toBeCloseTo(59 / 140);
  });

  it('paints a spilling cell left of the window when its text reaches in', () => {
    const cells = paint(book([[0, 0, 'q'.repeat(30)]]), {
      top: 0,
      left: 2,
      bottom: 3,
      right: 5,
    });
    expect(find(cells, 0, 0)?.clipRight).toBeGreaterThan(128);
    // but not one whose text stays outside
    const short = paint(book([[0, 0, 'short']]), {
      top: 0,
      left: 2,
      bottom: 3,
      right: 5,
    });
    expect(find(short, 0, 0)).toBeUndefined();
  });

  it('repeats fill-aligned text and centres across centre-continuous cells', () => {
    const fill = paint(
      book([[0, 0, 'ab', { alignment: { horizontal: 'fill' } }]]),
    );
    expect(find(fill, 0, 0)?.display?.text).toBe('abababab');
    const workbook = book([
      [0, 0, 'Title', { alignment: { horizontal: 'centerContinuous' } }],
      [0, 1, undefined, { alignment: { horizontal: 'centerContinuous' } }],
      [0, 2, undefined, { alignment: { horizontal: 'centerContinuous' } }],
    ]);
    const across = paint(workbook);
    expect(find(across, 0, 0)?.clipRight).toBe(192);
  });
});

describe('ogePaintWindow — merges, styles, borders', () => {
  it('paints a merge once, from its owner, as one box', () => {
    const workbook = book([
      [
        1,
        1,
        'merged',
        { alignment: { horizontal: 'center', vertical: 'center' } },
      ],
    ]);
    workbook.sheets[0].addMerge({ top: 1, left: 1, bottom: 2, right: 3 });
    const cells = paint(workbook);
    const owner = find(cells, 1, 1) as OgePaintCell;
    expect(owner).toMatchObject({
      x: 64,
      y: 20,
      width: 192,
      height: 40,
      merge: { top: 1, left: 1, bottom: 2, right: 3 },
    });
    expect(
      cells.filter((c) => c.row >= 1 && c.row <= 2 && c.col >= 1 && c.col <= 3),
    ).toHaveLength(1);
    expect(owner.lineTop).toBe(ogeLineTop('center', 40, 20));
    // a merge whose owner is above the window still paints
    const below = paint(workbook, { top: 2, left: 0, bottom: 5, right: 5 });
    expect(find(below, 1, 1)).toBeDefined();
  });

  it('paints empty cells formatted by their row or column', () => {
    const workbook = createOgeWorkbook();
    const sheet = workbook.sheets[0];
    const yellow = workbook.styles.intern({
      fill: { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'FFFFFF00' } },
    });
    sheet.setRow(3, { style: yellow });
    sheet.setColumns(5, 5, { style: yellow });
    sheet.setCell(3, 0, { value: 'stored' });
    const cells = paint(workbook, { top: 0, left: 0, bottom: 4, right: 6 });
    // row 4: every column of the window but the stored one comes from the row style
    expect(cells.filter((c) => c.row === 3).map((c) => c.col)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
    expect(find(cells, 3, 4)?.fill?.color).toBe('#FFFF00');
    // column F in the other rows
    expect(cells.filter((c) => c.col === 5).map((c) => c.row)).toEqual([
      0, 1, 2, 3, 4,
    ]);
    // the stored cell keeps its own (default) style
    expect(find(cells, 3, 0)?.fill).toBeNull();
  });

  it('draws each shared edge once, the heavier style winning', () => {
    const workbook = book([
      [
        0,
        0,
        1,
        { border: { right: { style: 'thin' }, bottom: { style: 'thick' } } },
      ],
      [0, 1, 2, { border: { left: { style: 'medium' } } }],
      [1, 0, 3, { border: { top: { style: 'thin' } } }],
    ]);
    const cells = paint(workbook);
    expect(find(cells, 0, 0)?.right).toBeNull();
    expect(find(cells, 0, 1)?.left?.style).toBe('medium');
    expect(find(cells, 0, 0)?.bottom?.style).toBe('thick');
    expect(find(cells, 1, 0)?.top).toBeNull();
  });

  it('carries links, notes, diagonals, indent and vertical placement', () => {
    const workbook = book([
      [0, 0, 'link'],
      [1, 0, 'noted', { alignment: { indent: 2, vertical: 'top' } }],
      [
        2,
        0,
        'x',
        {
          border: {
            diagonal: { style: 'thin' },
            diagonalUp: true,
            diagonalDown: true,
          },
        },
      ],
    ]);
    const sheet = workbook.sheets[0];
    sheet.addHyperlink({
      range: { top: 0, left: 0, bottom: 0, right: 0 },
      target: 'https://example.com',
    });
    sheet.setNote(1, 0, { text: 'hi' });
    sheet.setNote(5, 5, { text: 'note on an empty cell' });
    const cells = paint(workbook);
    expect(find(cells, 0, 0)?.link?.target).toBe('https://example.com');
    expect(find(cells, 1, 0)).toMatchObject({
      note: { text: 'hi' },
      lineTop: 0,
      inset: ogeTextMargin(7) + 2 * ogeIndentPixels(7),
    });
    expect(find(cells, 2, 0)?.diagonalUp?.style).toBe('thin');
    expect(find(cells, 2, 0)?.diagonalDown?.style).toBe('thin');
    expect(find(cells, 5, 5)?.display).toBeNull();
  });

  it('skips hidden rows and columns and shows zeros only when the view does', () => {
    const workbook = book([
      [0, 0, 0],
      [1, 1, 5],
      [2, 0, ogeCellError('#N/A')],
      [3, 0, true],
      [4, 0, ogeRichText([{ text: 'rich', font: { bold: true } }])],
    ]);
    const sheet = workbook.sheets[0];
    sheet.setRow(1, { hidden: true });
    let cells = paint(workbook);
    expect(find(cells, 1, 1)).toBeUndefined();
    expect(find(cells, 0, 0)?.display?.text).toBe('0');
    expect(find(cells, 2, 0)).toMatchObject({
      align: 'center',
      display: { kind: 'error', text: '#N/A' },
    });
    expect(find(cells, 3, 0)?.display).toMatchObject({
      kind: 'boolean',
      text: 'TRUE',
    });
    expect(find(cells, 4, 0)?.display?.rich?.runs[0].font).toEqual({
      bold: true,
    });
    sheet.view = { ...sheet.view, showZeros: false };
    cells = paint(workbook);
    expect(find(cells, 0, 0)).toBeUndefined();
  });

  it('applies a conditional painter', () => {
    const workbook = book([
      [0, 0, 5],
      [1, 0, 6],
    ]);
    const sheet = workbook.sheets[0];
    const resolver = new OgeStyleResolver(workbook);
    const layout = new OgeSheetLayout(sheet, resolver, { measurer: fixed });
    const cells = ogePaintWindow(
      sheet,
      layout,
      resolver,
      { top: 0, left: 0, bottom: 2, right: 1 },
      {
        measurer: fixed,
        locale: OGE_EN_US_FORMAT_LOCALE,
        dateSystem: '1900',
        conditional: {
          paint: (row) =>
            row === 0
              ? {
                  fill: { css: '#FF0000', color: '#FF0000' },
                  dataBar: {
                    from: 0,
                    to: 0.5,
                    color: '#638EC6',
                    negative: false,
                    showValue: true,
                  },
                }
              : {
                  icon: { set: '3Arrows', index: 2, showValue: false },
                  style: resolver.withPatch(undefined, {
                    font: { bold: true },
                  }),
                },
        },
      },
    );
    expect(find(cells, 0, 0)).toMatchObject({
      fill: { color: '#FF0000' },
      dataBar: { to: 0.5 },
    });
    expect(find(cells, 1, 0)).toMatchObject({
      icon: { index: 2 },
      font: { bold: true },
    });
  });
});

describe('ogePaintWindow — hidden merges', () => {
  it('skips a merge whose rows are all hidden', () => {
    const workbook = book([[2, 0, 'gone']]);
    const sheet = workbook.sheets[0];
    sheet.addMerge({ top: 2, left: 0, bottom: 3, right: 1 });
    sheet.setRow(2, { hidden: true });
    sheet.setRow(3, { hidden: true });
    expect(find(paint(workbook), 2, 0)).toBeUndefined();
    // a right-aligned text spills left only as far as it needs
    const cells = paint(
      book([[0, 5, 'abcdefghij', { alignment: { horizontal: 'right' } }]]),
    );
    const cell = find(cells, 0, 5) as OgePaintCell;
    expect(cell.clipLeft).toBeGreaterThanOrEqual(cell.x - 64);
  });
});

describe('ogePaintWindow — wrapped lines', () => {
  it('breaks wrapped, justified and distributed text into lines and stacks the line box', () => {
    const workbook = book([
      [0, 0, 'aaa bbb ccc', { alignment: { wrapText: true } }],
      [1, 0, 'aaa bbb ccc', { alignment: { horizontal: 'justify' } }],
      [
        2,
        0,
        'aaa bbb ccc',
        { alignment: { horizontal: 'distributed', vertical: 'top' } },
      ],
      [3, 0, 'one line'],
    ]);
    const sheet = workbook.sheets[0];
    for (let row = 0; row < 3; row++) sheet.setRow(row, { height: 60 });
    const cells = paint(workbook);
    // 59 px of room at 7 px a character: one word per line
    expect(find(cells, 0, 0)?.lines).toEqual(['aaa bbb', 'ccc']);
    expect(find(cells, 1, 0)?.lines).toEqual(['aaa bbb', 'ccc']);
    // bottom-aligned: the two-line box ends a pixel above the gridline
    expect(find(cells, 0, 0)?.lineTop).toBe(80 - 2 * 20);
    expect(find(cells, 2, 0)?.lineTop).toBe(0);
    expect(find(cells, 3, 0)?.lines).toBeUndefined();
  });
});

describe('ogePaintWindow — a row’s baseline', () => {
  it('sits bottom-aligned labels on the baseline of the row’s largest font', () => {
    const workbook = book([
      [0, 0, 'Size 26'],
      [0, 1, 'Sample', { font: { size: 26 } }],
      [1, 0, 'Accounting'],
      [1, 1, 'Sample', { font: { underline: 'singleAccounting' } }],
      [2, 0, 'plain'],
    ]);
    const sheet = workbook.sheets[0];
    sheet.setRow(0, { height: 34.5 });
    sheet.setRow(1, { height: 17.25 });
    const cells = paint(workbook);
    const big = find(cells, 0, 1) as OgePaintCell;
    const small = find(cells, 0, 0) as OgePaintCell;
    // both baselines at the same height: the big font's descent above the bottom
    expect(
      small.lineTop +
        small.font.lineHeight -
        Math.round(small.font.lineHeight / 5),
    ).toBe(
      big.lineTop + big.font.lineHeight - Math.round(big.font.lineHeight / 5),
    );
    expect(small.rowDescent).toBe(Math.round(big.font.lineHeight / 5));
    // the accounting underline's 3 extra pixels lift its row's plain label (23 px row: 0, not 3)
    expect(find(cells, 1, 0)?.lineTop).toBe(0);
    // a row of one size keeps h − line
    expect(find(cells, 2, 0)?.lineTop).toBe(0);
  });
});
