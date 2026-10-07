import { computePivot, pathKey, type PivotFieldConfig } from '@oge-ui/core';
import { buildPivotPdfDocument } from './export-pdf';
import { OgePivotGridCore } from './lib/pivot-grid-core';
import { OGE_DEFAULT_PIVOT_MESSAGES } from './lib/pivot-messages';
import { PLAIN_ADAPTER } from './lib/test-adapter';

interface Sale {
  region: string;
  city: string;
  year: number;
  amount: number;
  cost: number;
}

const SALES: Sale[] = [
  { region: 'EU', city: 'Berlin', year: 2024, amount: 100, cost: 60 },
  { region: 'EU', city: 'Paris', year: 2025, amount: 70, cost: 30 },
  { region: 'US', city: 'NYC', year: 2025, amount: 300, cost: 100 },
];

const FIELDS: PivotFieldConfig[] = [
  { id: 'region', dataField: 'region', area: 'row', areaIndex: 0 },
  { id: 'city', dataField: 'city', area: 'row', areaIndex: 1 },
  { id: 'year', dataField: 'year', area: 'column', areaIndex: 0 },
  { id: 'amount', dataField: 'amount', area: 'data', caption: 'Amount' },
  { id: 'cost', dataField: 'cost', area: 'data', caption: 'Cost' },
];

const RESULT = computePivot({
  rows: SALES,
  fields: FIELDS,
  rowExpandedPaths: new Set([pathKey(['EU'])]),
});

interface AutoTableDoc {
  lastAutoTable?: { head: unknown[]; body: unknown[]; columns: unknown[] };
}

const textOf = (doc: { output(): string }): string =>
  JSON.stringify(doc.output());

describe('buildPivotPdfDocument', () => {
  it('writes the spanning headers, measure captions and the row lines', () => {
    const doc = buildPivotPdfDocument(RESULT, { title: 'Sales' });
    const table = (doc as unknown as AutoTableDoc).lastAutoTable;
    // year row + measure-caption row
    expect(table?.head).toHaveLength(2);
    // corner + 3 column slots (2024, 2025, grand) × 2 measures
    expect(table?.columns).toHaveLength(7);
    const text = textOf(doc);
    expect(text).toContain('Sales');
    expect(text).toContain('Grand Total');
    expect(text).toContain('Berlin');
    expect(text).toContain('Cost');
  });

  it('uses the grid text, the tabular layout and customizeCell', () => {
    const doc = buildPivotPdfDocument(RESULT, {
      rowHeaderLayout: 'tabular',
      rowFieldCaptions: ['Region', 'City'],
      cellText: (r, c, m) => `<${String(r)}.${String(c)}.${String(m)}>`,
      customizeCell: (cell) => {
        if (cell.rowIndex === 0 && cell.columnIndex === 0) cell.text = 'FIRST';
      },
      pageNumbers: true,
    });
    const table = (doc as unknown as AutoTableDoc).lastAutoTable;
    expect(table?.columns).toHaveLength(8); // two label columns now
    const text = textOf(doc);
    expect(text).toContain('Region');
    expect(text).toContain('City');
    expect(text).toContain('FIRST');
    expect(text).toContain('<1.1.1>');
    expect(text).toContain('1 / 1');
  });

  it('writes member headers through the fields’ headerFormat', () => {
    const core = new OgePivotGridCore<Sale>(PLAIN_ADAPTER, {
      inputs: {
        data: () => SALES,
        fields: () => [
          {
            dataField: 'region',
            area: 'row',
            headerFormat: (value) => `Region ${String(value)}`,
          },
          {
            dataField: 'year',
            area: 'column',
            headerFormat: { type: 'number', pattern: "'FY'0" },
          },
          { dataField: 'amount', area: 'data' },
        ],
        virtualScrolling: () => false,
        showRowTotals: () => true,
        showColumnTotals: () => true,
        showRowGrandTotals: () => true,
        showColumnGrandTotals: () => true,
        messages: () => OGE_DEFAULT_PIVOT_MESSAGES,
        customizeCell: () => undefined,
        fieldChooser: () => ({}),
        locale: () => 'en-US',
      },
    });
    const text = textOf(buildPivotPdfDocument(core.result()));
    expect(text).toContain('Region EU');
    expect(text).toContain('FY2024');
  });
});
