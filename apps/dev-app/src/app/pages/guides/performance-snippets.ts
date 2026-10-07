/** Code samples rendered on the performance guide. */
import { demoSource } from '../../shared/demo-source';
import { reactDemoSource } from '../../shared/react-demo-source';

export const VIRTUAL = demoSource({
  use: { '@oge-ui/grid': ['OgeGrid', 'OgeColumn'] },
  before: `interface Reading {
  id: number;
  sensor: string;
  value: number;
}`,
  template: `<!-- a bounded height is what gives the virtualizer a viewport -->
<oge-grid
  [data]="rows"
  keyField="id"
  [scrolling]="{ mode: 'virtual', columnRenderingMode: 'virtual' }"
  [rowHeight]="32"
  [overscan]="10"
  style="height: 560px"
>
  <oge-column field="id" caption="Id" [width]="90" dataType="number" />
  <oge-column field="sensor" caption="Sensor" [width]="160" />
  <oge-column field="value" caption="Value" [width]="120" dataType="number" />
</oge-grid>`,
  body: `// 100 000 rows: only the rows in view (plus overscan) are in the DOM
protected readonly rows: Reading[] = Array.from({ length: 100_000 }, (_, i) => ({
  id: i + 1,
  sensor: 'S-' + (i % 250),
  value: Math.round(Math.sin(i) * 1000) / 10,
}));`,
});

export const VIRTUAL_REACT = reactDemoSource({
  react: ['useMemo'],
  use: { '@oge-ui/react-grid': ['OgeGrid'] },
  name: 'Readings',
  before: `const columns = [
  { field: 'id', caption: 'Id', width: 90, dataType: 'number' as const },
  { field: 'sensor', caption: 'Sensor', width: 160 },
  { field: 'value', caption: 'Value', width: 120, dataType: 'number' as const },
];`,
  body: `// 100 000 rows: only the rows in view (plus overscan) are in the DOM
const rows = useMemo(
  () =>
    Array.from({ length: 100_000 }, (_, i) => ({
      id: i + 1,
      sensor: 'S-' + (i % 250),
      value: Math.round(Math.sin(i) * 1000) / 10,
    })),
  [],
);`,
  jsx: `<div style={{ height: 560 }}>
  <OgeGrid
    data={rows}
    keyField="id"
    columns={columns}
    scrolling={{ mode: 'virtual', columnRenderingMode: 'virtual' }}
    rowHeight={32}
    overscan={10}
  />
</div>`,
});

export const GRID_DEFAULTS = `// app-wide defaults instead of per-grid inputs
import { ApplicationConfig } from '@angular/core';
import { provideOgeGridConfig } from '@oge-ui/grid';

export const appConfig: ApplicationConfig = {
  providers: [provideOgeGridConfig({ rowHeight: 32, overscan: 8, filterDebounce: 250 })],
};`;

export const REMOTE = demoSource({
  use: { '@oge-ui/grid': ['OgeGrid', 'OgeColumn'] },
  helpers: { '@oge-ui/core': ['CustomDataSource'] },
  types: { '@oge-ui/core': ['LoadResult'] },
  before: `interface Order {
  id: number;
  customer: string;
  total: number;
}`,
  template: `<oge-grid [data]="orders" keyField="id" [paging]="{ pageSize: 50 }" [filterRow]="true">
  <oge-column field="id" caption="Order" dataType="number" />
  <oge-column field="customer" caption="Customer" />
  <oge-column field="total" caption="Total" dataType="number" />
</oge-grid>`,
  body: `// the server sorts, filters, groups and pages; the grid sends one query per change
// and aborts the previous request when a newer one starts
protected readonly orders = new CustomDataSource<Order>({
  key: 'id',
  load: async ({ signal, ...query }) => {
    const response = await fetch('/api/orders/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(query), // { skip, take, sort, filter, searchText, … }
      signal,
    });
    return (await response.json()) as LoadResult<Order>;
  },
});`,
});

export const DEFERRED = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- the scheduler's code loads when the block scrolls into view -->
@defer (on viewport) {
  <oge-scheduler [dataSource]="appointments" [currentDate]="date" style="height: 560px" />
} @placeholder {
  <div style="height: 560px">Calendar</div>
}`,
  body: `protected readonly date = new Date(2026, 9, 5);
protected readonly appointments = [
  { id: 1, text: 'Design review', startDate: new Date(2026, 9, 6, 9), endDate: new Date(2026, 9, 6, 10) },
];`,
});

export const LAZY_EXPORT = `// exceljs loads with this chunk, on the first click — not with the grid
async exportOrders(grid: OgeGrid<Order>): Promise<void> {
  const { exportGridToExcel } = await import('@oge-ui/grid/export-excel');
  await exportGridToExcel(grid, { filename: 'orders.xlsx', scope: 'all' });
}`;

export const ENTRY_POINTS = `// one editor, not the whole inputs family
import { OgeSelectBox } from '@oge-ui/inputs/select-box';
import { OgeSplitter } from '@oge-ui/layout/splitter';
import { OgeFab } from '@oge-ui/buttons/fab';`;
