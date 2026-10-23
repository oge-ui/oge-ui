/**
 * The docs' "Tables" sample: Excel tables in built-in styles over everyday
 * data — sales with a totals row, an inventory, teams, and a gallery of
 * styles. Built from raw SpreadsheetML; `table-demo.ps1` has Excel open and
 * save it into apps/dev-app/public/demo/spreadsheet/tables.xlsx, so the
 * sample is Excel-written. Corpus tooling only.
 *
 *   node <bundle of this file> <out.xlsx>
 */
import { writeFileSync } from 'node:fs';
import { ogeColumnName } from '../../src/lib/address/address';
import {
  buildXlsxFixture,
  fixtureCell,
  type XlsxFixturePart,
  type XlsxFixtureSheet,
  type XlsxFixtureValue,
} from '../../src/testing/xlsx-fixture';
import { corpusStyleSheet } from './style-sheet';

const out = process.argv[2];
if (!out) throw new Error('usage: table-demo <out.xlsx>');

// cell formats: 1 whole numbers, 2 money
const styles = corpusStyleSheet([{ numFmt: '#,##0' }, { numFmt: '#,##0.00' }]);
const WHOLE = 1;
const MONEY = 2;

interface Demo {
  readonly name: string;
  readonly style: string;
  readonly top: number;
  readonly left: number;
  readonly header: readonly string[];
  readonly rows: readonly (readonly XlsxFixtureValue[])[];
  /** Each column's cell format. */
  readonly formats?: readonly (number | undefined)[];
  /** Columns the totals row sums (the first column says "Total"). */
  readonly sums?: readonly number[];
  readonly first?: boolean;
  readonly columnStripes?: boolean;
  readonly filter?: boolean;
}

/** A small deterministic sequence, so the sample never changes by itself. */
let seed = 7;
const next = (low: number, high: number) => {
  seed = (seed * 9301 + 49297) % 233280;
  return Math.round(low + (seed / 233280) * (high - low));
};

const ref = (row: number, col: number) => `${ogeColumnName(col)}${row + 1}`;

function sheetOf(
  name: string,
  demos: readonly Demo[],
  widths: readonly number[],
  firstId: number,
): { sheet: XlsxFixtureSheet; parts: XlsxFixturePart[] } {
  const rows = new Map<number, string[]>();
  const put = (row: number, xml: string) => {
    const list = rows.get(row);
    if (list) list.push(xml);
    else rows.set(row, [xml]);
  };
  const parts: XlsxFixturePart[] = [];
  demos.forEach((demo, k) => {
    const { top, left, header } = demo;
    header.forEach((text, c) =>
      put(top, fixtureCell(ref(top, left + c), text)),
    );
    demo.rows.forEach((values, r) =>
      values.forEach((value, c) =>
        put(
          top + 1 + r,
          fixtureCell(ref(top + 1 + r, left + c), value, demo.formats?.[c]),
        ),
      ),
    );
    const totals = demo.sums !== undefined;
    const bottom = top + demo.rows.length + (totals ? 1 : 0);
    if (totals) {
      put(bottom, fixtureCell(ref(bottom, left), 'Total'));
      for (const c of demo.sums ?? []) {
        const sum = demo.rows.reduce((s, row) => s + Number(row[c]), 0);
        const format = demo.formats?.[c];
        put(
          bottom,
          `<c r="${ref(bottom, left + c)}"${format ? ` s="${format}"` : ''}><f>SUBTOTAL(109,${demo.name}[${header[c]}])</f><v>${sum}</v></c>`,
        );
      }
    }
    const id = firstId + k;
    const right = left + header.length - 1;
    parts.push({
      path: `xl/tables/table${id}.xml`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml',
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        `<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${id}" name="${demo.name}" displayName="${demo.name}" ref="${ref(top, left)}:${ref(bottom, right)}"${totals ? ' totalsRowCount="1"' : ''}>` +
        (demo.filter === false
          ? ''
          : `<autoFilter ref="${ref(top, left)}:${ref(bottom - (totals ? 1 : 0), right)}"/>`) +
        `<tableColumns count="${header.length}">${header
          .map(
            (text, c) =>
              `<tableColumn id="${c + 1}" name="${text}"${totals && c === 0 ? ' totalsRowLabel="Total"' : ''}${demo.sums?.includes(c) ? ' totalsRowFunction="sum"' : ''}/>`,
          )
          .join('')}</tableColumns>` +
        `<tableStyleInfo name="${demo.style}" showFirstColumn="${demo.first ? 1 : 0}" showLastColumn="0" showRowStripes="1" showColumnStripes="${demo.columnStripes ? 1 : 0}"/>` +
        '</table>',
    });
  });
  const sheetData = [...rows.keys()]
    .sort((a, b) => a - b)
    .map((row) => `<row r="${row + 1}">${(rows.get(row) ?? []).join('')}</row>`)
    .join('');
  const cols = `<cols>${widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`;
  return {
    sheet: {
      name,
      xml: `${cols}<sheetData>${sheetData}</sheetData><tableParts count="${demos.length}">${demos.map((_, k) => `<tablePart r:id="rId${k + 1}"/>`).join('')}</tableParts>`,
      rels: demos.map((_, k) => ({
        id: `rId${k + 1}`,
        type: 'table',
        target: `../tables/table${firstId + k}.xml`,
      })),
    },
    parts,
  };
}

