import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeCellTemplate', 'OgeColumn', 'OgeGrid'] },
  helpers: { '@oge-ui/core': ['ArrayDataSource'] },
  selector: 'app-ticker',
  className: 'TickerComponent',
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
];`,
  template: `<!-- pure updates patch rows in place — no reload, no scroll jump.
     highlightChanges flashes every patched cell -->
<oge-grid [data]="stocks" keyField="id" [highlightChanges]="true">
  <oge-column field="symbol" caption="Symbol" [width]="100" />
  <oge-column field="price" caption="Price" dataType="number" [format]="money" />
  <oge-column field="change" caption="Change" dataType="number">
    <span *ogeCellTemplate="let value; row as row"
          [class]="asStock(row).change >= 0 ? 'text-emerald-600' : 'text-red-600'">
      {{ value }} ({{ asStock(row).changePercent }}%)
    </span>
  </oge-column>
</oge-grid>`,
  body: `readonly stocks = new ArrayDataSource(SEED_STOCKS, { key: 'id' });

// the cell template's row context is untyped — narrow it once
protected asStock(row: unknown): Stock {
  return row as Stock;
}

protected readonly money = (value: unknown): string =>
  Number(value).toFixed(2);

constructor() {
  // any push source works: WebSocket, SSE, SignalR…
  const timer = setInterval(() => {
    const stock = SEED_STOCKS[Math.floor(Math.random() * SEED_STOCKS.length)];
    const change = Number((Math.random() * 2 - 1).toFixed(2));
    this.stocks.push([
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
  inject(DestroyRef).onDestroy(() => clearInterval(timer));
}`,
});
