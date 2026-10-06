import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  OgeDataView,
  OgeDataViewItemTemplate,
  OgeDataViewListItemTemplate,
  type OgeDataViewKey,
  type OgeDataViewLayout,
  type OgeDataViewOptionsChangedEvent,
  type OgeDataViewPageChangedEvent,
  type OgeDataViewSort,
} from '@oge-ui/layout/data-view';
import { ogeDataViewProcess } from '@oge-ui/behavior';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_DATA_VIEW_SECTIONS,
  ReactLayoutDataViewDemos,
} from '../react-layout/data-view';
import {
  BASICS_SNIPPET,
  LAYOUT_SNIPPET,
  PAGING_SNIPPET,
  REMOTE_SNIPPET,
  SELECTION_SNIPPET,
  SORT_SNIPPET,
} from './data-view-snippets';
import {
  DATA_VIEW_DEMO_STYLES,
  DATA_VIEW_PRODUCTS,
  DATA_VIEW_SORT_OPTIONS,
  type DemoProduct,
} from './data-view-demo-data';

const SECTIONS = [
  'Basics & templates',
  'Grid and list layouts',
  'Paging',
  'Sorting, search & filtering',
  'Selection',
  'Remote operations',
] as const;

const REMOTE_PAGE_SIZE = 3;

