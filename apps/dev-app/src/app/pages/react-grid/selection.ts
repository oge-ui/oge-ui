import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import type { FilterExpr, RowKey } from '@oge-ui/core';
import { OgeGrid, type OgeGridColumnProps } from '@oge-ui/react-grid';
import { OgeCard } from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_SELECTION_DEMOS } from './selection-snippets';

const employees = makeEmployees(1000);
const deferredRows = makeEmployees(60, 5);

const COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 80, dataType: 'number' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
];

const DEFERRED_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'department', caption: 'Department' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];

/**
 * The React half of the selection page — checkbox selection with a
 * context menu, and deferred selection driven by a `FilterExpr`, rendered as
 * real React trees inside `/components/data-grid/selection` when the reader
 * has chosen React.
 */
@Component({
  selector: 'app-react-grid-selection-demos',
  imports: [DemoCard, ReactHost, OgeCard, JsonPipe],
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
      [chips]="['1.000 rows', 'virtual', 'filterRow']"
      [code]="demos[0].source"
      language="tsx"
    >
      <div class="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Selected:
        <span class="font-semibold text-gray-900 dark:text-gray-100">{{
          selected().length
        }}</span>
        rows
        @if (lastAction()) {
          <span
            class="ml-3 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-800"
            >{{ lastAction() }}</span
          >
        }
      </div>
      <app-react-host [render]="selection" />
    </app-demo-card>

    <h3>Deferred selection</h3>
    <p>
      With <code>selectionDeferred</code> the grid never materializes a key list
      — the selection <em>is</em> a serializable <code>FilterExpr</code> in the
      controlled <code>selectionFilter</code> pair. Select-all over a million
      remote rows costs nothing: the expression captures the current filter, and
      unchecking a row just adds an <code>and-not</code> clause. Send the
      expression to your backend to process the selection server-side.
    </p>

    <app-demo-card
      [chips]="['selectionDeferred', 'selectionFilter']"
      [code]="demos[1].source"
      language="tsx"
    >
      <div
        class="grid grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] items-start gap-4 max-lg:grid-cols-1"
      >
        <app-react-host [render]="deferred" />
        <oge-card
          stylingMode="filled"
          size="sm"
          class="max-h-[420px]"
          style="overflow: auto"
          role="complementary"
        >
          <h3 class="!mt-0 mb-2 text-sm font-semibold">selectionFilter</h3>
          <pre
            class="m-0 whitespace-pre-wrap break-all font-mono text-xs leading-relaxed"
            >{{
              selectionFilter() === null
                ? 'null  (nothing selected)'
                : (selectionFilter() | json)
            }}</pre>
        </oge-card>
      </div>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <code>selectedKeys</code> + <code>onSelectedKeysChange</code> is the
        controlled pair — push keys in from outside and the checkboxes follow;
        <code>defaultSelectedKeys</code> seeds it once instead.
      </li>
      <li>
        Select-all operates on the <em>filtered</em> set: apply a filter first
        and only matching rows are selected.
        <code>selectAllMode="page"</code> restricts it to the visible page.
      </li>
      <li>
        <kbd>Shift</kbd>-ranges span group rows correctly (only data rows are
        selected).
      </li>
      <li>
        <kbd>Ctrl</kbd>+<kbd>C</kbd> (or <code>copyToClipboard()</code> on the
        handle) copies the selected rows as tab-separated text ready for Excel.
      </li>
      <li>
        Full keyboard support: arrows, <kbd>Home</kbd>/<kbd>End</kbd>,
        <kbd>PageUp</kbd>/<kbd>PageDown</kbd>, <kbd>Space</kbd> to select —
        WAI-ARIA grid pattern, verified with axe.
      </li>
    </ul>
  `,
})
export class ReactGridSelectionDemos {
  protected readonly demos = GRID_SELECTION_DEMOS;
  protected readonly selected = signal<RowKey[]>([]);
  protected readonly selectionFilter = signal<FilterExpr | null>(null);
  protected readonly lastAction = signal('');

  protected readonly selection = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: employees,
      keyField: 'id',
      columns: COLUMNS,
      selectionMode: 'checkbox',
      selectedKeys: this.selected(),
      onSelectedKeysChange: (keys) => this.selected.set(keys),
      filterRow: true,
      filterDebounce: 200,
      virtualScroll: true,
      style: { height: 480 },
      onRowContextMenu: (event) => {
        event.items.push(
          {
            text: `Copy "${event.row.firstName} ${event.row.lastName}"`,
            action: () => {
              navigator.clipboard?.writeText(
                `${event.row.firstName} ${event.row.lastName}`,
              );
              this.lastAction.set(`copied #${event.row.id}`);
            },
          },
          {
            text: 'Select this row only',
            action: () => {
              this.selected.set([event.key]);
              this.lastAction.set(`selected #${event.row.id}`);
            },
          },
          { text: 'Delete (disabled)', disabled: true },
        );
      },
    });

  protected readonly deferred = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: deferredRows,
      keyField: 'id',
      columns: DEFERRED_COLUMNS,
      selectionMode: 'checkbox',
      selectionDeferred: true,
      selectionFilter: this.selectionFilter(),
      onSelectionFilterChange: (value) => this.selectionFilter.set(value),
      paging: { pageSize: 8 },
    });
}
