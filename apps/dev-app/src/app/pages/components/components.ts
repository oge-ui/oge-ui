import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OgeButton } from '@oge-ui/buttons';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { OgeNumberBox, OgeTextBox } from '@oge-ui/inputs';
import { OgeContextMenu, OgeTooltip, type OgeMenuItem } from '@oge-ui/overlay';
import { OgeTreeList } from '@oge-ui/tree-list';
import { Icon, type IconName } from '../../shared/icon';
import { makeEmployees, type Employee } from '../../shared/demo-data';

type FamilyKey = 'grid' | 'tree' | 'buttons' | 'inputs' | 'pivot' | 'overlay';

interface Family {
  key: FamilyKey;
  name: string;
  icon: IconName;
  path: string;
  description: string;
}

interface OrgNode {
  id: number;
  parentId: number | null;
  name: string;
  title: string;
}

/**
 * Component gallery: one uniform card per family — a fixed-height live
 * preview on top, a clamped description and a single overview CTA below, so
 * every card renders at exactly the same size.
 */
@Component({
  selector: 'app-components-index',
  imports: [
    RouterLink,
    Icon,
    OgeGrid,
    OgeColumn,
    OgeTreeList,
    OgeButton,
    OgeTextBox,
    OgeNumberBox,
    OgeTooltip,
    OgeContextMenu,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="border-b border-gray-200 pb-8 dark:border-gray-800">
      <h1
        class="!m-0 text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100"
      >
        Components
      </h1>
      <p class="mt-3 max-w-2xl text-[15px] text-gray-600 dark:text-gray-400">
        Every family ships as its own package with a live-documented API. The
        previews below are the real components — sort the grid, expand the tree,
        hover the tooltips.
      </p>
      <div class="mt-4 flex flex-wrap gap-1.5">
        @for (chip of heroChips; track chip) {
          <span
            class="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-[11px] text-indigo-700 dark:border-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-300"
            >{{ chip }}</span
          >
        }
      </div>
    </div>

    <div
      class="mt-8 grid grid-cols-3 gap-6 max-xl:grid-cols-2 max-lg:grid-cols-1"
    >
      @for (family of families; track family.key) {
        <section
          class="flex flex-col overflow-hidden rounded-2xl border border-gray-200 transition-shadow hover:shadow-md dark:border-gray-800"
        >
          <div
            class="h-56 shrink-0 overflow-hidden border-b border-gray-200 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-900/40"
          >
            <div class="flex h-full w-full items-center justify-center p-4">
              @switch (family.key) {
                @case ('grid') {
                  <div class="w-full self-start">
                    <oge-grid [data]="employees" keyField="id">
                      <oge-column field="firstName" caption="Name" />
                      <oge-column field="department" caption="Department" />
                      <oge-column
                        field="salary"
                        caption="Salary"
                        dataType="number"
                        [width]="90"
                      />
                    </oge-grid>
                  </div>
                }
                @case ('tree') {
                  <div class="w-full self-start">
                    <oge-tree-list
                      [data]="org"
                      keyExpr="id"
                      parentIdExpr="parentId"
                      [autoExpandAll]="true"
                    >
                      <oge-column field="name" caption="Name" />
                      <oge-column field="title" caption="Title" [width]="130" />
                    </oge-tree-list>
                  </div>
                }
                @case ('buttons') {
                  <div class="flex flex-wrap items-center justify-center gap-3">
                    <oge-button text="Accent" severity="accent" />
                    <oge-button
                      text="Danger"
                      severity="danger"
                      stylingMode="outlined"
                    />
                    <oge-button
                      text="Inbox"
                      badge="12"
                      stylingMode="outlined"
                    />
                    <oge-button text="Async save" [action]="fakeSave" />
                  </div>
                }
                @case ('inputs') {
                  <div
                    class="flex flex-col items-center gap-3"
                    style="--oge-input-width: 220px"
                  >
                    <oge-text-box
                      label="Name"
                      [(value)]="previewName"
                      [showClearButton]="true"
                      subscriptSizing="none"
                    />
                    <oge-number-box
                      label="Amount"
                      [(value)]="previewAmount"
                      [min]="0"
                      [showSpinButtons]="true"
                      subscriptSizing="none"
                    />
                  </div>
                }
                @case ('pivot') {
                  <!-- illustrative sketch; the live pivot renders on its own pages -->
                  <table
                    aria-hidden="true"
                    class="w-full max-w-[280px] border-collapse text-center font-mono text-[11px] text-gray-600 dark:text-gray-400"
                  >
                    <thead>
                      <tr>
                        <th [class]="cellClass + ' text-left'">
                          Region · Year
                        </th>
                        <th [class]="cellClass">2024</th>
                        <th [class]="cellClass">2025</th>
                        <th [class]="cellClass + ' ' + totalClass">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td [class]="cellClass + ' text-left'">Europe</td>
                        <td [class]="cellClass">1.2M</td>
                        <td [class]="cellClass">1.6M</td>
                        <td [class]="cellClass + ' ' + totalClass">2.8M</td>
                      </tr>
                      <tr>
                        <td [class]="cellClass + ' text-left'">Asia</td>
                        <td [class]="cellClass">0.9M</td>
                        <td [class]="cellClass">1.4M</td>
                        <td [class]="cellClass + ' ' + totalClass">2.3M</td>
                      </tr>
                      <tr>
                        <td [class]="cellClass + ' text-left ' + totalClass">
                          Total
                        </td>
                        <td [class]="cellClass + ' ' + totalClass">2.1M</td>
                        <td [class]="cellClass + ' ' + totalClass">3.0M</td>
                        <td [class]="cellClass + ' ' + totalClass">5.1M</td>
                      </tr>
                    </tbody>
                  </table>
                }
                @case ('overlay') {
                  <div class="flex flex-col items-center gap-3">
                    <oge-button
                      text="Hover me"
                      stylingMode="outlined"
                      ogeTooltip="An accessible, viewport-aware tooltip"
                    />
                    <div
                      class="flex h-14 w-44 select-none items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 outline-none dark:border-gray-600 dark:text-gray-400"
                      tabindex="0"
                      [ogeContextMenu]="previewMenu"
                      contextMenuAriaLabel="Preview actions"
                    >
                      Right-click me
                    </div>
                  </div>
                }
              }
            </div>
          </div>
          <div class="flex flex-1 flex-col p-5">
            <div class="flex items-center gap-2.5">
              <span class="text-indigo-500">
                <app-icon [name]="family.icon" [size]="18" />
              </span>
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                family.name
              }}</span>
              <span
                class="ml-auto rounded-full border border-gray-200 px-2 py-0.5 font-mono text-[11px] text-gray-400 dark:border-gray-700 dark:text-gray-500"
                >v0.4.0</span
              >
            </div>
            <p
              class="!mb-0 mt-2 line-clamp-3 min-h-[60px] text-sm text-gray-500 dark:text-gray-400"
            >
              {{ family.description }}
            </p>
            <div class="mt-auto pt-4">
              <a
                [routerLink]="family.path"
                class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[13px] font-medium text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
              >
                Explore {{ family.name }}
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class ComponentsIndexPage {
  protected readonly heroChips = [
    'signal-based APIs',
    'zoneless-ready',
    'design-token theming',
    'axe-tested accessibility',
    'zero runtime dependencies',
  ];

  protected readonly cellClass =
    'border border-gray-200 px-2 py-1 dark:border-gray-700';
  protected readonly totalClass =
    'bg-indigo-50/60 font-semibold dark:bg-indigo-950/40';

  protected readonly families: Family[] = [
    {
      key: 'grid',
      name: 'Data Grid',
      icon: 'table',
      path: '/components/data-grid',
      description:
        'Virtualized rows into the millions, multi-sort, filtering, grouping with summaries, five editing modes, master-detail, remote data and export.',
    },
    {
      key: 'tree',
      name: 'Tree List',
      icon: 'layout',
      path: '/components/tree-list',
      description:
        'The grid feature set on hierarchical data: lazy loading, ancestor-preserving filtering, tri-state selection and drag & drop reordering.',
    },
    {
      key: 'buttons',
      name: 'Buttons',
      icon: 'pointer',
      path: '/components/buttons',
      description:
        'Async actions with automatic loading, click guards, hold-to-confirm, badges, radio-pattern groups and drop-down/split buttons.',
    },
    {
      key: 'inputs',
      name: 'Inputs',
      icon: 'text-cursor',
      path: '/components/inputs',
      description:
        'TextBox, TextArea and NumberBox on one field chrome: floating labels, counters, password reveal and locale-aware number editing.',
    },
    {
      key: 'pivot',
      name: 'Pivot Grid',
      icon: 'gauge',
      path: '/components/pivot-grid',
      description:
        'Cross-tab analytics on raw records: rows × columns × measures with grand totals, field chooser, sorting and export.',
    },
    {
      key: 'overlay',
      name: 'Overlay',
      icon: 'layers',
      path: '/components/overlay',
      description:
        'The positioning engine behind every popup: anchored panels, WAI-ARIA menus, plus ready-made tooltip and context-menu directives.',
    },
  ];

  protected readonly employees: Employee[] = makeEmployees(4);

  protected readonly org: OrgNode[] = [
    { id: 1, parentId: null, name: 'Deniz Arslan', title: 'CTO' },
    { id: 2, parentId: 1, name: 'Elif Kaya', title: 'Eng. Manager' },
    { id: 3, parentId: 2, name: 'Mert Demir', title: 'Frontend Lead' },
    { id: 4, parentId: 1, name: 'Can Yılmaz', title: 'Design Lead' },
  ];

  protected readonly previewName = signal('Ada');
  protected readonly previewAmount = signal<number | null>(42);

  protected readonly previewMenu: OgeMenuItem[] = [
    { text: 'Duplicate' },
    { text: 'Pin to top', checked: true },
    { separator: true, text: '' },
    { text: 'Delete', severity: 'danger' },
  ];

  protected readonly fakeSave = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, 1200));
}
