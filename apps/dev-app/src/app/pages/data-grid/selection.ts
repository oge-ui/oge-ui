import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { RowKey } from '@oge-ui/core';
import { OgeColumn, OgeGrid, type OgeContextMenuEvent } from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees, type Employee } from '../../shared/demo-data';

const SNIPPET = `<oge-grid [data]="employees" keyField="id"
          selectionMode="checkbox" [(selectedKeys)]="selected"
          (rowContextMenu)="onContextMenu($event)">
  …
</oge-grid>

onContextMenu(event: OgeContextMenuEvent<Employee>) {
  // push items to open the built-in menu; leave empty for the browser menu
  event.items.push({ text: 'Copy name', action: () => copy(event.row) });
}`;

@Component({
  selector: 'app-selection',
  imports: [OgeGrid, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Selection & Context Menu"
      [chips]="['selectionMode', 'selectedKeys', 'rowContextMenu', 'keyboard']"
    >
      <p>
        Checkbox selection with a filtered-aware select-all; <kbd>Ctrl</kbd>/<kbd>Shift</kbd>+click
        also work. Navigate cells with the arrow keys and press <kbd>Space</kbd> to select.
        Right-click a row for the context menu.
      </p>
    </app-doc-header>

    <app-demo-card [chips]="['1.000 rows', 'virtual', 'filterRow']" [code]="snippet" language="ts">
      <div class="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Selected: <span class="font-semibold text-gray-900 dark:text-gray-100">{{ selected().length }}</span> rows
        @if (lastAction()) {
          <span class="ml-3 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-800">{{ lastAction() }}</span>
        }
      </div>
      <oge-grid
        [data]="employees"
        keyField="id"
        selectionMode="checkbox"
        [selectedKeys]="selected()"
        (selectedKeysChange)="selected.set($event)"
        [filterRow]="true"
        [filterDebounce]="200"
        (rowContextMenu)="onContextMenu($event)"
        style="height: 480px"
        [virtualScroll]="true"
      >
        <oge-column field="id" caption="Id" [width]="80" dataType="number" />
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="lastName" caption="Last Name" />
        <oge-column field="department" caption="Department" />
        <oge-column field="city" caption="City" />
      </oge-grid>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li><code>[(selectedKeys)]</code> is a two-way model — push keys in from outside and the checkboxes follow.</li>
      <li>Select-all operates on the <em>filtered</em> set: apply a filter first and only matching rows are selected.</li>
      <li><kbd>Shift</kbd>-ranges span group rows correctly (only data rows are selected).</li>
      <li>Full keyboard support: arrows, <kbd>Home</kbd>/<kbd>End</kbd>, <kbd>PageUp</kbd>/<kbd>PageDown</kbd>, <kbd>Space</kbd> to select — WAI-ARIA grid pattern, verified with axe.</li>
    </ul>
  `,
})
export class SelectionPage {
  protected readonly snippet = SNIPPET;
  protected readonly employees = makeEmployees(1000);
  protected readonly selected = signal<RowKey[]>([]);
  protected readonly lastAction = signal('');

  protected onContextMenu(event: OgeContextMenuEvent<Employee>): void {
    event.items.push(
      {
        text: `Copy "${event.row.firstName} ${event.row.lastName}"`,
        action: () => {
          navigator.clipboard?.writeText(`${event.row.firstName} ${event.row.lastName}`);
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
      { text: 'Delete (disabled)', disabled: true }
    );
  }
}
