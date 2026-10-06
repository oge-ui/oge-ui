import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  OgeDataView,
  type OgeDataViewKey,
  type OgeDataViewLayout,
  type OgeDataViewOptionsChangedEvent,
  type OgeDataViewRenderContext,
  type OgeDataViewSort,
} from '@oge-ui/react-layout';
import { ogeDataViewProcess } from '@oge-ui/behavior';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  DATA_VIEW_DEMO_STYLES,
  DATA_VIEW_PRODUCTS,
  DATA_VIEW_SORT_OPTIONS,
  type DemoProduct,
} from '../layout/data-view-demo-data';
import { LAYOUT_DATA_VIEW_DEMOS } from './data-view-snippets';

/**
 * TOC of the React view — the same six sections as the Angular data view
 * page (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_LAYOUT_DATA_VIEW_SECTIONS = [
  'Basics & templates',
  'Grid and list layouts',
  'Paging',
  'Sorting, search & filtering',
  'Selection',
  'Remote operations',
] as const;

const SIX = DATA_VIEW_PRODUCTS.slice(0, 6);
const EIGHT = DATA_VIEW_PRODUCTS.slice(0, 8);
const REMOTE_PAGE_SIZE = 3;

function tile(
  { item }: OgeDataViewRenderContext<DemoProduct>,
  extra?: ReactNode,
): ReactNode {
  return createElement(
    'span',
    { className: 'contents' },
    createElement(
      'p',
      { key: 'c', className: 'demo-dv-category' },
      item.category,
    ),
    createElement('h3', { key: 'n', className: 'demo-dv-name' }, item.name),
    createElement(
      'p',
      { key: 'm', className: 'demo-dv-meta' },
      `${item.price} USD · ★ ${item.rating}`,
      extra,
    ),
  );
}

const plainTile = (context: OgeDataViewRenderContext<DemoProduct>) =>
  tile(context);

function LayoutDemo(): ReactNode {
  const [layout, setLayout] = useState<OgeDataViewLayout>('grid');
  return createElement(
    'div',
    null,
    createElement(OgeDataView<DemoProduct>, {
      key: 'view',
      items: SIX,
      layout,
      onLayoutChange: setLayout,
      showLayoutSwitch: true,
      minItemWidth: 200,
      ariaLabel: 'Products by layout',
      renderItem: plainTile,
      renderListItem: ({ item }) =>
        createElement(
          'span',
          { className: 'demo-dv-row' },
          createElement('strong', { key: 'n' }, item.name),
          createElement(
            'span',
            { key: 'm', className: 'demo-dv-meta' },
            `${item.category} · ${item.price} USD`,
          ),
        ),
    }),
    createElement(
      'p',
      {
        key: 'out',
        className: 'mt-3 text-sm',
        'data-testid': 'data-view-layout',
      },
      `Layout: ${layout}`,
    ),
  );
}

function PagingDemo(): ReactNode {
  const [page, setPage] = useState(0);
  const [log, setLog] = useState('');
  return createElement(
    'div',
    null,
    createElement(OgeDataView<DemoProduct>, {
      key: 'view',
      items: DATA_VIEW_PRODUCTS,
      pageSize: 4,
      pageIndex: page,
      onPageIndexChange: setPage,
      ariaLabel: 'Paged products',
      onPageChanged: (event) =>
        setLog(
          ` (from page ${event.previousPageIndex + 1} to ${event.pageIndex + 1})`,
        ),
      renderItem: plainTile,
    }),
    createElement(
      'p',
      {
        key: 'out',
        className: 'mt-3 text-sm',
        'data-testid': 'data-view-page',
      },
      `Page ${page + 1}${log}`,
    ),
  );
}

const inStock = (product: DemoProduct) => product.inStock;

function SortDemo(): ReactNode {
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<OgeDataViewSort | null>({
    field: 'price',
    direction: 'asc',
  });
  return createElement(
    'div',
    null,
    createElement(
      'label',
      { key: 'filter', className: 'mb-3 flex items-center gap-2 text-sm' },
      createElement('input', {
        type: 'checkbox',
        checked: inStockOnly,
        onChange: (event: { target: { checked: boolean } }) =>
          setInStockOnly(event.target.checked),
      }),
      'In stock only',
    ),
    createElement(OgeDataView<DemoProduct>, {
      key: 'view',
      items: DATA_VIEW_PRODUCTS,
      searchEnabled: true,
      searchExpr: ['name', 'category'],
      sortOptions: DATA_VIEW_SORT_OPTIONS,
      sort,
      onSortChange: setSort,
      filter: inStockOnly ? inStock : null,
      minItemWidth: 180,
      ariaLabel: 'Searchable products',
      renderItem: (context) =>
        tile(
          context,
          context.item.inStock
            ? null
            : createElement(
                'span',
                { key: 's' },
                ' · ',
                createElement(
                  'span',
                  { className: 'demo-dv-stock' },
                  'sold out',
                ),
              ),
        ),
    }),
  );
}

function SelectionDemo(): ReactNode {
  const [selected, setSelected] = useState<OgeDataViewKey[]>([2]);
  return createElement(
    'div',
    null,
    createElement(OgeDataView<DemoProduct>, {
      key: 'view',
      items: EIGHT,
      selectionMode: 'multiple',
      selectedKeys: selected,
      onSelectedKeysChange: setSelected,
      minItemWidth: 180,
      ariaLabel: 'Pick products',
      renderItem: ({ item }) =>
        createElement(
          'span',
          { className: 'contents' },
          createElement(
            'p',
            { key: 'c', className: 'demo-dv-category' },
            item.category,
          ),
          createElement(
            'p',
            { key: 'n', className: 'demo-dv-name' },
            item.name,
          ),
          createElement(
            'p',
            { key: 'm', className: 'demo-dv-meta' },
            `${item.price} USD`,
          ),
        ),
    }),
    createElement(
      'p',
      {
        key: 'out',
        className: 'mt-3 text-sm',
        'data-testid': 'data-view-selected',
      },
      `Selected: ${selected.join(', ') || 'none'}`,
    ),
  );
}

function answer(options: OgeDataViewOptionsChangedEvent) {
  const all = ogeDataViewProcess(DATA_VIEW_PRODUCTS, {
    searchValue: options.searchValue,
    searchExpr: ['name', 'category'],
    sort: options.sort,
  });
  const start = options.pageIndex * options.pageSize;
  return {
    page: all.slice(start, start + options.pageSize),
    total: all.length,
  };
}

const FIRST = answer({
  sort: null,
  searchValue: '',
  pageIndex: 0,
  pageSize: REMOTE_PAGE_SIZE,
});

function RemoteDemo(): ReactNode {
  const [result, setResult] = useState(FIRST);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const load = useCallback((options: OgeDataViewOptionsChangedEvent) => {
    setLoading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setResult(answer(options));
      setLoading(false);
    }, 400);
  }, []);
  return createElement(OgeDataView<DemoProduct>, {
    items: result.page,
    itemCount: result.total,
    pageSize: REMOTE_PAGE_SIZE,
    remoteOperations: true,
    loading,
    searchEnabled: true,
    sortOptions: DATA_VIEW_SORT_OPTIONS,
    minItemWidth: 180,
    ariaLabel: 'Server products',
    onOptionsChanged: load,
    renderItem: ({ item }) =>
      createElement(
        'span',
        { className: 'contents' },
        createElement(
          'p',
          { key: 'c', className: 'demo-dv-category' },
          item.category,
        ),
        createElement('h3', { key: 'n', className: 'demo-dv-name' }, item.name),
        createElement(
          'p',
          { key: 'm', className: 'demo-dv-meta' },
          `${item.price} USD`,
        ),
      ),
  });
}

/**
 * The React half of the data view page — rendered inside
 * `/components/data-view` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-data-view-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the React data view carries the class names but no styles of its own —
  // the docs pull the Angular entry's SCSS the package build compiles (only
  // that one sheet: the whole react-layout sheet would blow the style budget)
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/layout/data-view/src/data-view.scss'],
  template: `
    <app-demo-card
      [chips]="['items', 'renderItem', 'ariaLabel']"
      heading="Basics & templates"
      description="Pass <code>items</code> and a <code>renderItem</code> render prop; without one an item shows its <code>displayExpr</code> (or its title / name field). Without selection the view is a <code>list</code> of <code>listitem</code>s, so links and buttons inside an item stay in the Tab order."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basics" />
    </app-demo-card>

    <app-demo-card
      [chips]="['layout', 'showLayoutSwitch', 'minItemWidth', 'renderListItem']"
      heading="Grid and list layouts"
      description="<code>showLayoutSwitch</code> renders a toggle-button group (<code>aria-pressed</code>) bound to <code>layout</code> / <code>onLayoutChange</code>. Grid columns are <code>auto-fill</code> cells of at least <code>minItemWidth</code> px, resolved by a container query on the view itself — the column count follows the card, not the window. The list layout may use its own <code>renderListItem</code>."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="layout" />
    </app-demo-card>

    <app-demo-card
      [chips]="['pageSize', 'pageIndex', 'onPageChanged', 'showPageInfo']"
      heading="Paging"
      description="<code>pageSize</code> turns paging on and the view renders its own pager: previous / next, a constant-width numeric window with ellipses and the range text. Focus stays on the button you pressed (or moves to the current page when it disables) and the new page is announced politely. For the full <code>&amp;lt;OgePagination&amp;gt;</code> bar, control <code>pageIndex</code> and set <code>showPager</code> to <code>false</code>."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="paging" />
    </app-demo-card>

    <app-demo-card
      [chips]="['searchEnabled', 'searchExpr', 'sortOptions', 'sort', 'filter']"
      heading="Sorting, search & filtering"
      description="The search matches every word through the suite's text folding (case-, accent- and locale-insensitive) over <code>searchExpr</code>, and the result count is announced. <code>sortOptions</code> fill a native select with a direction toggle; text compares with the locale's collator, numbers numerically, empty values last. <code>filter</code> is a plain predicate hook."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="sorting" />
    </app-demo-card>

    <app-demo-card
      [chips]="['selectionMode', 'selectedKeys', 'listbox', 'Ctrl+A']"
      heading="Selection"
      description="With <code>selectionMode</code> the view becomes an APG listbox with one tab stop: arrows walk the items in reading order (mirrored in RTL), Up / Down jump a row by the measured column count, Home / End, PageUp / PageDown turn the page, Space / Enter toggle and Ctrl+A selects everything. Options are leaves for assistive technology, so keep <code>renderItem</code> free of buttons and links."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="selection" />
    </app-demo-card>

    <app-demo-card
      [chips]="['remoteOperations', 'onOptionsChanged', 'itemCount', 'loading']"
      heading="Remote operations"
      description="With <code>remoteOperations</code> the view neither sorts, searches nor pages: it calls <code>onOptionsChanged</code> (sort, search text, page, page size) and renders <code>items</code> as the current page of <code>itemCount</code>. <code>loading</code> marks the items <code>aria-busy</code> and draws skeleton tiles while there is nothing to show yet."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="remote" />
    </app-demo-card>
  `,
  styles: DATA_VIEW_DEMO_STYLES,
})
export class ReactLayoutDataViewDemos {
  protected readonly demos = LAYOUT_DATA_VIEW_DEMOS;

  protected readonly basics = () =>
    createElement(OgeDataView<DemoProduct>, {
      items: SIX,
      ariaLabel: 'Products',
      renderItem: plainTile,
    });

  protected readonly layout = () => createElement(LayoutDemo);
  protected readonly paging = () => createElement(PagingDemo);
  protected readonly sorting = () => createElement(SortDemo);
  protected readonly selection = () => createElement(SelectionDemo);
  protected readonly remote = () => createElement(RemoteDemo);
}
