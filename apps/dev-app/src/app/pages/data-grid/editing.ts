import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import {
  OgeColumn,
  OgeEditTemplate,
  OgeGrid,
  type OgeCommandButton,
  type OgeEditMode,
  type OgeSavingChangesEvent,
} from '@oge-ui/grid';
import { OgeCard } from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { LOOKUP_SNIPPET, SNIPPET } from './editing-snippets';

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

@Component({
  selector: 'app-editing',
  imports: [
    OgeGrid,
    OgeColumn,
    OgeEditTemplate,
    OgeCard,
    DemoCard,
    DocHeader,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Editing"
      [chips]="['editing', 'required', 'ogeEditTemplate', 'savingChanges']"
    >
      <p>
        Five edit modes over the same grid. <em>Batch</em> collects changes
        (dirty markers, strike-through deletes) until <em>Save changes</em>;
        <em>form</em> replaces the row with an inline labeled form; the other
        modes write back immediately. First Name is required; Department uses a
        custom <code>*ogeEditTemplate</code>. Deleting asks for confirmation
        (<code>confirmDelete</code>).
      </p>
    </app-doc-header>

    <div
      class="mb-4 flex gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-800 w-fit"
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
      [code]="snippet"
      language="ts"
    >
      <div
        class="grid grid-cols-[minmax(0,2fr)_minmax(240px,1fr)] items-start gap-4 max-lg:grid-cols-1"
      >
        <oge-grid
          [data]="employees"
          keyField="id"
          [editing]="{
            mode: editMode(),
            allowUpdating: true,
            allowAdding: true,
            allowDeleting: true,
            confirmDelete: true,
          }"
          [paging]="{ pageSize: 10 }"
          (savingChanges)="onSaving($event)"
        >
          <oge-column
            field="id"
            caption="Id"
            [width]="70"
            dataType="number"
            [editable]="false"
          />
          <oge-column
            field="firstName"
            caption="First Name"
            [required]="true"
          />
          <oge-column field="lastName" caption="Last Name" [required]="true" />
          <oge-column field="department" caption="Department">
            <select
              *ogeEditTemplate="let control"
              [formControl]="$any(control)"
              class="oge-editor w-full rounded border border-indigo-400 px-2 py-1 text-sm dark:bg-gray-900"
            >
              <option>Engineering</option>
              <option>Sales</option>
              <option>HR</option>
              <option>Finance</option>
              <option>Support</option>
            </select>
          </oge-column>
          <oge-column field="salary" caption="Salary" dataType="number" />
        </oge-grid>
        <oge-card
          stylingMode="filled"
          size="sm"
          class="save-log max-h-[480px]"
          style="overflow: auto"
          role="complementary"
        >
          <h3 class="!mt-0 mb-2 text-sm font-semibold">savingChanges log</h3>
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
      [code]="lookupSnippet"
      language="ts"
    >
      <oge-grid
        [data]="assignments"
        keyField="id"
        [editing]="{ mode: 'row', allowUpdating: true, allowDeleting: true }"
        [commandButtons]="commandButtons"
      >
        <oge-column field="title" caption="Task" />
        <oge-column
          field="countryId"
          caption="Country"
          [lookup]="{
            dataSource: countries,
            valueExpr: 'id',
            displayExpr: 'name',
          }"
        />
        <oge-column
          field="cityId"
          caption="City"
          [lookup]="{
            dataSource: citiesOf,
            valueExpr: 'id',
            displayExpr: 'name',
          }"
        />
        <oge-column
          field="done"
          caption="Done"
          dataType="boolean"
          [width]="90"
        />
      </oge-grid>
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
        button — all editable cells, a dialog, or an inline labeled form open at
        once with Save/Cancel.
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
        Validation blocks commits: <code>[required]</code> or any Angular
        <code>[validators]</code> mark the editor red and keep it open.
      </li>
      <li>
        The same flow drives remote sources — implement
        <code>insert/update/remove</code> on your DataSource.
      </li>
    </ul>
  `,
})
export class EditingPage {
  protected readonly snippet = SNIPPET;
  protected readonly modes: OgeEditMode[] = [
    'cell',
    'row',
    'batch',
    'popup',
    'form',
  ];
  protected readonly editMode = signal<OgeEditMode>('batch');
  protected readonly employees = makeEmployees(30, 11);
  protected readonly saveLog = signal<readonly string[]>([]);

  protected onSaving(event: OgeSavingChangesEvent<Employee>): void {
    const text = event.changes
      .map(
        (change) =>
          `${change.type} #${String(change.key)} ${JSON.stringify(change.data ?? {})}`,
      )
      .join(' | ');
    this.saveLog.set([text, ...this.saveLog()].slice(0, 20));
  }

  // --- cascading lookups & command buttons ---------------------------------

  protected readonly lookupSnippet = LOOKUP_SNIPPET;
  protected readonly lastCommand = signal('');

  protected readonly countries = [
    { id: 1, name: 'Türkiye' },
    { id: 2, name: 'Germany' },
  ];

  private readonly cities: City[] = [
    { id: 1, countryId: 1, name: 'İstanbul' },
    { id: 2, countryId: 1, name: 'Ankara' },
    { id: 3, countryId: 2, name: 'Berlin' },
    { id: 4, countryId: 2, name: 'Munich' },
  ];

  /** Cascading: the city list is a function of the row's (draft) country. */
  protected readonly citiesOf = (row: Assignment): readonly City[] =>
    this.cities.filter((city) => city.countryId === row.countryId);

  protected readonly assignments: Assignment[] = [
    { id: 1, title: 'Site survey', countryId: 1, cityId: 1, done: false },
    { id: 2, title: 'Install rollout', countryId: 1, cityId: 2, done: true },
    { id: 3, title: 'Kickoff workshop', countryId: 2, cityId: 3, done: false },
    { id: 4, title: 'Audit visit', countryId: 2, cityId: 4, done: false },
  ];

  protected readonly commandButtons: OgeCommandButton<Assignment>[] = [
    { name: 'edit' },
    { name: 'delete' },
    {
      text: 'Archive',
      visible: (row) => !row.done,
      onClick: (row) =>
        this.lastCommand.set(`archive #${row.id} (${row.title})`),
    },
  ];
}
