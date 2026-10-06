import { demoSource } from '../../shared/demo-source';

export const FUNNEL_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeFunnelChart'] },
  template: `<!-- Stages sized by value. The tooltip, the announcement and the sr
     table carry the conversion rates (share of the first and of the
     previous stage). Arrow keys walk the stages, Enter selects. -->
<oge-funnel-chart
  [dataSource]="pipeline"
  argumentField="stage"
  valueField="count"
  [neckWidth]="0.2"
  [label]="{ position: 'outside' }"
  title="Sales pipeline"
  style="height: 320px"
/>
<!-- a pyramid: apex on top, stage heights follow the values -->
<oge-funnel-chart
  [dataSource]="ages"
  argumentField="group"
  valueField="people"
  type="pyramid"
  algorithm="dynamicHeight"
  [sortData]="false"
  title="Population (thousands)"
  style="height: 320px"
/>`,
  body: `protected readonly pipeline = [
  { stage: 'Visits', count: 12400 },
  { stage: 'Sign-ups', count: 5120 },
  { stage: 'Trials', count: 2380 },
  { stage: 'Quotes', count: 1060 },
  { stage: 'Orders', count: 512 },
];

protected readonly ages = [
  { group: '0–14', people: 1650 },
  { group: '15–24', people: 1210 },
  { group: '25–44', people: 2480 },
  { group: '45–64', people: 2110 },
  { group: '65+', people: 1380 },
];`,
});

export const HEATMAP_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeHeatmap'] },
  types: { '@oge-ui/charts': ['OgeChartColorScale'] },
  template: `<!-- Category × category cells coloured through a colour scale — theme
     tokens or any CSS colours, blended with color-mix(). Arrow keys move
     the active cell (Home/End, Ctrl+Home/End, PageUp/PageDown too); screen
     readers get a real two-dimensional table. -->
<oge-heatmap
  [dataSource]="tickets"
  xField="hour"
  yField="day"
  valueField="tickets"
  title="Support tickets by hour"
  style="height: 340px"
/>
<!-- three stops make a diverging scale -->
<oge-heatmap
  [dataSource]="change"
  xField="quarter"
  yField="region"
  valueField="change"
  [colorScale]="diverging"
  [valueFormat]="signed"
  title="Change vs last year (%)"
  style="height: 260px"
/>`,
  body: `protected readonly tickets = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].flatMap((day, d) =>
  ['08', '10', '12', '14', '16', '18', '20', '22'].map((hour, h) => ({
    day,
    hour,
    tickets: Math.round(14 + 26 * Math.sin(((h + 1) / 8) * Math.PI) * (d < 5 ? 1 : 0.45) + ((d * 7 + h * 3) % 9)),
  })),
);

protected readonly change = ['North', 'East', 'South', 'West'].flatMap((region, r) =>
  ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter, q) => ({ region, quarter, change: ((r * 5 + q * 7) % 13) - 6 })),
);

protected readonly diverging: OgeChartColorScale = {
  min: -6,
  max: 6,
  colors: ['var(--oge-danger)', 'var(--oge-bg)', 'var(--oge-success)'],
};

protected readonly signed = (value: number) => (value > 0 ? \`+\${value}\` : String(value));`,
});

export const TREEMAP_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeTreemap'] },
  template: `<!-- Squarified tiles under group headers. Click a group (or press Enter)
     to drill into it; the breadcrumb or Escape goes back. [(rootKey)] is
     the drill state. -->
<oge-treemap
  [dataSource]="markets"
  valueField="sales"
  [(rootKey)]="root"
  title="Sales by market (M$)"
  style="height: 380px"
/>
<p>Current root: {{ root() || 'all markets' }}</p>`,
  body: `protected readonly root = signal('');

protected readonly markets = [
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
});

export const SUNBURST_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeSunburstChart'] },
  template: `<!-- Flat data works too: idField + parentField build the hierarchy.
     One ring per level; click a branch to re-root on it, click the centre
     to go back up. -->
<oge-sunburst-chart
  [dataSource]="org"
  parentField="parent"
  valueField="people"
  title="Headcount"
  style="height: 380px"
/>`,
  body: `protected readonly org = [
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
});

export const SANKEY_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeSankeyChart'] },
  types: { '@oge-ui/charts': ['OgeSankeyNode'] },
  template: `<!-- One item per flow. Columns come from the longest path, node heights
     from the throughput; hovering a node lights up its links. Keyboard:
     Up/Down within a column, Left/Right across columns. -->
<oge-sankey-chart
  [dataSource]="energy"
  [nodes]="nodes"
  title="Energy flows (TWh)"
  style="height: 380px"
/>`,
  body: `protected readonly energy = [
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
protected readonly nodes: OgeSankeyNode[] = [{ id: 'Losses', color: 'var(--oge-muted-color)' }];`,
});

export const MAP_SNIPPET = demoSource({
  use: { '@oge-ui/charts': ['OgeVectorMap'] },
  types: { '@oge-ui/charts': ['OgeGeoJsonFeatureCollection'] },
  template: `<!-- Any GeoJSON FeatureCollection of polygons — no tiles, no projection
     library. Values join the regions by key (feature.id, then
     properties.name). Wheel / pinch / the buttons zoom, drag pans; arrows
     move to the nearest region, + and - zoom, Shift+arrows pan. -->
<oge-vector-map
  [geoJson]="provinces"
  [dataSource]="sales"
  keyField="province"
  valueField="revenue"
  projection="mercator"
  title="Revenue by province"
  style="height: 420px"
/>`,
  body: `// load your own: this.http.get<OgeGeoJsonFeatureCollection>('/assets/regions.geo.json')
protected readonly provinces: OgeGeoJsonFeatureCollection = {
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

protected readonly sales = [
  { province: 'Northmark', revenue: 48 },
  { province: 'Fjordale', revenue: 85 },
  { province: 'Midvale', revenue: 22 },
];`,
});
