import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo source for the React live-updates page — mirror of
 * `../live-updates/live-updates-snippets.ts`: a ticker that pushes `update`
 * batches through `ArrayDataSource.push()`, patched in place and flashed by
 * `highlightChanges`, with the change column drawn by `renderCell`. Pure data,
 * no React imports.
 */
export const GRID_LIVE_UPDATES_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Live ticker',
    source: reactDemoSource({
      react: ['useEffect', 'useMemo'],
      use: {
        '@oge-ui/core': ['ArrayDataSource'],
        '@oge-ui/react-grid': ['OgeGrid'],
      },
      types: { '@oge-ui/react-grid': ['OgeGridColumnProps'] },
      name: 'Ticker',
      before: `interface Stock {
  id: number;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

const SEED_STOCKS: Stock[] = [
  { id: 1, symbol: 'AAPL', price: 227.4, change: 0, changePercent: 0 },
  { id: 2, symbol: 'MSFT', price: 415.2, change: 0, changePercent: 0 },
];

const money = (value: unknown): string => Number(value).toFixed(2);

const columns: OgeGridColumnProps<Stock>[] = [
  { field: 'symbol', caption: 'Symbol', width: 100 },
  { field: 'price', caption: 'Price', dataType: 'number', format: money },
  {
    field: 'change',
    caption: 'Change',
    dataType: 'number',
    // renderCell is the React form of *ogeCellTemplate — and the row is typed
    renderCell: ({ value, row }) => (
      <span className={row.change >= 0 ? 'text-emerald-800' : 'text-red-800'}>
        {String(value)} ({row.changePercent}%)
      </span>
    ),
  },
];`,
      body: `const stocks = useMemo(() => new ArrayDataSource(SEED_STOCKS, { key: 'id' }), []);

useEffect(() => {
  // any push source works: WebSocket, SSE, SignalR…
  const timer = setInterval(() => {
    const stock = SEED_STOCKS[Math.floor(Math.random() * SEED_STOCKS.length)];
    const change = Number((Math.random() * 2 - 1).toFixed(2));
    stocks.push([
      {
        type: 'update',
        key: stock.id,
        patch: {
          price: stock.price + change,
          change,
          changePercent: Number(((change / stock.price) * 100).toFixed(2)),
        },
      },
    ]);
  }, 600);
  return () => clearInterval(timer);
}, [stocks]);`,
      jsx: `// pure updates patch rows in place — no reload, no scroll jump;
// highlightChanges flashes every patched cell
<OgeGrid data={stocks} keyField="id" columns={columns} highlightChanges />`,
    }),
  },
];
