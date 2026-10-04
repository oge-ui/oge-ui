import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { createElement, Fragment, type ReactNode } from 'react';
import { toLocalDate } from '@oge-ui/core';
import {
  OgeGrid,
  type OgeGridColumnProps,
  type OgeRowDropEvent,
} from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_PINNED_DEMOS } from './pinned-rows-snippets';

interface Task {
  id: number;
  title: string;
}

type DatedEmployee = Omit<Employee, 'hireDate'> & { hireDate: Date | null };

const employees = makeEmployees(23, 21);
const totals: Employee = {
  id: 0,
  firstName: 'Total',
  lastName: '',
  department: '',
  city: '',
  hireDate: '',
  salary: employees.reduce((sum, row) => sum + row.salary, 0),
};
const grouped: DatedEmployee[] = makeEmployees(400, 7).map((row) => ({
  ...row,
  hireDate: toLocalDate(row.hireDate),
}));

const PINNED_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'Name' },
  { field: 'department', caption: 'Department' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];

const STICKY_COLUMNS: OgeGridColumnProps<DatedEmployee>[] = [
  { field: 'department', caption: 'Department' },
  {
    field: 'hireDate',
    caption: 'Hired',
    dataType: 'date',
    groupInterval: 'quarter',
  },
  { field: 'firstName', caption: 'Name' },
  { field: 'city', caption: 'City' },
];

/** The React half of the pinned-rows page. */
@Component({
  selector: 'app-react-grid-pinned-rows-demos',
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
    <h3>Pinned rows & pager options</h3>
    <p>
      <code>pinnedTopRows</code> / <code>pinnedBottomRows</code> take data
      objects or keys of loaded rows; the pager adds first / last buttons, a
      go-to-page input and <code>renderPagerInfo</code>.
    </p>
    <app-demo-card
      [chips]="['sticky sections', 'showFirstLastButtons', 'showPageInput']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host class="demo-pinned-grid" [render]="pinned" />
    </app-demo-card>

    <h3>Sticky group rows</h3>
    <p>
      <code>stickyGroupRows</code> keeps the enclosing group rows under the
      header while scrolling, virtual scrolling included. Hire dates group by
      quarter.
    </p>
    <app-demo-card
      [chips]="['virtualScroll', 'groupInterval: quarter']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host class="demo-sticky-grid" [render]="sticky" />
    </app-demo-card>

    <h3>Drag rows between grids</h3>
    <p>
      Grids sharing a <code>rowDragGroup</code> accept each other's rows;
      <code>onRowDrop</code> on the target carries the source row — move the
      data there.
    </p>
    <app-demo-card
      [chips]="['rowDragGroup', 'onRowDrop']"
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="boards" />
    </app-demo-card>
  `,
})
export class ReactGridPinnedRowsDemos {
  protected readonly demos = GRID_PINNED_DEMOS;
  private readonly todo = signal<Task[]>([
    { id: 1, title: 'Write specs' },
    { id: 2, title: 'Review the API' },
    { id: 3, title: 'Ship it' },
  ]);
  private readonly done = signal<Task[]>([{ id: 4, title: 'Plan the wave' }]);

  protected readonly pinned = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: employees,
      keyField: 'id',
      columns: PINNED_COLUMNS,
      pinnedTopRows: [3],
      pinnedBottomRows: [totals],
      paging: { pageSize: 5, showFirstLastButtons: true, showPageInput: true },
      renderPagerInfo: (info) =>
        `${info.firstRow}–${info.lastRow} of ${info.totalCount}`,
    });

  protected readonly sticky = (): ReactNode =>
    createElement(OgeGrid<DatedEmployee>, {
      data: grouped,
      keyField: 'id',
      columns: STICKY_COLUMNS,
      style: { height: 360 },
      virtualScroll: true,
      stickyGroupRows: true,
      groupBy: ['department', 'hireDate'],
    });

  private readonly onDrop = (event: OgeRowDropEvent): void => {
    if (event.sameComponent) return;
    const from =
      event.sourceComponentId === 'react-todo' ? this.todo : this.done;
    const to = event.targetComponentId === 'react-todo' ? this.todo : this.done;
    const row = event.sourceRow as Task;
    from.update((rows) => rows.filter((r) => r.id !== row.id));
    to.update((rows) => {
      const next = [...rows];
      next.splice(event.toIndex, 0, row);
      return next;
    });
  };

  protected readonly boards = (): ReactNode =>
    createElement(
      'div',
      { className: 'grid grid-cols-2 gap-4 max-md:grid-cols-1' },
      createElement(
        Fragment,
        null,
        createElement(OgeGrid<Task>, {
          id: 'react-todo',
          className: 'demo-drag-todo',
          data: this.todo(),
          keyField: 'id',
          rowDragging: true,
          rowDragGroup: 'tasks',
          columns: [{ field: 'title', caption: 'To do' }],
          onRowDrop: this.onDrop,
        }),
        createElement(OgeGrid<Task>, {
          id: 'react-done',
          className: 'demo-drag-done',
          data: this.done(),
          keyField: 'id',
          rowDragging: true,
          rowDragGroup: 'tasks',
          columns: [{ field: 'title', caption: 'Done' }],
          onRowDrop: this.onDrop,
        }),
      ),
    );
}
