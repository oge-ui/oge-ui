import { describe, expect, it } from 'vitest';
import { buildExcelWorkbook, buildTreeExcelWorkbook } from './export-excel';
import { buildOgeExportItems } from './lib/grid/grid-export';
import type { OgeExportColumn, OgeExportData } from './lib/grid/grid-options';

interface Sale {
  region: string;
  city: string;
  amount: number;
  sold: string;
}

const ROWS: Sale[] = [
  { region: 'EU', city: 'Paris', amount: 10, sold: '2024-01-02' },
  { region: 'EU', city: 'Rome', amount: 20, sold: '2024-02-03' },
  { region: 'US', city: 'Austin', amount: 5, sold: '2024-03-04' },
];

const COLUMNS: OgeExportColumn<Sale>[] = [
  {
    caption: 'Region',
    field: 'region',
    dataType: 'string',
    accessor: (r) => r.region,
    pinned: 'left',
    width: 140,
  },
  {
    caption: 'City',
    field: 'city',
    dataType: 'string',
    accessor: (r) => r.city,
    bandCaption: 'Place',
  },
  {
    caption: 'Amount',
    field: 'amount',
    dataType: 'number',
    accessor: (r) => r.amount,
    alignment: 'end',
    bandCaption: 'Place',
  },
  {
    caption: 'Sold',
    field: 'sold',
    dataType: 'date',
    accessor: (r) => r.sold,
  },
];

const grouped = (): OgeExportData<Sale> => ({
  rows: ROWS,
  columns: COLUMNS,
  items: buildOgeExportItems(ROWS, {
    groups: [{ field: 'region' }],
    groupSummary: [{ field: 'amount', type: 'sum' }],
    groupFooterFields: new Set(['amount']),
    totalSummary: [{ field: 'amount', type: 'sum' }],
    summaryText: (s) => `Sum: ${String(s.value)}`,
    summaryLabel: () => 'Sum',
    groupText: (g) => `Region: ${String(g.value)}`,
  }),
});

