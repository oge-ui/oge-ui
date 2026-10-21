/**
 * Source workbooks of the golden corpus. Each is built from raw
 * SpreadsheetML here, opened in Excel by `capture.ps1`, measured there and
 * saved again by Excel — so the committed corpus files are Excel-written and
 * every expectation is what Excel showed. Run through `run.mjs`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { crc32 as zlibCrc32, deflateSync } from 'node:zlib';
import { join } from 'node:path';
import { ogeColumnName } from '../../src/lib/address/address';
import { ogePixelsToColumnWidth } from '../../src/lib/metrics/sheet-metrics';
import {
  buildXlsxFixture,
  fixtureCell,
  type XlsxFixtureValue,
} from '../../src/testing/xlsx-fixture';
import { NUMBER_FORMAT_CASES } from './number-format-cases';
import { box, corpusStyleSheet, solid, type CorpusXf } from './style-sheet';

const out = process.argv[2];
if (!out) throw new Error('usage: corpus-sources <out-dir>');
mkdirSync(join(out, 'numfmt'), { recursive: true });

const write = (name: string, data: Uint8Array | string) =>
  writeFileSync(join(out, name), data);

/** Cells in one row from `[col, value, style]` triples. */
const row = (
  r: number,
  cells: readonly (readonly [number, XlsxFixtureValue, number?])[],
  attributes = '',
) =>
  `<row r="${r}"${attributes}>${cells.map(([c, v, s]) => fixtureCell(`${ogeColumnName(c)}${r}`, v, s)).join('')}</row>`;

const cols = (
  widths: readonly (readonly [
    first: number,
    last: number,
    attributes: string,
  ])[],
) =>
  `<cols>${widths.map(([a, b, attrs]) => `<col min="${a + 1}" max="${b + 1}" ${attrs}/>`).join('')}</cols>`;

// ── 1. number formats: one workbook per case, so a code Excel refuses spoils only itself ──
NUMBER_FORMAT_CASES.forEach(([format, value], i) => {
  const xf: CorpusXf = { numFmt: format };
  write(
    `numfmt/${i}.xlsx`,
    buildXlsxFixture({
      styles: corpusStyleSheet([xf]),
      sheets: [
        {
          name: 'F',
          xml: `${cols([[0, 0, 'width="120" customWidth="1"']])}<sheetData>${row(1, [[0, value, 1]])}</sheetData>`,
        },
      ],
    }),
  );
});
write('numfmt/cases.json', JSON.stringify(NUMBER_FORMAT_CASES));

// ── 2. General and fixed formats in every width from 10 to 110 px ──
export const FIT_VALUES = [
  -1234567.891,
  1234567.891,
  -0.001234,
  0.001234,
  0.5,
  -0.5,
  123456789,
  3.14159265358979,
  1e8,
  -1e8,
  12.5,
  -12.5,
  0.000123456789,
  1234.5678,
  -98.7654321,
  5,
  -5,
  1234567890,
  0.1,
  -0.1,
  1 / 3,
  2e-5,
  123.456,
  98765.4321,
  1e100,
  -1e-100,
  42,
  1e10,
  -1e10,
  0.000999,
  0.0005,
  999.9999,
  9.99999999,
  45296.5,
];
export const FIT_FORMATS: readonly (string | number)[] = [
  0,
  '0.00',
  '#,##0',
  14,
  '0%',
  '0.00E+00',
  49,
  '$#,##0.00',
  44,
  'mmmm d, yyyy',
  'h:mm:ss',
];
{
  const widths: number[] = [];
  for (let px = 10; px <= 110; px++) widths.push(px);
  const columnXml = cols(
    widths.map(
      (px, c) =>
        [
          c,
          c,
          `width="${ogePixelsToColumnWidth(px)}" customWidth="1"`,
        ] as const,
    ),
  );
  const xfs = FIT_FORMATS.map((numFmt): CorpusXf => ({ numFmt }));
  write(
    'fit.xlsx',
    buildXlsxFixture({
      styles: corpusStyleSheet(xfs),
      sheets: FIT_FORMATS.map((_, f) => ({
        name: `F${f}`,
        xml: `${columnXml}<sheetData>${FIT_VALUES.map((v, r) =>
          row(
            r + 1,
            widths.map((_, c) => [c, v, f + 1] as const),
          ),
        ).join('')}</sheetData>`,
      })),
    }),
  );
  write(
    'fit.json',
    JSON.stringify({ values: FIT_VALUES, formats: FIT_FORMATS, widths }),
  );
}

