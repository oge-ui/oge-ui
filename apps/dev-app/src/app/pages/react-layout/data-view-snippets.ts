import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React data view page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain
 * Node.
 *
 * Section-for-section mirror of `../layout/data-view.ts`
 * (`docs/REACT-PARITY.md`): same six sections, same order, same example
 * content; the Angular template slots arrive as the `renderItem` /
 * `renderListItem` / `renderEmpty` render props and the toolbar slot as the
 * `toolbar` prop.
 */
const PRODUCTS = `interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  inStock: boolean;
}

const products: Product[] = [
  { id: 1, name: 'Oak desk', category: 'Furniture', price: 420, rating: 4.6, inStock: true },
  { id: 2, name: 'Mesh office chair', category: 'Furniture', price: 260, rating: 4.4, inStock: true },
  { id: 3, name: 'Desk lamp', category: 'Lighting', price: 45, rating: 4.1, inStock: false },
  { id: 4, name: 'Wall shelf', category: 'Storage', price: 89, rating: 3.9, inStock: true },
  { id: 5, name: 'Wool rug', category: 'Textiles', price: 150, rating: 4.8, inStock: true },
  { id: 6, name: 'Floor lamp', category: 'Lighting', price: 120, rating: 4.2, inStock: true },
];

function Tile({ item }: { item: Product }) {
  return (
    <>
      <p className="category">{item.category}</p>
      <h3>{item.name}</h3>
      <p>
        {item.price} USD · ★ {item.rating}
      </p>
    </>
  );
}`;

