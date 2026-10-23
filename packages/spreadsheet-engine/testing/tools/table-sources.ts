/**
 * The tables corpus workbook (`tables.xlsx`): Excel tables in custom styles
 * whose every element is told apart by colour, Excel's 60 built-in styles,
 * cells with their own formatting inside tables, and stripes over hidden rows
 * and columns. `capture.ps1` records what Excel displays in every cell;
 * `table-lines.ps1` reads the lines between cells off the screen on the
 * `Lines` and `Builtin` sheets, whose cells stay empty so nothing but the
 * lines and fills is there to sample. Corpus tooling only.
 */
import { ogeColumnName } from '../../src/lib/address/address';
import {
  buildXlsxFixture,
  fixtureCell,
  type XlsxFixturePart,
  type XlsxFixtureSheet,
} from '../../src/testing/xlsx-fixture';
import { OGE_BUILTIN_TABLE_STYLE_NAMES } from '../../src/lib/model/table-styles';
import { NORMAL_FONT } from './style-sheet';

const fonts = [
  NORMAL_FONT,
  '<sz val="11"/><color rgb="FFFF0000"/><name val="Calibri"/><family val="2"/><scheme val="minor"/>',
  '<sz val="11"/><color theme="1"/><name val="Arial"/><family val="2"/>',
  `<b/>${NORMAL_FONT}`,
  // the Normal font again, in another order: a second record of the same font
  '<color theme="1"/><sz val="11"/><name val="Calibri"/><family val="2"/><scheme val="minor"/>',
  '<sz val="11"/><color rgb="FF000000"/><name val="Calibri"/><family val="2"/><scheme val="minor"/>',
  '<sz val="11"/><name val="Calibri"/><family val="2"/><scheme val="minor"/>',
  `<i/>${NORMAL_FONT}`,
  '<sz val="11"/><color auto="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/>',
  '<sz val="11"/><color theme="4"/><name val="Calibri"/><family val="2"/><scheme val="minor"/>',
  '<sz val="11"/><color theme="1" tint="0.499984740745262"/><name val="Calibri"/><family val="2"/><scheme val="minor"/>',
  '<sz val="11"/><color theme="0"/><name val="Calibri"/><family val="2"/><scheme val="minor"/>',
];
const fills = [
  '<patternFill patternType="none"/>',
  '<patternFill patternType="gray125"/>',
  '<patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill>',
];
const edge = (name: string, style: string, rgb: string) =>
  `<${name} style="${style}"><color rgb="FF${rgb}"/></${name}>`;
const borders = [
  '<left/><right/><top/><bottom/><diagonal/>',
  `${edge('left', 'thin', '000000')}${edge('right', 'thin', '000000')}${edge('top', 'thin', '000000')}${edge('bottom', 'thin', '000000')}<diagonal/>`,
  `${edge('left', 'thin', 'FF0000')}<right/><top/><bottom/><diagonal/>`,
  `<left/><right/><top/>${edge('bottom', 'thin', 'FF0000')}<diagonal/>`,
  `<left/><right/>${edge('top', 'thin', 'FF0000')}<bottom/><diagonal/>`,
  `<left/>${edge('right', 'thin', 'FF0000')}<top/><bottom/><diagonal/>`,
];

/** Cell formats: [numFmtId, fontId, fillId, borderId, extra attributes]. */
const XFS: readonly (readonly [number, number, number, number, string])[] = [
  [0, 0, 0, 0, ''],
  [0, 1, 0, 0, ' applyFont="1"'], // 1 red font
  [0, 0, 2, 0, ' applyFill="1"'], // 2 yellow fill
  [0, 0, 0, 1, ' applyBorder="1"'], // 3 black box
  [0, 2, 0, 0, ' applyFont="1"'], // 4 Arial in theme colour 1
  [0, 3, 0, 0, ' applyFont="1"'], // 5 bold
  [2, 0, 0, 0, ' applyNumberFormat="1"'], // 6 0.00
  [0, 0, 2, 0, ''], // 7 yellow fill without applyFill
  [0, 0, 0, 0, ' applyFill="1"'], // 8 no fill, applyFill
  [0, 0, 0, 0, ' applyFont="1"'], // 9 the Normal font, applyFont
  [0, 4, 0, 0, ' applyFont="1"'], // 10 the Normal font's second record
  [0, 5, 0, 0, ' applyFont="1"'], // 11 black as RGB
  [0, 6, 0, 0, ' applyFont="1"'], // 12 no colour
  [0, 7, 0, 0, ' applyFont="1"'], // 13 italic
  [0, 0, 0, 2, ' applyBorder="1"'], // 14 red left edge
  [0, 8, 0, 0, ' applyFont="1"'], // 15 automatic colour
  [0, 0, 0, 3, ' applyBorder="1"'], // 16 red bottom edge
  [0, 0, 0, 4, ' applyBorder="1"'], // 17 red top edge
  [0, 0, 0, 5, ' applyBorder="1"'], // 18 red right edge
  [0, 9, 0, 0, ' applyFont="1"'], // 19 accent 1
  [0, 10, 0, 0, ' applyFont="1"'], // 20 theme colour 1, 50% lighter
  [0, 11, 0, 0, ' applyFont="1"'], // 21 theme colour 0
];

