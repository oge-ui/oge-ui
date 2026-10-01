import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import { ArrayDataSource } from '@oge-ui/core';
import { OgeGrid, type OgeGridColumnProps } from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { GRID_LIVE_UPDATES_DEMOS } from './live-updates-snippets';

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

const money = (value: unknown): string =>
  typeof value === 'number'
    ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : String(value ?? '');

const thousands = (value: unknown): string =>
  typeof value === 'number'
    ? value.toLocaleString('en-US')
    : String(value ?? '');

const asNumber = (value: unknown): number =>
  typeof value === 'number' ? value : 0;

const signed = (value: number): string => {
  const text = value.toFixed(2);
  return value >= 0 ? `+${text}` : text;
};

const arrow = (up: boolean): ReactNode =>
  createElement(
    'svg',
    {
      viewBox: '0 0 16 16',
      width: 12,
      height: 12,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
    },
    createElement('path', {
      d: up ? 'M8 13V3m0 0L4 7m4-4 4 4' : 'M8 3v10m0 0 4-4m-4 4-4-4',
    }),
  );

const COLUMNS: OgeGridColumnProps<Stock>[] = [
  {
    field: 'symbol',
    caption: 'Symbol',
    width: 110,
    renderCell: ({ value }) =>
      createElement(
        'span',
        { className: 'font-semibold tracking-wide' },
        String(value),
      ),
  },
  { field: 'name', caption: 'Company' },
  {
    field: 'price',
    caption: 'Price',
    dataType: 'number',
    format: money,
    renderCell: ({ value }) =>
      createElement(
        'span',
        { className: 'font-semibold tabular-nums' },
        money(value),
      ),
  },
  {
    field: 'change',
    caption: 'Change',
    dataType: 'number',
    width: 170,
    renderCell: ({ value, row }) => {
      const up = asNumber(value) >= 0;
      return createElement(
        'span',
        {
          className: `inline-flex items-center gap-1 font-medium tabular-nums ${
            up
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`,
        },
        arrow(up),
        `${signed(asNumber(value))} (${signed(row.changePercent)}%)`,
      );
    },
  },
  { field: 'volume', caption: 'Volume', dataType: 'number', format: thousands },
];

/**
 * The React half of the live-updates page — the same twelve-symbol ticker
 * pushing `update` batches every 600 ms through `ArrayDataSource.push()`,
 * patched in place and flashed by `highlightChanges`, rendered as a real React
 * tree inside `/components/data-grid/live-updates` when the reader has chosen
 * React.
 */
@Component({
  selector: 'app-react-grid-live-updates-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/grid/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/layout/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="[
        'updates every 600ms',
        updateCount() + ' pushed',
        'highlightChanges',
      ]"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="ticker" />
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
export class ReactGridLiveUpdatesDemos {
  protected readonly demos = GRID_LIVE_UPDATES_DEMOS;
  protected readonly updateCount = signal(0);

  private readonly rows: Stock[] = SEED.map((stock) => ({
    ...stock,
    change: 0,
    changePercent: 0,
    volume: 1_000_000 + Math.floor(Math.random() * 9_000_000),
  }));

  private readonly stocks = new ArrayDataSource<Stock>(this.rows, {
    key: 'id',
  });

  protected readonly ticker = (): ReactNode =>
    createElement(OgeGrid<Stock>, {
      data: this.stocks,
      keyField: 'id',
      columns: COLUMNS,
      highlightChanges: true,
      sortable: 'single',
    });

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
