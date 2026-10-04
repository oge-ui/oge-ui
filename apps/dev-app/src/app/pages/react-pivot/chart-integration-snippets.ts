import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo source for the React pivot chart-integration page — mirror of
 * `../pivot-grid/chart-integration-snippets.ts`. Pure data, no React imports.
 */
export const PIVOT_CHART_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Pivot + chart',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: {
        '@oge-ui/react-pivot': ['OgePivotGrid'],
        '@oge-ui/react-charts': ['OgeChart'],
      },
      types: {
        '@oge-ui/react-pivot': [
          'OgePivotChartData',
          'OgePivotFieldDef',
          'OgePivotGridHandle',
        ],
      },
      name: 'PivotWithChart',
      before: `interface Sale {
  region: string;
  country: string;
  date: string;
  amount: number;
}

declare const sales: Sale[];

const fields: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  { dataField: 'country', area: 'row' },
  { dataField: 'date', caption: 'Year', area: 'column', groupInterval: 'year' },
  { dataField: 'amount', caption: 'Amount', area: 'data', summaryType: 'sum' },
];`,
      body: `const pivot = useRef<OgePivotGridHandle<Sale>>(null);
const [chart, setChart] = useState<OgePivotChartData<'bar'>>({ dataSource: [], series: [] });

// the pivot does not depend on the charts package: the app binds the two —
// rows × measures of the current view, re-read whenever the view changes
const refresh = () => {
  if (pivot.current) setChart(pivot.current.getChartData({ type: 'bar' }));
};`,
      jsx: `<>
  <OgePivotGrid ref={pivot} data={sales} fields={fields} onResultChange={refresh} />
  <OgeChart dataSource={chart.dataSource} series={chart.series} style={{ height: 320 }} />
</>`,
    }),
  },
];
