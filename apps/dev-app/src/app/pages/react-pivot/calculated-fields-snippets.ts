import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const SALE = `interface Sale {
  region: string;
  country: string;
  date: string;
  amount: number;
  units: number;
}

declare const sales: Sale[];`;

/**
 * Demo sources for the React calculated-fields page — mirror of
 * `../pivot-grid/calculated-fields-snippets.ts`. Pure data, no React imports.
 */
export const PIVOT_CALCULATED_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Calculated measures',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-pivot': ['OgePivotGrid'] },
      types: {
        '@oge-ui/react-pivot': [
          'OgePivotCalculatedField',
          'OgePivotFieldDef',
          'OgePivotGridHandle',
        ],
      },
      name: 'CalculatedMeasures',
      before: `${SALE}

const fields: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  { dataField: 'date', caption: 'Year', area: 'column', groupInterval: 'year' },
  { dataField: 'amount', caption: 'Amount', area: 'data', summaryType: 'sum' },
  { dataField: 'units', caption: 'Units', area: 'data', summaryType: 'sum' },
];

const calculated: OgePivotCalculatedField[] = [
  {
    name: 'avgPrice', caption: 'Avg price',
    // evaluated per cell — on totals too, so it stays sum(amount) / sum(units)
    expression: (v) => (v['units'] ? (v['amount'] ?? 0) / v['units'] : null),
    format: (value) => \`€\${Number(value).toFixed(2)}\`,
  },
  { name: 'share', caption: '% of total', expression: (v) => v['amount'] ?? null, displayMode: 'percentOfGrandTotal' },
  // difference from the previous column
  { name: 'delta', caption: 'Δ prev. year', expression: (v) => v['amount'] ?? null, displayMode: 'absoluteVariation' },
  { name: 'running', caption: 'Running', expression: (v) => v['amount'] ?? null, runningTotal: { direction: 'row' } },
];`,
      body: `const pivot = useRef<OgePivotGridHandle<Sale>>(null);

// the grid's own cell text, headers repeated on every page, page numbers
const pdf = async () => {
  const { exportPivotToPdf } = await import('@oge-ui/react-pivot/export-pdf');
  if (pivot.current) await exportPivotToPdf(pivot.current, { title: 'Sales', pageNumbers: true });
};`,
      jsx: `<>
  <button type="button" onClick={() => void pdf()}>PDF</button>
  <OgePivotGrid
    ref={pivot}
    data={sales}
    fields={fields}
    calculatedFields={calculated}
    renderCell={(cell) => (
      <span style={{ color: cell.measureId === 'delta' && Number(cell.value) < 0 ? 'crimson' : undefined }}>
        {cell.text}
      </span>
    )}
  />
</>`,
    }),
  },
  {
    title: 'Member filters & row-header layouts',
    source: reactDemoSource({
      use: { '@oge-ui/react-pivot': ['OgePivotGrid'] },
      types: { '@oge-ui/react-pivot': ['OgePivotFieldDef'] },
      name: 'FilteredPivot',
      before: `${SALE}

// Top-N, label and value filters run before aggregation, so totals follow
const fields: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  {
    dataField: 'country', area: 'row',
    topN: { count: 3, measure: 'amount' },
    labelFilter: { operator: 'contains', value: 'a' },
    // valueFilter: { measure: 'amount', operator: 'greaterThan', value: 1000 },
  },
  { dataField: 'date', caption: 'Year', area: 'column', groupInterval: 'year' },
  { dataField: 'amount', caption: 'Amount', area: 'data', summaryType: 'sum' },
];`,
      jsx: `<OgePivotGrid data={sales} fields={fields} rowHeaderLayout="tabular" />`,
    }),
  },
];