@Component({
  selector: 'app-layout-data-view',
  imports: [
    OgeDataView,
    OgeDataViewItemTemplate,
    OgeDataViewListItemTemplate,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutDataViewDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Data View"
      category="Layout"
      categoryLink="/components/data-view"
      [chips]="[
        'templates',
        'grid / list',
        'container queries',
        'paging',
        'sort & search',
        'listbox selection',
      ]"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeDataView&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> renders a templated collection —
          products, people, files — in responsive columns or one per row, with
          search, sorting, a filter hook, paging and optional selection, on the
          same markup and stylesheet as the Angular component.
        </p>
      } @else {
        <p>
          <code>oge-data-view</code> renders a templated collection — products,
          people, files — in responsive columns or one per row, with search,
          sorting, a filter hook, paging and optional selection.
        </p>
      }
      <p>
        No WAI-ARIA pattern exists for a data view, so it is composed from list
        primitives: a <strong>list</strong> of list items without selection
        (templates may hold links and buttons), an APG
        <strong>listbox</strong> with one tab stop once items select. Columns
        come from a container query on the view's own width, so it lays itself
        out correctly inside a drawer, a dialog or a narrow column.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-data-view-demos />
    } @else {
      <app-demo-card
        [chips]="['items', 'ogeDataViewItemTemplate', 'ariaLabel']"
        heading="Basics & templates"
        description="Pass <code>items</code> and project an <code>ogeDataViewItemTemplate</code>; without one an item shows its <code>displayExpr</code> (or its title / name field). Without selection the view is a <code>list</code> of <code>listitem</code>s, so links and buttons inside a template stay in the Tab order."
        [code]="basicsSnippet"
        language="ts"
      >
        <oge-data-view [items]="six" ariaLabel="Products">
          <ng-template ogeDataViewItemTemplate let-item>
            <p class="demo-dv-category">{{ item.category }}</p>
            <h3 class="demo-dv-name">{{ item.name }}</h3>
            <p class="demo-dv-meta">
              {{ item.price }} USD · ★ {{ item.rating }}
            </p>
          </ng-template>
        </oge-data-view>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'layout',
          'showLayoutSwitch',
          'minItemWidth',
          'ogeDataViewListItemTemplate',
        ]"
        heading="Grid and list layouts"
        description="<code>showLayoutSwitch</code> renders a toggle-button group (<code>aria-pressed</code>) bound to the two-way <code>layout</code>. Grid columns are <code>auto-fill</code> cells of at least <code>minItemWidth</code> px, resolved by a container query on the view itself — resize the browser and the column count follows the card, not the window. The list layout may use its own row template."
        [code]="layoutSnippet"
        language="ts"
      >
        <oge-data-view
          [items]="six"
          [(layout)]="layout"
          [showLayoutSwitch]="true"
          [minItemWidth]="200"
          ariaLabel="Products by layout"
        >
          <ng-template ogeDataViewItemTemplate let-item>
            <p class="demo-dv-category">{{ item.category }}</p>
            <h3 class="demo-dv-name">{{ item.name }}</h3>
            <p class="demo-dv-meta">
              {{ item.price }} USD · ★ {{ item.rating }}
            </p>
          </ng-template>
          <ng-template ogeDataViewListItemTemplate let-item>
            <span class="demo-dv-row">
              <strong>{{ item.name }}</strong>
              <span class="demo-dv-meta"
                >{{ item.category }} · {{ item.price }} USD</span
              >
            </span>
          </ng-template>
        </oge-data-view>
        <p class="mt-3 text-sm" data-testid="data-view-layout">
          Layout: {{ layout() }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['pageSize', 'pageIndex', 'pageChanged', 'showPageInfo']"
        heading="Paging"
        description="<code>pageSize</code> turns paging on and the view renders its own pager: previous / next, a constant-width numeric window with ellipses and the range text. Focus stays on the button you pressed (or moves to the current page when it disables) and the new page is announced politely. For the full <code>oge-pagination</code> bar, bind it to <code>[(pageIndex)]</code> and set <code>showPager</code> to <code>false</code>."
        [code]="pagingSnippet"
        language="ts"
      >
        <oge-data-view
          [items]="products"
          [pageSize]="4"
          [(pageIndex)]="page"
          ariaLabel="Paged products"
          (pageChanged)="onPage($event)"
        >
          <ng-template ogeDataViewItemTemplate let-item>
            <p class="demo-dv-category">{{ item.category }}</p>
            <h3 class="demo-dv-name">{{ item.name }}</h3>
            <p class="demo-dv-meta">
              {{ item.price }} USD · ★ {{ item.rating }}
            </p>
          </ng-template>
        </oge-data-view>
        <p class="mt-3 text-sm" data-testid="data-view-page">
          Page {{ page() + 1 }}{{ pageLog() }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'searchEnabled',
          'searchExpr',
          'sortOptions',
          'sort',
          'filter',
        ]"
        heading="Sorting, search & filtering"
        description="The search matches every word through the suite's text folding (case-, accent- and locale-insensitive) over <code>searchExpr</code>, and the result count is announced. <code>sortOptions</code> fill a native select with a direction toggle; text compares with the locale's collator, numbers numerically, empty values last. <code>filter</code> is a plain predicate hook."
        [code]="sortSnippet"
        language="ts"
      >
        <label class="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            (change)="inStockOnly.set($any($event.target).checked)"
          />
          In stock only
        </label>
        <oge-data-view
          [items]="products"
          [searchEnabled]="true"
          [searchExpr]="['name', 'category']"
          [sortOptions]="sortOptions"
          [(sort)]="sort"
          [filter]="inStockOnly() ? inStock : null"
          [minItemWidth]="180"
          ariaLabel="Searchable products"
        >
          <ng-template ogeDataViewItemTemplate let-item>
            <p class="demo-dv-category">{{ item.category }}</p>
            <h3 class="demo-dv-name">{{ item.name }}</h3>
            <p class="demo-dv-meta">
              {{ item.price }} USD · ★ {{ item.rating }}
              @if (!item.inStock) {
                · <span class="demo-dv-stock">sold out</span>
              }
            </p>
          </ng-template>
        </oge-data-view>
      </app-demo-card>

      <app-demo-card
        [chips]="['selectionMode', 'selectedKeys', 'listbox', 'Ctrl+A']"
        heading="Selection"
        description="With <code>selectionMode</code> the view becomes an APG listbox with one tab stop: arrows walk the items in reading order (mirrored in RTL), Up / Down jump a row by the measured column count, Home / End, PageUp / PageDown turn the page, Space / Enter toggle and Ctrl+A selects everything. Options are leaves for assistive technology, so keep the template free of buttons and links."
        [code]="selectionSnippet"
        language="ts"
      >
        <oge-data-view
          [items]="eight"
          selectionMode="multiple"
          [(selectedKeys)]="selected"
          [minItemWidth]="180"
          ariaLabel="Pick products"
        >
          <ng-template ogeDataViewItemTemplate let-item>
            <p class="demo-dv-category">{{ item.category }}</p>
            <p class="demo-dv-name">{{ item.name }}</p>
            <p class="demo-dv-meta">{{ item.price }} USD</p>
          </ng-template>
        </oge-data-view>
        <p class="mt-3 text-sm" data-testid="data-view-selected">
          Selected: {{ selected().join(', ') || 'none' }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['remoteOperations', 'optionsChanged', 'itemCount', 'loading']"
        heading="Remote operations"
        description="With <code>remoteOperations</code> the view neither sorts, searches nor pages: it emits <code>optionsChanged</code> (sort, search text, page, page size) and renders <code>items</code> as the current page of <code>itemCount</code>. <code>loading</code> marks the items <code>aria-busy</code> and draws skeleton tiles while there is nothing to show yet."
        [code]="remoteSnippet"
        language="ts"
      >
        <oge-data-view
          [items]="remotePage()"
          [itemCount]="remoteTotal()"
          [pageSize]="remotePageSize"
          [remoteOperations]="true"
          [loading]="remoteLoading()"
          [searchEnabled]="true"
          [sortOptions]="sortOptions"
          [minItemWidth]="180"
          ariaLabel="Server products"
          (optionsChanged)="load($event)"
        >
          <ng-template ogeDataViewItemTemplate let-item>
            <p class="demo-dv-category">{{ item.category }}</p>
            <h3 class="demo-dv-name">{{ item.name }}</h3>
            <p class="demo-dv-meta">{{ item.price }} USD</p>
          </ng-template>
        </oge-data-view>
      </app-demo-card>
    }
  `,
  styles: DATA_VIEW_DEMO_STYLES,
})
export class LayoutDataViewPage {
  protected readonly fw = inject(FrameworkService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_DATA_VIEW_SECTIONS;
  protected readonly basicsSnippet = BASICS_SNIPPET;
  protected readonly layoutSnippet = LAYOUT_SNIPPET;
  protected readonly pagingSnippet = PAGING_SNIPPET;
  protected readonly sortSnippet = SORT_SNIPPET;
  protected readonly selectionSnippet = SELECTION_SNIPPET;
  protected readonly remoteSnippet = REMOTE_SNIPPET;

  protected readonly products = DATA_VIEW_PRODUCTS;
  protected readonly sortOptions = DATA_VIEW_SORT_OPTIONS;
  protected readonly six = DATA_VIEW_PRODUCTS.slice(0, 6);
  protected readonly eight = DATA_VIEW_PRODUCTS.slice(0, 8);
  protected readonly layout = signal<OgeDataViewLayout>('grid');
  protected readonly page = signal(0);
  protected readonly pageLog = signal('');
  protected readonly inStockOnly = signal(false);
  protected readonly sort = signal<OgeDataViewSort | null>({
    field: 'price',
    direction: 'asc',
  });
  protected readonly inStock = (product: DemoProduct) => product.inStock;
  protected readonly selected = signal<readonly OgeDataViewKey[]>([2]);

  protected readonly remotePageSize = REMOTE_PAGE_SIZE;
  protected readonly remotePage = signal<DemoProduct[]>([]);
  protected readonly remoteTotal = signal(0);
  protected readonly remoteLoading = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // the first page renders synchronously (and in the prerender); later
    // requests take a simulated round trip
    this.answer({
      sort: null,
      searchValue: '',
      pageIndex: 0,
      pageSize: REMOTE_PAGE_SIZE,
    });
    this.destroyRef.onDestroy(() => {
      if (this.timer) clearTimeout(this.timer);
    });
  }

  protected onPage(event: OgeDataViewPageChangedEvent): void {
    this.pageLog.set(
      ` (from page ${event.previousPageIndex + 1} to ${event.pageIndex + 1})`,
    );
  }

  protected load(options: OgeDataViewOptionsChangedEvent): void {
    this.remoteLoading.set(true);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.answer(options);
    }, 400);
  }

  private answer(options: OgeDataViewOptionsChangedEvent): void {
    const all = ogeDataViewProcess(this.products, {
      searchValue: options.searchValue,
      searchExpr: ['name', 'category'],
      sort: options.sort,
    });
    const start = options.pageIndex * options.pageSize;
    this.remotePage.set(all.slice(start, start + options.pageSize));
    this.remoteTotal.set(all.length);
    this.remoteLoading.set(false);
  }
}
