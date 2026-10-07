import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const SALES = `interface Sale {
  region: string;
  date: string;
  amount: number;
}

const sales: Sale[] = [
  { region: 'EMEA', date: '2026-02-11', amount: 1249 },
  { region: 'EMEA', date: '2026-05-02', amount: 890 },
  { region: 'APAC', date: '2025-11-19', amount: 2140 },
];`;

/**
 * Demo source for the React pivot analytics page — mirror of
 * `../pivot-grid/analytics-snippets.ts`. Pure data, no React imports.
 */
export const PIVOT_ANALYTICS_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Display modes',
    source: reactDemoSource({
      use: { '@oge-ui/react-pivot': ['OgePivotGrid'] },
      types: { '@oge-ui/react-pivot': ['OgePivotFieldDef'] },
      name: 'AnalyticsPivot',
      before: `${SALES}

const fields: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  // headerFormat writes the member headers (2026 → FY2026); on a
  // date-grouped field a date format names the bucket, e.g.
  // { type: 'date', pattern: 'MMMM' } for groupInterval: 'month'
  {
    dataField: 'date', area: 'column', groupInterval: 'year',
    headerFormat: { type: 'number', pattern: "'FY'0" },
  },

  // measures can post-process their values
  {
    dataField: 'amount', caption: '% of Column', area: 'data',
    summaryType: 'sum', summaryDisplayMode: 'percentOfColumnGrandTotal',
  },
  {
    dataField: 'amount', id: 'running', caption: 'Running', area: 'data',
    summaryType: 'sum', runningTotal: { direction: 'row' },
  },
];`,
      jsx: `<OgePivotGrid data={sales} fields={fields} />`,
    }),
  },
  {
    title: 'Persistence & export',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-pivot': ['OgePivotGrid'] },
      types: {
        '@oge-ui/react-pivot': ['OgePivotFieldDef', 'OgePivotGridHandle'],
      },
      name: 'SalesReport',
      before: `${SALES}

const fields: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  { dataField: 'amount', area: 'data', summaryType: 'sum' },
];`,
      body: `const pivot = useRef<OgePivotGridHandle<Sale>>(null);

// CSV ships in the package…
const exportCsv = () => pivot.current?.exportCsv('sales.csv');

// …Excel lives in a lazy entry point, so exceljs stays out of the bundle
const exportExcel = async () => {
  const { exportPivotToExcel } = await import('@oge-ui/react-pivot/export-excel');
  if (pivot.current) {
    await exportPivotToExcel(pivot.current, { filename: 'sales.xlsx' });
  }
};`,
      jsx: `<>
  {/* layout + expansion survive reloads via stateKey */}
  <OgePivotGrid ref={pivot} data={sales} fields={fields} stateKey="sales-report" />

  <button type="button" onClick={exportCsv}>CSV</button>
  <button type="button" onClick={exportExcel}>Excel</button>
</>`,
    }),
  },
  {
    title: 'RTL',
    source: reactDemoSource({
      use: { '@oge-ui/react-pivot': ['OgePivotGrid'] },
      types: { '@oge-ui/react-pivot': ['OgePivotFieldDef'] },
      name: 'RtlPivot',
      before: `interface Sale {
  region: string;
  country: string;
  date: string;
  amount: number;
}

const sales: Sale[] = [
  { region: 'EMEA', country: 'Germany', date: '2026-02-11', amount: 1249 },
  { region: 'EMEA', country: 'Türkiye', date: '2026-05-02', amount: 890 },
  { region: 'APAC', country: 'Japan', date: '2025-11-19', amount: 2140 },
];

const fields: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  { dataField: 'country', area: 'row' },
  { dataField: 'date', area: 'column', groupInterval: 'year' },
  { dataField: 'amount', area: 'data', summaryType: 'sum' },
];`,
      jsx: `<>
  {/* rtlEnabled (unset = follow the page's dir) mirrors the pivot: row
      headers on the right, collapsed chevrons pointing left, ArrowLeft /
      ArrowRight and Ctrl+Arrow chip moves swapped, menus opening leftwards. */}
  <OgePivotGrid data={sales} fields={fields} rtlEnabled />
</>`,
    }),
  },
];
