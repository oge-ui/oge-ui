/**
 * The row corpus workbook (`rows.xlsx`): the height Excel gives a row when it
 * opens a file — which rows it fits to their cells and which keep a height
 * (`customHeight`, the sheet's custom default, `zeroHeight`), the fonts,
 * underlines, raised text and rich runs a fit counts, and the row and column
 * styles of the cells a row leaves empty. A case per row; a case named
 * `unlisted` has no `<row>` element. `rows-capture.ps1` reads every case
 * row's height on open, then AutoFits it on the read-only copy
 * (`rows.heights.json`). Corpus tooling only.
 */
import {
  buildXlsxFixture,
  type XlsxFixtureSheet,
} from '../../src/testing/xlsx-fixture';
import { corpusStyleSheet, type CorpusXf } from './style-sheet';

const FAMILY: Readonly<Record<string, number>> = {
  Calibri: 2,
  Arial: 2,
  Cambria: 1,
  'Times New Roman': 1,
};
const font = (name: string, size: number, extra = '') =>
  `${extra}<sz val="${size}"/><color theme="1"/><name val="${name}"/><family val="${FAMILY[name] ?? 2}"/>`;

/** Cell formats, numbered as `corpusStyleSheet` numbers them (1 is the first). */
const XFS: CorpusXf[] = [];
const xf = (format: CorpusXf): number => {
  const key = JSON.stringify(format);
  const at = XFS.findIndex((known) => JSON.stringify(known) === key);
  if (at >= 0) return at + 1;
  XFS.push(format);
  return XFS.length;
};

const BIG = xf({ font: font('Calibri', 20) });
const SMALL = xf({ font: font('Calibri', 9) });
const WRAP = xf({ alignment: 'wrapText="1"' });
const ANGLE = xf({ alignment: 'textRotation="45"' });
const UPRIGHT = xf({ alignment: 'textRotation="90"' });

/** A case: the row's attributes past `r`, and its cells (`@` stands for the row number). */
interface Case {
  readonly name: string;
  readonly row?: string;
  readonly cells?: string;
}

const value = (col: string, s = 0, v = 1) =>
  `<c r="${col}@"${s ? ` s="${s}"` : ''}><v>${v}</v></c>`;
const text = (col: string, t: string, s = 0) =>
  `<c r="${col}@"${s ? ` s="${s}"` : ''} t="inlineStr"><is><t>${t}</t></is></c>`;
const styled = (col: string, s: number) => `<c r="${col}@" s="${s}"/>`;
const run = (t: string, rPr = '') =>
  rPr ? `<r><rPr>${rPr}</rPr><t>${t}</t></r>` : `<r><t>${t}</t></r>`;
const rich = (runs: string, s = 0) =>
  `<c r="A@"${s ? ` s="${s}"` : ''} t="inlineStr"><is>${runs}</is></c>`;
const unlisted: Case = { name: 'unlisted' };

const SIZES = [6, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];

const FONT_CASES: Case[] = [];
const fontCase = (name: string, size: number, align: string) =>
  FONT_CASES.push({
    name: `${name} ${size}${align ? ` ${align}` : ''}`,
    cells: text(
      'A',
      'Xg',
      xf({
        font: font(name, size, align ? `<vertAlign val="${align}"/>` : ''),
      }),
    ),
  });
for (const size of SIZES)
  for (const align of ['', 'superscript', 'subscript'])
    fontCase('Calibri', size, align);
for (const name of ['Arial', 'Cambria', 'Times New Roman'])
  for (const size of [11, 20])
    for (const align of ['', 'superscript', 'subscript'])
      fontCase(name, size, align);

const UNDERLINE_CASES: Case[] = [];
const underlineCase = (name: string, size: number, u: string) =>
  UNDERLINE_CASES.push({
    name: `${name} ${size} ${u}`,
    cells: text('A', 'Xg', xf({ font: font(name, size, `<u val="${u}"/>`) })),
  });
for (const size of SIZES)
  for (const u of ['singleAccounting', 'doubleAccounting', 'single', 'double'])
    underlineCase('Calibri', size, u);
for (const name of ['Arial', 'Cambria'])
  for (const size of [11, 20])
    for (const u of ['singleAccounting', 'doubleAccounting'])
      underlineCase(name, size, u);

