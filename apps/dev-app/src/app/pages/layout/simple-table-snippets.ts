import { demoSource } from '../../shared/demo-source';

const LINE_TYPE = `interface OrderLine {
  sku: string;
  product: { name: string };
  qty: number;
  price: number;
  status: 'shipped' | 'pending' | 'backordered';
}`;

const LINES = `protected readonly lines: OrderLine[] = [
  { sku: 'DSK-01', product: { name: 'Oak desk' }, qty: 2, price: 420, status: 'shipped' },
  { sku: 'CHR-07', product: { name: 'Mesh office chair' }, qty: 4, price: 260, status: 'pending' },
  { sku: 'LMP-12', product: { name: 'Desk lamp' }, qty: 6, price: 45, status: 'backordered' },
  { sku: 'SHF-03', product: { name: 'Wall shelf' }, qty: 3, price: 89, status: 'shipped' },
];`;

const COLUMNS = `protected readonly columns: OgeSimpleTableColumn[] = [
  { field: 'sku', caption: 'SKU', width: '7rem' },
  { field: 'product.name', caption: 'Product' },
  { field: 'qty', caption: 'Qty', align: 'end', width: '5rem' },
  { field: 'price', caption: 'Unit price', align: 'end' },
];`;

export const BASICS_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeSimpleTable'] },
  types: { '@oge-ui/layout': ['OgeSimpleTableColumn'] },
  before: LINE_TYPE,
  template: `<!-- A native <table>: caption, <th scope="col"> headers, one alignment
     class shared by a column's header and cells. -->
<oge-simple-table [value]="lines" [columns]="columns" caption="Order lines" />`,
  body: `${LINES}

${COLUMNS}`,
});

export const ROW_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': ['OgeSimpleTable', 'OgeSimpleTableRow'],
    '@angular/common': ['CurrencyPipe'],
  },
  types: { '@oge-ui/layout': ['OgeSimpleTableColumn'] },
  before: LINE_TYPE,
  template: `<!-- [ogeSimpleTableRowOf] types let-line as OrderLine under strictTemplates.
     columns[i].cellClass lines a cell up with its header. -->
<oge-simple-table [value]="lines" [columns]="columns" ariaLabel="Order lines with status">
  <ng-template
    ogeSimpleTableRow
    [ogeSimpleTableRowOf]="lines"
    let-line
    let-columns="columns"
  >
    <tr>
      <td><code>{{ line.sku }}</code></td>
      <td>
        {{ line.product.name }}
        @if (line.status !== 'shipped') {
          <span class="status">{{ line.status }}</span>
        }
      </td>
      <td [class]="columns[2].cellClass">{{ line.qty }}</td>
      <td [class]="columns[3].cellClass">
        {{ line.price * line.qty | currency: 'USD' }}
      </td>
    </tr>
  </ng-template>
</oge-simple-table>`,
  body: `${LINES}

${COLUMNS}`,
});

export const PAGING_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': [
      'OgeSimpleTable',
      'OgeSimpleTableFooter',
      'OgeSimpleTableEmpty',
    ],
  },
  types: { '@oge-ui/layout': ['OgeSimpleTableColumn'] },
  template: `<!-- paging: previous / next and a polite "1–5 of 12" text. The footer
     receives every row (not just the page) for totals. -->
<oge-simple-table
  [value]="events"
  [columns]="columns"
  [paging]="true"
  [pageSize]="5"
  [(pageIndex)]="page"
  [compact]="true"
  caption="Audit log"
>
  <ng-template ogeSimpleTableFooter let-all="rows">
    <tr>
      <td colspan="3">{{ all.length }} events</td>
    </tr>
  </ng-template>
  <ng-template ogeSimpleTableEmpty>No events yet</ng-template>
</oge-simple-table>
<p>Page {{ page() + 1 }}</p>`,
  body: `protected readonly page = signal(0);

protected readonly events = Array.from({ length: 12 }, (_, i) => ({
  at: \`09:\${String(i * 4).padStart(2, '0')}\`,
  user: ['ayse', 'mehmet', 'ali'][i % 3],
  action: ['signed in', 'exported a report', 'changed a role'][i % 3],
}));

protected readonly columns: OgeSimpleTableColumn[] = [
  { field: 'at', caption: 'Time', width: '6rem' },
  { field: 'user', caption: 'User' },
  { field: 'action', caption: 'Action' },
];`,
});
