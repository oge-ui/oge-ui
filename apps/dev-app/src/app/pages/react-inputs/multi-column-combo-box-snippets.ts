import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const PRODUCTS = `interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

const products: Product[] = [
  { id: 1, sku: 'L-100', name: 'Desk lamp', category: 'Lighting', price: 49, stock: 12 },
  { id: 2, sku: 'C-200', name: 'Office chair', category: 'Seating', price: 249, stock: 0 },
  { id: 3, sku: 'M-300', name: 'Monitor arm', category: 'Accessories', price: 89, stock: 31 },
  { id: 4, sku: 'D-400', name: 'Standing desk', category: 'Desks', price: 699, stock: 4 },
  { id: 5, sku: 'K-500', name: 'Keyboard tray', category: 'Accessories', price: 39, stock: 57 },
];`;

/**
 * Demo sources for the React multi-column combo box page — section-for-section
 * mirror of `../inputs/multi-column-combo-box.ts`. Pure data, no React imports.
 */
export const INPUTS_MCCB_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basic usage',
    description:
      'Give it columns — field (dot-notation), caption, width and format — plus the select box mapping. Typing searches every searchable column by its formatted text.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeMultiColumnComboBox'] },
      types: { '@oge-ui/react-inputs': ['OgeComboBoxColumn'] },
      before: `${PRODUCTS}

const columns: OgeComboBoxColumn<Product>[] = [
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
      name: 'MultiColumnComboBoxBasicDemo',
      body: `const [productId, setProductId] = useState<unknown>(3);`,
      jsx: `<OgeMultiColumnComboBox<Product>
  label="Product"
  items={products}
  columns={columns}
  valueExpr="id"
  displayExpr="name"
  showClearButton
  value={productId}
  onValueChange={setProductId}
/>`,
    }),
  },
  {
    title: 'Cell templates & formats',
    description:
      "A column's renderCell takes over the cell (it keeps its gridcell role); format also accepts a function of the raw value and the row. disabledExpr makes rows inert.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeMultiColumnComboBox'] },
      types: { '@oge-ui/react-inputs': ['OgeComboBoxColumn'] },
      before: `${PRODUCTS}

const stock = products.map((p) => ({ ...p, soldOut: p.stock === 0 }));

const columns: OgeComboBoxColumn<Product>[] = [
  { field: 'name', width: 160 },
  {
    field: 'stock',
    caption: 'Availability',
    width: 130,
    renderCell: (_item, { value }) => (
      <span style={{ color: value === 0 ? '#dc2626' : undefined }}>
        {value === 0 ? 'Sold out' : \`\${String(value)} in stock\`}
      </span>
    ),
  },
  {
    field: 'price',
    width: 90,
    alignment: 'end',
    format: (value) => \`€\${Number(value).toFixed(2)}\`,
  },
];`,
      name: 'MultiColumnComboBoxTemplatesDemo',
      body: `const [productId, setProductId] = useState<unknown>(null);`,
      jsx: `<OgeMultiColumnComboBox
  label="Product"
  items={stock}
  columns={columns}
  valueExpr="id"
  disabledExpr="soldOut"
  value={productId}
  onValueChange={setProductId}
/>`,
    }),
  },
  {
    title: 'Multiple selection',
    description:
      'selectionMode="multiple" makes the value an array, renders removable chips (Backspace removes the last one), keeps the popup open while picking and sets aria-multiselectable.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeMultiColumnComboBox'] },
      types: { '@oge-ui/react-inputs': ['OgeComboBoxColumn'] },
      before: `${PRODUCTS}

const columns: OgeComboBoxColumn<Product>[] = [
  { field: 'sku', caption: 'SKU', width: 80 },
  { field: 'name', width: 160 },
  { field: 'price', width: 90, alignment: 'end', format: { style: 'currency', currency: 'EUR' } },
];`,
      name: 'MultiColumnComboBoxMultipleDemo',
      body: `const [bundle, setBundle] = useState<unknown>([1, 3]);`,
      jsx: `<OgeMultiColumnComboBox<Product>
  label="Bundle"
  items={products}
  columns={columns}
  valueExpr="id"
  displayExpr="name"
  selectionMode="multiple"
  maxDisplayedTags={2}
  value={bundle}
  onValueChange={setBundle}
/>`,
    }),
  },
  {
    title: 'Remote data',
    description:
      '10,000 accounts behind a CustomDataSource: dataSource pages 50 rows at a time as the virtual window scrolls, sends the typed text as searchText (debounced, superseded requests aborted) and caches each search.',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-inputs': ['OgeMultiColumnComboBox'],
        '@oge-ui/core': ['CustomDataSource'],
      },
      types: { '@oge-ui/react-inputs': ['OgeComboBoxColumn'] },
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
}));

const columns: OgeComboBoxColumn<Account>[] = [
  { field: 'code', width: 110 },
  { field: 'name', width: 150 },
  { field: 'city', width: 100 },
];

const accounts = new CustomDataSource<Account>({
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
      name: 'MultiColumnComboBoxRemoteDemo',
      body: `const [accountId, setAccountId] = useState<unknown>(null);`,
      jsx: `<OgeMultiColumnComboBox<Account>
  label="Account"
  dataSource={accounts}
  columns={columns}
  valueExpr="id"
  displayExpr="name"
  virtualScroll
  pageSize={50}
  value={accountId}
  onValueChange={setAccountId}
/>`,
    }),
  },
  {
    title: 'Forms',
    description:
      'Inside <OgeForm> or standalone with the controlled value pair; required, errors and touched flow through the shared field chrome.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeMultiColumnComboBox'] },
      types: { '@oge-ui/react-inputs': ['OgeComboBoxColumn'] },
      before: `${PRODUCTS}

const columns: OgeComboBoxColumn<Product>[] = [
  { field: 'sku', caption: 'SKU', width: 80 },
  { field: 'name', width: 160 },
];`,
      name: 'MultiColumnComboBoxFormsDemo',
      body: `const [productId, setProductId] = useState<unknown>(null);
const [touched, setTouched] = useState(false);`,
      jsx: `<OgeMultiColumnComboBox<Product>
  label="Product"
  items={products}
  columns={columns}
  valueExpr="id"
  displayExpr="name"
  required
  touched={touched}
  errors={productId == null ? [{ kind: 'required' }] : []}
  onBlur={() => setTouched(true)}
  value={productId}
  onValueChange={setProductId}
/>`,
    }),
  },
];
