import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import { toLocalDate, type FilterExpr } from '@oge-ui/core';
import { OgeGrid, type OgeGridColumnProps } from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_FILTERING_DEMOS } from './filtering-snippets';

const employees = makeEmployees(2000, 5);

/** 60 rows, every seventh city left blank — the value list shows "(Blank)". */
const chipEmployees: Employee[] = makeEmployees(60, 21).map((row, i) =>
  i % 7 === 3 ? { ...row, city: '' } : row,
);

const COLUMNS: OgeGridColumnProps<Employee>[] = [
  {
    field: 'id',
    caption: 'Id',
    width: 70,
    dataType: 'number',
    filterable: false,
  },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
  { field: 'hireDate', caption: 'Hire Date', dataType: 'date', width: 120 },
];

/**
 * The React half of the filtering page — the same four surfaces on one grid as
 * the Angular page, rendered as a real React tree inside
 * `/components/data-grid/filtering` when the reader has chosen React.
 *
 * `filterValue` is driven from the Angular host's signal rather than React
 * state so the echo box above the grid can show what the builder produced —
 * the same thing the Angular demo does with `[(filterValue)]`.
 */
type DatedEmployee = Omit<Employee, 'hireDate'> & { hireDate: Date | null };

const datedEmployees: DatedEmployee[] = makeEmployees(80, 13).map((row) => ({
  ...row,
  hireDate: toLocalDate(row.hireDate),
}));

@Component({
  selector: 'app-react-grid-filtering-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/grid/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../shared/react-layout-demo-base.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['2.000 rows', 'all filter surfaces']"
      [code]="demos[0].source"
      language="tsx"
    >
      @if (filter()) {
        <div
          class="mb-3 rounded-md bg-gray-100 px-3 py-1.5 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          filterValue = {{ filterJson() }}
        </div>
      }
      <app-react-host [render]="filtering" />
    </app-demo-card>

    <h3>Filter chips and column summaries</h3>
    <app-demo-card
      [chips]="['filterChips', 'summaryMenu', '(Blank)']"
      description="<code>filterChips</code> shows every filter that narrows the rows as a removable chip — <em>Column · operator · value</em> — with a clear-all button; removing a chip also empties its editor. <code>summaryMenu</code> adds a <em>Summary</em> submenu to the header context menu (right-click a header): Count for any column, Sum / Avg / Min / Max for numbers. The pick persists with the grid state. In a value list, empty and missing values are one <em>(Blank)</em> item."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host class="demo-filter-chips" [render]="chips" />
    </app-demo-card>

    <h3>Excel-style filter menu</h3>
    <p>
      <code>headerFilter.mode</code>: <code>'list'</code> (default),
      <code>'conditions'</code> (two conditions joined by And / Or) or
      <code>'both'</code>. Date columns list their values as a year → month →
      day tree.
    </p>
    <app-demo-card
      [chips]="['headerFilter.mode', 'date tree']"
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host class="demo-filter-menu" [render]="menu" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Open the <strong>Hire Date</strong> header filter: date values are
        grouped into a year tree — the year checkbox toggles all its dates at
        once and the search box matches years or single dates.
      </li>
      <li>
        Every surface produces the same serializable
        <code>FilterExpr</code> tree — combined with AND and sent to your
        backend unchanged in remote mode.
      </li>
      <li>
        The operator button in each filter cell offers dataType-appropriate
        operators; <em>Reset</em> returns to the column default.
      </li>
      <li>
        <code>filterValue</code> + <code>onFilterValueChange</code> is the
        controlled pair: set it programmatically, read what the builder
        produced, persist it — it also participates in <code>stateKey</code>.
      </li>
      <li>
        Search highlighting only touches default cells; a column's
        <code>renderCell</code> output is never rewritten.
      </li>
    </ul>
  `,
})
export class ReactGridFilteringDemos {
  protected readonly demos = GRID_FILTERING_DEMOS;
  protected readonly filter = signal<FilterExpr | null>(null);

  protected filterJson(): string {
    return JSON.stringify(this.filter());
  }

  protected readonly chips = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: chipEmployees,
      keyField: 'id',
      filterRow: true,
      headerFilter: true,
      searchPanel: true,
      filterChips: true,
      summaryMenu: true,
      paging: { pageSize: 8 },
      columns: [
        { field: 'firstName', caption: 'First Name' },
        { field: 'city', caption: 'City' },
        {
          field: 'salary',
          caption: 'Salary',
          dataType: 'number',
          totalSummary: 'sum',
        },
      ],
    });

  protected readonly menu = (): ReactNode =>
    createElement(OgeGrid<DatedEmployee>, {
      data: datedEmployees,
      keyField: 'id',
      headerFilter: { mode: 'both' },
      paging: { pageSize: 8 },
      columns: [
        { field: 'firstName', caption: 'First Name' },
        { field: 'salary', caption: 'Salary', dataType: 'number' },
        { field: 'hireDate', caption: 'Hired', dataType: 'date' },
      ],
    });

  protected readonly filtering = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: employees,
      keyField: 'id',
      columns: COLUMNS,
      filterRow: true,
      headerFilter: true,
      searchPanel: true,
      filterPanel: true,
      filterValue: this.filter(),
      onFilterValueChange: (value) => this.filter.set(value),
      paging: { pageSize: 12 },
    });
}
