/** Code samples rendered on the AG Grid migration guide. */

export const COLUMNS = `// AG Grid: columnDefs objects
columnDefs: ColDef<Order>[] = [
  { field: 'id', headerName: 'Id', width: 80, pinned: 'left' },
  { field: 'customer', filter: true, sortable: true },
  { headerName: 'Total', valueGetter: (p) => p.data!.qty * p.data!.price,
    valueFormatter: (p) => money(p.value) },
];

<!-- OGE: <oge-column> children (or the same objects through [columns]) -->
<oge-grid [data]="orders" keyField="id" [filterRow]="true">
  <oge-column field="id" caption="Id" [width]="80" pinned="left" />
  <oge-column field="customer" />
  <oge-column caption="Total" [calculateCellValue]="total" [format]="money" />
</oge-grid>`;

export const SERVER = `// AG Grid: the server-side row model calls getRows({ request }) with
// startRow / endRow / sortModel / filterModel
// OGE: a data source receives one LoadOptions object — the same in memory and on the server
const orders = new CustomDataSource<Order>({
  key: 'id',
  load: (options) => api.post('/orders/query', options), // skip, take, sort, filter, group, summaries
  distinct: (field, options) => api.post(\`/orders/distinct/\${field}\`, options),
});`;

export const RENDERER = `// AG Grid: a cell renderer component registered per column
{ field: 'status', cellRenderer: StatusBadge }

<!-- OGE: a template, with the row and value in context -->
<oge-column field="status">
  <span *ogeCellTemplate="let value" class="status" [attr.data-status]="value">
    {{ value }}
  </span>
</oge-column>`;

export const API = `// AG Grid: gridApi.setFilterModel / getColumnState / applyColumnState
this.gridApi.setFilterModel({ customer: { type: 'contains', filter: 'kaya' } });
const saved = this.gridApi.getColumnState();

// OGE: one serializable snapshot for sort, filters, grouping and the column layout
const saved = this.grid().state();
this.grid().applyState(saved);
// or persist automatically: <oge-grid stateKey="orders" />`;
