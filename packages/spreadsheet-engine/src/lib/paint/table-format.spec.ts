import type { OgeSheetRange } from '../address/address';
import type { OgeBorderEdge, OgeCellStyle, OgeFill } from '../model/style';
import type { OgeTable, OgeTableStyleElement } from '../model/table';
import { createOgeWorkbook, type OgeWorkbook } from '../model/workbook';
import { OgeStyleResolver } from './resolve-style';
import { OgeTableFormatter } from './table-format';

const solid = (rgb: string): OgeFill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { rgb: `FF${rgb}` },
});
const line = (rgb: string, style: OgeBorderEdge['style'] = 'thin') => ({
  style,
  color: { rgb: `FF${rgb}` },
});
/** Every edge of an element in one colour family: `<rgb><edge 1–6>` (L R T B V H). */
const edges = (rgb: string) => ({
  left: line(`${rgb}1`),
  right: line(`${rgb}2`),
  top: line(`${rgb}3`),
  bottom: line(`${rgb}4`),
  vertical: line(`${rgb}5`),
  horizontal: line(`${rgb}6`),
});

const range = (
  top: number,
  left: number,
  bottom: number,
  right: number,
): OgeSheetRange => ({ top, left, bottom, right });

function table(
  at: OgeSheetRange,
  style: string | undefined,
  options: Partial<OgeTable> & {
    readonly first?: boolean;
    readonly last?: boolean;
    readonly rows?: boolean;
    readonly columns?: boolean;
  } = {},
): OgeTable {
  const { first, last, rows, columns, ...rest } = options;
  return {
    id: 1,
    name: 'T',
    displayName: 'T',
    range: at,
    headerRowCount: 1,
    totalsRowCount: 0,
    columns: [],
    ...(style !== undefined
      ? {
          style: {
            name: style,
            showFirstColumn: !!first,
            showLastColumn: !!last,
            showRowStripes: !!rows,
            showColumnStripes: !!columns,
          },
        }
      : {}),
    ...rest,
  };
}

/** A workbook whose custom style "Probe" formats each element with `formats`. */
function probe(
  formats: Readonly<Record<string, OgeCellStyle>>,
  sizes: Readonly<Record<string, number>> = {},
): OgeWorkbook {
  const workbook = createOgeWorkbook();
  const elements: OgeTableStyleElement[] = [];
  const dxfs: OgeCellStyle[] = [];
  for (const [type, format] of Object.entries(formats)) {
    elements.push({
      type,
      dxf: dxfs.length,
      ...(sizes[type] ? { size: sizes[type] } : {}),
    });
    dxfs.push(format);
  }
  workbook.dxfs = dxfs;
  workbook.tableStyles = [
    { name: 'Probe', pivot: false, table: true, elements },
  ];
  return workbook;
}

function formatter(workbook: OgeWorkbook, ...tables: OgeTable[]) {
  const sheet = workbook.sheets[0];
  sheet.tables.push(...tables);
  return new OgeTableFormatter(workbook, sheet, new OgeStyleResolver(workbook));
}

const fillAt = (f: OgeTableFormatter, row: number, col: number) =>
  f.style(row, col, 0)?.resolved.fill?.color;

