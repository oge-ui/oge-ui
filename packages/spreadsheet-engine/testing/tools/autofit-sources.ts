/**
 * The AutoFit corpus workbook (`autofit.xlsx`): what Excel's AutoFit does to
 * a column (sheets `Cols…`) or a row (sheets `Rows…`) for one case each —
 * text, numbers and dates, fonts, indents, wraps, merged cells, hidden rows,
 * long texts of single characters, rotations and sizes. `autofit-capture.ps1`
 * AutoFits every case column or row of a read-only copy and records the
 * width or height Excel gave it (`autofit.fit.json`). Corpus tooling only.
 */
import { ogeColumnName } from '../../src/lib/address/address';
import {
  buildXlsxFixture,
  fixtureCell,
  type XlsxFixtureSheet,
  type XlsxFixtureValue,
} from '../../src/testing/xlsx-fixture';
import { corpusStyleSheet, type CorpusXf } from './style-sheet';

const font = (extra: string, size = 11, name = 'Calibri') =>
  `${extra}<sz val="${size}"/><color theme="1"/><name val="${name}"/><family val="2"/>${name === 'Calibri' ? '<scheme val="minor"/>' : ''}`;

/** Cell formats, numbered as `corpusStyleSheet` numbers them (1 is the first). */
const XFS: CorpusXf[] = [];
const xf = (format: CorpusXf): number => {
  const key = JSON.stringify(format);
  const at = XFS.findIndex((known) => JSON.stringify(known) === key);
  if (at >= 0) return at + 1;
  XFS.push(format);
  return XFS.length;
};

type Value = XlsxFixtureValue;
/** A case: its cells (top to bottom, or left to right), each a value and a format. */
interface Case {
  readonly name: string;
  readonly cells: readonly (readonly [Value | null, number?])[];
}

const BOLD = xf({ font: font('<b/>') });
const COLUMN_CASES: Case[] = [
  { name: 'hello', cells: [['Hello']] },
  { name: 'sentence', cells: [['The quick brown fox jumps over']] },
  { name: 'general', cells: [[1234567.891]] },
  { name: 'tenth', cells: [[0.1]] },
  { name: 'date', cells: [[45658, xf({ numFmt: 'd mmmm yyyy' })]] },
  { name: 'bold', cells: [['Bold text', BOLD]] },
  {
    name: 'wrapped',
    cells: [['wrapped text that is long', xf({ alignment: 'wrapText="1"' })]],
  },
  { name: 'money', cells: [[123456789, xf({ numFmt: '#,##0.00' })]] },
  {
    name: 'indent',
    cells: [['Indented', xf({ alignment: 'indent="2" horizontal="left"' })]],
  },
  {
    name: 'right',
    cells: [['Right', xf({ alignment: 'horizontal="right"' })]],
  },
  { name: 'widest', cells: [['a'], ['abcdef'], ['abc']] },
  { name: 'bigint', cells: [[123456789012]] },
  { name: 'bool', cells: [[true]] },
  { name: 'error', cells: [[{ error: '#N/A' }]] },
  { name: 'leading', cells: [['   spaced']] },
  { name: 'trailing', cells: [['trail   ']] },
  { name: 'digits', cells: [[12345678901]] },
  { name: 'negative', cells: [[-0.000123]] },
  { name: 'boldheader', cells: [['Total', BOLD], [12]] },
  { name: 'empty', cells: [] },
];

/** One character repeated: Excel's long-text margin grows with the width. */
const REPEATS: Case[] = [];
for (const ch of ['x', 'W', 'i', 'H', 'f', 'm', 'e', '.'])
  for (const n of [1, 2, 3, 5, 10, 20, 40])
    REPEATS.push({ name: `${ch}×${n}`, cells: [[ch.repeat(n)]] });

/** Rotated text at 11 and 20 pt. */
const ANGLES: Case[] = [];
for (const size of [11, 20])
  for (const text of ['Rotated text', 'Hi', 'A much longer rotated label'])
    for (const angle of [15, 30, 45, 60, 75, 90, 105, 135, 165, 180, 255])
      ANGLES.push({
        name: `${size}pt ${angle}° ${text}`,
        cells: [
          [
            text,
            xf({
              alignment: `textRotation="${angle}"`,
              ...(size === 11 ? {} : { font: font('', size) }),
            }),
          ],
        ],
      });

/** Vertical, stacked and horizontal text per font size. */
const SIZES: Case[] = [];
for (const size of [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72])
  for (const angle of [90, 255, 0])
    SIZES.push({
      name: `${size}pt ${angle}°`,
      cells: [
        [
          'Hi',
          xf({
            font: font('', size),
            ...(angle ? { alignment: `textRotation="${angle}"` } : {}),
          }),
        ],
      ],
    });

