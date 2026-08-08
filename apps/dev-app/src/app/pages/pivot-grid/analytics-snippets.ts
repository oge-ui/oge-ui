import { demoSource } from '../../shared/demo-source';

const SALES = `protected readonly sales = [
  { region: 'EMEA', date: '2026-02-11', amount: 1249 },
  { region: 'EMEA', date: '2026-05-02', amount: 890 },
  { region: 'APAC', date: '2025-11-19', amount: 2140 },
];`;

export const ANALYTICS_SNIPPET = demoSource({
  use: { '@oge-ui/pivot': ['OgePivotField', 'OgePivotGrid'] },
  template: `<oge-pivot-grid [data]="sales">
  <oge-pivot-field dataField="region" area="row" />
  <oge-pivot-field dataField="date" area="column" groupInterval="year" />

  <!-- measures can post-process their values -->
  <oge-pivot-field
    dataField="amount" caption="% of Column" area="data"
    summaryType="sum" summaryDisplayMode="percentOfColumnGrandTotal" />
  <oge-pivot-field
    dataField="amount" caption="Running" area="data"
    summaryType="sum" [runningTotal]="{ direction: 'row' }" />
</oge-pivot-grid>`,
  body: SALES,
});

export const EXPORT_SNIPPET = demoSource({
  use: { '@oge-ui/pivot': ['OgePivotField', 'OgePivotGrid'] },
  template: `<!-- layout + expansion survive reloads via stateKey -->
<oge-pivot-grid #pivot [data]="sales" stateKey="sales-report">
  <oge-pivot-field dataField="region" area="row" />
  <oge-pivot-field dataField="amount" area="data" summaryType="sum" />
</oge-pivot-grid>

<button type="button" (click)="exportCsv()">CSV</button>
<button type="button" (click)="exportExcel()">Excel</button>`,
  body: `${SALES}

private readonly pivot = viewChild.required(OgePivotGrid);

// CSV ships in the package…
protected exportCsv(): void {
  this.pivot().exportCsv('sales.csv');
}

// …Excel lives in a lazy secondary entry, so exceljs stays out of the bundle
protected async exportExcel(): Promise<void> {
  const { exportPivotToExcel } = await import('@oge-ui/pivot/export-excel');
  await exportPivotToExcel(this.pivot(), { filename: 'sales.xlsx' });
}`,
});
