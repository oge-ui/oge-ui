import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { OgeButton } from '@oge-ui/buttons';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { OgeSelectBox } from '@oge-ui/inputs';
import { OgeTreeList } from '@oge-ui/tree-list';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { Icon, type IconName } from '../../shared/icon';

interface TickerRow {
  id: number;
  product: string;
  region: string;
  price: number;
  qty: number;
}

interface OrgNode {
  id: number;
  parentId: number | null;
  name: string;
  title: string;
}

interface ComponentTile {
  icon: IconName;
  name: string;
  desc: string;
  path: string;
}

type DemoTab = 'grid' | 'tree' | 'select' | 'buttons';

const BASE_ROWS: TickerRow[] = [
  { id: 1, product: 'Aurora Display', region: 'EMEA', price: 1249, qty: 320 },
  { id: 2, product: 'Nebula Sensor', region: 'APAC', price: 862, qty: 780 },
  {
    id: 3,
    product: 'Quantum Relay',
    region: 'Americas',
    price: 1540,
    qty: 145,
  },
  { id: 4, product: 'Photon Cable', region: 'EMEA', price: 96, qty: 4210 },
  { id: 5, product: 'Ion Battery', region: 'Americas', price: 415, qty: 990 },
  { id: 6, product: 'Vector GPU', region: 'APAC', price: 2199, qty: 260 },
];

const ORG: OrgNode[] = [
  { id: 1, parentId: null, name: 'Deniz Arslan', title: 'CTO' },
  { id: 2, parentId: 1, name: 'Elif Kaya', title: 'Eng. Manager' },
  { id: 3, parentId: 2, name: 'Mert Demir', title: 'Frontend Lead' },
  { id: 4, parentId: 2, name: 'Selin Doğan', title: 'Backend Lead' },
  { id: 5, parentId: 1, name: 'Can Yılmaz', title: 'Design Lead' },
];

/**
 * Landing page: asymmetric hero over a 3D particle-wave canvas, a tabbed
 * live-component window with pointer parallax, bento feature cells with
 * cursor spotlight, and count-up stats — all in the logo's
 * cyan→violet→magenta palette. Rendered without the sidebar shell
 * (see App.isHome). The wave and parallax are hand-rolled on canvas/rAF —
 * no 3D library, no bundle cost, and they pause under reduced motion.
 */