describe('OgeTableFormatter — cells', () => {
  it('leaves tables without a style, or in one nobody defines, unformatted', () => {
    const workbook = createOgeWorkbook();
    const f = formatter(
      workbook,
      table(range(0, 0, 3, 2), undefined),
      table(range(5, 0, 8, 2), 'NoSuchStyle'),
    );
    expect(f.active).toBe(false);
    expect(f.covers(1, 1)).toBe(false);
    expect(f.style(1, 1, 0)).toBeUndefined();
    expect(f.spans(1)).toEqual([]);
    expect(f.line(1, 1, 'top')).toBeNull();
  });

  it('covers its tables’ cells and spans', () => {
    const f = formatter(
      createOgeWorkbook(),
      table(range(1, 1, 4, 3), 'TableStyleMedium2'),
      table(range(2, 6, 3, 7), 'TableStyleLight1'),
    );
    expect(f.active).toBe(true);
    expect(f.covers(1, 1)).toBe(true);
    expect(f.covers(0, 1)).toBe(false);
    expect(f.covers(4, 4)).toBe(false);
    expect(f.spans(2)).toEqual([
      [1, 3],
      [6, 7],
    ]);
    expect(f.spans(9)).toEqual([]);
  });

  it('lays the elements in Excel’s order, a later one winning the fill and each font property', () => {
    const workbook = probe({
      wholeTable: { fill: solid('000001'), font: { italic: true } },
      headerRow: { fill: solid('000002'), font: { bold: true } },
      totalRow: { fill: solid('000003'), font: { strike: true } },
      firstColumn: { fill: solid('000004'), font: { underline: 'single' } },
      lastColumn: { fill: solid('000005'), font: { bold: true } },
      firstRowStripe: { fill: solid('000006') },
      // an explicit "not italic" turns off the whole table's italic
      secondRowStripe: { fill: solid('000007'), font: { italic: false } },
      firstColumnStripe: { fill: solid('000008') },
      secondColumnStripe: { fill: solid('000009') },
      firstHeaderCell: { fill: solid('00000A') },
      lastHeaderCell: { fill: solid('00000B') },
      firstTotalCell: { fill: solid('00000C') },
      lastTotalCell: { fill: solid('00000D') },
    });
    const all = { first: true, last: true, rows: true, columns: true };
    const f = formatter(
      workbook,
      table(range(0, 0, 5, 3), 'Probe', { ...all, totalsRowCount: 1 }),
    );
    // header: the corner cells, then the header row
    expect([0, 1, 2, 3].map((c) => fillAt(f, 0, c))).toEqual([
      '#00000A',
      '#000002',
      '#000002',
      '#00000B',
    ]);
    // data: first and last column over the row stripes over the column stripes
    expect([0, 1, 2, 3].map((c) => fillAt(f, 1, c))).toEqual([
      '#000004',
      '#000006',
      '#000006',
      '#000005',
    ]);
    expect(fillAt(f, 2, 1)).toBe('#000007');
    // totals: the corner cells, then the totals row
    expect([0, 1, 3].map((c) => fillAt(f, 5, c))).toEqual([
      '#00000C',
      '#000003',
      '#00000D',
    ]);
    const font = (row: number, col: number) => {
      const resolved = f.style(row, col, 0)?.resolved.font;
      return [
        resolved?.bold,
        resolved?.italic,
        resolved?.underline ?? null,
        resolved?.strike,
      ];
    };
    // the first header cell: bold (header), italic (whole table), underlined (first column)
    expect(font(0, 0)).toEqual([true, true, 'single', false]);
    expect(font(1, 1)).toEqual([false, true, null, false]);
    expect(font(2, 1)).toEqual([false, false, null, false]);
    expect(font(5, 3)).toEqual([true, true, null, true]);
  });

  it('gives column stripes the data rows only, and stripes a table without a header from its first row', () => {
    const workbook = probe({
      headerRow: { fill: solid('000002') },
      firstColumnStripe: { fill: solid('000008') },
      secondColumnStripe: { fill: solid('000009') },
      firstRowStripe: { fill: solid('000006') },
    });
    const f = formatter(
      workbook,
      table(range(0, 0, 3, 3), 'Probe', { columns: true, totalsRowCount: 1 }),
      table(range(6, 0, 8, 1), 'Probe', { rows: true, headerRowCount: 0 }),
    );
    expect([0, 1].map((c) => fillAt(f, 0, c))).toEqual(['#000002', '#000002']);
    expect([0, 1, 2, 3].map((c) => fillAt(f, 1, c))).toEqual([
      '#000008',
      '#000009',
      '#000008',
      '#000009',
    ]);
    expect(fillAt(f, 3, 0)).toBeUndefined();
    expect([6, 7, 8].map((r) => fillAt(f, r, 0))).toEqual([
      '#000006',
      undefined,
      '#000006',
    ]);
  });

  it('counts stripes over the visible rows and columns, size at a time', () => {
    const workbook = probe(
      {
        firstRowStripe: { fill: solid('000006') },
        secondRowStripe: { fill: solid('000007') },
        firstColumnStripe: { fill: solid('000008') },
      },
      { firstRowStripe: 2 },
    );
    const sheet = workbook.sheets[0];
    sheet.setRow(3, { hidden: true });
    sheet.setRow(6, { height: 0, customHeight: true });
    sheet.setColumns(12, 12, { hidden: true });
    const f = formatter(
      workbook,
      table(range(0, 0, 9, 1), 'Probe', { rows: true }),
      table(range(0, 10, 2, 14), 'Probe', { columns: true }),
    );
    // data rows 1–9, rows 3 and 6 hidden: 1 2 | 4 | 5 7 | 8 | 9
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => fillAt(f, r, 0))).toEqual([
      '#000006',
      '#000006',
      undefined,
      '#000007',
      '#000006',
      undefined,
      '#000006',
      '#000007',
      '#000006',
    ]);
    // columns 10–14, 12 hidden: 10 | 11 | 13 | 14
    expect([10, 11, 13, 14].map((c) => fillAt(f, 1, c))).toEqual([
      '#000008',
      undefined,
      '#000008',
      undefined,
    ]);
  });

  it('keeps a cell’s own fill and each font property that differs from the Normal font', () => {
    const workbook = probe({
      wholeTable: {
        fill: solid('000001'),
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
      },
    });
    const styles = workbook.styles;
    const own = {
      fill: styles.intern({ fill: solid('FFFF00') }),
      red: styles.intern({
        font: { name: 'Calibri', size: 11, color: { rgb: 'FFFF0000' } },
      }),
      arial: styles.intern({
        font: { name: 'Arial', size: 11, color: { theme: 1 } },
      }),
      black: styles.intern({
        font: { name: 'Calibri', size: 11, color: { rgb: 'FF000000' } },
      }),
      tinted: styles.intern({
        font: { name: 'Calibri', color: { theme: 1, tint: -0.5 } },
      }),
      format: styles.intern({ numberFormat: '0.00' }),
    };
    const f = formatter(workbook, table(range(0, 0, 3, 3), 'Probe'));
    const at = (id: number) => f.style(1, 1, id);
    expect(at(own.fill)?.resolved.fill?.color).toBe('#FFFF00');
    expect(at(own.red)?.resolved.font.color).toBe('#FF0000');
    // the Normal colour (theme 1) takes the table's; the font face stays
    expect(at(own.arial)?.resolved.font).toMatchObject({
      name: 'Arial',
      color: '#FFFFFF',
      bold: true,
    });
    expect(at(own.black)?.resolved.font.color).toBe('#000000');
    expect(at(own.tinted)?.resolved.font.color).not.toBe('#FFFFFF');
    const formatted = at(own.format);
    expect(formatted?.resolved.fill?.color).toBe('#000001');
    expect(formatted?.resolved.format).not.toBeNull();
    expect(formatted?.model.numberFormat).toBe('0.00');
    // made once per style and element set
    expect(at(own.format)).toBe(formatted);
  });
});

