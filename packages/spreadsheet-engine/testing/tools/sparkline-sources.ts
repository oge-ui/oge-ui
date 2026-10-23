/**
 * The sparklines corpus workbook (`sparklines.xlsx`): line, column and
 * win/loss sparklines whose every part has its own pure colour, laid out so
 * one screen shows each sheet — a value swept 0…100 through cells of several
 * heights and widths, data that never reaches zero (the stretched axis end),
 * highlighted points, the x axis, half-pixel ties, touching columns, zooms,
 * and the behaviour cases (text, booleans, errors, empty and hidden cells,
 * custom and group axes, dates, right-to-left groups and sheets, merged
 * cells). `sparkline-capture.ps1`
 * reads Excel's pixels of every sparkline cell off the screen and
 * `sparkline-boxes.mjs` turns them into `sparklines.boxes.json`.
 * Corpus tooling only.
 */
import { ogeColumnName } from '../../src/lib/address/address';
import {
  buildXlsxFixture,
  fixtureCell,
  type XlsxFixtureSheet,
} from '../../src/testing/xlsx-fixture';

/** Every part its own colour, so the capture can tell them apart. */
const COLORS =
  '<x14:colorSeries rgb="FF0000FF"/><x14:colorNegative rgb="FFFF0000"/><x14:colorAxis rgb="FF00FF00"/>' +
  '<x14:colorMarkers rgb="FFFF00FF"/><x14:colorFirst rgb="FF00FFFF"/><x14:colorLast rgb="FFFFFF00"/>' +
  '<x14:colorHigh rgb="FF800000"/><x14:colorLow rgb="FF008000"/>';

const ext = (groups: string) =>
  '<extLst><ext uri="{05C60535-1F16-4fd2-B633-F4F36F0B64E0}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main">' +
  `<x14:sparklineGroups xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main">${groups}</x14:sparklineGroups></ext></extLst>`;

const group = (attrs: string, sparklines: string, children = '') =>
  `<x14:sparklineGroup${attrs.includes('displayEmptyCellsAs') ? '' : ' displayEmptyCellsAs="gap"'}${attrs ? ` ${attrs}` : ''}>${COLORS}${children}<x14:sparklines>${sparklines}</x14:sparklines></x14:sparklineGroup>`;

const spark = (from: string, at: string) =>
  `<x14:sparkline><xm:f>${from}</xm:f><xm:sqref>${at}</xm:sqref></x14:sparkline>`;

/** The view: the selection far away (its frame would cover B2's gridlines), maybe zoomed or right to left. */
const view = (zoom = 100, rtl = false) =>
  `<sheetViews><sheetView${rtl ? ' rightToLeft="1"' : ''}${zoom === 100 ? '' : ` zoomScale="${zoom}" zoomScaleNormal="${zoom}"`} workbookViewId="0"><selection activeCell="Z60" sqref="Z60"/></sheetView></sheetViews>`;

type Value = number | string | boolean | null | { readonly error: string };

function cell(ref: string, v: Value): string {
  if (v === null) return '';
  if (typeof v === 'number') return fixtureCell(ref, v);
  if (typeof v === 'boolean')
    return `<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`;
  if (typeof v === 'string')
    return `<c r="${ref}" t="inlineStr"><is><t>${v}</t></is></c>`;
  return `<c r="${ref}" t="e"><v>${v.error}</v></c>`;
}

/** A 17 × 6 grid holds k = 0…100. */
const GRID = 17;

/** Data: A–C [0, k, 100]; E–G [-100, 2k − 100, 100]; I–K [100, 100 + k, 200]; M–O [-200, -200 + k, -100]; Q–S [k, 50, 100]; U–W [-k, -50, -100]; Y–Z [-k, 100 − k]. */
function data(): XlsxFixtureSheet {
  const rows: string[] = [];
  for (let k = 0; k <= 100; k++) {
    const r = k + 1;
    const blocks: [string, number][] = [
      ['A', 0],
      ['B', k],
      ['C', 100],
      ['E', -100],
      ['F', 2 * k - 100],
      ['G', 100],
      ['I', 100],
      ['J', 100 + k],
      ['K', 200],
      ['M', -200],
      ['N', -200 + k],
      ['O', -100],
      ['Q', k],
      ['R', 50],
      ['S', 100],
      ['U', -k],
      ['V', -50],
      ['W', -100],
      ['Y', -k],
      ['Z', 100 - k],
    ];
    rows.push(
      `<row r="${r}">${blocks.map(([c, v]) => fixtureCell(`${c}${r}`, v)).join('')}</row>`,
    );
  }
  return {
    name: 'Data',
    xml: `${view()}<sheetData>${rows.join('')}</sheetData>`,
  };
}

