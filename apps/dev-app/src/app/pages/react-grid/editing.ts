import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import {
  OgeGrid,
  type OgeCommandButton,
  type OgeEditMode,
  type OgeGridColumnProps,
} from '@oge-ui/react-grid';
import { OgeCard } from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_EDITING_DEMOS } from './editing-snippets';

interface Assignment {
  id: number;
  title: string;
  countryId: number;
  cityId: number;
  done: boolean;
}

interface City {
  id: number;
  countryId: number;
  name: string;
}

const employees = makeEmployees(30, 11);

const COUNTRIES = [
  { id: 1, name: 'Türkiye' },
  { id: 2, name: 'Germany' },
];

const CITIES: City[] = [
  { id: 1, countryId: 1, name: 'İstanbul' },
  { id: 2, countryId: 1, name: 'Ankara' },
  { id: 3, countryId: 2, name: 'Berlin' },
  { id: 4, countryId: 2, name: 'Munich' },
];

const ASSIGNMENTS: Assignment[] = [
  { id: 1, title: 'Site survey', countryId: 1, cityId: 1, done: false },
  { id: 2, title: 'Install rollout', countryId: 1, cityId: 2, done: true },
  { id: 3, title: 'Kickoff workshop', countryId: 2, cityId: 3, done: false },
  { id: 4, title: 'Audit visit', countryId: 2, cityId: 4, done: false },
];

const DEPARTMENTS = ['Engineering', 'Sales', 'HR', 'Finance', 'Support'];

const EMPLOYEE_COLUMNS: OgeGridColumnProps<Employee>[] = [
  {
    field: 'id',
    caption: 'Id',
    width: 70,
    dataType: 'number',
    editable: false,
  },
  { field: 'firstName', caption: 'First Name', required: true },
  { field: 'lastName', caption: 'Last Name', required: true },
  {
    field: 'department',
    caption: 'Department',
    // the React form of `*ogeEditTemplate` — a real <select> over the draft
    renderEditor: ({ value, setValue, commit, cancel }) =>
      createElement(
        'select',
        {
          className:
            'oge-editor w-full rounded border border-indigo-400 px-2 py-1 text-sm dark:bg-gray-900',
          value: String(value ?? ''),
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            setValue(event.target.value),
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') cancel();
          },
        },
        ...DEPARTMENTS.map((name) =>
          createElement('option', { key: name }, name),
        ),
      ),
  },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];

const ASSIGNMENT_COLUMNS: OgeGridColumnProps<Assignment>[] = [
  { field: 'title', caption: 'Task' },
  {
    field: 'countryId',
    caption: 'Country',
    lookup: { dataSource: COUNTRIES, valueExpr: 'id', displayExpr: 'name' },
  },
  {
    field: 'cityId',
    caption: 'City',
    lookup: {
      // cascading: the list is a function of the row's *draft* country
      dataSource: (row: Assignment) =>
        CITIES.filter((city) => city.countryId === row.countryId),
      valueExpr: 'id',
      displayExpr: 'name',
    },
  },
  { field: 'done', caption: 'Done', dataType: 'boolean', width: 90 },
];

/**
 * The React half of the editing page — the five modes over one grid, and
 * cascading lookups with a customized command column, rendered as real React
 * trees inside `/components/data-grid/editing` when the reader has chosen
 * React.
 */
