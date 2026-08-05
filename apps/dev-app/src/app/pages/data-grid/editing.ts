import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import {
  OgeColumn,
  OgeEditTemplate,
  OgeGrid,
  type OgeEditMode,
  type OgeSavingChangesEvent,
} from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees, type Employee } from '../../shared/demo-data';

const SNIPPET = `<oge-grid [data]="employees" keyField="id"
          [editing]="{ mode: 'batch', allowUpdating: true, allowAdding: true, allowDeleting: true }"
          (savingChanges)="onSaving($event)">
  <oge-column field="id" [editable]="false" />
  <oge-column field="firstName" [required]="true" />
  <oge-column field="department">
    <!-- custom editor gets the reactive FormControl -->
    <select *ogeEditTemplate="let control" [formControl]="control">
      <option>Engineering</option><option>Sales</option>
    </select>
  </oge-column>
</oge-grid>

onSaving(event: OgeSavingChangesEvent<Employee>) {
  // event.changes = [{ type: 'update'|'insert'|'remove', key, data }]
  // set event.cancel = true to abort; otherwise the DataSource
  // (insert/update/remove) is called and the grid reloads.
}`;

@Component({
  selector: 'app-editing',
  imports: [OgeGrid, OgeColumn, OgeEditTemplate, DemoCard, DocHeader, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header title="Editing" [chips]="['editing', 'required', 'ogeEditTemplate', 'savingChanges']">
      <p>
        Four DevExtreme-style edit modes over the same grid. <em>Batch</em> collects changes
        (dirty markers, strike-through deletes) until <em>Save changes</em>; the other modes write
        back immediately. First Name is required; Department uses a custom
        <code>*ogeEditTemplate</code>.
      </p>
    </app-doc-header>

    <div class="mb-4 flex gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-800 w-fit">
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

    <app-demo-card [chips]="['editing: ' + editMode(), '30 rows']" [code]="snippet" language="ts">
      <div class="grid grid-cols-[minmax(0,2fr)_minmax(240px,1fr)] items-start gap-4 max-lg:grid-cols-1">
        <oge-grid
          [data]="employees"
          keyField="id"
          [editing]="{ mode: editMode(), allowUpdating: true, allowAdding: true, allowDeleting: true }"
          [paging]="{ pageSize: 10 }"
          (savingChanges)="onSaving($event)"
        >
          <oge-column field="id" caption="Id" [width]="70" dataType="number" [editable]="false" />
          <oge-column field="firstName" caption="First Name" [required]="true" />
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
        <aside class="save-log max-h-[480px] overflow-auto rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 dark:border-gray-800 dark:bg-gray-900">
          <h3 class="!mt-0 mb-2 text-sm font-semibold">savingChanges log</h3>
          <ol class="m-0 list-decimal pl-4 font-mono text-xs leading-relaxed">
            @for (entry of saveLog(); track $index) {
              <li class="break-all">{{ entry }}</li>
            } @empty {
              <li class="list-none text-gray-400">No saves yet</li>
            }
          </ol>
        </aside>
      </div>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li><strong>cell</strong>: click a cell (or press <kbd>Enter</kbd>/<kbd>F2</kbd> on a focused one), edit, commit with <kbd>Enter</kbd>; <kbd>Tab</kbd> commits and moves to the next editable cell, <kbd>Esc</kbd> reverts.</li>
      <li><strong>row / popup</strong>: use the command column's pencil button — all editable cells (or a dialog form) open at once with Save/Cancel.</li>
      <li><strong>batch</strong>: nothing touches the DataSource until <em>Save changes</em>; dirty cells get a corner marker, deletions a strike-through, and everything is sent as one ordered change set.</li>
      <li>Validation blocks commits: <code>[required]</code> or any Angular <code>[validators]</code> mark the editor red and keep it open.</li>
      <li>The same flow drives remote sources — implement <code>insert/update/remove</code> on your DataSource.</li>
    </ul>
  `,
})
export class EditingPage {
  protected readonly snippet = SNIPPET;
  protected readonly modes: OgeEditMode[] = ['cell', 'row', 'batch', 'popup'];
  protected readonly editMode = signal<OgeEditMode>('batch');
  protected readonly employees = makeEmployees(30, 11);
  protected readonly saveLog = signal<readonly string[]>([]);

  protected onSaving(event: OgeSavingChangesEvent<Employee>): void {
    const text = event.changes
      .map((change) => `${change.type} #${String(change.key)} ${JSON.stringify(change.data ?? {})}`)
      .join(' | ');
    this.saveLog.set([text, ...this.saveLog()].slice(0, 20));
  }
}
