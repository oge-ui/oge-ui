import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ArrayDataSource } from '@oge-ui/core';
import { OgeCellTemplate, OgeColumn, OgeGrid } from '@oge-ui/grid';
import { DemoCard, type DemoFile } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';

interface Stock {
  id: number;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

const SEED: Omit<Stock, 'change' | 'changePercent' | 'volume'>[] = [
  { id: 1, symbol: 'AAPL', name: 'Apple Inc.', price: 227.4 },
  { id: 2, symbol: 'MSFT', name: 'Microsoft Corp.', price: 415.2 },
  { id: 3, symbol: 'GOOG', name: 'Alphabet Inc.', price: 172.8 },
  { id: 4, symbol: 'AMZN', name: 'Amazon.com Inc.', price: 186.3 },
  { id: 5, symbol: 'NVDA', name: 'NVIDIA Corp.', price: 118.9 },
  { id: 6, symbol: 'META', name: 'Meta Platforms', price: 512.7 },
  { id: 7, symbol: 'TSLA', name: 'Tesla Inc.', price: 248.5 },
  { id: 8, symbol: 'AVGO', name: 'Broadcom Inc.', price: 168.4 },
  { id: 9, symbol: 'ORCL', name: 'Oracle Corp.', price: 139.6 },
  { id: 10, symbol: 'CRM', name: 'Salesforce Inc.', price: 263.1 },
  { id: 11, symbol: 'AMD', name: 'Advanced Micro Devices', price: 155.8 },
  { id: 12, symbol: 'INTC', name: 'Intel Corp.', price: 30.2 },
];

const FILES: DemoFile[] = [
  {
    name: 'ticker.component.ts',
    language: 'ts',
    code: `import { ArrayDataSource } from '@oge-ui/core';

export class TickerComponent {
  readonly stocks = new ArrayDataSource(SEED_STOCKS, { key: 'id' });

  constructor() {
    // any push source works: WebSocket, SSE, SignalR…
    setInterval(() => {
      const delta = randomDelta();
      this.stocks.push([
        { type: 'update', key: randomId(), patch: { price, change: delta, changePercent } },
      ]);
    }, 600);
  }
}`,
  },
  {
    name: 'ticker.component.html',
    language: 'html',
    code: `<!-- pure updates patch rows in place — no reload, no scroll jump.
     highlightChanges flashes every patched cell -->
<oge-grid [data]="stocks" keyField="id" [highlightChanges]="true">
  <oge-column field="symbol" caption="Symbol" [width]="100" />
  <oge-column field="price" caption="Price" dataType="number" [format]="money" />
  <oge-column field="change" caption="Change" dataType="number">
    <span *ogeCellTemplate="let value; row as stock"
          [class]="value >= 0 ? 'text-emerald-600' : 'text-red-600'">
      <svg><!-- up/down arrow --></svg>
      {{ value }} ({{ stock.changePercent }}%)
    </span>
  </oge-column>
</oge-grid>`,
  },
];

@Component({
  selector: 'app-live-updates',
  imports: [OgeGrid, OgeColumn, OgeCellTemplate, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Live Updates"
      [chips]="['DataSource.changes', 'push', 'highlightChanges']"
    >
      <p>
        Any DataSource can expose a <code>changes</code> stream; the grid
        subscribes and applies pushed batches without a reload. Pure
        <code>update</code> batches patch rows in place — sorting, selection and
        scroll position are untouched — and with
        <code>highlightChanges</code> every patched cell flashes briefly. Rising
        and falling prices are rendered by a typed
        <code>*ogeCellTemplate</code>.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="[
        'updates every 600ms',
        updateCount() + ' pushed',
        'highlightChanges',
      ]"
      [files]="files"
    >
      <oge-grid
        [data]="stocks"
        keyField="id"
        [highlightChanges]="true"
        [sortable]="'single'"
      >
        <oge-column field="symbol" caption="Symbol" [width]="110">
          <span
            *ogeCellTemplate="let value"
            class="font-semibold tracking-wide"
            >{{ value }}</span
          >
        </oge-column>
        <oge-column field="name" caption="Company" />
        <oge-column
          field="price"
          caption="Price"
          dataType="number"
          [format]="money"
        >
          <span
            *ogeCellTemplate="let value"
            class="font-semibold tabular-nums"
            >{{ money(value) }}</span
          >
        </oge-column>
        <oge-column
          field="change"
          caption="Change"
          dataType="number"
          [width]="170"
        >
          <span
            *ogeCellTemplate="let value; row as stock"
            class="inline-flex items-center gap-1 font-medium tabular-nums"
            [class]="
              asNumber(value) >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            "
          >
            @if (asNumber(value) >= 0) {
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M8 13V3m0 0L4 7m4-4 4 4" />
              </svg>
            } @else {
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M8 3v10m0 0 4-4m-4 4-4-4" />
              </svg>
            }
            {{ signed(asNumber(value)) }} ({{ signed(percentOf(stock)) }}%)
          </span>
        </oge-column>
        <oge-column
          field="volume"
          caption="Volume"
          dataType="number"
          [format]="thousands"
        />
      </oge-grid>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <code>highlightChanges</code> flashes exactly the patched cells —
        consecutive updates to the same cell restart the animation. Tune the
        color with the <code>--oge-update-flash-bg</code> token.
      </li>
      <li>
        <code>insert</code> / <code>remove</code> pushes re-run the current load
        so sorting, filtering and paging stay correct.
      </li>
      <li>
        <code>ArrayDataSource.push()</code> feeds the stream directly; map a
        WebSocket or SSE feed onto it for remote sources.
      </li>
    </ul>
  `,
})
export class LiveUpdatesPage {
  protected readonly files = FILES;
  protected readonly updateCount = signal(0);

  private readonly rows: Stock[] = SEED.map((stock) => ({
    ...stock,
    change: 0,
    changePercent: 0,
    volume: 1_000_000 + Math.floor(Math.random() * 9_000_000),
  }));

  protected readonly stocks = new ArrayDataSource<Stock>(this.rows, {
    key: 'id',
  });

  protected readonly money = (value: unknown): string =>
    typeof value === 'number'
      ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : String(value ?? '');

  protected readonly thousands = (value: unknown): string =>
    typeof value === 'number'
      ? value.toLocaleString('en-US')
      : String(value ?? '');

  protected asNumber(value: unknown): number {
    return typeof value === 'number' ? value : 0;
  }

  protected percentOf(row: unknown): number {
    return (row as Stock).changePercent;
  }

  protected signed(value: number): string {
    const text = value.toFixed(2);
    return value >= 0 ? `+${text}` : text;
  }

  constructor() {
    const timer = setInterval(() => {
      // patch a couple of random symbols per tick
      const batch = Array.from(
        { length: 2 + Math.floor(Math.random() * 2) },
        () => {
          const row = this.rows[Math.floor(Math.random() * this.rows.length)];
          const delta = row.price * (Math.random() * 0.012 - 0.006);
          const price = Math.max(1, row.price + delta);
          const change = price - (row.price - row.change); // vs. session open
          const changePercent = (change / (price - change)) * 100;
          return {
            type: 'update' as const,
            key: row.id,
            patch: {
              price: Math.round(price * 100) / 100,
              change: Math.round(change * 100) / 100,
              changePercent: Math.round(changePercent * 100) / 100,
              volume: row.volume + Math.floor(Math.random() * 40_000),
            },
          };
        },
      );
      this.stocks.push(batch);
      this.updateCount.update((count) => count + batch.length);
    }, 600);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