const ROW_CASES: Case[] = [
  { name: 'default', cells: [['text']] },
  { name: 'big', cells: [['Big', xf({ font: font('', 20) })]] },
  {
    name: 'wrap',
    cells: [
      [
        'one two three four five six seven eight nine',
        xf({ alignment: 'wrapText="1"' }),
      ],
    ],
  },
  { name: 'mixed', cells: [['small'], ['Big', xf({ font: font('', 20) })]] },
  { name: 'empty', cells: [] },
  { name: 'arial', cells: [['Arial', xf({ font: font('', 10, 'Arial') })]] },
  { name: 'newline', cells: [['line one\nline two']] },
  {
    name: 'newline wrapped',
    cells: [['line one\nline two', xf({ alignment: 'wrapText="1"' })]],
  },
  {
    name: 'wrap indent',
    cells: [
      [
        'one two three four five six',
        xf({ alignment: 'wrapText="1" indent="1" horizontal="left"' }),
      ],
    ],
  },
  { name: 'empty 20pt', cells: [[null, xf({ font: font('', 20) })]] },
  { name: 'glyphs 36pt', cells: [['gy', xf({ font: font('', 36) })]] },
];

/** A case's cell XML at a reference. */
function cellXml(
  ref: string,
  [value, style]: readonly [Value | null, number?],
): string {
  if (value === null) return `<c r="${ref}"${style ? ` s="${style}"` : ''}/>`;
  return fixtureCell(ref, value, style);
}

/** One case per column, its cells from row 2 down (row 1 names it). */
function columnSheet(
  name: string,
  cases: readonly Case[],
  extra = '',
): XlsxFixtureSheet {
  const rows = new Map<number, string[]>();
  const put = (r: number, xml: string) => {
    const list = rows.get(r) ?? [];
    list.push(xml);
    rows.set(r, list);
  };
  cases.forEach((c, i) =>
    c.cells.forEach((cell, k) =>
      put(2 + k, cellXml(`${ogeColumnName(i)}${2 + k}`, cell)),
    ),
  );
  const data = [...rows.keys()]
    .sort((a, b) => a - b)
    .map((r) => `<row r="${r}">${rows.get(r)?.join('')}</row>`)
    .join('');
  return {
    name,
    xml: `<cols><col min="1" max="${cases.length}" width="3" customWidth="1"/></cols><sheetData>${data}</sheetData>${extra}`,
  };
}

/** One case per row, its cells from column B right; rows start 30 pt tall. */
function rowSheet(name: string, cases: readonly Case[]): XlsxFixtureSheet {
  const data = cases
    .map(
      (c, i) =>
        `<row r="${i + 1}" ht="30" customHeight="1">${c.cells
          .map((cell, k) => cellXml(`${ogeColumnName(1 + k)}${i + 1}`, cell))
          .join('')}</row>`,
    )
    .join('');
  return {
    name,
    xml: `<cols><col min="2" max="3" width="12" customWidth="1"/></cols><sheetData>${data}</sheetData>`,
  };
}

/** Cases that need more than their own column: a merge, a hidden row's text. */
function extrasSheet(): XlsxFixtureSheet {
  return {
    name: 'ColsExtras',
    // A: merged with B (AutoFit leaves merged cells out); C: a long text in a hidden row
    xml:
      '<cols><col min="1" max="3" width="5" customWidth="1"/></cols><sheetData>' +
      `<row r="2">${fixtureCell('A2', 'merged cell text that is long')}${fixtureCell('C2', 'short')}</row>` +
      `<row r="4" hidden="1">${fixtureCell('C4', 'a very long hidden text indeed')}</row>` +
      '</sheetData><mergeCells count="1"><mergeCell ref="A2:B2"/></mergeCells>',
  };
}

/** The cases of each sheet, in order, for the spec (`autofit.cases.json`). */
export const AUTOFIT_CASES: Readonly<Record<string, readonly string[]>> = {
  Cols: COLUMN_CASES.map((c) => c.name),
  ColsRepeat: REPEATS.map((c) => c.name),
  ColsAngles: ANGLES.map((c) => c.name),
  ColsSizes: SIZES.map((c) => c.name),
  ColsExtras: ['merged', 'merged (second column)', 'hidden row'],
  Rows: ROW_CASES.map((c) => c.name),
  RowsAngles: ANGLES.map((c) => c.name),
  RowsSizes: SIZES.map((c) => c.name),
};

export function autofitWorkbook(): Uint8Array {
  const sheets: XlsxFixtureSheet[] = [
    columnSheet('Cols', COLUMN_CASES),
    columnSheet('ColsRepeat', REPEATS),
    columnSheet('ColsAngles', ANGLES),
    columnSheet('ColsSizes', SIZES),
    extrasSheet(),
    rowSheet('Rows', ROW_CASES),
    rowSheet('RowsAngles', ANGLES),
    rowSheet('RowsSizes', SIZES),
  ];
  return buildXlsxFixture({
    theme: true,
    styles: corpusStyleSheet(XFS),
    sheets,
  });
}
