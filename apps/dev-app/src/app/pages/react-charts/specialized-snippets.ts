import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Funnel, heatmap & flows" page. Pure data, no
 * React imports. Section-for-section mirror of
 * `../charts/specialized-snippets.ts` (controlled `rootKey` instead of
 * `[(rootKey)]`).
 */
export const CHARTS_SPECIALIZED_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Funnel & pyramid',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeFunnelChart'] },
      name: 'Funnels',
      before: `const pipeline = [
  { stage: 'Visits', count: 12400 },
  { stage: 'Sign-ups', count: 5120 },
  { stage: 'Trials', count: 2380 },
  { stage: 'Quotes', count: 1060 },
  { stage: 'Orders', count: 512 },
];

const ages = [
  { group: '0–14', people: 1650 },
  { group: '15–24', people: 1210 },
  { group: '25–44', people: 2480 },
  { group: '45–64', people: 2110 },
  { group: '65+', people: 1380 },
];`,
      jsx: `// Stages sized by value; the tooltip, the announcement and the sr table
// carry the conversion rates. Arrow keys walk the stages, Enter selects.
<>
  <OgeFunnelChart
    dataSource={pipeline}
    argumentField="stage"
    valueField="count"
    neckWidth={0.2}
    label={{ position: 'outside' }}
    title="Sales pipeline"
    style={{ height: 320 }}
  />
  <OgeFunnelChart
    dataSource={ages}
    argumentField="group"
    valueField="people"
    type="pyramid"
    algorithm="dynamicHeight"
    sortData={false}
    title="Population (thousands)"
    style={{ height: 320 }}
  />
</>`,
    }),
  },
  {
    title: 'Heatmap',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeHeatmap'] },
      types: { '@oge-ui/react-charts': ['OgeChartColorScale'] },
      name: 'Heatmaps',
      before: `const tickets = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].flatMap((day, d) =>
  ['08', '10', '12', '14', '16', '18', '20', '22'].map((hour, h) => ({
    day,
    hour,
    tickets: Math.round(14 + 26 * Math.sin(((h + 1) / 8) * Math.PI) * (d < 5 ? 1 : 0.45) + ((d * 7 + h * 3) % 9)),
  })),
);

const change = ['North', 'East', 'South', 'West'].flatMap((region, r) =>
  ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter, q) => ({ region, quarter, change: ((r * 5 + q * 7) % 13) - 6 })),
);

// three stops make a diverging scale; theme tokens follow the theme
const diverging: OgeChartColorScale = {
  min: -6,
  max: 6,
  colors: ['var(--oge-danger)', 'var(--oge-bg)', 'var(--oge-success)'],
};

const signed = (value: number) => (value > 0 ? \`+\${value}\` : String(value));`,
      jsx: `// Focus the grid: arrows move the active cell (Home/End, Ctrl+Home/End,
// PageUp/PageDown too); screen readers get a real two-dimensional table.
<>
  <OgeHeatmap
    dataSource={tickets}
    xField="hour"
    yField="day"
    valueField="tickets"
    title="Support tickets by hour"
    style={{ height: 340 }}
  />
  <OgeHeatmap
    dataSource={change}
    xField="quarter"
    yField="region"
    valueField="change"
    colorScale={diverging}
    valueFormat={signed}
    title="Change vs last year (%)"
    style={{ height: 260 }}
  />
</>`,
    }),
  },
  {
    title: 'Treemap',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeTreemap'] },
      react: ['useState'],
      name: 'Treemap',
      before: `const markets = [
  {
    name: 'Americas',
    items: [
      { name: 'United States', sales: 412 },
      { name: 'Canada', sales: 96 },
      { name: 'Brazil', sales: 88 },
      { name: 'Mexico', sales: 61 },
    ],
  },
  {
    name: 'Europe',
    items: [
      { name: 'Germany', sales: 184 },
      { name: 'United Kingdom', sales: 151 },
      { name: 'France', sales: 120 },
      { name: 'Spain', sales: 64 },
      { name: 'Türkiye', sales: 58 },
    ],
  },
  {
    name: 'Asia Pacific',
    items: [
      { name: 'Japan', sales: 163 },
      { name: 'Australia', sales: 77 },
      { name: 'India', sales: 70 },
      { name: 'Singapore', sales: 34 },
    ],
  },
  { name: 'Africa', items: [{ name: 'South Africa', sales: 29 }, { name: 'Egypt', sales: 18 }] },
];`,
      body: `const [root, setRoot] = useState('');`,
      jsx: `// Click a group (or press Enter) to drill in; the breadcrumb or Escape
// goes back. rootKey + onRootKeyChange is the drill state.
<>
  <OgeTreemap
    dataSource={markets}
    valueField="sales"
    rootKey={root}
    onRootKeyChange={setRoot}
    title="Sales by market (M$)"
    style={{ height: 380 }}
  />
  <p>Current root: {root || 'all markets'}</p>
</>`,
    }),
  },
  {
    title: 'Sunburst',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeSunburstChart'] },
      name: 'Sunburst',
      before: `// flat data: idField + parentField build the hierarchy
const org = [
  { id: 'eng', parent: null, name: 'Engineering' },
  { id: 'web', parent: 'eng', name: 'Web', people: 18 },
  { id: 'mobile', parent: 'eng', name: 'Mobile', people: 11 },
  { id: 'platform', parent: 'eng', name: 'Platform' },
  { id: 'infra', parent: 'platform', name: 'Infrastructure', people: 9 },
  { id: 'data', parent: 'platform', name: 'Data', people: 7 },
  { id: 'sales', parent: null, name: 'Sales' },
  { id: 'emea', parent: 'sales', name: 'EMEA', people: 12 },
  { id: 'amer', parent: 'sales', name: 'Americas', people: 14 },
  { id: 'ops', parent: null, name: 'Operations' },
  { id: 'support', parent: 'ops', name: 'Support', people: 10 },
  { id: 'finance', parent: 'ops', name: 'Finance', people: 5 },
];`,
      jsx: `// One ring per level; click a branch to re-root on it, the centre to go up.
<OgeSunburstChart
  dataSource={org}
  parentField="parent"
  valueField="people"
  title="Headcount"
  style={{ height: 380 }}
/>`,
    }),
  },
  {
    title: 'Sankey diagram',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeSankeyChart'] },
      types: { '@oge-ui/react-charts': ['OgeSankeyNode'] },
      name: 'Sankey',
      before: `const energy = [
  { source: 'Solar', target: 'Electricity', value: 42 },
  { source: 'Wind', target: 'Electricity', value: 58 },
  { source: 'Gas', target: 'Electricity', value: 64 },
  { source: 'Gas', target: 'Heat', value: 38 },
  { source: 'Coal', target: 'Electricity', value: 27 },
  { source: 'Oil', target: 'Transport', value: 92 },
  { source: 'Electricity', target: 'Homes', value: 71 },
  { source: 'Electricity', target: 'Industry', value: 84 },
  { source: 'Electricity', target: 'Transport', value: 18 },
  { source: 'Electricity', target: 'Losses', value: 18 },
  { source: 'Heat', target: 'Homes', value: 26 },
  { source: 'Heat', target: 'Industry', value: 12 },
];

// optional per-node settings: a label or a colour
const nodes: OgeSankeyNode[] = [{ id: 'Losses', color: 'var(--oge-muted-color)' }];`,
      jsx: `// Hover a node to light up its links; the keyboard walks nodes Up/Down
// within a column and Left/Right across columns.
<OgeSankeyChart
  dataSource={energy}
  nodes={nodes}
  title="Energy flows (TWh)"
  style={{ height: 380 }}
/>`,
    }),
  },
  {
    title: 'Vector map',
    source: reactDemoSource({
      use: { '@oge-ui/react-charts': ['OgeVectorMap'] },
      types: { '@oge-ui/react-charts': ['OgeGeoJsonFeatureCollection'] },
      name: 'VectorMap',
      before: `// load your own GeoJSON with fetch('/regions.geo.json')
const provinces: OgeGeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'Northmark',
      properties: { name: 'Northmark' },
      geometry: { type: 'Polygon', coordinates: [[[6, 56], [9.2, 56], [9.6, 53.4], [6, 53.4], [6, 56]]] },
    },
    {
      type: 'Feature',
      id: 'Fjordale',
      properties: { name: 'Fjordale' },
      geometry: { type: 'Polygon', coordinates: [[[9.2, 56], [12.4, 56], [12.4, 53.4], [9.6, 53.4], [9.2, 56]]] },
    },
    {
      type: 'Feature',
      id: 'Midvale',
      properties: { name: 'Midvale' },
      geometry: { type: 'Polygon', coordinates: [[[6, 53.4], [12.4, 53.4], [12.4, 50.8], [6, 50.8], [6, 53.4]]] },
    },
  ],
};

const sales = [
  { province: 'Northmark', revenue: 48 },
  { province: 'Fjordale', revenue: 85 },
  { province: 'Midvale', revenue: 22 },
];`,
      jsx: `// Wheel / pinch / the buttons zoom, drag pans; arrows move to the nearest
// region, + and - zoom, Shift+arrows pan.
<OgeVectorMap
  geoJson={provinces}
  dataSource={sales}
  keyField="province"
  valueField="revenue"
  projection="mercator"
  title="Revenue by province"
  style={{ height: 420 }}
/>`,
    }),
  },
];