const regions = ['North', 'South', 'East', 'West'];
const products = ['Laptops', 'Monitors', 'Docks'];
const sales: Demo = {
  name: 'Sales',
  style: 'TableStyleMedium2',
  top: 1,
  left: 1,
  header: ['Region', 'Product', 'Q1', 'Q2', 'Q3', 'Q4'],
  rows: regions.flatMap((region) =>
    products.map((product) => [
      region,
      product,
      next(8, 40) * 250,
      next(8, 40) * 250,
      next(8, 40) * 250,
      next(8, 40) * 250,
    ]),
  ),
  formats: [undefined, undefined, WHOLE, WHOLE, WHOLE, WHOLE],
  sums: [2, 3, 4, 5],
};

const items = [
  ['Laptop 14"', 'Computers', 899],
  ['Laptop 16"', 'Computers', 1249],
  ['Monitor 24"', 'Displays', 189],
  ['Monitor 27"', 'Displays', 279],
  ['USB-C dock', 'Accessories', 149],
  ['Keyboard', 'Accessories', 59],
  ['Mouse', 'Accessories', 29],
  ['Headset', 'Audio', 89],
  ['Webcam', 'Video', 79],
  ['Desk lamp', 'Office', 39],
] as const;
const inventory: Demo = {
  name: 'Inventory',
  style: 'TableStyleLight9',
  top: 1,
  left: 1,
  header: ['SKU', 'Item', 'Category', 'In stock', 'Reorder at', 'Unit price'],
  rows: items.map(([item, category, price], i) => [
    `SKU-${1001 + i * 7}`,
    item,
    category,
    next(0, 120),
    next(10, 30),
    price,
  ]),
  formats: [undefined, undefined, undefined, WHOLE, WHOLE, MONEY],
  first: true,
};

const teams: Demo = {
  name: 'Teams',
  style: 'TableStyleMedium7',
  top: 1,
  left: 1,
  header: ['Team', 'Lead', 'Members', 'Open', 'Done'],
  rows: [
    ['Platform', 'Ada', 6, 14, 52],
    ['Mobile', 'Grace', 4, 9, 31],
    ['Data', 'Edsger', 5, 7, 44],
    ['Design', 'Margaret', 3, 5, 27],
    ['Support', 'Alan', 8, 21, 96],
  ],
  formats: [undefined, undefined, WHOLE, WHOLE, WHOLE],
  sums: [2, 3, 4],
  first: true,
};

const GALLERY = [
  'TableStyleLight1',
  'TableStyleLight9',
  'TableStyleLight15',
  'TableStyleLight18',
  'TableStyleMedium2',
  'TableStyleMedium4',
  'TableStyleMedium9',
  'TableStyleMedium14',
  'TableStyleMedium17',
  'TableStyleDark1',
  'TableStyleDark8',
  'TableStyleDark10',
];
const gallery: Demo[] = GALLERY.map((style, i) => ({
  name: style.replace('TableStyle', ''),
  style,
  top: 1 + Math.floor(i / 3) * 7,
  left: 1 + (i % 3) * 4,
  header: ['Month', 'Plan', 'Actual'],
  rows: ['Jan', 'Feb', 'Mar', 'Apr'].map((month) => [
    month,
    next(40, 90) * 10,
    next(40, 90) * 10,
  ]),
  formats: [undefined, WHOLE, WHOLE],
  first: i % 2 === 0,
  columnStripes: i % 4 === 3,
  filter: false,
}));

const built = [
  sheetOf('Sales', [sales], [3, 12, 12, 10, 10, 10, 10], 1),
  sheetOf('Inventory', [inventory], [3, 12, 14, 14, 10, 12, 12], 2),
  sheetOf('Teams', [teams], [3, 14, 12, 11, 9, 9], 3),
  sheetOf('Styles', gallery, [3, 10, 9, 9, 3, 10, 9, 9, 3, 10, 9, 9], 4),
];
writeFileSync(
  out,
  buildXlsxFixture({
    theme: true,
    styles,
    sheets: built.map((b) => b.sheet),
    extraParts: built.flatMap((b) => b.parts),
  }),
);
console.log(`table demo written to ${out}`);
