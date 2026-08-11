import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OgeButton } from '@oge-ui/buttons';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { OgeNumberBox, OgeTextBox } from '@oge-ui/inputs';
import {
  OgeAccordion,
  OgeAccordionItem,
  OgeCard,
  OgeCardActions,
  OgeCardMedia,
  OgeSplitter,
  OgeSplitterPane,
  OgeToolbar,
  OgeToolbarItem,
} from '@oge-ui/layout';
import {
  OgeBreadcrumb,
  OgeDrawer,
  OgeMenubar,
  OgeStep,
  OgeStepper,
  OgeTreeView,
  type OgeBreadcrumbItemData,
  type OgeMenubarItemData,
} from '@oge-ui/navigation';
import { OgeContextMenu, OgeTooltip, type OgeMenuItem } from '@oge-ui/overlay';
import { OgeTab, OgeTabPanel } from '@oge-ui/tabs';
import { OgeForm, OgeFormItem } from '@oge-ui/forms';
import { OgeTreeList } from '@oge-ui/tree-list';
import { OgeLoadIndicator, OgeProgressBar, OgeSkeleton } from '@oge-ui/layout';
import { Icon, type IconName } from '../../shared/icon';
import { SITE_VERSION } from '../../shared/site-version';
import { makeEmployees, type Employee } from '../../shared/demo-data';