const ELEMENTS = [
  'wholeTable',
  'headerRow',
  'totalRow',
  'firstColumn',
  'lastColumn',
  'firstRowStripe',
  'secondRowStripe',
  'firstColumnStripe',
  'secondColumnStripe',
  'firstHeaderCell',
  'lastHeaderCell',
  'firstTotalCell',
  'lastTotalCell',
] as const;
type Element = (typeof ELEMENTS)[number];
const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, '0');
/** Font flags of the "fills" elements: merging and an explicit "not italic". */
const FLAGS: Partial<Record<Element, string>> = {
  wholeTable: '<i/>',
  headerRow: '<b/>',
  totalRow: '<strike/>',
  firstColumn: '<u/>',
  lastColumn: '<b/>',
  secondRowStripe: '<i val="0"/>',
};
const EDGES = ['left', 'right', 'top', 'bottom', 'vertical', 'horizontal'];
/** Element i: fill F0F0ii, font A000ii (dxf i); borders B0iiee, edge e 1–6 (dxf 13 + i); both (dxf 26 + i). */
const fillDxf = (i: number) =>
  `<fill><patternFill><bgColor rgb="FFF0F0${hex2(i)}"/></patternFill></fill>`;
const borderDxf = (i: number) =>
  `<border>${EDGES.map((e, k) => `<${e} style="thin"><color rgb="FFB0${hex2(i)}${hex2(k + 1)}"/></${e}>`).join('')}</border>`;
const dxfs = [
  ...ELEMENTS.map(
    (name, i) =>
      `<font>${FLAGS[name] ?? ''}<color rgb="FFA000${hex2(i)}"/></font>${fillDxf(i)}`,
  ),
  ...ELEMENTS.map((_, i) => borderDxf(i)),
  ...ELEMENTS.map((_, i) => `${fillDxf(i)}${borderDxf(i)}`),
];
const FILLS = 0;
const LINES = 13;
const BOTH = 26;
const at = (element: Element) => ELEMENTS.indexOf(element);

/** A custom table style: element → [dxf, size]. */
const customStyle = (
  name: string,
  elements: Partial<Record<Element, readonly [number, number?]>>,
) =>
  `<tableStyle name="${name}" pivot="0" count="${Object.keys(elements).length}">${Object.entries(
    elements,
  )
    .map(
      ([type, [dxf, size] = [0]]) =>
        `<tableStyleElement type="${type}" dxfId="${dxf}"${size ? ` size="${size}"` : ''}/>`,
    )
    .join('')}</tableStyle>`;
const every = (base: number, sizes: Partial<Record<Element, number>> = {}) =>
  Object.fromEntries(
    ELEMENTS.map((type, i) => [type, [base + i, sizes[type]] as const]),
  );