describe('OgeTableFormatter — lines', () => {
  const colorOf = (edge: { color: string | null } | null) =>
    edge?.color ?? null;

  it('draws an element’s outer edges on its region’s boundary and its inner ones inside it', () => {
    const workbook = probe({
      wholeTable: { border: edges('A0000') },
      headerRow: { border: edges('B0000') },
    });
    const f = formatter(workbook, table(range(0, 0, 3, 2), 'Probe'));
    // the table's top and left edges, at the sheet's edge (no cell before them)
    expect(colorOf(f.line(0, 1, 'top'))).toBe('#B00003');
    expect(colorOf(f.line(2, 0, 'left'))).toBe('#A00001');
    // the header's bottom over the whole table's inner horizontal
    expect(colorOf(f.line(1, 1, 'top'))).toBe('#B00004');
    expect(colorOf(f.line(2, 1, 'top'))).toBe('#A00006');
    expect(colorOf(f.line(0, 1, 'left'))).toBe('#B00005');
    expect(colorOf(f.line(2, 1, 'left'))).toBe('#A00005');
    // the right and bottom edges, against cells outside
    expect(colorOf(f.line(2, 3, 'left'))).toBe('#A00002');
    expect(colorOf(f.line(4, 1, 'top'))).toBe('#A00004');
    // away from the table nothing
    expect(f.line(6, 6, 'top')).toBeNull();
  });

  it('shows the latest element that draws a line, the cell after winning a tie', () => {
    const workbook = probe({
      wholeTable: { border: { horizontal: line('A00006') } },
      // stripes without a horizontal: the bands' edges meet
      firstRowStripe: { border: { bottom: line('C00004') } },
      secondRowStripe: { border: { top: line('D00003') } },
      firstColumn: { fill: solid('000004') },
    });
    const f = formatter(
      workbook,
      table(range(0, 0, 4, 1), 'Probe', { rows: true, first: true }),
      table(range(0, 2, 4, 3), 'Probe', { rows: true }),
    );
    // between a first and a second stripe the second stripe's top wins
    expect(colorOf(f.line(2, 1, 'top'))).toBe('#D00003');
    // between a second and a first stripe: the second's bottom is unset, the first's top too
    expect(colorOf(f.line(3, 1, 'top'))).toBe('#A00006');
    // an element without borders draws nothing
    expect(f.line(0, 1, 'left')).toBeNull();
  });

  it('lets the cell after win a tie between two tables side by side', () => {
    const workbook = probe({
      wholeTable: { border: { left: line('E00001'), right: line('E00002') } },
    });
    const f = formatter(
      workbook,
      table(range(0, 0, 2, 1), 'Probe'),
      table(range(0, 2, 2, 3), 'Probe'),
    );
    expect(colorOf(f.line(1, 2, 'left'))).toBe('#E00001');
  });

  it('formats the totals row of a table without a header, and its corners with the first column', () => {
    const workbook = probe({
      totalRow: {
        fill: solid('000003'),
        border: { top: line('F00003', 'double') },
      },
      firstTotalCell: { fill: solid('00000C') },
    });
    const f = formatter(
      workbook,
      table(range(0, 0, 2, 1), 'Probe', {
        headerRowCount: 0,
        totalsRowCount: 1,
        first: true,
      }),
    );
    expect([0, 1].map((c) => fillAt(f, 2, c))).toEqual(['#00000C', '#000003']);
    expect(fillAt(f, 0, 0)).toBeUndefined();
    expect(f.line(2, 1, 'top')).toMatchObject({
      style: 'double',
      color: '#F00003',
    });
  });
});
