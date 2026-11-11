import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React simple table page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain
 * Node. Section-for-section mirror of `../layout/simple-table.ts`; the Angular
 * template slots arrive as the `renderRow` / `renderFooter` / `renderEmpty`
 * render props.
 */
const LINES = `interface OrderLine {
  sku: string;
  product: { name: string };
  qty: number;
  price: number;
  status: 'shipped' | 'pending' | 'backordered';
}

const lines: OrderLine[] = [
  { sku: 'DSK-01', product: { name: 'Oak desk' }, qty: 2, price: 420, status: 'shipped' },
  { sku: 'CHR-07', product: { name: 'Mesh office chair' }, qty: 4, price: 260, status: 'pending' },
  { sku: 'LMP-12', product: { name: 'Desk lamp' }, qty: 6, price: 45, status: 'backordered' },
  { sku: 'SHF-03', product: { name: 'Wall shelf' }, qty: 3, price: 89, status: 'shipped' },
];

const columns: OgeSimpleTableColumn[] = [
  { field: 'sku', caption: 'SKU', width: '7rem' },
  { field: 'product.name', caption: 'Product' },
  { field: 'qty', caption: 'Qty', align: 'end', width: '5rem' },
  { field: 'price', caption: 'Unit price', align: 'end' },
];`;

export const LAYOUT_SIMPLE_TABLE_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basics',
    description:
      'A native table: caption, th scope="col" headers, and one alignment class shared by a column’s header and cells.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeSimpleTable'] },
      types: { '@oge-ui/react-layout': ['OgeSimpleTableColumn'] },
      name: 'SimpleTableBasicsDemo',
      before: LINES,
      jsx: `<OgeSimpleTable value={lines} columns={columns} caption="Order lines" />`,
    }),
  },
  {
    title: 'Row templates',
    description:
      'renderRow returns the whole tr with free cells; row is typed from value and columns[i].cellClass lines a cell up with its header.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeSimpleTable'] },
      types: { '@oge-ui/react-layout': ['OgeSimpleTableColumn'] },
      name: 'SimpleTableRowDemo',
      before: LINES,
      jsx: `<OgeSimpleTable
  value={lines}
  columns={columns}
  ariaLabel="Order lines with status"
  renderRow={({ row, columns: cols }) => (
    <tr>
      <td>
        <code>{row.sku}</code>
      </td>
      <td>
        {row.product.name}
        {row.status !== 'shipped' ? (
          <span className="status">{row.status}</span>
        ) : null}
      </td>
      <td className={cols[2].cellClass}>{row.qty}</td>
      <td className={cols[3].cellClass}>
        {(row.price * row.qty).toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        })}
      </td>
    </tr>
  )}
/>`,
    }),
  },
  {
    title: 'Paging, footer and empty state',
    description:
      'paging adds previous / next and a polite "1–5 of 12" text; renderFooter receives every row for totals; renderEmpty fills the full-width empty row.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeSimpleTable'] },
      types: { '@oge-ui/react-layout': ['OgeSimpleTableColumn'] },
      name: 'SimpleTablePagingDemo',
      before: `const events = Array.from({ length: 12 }, (_, i) => ({
  at: \`09:\${String(i * 4).padStart(2, '0')}\`,
  user: ['ayse', 'mehmet', 'ali'][i % 3],
  action: ['signed in', 'exported a report', 'changed a role'][i % 3],
}));

const columns: OgeSimpleTableColumn[] = [
  { field: 'at', caption: 'Time', width: '6rem' },
  { field: 'user', caption: 'User' },
  { field: 'action', caption: 'Action' },
];`,
      body: `const [page, setPage] = useState(0);`,
      jsx: `<>
  <OgeSimpleTable
    value={events}
    columns={columns}
    paging
    pageSize={5}
    pageIndex={page}
    onPageIndexChange={setPage}
    compact
    caption="Audit log"
    renderFooter={({ rows }) => (
      <tr>
        <td colSpan={3}>{rows.length} events</td>
      </tr>
    )}
    renderEmpty={() => 'No events yet'}
  />
  <p>Page {page + 1}</p>
</>`,
    }),
  },
];