// ── 3. border precedence between neighbours ──
export const BORDER_STYLES = [
  'hair',
  'thin',
  'dotted',
  'dashed',
  'dashDot',
  'dashDotDot',
  'medium',
  'mediumDashed',
  'mediumDashDot',
  'mediumDashDotDot',
  'slantDashDot',
  'thick',
  'double',
];
{
  const xfs: CorpusXf[] = [];
  const id = new Map<string, number>();
  const edge = (side: string, style: string, rgb: string) => {
    const edges = ['left', 'right', 'top', 'bottom']
      .map((name) =>
        name === side
          ? `<${name} style="${style}"><color rgb="FF${rgb}"/></${name}>`
          : `<${name}/>`,
      )
      .join('');
    return `>${edges}<diagonal/>`;
  };
  for (const style of BORDER_STYLES) {
    for (const [key, side, rgb] of [
      ['R', 'right', 'FF0000'],
      ['L', 'left', '0000FF'],
      ['B', 'bottom', 'FF0000'],
      ['T', 'top', '0000FF'],
    ] as const) {
      xfs.push({ border: edge(side, style, rgb) });
      id.set(`${key}${style}`, xfs.length);
    }
  }
  const pairs = BORDER_STYLES.flatMap((a) =>
    BORDER_STYLES.map((b) => [a, b] as const),
  );
  const h = pairs
    .map(([a, b], i) =>
      row(2 * i + 1, [
        [1, 1, id.get(`R${a}`)],
        [2, 2, id.get(`L${b}`)],
      ]),
    )
    .join('');
  const v = pairs
    .map(
      ([a, b], i) =>
        row(3 * i + 1, [[1, 1, id.get(`B${a}`)]]) +
        row(3 * i + 2, [[1, 2, id.get(`T${b}`)]]),
    )
    .join('');
  write(
    'borders.xlsx',
    buildXlsxFixture({
      styles: corpusStyleSheet(xfs),
      sheets: [
        { name: 'H', xml: `<sheetData>${h}</sheetData>` },
        { name: 'V', xml: `<sheetData>${v}</sheetData>` },
      ],
    }),
  );
  write('borders.json', JSON.stringify({ styles: BORDER_STYLES, pairs }));
}

// ── 4. metrics: a workbook whose Normal style the capture changes ──
write(
  'metrics.xlsx',
  buildXlsxFixture({
    styles: corpusStyleSheet([]),
    sheets: [{ name: 'N', xml: `<sheetData>${row(1, [[0, 1]])}</sheetData>` }],
  }),
);
export const METRIC_FONTS = [
  'Calibri',
  'Calibri Light',
  'Aptos Narrow',
  'Aptos',
  'Aptos Display',
  'Arial',
  'Arial Narrow',
  'Cambria',
  'Times New Roman',
  'Segoe UI',
  'Tahoma',
  'Verdana',
  'Consolas',
  'Courier New',
  'Georgia',
  'Garamond',
  'Century Gothic',
  'Trebuchet MS',
  'Book Antiqua',
  'Lucida Console',
  'Candara',
  'Corbel',
  'Constantia',
  'Franklin Gothic Medium',
  'Helvetica',
  'MS Sans Serif',
];
write('metrics.json', JSON.stringify({ fonts: METRIC_FONTS }));
{
  // wrapped text: n lines in a few fonts, no stored heights
  const fonts: [string, number][] = [
    ['Calibri', 11],
    ['Calibri', 14],
    ['Arial', 10],
    ['Times New Roman', 12],
    ['Calibri', 8],
  ];
  const xfs = fonts.map(([name, size]): CorpusXf => ({
    font: `<sz val="${size}"/><name val="${name}"/>`,
    alignment: 'wrapText="1"',
  }));
  let r = 0;
  const rows: string[] = [];
  fonts.forEach((_, f) => {
    for (let lines = 1; lines <= 6; lines++) {
      r++;
      rows.push(
        row(r, [
          [
            0,
            Array.from({ length: lines }, (_, i) => `L${i + 1}`).join('\n'),
            f + 1,
          ],
        ]),
      );
    }
  });
  write(
    'wrap.xlsx',
    buildXlsxFixture({
      styles: corpusStyleSheet(xfs),
      sheets: [
        {
          name: 'W',
          xml: `${cols([[0, 0, 'width="30" customWidth="1"']])}<sheetData>${rows.join('')}</sheetData>`,
        },
      ],
    }),
  );
  write('wrap.json', JSON.stringify({ fonts }));
}

// ── 5. the corpus workbooks ──

