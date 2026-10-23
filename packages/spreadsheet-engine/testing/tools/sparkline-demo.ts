/**
 * The docs' "Sparklines" sample: monthly sales by region, each row with a
 * trend line (its high and low months marked) and its months as columns,
 * a totals row with a marked line, and the month-over-month growth as
 * win/loss bars and as columns around an axis — in Excel's sparkline
 * styles. The sparklines sit beside the names, frozen, with the months to
 * their right. Built from raw SpreadsheetML; `save-demo.ps1` has Excel open
 * and save it into apps/dev-app/public/demo/spreadsheet/sparklines.xlsx,
 * so the sample is Excel-written. Corpus tooling only.
 *
 *   node <bundle of this file> <out.xlsx>
 */
import { writeFileSync } from 'node:fs';
import { ogeColumnName } from '../../src/lib/address/address';
import {
  buildXlsxFixture,
  fixtureCell,
  type XlsxFixtureSheet,
} from '../../src/testing/xlsx-fixture';
import { corpusStyleSheet } from './style-sheet';

const out = process.argv[2];
if (!out) throw new Error('usage: sparkline-demo <out.xlsx>');

const font = (extra: string, size = 11, color = '<color theme="1"/>') =>
  `${extra}<sz val="${size}"/>${color}<name val="Calibri"/><family val="2"/><scheme val="minor"/>`;
const rule = (side: 'top' | 'bottom') =>
  `><left/><right/>${side === 'top' ? '<top style="thin"><color theme="4"/></top><bottom/>' : '<top/><bottom style="thin"><color theme="4"/></bottom>'}<diagonal/>`;

// cell formats: 1 title, 2 note, 3 header, 4 header (centred), 5 whole
// numbers, 6 total label, 7 total numbers, 8 percent
const styles = corpusStyleSheet([
  { font: font('<b/>', 15, '<color theme="3"/>') },
  {
    font: font('<i/>', 10, '<color theme="1" tint="0.499984740745262"/>'),
  },
  { font: font('<b/>'), border: rule('bottom') },
  {
    font: font('<b/>'),
    border: rule('bottom'),
    alignment: 'horizontal="center"',
  },
  { numFmt: '#,##0' },
  { font: font('<b/>'), border: rule('top') },
  { numFmt: '#,##0', font: font('<b/>'), border: rule('top') },
  { numFmt: '0.0%' },
]);
const [TITLE, NOTE, HEADER, CENTRED, WHOLE, TOTAL, TOTAL_WHOLE, PERCENT] = [
  1, 2, 3, 4, 5, 6, 7, 8,
];

/** A small deterministic sequence, so the sample never changes by itself. */
let seed = 11;
const next = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const REGIONS: readonly (readonly [string, number, number])[] = [
  // name, base, how strongly the season swings it
  ['North', 4200, 0.3],
  ['South', 5600, 0.12],
  ['East', 3100, 0.45],
  ['West', 4800, -0.2],
  ['Central', 2600, 0.05],
];
const sales = REGIONS.map(([, base, swing], r) =>
  MONTHS.map((_, m) =>
    Math.round(
      base *
        (1 + swing * Math.sin(((m - 2) / 12) * 2 * Math.PI)) *
        (1 + 0.02 * m * (r % 2 ? -1 : 1)) *
        (0.88 + 0.24 * next()),
    ),
  ),
);
const totals = MONTHS.map((_, m) =>
  sales.reduce((sum, row) => sum + row[m], 0),
);

// columns: the name, the two sparklines, then the months
const [NAME, TREND, BARS, FIRST_MONTH] = [0, 1, 2, 3];
const [FIRST_ROW, LAST_ROW] = [3, 3 + REGIONS.length - 1];
const TOTAL_ROW = LAST_ROW + 1;

const ref = (row: number, col: number) => `${ogeColumnName(col)}${row + 1}`;
const text = (row: number, col: number, value: string, style?: number) =>
  fixtureCell(ref(row, col), value, style);
const formula = (
  row: number,
  col: number,
  f: string,
  value: number,
  style: number,
) => `<c r="${ref(row, col)}" s="${style}"><f>${f}</f><v>${value}</v></c>`;