describe('buildExcelWorkbook (rich)', () => {
  it('merges the band header, freezes header rows + pinned columns', () => {
    const sheet = buildExcelWorkbook(grouped()).getWorksheet('Data');
    expect(sheet?.getCell('B1').value).toBe('Place');
    expect(sheet?.getCell('B2').value).toBe('City');
    expect(sheet?.getCell('C2').value).toBe('Amount');
    // band-less columns span both header rows
    expect(sheet?.getCell('A1').value).toBe('Region');
    expect(sheet?.getCell('A2').isMerged).toBe(true);
    expect(sheet?.views[0]).toMatchObject({
      state: 'frozen',
      xSplit: 1,
      ySplit: 2,
    });
    expect(sheet?.autoFilter).toEqual({
      from: { row: 2, column: 1 },
      to: { row: 2, column: 4 },
    });
    // grid px width → Excel characters; the rest auto-fitted
    expect(sheet?.getColumn(1).width).toBe(20);
    expect(sheet?.getColumn(2).width).toBeGreaterThanOrEqual(10);
  });

  it('writes group rows with outline levels, footers and the total', () => {
    const sheet = buildExcelWorkbook(grouped()).getWorksheet('Data');
    expect(sheet?.getCell('A3').value).toBe('Region: EU');
    expect(sheet?.getCell('A3').font?.bold).toBe(true);
    expect(sheet?.getRow(4).outlineLevel).toBe(1);
    expect(sheet?.getCell('C4').value).toBe(10);
    // footer summary stays a number with a label-prefixed format
    expect(sheet?.getCell('C6').value).toBe(30);
    expect(sheet?.getCell('C6').numFmt).toBe('"Sum: "General');
    expect(sheet?.getRow(6).outlineLevel).toBe(1);
    // total row closes the sheet at outline level 0
    const last = sheet?.rowCount ?? 0;
    expect(sheet?.getCell(last, 3).value).toBe(35);
    expect(sheet?.getRow(last).outlineLevel ?? 0).toBe(0);
    expect(sheet?.properties.outlineProperties).toMatchObject({
      summaryBelow: false,
    });
  });

  it('summaryFormulas writes SUBTOTAL over the group / data range', () => {
    const sheet = buildExcelWorkbook(grouped(), {
      summaryFormulas: true,
    }).getWorksheet('Data');
    expect(sheet?.getCell('C6').value).toEqual({
      formula: 'SUBTOTAL(9,C4:C5)',
      result: 30,
    });
    const last = sheet?.rowCount ?? 0;
    expect(sheet?.getCell(last, 3).value).toMatchObject({
      // up to the last data row (the US footer below it is a subtotal too)
      formula: `SUBTOTAL(9,C3:C${last - 2})`,
      result: 35,
    });
  });

  it('applies number/date formats, cellStyle and customizeCell styles', () => {
    const sheet = buildExcelWorkbook(
      { rows: ROWS, columns: COLUMNS },
      {
        numberFormat: '#,##0.00',
        columnFormats: { sold: 'dd.mm.yyyy' },
        cellStyle: ({ kind, value }) =>
          kind === 'data' && typeof value === 'number' && value > 15
            ? { background: '#ffeeaa', color: '#aa0000' }
            : undefined,
        customizeCell: ({ field, style }) => {
          if (field === 'city' && style) style.italic = true;
          return undefined;
        },
      },
    ).getWorksheet('Data');
    // COLUMNS carry bands → two header rows, data from row 3
    const amount = sheet?.getCell('C4'); // Rome, 20
    expect(amount?.numFmt).toBe('#,##0.00');
    expect(amount?.fill).toMatchObject({ fgColor: { argb: 'FFFFEEAA' } });
    expect(amount?.font?.color).toEqual({ argb: 'FFAA0000' });
    expect(sheet?.getCell('C3').fill).toBeUndefined();
    expect(sheet?.getCell('D3').numFmt).toBe('dd.mm.yyyy');
    expect(sheet?.getCell('D3').value).toBeInstanceOf(Date);
    expect(sheet?.getCell('B3').font?.italic).toBe(true);
    expect(sheet?.getCell('C3').alignment?.horizontal).toBe('right');
  });

  it('writes datetime columns as typed dates with a date-time format', () => {
    const rows = [{ at: new Date(2026, 9, 4, 14, 30) }];
    const columns: OgeExportColumn<(typeof rows)[number]>[] = [
      {
        field: 'at',
        caption: 'At',
        dataType: 'datetime',
        accessor: (r) => r.at,
      },
    ];
    const book = buildExcelWorkbook({ rows, columns });
    const cell = book.getWorksheet('Data')?.getCell('A2');
    expect(cell?.value).toBeInstanceOf(Date);
    expect(cell?.numFmt).toBe('yyyy-mm-dd hh:mm');
    const custom = buildExcelWorkbook(
      { rows, columns },
      { dateTimeFormat: 'dd.mm.yyyy hh:mm' },
    );
    expect(custom.getWorksheet('Data')?.getCell('A2').numFmt).toBe(
      'dd.mm.yyyy hh:mm',
    );
  });

  it('freeze/outline/autoFilter can be switched off', () => {
    const sheet = buildExcelWorkbook(grouped(), {
      freezeHeader: false,
      freezeColumns: 0,
      outline: false,
      autoFilter: false,
    }).getWorksheet('Data');
    expect(sheet?.views ?? []).toHaveLength(0);
    expect(sheet?.getRow(4).outlineLevel ?? 0).toBe(0);
    expect(sheet?.autoFilter).toBeFalsy();
  });
});

describe('buildTreeExcelWorkbook (rich)', () => {
  it('outlines by depth and writes per-parent footers + the total', () => {
    const rows = [
      { name: 'Root', hours: 1 },
      { name: 'Child', hours: 2 },
    ];
    const columns: OgeExportColumn<(typeof rows)[number]>[] = [
      {
        caption: 'Name',
        field: 'name',
        dataType: 'string',
        accessor: (r) => r.name,
      },
      {
        caption: 'Hours',
        field: 'hours',
        dataType: 'number',
        accessor: (r) => r.hours,
      },
    ];
    const sheet = buildTreeExcelWorkbook(
      {
        rows,
        columns,
        levels: [0, 1],
        items: [
          { kind: 'data', row: rows[0], level: 0 },
          { kind: 'data', row: rows[1], level: 1 },
          {
            kind: 'groupFooter',
            level: 1,
            summaries: [{ field: 'hours', type: 'sum', value: 2, text: '2' }],
          },
          {
            kind: 'total',
            summaries: [{ field: 'hours', type: 'sum', value: 3, text: '3' }],
          },
        ],
      },
      { summaryFormulas: true },
    ).getWorksheet('Data');
    expect(sheet?.getRow(3).outlineLevel).toBe(1);
    // tree footers have no group header to anchor a range: values only
    expect(sheet?.getCell('B4').value).toBe(2);
    expect(sheet?.getCell('B5').value).toMatchObject({ result: 3 });
    expect(sheet?.autoFilter).toBeFalsy();
  });
});
