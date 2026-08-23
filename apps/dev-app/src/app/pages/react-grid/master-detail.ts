import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import { OgeGrid, type OgeGridColumnProps } from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_MASTER_DETAIL_DEMOS } from './master-detail-snippets';

const employees = makeEmployees(100);

const COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
];

const CARD =
  'rounded-md border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900';
const LABEL =
  'text-[11px] font-semibold uppercase tracking-wider text-gray-400';

function card(title: string, ...lines: ReactNode[]): ReactNode {
  return createElement(
    'div',
    { className: CARD },
    createElement('div', { className: LABEL }, title),
    ...lines,
  );
}

function detail(employee: Employee): ReactNode {
  return createElement(
    'div',
    { className: 'grid grid-cols-3 gap-4 max-sm:grid-cols-1' },
    card(
      'Employee',
      createElement(
        'div',
        {
          className:
            'mt-1 text-sm font-medium text-gray-900 dark:text-gray-100',
        },
        `${employee.firstName} ${employee.lastName}`,
      ),
      createElement(
        'div',
        { className: 'text-sm text-gray-500 dark:text-gray-400' },
        `#${employee.id} · ${employee.department}`,
      ),
    ),
    card(
      'Location',
      createElement(
        'div',
        { className: 'mt-1 text-sm text-gray-700 dark:text-gray-300' },
        employee.city,
      ),
    ),
    card(
      'Compensation',
      createElement(
        'div',
        { className: 'mt-1 text-sm text-gray-700 dark:text-gray-300' },
        `₺${employee.salary.toLocaleString('tr-TR')}`,
      ),
      createElement(
        'div',
        { className: 'text-sm text-gray-500 dark:text-gray-400' },
        `since ${employee.hireDate}`,
      ),
    ),
  );
}

function MasterDetailDemo(): ReactNode {
  return createElement(OgeGrid<Employee>, {
    data: employees,
    keyField: 'id',
    columns: COLUMNS,
    renderDetail: ({ row }) => detail(row),
  });
}

/**
 * The React half of the master-detail page — the same demo as the Angular
 * page, rendered as a real React tree inside
 * `/components/data-grid/master-detail` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-grid-master-detail-demos',
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
      [chips]="['typed context']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="masterDetail" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        The detail area renders <em>any</em> React tree — nested grids, forms,
        charts.
      </li>
      <li>
        Detail rows work together with grouping, selection and virtual
        scrolling; in virtual mode set <code>detailRowHeight</code> so the
        scrollbar stays accurate.
      </li>
      <li>
        Expansion state is client-side only; expanding a row never refetches
        data. <code>expandRow(key)</code> / <code>collapseRow(key)</code> /
        <code>isRowExpanded(key)</code> live on the handle.
      </li>
      <li>
        The grid switches its ARIA role to <code>treegrid</code> automatically
        when detail rows are enabled.
      </li>
    </ul>
  `,
})
export class ReactGridMasterDetailDemos {
  protected readonly demos = GRID_MASTER_DETAIL_DEMOS;
  protected readonly masterDetail = () => createElement(MasterDetailDemo);
}