/** 101 sparklines over Data, one per k, from the data block `columns`. */
function sweep(
  name: string,
  attrs: string,
  height: number,
  columns: string,
  options: {
    readonly zoom?: number;
    readonly widths?: boolean;
    readonly perRow?: number;
  } = {},
): XlsxFixtureSheet {
  const [first, last] = columns.split(':');
  // zoomed sheets take fewer cells a row, so one screen still shows them all
  const perRow = options.perRow ?? GRID;
  const rows: string[] = [];
  for (let r = 2; r <= 1 + Math.ceil(101 / perRow); r++)
    rows.push(`<row r="${r}" ht="${height}" customHeight="1"></row>`);
  const sparks: string[] = [];
  for (let k = 0; k <= 100; k++) {
    const at = `${ogeColumnName(1 + (k % perRow))}${2 + Math.floor(k / perRow)}`;
    sparks.push(spark(`Data!${first}${k + 1}:${last}${k + 1}`, at));
  }
  // widening columns put the points on many sub-pixel positions
  const cols = options.widths
    ? Array.from(
        { length: perRow },
        (_, i) =>
          `<col min="${i + 2}" max="${i + 2}" width="${6 + i * 0.5}" customWidth="1"/>`,
      ).join('')
    : `<col min="2" max="${perRow + 1}" width="8" customWidth="1"/>`;
  return {
    name,
    xml: `${view(options.zoom)}<cols>${cols}</cols><sheetData>${rows.join('')}</sheetData>${ext(group(attrs, sparks.join('')))}`,
  };
}

interface Case {
  readonly values: readonly Value[];
  readonly attrs?: string;
  /** Group children after the colours (a date range). */
  readonly children?: string;
}

/** One row per case: line (B, with markers), column (C) and win/loss (D); data from AE. */
function cases(
  name: string,
  list: readonly Case[],
  options: {
    readonly types?: readonly ('line' | 'column' | 'stacked')[];
    readonly height?: (index: number) => number;
    readonly cols?: string;
    readonly extraRows?: string;
    readonly rtl?: boolean;
  } = {},
): XlsxFixtureSheet {
  const types = options.types ?? ['line', 'column', 'stacked'];
  const rows: string[] = [];
  const groups: string[] = [];
  list.forEach(({ values, attrs = '', children = '' }, i) => {
    const r = i + 2;
    const height = options.height?.(i) ?? 30;
    rows.push(
      `<row r="${r}" ht="${height}" customHeight="1">${values.map((v, c) => cell(`${ogeColumnName(30 + c)}${r}`, v)).join('')}</row>`,
    );
    const from = `'${name}'!${ogeColumnName(30)}${r}:${ogeColumnName(30 + Math.max(0, values.length - 1))}${r}`;
    types.forEach((type, t) => {
      const own = type === 'line' ? 'markers="1"' : `type="${type}"`;
      groups.push(
        group(
          `${own} ${attrs}`.trim(),
          spark(from, `${ogeColumnName(1 + t)}${r}`),
          children,
        ),
      );
    });
  });
  return {
    name,
    xml:
      view(100, options.rtl) +
      (options.cols ??
        `<cols><col min="2" max="${1 + types.length}" width="20" customWidth="1"/></cols>`) +
      `<sheetData>${rows.join('')}${options.extraRows ?? ''}</sheetData>${ext(groups.join(''))}`,
  };
}

const FLAGS = 'high="1" low="1" first="1" last="1" negative="1"';