const styles =
  `<fonts count="${fonts.length}">${fonts.map((f) => `<font>${f}</font>`).join('')}</fonts>` +
  `<fills count="${fills.length}">${fills.map((f) => `<fill>${f}</fill>`).join('')}</fills>` +
  `<borders count="${borders.length}">${borders.map((b) => `<border>${b}</border>`).join('')}</borders>` +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  `<cellXfs count="${XFS.length}">${XFS.map(([n, f, l, b, extra]) => `<xf numFmtId="${n}" fontId="${f}" fillId="${l}" borderId="${b}" xfId="0"${extra}/>`).join('')}</cellXfs>` +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  `<dxfs count="${dxfs.length}">${dxfs.map((d) => `<dxf>${d}</dxf>`).join('')}</dxfs>` +
  '<tableStyles count="5" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16">' +
  customStyle('Fills', every(FILLS)) +
  customStyle(
    'FillsSized',
    every(FILLS, {
      firstRowStripe: 2,
      secondRowStripe: 3,
      firstColumnStripe: 2,
    }),
  ) +
  customStyle('Lines', every(LINES)) +
  customStyle('ColumnBands', {
    wholeTable: [LINES + at('wholeTable')],
    headerRow: [FILLS + at('headerRow')],
    totalRow: [FILLS + at('totalRow')],
    firstColumnStripe: [BOTH + at('firstColumnStripe'), 2],
    secondColumnStripe: [BOTH + at('secondColumnStripe')],
  }) +
  customStyle('RowBands', {
    wholeTable: [LINES + at('wholeTable')],
    headerRow: [FILLS + at('headerRow')],
    totalRow: [FILLS + at('totalRow')],
    firstRowStripe: [BOTH + at('firstRowStripe'), 2],
    secondRowStripe: [BOTH + at('secondRowStripe')],
  }) +
  '</tableStyles>';

interface Table {
  readonly name: string;
  /** First row (1-based) and column (0-based). */
  readonly top: number;
  readonly left: number;
  readonly cols: number;
  readonly dataRows: number;
  readonly header?: boolean;
  readonly totals?: boolean;
  /** Omitted: the table has no style. */
  readonly style?: string;
  readonly first?: boolean;
  readonly last?: boolean;
  readonly rowStripes?: boolean;
  readonly columnStripes?: boolean;
  /** Values in the cells (else only the header row has text, one letter each). */
  readonly values?: boolean;
  readonly filter?: boolean;
  /** Each column's cell format, by column offset. */
  readonly xfByColumn?: boolean;
  /** Cell formats by "row offset,column offset" from the table's top left. */
  readonly xfAt?: Readonly<Record<string, number>>;
  /** Data cells left out, as [data row, column] offsets. */
  readonly gaps?: readonly (readonly [number, number])[];
}

const ref = (row: number, col: number) => `${ogeColumnName(col)}${row}`;

function sheetOf(
  name: string,
  tables: readonly Table[],
  firstId: number,
  hidden: { rows?: number[]; cols?: number[] } = {},
): { sheet: XlsxFixtureSheet; parts: XlsxFixturePart[] } {
  const rows = new Map<number, string[]>();
  const put = (row: number, xml: string) => {
    const list = rows.get(row);
    if (list) list.push(xml);
    else rows.set(row, [xml]);
  };
  const parts: XlsxFixturePart[] = [];
  tables.forEach((t, k) => {
    const header = t.header ?? true;
    const bottom =
      t.top + (header ? 1 : 0) + t.dataRows + (t.totals ? 1 : 0) - 1;
    const right = t.left + t.cols - 1;
    const names = Array.from({ length: t.cols }, (_, c) =>
      t.values ? `${t.name}${c + 1}` : String.fromCharCode(97 + c),
    );
    for (let row = t.top; row <= bottom; row++) {
      const isHeader = header && row === t.top;
      const isTotal = !!t.totals && row === bottom;
      const dataRow = row - t.top - (header ? 1 : 0);
      for (let c = 0; c < t.cols; c++) {
        const xf =
          t.xfAt?.[`${row - t.top},${c}`] ?? (t.xfByColumn ? c % 16 : 0);
        const at = ref(row, t.left + c);
        const s = xf ? ` s="${xf}"` : '';
        if (isHeader) put(row, fixtureCell(at, names[c], xf || undefined));
        else if (isTotal && t.values)
          put(
            row,
            c === 0
              ? fixtureCell(at, 'Total', xf || undefined)
              : `<c r="${at}"${s}><f>SUBTOTAL(109,${t.name}[${names[c]}])</f><v>${1000 + c}</v></c>`,
          );
        else if (
          t.values &&
          !isTotal &&
          !t.gaps?.some(([r, gc]) => r === dataRow && gc === c)
        )
          put(
            row,
            fixtureCell(at, (dataRow + 1) * 10 + c + 0.5, xf || undefined),
          );
        else if (xf) put(row, `<c r="${at}"${s}/>`);
      }
    }
    const id = firstId + k;
    const filter = t.filter && header;
    parts.push({
      path: `xl/tables/table${id}.xml`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml',
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        `<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${id}" name="${t.name}" displayName="${t.name}" ref="${ref(t.top, t.left)}:${ref(bottom, right)}"${header ? '' : ' headerRowCount="0"'}${t.totals ? ' totalsRowCount="1"' : ''}>` +
        (filter
          ? `<autoFilter ref="${ref(t.top, t.left)}:${ref(bottom - (t.totals ? 1 : 0), right)}"/>`
          : '') +
        `<tableColumns count="${t.cols}">${names
          .map(
            (n, c) =>
              `<tableColumn id="${c + 1}" name="${n}"${t.totals && t.values ? (c === 0 ? ' totalsRowLabel="Total"' : ' totalsRowFunction="sum"') : ''}/>`,
          )
          .join('')}</tableColumns>` +
        (t.style
          ? `<tableStyleInfo name="${t.style}" showFirstColumn="${t.first ? 1 : 0}" showLastColumn="${t.last ? 1 : 0}" showRowStripes="${t.rowStripes ? 1 : 0}" showColumnStripes="${t.columnStripes ? 1 : 0}"/>`
          : '') +
        '</table>',
    });
  });
  const hiddenRows = new Set(hidden.rows ?? []);
  for (const row of hiddenRows) if (!rows.has(row)) rows.set(row, []);
  const sheetData = [...rows.keys()]
    .sort((a, b) => a - b)
    .map(
      (row) =>
        `<row r="${row}"${hiddenRows.has(row) ? ' hidden="1"' : ''}>${(rows.get(row) ?? []).join('')}</row>`,
    )
    .join('');
  const cols = hidden.cols?.length
    ? `<cols>${hidden.cols.map((c) => `<col min="${c + 1}" max="${c + 1}" width="9.140625" hidden="1" customWidth="1"/>`).join('')}</cols>`
    : '';
  return {
    sheet: {
      name,
      xml: `${cols}<sheetData>${sheetData}</sheetData><tableParts count="${tables.length}">${tables.map((_, k) => `<tablePart r:id="rId${k + 1}"/>`).join('')}</tableParts>`,
      rels: tables.map((_, k) => ({
        id: `rId${k + 1}`,
        type: 'table',
        target: `../tables/table${firstId + k}.xml`,
      })),
    },
    parts,
  };
}

