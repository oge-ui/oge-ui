import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import { toLocalDate } from '@oge-ui/core';
import {
  OgeGrid,
  type OgeGridCellRange,
  type OgeGridColumnProps,
} from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_RANGE_DEMOS } from './range-selection-snippets';

type DatedEmployee = Omit<Employee, 'hireDate'> & { hireDate: Date | null };

const employees: DatedEmployee[] = makeEmployees(60, 3).map((row) => ({
  ...row,
  hireDate: toLocalDate(row.hireDate),
}));
const asyncRows: DatedEmployee[] = makeEmployees(5, 9).map((row) => ({
  ...row,
  hireDate: toLocalDate(`${row.hireDate}T09:30`),
}));

const RANGE_COLUMNS: OgeGridColumnProps<DatedEmployee>[] = [
  { field: 'firstName', caption: 'First name' },
  { field: 'department', caption: 'Department' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
  { field: 'hireDate', caption: 'Hired', dataType: 'date' },
  { field: 'id', caption: 'Id', width: 70, editable: false },
];

const uniqueName = (value: unknown) =>
  new Promise<string | null>((resolve) =>
    setTimeout(
      () => resolve(value === 'Taken' ? 'This name is taken' : null),
      600,
    ),
  );

/** The React half of the range-selection page. */
@Component({
  selector: 'app-react-grid-range-selection-demos',
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
    <h3>Ranges, copy, paste & fill</h3>
    <p>
      Click a cell, then <kbd>Shift</kbd>+click or drag to grow the range;
      <kbd>Shift</kbd>+arrows extend it and <kbd>Ctrl</kbd>+click adds another.
      <kbd>Ctrl</kbd>+<kbd>C</kbd> copies TSV, <kbd>Ctrl</kbd>+<kbd>V</kbd>
      pastes from the focused cell, <kbd>Ctrl</kbd>+<kbd>D</kbd> /
      <kbd>Ctrl</kbd>+<kbd>R</kbd> fill, <kbd>Ctrl</kbd>+<kbd>Z</kbd> /
      <kbd>Ctrl</kbd>+<kbd>Y</kbd> undo and redo.
    </p>
    <app-demo-card
      [chips]="['batch editing', 'copyHeaders', 'pasteAddsRows']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host class="demo-range-grid" [render]="ranges" />
      <p
        class="demo-range-summary mt-2 text-sm text-gray-500 dark:text-gray-400"
      >
        {{ summary() || 'No range selected' }}
      </p>
    </app-demo-card>

    <h3>Async validation</h3>
    <p>
      A column rule may return a promise: the editor is
      <code>aria-busy</code> while it runs and a save waits for it. Type
      <em>Taken</em> as a last name to see the rejection.
    </p>
    <app-demo-card
      [chips]="['promise validators', 'datetime']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="asyncGrid" />
    </app-demo-card>
  `,
})
export class ReactGridRangeSelectionDemos {
  protected readonly demos = GRID_RANGE_DEMOS;
  protected readonly summary = signal('');
  private readonly selected = signal<readonly OgeGridCellRange[]>([]);

  protected readonly ranges = (): ReactNode =>
    createElement(OgeGrid<DatedEmployee>, {
      data: employees,
      keyField: 'id',
      columns: RANGE_COLUMNS,
      selectionMode: 'cell',
      rangeSelection: { copyHeaders: true, pasteAddsRows: true },
      editing: { mode: 'batch', allowUpdating: true },
      selectedRanges: this.selected(),
      onSelectedRangesChange: (next) => this.selected.set(next),
      onRangeSelectionChanged: (event) =>
        this.summary.set(
          event.cellCount
            ? `${event.cellCount} cells in ${event.ranges.length} range(s)`
            : '',
        ),
      style: { height: 380 },
    });

  protected readonly asyncGrid = (): ReactNode =>
    createElement(OgeGrid<DatedEmployee>, {
      data: asyncRows,
      keyField: 'id',
      editing: { mode: 'row', allowUpdating: true },
      columns: [
        {
          field: 'lastName',
          caption: 'Last name (unique)',
          validators: [uniqueName],
        },
        { field: 'hireDate', caption: 'Hired at', dataType: 'datetime' },
      ],
    });
}
