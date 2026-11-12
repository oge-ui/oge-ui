/** Code samples rendered on the DevExtreme migration guide. */

export const GRID = `<!-- DevExtreme -->
<dx-data-grid [dataSource]="orders" keyExpr="id">
  <dxo-filter-row [visible]="true" />
  <dxo-paging [pageSize]="20" />
  <dxi-column dataField="customer" caption="Customer" />
  <dxi-column dataField="total" dataType="number" format="currency" />
</dx-data-grid>

<!-- OGE: nested option elements become inputs -->
<oge-grid [data]="orders" keyField="id" [filterRow]="true" [paging]="{ pageSize: 20 }">
  <oge-column field="customer" caption="Customer" />
  <oge-column field="total" dataType="number" [format]="{ type: 'currency', currency: 'EUR' }" />
</oge-grid>`;

export const DATA_SOURCE = `// DevExtreme: CustomStore + loadOptions (filter as nested arrays)
const store = new CustomStore({ key: 'id', load: (o) => api.get('/orders', o) });

// OGE: CustomDataSource + LoadOptions (filter as a typed FilterExpr tree)
const orders = new CustomDataSource<Order>({
  key: 'id',
  load: (options) => api.post('/orders/query', options),
  // the header filter's value list
  distinct: (field, options) => api.post(\`/orders/distinct/\${field}\`, options),
});`;
