import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import { OgeGrid, type OgeGridColumnProps } from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_CONTEXT_MENU_DEMOS } from './context-menu-snippets';

const employees = makeEmployees(30, 17);

const ROW_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
];

const HEADER_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'First Name' },
  { field: 'department', caption: 'Department' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];

/**
 * The React half of the context-menu page — the row menu you fill yourself and
 * the header menu whose built-ins you extend, rendered as real React trees
 * inside `/components/data-grid/context-menu` when the reader has chosen
 * React.
 */
@Component({
  selector: 'app-react-grid-context-menu-demos',
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
      [chips]="['onRowContextMenu']"
      [code]="demos[0].source"
      language="tsx"
    >
      <div class="mb-2 text-sm text-gray-500 dark:text-gray-400">
        Right-click any row.
        @if (lastAction()) {
          <span
            class="ml-2 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-800"
            >{{ lastAction() }}</span
          >
        }
      </div>
      <app-react-host [render]="rowMenu" />
    </app-demo-card>

    <h3>Header menu customization</h3>
    <p>
      The header menu works out of the box (right-click any header). With
      <code>onHeaderContextMenu</code> you receive the prebuilt items and mutate
      the array: below, every column gains a custom <em>Say hello</em> item, and
      the Salary column loses its pin entries.
    </p>
    <app-demo-card
      [chips]="['onHeaderContextMenu', 'built-ins + custom']"
      [code]="demos[1].source"
      language="tsx"
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
      <app-react-host [render]="headerMenu" />
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
          <td><code>onRowContextMenu</code></td>
          <td>
            <code>OgeContextMenuEvent&lt;T&gt;</code>: <code>row</code>,
            <code>key</code>, <code>clientX/Y</code>, mutable
            <code>items</code>. Empty items → native browser menu.
          </td>
        </tr>
        <tr>
          <td><code>onHeaderContextMenu</code></td>
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
        <code>OgeGridConfigProvider</code> messages.
      </li>
    </ul>
  `,
})
export class ReactGridContextMenuDemos {
  protected readonly demos = GRID_CONTEXT_MENU_DEMOS;
  protected readonly lastAction = signal('');

  protected readonly rowMenu = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: employees,
      keyField: 'id',
      columns: ROW_COLUMNS,
      paging: { pageSize: 6 },
      onRowContextMenu: (event) => {
        event.items.push(
          {
            text: `Open ${event.row.firstName} ${event.row.lastName}`,
            action: () => this.lastAction.set(`open #${String(event.key)}`),
          },
          {
            text: 'Duplicate',
            action: () =>
              this.lastAction.set(`duplicate #${String(event.key)}`),
          },
          { text: 'Delete (no permission)', disabled: true },
        );
      },
    });

  protected readonly headerMenu = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: employees,
      keyField: 'id',
      columns: HEADER_COLUMNS,
      groupPanel: true,
      paging: { pageSize: 6 },
      onHeaderContextMenu: (event) => {
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
      },
    });
}