/** styles.xlsx: fonts, fills, borders, alignment, sizes, number formats. */
{
  const xfs: CorpusXf[] = [];
  const add = (xf: CorpusXf) => {
    xfs.push(xf);
    return xfs.length;
  };
  // Fonts
  const fontRows: [string, number][] = [
    ['Bold', add({ font: '<b/><sz val="11"/><name val="Calibri"/>' })],
    ['Italic', add({ font: '<i/><sz val="11"/><name val="Calibri"/>' })],
    [
      'Bold italic',
      add({ font: '<b/><i/><sz val="11"/><name val="Calibri"/>' }),
    ],
    ['Underline', add({ font: '<u/><sz val="11"/><name val="Calibri"/>' })],
    [
      'Double underline',
      add({ font: '<u val="double"/><sz val="11"/><name val="Calibri"/>' }),
    ],
    [
      'Accounting underline',
      add({
        font: '<u val="singleAccounting"/><sz val="11"/><name val="Calibri"/>',
      }),
    ],
    [
      'Strikethrough',
      add({ font: '<strike/><sz val="11"/><name val="Calibri"/>' }),
    ],
    [
      'Superscript',
      add({
        font: '<vertAlign val="superscript"/><sz val="11"/><name val="Calibri"/>',
      }),
    ],
    ['Size 8', add({ font: '<sz val="8"/><name val="Calibri"/>' })],
    ['Size 14', add({ font: '<sz val="14"/><name val="Calibri"/>' })],
    ['Size 18', add({ font: '<sz val="18"/><name val="Calibri"/>' })],
    ['Size 26', add({ font: '<sz val="26"/><name val="Calibri"/>' })],
    [
      'Red text',
      add({
        font: '<sz val="11"/><color rgb="FFFF0000"/><name val="Calibri"/>',
      }),
    ],
    [
      'Accent 1',
      add({ font: '<sz val="11"/><color theme="4"/><name val="Calibri"/>' }),
    ],
    [
      'Accent 1 lighter 40%',
      add({
        font: '<sz val="11"/><color theme="4" tint="0.39997558519241921"/><name val="Calibri"/>',
      }),
    ],
    [
      'Accent 2 darker 25%',
      add({
        font: '<sz val="11"/><color theme="5" tint="-0.249977111117893"/><name val="Calibri"/>',
      }),
    ],
    [
      'Indexed 10',
      add({ font: '<sz val="11"/><color indexed="10"/><name val="Calibri"/>' }),
    ],
    ['Arial', add({ font: '<sz val="11"/><name val="Arial"/>' })],
    [
      'Times New Roman',
      add({ font: '<sz val="11"/><name val="Times New Roman"/>' }),
    ],
    ['Cambria', add({ font: '<sz val="11"/><name val="Cambria"/>' })],
    ['Consolas', add({ font: '<sz val="11"/><name val="Consolas"/>' })],
  ];
  // Fills
  const patterns = [
    'solid',
    'mediumGray',
    'darkGray',
    'lightGray',
    'darkHorizontal',
    'darkVertical',
    'darkDown',
    'darkUp',
    'darkGrid',
    'darkTrellis',
    'lightHorizontal',
    'lightVertical',
    'lightDown',
    'lightUp',
    'lightGrid',
    'lightTrellis',
    'gray125',
    'gray0625',
  ];
  const fillRows: [string, number][] = [
    ['Solid yellow', add({ fill: solid('FFFF00') })],
    [
      'Theme accent 6 lighter 60%',
      add({
        fill: '<patternFill patternType="solid"><fgColor theme="9" tint="0.59999389629810485"/><bgColor indexed="64"/></patternFill>',
      }),
    ],
    [
      'Indexed 22',
      add({
        fill: '<patternFill patternType="solid"><fgColor indexed="22"/><bgColor indexed="64"/></patternFill>',
      }),
    ],
    ...patterns.map((p): [string, number] => [
      p,
      add({
        fill: `<patternFill patternType="${p}"><fgColor rgb="FF4472C4"/><bgColor rgb="FFFFF2CC"/></patternFill>`,
      }),
    ]),
    [
      'Linear 0',
      add({
        fill: '<gradientFill degree="0"><stop position="0"><color rgb="FFFFFFFF"/></stop><stop position="1"><color rgb="FF4472C4"/></stop></gradientFill>',
      }),
    ],
    [
      'Linear 90',
      add({
        fill: '<gradientFill degree="90"><stop position="0"><color rgb="FFFFFFFF"/></stop><stop position="1"><color rgb="FF4472C4"/></stop></gradientFill>',
      }),
    ],
    [
      'Linear 45 three stops',
      add({
        fill: '<gradientFill degree="45"><stop position="0"><color rgb="FFFF0000"/></stop><stop position="0.5"><color rgb="FFFFFFFF"/></stop><stop position="1"><color rgb="FF0000FF"/></stop></gradientFill>',
      }),
    ],
    [
      'Path',
      add({
        fill: '<gradientFill type="path" left="0.5" right="0.5" top="0.5" bottom="0.5"><stop position="0"><color rgb="FFFFFFFF"/></stop><stop position="1"><color rgb="FF70AD47"/></stop></gradientFill>',
      }),
    ],
  ];
  // Borders
  const borderRows: [string, number][] = [
    ...BORDER_STYLES.map((s): [string, number] => [s, add({ border: box(s) })]),
    ['Red thick', add({ border: box('thick', 'FF0000') })],
    [
      'Diagonal up',
      add({
        border:
          ' diagonalUp="1"><left/><right/><top/><bottom/><diagonal style="thin"><color rgb="FF000000"/></diagonal>',
      }),
    ],
    [
      'Diagonal down',
      add({
        border:
          ' diagonalDown="1"><left/><right/><top/><bottom/><diagonal style="medium"><color rgb="FFC00000"/></diagonal>',
      }),
    ],
    [
      'Diagonal both',
      add({
        border:
          ' diagonalUp="1" diagonalDown="1"><left/><right/><top/><bottom/><diagonal style="thin"><color rgb="FF000000"/></diagonal>',
      }),
    ],
  ];
  // Alignment
  const alignRows: [string, number][] = [
    ['left', add({ alignment: 'horizontal="left"' })],
    ['center', add({ alignment: 'horizontal="center"' })],
    ['right', add({ alignment: 'horizontal="right"' })],
    ['fill', add({ alignment: 'horizontal="fill"' })],
    ['justify', add({ alignment: 'horizontal="justify" vertical="top"' })],
    ['centerContinuous', add({ alignment: 'horizontal="centerContinuous"' })],
    ['distributed', add({ alignment: 'horizontal="distributed"' })],
    ['top', add({ alignment: 'vertical="top"' })],
    ['middle', add({ alignment: 'vertical="center"' })],
    ['wrap', add({ alignment: 'wrapText="1"' })],
    ['indent 2', add({ alignment: 'horizontal="left" indent="2"' })],
    ['right indent 1', add({ alignment: 'horizontal="right" indent="1"' })],
    ['rotate 45', add({ alignment: 'textRotation="45"' })],
    ['rotate 90', add({ alignment: 'textRotation="90"' })],
    ['rotate -45', add({ alignment: 'textRotation="135"' })],
    ['rotate -90', add({ alignment: 'textRotation="180"' })],
    ['stacked', add({ alignment: 'textRotation="255"' })],
    ['shrink', add({ alignment: 'shrinkToFit="1"' })],
  ];
  const mergeCenter = add({
    alignment: 'horizontal="center" vertical="center"',
    fill: solid('DDEBF7'),
    border: box('thin'),
  });
  const quote = add({ quotePrefix: true });
  // Number formats (wide column)
  const formatCodes: (string | number)[] = [
    0,
    1,
    2,
    3,
    4,
    9,
    10,
    11,
    14,
    22,
    44,
    49,
    '#,##0.00 "TL"',
    '[Red]0.00;[Blue]-0.00',
    '0.0%',
    'dd.mm.yyyy hh:mm',
    '[h]:mm:ss',
    '# ?/?',
  ];
  const formatRows = formatCodes.map(
    (code) => [code, add({ numFmt: code })] as const,
  );

  const styles = corpusStyleSheet(xfs);
  const sample = 'Sample 123';
  // a rich-text cell (shared string 0) closes the list
  const richRow = fontRows.length + 1;
  const sst =
    '<si><r><t xml:space="preserve">Plain </t></r><r><rPr><b/><sz val="11"/><color rgb="FFC00000"/><rFont val="Calibri"/><family val="2"/></rPr><t>bold red</t></r><r><rPr><i/><sz val="14"/><color theme="4"/><rFont val="Cambria"/></rPr><t xml:space="preserve"> big italic</t></r></si>';
  const fontsFinal =
    `${cols([
      [0, 0, 'width="26" customWidth="1"'],
      [1, 1, 'width="22" customWidth="1"'],
    ])}<sheetData>` +
    fontRows
      .map(([label, s], i) =>
        row(i + 1, [
          [0, label],
          [1, sample, s],
        ]),
      )
      .join('') +
    `<row r="${richRow}">${fixtureCell(`A${richRow}`, 'Rich text')}<c r="B${richRow}" t="s"><v>0</v></c></row></sheetData>`;

  const fillsXml = `${cols([
    [0, 0, 'width="26" customWidth="1"'],
    [1, 1, 'width="16" customWidth="1"'],
  ])}<sheetData>${fillRows
    .map(([label, s], i) =>
      row(
        2 * i + 1,
        [
          [0, label],
          [1, '', s],
        ],
        ' ht="24" customHeight="1"',
      ),
    )
    .join('')}</sheetData>`;
  const bordersXml = `${cols([
    [0, 0, 'width="22" customWidth="1"'],
    [1, 1, 'width="12" customWidth="1"'],
  ])}<sheetData>${borderRows
    .map(([label, s], i) =>
      row(2 * i + 2, [
        [0, label],
        [1, '', s],
      ]),
    )
    .join('')}</sheetData>`;
  const longText = 'The quick brown fox jumps over the lazy dog';
  const alignXml = `${cols([
    [0, 0, 'width="18" customWidth="1"'],
    [1, 1, 'width="14" customWidth="1"'],
  ])}<sheetData>${[
    ...alignRows.map(([label, s], i) =>
      row(
        i + 1,
        [
          [0, label],
          [
            1,
            label.startsWith('rotate') || label === 'stacked'
              ? 'Rotated'
              : label === 'fill'
                ? 'ab'
                : label === 'wrap' ||
                    label === 'justify' ||
                    label === 'distributed'
                  ? longText
                  : label === 'shrink'
                    ? longText
                    : 'Text',
            s,
          ],
        ],
        label.startsWith('rotate') ||
          label === 'stacked' ||
          label === 'wrap' ||
          label === 'justify' ||
          label === 'distributed' ||
          label === 'top' ||
          label === 'middle'
          ? ' ht="60" customHeight="1"'
          : '',
      ),
    ),
    // overflow: spill right, blocked by a value, spill left, spill both ways
    row(20, [[1, longText]]),
    row(21, [
      [1, longText],
      [3, 'blocker'],
    ]),
    row(22, [[4, longText, alignRows[2][1]]]),
    row(23, [[3, 'Centred text that spills both ways', alignRows[1][1]]]),
    row(24, [
      [1, 123456789012],
      [2, 0.000012345678],
      [3, 45296, formatRows.find(([c]) => c === 14)?.[1]],
    ]),
    row(26, [
      [1, 'Merged and centred', mergeCenter],
      [2, '', mergeCenter],
      [3, '', mergeCenter],
    ]),
    row(27, [
      [1, '', mergeCenter],
      [2, '', mergeCenter],
      [3, '', mergeCenter],
    ]),
    row(29, [
      [1, '00123', quote],
      [2, 'MARCH1'],
    ]),
  ].join(
    '',
  )}</sheetData><mergeCells count="1"><mergeCell ref="B26:D27"/></mergeCells>`;
  const sizesXml = `<sheetFormatPr defaultRowHeight="15"/>${cols([
    [0, 0, 'width="4.7109375" customWidth="1"'],
    [1, 1, 'width="30.7109375" customWidth="1"'],
    [2, 2, 'width="9.140625" hidden="1"'],
    [3, 4, 'width="2.7109375" customWidth="1"'],
    [5, 5, 'width="0.5" customWidth="1"'],
    [6, 6, 'width="55" customWidth="1"'],
  ])}<sheetData>${[
    row(1, [
      [0, 'A'],
      [1, 'Width 30'],
      [2, 'hidden'],
      [3, 'D'],
      [4, 'E'],
      [6, 'Wide'],
    ]),
    row(2, [[1, 'Tall row']], ' ht="45" customHeight="1"'),
    row(3, [[1, 'Hidden row']], ' hidden="1"'),
    row(4, [[1, 'Short row']], ' ht="8.25" customHeight="1"'),
    row(5, [
      [1, `${longText} — wrapped without a stored height`, alignRows[9][1]],
    ]),
    row(6, [[1, 'Big font, no stored height', fontRows[11][1]]]),
    row(7, [[1, 'Zero height']], ' ht="0" customHeight="1"'),
  ].join('')}</sheetData>`;
  const formatsXml = `${cols([
    [0, 0, 'width="28" customWidth="1"'],
    [1, 3, 'width="22" customWidth="1"'],
  ])}<sheetData>${formatRows
    .map(([code, s], i) =>
      row(i + 1, [
        [0, String(code)],
        [1, 1234.5678, s],
        [2, -0.125, s],
        [3, 45296.375, s],
      ]),
    )
    .join('')}</sheetData>`;
  write(
    'styles.xlsx',
    buildXlsxFixture({
      styles,
      theme: true,
      sharedStrings: sst,
      sheets: [
        { name: 'Fonts', xml: fontsFinal },
        { name: 'Fills', xml: fillsXml },
        { name: 'Borders', xml: bordersXml },
        { name: 'Alignment', xml: alignXml },
        { name: 'Sizes', xml: sizesXml },
        { name: 'Formats', xml: formatsXml },
      ],
    }),
  );
}