@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    Icon,
    OgeGrid,
    OgeColumn,
    OgeTreeList,
    OgeButton,
    OgeSelectBox,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- ═══ Hero ═══ -->
    <section class="home-hero relative overflow-hidden">
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <span class="home-blob home-blob-1"></span>
        <span class="home-blob home-blob-2"></span>
        <canvas class="home-fx absolute inset-0"></canvas>
        <span class="home-gridlines"></span>
        <span class="home-noise"></span>
      </div>

      <div
        class="relative mx-auto grid max-w-6xl grid-cols-[1.02fr_1fr] items-center gap-14 px-6 pb-20 pt-20 max-lg:grid-cols-1 max-lg:gap-10 max-lg:pt-12"
      >
        <!-- Left: copy -->
        <div>
          <h1
            class="home-in home-d1 text-[52px] font-bold leading-[1.08] tracking-tight text-gray-900 max-md:text-4xl dark:text-white"
          >
            Angular components
            <br />
            built for
            <span class="home-rotator" aria-hidden="true">
              <span class="home-rotator-track">
                @for (word of rotatorWords; track $index) {
                  <span class="home-gradient-text">{{ word }}</span>
                }
              </span>
            </span>
            <span class="sr-only">data grids</span>
          </h1>

          <p
            class="home-in home-d3 mt-5 max-w-lg text-[15.5px] leading-relaxed text-gray-600 dark:text-gray-400"
          >
            A virtualized data grid, tree list, pivot table, buttons and form
            editors. Signal APIs end to end, zoneless by default, themed with
            CSS tokens — and every docs page is axe-tested.
          </p>

          <div class="home-in home-d4 mt-7 flex flex-wrap items-center gap-4">
            <a
              routerLink="/getting-started"
              class="home-btn-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13.5px] font-semibold text-white"
            >
              Get started
              <app-icon name="arrow-right" [size]="14" />
            </a>
            <a
              routerLink="/components"
              class="group flex items-center gap-1.5 text-[13.5px] font-semibold text-gray-700 transition-colors hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
            >
              Browse components
              <span
                class="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                <app-icon name="arrow-right" [size]="14" />
              </span>
            </a>
            <a
              href="https://www.npmjs.com/package/@oge-ui/grid"
              target="_blank"
              rel="noopener"
              class="group flex items-center gap-1.5 text-[13.5px] font-semibold text-gray-700 transition-colors hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
            >
              <app-icon name="package" [size]="14" />
              View on npm
            </a>
          </div>

          <div
            class="home-in home-d5 mt-5 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white/70 py-1.5 pl-3.5 pr-1.5 font-mono text-[13px] text-gray-700 backdrop-blur dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300"
          >
            <span class="select-none text-cyan-600 dark:text-cyan-400">$</span>
            <span>npm install</span>
            <span class="relative">
              <select
                aria-label="Package to install"
                class="appearance-none rounded-md bg-transparent py-0.5 pl-1.5 pr-6 font-mono text-[13px] text-indigo-600 outline-none transition-colors hover:bg-indigo-50 focus-visible:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10 dark:focus-visible:bg-indigo-500/10"
                [value]="installPkg()"
                (change)="installPkg.set($any($event.target).value)"
              >
                @for (pkg of installablePkgs; track pkg) {
                  <option [value]="pkg">{{ pkg }}</option>
                }
              </select>
              <span
                class="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              >
                <app-icon name="chevron-down" [size]="12" />
              </span>
            </span>
            <button
              type="button"
              (click)="copyInstall()"
              [attr.aria-label]="copied() ? 'Copied' : 'Copy install command'"
              class="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              @if (copied()) {
                <span class="text-emerald-500">
                  <app-icon name="check" [size]="14" />
                </span>
              } @else {
                <app-icon name="copy" [size]="14" />
              }
            </button>
          </div>

          <p
            class="home-in home-d5 mt-4 text-[12px] text-gray-400 dark:text-gray-600"
          >
            Every package installs standalone — shared engines
            (<code>core</code>, <code>overlay</code>) come along automatically.
          </p>
        </div>

        <!-- Right: tabbed live-component window with pointer parallax.
             The tilt's perspective transform would become the containing
             block for the select popup (position: fixed), so it is dropped
             while the select tab is active. -->
        <div class="home-in-fade home-d6 min-w-0">
          <div [class.home-tilt]="demoTab() !== 'select'">
            <div class="home-window-frame">
              <div
                class="overflow-hidden rounded-[11px] bg-white dark:bg-gray-950"
              >
                <div
                  class="flex items-center border-b border-gray-200 pr-3 dark:border-gray-800"
                >
                  <div class="flex items-center gap-1.5 px-3.5">
                    <span class="h-2.5 w-2.5 rounded-full bg-red-400/80"></span>
                    <span
                      class="h-2.5 w-2.5 rounded-full bg-amber-400/80"
                    ></span>
                    <span
                      class="h-2.5 w-2.5 rounded-full bg-emerald-400/80"
                    ></span>
                  </div>
                  <div class="flex">
                    @for (tab of demoTabs; track tab.id) {
                      <button
                        type="button"
                        [attr.aria-pressed]="demoTab() === tab.id"
                        (click)="demoTab.set(tab.id)"
                        class="border-b-2 px-3.5 py-2.5 font-mono text-[12px] transition-colors"
                        [class]="
                          demoTab() === tab.id
                            ? 'border-indigo-500 text-gray-900 dark:text-gray-100'
                            : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                        "
                      >
                        {{ tab.file }}
                      </button>
                    }
                  </div>
                  @if (demoTab() === 'grid') {
                    <span
                      class="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-400"
                    >
                      <span class="home-live-dot" aria-hidden="true"></span>
                      LIVE
                    </span>
                  }
                </div>
                <div class="min-h-[272px]">
                  @switch (demoTab()) {
                    @case ('grid') {
                      <div class="home-pane p-3">
                        <oge-grid [data]="rows()" keyField="id">
                          <oge-column field="product" caption="Product" />
                          <oge-column
                            field="region"
                            caption="Region"
                            [width]="100"
                          />
                          <oge-column
                            field="price"
                            caption="Price"
                            dataType="number"
                            [width]="90"
                          />
                          <oge-column
                            field="qty"
                            caption="Qty"
                            dataType="number"
                            [width]="80"
                          />
                        </oge-grid>
                      </div>
                    }
                    @case ('tree') {
                      <div class="home-pane p-3">
                        <oge-tree-list
                          [data]="org"
                          keyExpr="id"
                          parentIdExpr="parentId"
                          [autoExpandAll]="true"
                        >
                          <oge-column field="name" caption="Name" />
                          <oge-column
                            field="title"
                            caption="Title"
                            [width]="140"
                          />
                        </oge-tree-list>
                      </div>
                    }
                    @case ('select') {
                      <div
                        class="home-pane flex min-h-[272px] flex-wrap content-center items-start justify-center gap-5 p-6"
                      >
                        <oge-select-box
                          label="City"
                          [items]="heroCities"
                          [showClearButton]="true"
                          [(value)]="heroCity"
                        />
                        <oge-select-box
                          label="Assignee"
                          [items]="heroUsers"
                          displayExpr="name"
                          valueExpr="id"
                          [searchEnabled]="true"
                          placeholder="Type to search…"
                          [(value)]="heroUserId"
                        />
                      </div>
                    }
                    @case ('buttons') {
                      <div
                        class="home-pane flex min-h-[272px] flex-wrap content-center items-center justify-center gap-3 p-6"
                      >
                        <oge-button text="Accent" severity="accent" />
                        <oge-button
                          text="Success"
                          severity="success"
                          stylingMode="outlined"
                        />
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
                  }
                </div>
              </div>
            </div>
          </div>
          <p
            class="mt-4 text-center text-[12.5px] text-gray-400 dark:text-gray-500"
          >
            Real components, not screenshots — sort a column, expand a node,
            click “Async save”.
          </p>
        </div>
      </div>
    </section>

    <!-- ═══ Package marquee ═══ -->
    <div
      class="home-marquee overflow-hidden border-y border-gray-200 bg-gray-50/60 py-3 dark:border-gray-800 dark:bg-gray-900/30"
    >
      <div class="home-marquee-track">
        @for (half of [0, 1]; track half) {
          <div
            class="flex items-center gap-10 pr-10"
            [attr.aria-hidden]="half === 1 ? true : null"
          >
            @for (pkg of packages; track pkg) {
              <span
                class="font-mono text-[12.5px] text-gray-400 dark:text-gray-500"
                >{{ pkg }}</span
              >
              <span class="home-marquee-dot" aria-hidden="true"></span>
            }
          </div>
        }
      </div>
    </div>

    <!-- ═══ Bento features ═══ -->
    <section class="mx-auto max-w-6xl px-6 py-20">
      <div class="home-reveal flex items-center gap-5">
        <div>
          <p
            class="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400"
          >
            Why oge
          </p>
          <h2
            class="mt-1.5 whitespace-nowrap text-[28px] font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Modern Angular, no compromises
          </h2>
        </div>
        <span class="home-rule" aria-hidden="true"></span>
      </div>

      <div
        class="mt-10 grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1"
      >
        <!-- signals + code -->
        <div class="home-cell home-reveal col-span-2 max-sm:col-span-1">
          <div class="p-6 pb-0">
            <h3
              class="text-[15px] font-semibold text-gray-900 dark:text-gray-100"
            >
              Signal APIs end to end
            </h3>
            <p
              class="mt-1.5 max-w-md text-[13.5px] text-gray-500 dark:text-gray-400"
            >
              Inputs, outputs and state are signals. Derive totals with
              <code>computed()</code> — no lifecycle hooks, no subscriptions to
              leak.
            </p>
          </div>
          <pre
            class="home-code m-6 mt-4"
          ><code><span class="hc-c">// live totals, no lifecycle hooks</span>
<span class="hc-k">readonly</span> rows = <span class="hc-f">signal</span>&lt;Order[]&gt;([]);
<span class="hc-k">readonly</span> total = <span class="hc-f">computed</span>(() =&gt;
  <span class="hc-k">this</span>.rows().reduce((sum, r) =&gt; sum + r.amount, <span class="hc-n">0</span>),
);<span class="home-caret" aria-hidden="true"></span></code></pre>
        </div>

        <!-- virtualization -->
        <div class="home-cell home-reveal">
          <div class="p-6 pb-0">
            <h3
              class="text-[15px] font-semibold text-gray-900 dark:text-gray-100"
            >
              Virtualized into the millions
            </h3>
            <p class="mt-1.5 text-[13.5px] text-gray-500 dark:text-gray-400">
              Row and column virtualization from a framework-free core — the DOM
              only ever holds what you see.
            </p>
          </div>
          <div class="home-virt mx-6 mb-6 mt-4" aria-hidden="true">
            <div class="home-virt-track">
              @for (half of [0, 1]; track half) {
                @for (row of virtRows; track row) {
                  <div class="home-virt-row">
                    <span></span><span></span><span></span>
                  </div>
                }
              }
            </div>
          </div>
        </div>

        <!-- zoneless -->
        <div class="home-cell home-reveal">
          <div class="p-6">
            <h3
              class="text-[15px] font-semibold text-gray-900 dark:text-gray-100"
            >
              Zoneless by default
            </h3>
            <p class="mt-1.5 text-[13.5px] text-gray-500 dark:text-gray-400">
              No Zone.js, no global change detection sweeps. Components mark
              exactly what moved.
            </p>
            <p
              class="mt-4 rounded-lg bg-gray-100 px-3 py-2 font-mono text-[12px] text-gray-400 dark:bg-gray-900 dark:text-gray-500"
            >
              <span class="line-through">import 'zone.js';</span>
              <span class="text-emerald-600 dark:text-emerald-400">
                // not needed</span
              >
            </p>
          </div>
        </div>

        <!-- theming -->
        <div class="home-cell home-reveal">
          <div class="p-6">
            <h3
              class="text-[15px] font-semibold text-gray-900 dark:text-gray-100"
            >
              Design-token theming
            </h3>
            <p class="mt-1.5 text-[13.5px] text-gray-500 dark:text-gray-400">
              One set of CSS variables drives every component. Dark, Tailwind
              and Bootstrap bridges ship in the box.
            </p>
            <div class="mt-4 flex items-center gap-2.5">
              @for (swatch of swatches; track swatch.name) {
                <span
                  class="home-swatch"
                  [style.background]="swatch.color"
                  [title]="swatch.name"
                ></span>
              }
              <span
                class="ml-1 font-mono text-[11.5px] text-gray-400 dark:text-gray-500"
                >--oge-accent</span
              >
            </div>
          </div>
        </div>

        <!-- a11y -->
        <div class="home-cell home-reveal">
          <div class="p-6">
            <h3
              class="text-[15px] font-semibold text-gray-900 dark:text-gray-100"
            >
              Keyboard-first accessibility
            </h3>
            <p class="mt-1.5 text-[13.5px] text-gray-500 dark:text-gray-400">
              WAI-ARIA grid semantics, focus management and full keyboard
              navigation — verified with axe.
            </p>
            <div class="mt-4 flex items-center gap-1.5" aria-hidden="true">
              @for (key of kbdKeys; track key) {
                <kbd class="home-kbd">{{ key }}</kbd>
              }
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ Mini playground ═══ -->
    <section class="mx-auto max-w-6xl px-6 pb-20">
      <div class="home-reveal flex items-center gap-5">
        <div>
          <p
            class="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400"
          >
            Playground
          </p>
          <h2
            class="mt-1.5 whitespace-nowrap text-[28px] font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Flip a switch — it's live
          </h2>
        </div>
        <span class="home-rule" aria-hidden="true"></span>
        <a
          routerLink="/components/data-grid/playground"
          class="group flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Full playground
          <span
            class="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            <app-icon name="arrow-right" [size]="13" />
          </span>
        </a>
      </div>

      <!-- opacity-only reveal: a transform animation would turn this cell into
           the containing block for the grid's position:fixed popups -->
      <div class="home-cell home-reveal-fade mt-10 p-5">
        <div class="mb-4 flex flex-wrap items-center gap-2">
          @for (option of pgToggles; track option.key) {
            <button
              type="button"
              [attr.aria-pressed]="option.state()"
              (click)="option.state.set(!option.state())"
              class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all"
              [class]="
                option.state()
                  ? 'border-indigo-500/60 bg-indigo-600 text-white shadow-[0_4px_14px_-6px_rgba(99,102,241,0.6)]'
                  : 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300'
              "
            >
              <app-icon [name]="option.icon" [size]="13" />
              {{ option.label }}
            </button>
          }
        </div>
        <oge-grid
          [data]="pgEmployees()"
          keyField="id"
          [filterRow]="pgFilterRow()"
          [headerFilter]="pgHeaderFilter()"
          [searchPanel]="pgSearch()"
          [paging]="pgPaging() ? { pageSize: 8 } : false"
          [virtualScroll]="pgVirtual()"
          [selectionMode]="pgSelection() ? 'checkbox' : 'none'"
          [groupPanel]="pgGrouping()"
          [groupBy]="pgGrouping() ? ['department'] : []"
          [columnChooser]="pgColumnChooser()"
          [editing]="
            pgEditing()
              ? {
                  mode: 'batch',
                  allowUpdating: true,
                  allowAdding: true,
                  allowDeleting: true,
                }
              : false
          "
          [focusedRowEnabled]="pgFocusedRow()"
          [rowDragging]="pgRowDrag()"
          [rowAlternation]="pgStriping()"
          [style.height]="pgVirtual() ? '420px' : null"
        >
          <oge-column field="firstName" caption="First Name" />
          <oge-column field="lastName" caption="Last Name" />
          <oge-column field="department" caption="Department" />
          <oge-column field="city" caption="City" />
          <oge-column
            field="salary"
            caption="Salary"
            dataType="number"
            [width]="110"
          />
        </oge-grid>
      </div>
    </section>

    <!-- ═══ Stats ═══ -->
    <section
      class="border-y border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/30"
    >
      <div
        class="home-stats-row mx-auto grid max-w-5xl grid-cols-4 px-6 py-10 max-md:grid-cols-2 max-md:gap-y-8"
      >
        @for (stat of statTargets; track stat.label; let i = $index) {
          <div
            [class]="
              i > 0
                ? 'text-center md:border-l md:border-gray-200 md:dark:border-gray-800'
                : 'text-center'
            "
          >
            <div
              class="home-gradient-text text-[34px] font-bold tracking-tight"
            >
              {{ statValues()[i] }}{{ stat.suffix }}
            </div>
            <div class="mt-1 text-[12.5px] text-gray-500 dark:text-gray-400">
              {{ stat.label }}
            </div>
          </div>
        }
      </div>
    </section>

    <!-- ═══ Component tiles ═══ -->
    <section class="mx-auto max-w-6xl px-6 py-20">
      <div class="home-reveal flex items-center gap-5">
        <div>
          <p
            class="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400"
          >
            Components
          </p>
          <h2
            class="mt-1.5 whitespace-nowrap text-[28px] font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Six families, one design system
          </h2>
        </div>
        <span class="home-rule" aria-hidden="true"></span>
      </div>

      <div
        class="mt-10 grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1"
      >
        @for (tile of tiles; track tile.path) {
          <a [routerLink]="tile.path" class="home-cell home-reveal group p-6">
            <div class="flex items-center gap-3">
              <span
                class="home-feature-icon flex h-9 w-9 items-center justify-center rounded-lg"
              >
                <app-icon [name]="tile.icon" [size]="17" />
              </span>
              <span
                class="text-[14.5px] font-semibold text-gray-900 dark:text-gray-100"
              >
                {{ tile.name }}
              </span>
              <span
                class="ml-auto text-gray-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-indigo-500 dark:text-gray-600 dark:group-hover:text-indigo-400"
              >
                <app-icon name="arrow-right" [size]="15" />
              </span>
            </div>
            <p
              class="mt-3 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400"
            >
              {{ tile.desc }}
            </p>
          </a>
        }
      </div>
    </section>

    <!-- ═══ Final CTA ═══ -->
    <section class="mx-auto max-w-4xl px-6 pb-20">
      <div class="home-reveal home-window-frame">
        <div
          class="relative overflow-hidden rounded-[11px] bg-white px-8 py-12 text-center dark:bg-gray-950"
        >
          <div class="pointer-events-none absolute inset-0" aria-hidden="true">
            <span class="home-blob home-blob-cta"></span>
            <span class="home-noise"></span>
          </div>
          <div class="home-logo-wrap relative mx-auto w-fit">
            <span class="home-logo-ring" aria-hidden="true"></span>
            <img
              src="logo.png"
              alt=""
              width="72"
              height="72"
              class="home-logo relative h-18 w-18 rounded-full object-cover"
            />
          </div>
          <h2
            class="relative mt-6 text-[28px] font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Start building with oge
          </h2>
          <p
            class="relative mx-auto mt-2.5 max-w-md text-[14.5px] text-gray-600 dark:text-gray-400"
          >
            Install a package, import a component, bind a signal. That is the
            whole setup.
          </p>
          <div
            class="relative mt-7 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              routerLink="/getting-started/setup"
              class="home-btn-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13.5px] font-semibold text-white"
            >
              Set up your project
              <app-icon name="arrow-right" [size]="14" />
            </a>
            <a
              href="https://github.com/oge-ui/oge-ui"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 text-[13.5px] font-semibold text-gray-700 transition-colors hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
            >
              <app-icon name="github" [size]="15" />
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/@oge-ui/grid"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 text-[13.5px] font-semibold text-gray-700 transition-colors hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
            >
              <app-icon name="package" [size]="15" />
              npm
            </a>
          </div>
        </div>
      </div>
      <div
        class="mx-auto mt-12 max-w-2xl border-t border-gray-200 pt-8 text-center dark:border-gray-800"
      >
        <p class="text-[13px] leading-relaxed text-gray-400 dark:text-gray-500">
          <span class="font-semibold text-gray-500 dark:text-gray-400"
            >oge</span
          >
          is the Turkish <em>öge</em> — from the Old Turkic root <em>ög</em>,
          “mind, to think”. It was once the title of a wise counselor; today it
          means “element”, a part that makes up a whole. We went with the
          meaning that fit best.
          <!-- inline SVG flag: Windows renders 🇹🇷 as plain "TR" letters -->
          <svg
            viewBox="0 0 30 20"
            width="18"
            height="12"
            role="img"
            aria-label="Türkiye"
            class="inline-block rounded-[2px] align-[-1px]"
          >
            <rect width="30" height="20" fill="#E30A17" />
            <circle cx="11" cy="10" r="5" fill="#fff" />
            <circle cx="12.3" cy="10" r="4" fill="#E30A17" />
            <path
              fill="#fff"
              transform="rotate(90 18.3 10)"
              d="M18.3 7.4l.66 2.03h2.13l-1.72 1.25.66 2.03-1.73-1.25-1.73 1.25.66-2.03-1.72-1.25h2.13z"
            />
          </svg>
        </p>
        <p class="mt-4 text-[12px] text-gray-400 dark:text-gray-600">
          OGE UI &middot; signals all the way down
        </p>
      </div>
    </section>
  `,
  styles: `
    /* ── entrance stagger ─────────────────────────────────────────── */
    @keyframes home-fade-up {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    app-home .home-in {
      animation: home-fade-up 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    /* opacity-only entrance for containers of position:fixed popups */
    app-home .home-in-fade {
      animation: home-fade 0.65s ease both;
    }

    app-home .home-d2 {
      animation-delay: 0.07s;
    }
    app-home .home-d3 {
      animation-delay: 0.14s;
    }
    app-home .home-d4 {
      animation-delay: 0.21s;
    }
    app-home .home-d5 {
      animation-delay: 0.28s;
    }
    app-home .home-d6 {
      animation-delay: 0.2s;
    }

    /* ── reveal-on-scroll (progressive: Chromium scroll timelines) ── */
    @keyframes home-fade {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @supports (animation-timeline: view()) {
      app-home .home-reveal {
        animation: home-fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        animation-timeline: view();
        animation-range: entry 5% entry 32%;
      }

      /* opacity-only variant for containers of position:fixed popups —
         an animated transform would become their containing block */
      app-home .home-reveal-fade {
        animation: home-fade 0.7s ease both;
        animation-timeline: view();
        animation-range: entry 5% entry 32%;
      }
    }

    /* ── hero background: blobs, particle wave, dot grid, grain ───── */
    app-home .home-blob {
      position: absolute;
      border-radius: 9999px;
      filter: blur(90px);
      opacity: 0.13;
    }

    .dark app-home .home-blob {
      opacity: 0.2;
    }

    app-home .home-blob-1 {
      top: -9rem;
      right: -7rem;
      height: 30rem;
      width: 30rem;
      background: radial-gradient(
        circle,
        #22d3ee 0%,
        #6366f1 55%,
        transparent 75%
      );
      animation: home-drift-1 18s ease-in-out infinite alternate;
    }

    app-home .home-blob-2 {
      bottom: -12rem;
      left: -9rem;
      height: 30rem;
      width: 30rem;
      background: radial-gradient(
        circle,
        #a855f7 0%,
        #ec4899 55%,
        transparent 75%
      );
      animation: home-drift-2 22s ease-in-out infinite alternate;
    }

    app-home .home-blob-cta {
      top: -9rem;
      left: 50%;
      height: 20rem;
      width: 28rem;
      transform: translateX(-50%);
      background: radial-gradient(circle, #8b5cf6, transparent 70%);
    }

    @keyframes home-drift-1 {
      to {
        transform: translate(-3.5rem, 2.5rem) scale(1.1);
      }
    }

    @keyframes home-drift-2 {
      to {
        transform: translate(3rem, -2rem) scale(1.12);
      }
    }

    app-home .home-fx {
      width: 100%;
      height: 100%;
    }

    app-home .home-gridlines {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(
        rgba(99, 102, 241, 0.22) 1px,
        transparent 1px
      );
      background-size: 28px 28px;
      mask-image: radial-gradient(
        ellipse 65% 60% at 45% 35%,
        black 20%,
        transparent 72%
      );
    }

    app-home .home-noise {
      position: absolute;
      inset: 0;
      opacity: 0.04;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
    }

    .dark app-home .home-noise {
      opacity: 0.06;
    }

    /* ── gradient text ────────────────────────────────────────────── */
    app-home .home-gradient-text {
      background-image: linear-gradient(90deg, #0891b2, #6366f1, #c026d3);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .dark app-home .home-gradient-text {
      background-image: linear-gradient(90deg, #22d3ee, #818cf8, #e879f9);
    }

    /* ── rotating headline word ───────────────────────────────────── */
    app-home .home-rotator {
      display: inline-flex;
      height: 1.2em;
      overflow: hidden;
      vertical-align: bottom;
    }

    app-home .home-rotator-track {
      display: flex;
      flex-direction: column;
      animation: home-rotate 12s cubic-bezier(0.77, 0, 0.18, 1) infinite;
    }

    app-home .home-rotator-track > span {
      display: block;
      height: 1.2em;
      line-height: 1.2;
      white-space: nowrap;
    }

    @keyframes home-rotate {
      0%,
      15% {
        transform: translateY(0);
      }
      20%,
      35% {
        transform: translateY(-1.2em);
      }
      40%,
      55% {
        transform: translateY(-2.4em);
      }
      60%,
      75% {
        transform: translateY(-3.6em);
      }
      80%,
      95% {
        transform: translateY(-4.8em);
      }
      100% {
        transform: translateY(-6em);
      }
    }

    /* ── primary CTA button ───────────────────────────────────────── */
    app-home .home-btn-primary {
      background-image: linear-gradient(90deg, #6366f1, #a855f7, #ec4899);
      background-size: 200% 100%;
      box-shadow: 0 6px 24px -8px rgba(139, 92, 246, 0.55);
      transition:
        background-position 0.4s ease,
        box-shadow 0.3s ease,
        transform 0.2s ease;
    }

    app-home .home-btn-primary:hover {
      background-position: 100% 0;
      box-shadow: 0 8px 30px -8px rgba(217, 70, 239, 0.5);
      transform: translateY(-1px);
    }

    /* ── live pulse dot ───────────────────────────────────────────── */
    app-home .home-live-dot {
      position: relative;
      display: inline-block;
      height: 0.4rem;
      width: 0.4rem;
      border-radius: 9999px;
      background: #10b981;
    }

    app-home .home-live-dot::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 9999px;
      background: inherit;
      animation: home-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }

    @keyframes home-ping {
      75%,
      100% {
        transform: scale(2.3);
        opacity: 0;
      }
    }

    /* ── tilted demo window with gradient frame ───────────────────── */
    @media (min-width: 64rem) and (hover: hover) {
      app-home .home-tilt {
        transform: perspective(1600px) rotateY(-7deg) rotateX(3deg);
        will-change: transform;
      }
    }

    app-home .home-window-frame {
      border-radius: 12px;
      padding: 1px;
      background-image: linear-gradient(
        120deg,
        rgba(34, 211, 238, 0.45),
        rgba(99, 102, 241, 0.45),
        rgba(236, 72, 153, 0.45),
        rgba(34, 211, 238, 0.45)
      );
      background-size: 300% 100%;
      animation: home-border 9s linear infinite;
      box-shadow: 0 22px 60px -28px rgba(99, 102, 241, 0.4);
    }

    @keyframes home-border {
      to {
        background-position: 300% 0;
      }
    }

    /* tab pane crossfade on switch */
    app-home .home-pane {
      animation: home-pane-in 0.35s ease both;
    }

    /* opacity-only: a filled transform animation would make the pane the
       containing block for the select popup's fixed positioning */
    @keyframes home-pane-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* ── marquee with soft edges ──────────────────────────────────── */
    app-home .home-marquee {
      mask-image: linear-gradient(
        90deg,
        transparent,
        black 10%,
        black 90%,
        transparent
      );
    }

    app-home .home-marquee-track {
      display: flex;
      width: max-content;
      animation: home-marquee 36s linear infinite;
    }

    app-home .home-marquee-dot {
      height: 0.28rem;
      width: 0.28rem;
      border-radius: 9999px;
      background-image: linear-gradient(90deg, #22d3ee, #e879f9);
    }

    @keyframes home-marquee {
      to {
        transform: translateX(-50%);
      }
    }

    /* ── section rule line ────────────────────────────────────────── */
    app-home .home-rule {
      height: 1px;
      flex: 1;
      background-image: linear-gradient(
        90deg,
        rgba(129, 140, 248, 0.4),
        rgba(129, 140, 248, 0.08) 60%,
        transparent
      );
    }

    /* ── bento cells & tiles with cursor spotlight ────────────────── */
    app-home .home-cell {
      position: relative;
      display: block;
      overflow: hidden;
      border-radius: 14px;
      border: 1px solid rgb(229 231 235);
      background: #fff;
      transition:
        border-color 0.3s ease,
        box-shadow 0.3s ease;
    }

    .dark app-home .home-cell {
      border-color: rgb(31 41 55);
      background: rgb(17 24 39 / 0.4);
    }

    app-home .home-cell::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(
        260px circle at var(--mx, 50%) var(--my, 50%),
        rgba(129, 140, 248, 0.12),
        transparent 65%
      );
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    app-home .home-cell:hover {
      border-color: rgba(129, 140, 248, 0.45);
      box-shadow: 0 10px 34px -16px rgba(99, 102, 241, 0.3);
    }

    app-home .home-cell:hover::before {
      opacity: 1;
    }

    app-home .home-feature-icon {
      color: #6366f1;
      background: linear-gradient(
        135deg,
        rgba(34, 211, 238, 0.1),
        rgba(139, 92, 246, 0.1),
        rgba(236, 72, 153, 0.1)
      );
      border: 1px solid rgba(129, 140, 248, 0.22);
    }

    .dark app-home .home-feature-icon {
      color: #a5b4fc;
    }

    /* ── code block (always dark, editor-style) ───────────────────── */
    app-home .home-code {
      overflow-x: auto;
      border-radius: 10px;
      background: #0b1120;
      padding: 14px 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12.5px;
      line-height: 1.65;
      color: #cbd5e1;
    }

    app-home .home-code .hc-c {
      color: #64748b;
    }
    app-home .home-code .hc-k {
      color: #e879f9;
    }
    app-home .home-code .hc-f {
      color: #67e8f9;
    }
    app-home .home-code .hc-n {
      color: #fbbf24;
    }

    app-home .home-caret {
      display: inline-block;
      width: 7px;
      height: 13px;
      margin-left: 2px;
      vertical-align: -2px;
      background: #818cf8;
      animation: home-blink 1.1s steps(1) infinite;
    }

    @keyframes home-blink {
      50% {
        opacity: 0;
      }
    }

    /* ── virtualization vignette: endless row stream ──────────────── */
    app-home .home-virt {
      height: 6.5rem;
      overflow: hidden;
      mask-image: linear-gradient(
        180deg,
        transparent,
        black 22%,
        black 78%,
        transparent
      );
    }

    app-home .home-virt-track {
      animation: home-virt-scroll 7s linear infinite;
    }

    app-home .home-virt-row {
      display: flex;
      gap: 8px;
      padding: 5px 0;
    }

    app-home .home-virt-row > span {
      height: 8px;
      border-radius: 4px;
      background: rgb(229 231 235);
    }

    .dark app-home .home-virt-row > span {
      background: rgb(55 65 81);
    }

    app-home .home-virt-row > span:nth-child(1) {
      width: 34%;
    }
    app-home .home-virt-row > span:nth-child(2) {
      width: 26%;
    }
    app-home .home-virt-row > span:nth-child(3) {
      width: 16%;
    }

    app-home .home-virt-row:nth-child(3n) > span:first-child {
      background: linear-gradient(90deg, #818cf8, #e879f9);
      opacity: 0.55;
    }

    @keyframes home-virt-scroll {
      to {
        transform: translateY(-50%);
      }
    }

    /* ── theme swatches ───────────────────────────────────────────── */
    app-home .home-swatch {
      display: inline-block;
      height: 22px;
      width: 22px;
      border-radius: 7px;
      box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08);
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    app-home .home-swatch:hover {
      transform: translateY(-3px) scale(1.12);
    }

    /* ── keyboard keys with sequential press pulse ────────────────── */
    app-home .home-kbd {
      border-radius: 6px;
      border: 1px solid rgb(209 213 219);
      background: rgb(243 244 246);
      padding: 3px 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 11.5px;
      color: rgb(75 85 99);
      animation: home-keypress 3.2s ease-in-out infinite;
    }

    .dark app-home .home-kbd {
      border-color: rgb(75 85 99);
      background: rgb(31 41 55);
      color: rgb(156 163 175);
    }

    app-home .home-kbd:nth-child(1) {
      animation-delay: 0s;
    }
    app-home .home-kbd:nth-child(2) {
      animation-delay: 0.4s;
    }
    app-home .home-kbd:nth-child(3) {
      animation-delay: 0.8s;
    }
    app-home .home-kbd:nth-child(4) {
      animation-delay: 1.2s;
    }
    app-home .home-kbd:nth-child(5) {
      animation-delay: 1.6s;
    }

    @keyframes home-keypress {
      0%,
      10%,
      100% {
        transform: none;
      }
      5% {
        transform: translateY(2px);
        border-color: rgba(129, 140, 248, 0.7);
        color: rgb(99 102 241);
      }
    }

    /* ── glowing logo medallion (final CTA) ───────────────────────── */
    app-home .home-logo-wrap {
      position: relative;
    }

    app-home .home-logo-ring {
      position: absolute;
      inset: -0.35rem;
      border-radius: 9999px;
      background: conic-gradient(
        from 0deg,
        #22d3ee,
        #6366f1,
        #d946ef,
        #ec4899,
        #22d3ee
      );
      filter: blur(10px);
      opacity: 0.5;
      animation: home-spin 9s linear infinite;
    }

    @keyframes home-spin {
      to {
        transform: rotate(1turn);
      }
    }

    app-home .home-logo {
      animation: home-glow 4s ease-in-out infinite;
    }

    @keyframes home-glow {
      0%,
      100% {
        filter: drop-shadow(0 0 12px rgba(129, 140, 248, 0.4));
      }
      50% {
        filter: drop-shadow(0 0 24px rgba(217, 70, 239, 0.5));
      }
    }

    /* ── reduced motion: settle everything instantly ──────────────── */
    @media (prefers-reduced-motion: reduce) {
      app-home *,
      app-home *::before,
      app-home *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `,
})
export class HomePage {
  protected readonly rotatorWords = [
    'data grids',
    'tree lists',
    'pivot tables',
    'dashboards',
    'forms',
    'data grids', // duplicate of the first word for a seamless loop
  ];

  protected readonly packages = [
    'oge-ui',
    '@oge-ui/core',
    '@oge-ui/grid',
    '@oge-ui/tree-list',
    '@oge-ui/pivot',
    '@oge-ui/buttons',
    '@oge-ui/inputs',
    '@oge-ui/overlay',
  ];

  protected readonly demoTabs: { id: DemoTab; file: string }[] = [
    { id: 'grid', file: 'data-grid.ts' },
    { id: 'tree', file: 'tree-list.ts' },
    { id: 'select', file: 'select-box.ts' },
    { id: 'buttons', file: 'buttons.ts' },
  ];

  protected readonly heroCities = [
    'Ankara',
    'Berlin',
    'Lisbon',
    'Oslo',
    'Tokyo',
  ];

  protected readonly heroUsers = [
    { id: 1, name: 'Elif Kaya' },
    { id: 2, name: 'Mert Demir' },
    { id: 3, name: 'Selin Doğan' },
    { id: 4, name: 'Deniz Arslan' },
  ];

  protected readonly heroCity = signal<unknown>('Lisbon');
  protected readonly heroUserId = signal<unknown>(null);

  protected readonly demoTab = signal<DemoTab>('grid');

  protected readonly virtRows = [0, 1, 2, 3, 4, 5, 6, 7];

  protected readonly kbdKeys = ['↑', '↓', 'PgUp', 'Enter', 'Esc'];

  protected readonly swatches = [
    { name: 'Default', color: '#6366f1' },
    { name: 'Dark', color: '#0f172a' },
    { name: 'Tailwind', color: '#0ea5e9' },
    { name: 'Bootstrap', color: '#7c3aed' },
  ];

  protected readonly statTargets = [
    { target: 8, suffix: '', label: 'npm packages' },
    { target: 6, suffix: '', label: 'component families' },
    { target: 0, suffix: '', label: 'runtime dependencies' },
    { target: 100, suffix: '%', label: 'signal-based API' },
  ];

  protected readonly tiles: ComponentTile[] = [
    {
      icon: 'table',
      name: 'Data Grid',
      desc: 'Virtualized rows, multi-sort, filtering, grouping, editing, master-detail and export.',
      path: '/components/data-grid',
    },
    {
      icon: 'layout',
      name: 'Tree List',
      desc: 'Hierarchical data with lazy loading, tri-state selection and drag & drop.',
      path: '/components/tree-list',
    },
    {
      icon: 'gauge',
      name: 'Pivot Grid',
      desc: 'Cross-tab analytics: rows × columns × measures with totals and export.',
      path: '/components/pivot-grid',
    },
    {
      icon: 'pointer',
      name: 'Buttons',
      desc: 'Async actions with automatic loading, hold-to-confirm, groups and drop-downs.',
      path: '/components/buttons',
    },
    {
      icon: 'text-cursor',
      name: 'Inputs',
      desc: 'Text, textarea, number and select editors with floating labels, search and three form-binding modes.',
      path: '/components/inputs',
    },
    {
      icon: 'layers',
      name: 'Overlay',
      desc: 'Anchored panels, popups, menus, tooltips and context menus for any element.',
      path: '/components/overlay',
    },
  ];

  protected readonly org = ORG;

  protected readonly rows = signal<TickerRow[]>(
    BASE_ROWS.map((row) => ({ ...row })),
  );

  protected readonly copied = signal(false);

  /* mini playground: each pill drives a real grid input */
  protected readonly pgFilterRow = signal(true);
  protected readonly pgHeaderFilter = signal(false);
  protected readonly pgSearch = signal(false);
  protected readonly pgPaging = signal(true);
  protected readonly pgVirtual = signal(false);
  protected readonly pgSelection = signal(false);
  protected readonly pgGrouping = signal(false);
  protected readonly pgColumnChooser = signal(false);
  protected readonly pgEditing = signal(false);
  protected readonly pgFocusedRow = signal(false);
  protected readonly pgRowDrag = signal(false);
  protected readonly pgStriping = signal(false);

  /** 25k rows once virtual scroll is on, so the virtualization is felt. */
  protected readonly pgEmployees = computed<Employee[]>(() =>
    makeEmployees(this.pgVirtual() ? 25000 : 120),
  );

  protected readonly pgToggles: {
    key: string;
    label: string;
    icon: IconName;
    state: WritableSignal<boolean>;
  }[] = [
    {
      key: 'filter',
      label: 'Filter row',
      icon: 'filter',
      state: this.pgFilterRow,
    },
    {
      key: 'headerFilter',
      label: 'Header filter',
      icon: 'chevron-down',
      state: this.pgHeaderFilter,
    },
    {
      key: 'search',
      label: 'Search panel',
      icon: 'search',
      state: this.pgSearch,
    },
    { key: 'paging', label: 'Paging', icon: 'pages', state: this.pgPaging },
    {
      key: 'virtual',
      label: 'Virtual scroll (25k rows)',
      icon: 'zap',
      state: this.pgVirtual,
    },
    {
      key: 'selection',
      label: 'Selection',
      icon: 'check-square',
      state: this.pgSelection,
    },
    {
      key: 'grouping',
      label: 'Grouping',
      icon: 'layout',
      state: this.pgGrouping,
    },
    {
      key: 'columnChooser',
      label: 'Column chooser',
      icon: 'columns',
      state: this.pgColumnChooser,
    },
    {
      key: 'editing',
      label: 'Editing (batch)',
      icon: 'pencil',
      state: this.pgEditing,
    },
    {
      key: 'focusedRow',
      label: 'Focused row',
      icon: 'gauge',
      state: this.pgFocusedRow,
    },
    {
      key: 'rowDrag',
      label: 'Row drag & drop',
      icon: 'sliders',
      state: this.pgRowDrag,
    },
    {
      key: 'striping',
      label: 'Row striping',
      icon: 'table',
      state: this.pgStriping,
    },
  ];

  /** Installable packages: the umbrella first, then à-la-carte scopes. */
  protected readonly installablePkgs = [
    'oge-ui',
    '@oge-ui/grid',
    '@oge-ui/tree-list',
    '@oge-ui/pivot',
    '@oge-ui/buttons',
    '@oge-ui/inputs',
  ];

  protected readonly installPkg = signal('oge-ui');

  /** 0→1 easing progress for the count-up stats, driven on first scroll into view. */
  private readonly statProgress = signal(1);

  protected readonly statValues = computed(() => {
    const progress = this.statProgress();
    return this.statTargets.map((stat) => Math.round(stat.target * progress));
  });

  protected readonly fakeSave = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, 1200));

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Pointer position in hero coordinates; parked far away when outside. */
  private pointer = { x: -9999, y: -9999 };
  private tiltTarget = { rx: 3, ry: -7 };
  private tiltCurrent = { rx: 3, ry: -7 };

  constructor() {
    const id = setInterval(() => this.tick(), 1500);
    this.destroyRef.onDestroy(() => clearInterval(id));
    afterNextRender(() => {
      this.setupStatCountUp();
      this.setupPointerFx();
    });
  }

  protected copyInstall(): void {
    void navigator.clipboard
      ?.writeText(`npm install ${this.installPkg()}`)
      .then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
  }

  /** Nudge two random rows so the hero grid visibly streams data. */
  private tick(): void {
    const next = this.rows().map((row) => ({ ...row }));
    for (let n = 0; n < 2; n++) {
      const row = next[Math.floor(Math.random() * next.length)];
      const drift = 1 + (Math.random() - 0.5) * 0.04;
      row.price = Math.max(1, Math.round(row.price * drift));
      row.qty = Math.max(0, row.qty + Math.round((Math.random() - 0.5) * 30));
    }
    this.rows.set(next);
  }

  private setupStatCountUp(): void {
    const row = this.hostRef.nativeElement.querySelector('.home-stats-row');
    if (
      !row ||
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    this.statProgress.set(0);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const step = (now: number): void => {
          const t = Math.min(1, (now - start) / 1100);
          this.statProgress.set(1 - Math.pow(1 - t, 3));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    observer.observe(row);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /**
   * Hand-rolled 3D-ish effects, all outside Angular change detection:
   * a perspective particle wave on the hero canvas, pointer parallax on the
   * demo window, and the cursor spotlight on cards. Native listeners keep
   * mousemove from triggering CD; rAF stops on destroy and never starts
   * under prefers-reduced-motion (a single static frame is drawn instead).
   */
  private setupPointerFx(): void {
    const host = this.hostRef.nativeElement;
    const hero = host.querySelector<HTMLElement>('.home-hero');
    const canvas = host.querySelector<HTMLCanvasElement>('.home-fx');
    const tilt = host.querySelector<HTMLElement>('.home-tilt');
    const ctx = canvas?.getContext('2d');
    if (!hero || !canvas || !ctx) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const canTilt = window.matchMedia(
      '(min-width: 64rem) and (hover: hover)',
    ).matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = (): void => {
      const rect = hero.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(hero);
    this.destroyRef.onDestroy(() => ro.disconnect());

    const onMove = (event: MouseEvent): void => {
      // cursor spotlight on any card under the pointer
      const cell = (event.target as HTMLElement | null)?.closest?.(
        '.home-cell',
      ) as HTMLElement | null;
      if (cell) {
        const rect = cell.getBoundingClientRect();
        cell.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        cell.style.setProperty('--my', `${event.clientY - rect.top}px`);
      }
      // wave + parallax react only inside the hero
      const rect = hero.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
        this.pointer = { x, y };
        const nx = x / rect.width - 0.5;
        const ny = y / rect.height - 0.5;
        this.tiltTarget = { rx: 3 - ny * 7, ry: -7 + nx * 9 };
      } else {
        this.pointer = { x: -9999, y: -9999 };
        this.tiltTarget = { rx: 3, ry: -7 };
      }
    };
    const onLeave = (): void => {
      this.pointer = { x: -9999, y: -9999 };
      this.tiltTarget = { rx: 3, ry: -7 };
    };
    host.addEventListener('mousemove', onMove, { passive: true });
    host.addEventListener('mouseleave', onLeave, { passive: true });
    this.destroyRef.onDestroy(() => {
      host.removeEventListener('mousemove', onMove);
      host.removeEventListener('mouseleave', onLeave);
    });

    if (reduced) {
      this.drawWave(ctx, canvas, dpr, 0);
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number): void => {
      this.drawWave(ctx, canvas, dpr, (now - t0) / 1000);
      if (canTilt && tilt) {
        if (this.demoTab() === 'select') {
          // no transform while the select tab is open — a transformed
          // ancestor would misplace the popup's fixed positioning
          if (tilt.style.transform) tilt.style.transform = '';
        } else {
          const current = this.tiltCurrent;
          const target = this.tiltTarget;
          current.rx += (target.rx - current.rx) * 0.08;
          current.ry += (target.ry - current.ry) * 0.08;
          tilt.style.transform = `perspective(1600px) rotateX(${current.rx.toFixed(2)}deg) rotateY(${current.ry.toFixed(2)}deg)`;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    this.destroyRef.onDestroy(() => cancelAnimationFrame(raf));
  }

  /** Perspective dot-wave floor: cyan→violet→magenta, dips away from the cursor. */
  private drawWave(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    dpr: number,
    t: number,
  ): void {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const dark = document.documentElement.classList.contains('dark');
    const rows = 13;
    const cols = Math.max(26, Math.floor(w / 30));
    const horizon = h * 0.56;
    const { x: mx, y: my } = this.pointer;
    for (let r = 0; r < rows; r++) {
      const depth = r / (rows - 1);
      const y0 = horizon + depth * depth * (h - horizon) * 0.94;
      for (let c = 0; c < cols; c++) {
        const xn = c / (cols - 1) - 0.5;
        const x = w / 2 + xn * w * (0.74 + 0.52 * depth);
        let wave =
          Math.sin(t * 1.1 + c * 0.32 + r * 0.65) * 9 * (0.35 + depth) +
          Math.cos(t * 0.7 + c * 0.11 + r * 0.3) * 5 * depth;
        const dx = x - mx;
        const dy = y0 - my;
        wave -= Math.exp(-(dx * dx + dy * dy) / 22000) * 26 * (0.3 + depth);
        const hue = 190 + (xn + 0.5) * 130; // cyan → indigo → magenta
        const alpha = (dark ? 0.55 : 0.38) * (0.25 + 0.75 * depth);
        ctx.fillStyle = `hsla(${hue.toFixed(0)}, 85%, ${dark ? 66 : 52}%, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y0 + wave, 0.8 + 1.5 * depth, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