type FamilyKey =
  | 'grid'
  | 'tree'
  | 'buttons'
  | 'inputs'
  | 'tabs'
  | 'forms'
  | 'accordion'
  | 'card'
  | 'progress'
  | 'splitter'
  | 'toolbar'
  | 'tree-view'
  | 'drawer'
  | 'menubar'
  | 'breadcrumb'
  | 'stepper'
  | 'pivot'
  | 'bpmn'
  | 'scheduler'
  | 'gantt'
  | 'charts'
  | 'overlay';

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
    OgeTabPanel,
    OgeTab,
    OgeForm,
    OgeFormItem,
    OgeAccordion,
    OgeAccordionItem,
    OgeCard,
    OgeCardActions,
    OgeCardMedia,
    OgeProgressBar,
    OgeLoadIndicator,
    OgeSkeleton,
    OgeSplitter,
    OgeSplitterPane,
    OgeToolbar,
    OgeToolbarItem,
    OgeTreeView,
    OgeDrawer,
    OgeMenubar,
    OgeBreadcrumb,
    OgeStepper,
    OgeStep,
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

    <!-- the card titles are spans, and previews (the accordion) bring their own
         h3 — this gives the page a real h1 → h2 → h3 outline -->
    <h2 class="sr-only">Component families</h2>
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
                @case ('forms') {
                  <div
                    class="w-full self-start"
                    style="--oge-input-width: 100%"
                  >
                    <oge-form [(formData)]="previewProfile" [colCount]="2">
                      <oge-form-item
                        field="firstName"
                        label="First name"
                        [isRequired]="true"
                      />
                      <oge-form-item field="lastName" label="Last name" />
                      <oge-form-item
                        field="email"
                        label="E-mail"
                        [colSpan]="2"
                      />
                    </oge-form>
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
                @case ('bpmn') {
                  <!-- illustrative sketch; the live editor renders on its own pages -->
                  <svg
                    aria-hidden="true"
                    data-preview="bpmn"
                    viewBox="0 0 280 120"
                    class="w-full max-w-[280px] text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                  >
                    <circle cx="26" cy="60" r="12" />
                    <path d="M38 60h26m0 0-6-4m6 4-6 4" />
                    <rect x="66" y="38" width="66" height="44" rx="8" />
                    <path d="M132 60h26m0 0-6-4m6 4-6 4" />
                    <path d="M178 40 198 60 178 80 158 60Z" />
                    <path d="M171 53l14 14M185 53l-14 14" />
                    <path d="M198 60h32m0 0-6-4m6 4-6 4" />
                    <circle cx="246" cy="60" r="12" stroke-width="3.2" />
                    <path
                      d="M178 40V22h52m0 0-6-4m6 4-6 4"
                      stroke-dasharray="4 3"
                    />
                    <circle cx="246" cy="22" r="9" stroke-width="3.2" />
                  </svg>
                }
                @case ('charts') {
                  <!-- illustrative sketch; the live charts render on their own pages -->
                  <svg
                    aria-hidden="true"
                    data-preview="charts"
                    viewBox="0 0 280 120"
                    class="w-full max-w-[280px] text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                  >
                    <rect x="10" y="10" width="260" height="100" rx="8" />
                    <path d="M10 88h260M10 62h260M10 36h260" opacity="0.35" />
                    <path
                      d="M24 84 L70 58 L116 66 L162 38 L208 46 L254 24"
                      stroke-width="2.4"
                    />
                    <rect
                      x="40"
                      y="70"
                      width="14"
                      height="26"
                      rx="2"
                      fill="currentColor"
                      opacity="0.25"
                      stroke="none"
                    />
                    <rect
                      x="96"
                      y="56"
                      width="14"
                      height="40"
                      rx="2"
                      fill="currentColor"
                      opacity="0.25"
                      stroke="none"
                    />
                    <rect
                      x="152"
                      y="46"
                      width="14"
                      height="50"
                      rx="2"
                      fill="currentColor"
                      opacity="0.25"
                      stroke="none"
                    />
                    <circle cx="238" cy="34" r="12" opacity="0.6" />
                  </svg>
                }
                @case ('gantt') {
                  <!-- illustrative sketch; the live gantt renders on its own pages -->
                  <svg
                    aria-hidden="true"
                    data-preview="gantt"
                    viewBox="0 0 280 120"
                    class="w-full max-w-[280px] text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                  >
                    <rect x="10" y="10" width="260" height="100" rx="8" />
                    <path
                      d="M80 10v100M10 36h260M10 62h260M10 88h260"
                      opacity="0.5"
                    />
                    <rect
                      x="92"
                      y="18"
                      width="120"
                      height="12"
                      rx="3"
                      fill="currentColor"
                      opacity="0.35"
                      stroke="none"
                    />
                    <rect
                      x="100"
                      y="44"
                      width="70"
                      height="12"
                      rx="3"
                      fill="currentColor"
                      opacity="0.25"
                      stroke="none"
                    />
                    <rect
                      x="150"
                      y="70"
                      width="90"
                      height="12"
                      rx="3"
                      fill="currentColor"
                      opacity="0.25"
                      stroke="none"
                    />
                    <path d="M170 56h-10v14" />
                    <rect
                      x="236"
                      y="92"
                      width="10"
                      height="10"
                      transform="rotate(45 241 97)"
                      fill="currentColor"
                      opacity="0.4"
                      stroke="none"
                    />
                  </svg>
                }
                @case ('scheduler') {
                  <!-- illustrative sketch; the live scheduler renders on its own pages -->
                  <svg
                    aria-hidden="true"
                    data-preview="scheduler"
                    viewBox="0 0 280 120"
                    class="w-full max-w-[280px] text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                  >
                    <rect x="10" y="10" width="260" height="100" rx="8" />
                    <path
                      d="M10 34h260M47 34v76M84 34v76M121 34v76M158 34v76M195 34v76M232 34v76"
                    />
                    <rect
                      x="50"
                      y="42"
                      width="31"
                      height="30"
                      rx="4"
                      fill="currentColor"
                      opacity="0.25"
                      stroke="none"
                    />
                    <rect
                      x="124"
                      y="50"
                      width="31"
                      height="44"
                      rx="4"
                      fill="currentColor"
                      opacity="0.4"
                      stroke="none"
                    />
                    <rect
                      x="198"
                      y="40"
                      width="31"
                      height="22"
                      rx="4"
                      fill="currentColor"
                      opacity="0.25"
                      stroke="none"
                    />
                    <path d="M10 88h260" stroke-dasharray="3 3" opacity="0.7" />
                  </svg>
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
                @case ('tabs') {
                  <div class="w-full self-start">
                    <oge-tab-panel stylingMode="secondary" size="sm">
                      <oge-tab text="Overview">
                        <p class="!my-0 p-2 text-sm text-gray-500">
                          Panels render on first visit and stay alive.
                        </p>
                      </oge-tab>
                      <oge-tab text="Activity">
                        <p class="!my-0 p-2 text-sm text-gray-500">
                          Arrow keys move, Home/End jump.
                        </p>
                      </oge-tab>
                      <oge-tab text="Settings" [disabled]="true">…</oge-tab>
                    </oge-tab-panel>
                  </div>
                }
                @case ('accordion') {
                  <div class="w-full self-start">
                    <oge-accordion size="sm">
                      <oge-accordion-item title="Account" [badge]="2">
                        <p class="!my-0 text-sm text-gray-500">
                          Name, e-mail and password.
                        </p>
                      </oge-accordion-item>
                      <oge-accordion-item title="Notifications">
                        <p class="!my-0 text-sm text-gray-500">
                          Per-channel delivery rules.
                        </p>
                      </oge-accordion-item>
                    </oge-accordion>
                  </div>
                }
                @case ('progress') {
                  <div class="flex w-full flex-col gap-3 self-start">
                    <oge-progress-bar [value]="62" [showLabel]="true" />
                    <oge-progress-bar ariaLabel="Preparing" />
                    <div class="flex items-center gap-3">
                      <oge-load-indicator size="sm" />
                      <oge-skeleton class="flex-1" />
                    </div>
                  </div>
                }
                @case ('card') {
                  <div class="w-full max-w-60 self-start">
                    <oge-card
                      header="Mountains"
                      subheader="Alps, 2026"
                      size="sm"
                    >
                      <img
                        ogeCardMedia
                        src="https://picsum.photos/seed/oge-alps/480/200"
                        alt=""
                        class="h-14"
                      />
                      <p class="!my-0 text-sm text-gray-500">
                        Four days above the tree line.
                      </p>
                      <div ogeCardActions align="end">
                        <button
                          type="button"
                          class="rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700"
                        >
                          Share
                        </button>
                      </div>
                    </oge-card>
                  </div>
                }
                @case ('splitter') {
                  <div class="h-28 w-full self-start">
                    <oge-splitter class="h-full rounded border">
                      <oge-splitter-pane size="38%" [collapsible]="true">
                        <p class="!my-0 p-2 text-sm text-gray-500">Navigator</p>
                      </oge-splitter-pane>
                      <oge-splitter-pane>
                        <oge-splitter orientation="vertical">
                          <oge-splitter-pane [size]="60">
                            <p class="!my-0 p-2 text-sm text-gray-500">
                              Editor
                            </p>
                          </oge-splitter-pane>
                          <oge-splitter-pane [size]="40">
                            <p class="!my-0 p-2 text-sm text-gray-500">
                              Output
                            </p>
                          </oge-splitter-pane>
                        </oge-splitter>
                      </oge-splitter-pane>
                    </oge-splitter>
                  </div>
                }
                @case ('toolbar') {
                  <div class="w-full self-start">
                    <oge-toolbar ariaLabel="Gallery preview">
                      <oge-toolbar-item text="New" severity="accent" />
                      <oge-toolbar-item text="Open" />
                      <oge-toolbar-item type="separator" />
                      <oge-toolbar-item text="Bold" [active]="true" />
                      <oge-toolbar-item text="Print" locateInMenu="always" />
                      <oge-toolbar-item text="Share" location="after" />
                    </oge-toolbar>
                  </div>
                }
                @case ('stepper') {
                  <div class="w-full self-start">
                    <oge-stepper [activeIndex]="1" ariaLabel="Checkout">
                      <oge-step label="Account" [completed]="true" />
                      <oge-step label="Payment" />
                      <oge-step label="Review" />
                    </oge-stepper>
                  </div>
                }
                @case ('drawer') {
                  <div
                    class="h-28 w-full self-start overflow-hidden rounded border"
                  >
                    <oge-drawer
                      class="h-full"
                      [opened]="true"
                      mode="side"
                      [size]="88"
                      ariaLabel="Sections"
                    >
                      <div ogeDrawerPanel class="p-2 text-xs">Menu</div>
                      <div class="p-2 text-xs opacity-70">Content</div>
                    </oge-drawer>
                  </div>
                }
                @case ('menubar') {
                  <div class="w-full self-start">
                    <oge-menubar [items]="menubarItems" />
                  </div>
                }
                @case ('breadcrumb') {
                  <div class="w-full self-start">
                    <oge-breadcrumb [items]="breadcrumbItems" />
                  </div>
                }
                @case ('tree-view') {
                  <div class="w-full self-start">
                    <oge-tree-view
                      [items]="org"
                      keyExpr="id"
                      parentIdExpr="parentId"
                      displayExpr="name"
                      selectionMode="multiple"
                      showCheckBoxes="normal"
                      [expandedKeys]="[1, 2]"
                    />
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
                >v{{ version }}</span
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
  protected readonly version = SITE_VERSION;
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
        'TextBox, TextArea, NumberBox and SelectBox on one field chrome: floating labels, counters, password reveal, locale-aware numbers and a searchable WAI-ARIA combobox.',
    },
    {
      key: 'tabs',
      name: 'Tabs',
      icon: 'tabs',
      path: '/components/tabs',
      description:
        'Declarative or data-driven tabs with deferred rendering, keep-alive panels, closable tabs with async guards, overflow navigation and drag reorder.',
    },
    {
      key: 'forms',
      name: 'Forms',
      icon: 'text-cursor',
      path: '/components/forms',
      description:
        'Form layout over the OGE editors: responsive container-query columns, nested fieldset groups, declarative validation rules and an accessible validation summary.',
    },
    {
      key: 'accordion',
      name: 'Accordion',
      icon: 'accordion',
      path: '/components/accordion',
      description:
        'Single or multiple expansion following the WAI-ARIA pattern: lazy content, async expand guards, header actions and invalid-section jumping.',
    },
    {
      key: 'card',
      name: 'Card',
      icon: 'card',
      path: '/components/card',
      description:
        'Content surface with header, full-bleed media, action row and footer as attribute slots — one component, outlined/raised/filled/flat chrome, horizontal orientation, and no nested-interactive trap.',
    },
    {
      key: 'progress',
      name: 'Progress & Loading',
      icon: 'loader',
      path: '/components/progress',
      description:
        'The linear bar, the ring and the shimmer placeholder as one canonical trio — role="progressbar" done right: indeterminate omits aria-valuenow, reduced motion slows the ring instead of freezing it.',
    },
    {
      key: 'splitter',
      name: 'Splitter',
      icon: 'splitter',
      path: '/components/splitter',
      description:
        'Resizable, collapsible and nestable panes on the WAI-ARIA window splitter pattern: ratio or pixel sizing, full keyboard control, RTL and touch.',
    },
    {
      key: 'toolbar',
      name: 'Toolbar',
      icon: 'toolbar',
      path: '/components/toolbar',
      description:
        'WAI-ARIA APG command bar: roving tabindex, before/center/after groups and an overflow menu for the commands that stop fitting — which the presentation-only reference toolbars have no answer for.',
    },
    {
      key: 'stepper',
      name: 'Stepper',
      icon: 'stepper',
      path: '/components/stepper',
      description:
        'A linear or free wizard with async leave guards, refusals that say why, and one ARIA semantic in both directions — where Material swaps its roles with the layout.',
    },
    {
      key: 'drawer',
      name: 'Drawer',
      icon: 'drawer',
      path: '/components/drawer',
      description:
        'A side panel that floats above, pushes or shrinks its content — and whose modality follows that choice: a dialog with a focus trap when it covers, a landmark when it shares the row. None of the reference drawers gets that split right.',
    },
    {
      key: 'menubar',
      name: 'Menubar',
      icon: 'menubar',
      path: '/components/menubar',
      description:
        'A persistent APG menubar with nested submenus on the suite’s shared menu machinery, a container-width hamburger collapse and cancelable open/close pairs. Material has no menubar at all — only the CDK offers the directives.',
    },
    {
      key: 'breadcrumb',
      name: 'Breadcrumb',
      icon: 'breadcrumb',
      path: '/components/breadcrumb',
      description:
        'The APG trail: a nav landmark of real links with aria-current on the current page, collapsing its oldest middle crumbs against its own container width — the hidden ones stay reachable as links. Neither DevExtreme nor Material ships one.',
    },
    {
      key: 'tree-view',
      name: 'Tree View',
      icon: 'tree',
      path: '/components/tree-view',
      description:
        'Flat or nested data with tri-state checkboxes, ancestor-preserving search, load-on-demand children, virtual scrolling and drag & drop reparenting.',
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
      key: 'bpmn',
      name: 'BPMN Editor',
      icon: 'workflow',
      path: '/components/bpmn',
      description:
        'BPMN 2.0 process modeler: palette, orthogonal connections, undo/redo, XML import/export — on its own dependency-free engine, with no watermark.',
    },
    {
      key: 'charts',
      name: 'Charts',
      icon: 'activity',
      path: '/components/charts',
      description:
        'Data visualization on a dependency-free SVG kernel: 11 cartesian series types plus pie/doughnut, time and log axes, zoom & pan, crosshair, tooltips and an interactive legend.',
    },
    {
      key: 'gantt',
      name: 'Gantt',
      icon: 'list',
      path: '/components/gantt',
      description:
        'Project plan with a task tree and timeline chart: summary and milestone bars, dependency arrows, critical path, drag editing and undo/redo.',
    },
    {
      key: 'scheduler',
      name: 'Scheduler',
      icon: 'calendar',
      path: '/components/scheduler',
      description:
        'Event planner with day, week and month views: all-day strip, deterministic appointment layout, drag & resize with Escape-cancel, popup and editing dialog.',
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

  protected readonly menubarItems: readonly OgeMenubarItemData[] = [
    { text: 'File', items: [{ text: 'New' }, { text: 'Open…' }] },
    { text: 'Edit', items: [{ text: 'Undo' }] },
    { text: 'Help' },
  ];

  protected readonly breadcrumbItems: readonly OgeBreadcrumbItemData[] = [
    { text: 'Home', url: '/components/breadcrumb' },
    { text: 'Products', url: '/components/breadcrumb' },
    { text: 'Keyboards' },
  ];

  protected readonly org: OrgNode[] = [
    { id: 1, parentId: null, name: 'Deniz Arslan', title: 'CTO' },
    { id: 2, parentId: 1, name: 'Elif Kaya', title: 'Eng. Manager' },
    { id: 3, parentId: 2, name: 'Mert Demir', title: 'Frontend Lead' },
    { id: 4, parentId: 1, name: 'Can Yılmaz', title: 'Design Lead' },
  ];

  protected readonly previewName = signal('Ada');
  protected readonly previewAmount = signal<number | null>(42);
  protected readonly previewProfile = signal({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
  });

  protected readonly previewMenu: OgeMenuItem[] = [
    { text: 'Duplicate' },
    { text: 'Pin to top', checked: true },
    { separator: true, text: '' },
    { text: 'Delete', severity: 'danger' },
  ];

  protected readonly fakeSave = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, 1200));
}