/** structure.xlsx: sheets, views, links, notes, outline, filter, validation, conditional formats. */
{
  const xfs: CorpusXf[] = [];
  const add = (xf: CorpusXf) => {
    xfs.push(xf);
    return xfs.length;
  };
  const header = add({
    font: '<b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/>',
    fill: solid('4472C4'),
  });
  const link = add({
    font: '<u/><sz val="11"/><color theme="10"/><name val="Calibri"/>',
  });
  const money = add({ numFmt: '#,##0.00' });
  const date = add({ numFmt: 14 });
  const dxfs = [
    '<font><b/><color rgb="FF9C0006"/></font><fill><patternFill><bgColor rgb="FFFFC7CE"/></patternFill></fill>',
    '<font><color rgb="FF006100"/></font><fill><patternFill><bgColor rgb="FFC6EFCE"/></patternFill></fill>',
    '<font><color rgb="FF9C5700"/></font><fill><patternFill><bgColor rgb="FFFFEB9C"/></patternFill></fill>',
  ];
  const styles = corpusStyleSheet(xfs, dxfs);

  // Main: frozen panes, zoom, links, notes, outline, filter, validation, names
  const people = [
    ['Ada', 'Engineering', 4200.5, 45296],
    ['Grace', 'Research', 5100, 45300],
    ['Linus', 'Engineering', 3900.25, 45310],
    ['Margaret', 'Operations', 6100, 45320],
    ['Alan', 'Research', 4800.75, 45330],
    ['Katherine', 'Operations', 5300, 45340],
  ] as const;
  const mainRows = [
    row(1, [
      [0, 'Name', header],
      [1, 'Team', header],
      [2, 'Salary', header],
      [3, 'Start', header],
      [4, 'Link', header],
    ]),
    row(2, [[0, 'Frozen pane below row 2']]),
    ...people.map(([n, t, s, d], i) =>
      row(i + 3, [
        [0, n],
        [1, t],
        [2, s, money],
        [3, d, date],
      ]),
    ),
    row(9, [
      [0, 'Total'],
      [2, people.reduce((sum, p) => sum + p[2], 0), money],
    ]),
    row(11, [
      [0, 'Website', link],
      [1, 'Mail', link],
      [2, 'Go to Data!B2', link],
      [3, 'Named target', link],
    ]),
    ...[13, 14, 15, 16, 17, 18].map((r) =>
      row(
        r,
        [
          [0, `Detail ${r}`],
          [2, r * 10],
        ],
        ` outlineLevel="${r >= 15 && r <= 16 ? 2 : 1}"`,
      ),
    ),
    row(19, [
      [0, 'Group total'],
      [2, 165],
    ]),
    row(21, [
      [0, 'Status', header],
      [1, 'Choice', header],
      [2, 'Amount', header],
    ]),
    ...[22, 23, 24, 25, 26].map((r, i) =>
      row(r, [
        [0, i % 2 ? 'Open' : 'Closed'],
        [1, i % 3 ? 'Yes' : 'No'],
        [2, (i + 1) * 7.5],
      ]),
    ),
  ];
  const mainXml =
    '<sheetPr><outlinePr summaryBelow="1" summaryRight="1"/></sheetPr>' +
    '<sheetViews><sheetView tabSelected="1" zoomScale="90" zoomScaleNormal="90" workbookViewId="0"><pane xSplit="1" ySplit="2" topLeftCell="B3" activePane="bottomRight" state="frozen"/><selection pane="topRight" activeCell="B1" sqref="B1"/><selection pane="bottomLeft" activeCell="A3" sqref="A3"/><selection pane="bottomRight" activeCell="C4" sqref="C4:D5"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15" outlineLevelRow="2" outlineLevelCol="1"/>' +
    cols([
      [0, 0, 'width="26" customWidth="1"'],
      [1, 3, 'width="14" customWidth="1"'],
      [4, 5, 'width="12" customWidth="1" outlineLevel="1"'],
    ]) +
    `<sheetData>${mainRows.join('')}</sheetData>` +
    '<autoFilter ref="A21:C26"><filterColumn colId="0"><filters><filter val="Open"/></filters></filterColumn></autoFilter>' +
    '<dataValidations count="1"><dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="B22:B26"><formula1>"Yes,No"</formula1></dataValidation></dataValidations>' +
    '<hyperlinks><hyperlink ref="A11" r:id="rId1" tooltip="Open the site"/><hyperlink ref="B11" r:id="rId2"/><hyperlink ref="C11" location="Data!B2" display="Go to Data!B2"/><hyperlink ref="D11" location="Target"/></hyperlinks>' +
    '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>' +
    '<pageSetup paperSize="9" orientation="landscape"/>' +
    '<legacyDrawing r:id="rId4"/>';
  const comments =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><authors><author>Reviewer</author></authors><commentList>' +
    '<comment ref="C3" authorId="0"><text><r><rPr><b/><sz val="9"/><color indexed="81"/><rFont val="Tahoma"/><family val="2"/></rPr><t>Reviewer:</t></r><r><rPr><sz val="9"/><color indexed="81"/><rFont val="Tahoma"/><family val="2"/></rPr><t xml:space="preserve">\nIncludes the June bonus.</t></r></text></comment>' +
    '<comment ref="A9" authorId="0"><text><t>Sum of C3:C8</t></text></comment>' +
    '</commentList></comments>';
  const shape = (row0: number, col0: number, visible: boolean, id: number) =>
    `<v:shape id="_x0000_s${id}" type="#_x0000_t202" style="position:absolute;margin-left:200pt;margin-top:20pt;width:120pt;height:60pt;z-index:${id - 1024};visibility:${visible ? 'visible' : 'hidden'}" fillcolor="#ffffe1" o:insetmode="auto"><v:fill color2="#ffffe1"/><v:shadow on="t" color="black" obscured="t"/><v:path o:connecttype="none"/><v:textbox style="mso-direction-alt:auto"><div style="text-align:left"></div></v:textbox><x:ClientData ObjectType="Note"><x:MoveWithCells/><x:SizeWithCells/><x:Anchor>3, 15, 1, 10, 5, 15, 5, 4</x:Anchor><x:AutoFill>False</x:AutoFill><x:Row>${row0}</x:Row><x:Column>${col0}</x:Column>${visible ? '<x:Visible/>' : ''}</x:ClientData></v:shape>`;
  const vml =
    '<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout><v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/></v:shapetype>' +
    shape(2, 2, true, 1025) +
    shape(8, 0, false, 1026) +
    '</xml>';

  // CF: rules Excel evaluates; the capture records each cell's displayed colours
  const values = [12, 45, 7, 88, 45, 23, 61, 3, 99, 50];
  const cfRows = [
    row(1, [
      [0, 'cellIs >50'],
      [1, 'between 20-60'],
      [2, 'duplicates'],
      [3, 'top 3'],
      [4, 'above average'],
      [5, 'colour scale'],
      [6, 'data bar'],
      [7, 'icons'],
      [8, 'text'],
    ]),
    ...values.map((v, i) =>
      row(i + 2, [
        [0, v],
        [1, v],
        [2, v],
        [3, v],
        [4, v],
        [5, v],
        [6, v],
        [7, v],
        [8, ['apple', 'banana', 'cherry', 'grape', 'apple pie'][i % 5]],
      ]),
    ),
  ];
  const cfXml =
    `${cols([[0, 8, 'width="13" customWidth="1"']])}<sheetData>${cfRows.join('')}</sheetData>` +
    '<conditionalFormatting sqref="A2:A11"><cfRule type="cellIs" dxfId="0" priority="1" operator="greaterThan"><formula>50</formula></cfRule></conditionalFormatting>' +
    '<conditionalFormatting sqref="B2:B11"><cfRule type="cellIs" dxfId="1" priority="2" operator="between"><formula>20</formula><formula>60</formula></cfRule></conditionalFormatting>' +
    '<conditionalFormatting sqref="C2:C11"><cfRule type="duplicateValues" dxfId="2" priority="3"/></conditionalFormatting>' +
    '<conditionalFormatting sqref="D2:D11"><cfRule type="top10" dxfId="0" priority="4" rank="3"/></conditionalFormatting>' +
    '<conditionalFormatting sqref="E2:E11"><cfRule type="aboveAverage" dxfId="1" priority="5"/></conditionalFormatting>' +
    '<conditionalFormatting sqref="F2:F11"><cfRule type="colorScale" priority="6"><colorScale><cfvo type="min"/><cfvo type="percentile" val="50"/><cfvo type="max"/><color rgb="FFF8696B"/><color rgb="FFFFEB84"/><color rgb="FF63BE7B"/></colorScale></cfRule></conditionalFormatting>' +
    '<conditionalFormatting sqref="G2:G11"><cfRule type="dataBar" priority="7"><dataBar><cfvo type="min"/><cfvo type="max"/><color rgb="FF638EC6"/></dataBar></cfRule></conditionalFormatting>' +
    '<conditionalFormatting sqref="H2:H11"><cfRule type="iconSet" priority="8"><iconSet iconSet="3Arrows"><cfvo type="percent" val="0"/><cfvo type="percent" val="33"/><cfvo type="percent" val="67"/></iconSet></cfRule></conditionalFormatting>' +
    '<conditionalFormatting sqref="I2:I11"><cfRule type="containsText" dxfId="2" priority="9" operator="containsText" text="apple"><formula>NOT(ISERROR(SEARCH("apple",I2)))</formula></cfRule></conditionalFormatting>';

  const dataXml =
    '<sheetPr><tabColor rgb="FF70AD47"/></sheetPr><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>' +
    `<sheetData>${row(2, [[1, 'Target cell']])}${row(4, [
      [1, 'Named'],
      [2, 3.5],
    ])}</sheetData>`;
  const rtlXml =
    '<sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>' +
    `<sheetData>${row(1, [
      [0, 'مرحبا'],
      [1, 'שלום'],
      [2, 123.45],
    ])}${row(2, [[0, 'Right-to-left sheet']])}</sheetData>`;
  const hiddenXml = `<sheetData>${row(1, [[0, 'hidden sheet']])}</sheetData>`;
  write(
    'structure.xlsx',
    buildXlsxFixture({
      styles,
      theme: true,
      workbookView: 'activeTab="0"',
      workbookTail:
        '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Main!$A$21:$C$26</definedName><definedName name="_xlnm.Print_Area" localSheetId="0">Main!$A$1:$E$26</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">Main!$1:$1</definedName><definedName name="Target">Data!$C$4</definedName><definedName name="Rate" localSheetId="1">0.18</definedName></definedNames>',
      defaults: {
        vml: 'application/vnd.openxmlformats-officedocument.vmlDrawing',
      },
      sheets: [
        {
          name: 'Main',
          xml: mainXml,
          rels: [
            {
              id: 'rId1',
              type: 'hyperlink',
              target: 'https://example.com/path?q=1',
              external: true,
            },
            {
              id: 'rId2',
              type: 'hyperlink',
              target: 'mailto:team@example.com',
              external: true,
            },
            { id: 'rId3', type: 'comments', target: '../comments1.xml' },
            {
              id: 'rId4',
              type: 'vmlDrawing',
              target: '../drawings/vmlDrawing1.vml',
            },
          ],
        },
        { name: 'Data', xml: dataXml },
        { name: 'RTL', xml: rtlXml },
        { name: 'CF', xml: cfXml },
        { name: 'Hidden', xml: hiddenXml, state: 'hidden' },
        { name: 'Very hidden', xml: hiddenXml, state: 'veryHidden' },
      ],
      extraParts: [
        {
          path: 'xl/comments1.xml',
          data: comments,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml',
        },
        { path: 'xl/drawings/vmlDrawing1.vml', data: vml },
      ],
    }),
  );
}

