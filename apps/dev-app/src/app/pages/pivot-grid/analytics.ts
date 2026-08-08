import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { OgePivotField, OgePivotGrid } from '@oge-ui/pivot';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { ANALYTICS_SNIPPET, EXPORT_SNIPPET } from './analytics-snippets';

interface Sale {
  region: string;
  country: string;
  city: string;
  date: string;
  amount: number;
  units: number;
}

const PLACES: { region: string; country: string; city: string }[] = [
  { region: 'Europe', country: 'Germany', city: 'Berlin' },
  { region: 'Europe', country: 'Germany', city: 'Munich' },
  { region: 'Europe', country: 'France', city: 'Paris' },
  { region: 'Europe', country: 'Spain', city: 'Madrid' },
  { region: 'Americas', country: 'USA', city: 'New York' },
  { region: 'Americas', country: 'USA', city: 'Austin' },
  { region: 'Americas', country: 'Canada', city: 'Toronto' },
  { region: 'Asia', country: 'Japan', city: 'Tokyo' },
  { region: 'Asia', country: 'Korea', city: 'Seoul' },
  { region: 'Asia', country: 'Singapore', city: 'Singapore' },
];

function makeSales(count: number): Sale[] {
  return Array.from({ length: count }, (_, i) => ({
    ...PLACES[i % PLACES.length],
    date: `${String(2022 + (i % 4))}-${String(1 + (i % 12)).padStart(2, '0')}-15`,
    amount: 500 + ((i * 7919) % 9500),
    units: 1 + (i % 20),
  }));
}

@Component({
  selector: 'app-pivot-analytics',
  imports: [OgePivotGrid, OgePivotField, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Pivot Analytics & Export"
      category="Pivot Grid"
      [chips]="[
        'display modes',
        'virtual scrolling',
        'stateKey',
        'CSV / Excel',
      ]"
    >
      <p>
        Measures can be shown as percentages of a total or as running sums, big
        matrices stay smooth with two-axis virtual scrolling, the whole layout
        persists under a
        <code>stateKey</code>, and the visible matrix exports to CSV or a typed
        Excel workbook with merged multi-level headers.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['50.000 rows', 'percent of column', 'running total', 'virtual']"
      [code]="analyticsSnippet"
      language="ts"
    >
      <div class="mb-2 flex items-center justify-between gap-3">
        <span class="text-sm text-gray-500 dark:text-gray-400">
          Right-click a header for sorting and filters; the second measure shows
          each column's share of its grand total.
        </span>
        <button
          type="button"
          class="oge-toolbar-btn oge-toolbar-text-btn"
          (click)="analytics().showFieldChooser()"
        >
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          Field chooser
        </button>
      </div>
      <oge-pivot-grid
        #analyticsPivot
        [data]="bigSales"
        [virtualScrolling]="true"
        style="max-height: 520px"
      >
        <oge-pivot-field dataField="region" area="row" />
        <oge-pivot-field dataField="country" area="row" />
        <oge-pivot-field
          dataField="date"
          caption="Year"
          area="column"
          groupInterval="year"
        />
        <oge-pivot-field
          dataField="amount"
          caption="Amount"
          area="data"
          summaryType="sum"
          [format]="money"
        />
        <oge-pivot-field
          dataField="amount"
          id="share"
          caption="% of Column"
          area="data"
          summaryType="sum"
          summaryDisplayMode="percentOfColumnGrandTotal"
        />
      </oge-pivot-grid>
    </app-demo-card>

    <app-demo-card
      [chips]="['stateKey', 'exportCsv', 'export-excel entry']"
      [code]="exportSnippet"
      language="ts"
    >
      <div class="mb-2 flex items-center justify-between gap-3">
        <span class="text-sm text-gray-500 dark:text-gray-400">
          Re-pivot or expand something, reload the page — the layout comes back.
        </span>
        <span class="flex items-center gap-1.5">
          <button
            type="button"
            class="oge-toolbar-btn oge-toolbar-text-btn"
            (click)="report().exportCsv('sales.csv')"
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="16" y2="17" />
            </svg>
            CSV
          </button>
          <button
            type="button"
            class="oge-toolbar-btn oge-toolbar-text-btn oge-btn-accent"
            (click)="downloadExcel()"
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            Excel
          </button>
        </span>
      </div>
      <oge-pivot-grid
        #reportPivot
        [data]="sales"
        stateKey="demo-pivot-report"
        style="max-height: 460px"
      >
        <oge-pivot-field dataField="region" area="row" />
        <oge-pivot-field dataField="city" area="row" />
        <oge-pivot-field
          dataField="date"
          caption="Year"
          area="column"
          groupInterval="year"
        />
        <oge-pivot-field
          dataField="amount"
          caption="Amount"
          area="data"
          summaryType="sum"
          [format]="money"
        />
        <oge-pivot-field
          dataField="units"
          caption="Units"
          area="data"
          summaryType="sum"
        />
      </oge-pivot-grid>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <code>summaryDisplayMode</code>: percent-of row/column/grand totals and
        variations against the previous column;
        <code>runningTotal</code> accumulates along an axis and resets per
        group.
      </li>
      <li>
        <code>[virtualScrolling]="true"</code> windows both axes — only the
        visible headers and cells hit the DOM, wherever you scroll.
      </li>
      <li>
        <code>stateKey</code> saves field layout, expansion and the panel state
        through the same storage token the data grid uses
        (<code>OGE_STATE_STORAGE</code>); <code>state()</code> /
        <code>applyState()</code> give you the snapshot programmatically.
      </li>
      <li>
        <code>getCsv()</code> / <code>exportCsv()</code> flatten exactly what is
        on screen; <code>&#64;oge-ui/pivot/export-excel</code> adds
        <code>buildPivotWorkbook</code> + <code>exportPivotToExcel</code> and
        stays out of your main bundle.
      </li>
    </ul>
  `,
})
export class PivotAnalyticsPage {
  protected readonly bigSales = makeSales(50000);
  protected readonly sales = makeSales(5000);
  protected readonly analyticsSnippet = ANALYTICS_SNIPPET;
  protected readonly exportSnippet = EXPORT_SNIPPET;

  protected readonly analytics =
    viewChild.required<OgePivotGrid<Sale>>('analyticsPivot');
  protected readonly report =
    viewChild.required<OgePivotGrid<Sale>>('reportPivot');

  protected readonly money = (value: unknown): string =>
    typeof value === 'number'
      ? `₺${Math.round(value).toLocaleString('tr-TR')}`
      : String(value ?? '');

  protected async downloadExcel(): Promise<void> {
    const { exportPivotToExcel } = await import('@oge-ui/pivot/export-excel');
    await exportPivotToExcel(this.report(), { filename: 'sales.xlsx' });
  }
}
