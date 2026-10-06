// Demo data of the "Funnel, heatmap & flows" page — shared by the Angular and
// the React demos so both layers render the same charts.
import type {
  OgeChartColorScale,
  OgeGeoJsonFeature,
  OgeGeoJsonFeatureCollection,
  OgeSankeyNode,
} from '@oge-ui/charts';

export const PIPELINE = [
  { stage: 'Visits', count: 12400 },
  { stage: 'Sign-ups', count: 5120 },
  { stage: 'Trials', count: 2380 },
  { stage: 'Quotes', count: 1060 },
  { stage: 'Orders', count: 512 },
];

export const AGE_GROUPS = [
  { group: '0–14', people: 1650 },
  { group: '15–24', people: 1210 },
  { group: '25–44', people: 2480 },
  { group: '45–64', people: 2110 },
  { group: '65+', people: 1380 },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['08', '10', '12', '14', '16', '18', '20', '22'];

/** Support tickets per weekday and hour — a smooth, deterministic surface. */
export const TICKETS = DAYS.flatMap((day, d) =>
  HOURS.map((hour, h) => ({
    day,
    hour,
    tickets: Math.round(
      14 +
        26 * Math.sin(((h + 1) / HOURS.length) * Math.PI) * (d < 5 ? 1 : 0.45) +
        ((d * 7 + h * 3) % 9),
    ),
  })),
);

/** Year-over-year change per region and quarter — a diverging scale. */
export const CHANGE = ['North', 'East', 'South', 'West'].flatMap((region, r) =>
  ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter, q) => ({
    region,
    quarter,
    change: ((r * 5 + q * 7) % 13) - 6,
  })),
);

export const CHANGE_SCALE: OgeChartColorScale = {
  min: -6,
  max: 6,
  colors: ['var(--oge-danger)', 'var(--oge-bg)', 'var(--oge-success)'],
};

export const MARKETS = [
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
  {
    name: 'Africa',
    items: [
      { name: 'South Africa', sales: 29 },
      { name: 'Egypt', sales: 18 },
    ],
  },
];

/** A flat org (`id` / `parent`) — headcount per team. */
export const ORG = [
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
];

/** Energy flows (TWh). */
export const ENERGY = [
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

export const ENERGY_NODES: OgeSankeyNode[] = [
  { id: 'Losses', color: 'var(--oge-muted-color)' },
];

/*
 * A fictional country of twelve provinces. The borders are generated from a
 * jittered lattice, so neighbours share their edges exactly — the same
 * shape GeoJSON from a real topology has.
 */
const COLS = 4;
const ROWS = 3;
const lattice = (c: number, r: number): [number, number] => {
  const jitter = (n: number): number =>
    ((Math.sin(n * 12.9898) * 43758.5453) % 1) * 0.9;
  const edge = c === 0 || r === 0 || c === COLS || r === ROWS;
  const lon = 6 + c * 3.2 + (edge ? 0 : jitter(c * 31 + r * 17));
  const lat = 56 - r * 2.6 + (edge ? 0 : jitter(c * 7 + r * 13));
  return [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100];
};
/** A wavy edge between two lattice points (shared by both neighbours). */
const edgePoints = (
  a: [number, number],
  b: [number, number],
  seed: number,
): [number, number][] => {
  const mid: [number, number] = [
    Math.round(((a[0] + b[0]) / 2 + Math.sin(seed) * 0.35) * 100) / 100,
    Math.round(((a[1] + b[1]) / 2 + Math.cos(seed) * 0.3) * 100) / 100,
  ];
  return [a, mid];
};
const PROVINCES = [
  'Northmark',
  'Fjordale',
  'Highcrest',
  'Eastwatch',
  'Westmoor',
  'Midvale',
  'Riverbend',
  'Stonegate',
  'Southreach',
  'Lakeshire',
  'Ambergrove',
  'Sunholm',
];

export const PROVINCE_GEO: OgeGeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: PROVINCES.map((name, index): OgeGeoJsonFeature => {
    const c = index % COLS;
    const r = Math.floor(index / COLS);
    const tl = lattice(c, r);
    const tr = lattice(c + 1, r);
    const br = lattice(c + 1, r + 1);
    const bl = lattice(c, r + 1);
    // each edge is generated from its own seed, walked in either direction
    const top = edgePoints(tl, tr, c * 3 + r * 11 + 1);
    const right = edgePoints(tr, br, (c + 1) * 5 + r * 7 + 2);
    const bottomForward = edgePoints(bl, br, c * 3 + (r + 1) * 11 + 1);
    const leftForward = edgePoints(tl, bl, c * 5 + r * 7 + 2);
    const ring: [number, number][] = [
      ...top,
      ...right,
      br,
      bottomForward[1],
      bl,
      leftForward[1],
      tl,
    ];
    return {
      type: 'Feature',
      id: name,
      properties: { name },
      geometry: { type: 'Polygon', coordinates: [ring] },
    };
  }),
};

export const PROVINCE_SALES = PROVINCES.map((name, index) => ({
  province: name,
  revenue: index === 6 ? null : 20 + ((index * 37) % 80),
}));