/** The cell metadata Excel writes for dynamic arrays (`cm="1"`). */
const DYNAMIC_ARRAY_METADATA =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<metadata xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:xda="http://schemas.microsoft.com/office/spreadsheetml/2017/dynamicarray">' +
  '<metadataTypes count="1"><metadataType name="XLDAPR" minSupportedVersion="120000" copy="1" pasteAll="1" pasteValues="1" merge="1" splitFirst="1" rowColShift="1" clearFormats="1" clearComments="1" assign="1" coerce="1" cellMeta="1"/></metadataTypes>' +
  '<futureMetadata name="XLDAPR" count="1"><bk><extLst><ext uri="{bdbb8cdc-fa1e-496e-a857-3c3f30c029c3}"><xda:dynamicArrayProperties fDynamic="1" fCollapsed="0"/></ext></extLst></bk></futureMetadata>' +
  '<cellMetadata count="1"><bk><rc t="1" v="0"/></bk></cellMetadata></metadata>';

/** formulas.xlsx: cached values Excel computes, shared and array formulas. */
{
  const xfs: CorpusXf[] = [{ numFmt: '0.00' }, { numFmt: 14 }];
  const f = (ref: string, formula: string, extra = '') =>
    `<c r="${ref}"${extra}><f>${formula.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</f></c>`;
  const rows: string[] = [];
  for (let r = 1; r <= 8; r++) {
    const cells = [fixtureCell(`A${r}`, r), fixtureCell(`B${r}`, r * 1.5)];
    if (r === 1)
      cells.push(
        '<c r="C1" s="1"><f t="shared" ref="C1:C8" si="0">A1*B1</f></c>',
      );
    else cells.push(`<c r="C${r}" s="1"><f t="shared" si="0"/></c>`);
    if (r === 1)
      cells.push('<c r="D1"><f t="shared" ref="D1:D8" si="1">$A$1+A1</f></c>');
    else cells.push(`<c r="D${r}"><f t="shared" si="1"/></c>`);
    rows.push(`<row r="${r}">${cells.join('')}</row>`);
  }
  rows.push(
    `<row r="10">${f('A10', 'SUM(A1:A8)')}${f('B10', 'AVERAGE(B1:B8)')}${f('C10', 'ROUND(C3/7,4)')}${f('D10', 'IF(A1>0,"positive","other")')}</row>`,
    `<row r="11">${f('A11', '1/0')}${f('B11', 'NA()')}${f('C11', 'A1=1')}${f('D11', '"Total: "&TEXT(A10,"#,##0")')}</row>`,
    `<row r="12">${f('A12', "'Other sheet'!B2*2")}${f('B12', 'Rate*100')}${f('C12', 'DATE(2024,1,5)', ' s="2"')}${f('D12', 'COUNTIF(A1:A8,">4")')}</row>`,
    `<row r="13"><c r="A13"><f t="array" ref="A13">SUM(A1:A3*B1:B3)</f></c></row>`,
    // a dynamic array: `cm` points at the XLDAPR cell metadata in xl/metadata.xml
    `<row r="14"><c r="A14" cm="1"><f t="array" ref="A14:A18">_xlfn.SEQUENCE(5,1,10,10)</f></c><c r="C14"><f t="array" ref="C14:C16">A1:A3*2</f></c></row>`,
    `<row r="20">${f('A20', '_xlfn.XLOOKUP(5,A1:A8,B1:B8)')}${f('B20', 'SUMPRODUCT(A1:A8,B1:B8)')}${f('C20', 'MAX(C1:C8)-MIN(C1:C8)')}</row>`,
  );
  write(
    'formulas.xlsx',
    buildXlsxFixture({
      styles: corpusStyleSheet(xfs),
      workbookTail:
        '<definedNames><definedName name="Rate">0.18</definedName></definedNames>',
      extraParts: [
        {
          path: 'xl/metadata.xml',
          data: DYNAMIC_ARRAY_METADATA,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheetMetadata+xml',
        },
      ],
      workbookRels: [{ type: 'sheetMetadata', target: 'metadata.xml' }],
      sheets: [
        {
          name: 'Formulas',
          xml: `${cols([[0, 3, 'width="16" customWidth="1"']])}<sheetData>${rows.join('')}</sheetData>`,
        },
        {
          name: 'Other sheet',
          xml: `<sheetData>${row(2, [[1, 21]])}</sheetData>`,
        },
      ],
    }),
  );
}

