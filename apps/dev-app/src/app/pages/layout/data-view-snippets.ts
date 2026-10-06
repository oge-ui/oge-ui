import { demoSource } from '../../shared/demo-source';

const PRODUCT_TYPE = `interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  inStock: boolean;
}`;

const PRODUCTS = `protected readonly products: Product[] = [
  { id: 1, name: 'Oak desk', category: 'Furniture', price: 420, rating: 4.6, inStock: true },
  { id: 2, name: 'Mesh office chair', category: 'Furniture', price: 260, rating: 4.4, inStock: true },
  { id: 3, name: 'Desk lamp', category: 'Lighting', price: 45, rating: 4.1, inStock: false },
  { id: 4, name: 'Wall shelf', category: 'Storage', price: 89, rating: 3.9, inStock: true },
  { id: 5, name: 'Wool rug', category: 'Textiles', price: 150, rating: 4.8, inStock: true },
  { id: 6, name: 'Floor lamp', category: 'Lighting', price: 120, rating: 4.2, inStock: true },
];`;

const TILE = `<ng-template ogeDataViewItemTemplate let-item>
    <p class="category">{{ item.category }}</p>
    <h3>{{ item.name }}</h3>
    <p>{{ item.price }} USD · ★ {{ item.rating }}</p>
  </ng-template>`;

export const BASICS_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeDataView', 'OgeDataViewItemTemplate'],
  },
  before: PRODUCT_TYPE,
  template: `<!-- Without selection the view is a list of listitems: templates may
     hold links and buttons, which stay in the Tab order. Columns follow
     the view's own width (a container query), never the window. -->
<oge-data-view [items]="products" ariaLabel="Products">
  ${TILE}
</oge-data-view>`,
  body: PRODUCTS,
});

export const LAYOUT_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': [
      'OgeDataView',
      'OgeDataViewItemTemplate',
      'OgeDataViewListItemTemplate',
    ],
  },
  types: { '@oge-ui/layout': ['OgeDataViewLayout'] },
  before: PRODUCT_TYPE,
  template: `<!-- The switch is a real toggle-button group (aria-pressed). minItemWidth
     sets the narrowest cell before another column fits; the list layout
     can render its own row template. -->
<oge-data-view
  [items]="products"
  [(layout)]="layout"
  [showLayoutSwitch]="true"
  [minItemWidth]="200"
  ariaLabel="Products by layout"
>
  ${TILE}
  <ng-template ogeDataViewListItemTemplate let-item>
    <strong>{{ item.name }}</strong> — {{ item.category }}, {{ item.price }} USD
  </ng-template>
</oge-data-view>
<p>Layout: {{ layout() }}</p>`,
  body: `protected readonly layout = signal<OgeDataViewLayout>('grid');
${PRODUCTS}`,
});

export const PAGING_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeDataView', 'OgeDataViewItemTemplate'],
  },
  types: { '@oge-ui/layout': ['OgeDataViewPageChangedEvent'] },
  before: PRODUCT_TYPE,
  template: `<!-- pageSize turns paging on; the built-in pager keeps focus on the
     button you pressed and announces "Page 2 of 3". For the full
     oge-pagination bar, bind it to [(pageIndex)] and set showPager=false. -->
<oge-data-view
  [items]="products"
  [pageSize]="2"
  [(pageIndex)]="page"
  ariaLabel="Paged products"
  (pageChanged)="onPage($event)"
>
  ${TILE}
</oge-data-view>
<p>Page {{ page() + 1 }}</p>`,
  body: `protected readonly page = signal(0);
${PRODUCTS}

protected onPage(event: OgeDataViewPageChangedEvent): void {
  console.log('page', event.previousPageIndex, '→', event.pageIndex);
}`,
});

export const SORT_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeDataView', 'OgeDataViewItemTemplate'],
  },
  types: { '@oge-ui/layout': ['OgeDataViewSort', 'OgeDataViewSortOption'] },
  before: PRODUCT_TYPE,
  template: `<!-- Search folds case and accents ("eclair" finds "Éclair"); the sort
     compares text with the locale's collator and numbers numerically.
     filter is a plain predicate hook. -->
<label>
  <input type="checkbox" (change)="inStockOnly.set($any($event.target).checked)" />
  In stock only
</label>
<oge-data-view
  [items]="products"
  [searchEnabled]="true"
  [searchExpr]="['name', 'category']"
  [sortOptions]="sortOptions"
  [(sort)]="sort"
  [filter]="inStockOnly() ? inStock : null"
  ariaLabel="Searchable products"
>
  ${TILE}
</oge-data-view>`,
  body: `protected readonly inStockOnly = signal(false);
protected readonly sort = signal<OgeDataViewSort | null>({ field: 'price', direction: 'asc' });
protected readonly sortOptions: OgeDataViewSortOption[] = [
  { field: 'name', label: 'Name' },
  { field: 'price', label: 'Price' },
  { field: 'rating', label: 'Rating' },
];
protected readonly inStock = (product: Product) => product.inStock;
${PRODUCTS}`,
});

export const SELECTION_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeDataView', 'OgeDataViewItemTemplate'],
  },
  types: { '@oge-ui/layout': ['OgeDataViewKey'] },
  before: PRODUCT_TYPE,
  template: `<!-- With selection the view is an APG listbox: one tab stop, arrows in
     reading order (mirrored in RTL), Up/Down by a row, Space/Enter toggle,
     Ctrl+A selects all. Options are leaves — keep the template free of
     buttons and links. -->
<oge-data-view
  [items]="products"
  selectionMode="multiple"
  [(selectedKeys)]="selected"
  ariaLabel="Pick products"
>
  ${TILE}
</oge-data-view>
<p>Selected: {{ selected().join(', ') || 'none' }}</p>`,
  body: `protected readonly selected = signal<readonly OgeDataViewKey[]>([2]);
${PRODUCTS}`,
});

export const REMOTE_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeDataView', 'OgeDataViewItemTemplate'],
  },
  helpers: { '@oge-ui/behavior': ['ogeDataViewProcess'] },
  types: {
    '@oge-ui/layout': ['OgeDataViewOptionsChangedEvent'],
  },
  before: PRODUCT_TYPE,
  template: `<!-- remoteOperations: the view neither sorts, searches nor pages. It
     emits optionsChanged; the app answers with the page as items and the
     total as itemCount. loading draws skeletons and sets aria-busy. -->
<oge-data-view
  [items]="page()"
  [itemCount]="total()"
  [pageSize]="3"
  [remoteOperations]="true"
  [loading]="loading()"
  [searchEnabled]="true"
  [sortOptions]="[{ field: 'name', label: 'Name' }, { field: 'price', label: 'Price' }]"
  ariaLabel="Server products"
  (optionsChanged)="load($event)"
>
  ${TILE}
</oge-data-view>`,
  body: `protected readonly page = signal<Product[]>([]);
protected readonly total = signal(0);
protected readonly loading = signal(false);
${PRODUCTS}

constructor() {
  this.load({ sort: null, searchValue: '', pageIndex: 0, pageSize: 3 });
}

/** Stands in for an HTTP call: the "server" filters, sorts and slices. */
protected load(options: OgeDataViewOptionsChangedEvent): void {
  this.loading.set(true);
  setTimeout(() => {
    const all = ogeDataViewProcess(this.products, {
      searchValue: options.searchValue,
      searchExpr: ['name', 'category'],
      sort: options.sort,
    });
    const start = options.pageIndex * options.pageSize;
    this.page.set(all.slice(start, start + options.pageSize));
    this.total.set(all.length);
    this.loading.set(false);
  }, 400);
}`,
});
