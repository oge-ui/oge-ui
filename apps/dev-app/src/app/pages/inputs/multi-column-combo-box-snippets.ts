import { demoSource } from '../../shared/demo-source';

const PRODUCTS = `interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

const PRODUCTS: Product[] = [
  { id: 1, sku: 'L-100', name: 'Desk lamp', category: 'Lighting', price: 49, stock: 12 },
  { id: 2, sku: 'C-200', name: 'Office chair', category: 'Seating', price: 249, stock: 0 },
  { id: 3, sku: 'M-300', name: 'Monitor arm', category: 'Accessories', price: 89, stock: 31 },
  { id: 4, sku: 'D-400', name: 'Standing desk', category: 'Desks', price: 699, stock: 4 },
  { id: 5, sku: 'K-500', name: 'Keyboard tray', category: 'Accessories', price: 39, stock: 57 },
];`;

export const MCCB_BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeMultiColumnComboBox'] },
  types: { '@oge-ui/inputs': ['OgeComboBoxColumn'] },
  before: PRODUCTS,
  template: `<oge-multi-column-combo-box
  label="Product"
  [items]="products"
  [columns]="columns"
  valueExpr="id"
  displayExpr="name"
  [showClearButton]="true"
  [(value)]="productId"
/>`,
  body: `protected readonly products = PRODUCTS;
protected readonly productId = signal<unknown>(3);
protected readonly columns: OgeComboBoxColumn<Product>[] = [
  { field: 'sku', caption: 'SKU', width: 80 },
  { field: 'name', width: 160 },
  { field: 'category', width: 120 },
  {
    field: 'price',
    width: 90,
    alignment: 'end',
    format: { style: 'currency', currency: 'EUR' },
    searchable: false,
  },
];`,
});

export const MCCB_TEMPLATES_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeMultiColumnComboBox'] },
  types: {
    '@oge-ui/inputs': ['OgeComboBoxColumn', 'OgeComboBoxCellTemplateContext'],
  },
  before: PRODUCTS,
  template: `<oge-multi-column-combo-box
  label="Product"
  [items]="products"
  [columns]="columns()"
  valueExpr="id"
  disabledExpr="soldOut"
  [(value)]="productId"
/>

<ng-template #stockCell let-value="value">
  <span [class.text-red-600]="value === 0">
    {{ value === 0 ? 'Sold out' : value + ' in stock' }}
  </span>
</ng-template>`,
  body: `protected readonly products = PRODUCTS.map((p) => ({
  ...p,
  soldOut: p.stock === 0,
}));
protected readonly productId = signal<unknown>(null);
private readonly stockCell =
  viewChild.required<TemplateRef<OgeComboBoxCellTemplateContext<Product>>>('stockCell');

/** A column's cellTemplate takes over the cell; it keeps its gridcell role. */
protected readonly columns = computed<OgeComboBoxColumn<Product>[]>(() => [
  { field: 'name', width: 160 },
  {
    field: 'stock',
    caption: 'Availability',
    width: 130,
    cellTemplate: this.stockCell(),
  },
  {
    field: 'price',
    width: 90,
    alignment: 'end',
    format: (value) => \`€\${Number(value).toFixed(2)}\`,
  },
]);`,
});

export const MCCB_MULTIPLE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeMultiColumnComboBox'] },
  types: { '@oge-ui/inputs': ['OgeComboBoxColumn'] },
  before: PRODUCTS,
  template: `<oge-multi-column-combo-box
  label="Bundle"
  [items]="products"
  [columns]="columns"
  valueExpr="id"
  displayExpr="name"
  selectionMode="multiple"
  [maxDisplayedTags]="2"
  [(value)]="bundle"
/>`,
  body: `protected readonly products = PRODUCTS;
protected readonly bundle = signal<unknown>([1, 3]);
protected readonly columns: OgeComboBoxColumn<Product>[] = [
  { field: 'sku', caption: 'SKU', width: 80 },
  { field: 'name', width: 160 },
  { field: 'price', width: 90, alignment: 'end', format: { style: 'currency', currency: 'EUR' } },
];`,
});

export const MCCB_REMOTE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeMultiColumnComboBox'] },
  helpers: { '@oge-ui/core': ['CustomDataSource'] },
  types: { '@oge-ui/inputs': ['OgeComboBoxColumn'] },
  before: `interface Account {
  id: number;
  code: string;
  name: string;
  city: string;
}

const ACCOUNTS: Account[] = Array.from({ length: 10000 }, (_, i) => ({
  id: i + 1,
  code: \`AC-\${String(i + 1).padStart(5, '0')}\`,
  name: \`Account \${i + 1}\`,
  city: ['Ankara', 'Berlin', 'Lisbon', 'Oslo'][i % 4],
}));`,
  template: `<oge-multi-column-combo-box
  label="Account"
  [dataSource]="accounts"
  [columns]="columns"
  valueExpr="id"
  displayExpr="name"
  [virtualScroll]="true"
  [pageSize]="50"
  [(value)]="accountId"
/>`,
  body: `protected readonly accountId = signal<unknown>(null);
protected readonly columns: OgeComboBoxColumn<Account>[] = [
  { field: 'code', width: 110 },
  { field: 'name', width: 150 },
  { field: 'city', width: 100 },
];

/** Paged on the server: skip/take + searchText, superseded requests aborted. */
protected readonly accounts = new CustomDataSource<Account>({
  key: 'id',
  load: async ({ skip = 0, take = 50, searchText }) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const term = (searchText ?? '').toLowerCase();
    const rows = ACCOUNTS.filter((a) =>
      [a.code, a.name, a.city].some((text) => text.toLowerCase().includes(term)),
    );
    return { data: rows.slice(skip, skip + take), totalCount: rows.length };
  },
});`,
});

export const MCCB_FORMS_SNIPPET = demoSource({
  use: {
    '@angular/forms/signals': ['FormField'],
    '@oge-ui/inputs': ['OgeMultiColumnComboBox'],
  },
  helpers: { '@angular/forms/signals': ['form', 'required'] },
  types: { '@oge-ui/inputs': ['OgeComboBoxColumn'] },
  before: PRODUCTS,
  template: `<oge-multi-column-combo-box
  label="Product"
  [items]="products"
  [columns]="columns"
  valueExpr="id"
  displayExpr="name"
  [formField]="order.productId"
/>`,
  body: `protected readonly products = PRODUCTS;
protected readonly columns: OgeComboBoxColumn<Product>[] = [
  { field: 'sku', caption: 'SKU', width: 80 },
  { field: 'name', width: 160 },
];
protected readonly model = signal<{ productId: number | null }>({ productId: null });
protected readonly order = form(this.model, (path) => required(path.productId));`,
});
