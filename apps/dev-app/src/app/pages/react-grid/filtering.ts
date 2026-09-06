import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import type { FilterExpr } from '@oge-ui/core';
import { OgeGrid, type OgeGridColumnProps } from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_FILTERING_DEMOS } from './filtering-snippets';

const employees = makeEmployees(2000, 5);

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
@Component({
  selector: 'app-react-grid-filtering-demos',
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