/** A rich text: a run in the cell's font, then one in another. */
const RICH_CASES: Case[] = [
  ...(
    [
      ['Cambria', 14, '<i/>'],
      ['Cambria', 14, ''],
      ['Calibri', 14, ''],
      ['Calibri', 20, ''],
      ['Arial', 14, ''],
      ['Arial', 20, ''],
      ['Times New Roman', 14, ''],
      ['Times New Roman', 20, ''],
      ['Cambria', 20, ''],
      ['Cambria', 11, ''],
      ['Arial', 11, ''],
      ['Times New Roman', 11, ''],
      ['Calibri', 8, ''],
      ['Cambria', 8, ''],
      ['Calibri', 11, '<vertAlign val="superscript"/>'],
      ['Calibri', 11, '<vertAlign val="subscript"/>'],
      ['Calibri', 20, '<vertAlign val="superscript"/>'],
      ['Calibri', 11, '<u val="singleAccounting"/>'],
    ] as const
  ).map(([name, size, extra]) => ({
    name: `Calibri 11 + ${name} ${size}${extra ? ` ${/val="(\w+)"/.exec(extra)?.[1] ?? 'italic'}` : ''}`,
    cells: rich(
      run('Base ') +
        run(
          'Run',
          // rPr in schema order: rFont, i, sz, u, vertAlign
          `<rFont val="${name}"/>${extra === '<i/>' ? extra : ''}<sz val="${size}"/>${extra === '<i/>' ? '' : extra}`,
        ),
    ),
  })),
  {
    name: 'Calibri 20 + Cambria 11',
    cells: rich(
      run('Base ') + run('Run', '<rFont val="Cambria"/><sz val="11"/>'),
      BIG,
    ),
  },
  {
    name: 'Arial 11 + Calibri 14',
    cells: rich(
      run('Base ') + run('Run', '<rFont val="Calibri"/><sz val="14"/>'),
      xf({ font: font('Arial', 11) }),
    ),
  },
];

const LONG = 'one two three four five six seven eight nine ten';
const ROW_CASES: Case[] = [
  { name: 'plain', cells: value('A') },
  { name: 'stored 30', row: 'ht="30"', cells: value('A') },
  { name: 'stored 10, 20 pt cell', row: 'ht="10"', cells: value('A', BIG) },
  { name: 'custom 30', row: 'ht="30" customHeight="1"', cells: value('A') },
  {
    name: 'custom 10, 20 pt cell',
    row: 'ht="10" customHeight="1"',
    cells: value('A', BIG),
  },
  { name: 'custom without ht', row: 'customHeight="1"', cells: value('A') },
  {
    name: 'row style 9 pt',
    row: `s="${SMALL}" customFormat="1"`,
    cells: value('A', SMALL),
  },
  { name: 'row style 9 pt, empty', row: `s="${SMALL}" customFormat="1"` },
  { name: 'row style 20 pt, empty', row: `s="${BIG}" customFormat="1"` },
  { name: '9 pt cell', cells: value('A', SMALL) },
  { name: 'empty 20 pt cell', cells: styled('A', BIG) },
  { name: 'wrapped', cells: text('A', LONG, WRAP) },
  { name: 'wrapped, stored 15', row: 'ht="15"', cells: text('A', LONG, WRAP) },
  { name: 'rotated 45°', cells: text('A', 'Rotated text', ANGLE) },
  { name: 'rotated 90°', cells: text('A', 'Hello', UPRIGHT) },
  { name: 'merged 20 pt', cells: value('A', BIG) },
  { name: 'merged wrapped', cells: text('A', LONG, WRAP) },
  { name: 'merged down 20 pt', cells: value('A', BIG) },
  { name: 'merged down (second row)' },
  { name: 'bare' },
  { name: 'hidden', row: 'hidden="1"', cells: value('A') },
  unlisted,
];

const CUSTOM_CASES: Case[] = [
  { name: 'plain', cells: value('A') },
  { name: 'custom 30', row: 'ht="30" customHeight="1"', cells: value('A') },
  { name: 'custom without ht', row: 'customHeight="1"', cells: value('A') },
  { name: 'stored 10, 20 pt cell', row: 'ht="10"', cells: value('A', BIG) },
  { name: 'bare' },
  unlisted,
];

const COLUMN_STYLE_CASES: Case[] = [
  { name: 'A only', cells: value('A') },
  { name: 'A and B', cells: value('A') + value('B') },
  { name: 'B only', cells: value('B') },
  {
    name: 'row style Normal',
    row: 's="0" customFormat="1"',
    cells: value('A'),
  },
  {
    name: 'row style 9 pt',
    row: `s="${SMALL}" customFormat="1"`,
    cells: value('A', SMALL),
  },
  unlisted,
];

const ALL_COLUMNS_CASES: Case[] = [
  { name: '9 pt cell', cells: value('A', SMALL) },
  { name: 'Normal cell', cells: value('A') },
  {
    name: 'row style Normal',
    row: 's="0" customFormat="1"',
    cells: value('A'),
  },
  unlisted,
];

