import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { CustomDataSource } from '@oge-ui/core';
import {
  OgeMultiColumnComboBox,
  type OgeComboBoxColumn,
} from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_MCCB_DEMOS } from './multi-column-combo-box-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_INPUTS_MCCB_SECTIONS = [
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

const BASIC_COLUMNS: OgeComboBoxColumn<Product>[] = [
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

const TEMPLATE_COLUMNS: OgeComboBoxColumn<Product>[] = [
  { field: 'name', width: 160 },
  {
    field: 'stock',
    caption: 'Availability',
    width: 130,
    renderCell: (_item, { value }) =>
      createElement(
        'span',
        { className: value === 0 ? 'text-red-600' : undefined },
        value === 0 ? 'Sold out' : `${String(value)} in stock`,
      ),
  },
  {
    field: 'price',
    width: 90,
    alignment: 'end',
    format: (value) => `€${Number(value).toFixed(2)}`,
  },
];

const MULTIPLE_COLUMNS: OgeComboBoxColumn<Product>[] = [
  { field: 'sku', caption: 'SKU', width: 80 },
  { field: 'name', width: 160 },
  {
    field: 'price',
    width: 90,
    alignment: 'end',
    format: { style: 'currency', currency: 'EUR' },
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

const ACCOUNT_COLUMNS: OgeComboBoxColumn<Account>[] = [
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
      [a.code, a.name, a.city].some((text) =>
        text.toLowerCase().includes(term),
      ),
    );
    return { data: rows.slice(skip, skip + take), totalCount: rows.length };
  },
});

function BasicDemo(): ReactNode {
  const [productId, setProductId] = useState<unknown>(3);
  return createElement(
    'div',
    { className: 'demo-row demo-row-start', 'data-demo': 'mccb-basic' },
    createElement(OgeMultiColumnComboBox<Product>, {
      key: 'product',
      label: 'Product',
      items: PRODUCTS,
      columns: BASIC_COLUMNS,
      valueExpr: 'id',
      displayExpr: 'name',
      showClearButton: true,
      value: productId,
      onValueChange: setProductId,
    }),
    createElement(
      'div',
      {
        key: 'readout',
        className: 'pt-2 text-sm text-gray-500 dark:text-gray-400',
      },
      'value: ',
      createElement(
        'code',
        null,
        productId == null ? 'null' : String(productId),
      ),
    ),
  );
}

function TemplatesDemo(): ReactNode {
  const [productId, setProductId] = useState<unknown>(null);
  return createElement(OgeMultiColumnComboBox<Product>, {
    label: 'Product',
    items: PRODUCTS.map((p) => ({ ...p, soldOut: p.stock === 0 })),
    columns: TEMPLATE_COLUMNS,
    valueExpr: 'id',
    disabledExpr: 'soldOut',
    value: productId,
    onValueChange: setProductId,
  });
}

function MultipleDemo(): ReactNode {
  const [bundle, setBundle] = useState<unknown>([1, 3]);
  return createElement(OgeMultiColumnComboBox<Product>, {
    label: 'Bundle',
    items: PRODUCTS,
    columns: MULTIPLE_COLUMNS,
    valueExpr: 'id',
    displayExpr: 'name',
    selectionMode: 'multiple',
    maxDisplayedTags: 2,
    value: bundle,
    onValueChange: setBundle,
  });
}

function RemoteDemo(): ReactNode {
  const [accountId, setAccountId] = useState<unknown>(null);
  return createElement(OgeMultiColumnComboBox<Account>, {
    label: 'Account',
    dataSource: accounts,
    columns: ACCOUNT_COLUMNS,
    valueExpr: 'id',
    displayExpr: 'name',
    virtualScroll: true,
    pageSize: 50,
    value: accountId,
    onValueChange: setAccountId,
  });
}

function FormsDemo(): ReactNode {
  const [productId, setProductId] = useState<unknown>(null);
  const [touched, setTouched] = useState(false);
  return createElement(OgeMultiColumnComboBox<Product>, {
    label: 'Product',
    items: PRODUCTS,
    columns: BASIC_COLUMNS.slice(0, 2),
    valueExpr: 'id',
    displayExpr: 'name',
    required: true,
    touched,
    errors: productId == null ? [{ kind: 'required' }] : [],
    onBlur: () => setTouched(true),
    value: productId,
    onValueChange: setProductId,
  });
}

/**
 * The React half of the multi-column combo box page — the same demo sections
 * as the Angular page, rendered as real React trees (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-mccb-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      heading="Basic usage"
      description="Give it <code>columns</code> — <code>field</code> (dot-notation), <code>caption</code>, <code>width</code> and <code>format</code> — plus the select box mapping. Typing searches every <code>searchable</code> column by its formatted text; the field shows <code>displayExpr</code> (default: the first column)."
      [chips]="['columns', 'format', 'searchable']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      heading="Cell templates & formats"
      description="A column&#39;s <code>renderCell</code> takes over the cell (it keeps its <code>gridcell</code> role); <code>format</code> also accepts a function of the raw value and the row. <code>disabledExpr</code> makes rows inert."
      [chips]="['renderCell', 'format()', 'disabledExpr']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="templates" />
    </app-demo-card>

    <app-demo-card
      heading="Multiple selection"
      description='<code>selectionMode="multiple"</code> makes the value an array, renders removable chips (<kbd>Backspace</kbd> removes the last one), keeps the popup open while picking and sets <code>aria-multiselectable</code>.'
      [chips]="['selectionMode', 'maxDisplayedTags']"
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="multiple" />
    </app-demo-card>

    <app-demo-card
      heading="Remote data"
      description="10,000 accounts behind a <code>CustomDataSource</code>: <code>dataSource</code> pages 50 rows at a time as the virtual window scrolls, sends the typed text as <code>searchText</code> (debounced, superseded requests aborted) and caches each search."
      [chips]="['dataSource', 'virtualScroll', 'pageSize']"
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="remote" />
    </app-demo-card>

    <app-demo-card
      heading="Forms"
      description="Standalone with the controlled value pair, or as an <code>&amp;lt;OgeForm&amp;gt;</code> field: <code>required</code>, <code>errors</code> and <code>touched</code> flow through the shared field chrome."
      [chips]="['required', 'errors', 'touched']"
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="forms" />
    </app-demo-card>
  `,
})
export class ReactInputsMultiColumnComboBoxDemos {
  protected readonly demos = INPUTS_MCCB_DEMOS;

  protected readonly basic = () => createElement(BasicDemo);
  protected readonly templates = () => createElement(TemplatesDemo);
  protected readonly multiple = () => createElement(MultipleDemo);
  protected readonly remote = () => createElement(RemoteDemo);
  protected readonly forms = () => createElement(FormsDemo);
}