@Component({
  selector: 'app-react-grid-editing-demos',
  imports: [DemoCard, ReactHost, OgeCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/grid/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/layout/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <div
      class="mb-4 flex w-fit gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-800"
    >
      @for (mode of modes; track mode) {
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-sm capitalize transition-colors"
          [class]="
            editMode() === mode
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          "
          (click)="editMode.set(mode)"
        >
          {{ mode }}
        </button>
      }
    </div>

    <app-demo-card
      [chips]="['editing: ' + editMode(), '30 rows']"
      [code]="demos[0].source"
      language="tsx"
    >
      <div
        class="grid grid-cols-[minmax(0,2fr)_minmax(240px,1fr)] items-start gap-4 max-lg:grid-cols-1"
      >
        <app-react-host [render]="editable" />
        <oge-card
          stylingMode="filled"
          size="sm"
          class="save-log max-h-[480px]"
          style="overflow: auto"
          role="complementary"
        >
          <h3 class="!mt-0 mb-2 text-sm font-semibold">onSavingChanges log</h3>
          <ol class="m-0 list-decimal pl-4 font-mono text-xs leading-relaxed">
            @for (entry of saveLog(); track $index) {
              <li class="break-all">{{ entry }}</li>
            } @empty {
              <li class="list-none text-gray-400">No saves yet</li>
            }
          </ol>
        </oge-card>
      </div>
    </app-demo-card>

    <h3>Cascading lookups & command-column customization</h3>
    <p>
      A lookup's <code>dataSource</code> may be a <em>function of the row</em>:
      while editing, it receives the draft values, so picking a country
      immediately re-filters the city editor. The command column is customizable
      through <code>commandButtons</code> — built-in <code>edit</code>/<code
        >delete</code
      >
      plus your own buttons with per-row visibility.
    </p>

    <app-demo-card
      [chips]="['lookup', 'cascading', 'commandButtons']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="assignments" />
      @if (lastCommand()) {
        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Last command: <span class="font-mono">{{ lastCommand() }}</span>
        </div>
      }
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <strong>cell</strong>: click a cell (or press <kbd>Enter</kbd>/<kbd
          >F2</kbd
        >
        on a focused one), edit, commit with <kbd>Enter</kbd>;
        <kbd>Tab</kbd> commits and moves to the next editable cell,
        <kbd>Esc</kbd> reverts.
      </li>
      <li>
        <strong>row / popup / form</strong>: use the command column's pencil
        button — all editable cells, a dialog, or an inline
        <code>&lt;OgeForm&gt;</code> open at once with Save/Cancel.
      </li>
      <li><code>confirmDelete: true</code> asks before a non-batch delete.</li>
      <li>
        <code>editing.formItems</code> picks the fields (and their order, labels
        and <code>colSpan</code>) that the <em>form</em> and
        <em>popup</em> editors show; <code>formColCount</code> fixes the layout
        column count.
      </li>
      <li>
        <strong>batch</strong>: nothing touches the DataSource until
        <em>Save changes</em>; dirty cells get a corner marker, deletions a
        strike-through, and everything is sent as one ordered change set.
      </li>
      <li>
        Validation blocks commits: <code>required</code> or any
        <code>validators</code> rule marks the editor red and keeps it open. A
        rule is <code>(value, row) =&gt; string | null</code> — the message
        itself, since React has no forms engine to carry an error map.
      </li>
      <li>
        The same flow drives remote sources — implement
        <code>insert/update/remove</code> on your DataSource.
      </li>
    </ul>
  `,
})
export class ReactGridEditingDemos {
  protected readonly demos = GRID_EDITING_DEMOS;
  protected readonly modes: OgeEditMode[] = [
    'cell',
    'row',
    'batch',
    'popup',
    'form',
  ];
  protected readonly editMode = signal<OgeEditMode>('batch');
  protected readonly saveLog = signal<readonly string[]>([]);
  protected readonly lastCommand = signal('');

  private readonly commandButtons: OgeCommandButton<Assignment>[] = [
    { name: 'edit' },
    { name: 'delete' },
    {
      name: 'archive',
      text: 'Archive',
      visible: (row) => !row.done,
      onClick: ({ row }) =>
        this.lastCommand.set(`archive #${row.id} (${row.title})`),
    },
  ];

  protected readonly editable = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: employees,
      keyField: 'id',
      columns: EMPLOYEE_COLUMNS,
      editing: {
        mode: this.editMode(),
        allowUpdating: true,
        allowAdding: true,
        allowDeleting: true,
        confirmDelete: true,
      },
      paging: { pageSize: 10 },
      onSavingChanges: (event) => {
        const text = event.changes
          .map(
            (change) =>
              `${change.type} #${String(change.key)} ${JSON.stringify(change.data ?? {})}`,
          )
          .join(' | ');
        this.saveLog.set([text, ...this.saveLog()].slice(0, 20));
      },
    });

  protected readonly assignments = (): ReactNode =>
    createElement(OgeGrid<Assignment>, {
      data: ASSIGNMENTS,
      keyField: 'id',
      columns: ASSIGNMENT_COLUMNS,
      editing: { mode: 'row', allowUpdating: true, allowDeleting: true },
      commandButtons: this.commandButtons,
    });
}
