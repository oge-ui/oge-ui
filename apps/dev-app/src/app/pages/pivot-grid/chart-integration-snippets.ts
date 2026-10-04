import { demoSource } from '../../shared/demo-source';

const SALES = `protected readonly sales = [
  { region: 'Europe', country: 'Germany', date: '2025-03-14', amount: 1249 },
  { region: 'Europe', country: 'France', date: '2026-05-02', amount: 890 },
  { region: 'Asia', country: 'Japan', date: '2025-11-19', amount: 2140 },
  { region: 'Americas', country: 'USA', date: '2026-01-08', amount: 1730 },
];`;

export const CHART_SNIPPET = demoSource({
  use: {
    '@oge-ui/pivot': ['OgePivotField', 'OgePivotGrid'],
    '@oge-ui/charts': ['OgeChart'],
  },
  types: { '@oge-ui/pivot': ['OgePivotChartData', 'OgePivotCellClickEvent'] },
  template: `<!-- the pivot does not depend on the charts package: the app binds the two -->
<oge-pivot-grid #pivot [data]="sales"
                (resultChange)="refresh()" (cellClick)="select($event)">
  <oge-pivot-field dataField="region" area="row" />
  <oge-pivot-field dataField="country" area="row" />
  <oge-pivot-field dataField="date" caption="Year" area="column" groupInterval="year" />
  <oge-pivot-field dataField="amount" caption="Amount" area="data" summaryType="sum" />
</oge-pivot-grid>

<oge-chart [dataSource]="chart().dataSource" [series]="chart().series" style="height: 320px" />`,
  body: `${SALES}

private readonly pivot = viewChild.required(OgePivotGrid);
private readonly selected = signal<number[] | undefined>(undefined);
protected readonly chart = signal<OgePivotChartData<'bar'>>({ dataSource: [], series: [] });

// rows × measures of the current view: expand a region and the chart follows
protected refresh(): void {
  this.chart.set(
    this.pivot().getChartData({ type: 'bar', argumentIndexes: this.selected() }),
  );
}

// a clicked row narrows the chart to it; click the grand total to reset
protected select(event: OgePivotCellClickEvent): void {
  const rows = this.pivot().getResult().rowRoot;
  const flat = rows.flatMap(function walk(node): typeof rows {
    return [node, ...node.children.flatMap(walk)];
  });
  const line = flat.find(
    (node) => JSON.stringify(node.path) === JSON.stringify(event.rowPath),
  );
  this.selected.set(line && !line.isGrandTotal ? [line.leafIndex] : undefined);
  this.refresh();
}`,
});
