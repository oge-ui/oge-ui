import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { CustomDataSource, type RowKey } from '@oge-ui/core';
import {
  OgeColumn,
  OgeGrid,
  OgeNoDataTemplate,
  OgeRowTemplate,
  type OgeRowReorderedEvent,
} from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import {
  DRAG_SNIPPET,
  NODATA_SNIPPET,
  ROW_TEMPLATE_SNIPPET,
} from './rows-snippets';

@Component({
  selector: 'app-rows',
  imports: [
    OgeGrid,
    OgeColumn,
    OgeRowTemplate,
    OgeNoDataTemplate,
    DemoCard,
    DocHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Rows & Templates"
      [chips]="[
        'ogeRowTemplate',
        'ogeNoDataTemplate',
        'rowDragging',
        'focusedRow',
        'loadPanel',
      ]"
    >
      <p>
        Full control over row rendering: replace entire rows with
        <code>*ogeRowTemplate</code>, style the empty state with
        <code>*ogeNoDataTemplate</code>, reorder rows by dragging, track a
        focused row and show a loading panel while remote data is in flight.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['ogeRowTemplate', 'rowAlternation']"
      [code]="rowTemplateSnippet"
      language="ts"
    >
      <oge-grid
        [data]="cards"
        keyField="id"
        [rowAlternation]="true"
        [paging]="{ pageSize: 6 }"
      >
        <oge-column field="firstName" caption="Employee" />
        <oge-column field="department" caption="Department" />
        <oge-column field="salary" caption="Salary" dataType="number" />
        <div
          *ogeRowTemplate="let employee of cards"
          class="flex w-full items-center gap-3 px-3 py-1.5"
        >
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
          >
            {{ initials(employee) }}
          </span>
          <div class="min-w-0">
            <div class="truncate text-sm font-medium">
              {{ employee.firstName }} {{ employee.lastName }}
            </div>
            <div class="truncate text-xs text-gray-500 dark:text-gray-400">
              {{ employee.department }} · {{ employee.city }}
            </div>
          </div>
          <span class="ms-auto font-mono text-sm tabular-nums">{{
            money(employee.salary)
          }}</span>
        </div>
      </oge-grid>
    </app-demo-card>

    <h3>Row drag & drop + focused row</h3>
    <app-demo-card
      [chips]="['rowDragging', 'focusedRowEnabled']"
      [code]="dragSnippet"
      language="ts"
    >
      <div class="mb-2 text-sm text-gray-500 dark:text-gray-400">
        Focused row key:
        <span
          class="font-mono font-semibold text-gray-900 dark:text-gray-100"
          >{{ focusedKey() ?? '—' }}</span
        >
        @if (lastReorder()) {
          <span
            class="ml-3 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-800"
            >{{ lastReorder() }}</span
          >
        }
      </div>
      <oge-grid
        [data]="dragRows"
        keyField="id"
        [rowDragging]="true"
        (rowReordered)="onReordered($event)"
        [focusedRowEnabled]="true"
        [focusedRowKey]="focusedKey()"
        (focusedRowKeyChange)="focusedKey.set($event)"
      >
        <oge-column field="id" caption="Id" [width]="70" dataType="number" />
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="department" caption="Department" />
      </oge-grid>
    </app-demo-card>

    <h3>Empty state & loading panel</h3>
    <app-demo-card
      [chips]="['ogeNoDataTemplate', 'loadPanel', '800ms latency']"
      [code]="noDataSnippet"
      language="ts"
    >
      <div class="mb-2">
        <button
          type="button"
          class="rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          (click)="reloadEmpty()"
        >
          Reload (watch the panel)
        </button>
      </div>
      <oge-grid
        #emptyGrid
        [data]="emptySource"
        keyField="id"
        [loadPanel]="true"
        style="min-height: 180px"
      >
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="department" caption="Department" />
        <div
          *ogeNoDataTemplate
          class="flex flex-col items-center gap-2 py-6 text-gray-500 dark:text-gray-400"
        >
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5M8 11h6" />
          </svg>
          <span
            >No employees match — adjust the filter or add a new record.</span
          >
        </div>
      </oge-grid>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <code>*ogeRowTemplate</code> replaces only <em>data</em> rows — group
        rows, detail rows and summaries keep their built-in rendering;
        sorting/filtering/selection still work through the declared columns.
      </li>
      <li>
        <code>rowAlternation</code> stripes odd rows via the
        <code>--oge-row-alt-bg</code> token.
      </li>
      <li>
        <code>rowReordered</code> reports the moved key plus from/to view
        positions; with a plain array the order is persisted in place.
      </li>
      <li>
        <code>focusedRowKey</code> is a two-way model — set it programmatically
        and the row highlights (and vice versa).
      </li>
      <li>
        <code>loadPanel</code> shows a spinner overlay for any in-flight load of
        a remote source.
      </li>
    </ul>
  `,
})
export class RowsPage {
  protected readonly rowTemplateSnippet = ROW_TEMPLATE_SNIPPET;
  protected readonly dragSnippet = DRAG_SNIPPET;
  protected readonly noDataSnippet = NODATA_SNIPPET;

  protected readonly cards = makeEmployees(18, 21);
  protected readonly dragRows = makeEmployees(6, 13);
  protected readonly focusedKey = signal<RowKey | null>(null);
  protected readonly lastReorder = signal('');

  protected readonly emptyGrid = viewChild<OgeGrid<Employee>>('emptyGrid');

  /** Always-empty remote source with latency, to show loadPanel + the empty state. */
  protected readonly emptySource = new CustomDataSource<Employee>({
    key: 'id',
    load: async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return { data: [], totalCount: 0 };
    },
  });

  protected reloadEmpty(): void {
    this.emptyGrid()?.refresh();
  }

  protected initials(employee: Employee): string {
    return `${employee.firstName[0] ?? ''}${employee.lastName[0] ?? ''}`;
  }

  protected readonly money = (value: unknown): string =>
    typeof value === 'number'
      ? `₺${value.toLocaleString('tr-TR')}`
      : String(value ?? '');

  protected onReordered(event: OgeRowReorderedEvent<Employee>): void {
    this.lastReorder.set(`#${String(event.key)} → index ${event.toIndex}`);
  }
}