/** dates1904.xlsx: the Mac date system. */
{
  const xfs: CorpusXf[] = [
    { numFmt: 'yyyy-mm-dd hh:mm:ss' },
    { numFmt: 14 },
    { numFmt: '[h]:mm' },
  ];
  write(
    'dates1904.xlsx',
    buildXlsxFixture({
      styles: corpusStyleSheet(xfs),
      workbookPr: 'date1904="1"',
      sheets: [
        {
          name: 'Dates',
          xml: `${cols([[0, 2, 'width="22" customWidth="1"']])}<sheetData>${[
            0, 1, 365.5, 43831.25, 1462, 2957003,
          ]
            .map((v, i) =>
              row(i + 1, [
                [0, v, 1],
                [1, v, 2],
                [2, v, 3],
              ]),
            )
            .join('')}</sheetData>`,
        },
      ],
    }),
  );
}

/** A small RGB PNG (corpus tooling runs in Node, so node:zlib encodes it). */
function png(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number],
): Uint8Array {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      const at = y * (width * 3 + 1) + 1 + x * 3;
      raw[at] = r;
      raw[at + 1] = g;
      raw[at + 2] = b;
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(
      zlibCrc32(Buffer.concat([head.subarray(4), data])) >>> 0,
      0,
    );
    return Buffer.concat([head, data, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

/** pictures.xlsx: pictures anchored the three ways, one cropped, one rotated. */
{
  const DRAWING_NS =
    'xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const pic = (
    id: number,
    name: string,
    descr: string,
    rel: string,
    extra = '',
    xfrm = '<a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm>',
  ) =>
    `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="${name}" descr="${descr}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>` +
    `<xdr:blipFill><a:blip r:embed="${rel}"/>${extra}<a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
    `<xdr:spPr>${xfrm}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/>`;
  const corner = (
    tag: string,
    col: number,
    colOff: number,
    row: number,
    rowOff: number,
  ) =>
    `<xdr:${tag}><xdr:col>${col}</xdr:col><xdr:colOff>${colOff * 9525}</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>${rowOff * 9525}</xdr:rowOff></xdr:${tag}>`;
  const drawing =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr ${DRAWING_NS}>` +
    `<xdr:twoCellAnchor>${corner('from', 1, 10, 1, 5)}${corner('to', 3, 20, 7, 0)}${pic(2, 'Two cell', 'A gradient anchored to B2:D8', 'rId1')}</xdr:twoCellAnchor>` +
    `<xdr:oneCellAnchor>${corner('from', 5, 0, 2, 0)}<xdr:ext cx="${120 * 9525}" cy="${60 * 9525}"/>${pic(3, 'One cell', 'Bars', 'rId2')}</xdr:oneCellAnchor>` +
    `<xdr:absoluteAnchor><xdr:pos x="${300 * 9525}" y="${220 * 9525}"/><xdr:ext cx="${80 * 9525}" cy="${80 * 9525}"/>${pic(4, 'Absolute', 'Rotated square', 'rId1', '', `<a:xfrm rot="${30 * 60000}"><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm>`)}</xdr:absoluteAnchor>` +
    `<xdr:twoCellAnchor editAs="oneCell">${corner('from', 1, 0, 10, 0)}${corner('to', 3, 0, 14, 0)}${pic(5, 'Cropped', 'Cropped bars', 'rId2', '<a:srcRect l="25000" t="10000" r="25000" b="10000"/>')}</xdr:twoCellAnchor>` +
    '</xdr:wsDr>';
  const gradient = png(64, 48, (x, y) => [
    Math.round((x / 63) * 255),
    Math.round((y / 47) * 255),
    160,
  ]);
  const bars = png(60, 30, (x) =>
    Math.floor(x / 10) % 2 ? [68, 114, 196] : [237, 125, 49],
  );
  write(
    'pictures.xlsx',
    buildXlsxFixture({
      styles: corpusStyleSheet([]),
      defaults: { png: 'image/png' },
      sheets: [
        {
          name: 'Pictures',
          xml: `<sheetData>${row(1, [[0, 'Pictures over the grid']])}${row(12, [[5, 'Text under nothing']])}</sheetData><drawing r:id="rId1"/>`,
          rels: [
            { id: 'rId1', type: 'drawing', target: '../drawings/drawing1.xml' },
          ],
        },
      ],
      extraParts: [
        {
          path: 'xl/drawings/drawing1.xml',
          data: drawing,
          contentType:
            'application/vnd.openxmlformats-officedocument.drawing+xml',
        },
        {
          path: 'xl/drawings/_rels/drawing1.xml.rels',
          data:
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>' +
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image2.png"/></Relationships>',
        },
        { path: 'xl/media/image1.png', data: gradient },
        { path: 'xl/media/image2.png', data: bars },
      ],
    }),
  );
}

console.log(`corpus sources written to ${out}`);
