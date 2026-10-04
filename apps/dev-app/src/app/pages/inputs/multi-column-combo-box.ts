import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { CustomDataSource } from '@oge-ui/core';
import {
  OgeMultiColumnComboBox,
  type OgeComboBoxCellTemplateContext,
  type OgeComboBoxColumn,
} from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_INPUTS_MCCB_SECTIONS,
  ReactInputsMultiColumnComboBoxDemos,
} from '../react-inputs/multi-column-combo-box';
import {
  MCCB_BASIC_SNIPPET,
  MCCB_FORMS_SNIPPET,
  MCCB_MULTIPLE_SNIPPET,
  MCCB_REMOTE_SNIPPET,
  MCCB_TEMPLATES_SNIPPET,
} from './multi-column-combo-box-snippets';

const SECTIONS = [
  'Basic usage',
  'Cell templates & formats',
  'Multiple selection',
  'Remote data',
  'Forms',
  'Keyboard & accessibility',
] as const;

interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  soldOut?: boolean;
}

const PRODUCTS: Product[] = [
  {
    id: 1,
    sku: 'L-100',
    name: 'Desk lamp',
    category: 'Lighting',
    price: 49,
    stock: 12,
  },
  {
    id: 2,
    sku: 'C-200',
    name: 'Office chair',
    category: 'Seating',
    price: 249,
    stock: 0,
  },
  {
    id: 3,
    sku: 'M-300',
    name: 'Monitor arm',
    category: 'Accessories',
    price: 89,
    stock: 31,
  },
  {
    id: 4,
    sku: 'D-400',
    name: 'Standing desk',
    category: 'Desks',
    price: 699,
    stock: 4,
  },
  {
    id: 5,
    sku: 'K-500',
    name: 'Keyboard tray',
    category: 'Accessories',
    price: 39,
    stock: 57,
  },
];

interface Account {
  id: number;
  code: string;
  name: string;
  city: string;
}

const ACCOUNTS: Account[] = Array.from({ length: 10000 }, (_, i) => ({
  id: i + 1,
  code: `AC-${String(i + 1).padStart(5, '0')}`,
  name: `Account ${i + 1}`,
  city: ['Ankara', 'Berlin', 'Lisbon', 'Oslo'][i % 4],
}));

