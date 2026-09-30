import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo source for the React pivot overview — mirror of
 * `../pivot-grid/overview-snippets.ts`. Pure data, no React imports.
 */
export const PIVOT_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Pivot grid',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-pivot': ['OgePivotGrid'] },
      types: {
        '@oge-ui/react-pivot': [
          'OgePivotCellClickEvent',
          'OgePivotFieldDef',
          'OgePivotGridHandle',
        ],
      },
      name: 'SalesPivot',
      before: `interface Sale {
  region: string;
  country: string;
  city: string;
  date: string;
  amount: number;
}

const sales: Sale[] = [
  { region: 'EMEA', country: 'Germany', city: 'Berlin', date: '2026-02-11', amount: 1249 },
  { region: 'EMEA', country: 'Türkiye', city: 'İzmir', date: '2026-05-02', amount: 890 },
  { region: 'APAC', country: 'Japan', city: 'Tokyo', date: '2025-11-19', amount: 2140 },
];

const money = (value: unknown): string =>
  Number(value).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

// four areas: row / column / data / filter
const fields: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  { dataField: 'country', area: 'row' },
  { dataField: 'city', area: 'row' },
  { dataField: 'date', area: 'column', groupInterval: 'year' },
  { dataField: 'amount', area: 'data', summaryType: 'sum', format: money },
];`,
      body: `const pivot = useRef<OgePivotGridHandle<Sale>>(null);

// every cell knows its coordinates — perfect for drill-down
const onDrillDown = (event: OgePivotCellClickEvent) => {
  const rows = pivot.current?.drillDown({
    rowPath: event.rowPath,
    columnPath: event.columnPath,
  });
  console.log(rows);
};`,
      jsx: `<OgePivotGrid
  ref={pivot}
  data={sales}
  fields={fields}
  onCellDblClick={onDrillDown}
/>`,
    }),
  },
];