const all = { first: true, last: true, rowStripes: true, columnStripes: true };
const SHEETS: readonly {
  readonly name: string;
  readonly tables: readonly Table[];
  readonly hidden?: { rows?: number[]; cols?: number[] };
}[] = [
  {
    // each element's fill and font, all options on and in part
    name: 'Elements',
    tables: [
      {
        name: 'AllOn',
        top: 2,
        left: 1,
        cols: 7,
        dataRows: 7,
        totals: true,
        style: 'Fills',
        ...all,
        values: true,
        filter: true,
        gaps: [
          [2, 2],
          [3, 3],
        ],
      },
      {
        name: 'RowsOnly',
        top: 13,
        left: 1,
        cols: 7,
        dataRows: 5,
        style: 'Fills',
        rowStripes: true,
        values: true,
        filter: true,
      },
      {
        name: 'NoHeader',
        top: 21,
        left: 1,
        cols: 4,
        dataRows: 4,
        header: false,
        style: 'Fills',
        rowStripes: true,
        columnStripes: true,
        values: true,
      },
      {
        name: 'OneColumn',
        top: 27,
        left: 1,
        cols: 1,
        dataRows: 3,
        totals: true,
        style: 'Fills',
        ...all,
        values: true,
        filter: true,
      },
      {
        name: 'Sized',
        top: 2,
        left: 10,
        cols: 7,
        dataRows: 10,
        style: 'FillsSized',
        rowStripes: true,
        columnStripes: true,
        values: true,
        filter: true,
      },
      {
        name: 'LastOnly',
        top: 15,
        left: 10,
        cols: 4,
        dataRows: 3,
        totals: true,
        style: 'Fills',
        last: true,
        values: true,
        filter: true,
      },
      {
        name: 'TotalsOnly',
        top: 23,
        left: 10,
        cols: 3,
        dataRows: 3,
        header: false,
        totals: true,
        style: 'Fills',
        rowStripes: true,
        first: true,
        values: true,
      },
      {
        name: 'ColumnsOnly',
        top: 29,
        left: 10,
        cols: 6,
        dataRows: 3,
        totals: true,
        style: 'Fills',
        columnStripes: true,
        values: true,
        filter: true,
      },
    ],
  },
  {
    // each element's six lines, told apart by colour; cells empty
    name: 'Lines',
    tables: [
      {
        name: 'LinesAll',
        top: 2,
        left: 1,
        cols: 5,
        dataRows: 6,
        totals: true,
        style: 'Lines',
        ...all,
      },
      {
        name: 'LinesRows',
        top: 12,
        left: 1,
        cols: 5,
        dataRows: 4,
        style: 'Lines',
        rowStripes: true,
      },
      {
        name: 'LinesNone',
        top: 19,
        left: 1,
        cols: 5,
        dataRows: 4,
        style: 'Lines',
      },
      {
        name: 'ColumnBanded',
        top: 2,
        left: 8,
        cols: 7,
        dataRows: 4,
        totals: true,
        style: 'ColumnBands',
        columnStripes: true,
      },
      {
        name: 'RowBanded',
        top: 10,
        left: 8,
        cols: 4,
        dataRows: 7,
        style: 'RowBands',
        rowStripes: true,
      },
      {
        // a cell's own thin edges against a medium, a thin and a double table line
        name: 'OwnEdges',
        top: 20,
        left: 8,
        cols: 6,
        dataRows: 3,
        totals: true,
        style: 'TableStyleLight15',
        rowStripes: true,
        xfAt: { '0,1': 16, '1,2': 17, '1,3': 18, '4,4': 17, '2,4': 16 },
      },
    ],
  },
  {
    // cells with their own formatting over built-in styles
    name: 'Direct',
    tables: [
      {
        name: 'Medium',
        top: 2,
        left: 1,
        cols: 16,
        dataRows: 4,
        totals: true,
        style: 'TableStyleMedium2',
        rowStripes: true,
        values: true,
        filter: true,
        xfByColumn: true,
      },
      {
        name: 'Dark',
        top: 10,
        left: 1,
        cols: 16,
        dataRows: 4,
        totals: true,
        style: 'TableStyleDark1',
        rowStripes: true,
        first: true,
        values: true,
        filter: true,
        xfByColumn: true,
      },
      {
        name: 'Light',
        top: 18,
        left: 1,
        cols: 16,
        dataRows: 4,
        totals: true,
        style: 'TableStyleLight15',
        rowStripes: true,
        values: true,
        filter: true,
        xfByColumn: true,
      },
      {
        name: 'Fonts',
        top: 26,
        left: 1,
        cols: 4,
        dataRows: 2,
        style: 'TableStyleMedium2',
        rowStripes: true,
        values: true,
        filter: true,
        xfAt: {
          '0,0': 19,
          '0,1': 20,
          '0,2': 21,
          '1,0': 19,
          '1,1': 20,
          '1,2': 21,
        },
      },
      {
        name: 'Unstyled',
        top: 26,
        left: 7,
        cols: 3,
        dataRows: 2,
        values: true,
        filter: true,
      },
    ],
  },
  {
    // stripes count the visible rows and columns
    name: 'Hidden',
    tables: [
      {
        name: 'BandedRows',
        top: 2,
        left: 1,
        cols: 4,
        dataRows: 10,
        style: 'Fills',
        rowStripes: true,
        values: true,
        filter: true,
      },
      {
        name: 'BandedColumns',
        top: 2,
        left: 7,
        cols: 6,
        dataRows: 3,
        style: 'Fills',
        columnStripes: true,
        values: true,
        filter: true,
      },
    ],
    hidden: { rows: [4, 9], cols: [9] },
  },
  {
    // Excel's 60 built-in styles, options varied; cells empty
    name: 'Builtin',
    tables: OGE_BUILTIN_TABLE_STYLE_NAMES.map((style, i) => ({
      name: style.replace('TableStyle', ''),
      top: 2 + Math.floor(i / 6) * 8,
      left: 1 + (i % 6) * 4,
      cols: 3,
      dataRows: 4,
      totals: true,
      style,
      first: i % 2 === 1,
      last: i % 4 >= 2,
      rowStripes: i % 3 !== 2,
      columnStripes: i % 3 !== 0,
    })),
  },
];

/** The tables corpus source workbook. */
export function tablesWorkbook(): Uint8Array {
  let nextId = 1;
  const parts: XlsxFixturePart[] = [];
  const sheets = SHEETS.map(({ name, tables, hidden }) => {
    const built = sheetOf(name, tables, nextId, hidden);
    nextId += tables.length;
    parts.push(...built.parts);
    return built.sheet;
  });
  return buildXlsxFixture({ theme: true, styles, sheets, extraParts: parts });
}