@Component({
  selector: 'app-inputs-multi-column-combo-box',
  imports: [
    OgeMultiColumnComboBox,
    FormField,
    DemoCard,
    DocHeader,
    PageToc,
    ReactInputsMultiColumnComboBoxDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Multi-Column ComboBox"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="['APG combobox + grid', 'columns', 'remote paging', 'forms']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeMultiColumnComboBox /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> is a combo box whose popup is a
          small data grid: columns with captions, widths,
          <code>Intl</code> formats and <code>renderCell</code>, a sticky
          header, row and cell keyboard navigation, search across the chosen
          columns, virtual scrolling and remote paged data — single or multiple
          selection, on the shared field chrome.
        </p>
      } @else {
        <p>
          <code>&lt;oge-multi-column-combo-box&gt;</code> is a combo box whose
          popup is a small data grid: columns with captions, widths,
          <code>Intl</code> formats and cell templates, a sticky header, row and
          cell keyboard navigation, search across the chosen columns, virtual
          scrolling and remote paged data — single or multiple selection, with
          signals, Signal Forms or reactive forms.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-mccb-demos />
    } @else {
      <app-demo-card
        heading="Basic usage"
        description="Give it <code>[columns]</code> — <code>field</code> (dot-notation), <code>caption</code>, <code>width</code> and <code>format</code> — plus the select box mapping. Typing searches every <code>searchable</code> column by its formatted text; the field shows <code>displayExpr</code> (default: the first column)."
        [chips]="['columns', 'format', 'searchable']"
        [code]="basicSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6" data-demo="mccb-basic">
          <oge-multi-column-combo-box
            label="Product"
            [items]="products"
            [columns]="basicColumns"
            valueExpr="id"
            displayExpr="name"
            [showClearButton]="true"
            [(value)]="productId"
          />
          <div class="pt-2 text-sm text-gray-500 dark:text-gray-400">
            value: <code>{{ productId() ?? 'null' }}</code>
          </div>
        </div>
      </app-demo-card>

      <app-demo-card
        heading="Cell templates & formats"
        description="A column&#39;s <code>cellTemplate</code> takes over the cell (it keeps its <code>gridcell</code> role); <code>format</code> also accepts a function of the raw value and the row. <code>disabledExpr</code> makes rows inert."
        [chips]="['cellTemplate', 'format()', 'disabledExpr']"
        [code]="templatesSnippet"
        language="ts"
      >
        <oge-multi-column-combo-box
          label="Product"
          [items]="stockProducts"
          [columns]="templateColumns()"
          valueExpr="id"
          disabledExpr="soldOut"
          [(value)]="templateProductId"
        />
        <ng-template #stockCell let-value="value">
          <span [class.text-red-600]="value === 0">
            {{ value === 0 ? 'Sold out' : value + ' in stock' }}
          </span>
        </ng-template>
      </app-demo-card>

      <app-demo-card
        heading="Multiple selection"
        description='<code>selectionMode="multiple"</code> makes <code>value</code> an array, renders removable chips (<kbd>Backspace</kbd> removes the last one), keeps the popup open while picking and sets <code>aria-multiselectable</code>.'
        [chips]="['selectionMode', 'maxDisplayedTags']"
        [code]="multipleSnippet"
        language="ts"
      >
        <oge-multi-column-combo-box
          label="Bundle"
          [items]="products"
          [columns]="multipleColumns"
          valueExpr="id"
          displayExpr="name"
          selectionMode="multiple"
          [maxDisplayedTags]="2"
          [(value)]="bundle"
        />
      </app-demo-card>

      <app-demo-card
        heading="Remote data"
        description="10,000 accounts behind a <code>CustomDataSource</code>: <code>[dataSource]</code> pages 50 rows at a time as the virtual window scrolls, sends the typed text as <code>searchText</code> (debounced, superseded requests aborted) and caches each search."
        [chips]="['dataSource', 'virtualScroll', 'pageSize']"
        [code]="remoteSnippet"
        language="ts"
      >
        <oge-multi-column-combo-box
          label="Account"
          [dataSource]="accounts"
          [columns]="accountColumns"
          valueExpr="id"
          displayExpr="name"
          [virtualScroll]="true"
          [pageSize]="50"
          [(value)]="accountId"
        />
      </app-demo-card>

      <app-demo-card
        heading="Forms"
        description="A full form editor: <code>ControlValueAccessor</code> and Signal Forms <code>FormValueControl</code> — <code>[formField]</code> carries required/touched/errors into the field chrome."
        [chips]="['[formField]', 'required']"
        [code]="formsSnippet"
        language="ts"
      >
        <oge-multi-column-combo-box
          label="Product"
          [items]="products"
          [columns]="formColumns"
          valueExpr="id"
          displayExpr="name"
          [formField]="order.productId"
        />
      </app-demo-card>
    }

    <h3 id="keyboard-accessibility" class="scroll-mt-20">
      Keyboard &amp; accessibility
    </h3>
    <p>
      The editor implements the WAI-ARIA APG
      <em>combobox with grid popup</em> pattern: the input is a
      <code>role="combobox"</code> with <code>aria-haspopup="grid"</code>, DOM
      focus never leaves it, and <code>aria-activedescendant</code> names the
      active <code>gridcell</code>. Rows carry <code>aria-selected</code> and
      <code>aria-rowindex</code>; the grid reports
      <code>aria-rowcount</code> (the server total in remote mode, or
      <code>-1</code> while it is open-ended) and <code>aria-colcount</code>.
    </p>
    <ul>
      <li>
        <kbd>&darr;</kbd>/<kbd>&uarr;</kbd> open the popup and move between
        rows; <kbd>PgUp</kbd>/<kbd>PgDn</kbd> jump ten rows.
      </li>
      <li>
        Once the keyboard is in the grid, <kbd>&larr;</kbd>/<kbd>&rarr;</kbd>
        move between cells (mirrored in RTL), <kbd>Home</kbd>/<kbd>End</kbd> go
        to the first/last cell and <kbd>Ctrl</kbd>+<kbd>Home</kbd>/<kbd
          >End</kbd
        >
        to the first/last row. Before that they move the text caret.
      </li>
      <li>
        <kbd>Enter</kbd> commits the active row (<kbd>Space</kbd> too, after
        navigating); <kbd>Alt</kbd>+<kbd>&uarr;</kbd> commits and closes;
        <kbd>Esc</kbd> closes, then clears the search.
      </li>
      <li>
        In <code>multiple</code> mode <kbd>Backspace</kbd> on an empty search
        removes the last chip.
      </li>
    </ul>
  `,
})
export class InputsMultiColumnComboBoxPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_MCCB_SECTIONS;
  protected readonly basicSnippet = MCCB_BASIC_SNIPPET;
  protected readonly templatesSnippet = MCCB_TEMPLATES_SNIPPET;
  protected readonly multipleSnippet = MCCB_MULTIPLE_SNIPPET;
  protected readonly remoteSnippet = MCCB_REMOTE_SNIPPET;
  protected readonly formsSnippet = MCCB_FORMS_SNIPPET;

  protected readonly products = PRODUCTS;
  protected readonly stockProducts = PRODUCTS.map((p) => ({
    ...p,
    soldOut: p.stock === 0,
  }));
  protected readonly productId = signal<unknown>(3);
  protected readonly templateProductId = signal<unknown>(null);
  protected readonly bundle = signal<unknown>([1, 3]);
  protected readonly accountId = signal<unknown>(null);

  protected readonly basicColumns: OgeComboBoxColumn<Product>[] = [
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
  ];

  private readonly stockCell =
    viewChild.required<TemplateRef<OgeComboBoxCellTemplateContext<Product>>>(
      'stockCell',
    );

  protected readonly templateColumns = computed<OgeComboBoxColumn<Product>[]>(
    () => [
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
        format: (value) => `€${Number(value).toFixed(2)}`,
      },
    ],
  );

  protected readonly multipleColumns: OgeComboBoxColumn<Product>[] = [
    { field: 'sku', caption: 'SKU', width: 80 },
    { field: 'name', width: 160 },
    {
      field: 'price',
      width: 90,
      alignment: 'end',
      format: { style: 'currency', currency: 'EUR' },
    },
  ];

  protected readonly accountColumns: OgeComboBoxColumn<Account>[] = [
    { field: 'code', width: 110 },
    { field: 'name', width: 150 },
    { field: 'city', width: 100 },
  ];

  protected readonly accounts = new CustomDataSource<Account>({
    key: 'id',
    load: async ({ skip = 0, take = 50, searchText }) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const term = (searchText ?? '').toLowerCase();
      const rows = ACCOUNTS.filter((a) =>
        [a.code, a.name, a.city].some((text) =>
          text.toLowerCase().includes(term),
        ),
      );
      return { data: rows.slice(skip, skip + take), totalCount: rows.length };
    },
  });

  protected readonly formColumns: OgeComboBoxColumn<Product>[] = [
    { field: 'sku', caption: 'SKU', width: 80 },
    { field: 'name', width: 160 },
  ];
  protected readonly model = signal<{ productId: number | null }>({
    productId: null,
  });
  protected readonly order = form(this.model, (path) =>
    required(path.productId),
  );
}
