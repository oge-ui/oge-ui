import type { OgeTileLayoutItemData } from '@oge-ui/layout/tile-layout';

/** Demo data of the tile layout page, shared by the Angular and React views. */
export const TILE_DASHBOARD: readonly OgeTileLayoutItemData[] = [
  { key: 'revenue', title: 'Revenue', colSpan: 2 },
  { key: 'orders', title: 'Orders' },
  { key: 'visitors', title: 'Visitors' },
  { key: 'traffic', title: 'Traffic sources', colSpan: 2, rowSpan: 2 },
  { key: 'conversion', title: 'Conversion' },
  { key: 'refunds', title: 'Refunds' },
  { key: 'tickets', title: 'Open tickets', colSpan: 2 },
];

/** The figure and caption every dashboard tile shows. */
export const TILE_KPIS: Readonly<
  Record<string, { value: string; caption: string }>
> = {
  revenue: { value: '€ 48,210', caption: '+12% on last week' },
  orders: { value: '1,284', caption: '+4% on last week' },
  visitors: { value: '23,915', caption: '−2% on last week' },
  traffic: { value: '61% search', caption: '24% direct · 15% social' },
  conversion: { value: '3.4%', caption: 'Goal 3.0%' },
  refunds: { value: '18', caption: '0.9% of orders' },
  tickets: { value: '42', caption: '7 waiting for a reply' },
  notes: { value: '3 notes', caption: 'Pinned by the team' },
};

/** Tiles that may change their spans, with bounds. */
export const TILE_RESIZABLE: readonly OgeTileLayoutItemData[] = [
  { key: 'revenue', title: 'Revenue', colSpan: 2, maxColSpan: 3 },
  { key: 'orders', title: 'Orders', minColSpan: 1, maxRowSpan: 2 },
  { key: 'traffic', title: 'Traffic sources', resizable: 'horizontal' },
  { key: 'tickets', title: 'Open tickets', resizable: false },
];
