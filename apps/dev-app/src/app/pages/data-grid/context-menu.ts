import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  OgeColumn,
  OgeGrid,
  type OgeContextMenuEvent,
  type OgeHeaderContextMenuEvent,
} from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees, type Employee } from '../../shared/demo-data';

const ROW_MENU_SNIPPET = `<oge-grid [data]="employees" keyField="id"
          (rowContextMenu)="onRowMenu($event)">…</oge-grid>

onRowMenu(event: OgeContextMenuEvent<Employee>) {
  // push items to open the built-in menu at the cursor;
  // leave the array empty to fall back to the native browser menu
  event.items.push(
    { text: \`Open \${event.row.firstName}\`, action: () => open(event.row) },
    { text: 'Duplicate', action: () => duplicate(event.key) },
    { text: 'Delete (no permission)', disabled: true },
  );
}`;

const HEADER_MENU_SNIPPET = `<oge-grid [data]="employees" keyField="id" [groupPanel]="true"
          (headerContextMenu)="onHeaderMenu($event)">…</oge-grid>

onHeaderMenu(event: OgeHeaderContextMenuEvent) {
  // the built-in items (sort / group / pin / hide) arrive prebuilt —
  // extend, filter or replace them before the menu opens
  event.items.push({
    text: \`Reset \${event.caption} filter\`,
    action: () => this.clearFilterFor(event.field),
  });
  if (event.field === 'salary') {
    event.items = event.items.filter((item) => !item.text.startsWith('Pin'));
  }
}`;

@Component({
  selector: 'app-context-menu',
  imports: [OgeGrid, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Context Menus"
      [chips]="['rowContextMenu', 'headerContextMenu', 'OgeMenuItem']"
    >
      <p>
        Two event-driven menus: right-click a <em>row</em> to open your own
        actions, right-click a <em>header</em> to get the built-in sort / group
        / pin / hide items — which you can extend, filter or replace per column.
        Both use the same lightweight <code>OgeMenuItem</code> shape; no menu
        component to import.
      </p>
    </app-doc-header>

    <app-demo-card [chips]="['rowContextMenu']" [code]="rowMenuSnippet">
      <div class="mb-2 text-sm text-gray-500 dark:text-gray-400">
        Right-click any row.
        @if (lastAction()) {
          <span
            class="ml-2 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-800"
            >{{ lastAction() }}</span
          >
        }
      </div>
      <oge-grid
        [data]="employees"
        keyField="id"
        [paging]="{ pageSize: 6 }"
        (rowContextMenu)="onRowMenu($event)"
      >
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="lastName" caption="Last Name" />
        <oge-column field="department" caption="Department" />
      </oge-grid>
    </app-demo-card>

    <h3>Header menu customization</h3>
    <p>
      The header menu works out of the box (right-click any header). With
      <code>headerContextMenu</code> you receive the prebuilt items and mutate
      the array: below, every column gains a custom <em>Say hello</em> item, and
      the Salary column loses its pin entries.
    </p>
    <app-demo-card
      [chips]="['headerContextMenu', 'built-ins + custom']"
      [code]="headerMenuSnippet"
    >
      <div class="mb-2 text-sm text-gray-500 dark:text-gray-400">
        Right-click a column header — try Salary, its pin items are removed.
        @if (lastAction()) {
          <span
            class="ml-2 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-800"
            >{{ lastAction() }}</span
          >
        }
      </div>
      <oge-grid
        [data]="employees"
        keyField="id"
        [groupPanel]="true"
        [paging]="{ pageSize: 6 }"
        (headerContextMenu)="onHeaderMenu($event)"
      >
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="department" caption="Department" />
        <oge-column field="salary" caption="Salary" dataType="number" />
      </oge-grid>
    </app-demo-card>

    <h3>API</h3>
    <table class="api-table">
      <thead>
        <tr>
          <th>Member</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>(rowContextMenu)</code></td>
          <td>
            <code>OgeContextMenuEvent&lt;T&gt;</code>: <code>row</code>,
            <code>key</code>, <code>clientX/Y</code>, mutable
            <code>items</code>. Empty items → native browser menu.
          </td>
        </tr>
        <tr>
          <td><code>(headerContextMenu)</code></td>
          <td>
            <code>OgeHeaderContextMenuEvent</code>: <code>field</code>,
            <code>caption</code>, <code>clientX/Y</code>, mutable
            <code>items</code> prefilled with the built-ins.
          </td>
        </tr>
        <tr>
          <td><code>OgeMenuItem</code></td>
          <td>
            <code>{{ '{' }} text, action?, disabled? {{ '}' }}</code> — the menu
            closes automatically after an action runs.
          </td>
        </tr>
      </tbody>
    </table>

    <h3>Notes</h3>
    <ul>
      <li>
        Menus close on outside click, on <kbd>Escape</kbd>, and after running an
        item.
      </li>
      <li>
        Header built-ins adapt to the column: sort items only for sortable
        columns, group items only with a group panel, pin items reflect the
        current pin state.
      </li>
      <li>
        All built-in texts are localizable through
        <code>provideOgeGridConfig</code> messages.
      </li>
    </ul>
  `,
})
export class ContextMenuPage {
  protected readonly employees = makeEmployees(30, 17);
  protected readonly rowMenuSnippet = ROW_MENU_SNIPPET;
  protected readonly headerMenuSnippet = HEADER_MENU_SNIPPET;
  protected readonly lastAction = signal('');

  protected onRowMenu(event: OgeContextMenuEvent<Employee>): void {
    event.items.push(
      {
        text: `Open ${event.row.firstName} ${event.row.lastName}`,
        action: () => this.lastAction.set(`open #${String(event.key)}`),
      },
      {
        text: 'Duplicate',
        action: () => this.lastAction.set(`duplicate #${String(event.key)}`),
      },
      { text: 'Delete (no permission)', disabled: true },
    );
  }

  protected onHeaderMenu(event: OgeHeaderContextMenuEvent): void {
    if (event.field === 'salary') {
      const pinless = event.items.filter(
        (item) => !item.text.toLowerCase().includes('pin'),
      );
      event.items.length = 0;
      event.items.push(...pinless);
    }
    event.items.push({
      text: `Say hello to ${event.caption}`,
      action: () => this.lastAction.set(`hello ${event.field}`),
    });
  }
}
