import type { OgeSimpleTableColumn } from '@oge-ui/behavior';

/** Demo data shared by the Angular and React simple table pages. */
export interface DemoOrderLine {
  sku: string;
  product: { name: string };
  qty: number;
  price: number;
  status: 'shipped' | 'pending' | 'backordered';
}

export const SIMPLE_TABLE_LINES: DemoOrderLine[] = [
  {
    sku: 'DSK-01',
    product: { name: 'Oak desk' },
    qty: 2,
    price: 420,
    status: 'shipped',
  },
  {
    sku: 'CHR-07',
    product: { name: 'Mesh office chair' },
    qty: 4,
    price: 260,
    status: 'pending',
  },
  {
    sku: 'LMP-12',
    product: { name: 'Desk lamp' },
    qty: 6,
    price: 45,
    status: 'backordered',
  },
  {
    sku: 'SHF-03',
    product: { name: 'Wall shelf' },
    qty: 3,
    price: 89,
    status: 'shipped',
  },
];

export const SIMPLE_TABLE_COLUMNS: OgeSimpleTableColumn[] = [
  { field: 'sku', caption: 'SKU', width: '7rem' },
  { field: 'product.name', caption: 'Product' },
  { field: 'qty', caption: 'Qty', align: 'end', width: '5rem' },
  { field: 'price', caption: 'Unit price', align: 'end' },
];

export interface DemoAuditEvent {
  at: string;
  user: string;
  action: string;
}

export const SIMPLE_TABLE_EVENTS: DemoAuditEvent[] = Array.from(
  { length: 12 },
  (_, i) => ({
    at: `09:${String(i * 4).padStart(2, '0')}`,
    user: ['ayse', 'mehmet', 'ali'][i % 3],
    action: ['signed in', 'exported a report', 'changed a role'][i % 3],
  }),
);

export const SIMPLE_TABLE_EVENT_COLUMNS: OgeSimpleTableColumn[] = [
  { field: 'at', caption: 'Time', width: '6rem' },
  { field: 'user', caption: 'User' },
  { field: 'action', caption: 'Action' },
];

/** The status badge both demo pages draw inside the product cell. */
export const SIMPLE_TABLE_DEMO_STYLES = `
  .demo-st-status {
    margin-inline-start: 8px;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--oge-accent-soft);
    color: var(--oge-accent);
    font-size: 0.85em;
  }
`;
