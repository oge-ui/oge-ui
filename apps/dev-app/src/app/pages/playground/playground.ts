import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { Icon, type IconName } from '../../shared/icon';
import { makeEmployees } from '../../shared/demo-data';

interface Toggle {
  key: string;
  label: string;
  icon: IconName;
  state: WritableSignal<boolean>;
}

/**
 * Interactive playground: every switch drives a real grid input so the
 * feature set can be explored live; the matching markup updates below.
 */
@Component({
  selector: 'app-playground',
  imports: [OgeGrid, OgeColumn, CodeBlock, Icon, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header title="Playground" category="Data Grid">
      <p>
        Toggle the features — the grid, the live stats and the code snippet update instantly.
        Combine anything: virtual scroll with filters, selection with paging, all at once.
      </p>
    </app-doc-header>

    <div class="mb-4 grid grid-cols-4 gap-3 max-md:grid-cols-2">
      <div class="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Dataset</div>
        <div class="mt-0.5 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {{ rowCount().toLocaleString() }}
        </div>
        <div class="text-xs text-gray-400">rows in memory</div>
      </div>
      <div class="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">DOM</div>
        <div class="mt-0.5 text-xl font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
          {{ domRows() }}
        </div>
        <div class="text-xs text-gray-400">row elements rendered</div>
      </div>
      <div class="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Ratio</div>
        <div class="mt-0.5 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {{ domRatio() }}
        </div>
        <div class="text-xs text-gray-400">of the data is in the DOM</div>
      </div>
      <div class="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Features</div>
        <div class="mt-0.5 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {{ enabledCount() }}<span class="text-sm text-gray-400">/{{ toggles.length }}</span>
        </div>
        <div class="text-xs text-gray-400">enabled</div>
      </div>
    </div>

    <div class="grid grid-cols-[250px_minmax(0,1fr)] items-start gap-5 max-lg:grid-cols-1">
      <aside class="rounded-lg border border-gray-200 p-4 max-lg:order-first dark:border-gray-800">
        <div class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Features</div>
        <div class="flex flex-col">
          @for (option of toggles; track option.key) {
            <label
              class="flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-sm transition-colors hover:bg-gray-50"
            >
              <span class="flex items-center gap-2.5 text-gray-700 dark:text-gray-300">
                <span class="text-gray-400"><app-icon [name]="option.icon" [size]="14" /></span>
                {{ option.label }}
              </span>
              <span
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                [class]="option.state() ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'"
              >
                <input
                  type="checkbox"
                  class="sr-only"
                  [checked]="option.state()"
                  (change)="option.state.set(!option.state())"
                  [attr.aria-label]="option.label"
                />
                <span
                  class="inline-block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform"
                  [class.translate-x-4]="option.state()"
                ></span>
              </span>
            </label>
          }
        </div>

        <div class="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Data</div>
        <label class="flex items-center justify-between px-2 py-1 text-sm text-gray-700 dark:text-gray-300">
          Rows
          <select
            class="rounded-md border border-gray-200 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            [value]="rowCount()"
            (change)="rowCount.set(+$any($event.target).value)"
          >
            <option [value]="100">100</option>
            <option [value]="1000">1.000</option>
            <option [value]="10000">10.000</option>
            <option [value]="100000">100.000</option>
          </select>
        </label>
        @if (paging()) {
          <label class="flex items-center justify-between px-2 py-1 text-sm text-gray-700 dark:text-gray-300">
            Page size
            <select
              class="rounded-md border border-gray-200 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              [value]="pageSize()"
              (change)="pageSize.set(+$any($event.target).value)"
            >
              <option [value]="10">10</option>
              <option [value]="15">15</option>
              <option [value]="25">25</option>
            </select>
          </label>
        }
        <div class="mt-4 flex gap-2 border-l-2 border-indigo-200 bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600 dark:border-indigo-900 dark:bg-gray-900 dark:text-gray-400">
          <span class="mt-0.5 shrink-0 text-indigo-500"><app-icon name="lightbulb" [size]="13" /></span>
          <span>
            Enable <strong>Virtual scroll</strong> with 100.000 rows — the DOM never holds more
            than ~30 rows while scrolling.
          </span>
        </div>
      </aside>

      <div class="min-w-0">
        <oge-grid
          [data]="employees()"
          keyField="id"
          [virtualScroll]="virtualScroll()"
          [paging]="paging() ? { pageSize: pageSize() } : false"
          [filterRow]="filterRow()"
          [headerFilter]="headerFilter()"
          [searchPanel]="searchPanel()"
          [sortable]="sortable() ? 'multi' : false"
          [style.height]="virtualScroll() ? '520px' : null"
        >
          <oge-column field="id" caption="Id" [width]="80" dataType="number" />
          <oge-column field="firstName" caption="First Name" />
          <oge-column field="lastName" caption="Last Name" />
          <oge-column field="department" caption="Department" />
          <oge-column field="city" caption="City" />
          <oge-column field="salary" caption="Salary" dataType="number" />
        </oge-grid>
        <app-code-block [code]="snippet()" language="html" />
      </div>
    </div>
  `,
})
export class PlaygroundPage {
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly domRows = signal(0);

  constructor() {
    afterNextRender(() => {
      const timer = setInterval(() => {
        this.domRows.set(this.hostRef.nativeElement.querySelectorAll('.oge-row').length);
      }, 400);
      this.destroyRef.onDestroy(() => clearInterval(timer));
    });
  }

  protected readonly domRatio = computed(() => {
    const total = this.rowCount();
    const dom = this.domRows();
    if (!total || !dom) return '—';
    const ratio = (dom / total) * 100;
    return ratio >= 1 ? `${Math.round(ratio)}%` : `${ratio.toFixed(2)}%`;
  });

  protected readonly enabledCount = computed(
    () => this.toggles.filter((toggle) => toggle.state()).length
  );

  protected readonly sortable = signal(true);
  protected readonly filterRow = signal(true);
  protected readonly headerFilter = signal(false);
  protected readonly searchPanel = signal(true);
  protected readonly paging = signal(true);
  protected readonly virtualScroll = signal(false);
  protected readonly pageSize = signal(15);
  protected readonly rowCount = signal(1000);

  protected readonly toggles: Toggle[] = [
    { key: 'sortable', label: 'Sorting', icon: 'sort', state: this.sortable },
    { key: 'filterRow', label: 'Filter row', icon: 'filter', state: this.filterRow },
    { key: 'headerFilter', label: 'Header filter', icon: 'chevron-down', state: this.headerFilter },
    { key: 'searchPanel', label: 'Search panel', icon: 'search', state: this.searchPanel },
    { key: 'paging', label: 'Paging', icon: 'pages', state: this.paging },
    { key: 'virtualScroll', label: 'Virtual scroll', icon: 'zap', state: this.virtualScroll },
  ];

  protected readonly employees = computed(() => makeEmployees(this.rowCount()));

  protected readonly snippet = computed(() => {
    const attrs = [`[data]="employees"`, `keyField="id"`];
    if (this.virtualScroll()) attrs.push(`[virtualScroll]="true"`, `class="h-[520px]"`);
    if (this.paging()) attrs.push(`[paging]="{ pageSize: ${this.pageSize()} }"`);
    if (this.filterRow()) attrs.push(`[filterRow]="true"`);
    if (this.headerFilter()) attrs.push(`[headerFilter]="true"`);
    if (this.searchPanel()) attrs.push(`[searchPanel]="true"`);
    if (!this.sortable()) attrs.push(`[sortable]="false"`);
    return `<oge-grid ${attrs.join('\n          ')}>\n  <oge-column field="id" caption="Id" [width]="80" dataType="number" />\n  <oge-column field="firstName" caption="First Name" />\n  <!-- … -->\n</oge-grid>`;
  });
}
