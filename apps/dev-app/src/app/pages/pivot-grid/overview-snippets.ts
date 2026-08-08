import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/pivot': ['OgePivotField', 'OgePivotGrid'] },
  types: { '@oge-ui/pivot': ['OgePivotCellClickEvent'] },
  template: `<oge-pivot-grid #pivot [data]="sales" (cellDblClick)="onDrillDown($event)">
  <!-- four areas: row / column / data / filter -->
  <oge-pivot-field dataField="region" area="row" />
  <oge-pivot-field dataField="country" area="row" />
  <oge-pivot-field dataField="city" area="row" />
  <oge-pivot-field dataField="date" area="column" groupInterval="year" />
  <oge-pivot-field dataField="amount" area="data" summaryType="sum" [format]="money" />
</oge-pivot-grid>`,
  body: `protected readonly sales = [
  { region: 'EMEA', country: 'Germany', city: 'Berlin', date: '2026-02-11', amount: 1249 },
  { region: 'EMEA', country: 'Türkiye', city: 'İzmir', date: '2026-05-02', amount: 890 },
  { region: 'APAC', country: 'Japan', city: 'Tokyo', date: '2025-11-19', amount: 2140 },
];

private readonly pivot = viewChild.required(OgePivotGrid);

protected readonly money = (value: unknown): string =>
  Number(value).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

// every cell knows its coordinates — perfect for drill-down
protected onDrillDown(event: OgePivotCellClickEvent): void {
  const rows = this.pivot().drillDown({
    rowPath: event.rowPath,
    columnPath: event.columnPath,
  });
  console.log(rows);
}`,
});