/** A group's colours as Excel writes them: `[part, theme slot, tint?]`, the axis black. */
type Colors = readonly (readonly [string, number, number?])[];
const colors = (list: Colors) =>
  ['Series', 'Negative', 'Axis', 'Markers', 'First', 'Last', 'High', 'Low']
    .map((part) => {
      const set = list.find(([name]) => name === part);
      if (part === 'Axis' && !set) return '<x14:colorAxis rgb="FF000000"/>';
      const [, slot, tint] = set ?? ['', 4];
      return `<x14:color${part} theme="${slot}"${tint ? ` tint="${tint}"` : ''}/>`;
    })
    .join('');
const group = (
  attrs: string,
  list: Colors,
  cells: readonly (readonly [string, string])[],
) =>
  `<x14:sparklineGroup displayEmptyCellsAs="gap" ${attrs}>${colors(list)}<x14:sparklines>${cells
    .map(
      ([data, at]) =>
        `<x14:sparkline><xm:f>${data}</xm:f><xm:sqref>${at}</xm:sqref></x14:sparkline>`,
    )
    .join('')}</x14:sparklines></x14:sparklineGroup>`;
const extension = (groups: string) =>
  '<extLst><ext uri="{05C60535-1F16-4fd2-B633-F4F36F0B64E0}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main">' +
  `<x14:sparklineGroups xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main">${groups}</x14:sparklineGroups></ext></extLst>`;

/** Excel's "darker 50%" and "lighter 40%" tints. */
const DARK = -0.499984740745262;
const LIGHT = 0.39997558519241921;
const PLAIN: Colors = [
  ['Markers', 4, DARK],
  ['First', 4, LIGHT],
  ['Last', 4, LIGHT],
  ['High', 4],
  ['Low', 4],
  ['Negative', 5],
];
const colorsOf = (own: Colors): Colors => [
  ...own,
  ...PLAIN.filter(([part]) => !own.some(([name]) => name === part)),
];

const cols =
  '<cols><col min="1" max="1" width="11" customWidth="1"/><col min="2" max="3" width="16" customWidth="1"/>' +
  '<col min="4" max="15" width="7.5" customWidth="1"/></cols>';
// the names and the sparklines stay while the months scroll
const view =
  '<sheetViews><sheetView workbookViewId="0"><pane xSplit="3" ySplit="3" topLeftCell="D4" activePane="bottomRight" state="frozen"/>' +
  '<selection pane="topRight" activeCell="D1" sqref="D1"/><selection pane="bottomLeft" activeCell="A4" sqref="A4"/>' +
  '<selection pane="bottomRight" activeCell="D4" sqref="D4"/></sheetView></sheetViews>';
const header = (
  row: number,
  trend: string,
  bars: string,
  months: readonly string[],
) =>
  `<row r="${row + 1}">${text(row, NAME, 'Region', HEADER)}${text(row, TREND, trend, CENTRED)}${text(row, BARS, bars, CENTRED)}${months
    .map((m, i) => text(row, FIRST_MONTH + i, m, CENTRED))
    .join('')}</row>`;
const tall = (row: number, cells: string) =>
  `<row r="${row + 1}" ht="27" customHeight="1">${cells}</row>`;
const title = (heading: string, note: string) =>
  `<row r="1" ht="21" customHeight="1">${text(0, NAME, heading, TITLE)}</row>` +
  `<row r="2">${text(1, NAME, note, NOTE)}</row>`;