export function sparklinesWorkbook(): Uint8Array {
  const sheets: XlsxFixtureSheet[] = [
    // the value sweep: rows of 15, 30 and 90 pt, zero on the axis
    sweep('Sweep15', 'type="column"', 15, 'A:C'),
    sweep('Sweep30', 'type="column"', 30, 'A:C'),
    sweep('Sweep90', 'type="column"', 90, 'A:C'),
    sweep('Negative', 'type="column"', 30, 'E:G'),
    // data away from zero: the axis end moves past it
    sweep('Stretch', 'type="column"', 90, 'I:K'),
    sweep('StretchBelow', 'type="column"', 90, 'M:O'),
    sweep('StretchLine', 'markers="1"', 90, 'I:K'),
    // markers on many sub-pixel positions: plain, first, low, negative
    sweep('Markers', 'markers="1" first="1"', 30, 'Q:S', { widths: true }),
    sweep('MarkersLow', 'markers="1" low="1"', 30, 'Q:S', { widths: true }),
    sweep('MarkersBelow', 'markers="1" first="1" negative="1"', 30, 'U:W', {
      widths: true,
    }),
    // the x axis through every zero position, also zoomed
    sweep('Axis', 'type="column" displayXAxis="1"', 30, 'Y:Z', {
      widths: true,
    }),
    sweep('Axis75', 'type="column" displayXAxis="1"', 30, 'Y:Z', {
      widths: true,
      zoom: 75,
    }),
    sweep('Axis150', 'type="column" displayXAxis="1"', 30, 'Y:Z', {
      widths: true,
      zoom: 150,
      perRow: 11,
    }),
    sweep('Zoom125', 'type="column"', 30, 'Q:S', {
      widths: true,
      zoom: 125,
      perRow: 13,
    }),
  ];

  // half-pixel ties: [0..8] where the plot height makes y land on halves
  {
    const heights = [15, 22.5, 37.5, 52.5, 12, 18];
    const rows: string[] = [];
    const column: string[] = [];
    const line: string[] = [];
    const below: string[] = [];
    heights.forEach((h, i) => {
      const r = i + 2;
      const up = Array.from({ length: 9 }, (_, v) =>
        fixtureCell(`${ogeColumnName(25 + v)}${r}`, v),
      );
      const down = Array.from({ length: 9 }, (_, v) =>
        fixtureCell(`${ogeColumnName(35 + v)}${r}`, -v),
      );
      rows.push(
        `<row r="${r}" ht="${h}" customHeight="1">${up.join('')}${down.join('')}</row>`,
      );
      column.push(spark(`Ties!Z${r}:AH${r}`, `B${r}`));
      line.push(spark(`Ties!Z${r}:AH${r}`, `C${r}`));
      below.push(spark(`Ties!AJ${r}:AR${r}`, `D${r}`));
    });
    sheets.push({
      name: 'Ties',
      xml:
        `${view()}<cols><col min="2" max="4" width="20" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData>` +
        ext(
          group('type="column"', column.join('')) +
            group('markers="1"', line.join('')) +
            group('type="column"', below.join('')),
        ),
    });
  }

  // columns that touch once the gap would drop under 2 px
  {
    const counts = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    const rows: string[] = [];
    const sparks: string[] = [];
    counts.forEach((n, i) => {
      const r = i + 2;
      const cells = Array.from({ length: n }, (_, c) =>
        fixtureCell(`${ogeColumnName(25 + c)}${r}`, 1 + (c % 2)),
      );
      rows.push(
        `<row r="${r}" ht="30" customHeight="1">${cells.join('')}</row>`,
      );
      for (const at of ['B', 'C', 'D'])
        sparks.push(
          spark(`Gap!Z${r}:${ogeColumnName(25 + n - 1)}${r}`, `${at}${r}`),
        );
    });
    sheets.push({
      name: 'Gap',
      xml:
        `${view()}<cols><col min="2" max="2" width="10" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/><col min="4" max="4" width="30" customWidth="1"/></cols>` +
        `<sheetData>${rows.join('')}</sheetData>${ext(group('type="column"', sparks.join('')))}`,
    });
  }

  const winLossHeights = [15, 22.5, 30, 45, 60, 90];
  sheets.push(
    cases(
      'WinLoss',
      winLossHeights.map(() => ({ values: [1, -1, 0, 1, -1] })),
      { types: ['stacked'], height: (i) => winLossHeights[i] },
    ),
    cases('Special', [
      { values: [3, 3, 3, 3] },
      { values: [2, 5] },
      { values: [4] },
      { values: [-1, -3, -2] },
      { values: [0, 0, 0] },
      { values: [null, null, null] },
      { values: ['a', 1, 2] },
      { values: [true, 1, 2] },
      { values: [{ error: '#N/A' }, 1, 2] },
      { values: [-5, 5] },
      { values: [0, 5] },
      { values: [-5, 0] },
      { values: [1e-9, 2e-9, 3e-9] },
      { values: [1000000, 1000001, 1000000.5] },
      { values: ['1', '2', 3] },
      { values: [5, 'x', 'y', 2], attrs: 'displayEmptyCellsAs="zero"' },
      { values: [-3, -3, -3] },
      { values: [false, 1, 2, true] },
      { values: [1, { error: '#DIV/0!' }, 3, 2] },
    ]),
    cases('Colors', [
      { values: [1, 5, 3], attrs: FLAGS },
      { values: [5, 1, 3], attrs: FLAGS },
      { values: [3, 1, 5], attrs: FLAGS },
      { values: [-2, 3, -4, 1], attrs: FLAGS },
      { values: [2, 2, 1, 1], attrs: FLAGS },
      { values: [4, 1, 4, 1], attrs: FLAGS },
      { values: [-1, -2, -3], attrs: FLAGS },
      { values: [1, 5, 3], attrs: 'high="1"' },
      { values: [1, 5, 3], attrs: 'low="1"' },
      { values: [1, 5, 3], attrs: 'first="1"' },
      { values: [1, 5, 3], attrs: 'last="1"' },
      { values: [-1, 5, -3], attrs: 'negative="1"' },
    ]),
    cases('AxisCases', [
      { values: [3, -2, 4, -1, 2, -3], attrs: 'displayXAxis="1"' },
      { values: [3, 2, 4, 1, 2, 3], attrs: 'displayXAxis="1"' },
      { values: [-3, -2, -4, -1, -2, -3], attrs: 'displayXAxis="1"' },
      { values: [0, 2, 4, 1, 2, 3], attrs: 'displayXAxis="1"' },
      {
        values: [3, 2, 4, 1, 2, 3],
        attrs: 'minAxisType="custom" manualMin="0"',
      },
      {
        values: [3, 2, 4, 1, 2, 3],
        attrs:
          'minAxisType="custom" manualMin="2" maxAxisType="custom" manualMax="3"',
      },
      {
        values: [3, 2, 4, 1, 2, 3],
        attrs: 'minAxisType="custom" manualMin="-4" displayXAxis="1"',
      },
      {
        values: [3, 2, 4, 1, 2, 3],
        attrs: 'maxAxisType="custom" manualMax="10"',
      },
      {
        values: [3, 2, 4, 1, 2, 3],
        attrs: 'maxAxisType="custom" manualMax="100"',
      },
      {
        values: [-3, -2, -4, -1, -2, -3],
        attrs: 'minAxisType="custom" manualMin="-100"',
      },
      {
        values: [3, 2, 4, 1, 2, 3],
        attrs: 'minAxisType="custom" manualMin="0.5"',
      },
      { values: [1, 3, 2, 5, 4, 6], attrs: 'minAxisType="custom"' },
      {
        values: [5, 5, 5],
        attrs:
          'minAxisType="custom" manualMin="0" maxAxisType="custom" manualMax="10"',
      },
    ]),
    cases('Empty', [
      { values: [1, 3, null, 5, 4, 6], attrs: 'displayEmptyCellsAs="gap"' },
      { values: [1, 3, null, 5, 4, 6], attrs: 'displayEmptyCellsAs="zero"' },
      { values: [1, 3, null, 5, 4, 6], attrs: 'displayEmptyCellsAs="span"' },
      { values: [null, 3, 2, 5, 4, null], attrs: 'displayEmptyCellsAs="gap"' },
      { values: [null, 3, 2, 5, 4, null], attrs: 'displayEmptyCellsAs="zero"' },
      {
        values: [1, null, null, 5, null, 6],
        attrs: 'displayEmptyCellsAs="span"',
      },
      {
        values: [1, null, 3, null, 5, null],
        attrs: 'displayEmptyCellsAs="gap"',
      },
      {
        values: [1, 3, null, 5, 4, 6],
        attrs: 'displayEmptyCellsAs="zero" displayXAxis="1"',
      },
      {
        values: [1, { error: '#N/A' }, 3, 2],
        attrs: 'displayEmptyCellsAs="zero"',
      },
    ]),
    cases(
      'Hidden',
      [
        { values: [1, 3, 2, 5, 4, 6] },
        { values: [1, 3, 2, 5, 4, 6], attrs: 'displayHidden="1"' },
      ],
      // the data's third and fourth columns (AG:AH) are hidden
      {
        cols: '<cols><col min="2" max="4" width="20" customWidth="1"/><col min="33" max="34" width="9" hidden="1" customWidth="1"/></cols>',
      },
    ),
    cases('RightToLeft', [
      { values: [1, 3, 2, 5, 4, 6], attrs: 'first="1" rightToLeft="1"' },
      {
        values: [3, -2, 4, -1, 2, -3],
        attrs: 'displayXAxis="1" first="1" rightToLeft="1"',
      },
    ]),
    // a right-to-left sheet: its columns are mirrored, its sparklines are not
    cases(
      'SheetRTL',
      [
        { values: [1, 3, 2, 5, 4, 6], attrs: 'first="1"' },
        { values: [3, -2, 4, -1, 2, -3], attrs: 'displayXAxis="1" first="1"' },
        { values: [1, 3, 2, 5, 4, 6], attrs: 'first="1" rightToLeft="1"' },
      ],
      { rtl: true },
    ),
    cases(
      'Dates',
      [
        {
          values: [1, 3, 2, 5, 4, 6],
          attrs: 'dateAxis="1"',
          children: "<xm:f>'Dates'!AE20:AJ20</xm:f>",
        },
      ],
      {
        // Jan 1, 2, 4, 11, 12 and 31 of 2025, beside the data's columns
        extraRows: `<row r="20">${[45658, 45659, 45661, 45668, 45669, 45688]
          .map((d, i) => fixtureCell(`${ogeColumnName(30 + i)}20`, d))
          .join('')}</row>`,
      },
    ),
  );

  // merged cells: a sparkline fills its merge
  {
    const values = [1, 3, 2, 5, 4, 6];
    const rows = [2, 3, 4, 5].map(
      (r) =>
        `<row r="${r}" ht="30" customHeight="1">${r === 2 ? values.map((v, c) => fixtureCell(`${ogeColumnName(30 + c)}2`, v)).join('') : ''}</row>`,
    );
    const from = "'Merged'!AE2:AJ2";
    sheets.push({
      name: 'Merged',
      xml:
        `${view()}<cols><col min="2" max="4" width="12" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData>` +
        '<mergeCells count="3"><mergeCell ref="B2:C3"/><mergeCell ref="D2:D5"/><mergeCell ref="B5:C5"/></mergeCells>' +
        ext(
          group('markers="1" first="1"', spark(from, 'B2')) +
            group('type="column" first="1"', spark(from, 'D2')) +
            group('type="stacked" first="1"', spark(from, 'B5')),
        ),
    });
  }

  // a group sharing its axis: three ranges, both ends or one end group-wide
  {
    const values = [
      [1, 2, 3],
      [4, 5, 6],
      [-2, 0, 2],
    ];
    const rows = values.map(
      (row, i) =>
        `<row r="${i + 2}" ht="30" customHeight="1">${row.map((v, c) => fixtureCell(`${ogeColumnName(25 + c)}${i + 2}`, v)).join('')}</row>`,
    );
    const at = (col: string) =>
      values
        .map((_, i) => spark(`Groups!Z${i + 2}:AB${i + 2}`, `${col}${i + 2}`))
        .join('');
    sheets.push({
      name: 'Groups',
      xml:
        `${view()}<cols><col min="2" max="5" width="20" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData>` +
        ext(
          group(
            'markers="1" minAxisType="group" maxAxisType="group"',
            at('B'),
          ) +
            group(
              'type="column" minAxisType="group" maxAxisType="group"',
              at('C'),
            ) +
            group('markers="1" minAxisType="group"', at('D')) +
            group('type="column" maxAxisType="group"', at('E')),
        ),
    });
  }

  // marker size by line weight: one zero point per weight, 0.25 … 6 pt
  {
    const rows: string[] = [];
    const groups: string[] = [];
    for (let i = 0; i < 24; i++) {
      const r = 2 + Math.floor(i / 8);
      if (i % 8 === 0)
        rows.push(
          `<row r="${r}" ht="27" customHeight="1">${i === 0 ? fixtureCell('Z2', 0) : ''}</row>`,
        );
      groups.push(
        group(
          `lineWeight="${(i + 1) * 0.25}" markers="1"`,
          spark('Weights!Z2:Z2', `${ogeColumnName(1 + (i % 8))}${r}`),
        ),
      );
    }
    sheets.push({
      name: 'Weights',
      xml: `${view()}<cols><col min="2" max="9" width="8" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData>${ext(groups.join(''))}`,
    });
  }

  sheets.push(data());
  return buildXlsxFixture({ theme: true, sheets });
}
