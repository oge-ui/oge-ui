import { describe, expect, it } from 'vitest';
import {
  buildPdfDocument,
  buildTreePdfDocument,
  ogePdfCellStyles,
} from './export-pdf';
import { buildOgeExportItems } from './lib/grid/grid-export';
import type { OgeExportColumn } from './lib/grid/grid-options';

interface Sale {
  region: string;
  amount: number;
}

const ROWS: Sale[] = Array.from({ length: 120 }, (_, i) => ({
  region: i % 2 ? 'EU' : 'US',
  amount: i,
}));

const COLUMNS: OgeExportColumn<Sale>[] = [
  {
    caption: 'Region',
    field: 'region',
    dataType: 'string',
    accessor: (r) => r.region,
    width: 200,
  },
  {
    caption: 'Amount',
    field: 'amount',
    dataType: 'number',
    accessor: (r) => r.amount,
    width: 100,
    alignment: 'end',
    bandCaption: 'Figures',
  },
];

interface AutoTableDoc {
  lastAutoTable?: {
    finalY: number;
    columns: { width: number }[];
    head: unknown[];
  };
}

const outputOf = (doc: { output(): string }): string =>
  JSON.stringify(doc.output());

describe('buildPdfDocument (rich)', () => {
  it('writes group rows, summaries and a banded header', () => {
    const doc = buildPdfDocument({
      rows: ROWS.slice(0, 4),
      columns: COLUMNS,
      items: buildOgeExportItems(ROWS.slice(0, 4), {
        groups: [{ field: 'region' }],
        groupSummary: [{ field: 'amount', type: 'sum' }],
        groupFooterFields: new Set(['amount']),
        totalSummary: [{ field: 'amount', type: 'sum' }],
        summaryText: (s) => `Total ${String(s.value)}`,
        groupText: (g) => `Region ${String(g.value)}`,
      }),
    });
    const table = (doc as unknown as AutoTableDoc).lastAutoTable;
    expect(table?.head).toHaveLength(2);
    const text = outputOf(doc);
    expect(text).toContain('Figures');
    expect(text).toContain('Region US');
    expect(text).toContain('Total 6'); // 0 + 1 + 2 + 3
  });

  it('fits grid widths to the page in proportion', () => {
    const doc = buildPdfDocument({ rows: ROWS.slice(0, 2), columns: COLUMNS });
    const table = (doc as unknown as AutoTableDoc).lastAutoTable;
    const [a, b] = table?.columns.map((column) => column.width) ?? [];
    expect(a / b).toBeCloseTo(2, 1);
    const printable = doc.internal.pageSize.getWidth() - 28;
    expect(a + b).toBeCloseTo(printable, 0);
  });

  it('repeats the header and draws page numbers + header text on every page', () => {
    const doc = buildPdfDocument(
      { rows: ROWS, columns: COLUMNS },
      {
        orientation: 'portrait',
        pageHeader: ({ pageNumber }) => `Report p${pageNumber}`,
        pageFooter: ({ pageNumber, pageCount }) =>
          `Page ${pageNumber} of ${pageCount}`,
      },
    );
    const pages = doc.getNumberOfPages();
    expect(pages).toBeGreaterThan(1);
    const text = outputOf(doc);
    expect(text).toContain(`Page ${pages} of ${pages}`);
    expect(text).toContain('Report p2');
    // the head is drawn once per page
    expect(text.split('(Region)').length - 1).toBe(pages);
  });

  it('applies cellStyle and customizeCell styles', () => {
    const seen: string[] = [];
    const doc = buildPdfDocument(
      { rows: ROWS.slice(0, 2), columns: COLUMNS },
      {
        cellStyle: ({ kind }) => {
          seen.push(kind);
          return undefined;
        },
        customizeCell: ({ field, text, style }) => {
          if (style && field === 'amount') style.color = '#ff0000';
          return field === 'region' ? text.toLowerCase() : undefined;
        },
        pageNumbers: true,
      },
    );
    expect(seen).toContain('header');
    expect(seen).toContain('data');
    const text = outputOf(doc);
    expect(text).toContain('(us)');
    expect(text).toContain('1 / 1');
  });

  it('maps styles to autotable styles', () => {
    expect(
      ogePdfCellStyles({
        bold: true,
        italic: true,
        alignment: 'end',
        background: '#eeeeee',
        border: true,
      }),
    ).toMatchObject({
      fontStyle: 'bolditalic',
      halign: 'right',
      fillColor: '#eeeeee',
      lineWidth: 0.2,
    });
  });
});

describe('buildTreePdfDocument', () => {
  it('indents by tree level and prints the tree rows', () => {
    const rows = [
      { name: 'Root', hours: 1 },
      { name: 'Leaf', hours: 2 },
    ];
    const doc = buildTreePdfDocument({
      rows,
      levels: [0, 1],
      columns: [
        {
          caption: 'Name',
          field: 'name',
          dataType: 'string',
          accessor: (r) => r.name,
        },
      ],
    });
    const text = outputOf(doc);
    expect(text).toContain('Root');
    expect(text).toContain('Leaf');
  });
});
