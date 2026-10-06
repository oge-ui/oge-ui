// Demo data of the "Gauges & sparklines" page — shared by the Angular and
// the React demos so both layers show exactly the same charts.
import type { OgeChartValueRange } from '@oge-ui/charts';

export const SPEED_RANGES: OgeChartValueRange[] = [
  { start: 0, end: 90, label: 'Normal' },
  { start: 90, end: 120, label: 'Fast' },
  { start: 120, end: 160, label: 'Over the limit' },
];

export const CPU_RANGES: OgeChartValueRange[] = [
  { start: 0, end: 70, color: 'var(--oge-success)', label: 'Healthy' },
  { start: 70, end: 90, color: 'var(--oge-warning)', label: 'Busy' },
  { start: 90, end: 100, color: 'var(--oge-danger)', label: 'Saturated' },
];

export const TANK_RANGES: OgeChartValueRange[] = [
  { start: 0, end: 15, color: 'var(--oge-danger)', label: 'Refill' },
];

export const REVENUE_BANDS: OgeChartValueRange[] = [
  { start: 0, end: 150, label: 'Poor' },
  { start: 150, end: 225, label: 'Satisfactory' },
  { start: 225, end: 300, label: 'Good' },
];

export interface BulletRow {
  readonly kpi: string;
  readonly value: number;
  readonly target: number;
  readonly ranges: OgeChartValueRange[];
}

export const BULLET_ROWS: BulletRow[] = [
  { kpi: 'Revenue (k$)', value: 270, target: 250, ranges: REVENUE_BANDS },
  {
    kpi: 'Profit (%)',
    value: 22,
    target: 27,
    ranges: [
      { start: 0, end: 20 },
      { start: 20, end: 25 },
      { start: 25, end: 30 },
    ],
  },
  {
    kpi: 'New customers',
    value: 1650,
    target: 2100,
    ranges: [
      { start: 0, end: 1400 },
      { start: 1400, end: 2000 },
      { start: 2000, end: 2500 },
    ],
  },
];

export interface StockRow {
  readonly symbol: string;
  readonly price: number;
  readonly week: number[];
  readonly results: number[];
}

export const STOCK_ROWS: StockRow[] = [
  {
    symbol: 'ACME',
    price: 182.4,
    week: [171, 174, 173, 178, 176, 181, 182],
    results: [1, 1, -1, 1, -1, 1, 1],
  },
  {
    symbol: 'GLOBX',
    price: 64.1,
    week: [70, 69, 66, 67, 65, 63, 64],
    results: [-1, -1, -1, 1, -1, -1, 1],
  },
  {
    symbol: 'INITECH',
    price: 23.9,
    week: [22, 22.5, 23, 22.8, 23.4, 23.7, 23.9],
    results: [1, 1, 1, -1, 1, 1, 1],
  },
  {
    symbol: 'UMBRA',
    price: 9.3,
    week: [11, 10.2, 9.8, 10.4, 9.1, 9.0, 9.3],
    results: [-1, -1, -1, 1, -1, -1, 1],
  },
];
