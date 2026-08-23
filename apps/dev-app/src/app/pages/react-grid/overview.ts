import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { createElement, useRef, type ReactNode } from 'react';
import {
  OgeGrid,
  type OgeGridColumnProps,
  type OgeGridHandle,
} from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_OVERVIEW_DEMOS } from './overview-snippets';

const employees = makeEmployees(50);

const money = (value: unknown): string =>
  typeof value === 'number'
    ? `₺${value.toLocaleString('tr-TR')}`
    : String(value ?? '');

const COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  {
    field: 'department',
    caption: 'Department',
    renderCell: ({ value }) =>
      createElement(
        'span',
        {
          className:
            'rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
        },
        String(value),
      ),
  },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number', format: money },
  { field: 'hireDate', caption: 'Hire Date', dataType: 'date', width: 120 },
];

function QuickStartDemo(): ReactNode {
  const grid = useRef<OgeGridHandle<Employee>>(null);
  return createElement(
    'div',
    null,
    createElement(OgeGrid<Employee>, {
      ref: grid,
      data: employees,
      keyField: 'id',
      columns: COLUMNS,
      paging: { pageSize: 10 },
    }),
    createElement(
      'button',
      {
        type: 'button',
        className: 'oge-tool-btn oge-tool-text-btn mt-2',
        onClick: () => grid.current?.exportCsv('employees.csv'),
      },
      'Export CSV',
    ),
  );
}

/**
 * The React half of the data-grid overview — the same quick-start demo as
 * the Angular page, rendered as a real React tree inside
 * `/components/data-grid` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-grid-overview-demos',
  imports: [DemoCard, ReactHost, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React grid carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles, plus the filter-row
  // editors (inputs), the toolbar (layout) and the operator menu (overlay).
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/grid/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/layout/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['50 rows', 'paging', 'renderCell']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="quickStart" />
    </app-demo-card>

    <h3>API</h3>
    <p>
      The complete reference — every prop, callback, handle method and
      supporting type of <code>&lt;OgeGrid&gt;</code> and its column objects —
      lives on the
      <a
        routerLink="/components/data-grid/api"
        class="text-indigo-600 underline dark:text-indigo-400"
        >API Reference</a
      >
      page.
    </p>

    <h3>Export</h3>
    <p>
      CSV ships in the package: <code>getCsv()</code>,
      <code>exportCsv()</code> and <code>copyToClipboard()</code> on the handle,
      fed by the same <code>getExportData()</code> the Angular exporters use.
      Paging is ignored by default — the export contains the
      <em>full</em> filtered + sorted set; pass
      <code>{{ '{' }} scope: 'page' {{ '}' }}</code> for the current page only,
      or <code>'selection'</code> for the selected rows.
      <code>customizeCell</code> rewrites individual cells.
    </p>

    <h3>Render props</h3>
    <p>
      <code>renderCell</code> customizes cells,
      <code>renderHeader</code> customizes headers and
      <code>renderNoData</code> the empty state — the React form of the Angular
      structural templates, typed through the row type parameter.
    </p>

    <h3>What ships in this slice</h3>
    <p>
      Sorting, the filter row with its operator menu, the search panel, paging,
      row and column virtualization, windowed remote loading, selection,
      keyboard navigation, the focused row, pinned and resizable columns,
      responsive hiding, <code>stateKey</code> persistence and CSV export run on
      the same engine as the Angular grid. Grouping, editing, master-detail,
      header filters, the filter builder, column chooser and reorder, context
      menus and row drag are the next slices — the feature pages show the
      Angular view until each lands.
    </p>
  `,
})
export class ReactGridOverviewDemos {
  protected readonly demos = GRID_OVERVIEW_DEMOS;
  protected readonly quickStart = () => createElement(QuickStartDemo);
}