function salesSheet(): XlsxFixtureSheet {
  const rows = [
    title(
      'Monthly sales by region, 2025',
      'Units sold. Each trend marks the region’s best month in green and its weakest in orange.',
    ),
    header(2, 'Trend', 'By month', MONTHS),
    ...REGIONS.map(([name], r) =>
      tall(
        FIRST_ROW + r,
        text(FIRST_ROW + r, NAME, name) +
          sales[r]
            .map((v, m) =>
              fixtureCell(ref(FIRST_ROW + r, FIRST_MONTH + m), v, WHOLE),
            )
            .join(''),
      ),
    ),
    tall(
      TOTAL_ROW,
      text(TOTAL_ROW, NAME, 'Total', TOTAL) +
        `<c r="${ref(TOTAL_ROW, TREND)}" s="${TOTAL}"/><c r="${ref(TOTAL_ROW, BARS)}" s="${TOTAL}"/>` +
        totals
          .map((v, m) =>
            formula(
              TOTAL_ROW,
              FIRST_MONTH + m,
              `SUM(${ref(FIRST_ROW, FIRST_MONTH + m)}:${ref(LAST_ROW, FIRST_MONTH + m)})`,
              v,
              TOTAL_WHOLE,
            ),
          )
          .join(''),
    ),
  ];
  const span = (row: number) =>
    `Sales!${ref(row, FIRST_MONTH)}:${ref(row, FIRST_MONTH + 11)}`;
  const each = (col: number) =>
    REGIONS.map(
      (_, r) => [span(FIRST_ROW + r), ref(FIRST_ROW + r, col)] as const,
    );
  const total = (col: number) =>
    [[span(TOTAL_ROW), ref(TOTAL_ROW, col)]] as const;
  return {
    name: 'Sales',
    xml:
      view +
      cols +
      `<sheetData>${rows.join('')}</sheetData>` +
      extension(
        group(
          'high="1" low="1" lineWeight="1.25"',
          colorsOf([
            ['Series', 4, DARK],
            ['High', 9],
            ['Low', 5],
          ]),
          each(TREND),
        ) +
          group(
            'type="column" high="1"',
            colorsOf([
              ['Series', 8],
              ['High', 4, DARK],
            ]),
            each(BARS),
          ) +
          group(
            'markers="1" lineWeight="1.5"',
            colorsOf([
              ['Series', 3],
              ['Markers', 4],
            ]),
            total(TREND),
          ) +
          group(
            'type="column" high="1"',
            colorsOf([
              ['Series', 3, LIGHT],
              ['High', 3],
            ]),
            total(BARS),
          ),
      ),
  };
}

function growthSheet(): XlsxFixtureSheet {
  // January has no month before it: the growth starts in February
  const growth = sales.map((row) => row.slice(1).map((v, m) => v / row[m] - 1));
  const rows = [
    title(
      'Month-over-month growth',
      'Each month against the one before: win/loss shows the direction, the columns how far.',
    ),
    header(2, 'Up or down', 'Change', MONTHS.slice(1)),
    ...REGIONS.map(([name], r) =>
      tall(
        FIRST_ROW + r,
        text(FIRST_ROW + r, NAME, name) +
          growth[r]
            .map((v, m) => {
              const row = FIRST_ROW + r;
              // this month's sales over the month before's, on the Sales sheet
              const f = `Sales!${ref(row, FIRST_MONTH + m + 1)}/Sales!${ref(row, FIRST_MONTH + m)}-1`;
              return formula(row, FIRST_MONTH + m, f, v, PERCENT);
            })
            .join(''),
      ),
    ),
  ];
  const span = (row: number) =>
    `Growth!${ref(row, FIRST_MONTH)}:${ref(row, FIRST_MONTH + 10)}`;
  const each = (col: number) =>
    REGIONS.map(
      (_, r) => [span(FIRST_ROW + r), ref(FIRST_ROW + r, col)] as const,
    );
  return {
    name: 'Growth',
    xml:
      view +
      cols +
      `<sheetData>${rows.join('')}</sheetData>` +
      extension(
        group(
          'type="stacked" negative="1"',
          colorsOf([
            ['Series', 9],
            ['Negative', 5],
          ]),
          each(TREND),
        ) +
          group(
            'type="column" negative="1" displayXAxis="1"',
            colorsOf([
              ['Series', 4],
              ['Negative', 5],
            ]),
            each(BARS),
          ),
      ),
  };
}

writeFileSync(
  out,
  buildXlsxFixture({
    theme: true,
    styles,
    sheets: [salesSheet(), growthSheet()],
  }),
);
console.log(`sparkline demo written to ${out}`);