const ZERO_CASES: Case[] = [
  { name: 'plain', cells: value('A') },
  { name: 'stored 30', row: 'ht="30"', cells: value('A') },
  { name: 'custom 30', row: 'ht="30" customHeight="1"' },
  { name: 'custom without ht', row: 'customHeight="1"' },
  { name: 'bare' },
  unlisted,
];

const DEFAULT_CASES: Case[] = [
  { name: 'plain', cells: value('A') },
  { name: '20 pt cell', cells: value('A', BIG) },
  { name: '9 pt cell', cells: value('A', SMALL) },
  { name: 'stored 30, empty', row: 'ht="30"' },
  unlisted,
];

/** `<mergeCells>` for some cases, each a range from its row number. */
function mergesOf(
  cases: readonly Case[],
  ranges: Readonly<Record<string, (row: number) => string>>,
): string {
  const refs = Object.entries(ranges).map(([name, range]) =>
    range(cases.findIndex((c) => c.name === name) + 1),
  );
  return `<mergeCells count="${refs.length}">${refs.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`;
}

const SHEETS: readonly {
  readonly name: string;
  readonly format: string;
  readonly cols?: string;
  readonly merges?: string;
  readonly cases: readonly Case[];
}[] = [
  {
    name: 'Fonts',
    format: '<sheetFormatPr defaultRowHeight="15"/>',
    cases: FONT_CASES,
  },
  {
    name: 'Underlines',
    format: '<sheetFormatPr defaultRowHeight="15"/>',
    cases: UNDERLINE_CASES,
  },
  {
    name: 'Rich',
    format: '<sheetFormatPr defaultRowHeight="15"/>',
    cases: RICH_CASES,
  },
  {
    name: 'Rows',
    format: '<sheetFormatPr defaultRowHeight="15"/>',
    merges: mergesOf(ROW_CASES, {
      'merged 20 pt': (r) => `A${r}:B${r}`,
      'merged wrapped': (r) => `A${r}:B${r}`,
      'merged down 20 pt': (r) => `A${r}:A${r + 1}`,
    }),
    cases: ROW_CASES,
  },
  {
    name: 'Custom30',
    format: '<sheetFormatPr defaultRowHeight="30" customHeight="1"/>',
    cases: CUSTOM_CASES,
  },
  {
    name: 'ColumnB20',
    format: '<sheetFormatPr defaultRowHeight="15"/>',
    cols: `<cols><col min="2" max="2" width="9.140625" style="${BIG}"/></cols>`,
    cases: COLUMN_STYLE_CASES,
  },
  {
    name: 'AllColumns9',
    format: '<sheetFormatPr defaultRowHeight="15"/>',
    cols: `<cols><col min="1" max="16384" width="9.140625" style="${SMALL}"/></cols>`,
    cases: ALL_COLUMNS_CASES,
  },
  {
    name: 'ZeroHeight',
    format: '<sheetFormatPr defaultRowHeight="15" zeroHeight="1"/>',
    cases: ZERO_CASES,
  },
  {
    name: 'Default18',
    format: '<sheetFormatPr defaultRowHeight="18" customHeight="1"/>',
    cases: DEFAULT_CASES,
  },
  {
    name: 'Default12',
    format: '<sheetFormatPr defaultRowHeight="12" customHeight="1"/>',
    cases: DEFAULT_CASES,
  },
];

/** Case names per sheet, a row each, top to bottom. */
export const ROWS_CASES: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(
    SHEETS.map((sheet) => [sheet.name, sheet.cases.map((c) => c.name)]),
  );

function sheetOf(sheet: (typeof SHEETS)[number]): XlsxFixtureSheet {
  const rows = sheet.cases
    .map((c, i) => {
      if (c === unlisted) return '';
      const r = String(i + 1);
      const attributes = `r="${r}"${c.row ? ` ${c.row}` : ''}`;
      const cells = (c.cells ?? '').replace(/@/g, r);
      return cells
        ? `<row ${attributes}>${cells}</row>`
        : `<row ${attributes}/>`;
    })
    .join('');
  return {
    name: sheet.name,
    xml: `${sheet.format}${sheet.cols ?? ''}<sheetData>${rows}</sheetData>${sheet.merges ?? ''}`,
  };
}

export function rowsWorkbook(): Uint8Array {
  return buildXlsxFixture({
    theme: true,
    styles: corpusStyleSheet(XFS),
    sheets: SHEETS.map(sheetOf),
  });
}
