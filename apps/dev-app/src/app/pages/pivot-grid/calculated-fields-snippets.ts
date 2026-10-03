import { demoSource } from '../../shared/demo-source';

const SALES = `protected readonly sales = [
  { region: 'Europe', country: 'Germany', date: '2025-03-14', amount: 1249, units: 9 },
  { region: 'Europe', country: 'France', date: '2026-05-02', amount: 890, units: 4 },
  { region: 'Asia', country: 'Japan', date: '2025-11-19', amount: 2140, units: 12 },
  { region: 'Americas', country: 'USA', date: '2026-01-08', amount: 1730, units: 8 },
];`;

export const CALCULATED_SNIPPET = demoSource({
  use: {
    '@oge-ui/pivot': ['OgePivotCellTemplate', 'OgePivotField', 'OgePivotGrid'],
  },
  types: { '@oge-ui/pivot': ['OgePivotCalculatedField'] },
  template: `<oge-pivot-grid #pivot [data]="sales" [calculatedFields]="calculated">
  <oge-pivot-field dataField="region" area="row" />
  <oge-pivot-field dataField="date" caption="Year" area="column" groupInterval="year" />
  <oge-pivot-field dataField="amount" caption="Amount" area="data" summaryType="sum" />
  <oge-pivot-field dataField="units" caption="Units" area="data" summaryType="sum" />

  <!-- cell template: negative deltas in red -->
  <span *ogePivotCellTemplate="let cell" [style.color]="negative(cell) ? 'crimson' : null">
    {{ cell.text }}
  </span>
</oge-pivot-grid>

<button type="button" (click)="pdf()">PDF</button>`,
  body: `${SALES}

protected readonly calculated: OgePivotCalculatedField[] = [
  {
    name: 'avgPrice', caption: 'Avg price',
    // evaluated per cell — on totals too, so it stays sum(amount) / sum(units)
    expression: (v) => (v['units'] ? (v['amount'] ?? 0) / v['units'] : null),
    format: (value) => \`€\${Number(value).toFixed(2)}\`,
  },
  {
    name: 'share', caption: '% of total',
    expression: (v) => v['amount'] ?? null,
    displayMode: 'percentOfGrandTotal',
  },
  {
    name: 'delta', caption: 'Δ prev. year',
    expression: (v) => v['amount'] ?? null,
    displayMode: 'absoluteVariation', // difference from the previous column
  },
  {
    name: 'running', caption: 'Running',
    expression: (v) => v['amount'] ?? null,
    runningTotal: { direction: 'row' },
  },
];

protected readonly negative = (cell: { measureId: string; value: unknown }): boolean =>
  cell.measureId === 'delta' && Number(cell.value) < 0;

private readonly pivot = viewChild.required(OgePivotGrid);

// the grid's own cell text, headers repeated on every page, page numbers
protected async pdf(): Promise<void> {
  const { exportPivotToPdf } = await import('@oge-ui/pivot/export-pdf');
  await exportPivotToPdf(this.pivot(), { title: 'Sales', pageNumbers: true });
}`,
});

export const FILTERS_SNIPPET = demoSource({
  use: { '@oge-ui/pivot': ['OgePivotField', 'OgePivotGrid'] },
  template: `<!-- Top-N, label and value filters run before aggregation, so totals follow -->
<oge-pivot-grid [data]="sales" rowHeaderLayout="tabular">
  <oge-pivot-field dataField="region" area="row" />
  <oge-pivot-field dataField="country" area="row"
                   [topN]="{ count: 3, measure: 'amount' }"
                   [labelFilter]="{ operator: 'contains', value: 'a' }" />
  <oge-pivot-field dataField="date" caption="Year" area="column" groupInterval="year" />
  <oge-pivot-field dataField="amount" caption="Amount" area="data" summaryType="sum" />
</oge-pivot-grid>

<!-- value filter: keep the members whose total of a measure passes -->
<oge-pivot-grid [data]="sales" rowHeaderLayout="outline">
  <oge-pivot-field dataField="country" area="row"
                   [valueFilter]="{ measure: 'amount', operator: 'greaterThan', value: 1000 }" />
  <oge-pivot-field dataField="amount" area="data" summaryType="sum" />
</oge-pivot-grid>`,
  body: SALES,
});