export const LAYOUT_DATA_VIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basics & templates',
    description:
      'Pass items and a renderItem render prop; without one an item shows its displayExpr (or its title / name field). Without selection the view is a list of listitems, so links and buttons inside an item stay in the Tab order.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeDataView'] },
      name: 'DataViewBasicsDemo',
      before: PRODUCTS,
      jsx: `<OgeDataView
  items={products}
  ariaLabel="Products"
  renderItem={({ item }) => <Tile item={item} />}
/>`,
    }),
  },
  {
    title: 'Grid and list layouts',
    description:
      'showLayoutSwitch renders a toggle-button group (aria-pressed) bound to layout. Grid columns are auto-fill cells of at least minItemWidth px, resolved by a container query on the view itself; the list layout may use its own renderListItem.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeDataView'] },
      types: { '@oge-ui/react-layout': ['OgeDataViewLayout'] },
      name: 'DataViewLayoutDemo',
      before: PRODUCTS,
      body: `const [layout, setLayout] = useState<OgeDataViewLayout>('grid');`,
      jsx: `<>
  <OgeDataView
    items={products}
    layout={layout}
    onLayoutChange={setLayout}
    showLayoutSwitch
    minItemWidth={200}
    ariaLabel="Products by layout"
    renderItem={({ item }) => <Tile item={item} />}
    renderListItem={({ item }) => (
      <span>
        <strong>{item.name}</strong> — {item.category}, {item.price} USD
      </span>
    )}
  />
  <p>Layout: {layout}</p>
</>`,
    }),
  },
  {
    title: 'Paging',
    description:
      'pageSize turns paging on and the view renders its own pager: previous / next, a numeric window with ellipses and the range text. Focus stays on the pressed button and the page is announced. For the full OgePagination bar, control pageIndex and set showPager={false}.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeDataView'] },
      name: 'DataViewPagingDemo',
      before: PRODUCTS,
      body: `const [page, setPage] = useState(0);`,
      jsx: `<>
  <OgeDataView
    items={products}
    pageSize={2}
    pageIndex={page}
    onPageIndexChange={setPage}
    ariaLabel="Paged products"
    onPageChanged={(e) => console.log('page', e.previousPageIndex, '→', e.pageIndex)}
    renderItem={({ item }) => <Tile item={item} />}
  />
  <p>Page {page + 1}</p>
</>`,
    }),
  },
  {
    title: 'Sorting, search & filtering',
    description:
      'The search folds case and accents over searchExpr and announces the result count; sortOptions fill a native select with a direction toggle (collator for text, numbers numerically, empty values last); filter is a plain predicate hook.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeDataView'] },
      types: { '@oge-ui/react-layout': ['OgeDataViewSort'] },
      name: 'DataViewSortDemo',
      before: `${PRODUCTS}

const sortOptions = [
  { field: 'name', label: 'Name' },
  { field: 'price', label: 'Price' },
  { field: 'rating', label: 'Rating' },
];
const inStock = (product: Product) => product.inStock;`,
      body: `const [inStockOnly, setInStockOnly] = useState(false);
const [sort, setSort] = useState<OgeDataViewSort | null>({ field: 'price', direction: 'asc' });`,
      jsx: `<>
  <label>
    <input
      type="checkbox"
      checked={inStockOnly}
      onChange={(e) => setInStockOnly(e.target.checked)}
    />
    In stock only
  </label>
  <OgeDataView
    items={products}
    searchEnabled
    searchExpr={['name', 'category']}
    sortOptions={sortOptions}
    sort={sort}
    onSortChange={setSort}
    filter={inStockOnly ? inStock : null}
    ariaLabel="Searchable products"
    renderItem={({ item }) => <Tile item={item} />}
  />
</>`,
    }),
  },
  {
    title: 'Selection',
    description:
      'With selectionMode the view is an APG listbox with one tab stop: arrows in reading order (mirrored in RTL), Up / Down by the measured column count, Home / End, PageUp / PageDown, Space / Enter toggle, Ctrl+A selects all. Options are leaves, so keep renderItem free of buttons and links.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeDataView'] },
      types: { '@oge-ui/react-layout': ['OgeDataViewKey'] },
      name: 'DataViewSelectionDemo',
      before: PRODUCTS,
      body: `const [selected, setSelected] = useState<OgeDataViewKey[]>([2]);`,
      jsx: `<>
  <OgeDataView
    items={products}
    selectionMode="multiple"
    selectedKeys={selected}
    onSelectedKeysChange={setSelected}
    ariaLabel="Pick products"
    renderItem={({ item }) => <Tile item={item} />}
  />
  <p>Selected: {selected.join(', ') || 'none'}</p>
</>`,
    }),
  },
  {
    title: 'Remote operations',
    description:
      'With remoteOperations the view neither sorts, searches nor pages: it calls onOptionsChanged (sort, search text, page, page size) and renders items as the current page of itemCount; loading marks the items aria-busy and draws skeleton tiles while there is nothing to show.',
    source: reactDemoSource({
      react: ['useCallback', 'useEffect', 'useState'],
      use: {
        '@oge-ui/react-layout': ['OgeDataView'],
        '@oge-ui/behavior': ['ogeDataViewProcess'],
      },
      types: { '@oge-ui/react-layout': ['OgeDataViewOptionsChangedEvent'] },
      name: 'DataViewRemoteDemo',
      before: PRODUCTS,
      body: `const [page, setPage] = useState<Product[]>([]);
const [total, setTotal] = useState(0);
const [loading, setLoading] = useState(false);

// stands in for an HTTP call: the "server" filters, sorts and slices
const load = useCallback((options: OgeDataViewOptionsChangedEvent) => {
  setLoading(true);
  setTimeout(() => {
    const all = ogeDataViewProcess(products, {
      searchValue: options.searchValue,
      searchExpr: ['name', 'category'],
      sort: options.sort,
    });
    const start = options.pageIndex * options.pageSize;
    setPage(all.slice(start, start + options.pageSize));
    setTotal(all.length);
    setLoading(false);
  }, 400);
}, []);

useEffect(() => {
  load({ sort: null, searchValue: '', pageIndex: 0, pageSize: 3 });
}, [load]);`,
      jsx: `<OgeDataView
  items={page}
  itemCount={total}
  pageSize={3}
  remoteOperations
  loading={loading}
  searchEnabled
  sortOptions={[{ field: 'name', label: 'Name' }, { field: 'price', label: 'Price' }]}
  ariaLabel="Server products"
  onOptionsChanged={load}
  renderItem={({ item }) => <Tile item={item} />}
/>`,
    }),
  },
];
