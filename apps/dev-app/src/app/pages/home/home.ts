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
import { ArrayDataSource } from '@oge-ui/core';
import { OgeButton } from '@oge-ui/buttons';
import { OgeCellTemplate, OgeColumn, OgeGrid } from '@oge-ui/grid';
import { OgeSelectBox } from '@oge-ui/inputs';
import { OgeTab, OgeTabPanel } from '@oge-ui/tabs';
import type { OgeTabSelectionChangedEvent } from '@oge-ui/tabs';
import { OgeTreeList } from '@oge-ui/tree-list';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { Icon, type IconName } from '../../shared/icon';
import {
  FrameworkLogo,
  type FrameworkLogoName,
} from '../../shared/framework-logo';
import { FrameworkSwitch } from '../../shared/framework-switch';
import { FrameworkService } from '../../shared/framework.service';
import { SITE_VERSION } from '../../shared/site-version';

interface TickerRow {
  id: number;
  product: string;
  region: string;
  price: number;
  qty: number;
  /** Signed % move of the last tick — drives the trend cell. */
  change: number;
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

const BASE_ROWS: TickerRow[] = [
  // prettier-ignore
  { id: 1, product: 'Aurora Display', region: 'EMEA', price: 1249, qty: 320, change: 0 },
  // prettier-ignore
  { id: 2, product: 'Nebula Sensor', region: 'APAC', price: 862, qty: 780, change: 0 },
  {
    id: 3,
    product: 'Quantum Relay',
    region: 'Americas',
    price: 1540,
    qty: 145,
    change: 0,
  },
  // prettier-ignore
  { id: 4, product: 'Photon Cable', region: 'EMEA', price: 96, qty: 4210, change: 0 },
  // prettier-ignore
  { id: 5, product: 'Ion Battery', region: 'Americas', price: 415, qty: 990, change: 0 },
  // prettier-ignore
  { id: 6, product: 'Vector GPU', region: 'APAC', price: 2199, qty: 260, change: 0 },
];

const ORG: OrgNode[] = [
  { id: 1, parentId: null, name: 'Deniz Arslan', title: 'CTO' },
  { id: 2, parentId: 1, name: 'Elif Kaya', title: 'Eng. Manager' },
  { id: 3, parentId: 2, name: 'Mert Demir', title: 'Frontend Lead' },
  { id: 4, parentId: 2, name: 'Selin Doğan', title: 'Backend Lead' },
  { id: 5, parentId: 1, name: 'Can Yılmaz', title: 'Design Lead' },
];

/**
 * Landing page in the brand's own palette (the logo's cyan→violet→magenta
 * ramp, indigo primary): white by day, deep slate by night via CSS
 * variables under `.dark`. Copy sits beside a corner-ticked live component
 * window with pointer tilt and glare; a package marquee runs under the
 * hero; features are a compact `01…05` numbered grid; component rows carry
 * their family icons; and live monthly npm download tiles are fetched
 * client-side from api.npmjs.org (graceful '—' fallback). Motion runs on
 * native listeners + rAF outside change detection and settles under
 * prefers-reduced-motion; the window tilt is dropped while the select tab
 * is active (a transformed ancestor would misplace the popup's fixed
 * positioning).
 */
@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    Icon,
    FrameworkSwitch,
    FrameworkLogo,
    OgeGrid,
    OgeColumn,
    OgeCellTemplate,
    OgeTreeList,
    OgeButton,
    OgeSelectBox,
    OgeTabPanel,
    OgeTab,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- ═══ Hero: copy beside the live window ═══ -->
    <section class="og-hero relative overflow-hidden">
      <div
        class="relative mx-auto grid max-w-6xl grid-cols-[1.02fr_1fr] items-center gap-12 px-6 pb-14 pt-14 max-lg:grid-cols-1 max-lg:gap-10 max-lg:pt-10"
      >
        <!-- Left: copy -->
        <div>
          <h1 class="home-in home-d1 og-display">
            UI components
            <br />
            built for
            <span class="home-rotator" aria-hidden="true">
              <span class="home-rotator-track">
                @for (word of rotatorWords; track $index) {
                  <span class="og-gilded">{{ word }}</span>
                }
              </span>
            </span>
            <span class="sr-only">data grids</span>
          </h1>

          <!--
            The same switch the docs use, so the choice a reader makes here
            follows them into every component page. Rendered from the framework
            list, so a vanilla-JavaScript layer joins it without touching this
            template.
          -->
          <div class="home-in home-d2 og-fw-strip">
            <app-framework-switch />
          </div>

          <p
            class="home-in home-d3 mt-5 max-w-lg text-[15.5px] leading-relaxed text-[color:var(--og-mut)]"
          >
            A virtualized data grid, tree list, pivot table, buttons and form
            editors. Signal APIs end to end, zoneless by default, themed with
            CSS tokens — over a framework-free engine both render layers share.
          </p>

          <div class="home-in home-d4 mt-7 flex flex-wrap items-center gap-4">
            <a routerLink="/getting-started" class="og-btn-gold">
              Get started
              <app-icon name="arrow-right" [size]="14" />
            </a>
            <a routerLink="/components" class="og-btn-stone"
              >Browse components</a
            >
          </div>

          <div class="home-in home-d5 og-install mt-6">
            <span class="select-none text-[color:var(--og-turk)]">$</span>
            <span>npm install</span>
            <span class="relative">
              <select
                aria-label="Package to install"
                class="og-install-select"
                [value]="installPkg()"
                (change)="installPkg.set($any($event.target).value)"
              >
                @for (pkg of installablePkgs; track pkg) {
                  <option [value]="pkg">{{ pkg }}</option>
                }
              </select>
              <span
                class="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[color:var(--og-faint)]"
              >
                <app-icon name="chevron-down" [size]="12" />
              </span>
            </span>
            <button
              type="button"
              (click)="copyInstall()"
              [attr.aria-label]="copied() ? 'Copied' : 'Copy install command'"
              class="og-install-copy"
            >
              @if (copied()) {
                <span class="text-[color:var(--og-turk)]">
                  <app-icon name="check" [size]="14" />
                </span>
              } @else {
                <app-icon name="copy" [size]="14" />
              }
            </button>
          </div>
        </div>

        <!-- Right: the tilted live window. The tilt's perspective transform
             would become the containing block for the select popup
             (position: fixed), so it is dropped on the select tab. -->
        <div class="home-in-fade home-d6 min-w-0">
          <div [class.og-tilt]="demoKey() !== 'select'">
            <div class="og-stele">
              <span class="og-glare" aria-hidden="true"></span>
              <!-- the demo chrome IS an oge component: oge-tab-panel -->
              <oge-tab-panel
                class="og-demo-tabs"
                ariaLabel="Live demo"
                stylingMode="secondary"
                size="sm"
                [(selectedKey)]="demoKey"
                (selectionChanged)="onDemoTab($event)"
              >
                <oge-tab text="Data Grid" key="grid">
                  <div class="home-pane og-demo-surface p-3">
                    <oge-grid
                      [data]="heroSource"
                      keyField="id"
                      [highlightChanges]="true"
                    >
                      <oge-column field="product" caption="Product" />
                      <oge-column
                        field="region"
                        caption="Region"
                        [width]="82"
                      />
                      <oge-column
                        field="price"
                        caption="Price"
                        dataType="number"
                        [width]="76"
                      />
                      <oge-column
                        field="change"
                        caption="24h"
                        dataType="number"
                        [width]="84"
                      >
                        <span
                          *ogeCellTemplate="let change"
                          class="home-trend"
                          [class.home-trend-up]="$any(change) > 0"
                          [class.home-trend-down]="$any(change) < 0"
                          >{{
                            $any(change) > 0
                              ? '▲'
                              : $any(change) < 0
                                ? '▼'
                                : '—'
                          }}
                          {{
                            $any(change) === 0
                              ? ''
                              : ($any(change) > 0 ? '+' : '') +
                                $any(change) +
                                '%'
                          }}</span
                        >
                      </oge-column>
                      <oge-column
                        field="qty"
                        caption="Qty"
                        dataType="number"
                        [width]="66"
                      />
                    </oge-grid>
                  </div>
                </oge-tab>
                <oge-tab text="Tree List" key="tree">
                  <div class="home-pane og-demo-surface p-3">
                    <oge-tree-list
                      [data]="org"
                      keyExpr="id"
                      parentIdExpr="parentId"
                      [autoExpandAll]="true"
                    >
                      <oge-column field="name" caption="Name" />
                      <oge-column field="title" caption="Title" [width]="140" />
                    </oge-tree-list>
                  </div>
                </oge-tab>
                <oge-tab text="Select" key="select">
                  <div
                    class="home-pane og-demo-surface flex min-h-[276px] flex-wrap content-center items-start justify-center gap-5 p-6"
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
                </oge-tab>
                <oge-tab text="Buttons" key="buttons">
                  <div
                    class="home-pane og-demo-surface flex min-h-[276px] flex-col items-center justify-center gap-5 p-6"
                  >
                    <div
                      class="flex flex-wrap items-center justify-center gap-3"
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
                    </div>
                    <div
                      class="flex flex-wrap items-center justify-center gap-3"
                    >
                      <oge-button text="Async save" [action]="fakeSave" />
                      <oge-button
                        text="Hold to confirm"
                        severity="danger"
                        [holdToConfirm]="true"
                      />
                    </div>
                    <p class="text-[12px] text-[color:var(--og-faint)]">
                      Click “Async save” — loading is automatic. Hold the red
                      one.
                    </p>
                  </div>
                </oge-tab>
              </oge-tab-panel>
            </div>
          </div>
        </div>
      </div>

      <!-- package marquee -->
      <div class="og-marquee relative overflow-hidden py-3">
        <div class="og-marquee-track">
          @for (half of [0, 1]; track half) {
            <div
              class="flex items-center gap-10 pr-10"
              [attr.aria-hidden]="half === 1 ? true : null"
            >
              @for (pkg of packages; track pkg) {
                <span
                  class="font-mono text-[12px] text-[color:var(--og-faint)]"
                  >{{ pkg }}</span
                >
                <span class="og-marquee-sep" aria-hidden="true"></span>
              }
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═══ Features as a compact numbered grid ═══ -->
    <section class="og-body">
      <div class="mx-auto max-w-6xl px-6 py-14">
        <h2 class="home-reveal og-h2 text-center">
          Modern Angular, <span class="og-gilded">no compromises</span>
        </h2>

        <div
          class="mt-10 grid grid-cols-3 gap-x-8 gap-y-2 max-lg:grid-cols-2 max-md:grid-cols-1"
        >
          <div class="home-reveal og-entry">
            <span class="og-entry-no">01</span>
            <div>
              <h3 class="og-h3">Signal APIs end to end</h3>
              <p class="og-p mt-2 max-w-lg">
                Inputs, outputs and state are signals. Derive totals with
                <code>computed()</code> — no lifecycle hooks, no subscriptions
                to leak.
              </p>
              <p class="og-note mt-4">
                total = computed(() =&gt; …)<span
                  class="home-caret"
                  aria-hidden="true"
                ></span>
              </p>
            </div>
          </div>

          <div class="home-reveal og-entry">
            <span class="og-entry-no">02</span>
            <div>
              <h3 class="og-h3">Virtualized into the millions</h3>
              <p class="og-p mt-2 max-w-lg">
                Row and column virtualization from a framework-free core — the
                DOM only ever holds what you see.
              </p>
              <div class="home-virt mt-5" aria-hidden="true">
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
          </div>

          <div class="home-reveal og-entry">
            <span class="og-entry-no">03</span>
            <div>
              <h3 class="og-h3">Zoneless by default</h3>
              <p class="og-p mt-2 max-w-lg">
                No Zone.js, no global change-detection sweeps. Components mark
                exactly what moved.
              </p>
              <p class="og-note mt-4">
                <span class="line-through">import 'zone.js';</span>
                <span class="text-[color:var(--og-turk)]"> // not needed</span>
              </p>
            </div>
          </div>

          <div class="home-reveal og-entry">
            <span class="og-entry-no">04</span>
            <div>
              <h3 class="og-h3">Design-token theming</h3>
              <p class="og-p mt-2 max-w-lg">
                One set of CSS variables drives every component. Dark, Tailwind
                and Bootstrap bridges ship in the box.
              </p>
              <div class="mt-4 flex items-center gap-2.5">
                @for (swatch of swatches; track swatch.name) {
                  <span
                    class="og-swatch"
                    [style.background]="swatch.color"
                    [title]="swatch.name"
                  ></span>
                }
                <span
                  class="ml-1 font-mono text-[11.5px] text-[color:var(--og-faint)]"
                  >--oge-accent</span
                >
              </div>
            </div>
          </div>

          <div class="home-reveal og-entry">
            <span class="og-entry-no">05</span>
            <div>
              <h3 class="og-h3">Keyboard-first accessibility</h3>
              <p class="og-p mt-2 max-w-lg">
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

          <div class="home-reveal og-entry">
            <span class="og-entry-no">06</span>
            <div>
              <h3 class="og-h3">MIT, and it stays MIT</h3>
              <p class="og-p mt-2 max-w-lg">
                Every core package carries a public "will remain MIT"
                commitment. No license keys, no runtime checks, no telemetry.
              </p>
              <p class="og-note mt-4">
                "license": "MIT"
                <span class="text-[color:var(--og-turk)]">// forever</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ Playground ═══ -->
      <div>
        <div class="mx-auto max-w-6xl px-6 py-14">
          <div
            class="home-reveal flex flex-wrap items-end justify-between gap-4"
          >
            <div>
              <p class="og-eyebrow">Playground</p>
              <h2 class="og-h2 mt-3">
                Flip a switch — <span class="og-gilded">it's live</span>
              </h2>
            </div>
            <a
              routerLink="/components/data-grid/playground"
              class="group flex shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-[color:var(--og-gold)] transition-colors hover:text-[color:var(--og-gold-hi)]"
            >
              Full playground
              <span
                class="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                <app-icon name="arrow-right" [size]="13" />
              </span>
            </a>
          </div>

          <!-- opacity-only reveal: a transform animation would turn this
               into the containing block for the grid's fixed popups -->
          <div class="home-reveal-fade og-slab mt-10 p-5">
            <div class="mb-4 flex flex-wrap items-center gap-2">
              @for (option of pgToggles; track option.key) {
                <button
                  type="button"
                  [attr.aria-pressed]="option.state()"
                  (click)="option.state.set(!option.state())"
                  class="og-toggle"
                  [class.og-toggle-on]="option.state()"
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
        </div>
      </div>

      <!-- ═══ Components: the family index ═══ -->
      <div>
        <div class="mx-auto max-w-5xl px-6 py-14">
          <div class="home-reveal text-center">
            <p class="og-eyebrow">Components</p>
            <!-- derived from the tile list, so the count can never rot -->
            <h2 class="og-h2 mt-3">
              {{ tiles.length }} families,
              <span class="og-gilded">one design system</span>
            </h2>
          </div>

          <!-- the column count keeps the section short no matter how many
               families ship — the page must not grow with the suite -->
          <div
            class="mt-8 grid grid-cols-4 gap-x-6 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1"
          >
            @for (tile of tiles; track tile.path) {
              <a [routerLink]="tile.path" class="home-reveal og-row group">
                <span class="og-row-icon shrink-0" aria-hidden="true">
                  <app-icon [name]="tile.icon" [size]="16" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-baseline gap-3">
                    <span class="og-row-name">{{ tile.name }}</span>
                    <!--
                      The render layers this family ships in, read from the one
                      coverage table (ADR 0002). Marks only — the row is a link,
                      not a spec sheet.
                    -->
                    <span class="og-row-layers ml-auto shrink-0">
                      @for (layer of layersOf(tile.path); track layer) {
                        <app-framework-logo
                          [name]="layer"
                          [size]="13"
                          [brand]="true"
                        />
                      }
                    </span>
                    <span
                      class="shrink-0 text-[color:var(--og-faint)] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[color:var(--og-gold)]"
                    >
                      <app-icon name="arrow-right" [size]="15" />
                    </span>
                  </span>
                  <span class="og-row-desc mt-1.5 block">{{ tile.desc }}</span>
                </span>
              </a>
            }
          </div>
        </div>
      </div>

      <!-- ═══ Live npm downloads ═══ -->
      <div>
        <div class="mx-auto max-w-5xl px-6 py-14">
          <div class="home-reveal text-center">
            <p class="og-eyebrow">On npm</p>
            <h2 class="og-h2 mt-3">
              Open source, <span class="og-gilded">in the wild</span>
            </h2>
          </div>

          <!-- one headline number in a medallion; the per-package rows were
               noise — the breakdown lives on npmjs.com itself -->
          <div
            class="home-reveal og-npm mx-auto mt-10 max-w-2xl"
            aria-live="polite"
          >
            <span class="og-npm-eyelet" aria-hidden="true">
              <app-icon name="package" [size]="15" />
            </span>
            <span class="og-total-value">{{ npmTotal() }}</span>
            <span class="og-total-label">total downloads</span>
            <span class="og-npm-rule" aria-hidden="true"></span>
            <span class="og-npm-sub"
              >across {{ npmCounted() || packages.length }} open-source packages
              · live from npm, since the first release</span
            >

            <!-- endless package strip: two identical halves, translated by
                 -50% for a seamless CSS-only loop; pauses on hover and falls
                 back to a plain scrollable row under reduced motion -->
            <div class="og-npm-marquee">
              <div class="og-npm-track">
                @for (stat of npmStats(); track stat.pkg) {
                  <a
                    [href]="'https://www.npmjs.com/package/' + stat.pkg"
                    target="_blank"
                    rel="noopener"
                    class="og-npm-chip"
                  >
                    <span class="og-npm-pkg">{{ stat.pkg }}</span>
                    <span class="og-npm-count">{{ stat.downloads }}</span>
                  </a>
                }
                @for (stat of npmStats(); track stat.pkg + '-dup') {
                  <span class="og-npm-chip" aria-hidden="true">
                    <span class="og-npm-pkg">{{ stat.pkg }}</span>
                    <span class="og-npm-count">{{ stat.downloads }}</span>
                  </span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ Closing: CTA + the name ═══ -->
      <div>
        <div class="mx-auto max-w-3xl px-6 py-14 text-center">
          <h2 class="home-reveal og-h2">Start building with oge</h2>
          <div
            class="home-reveal mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <a routerLink="/getting-started/setup" class="og-btn-gold">
              Set up your project
              <app-icon name="arrow-right" [size]="14" />
            </a>
            <a
              href="https://github.com/oge-ui/oge-ui"
              target="_blank"
              rel="noopener"
              class="og-btn-stone"
            >
              <app-icon name="github" [size]="15" />
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/@oge-ui/grid"
              target="_blank"
              rel="noopener"
              class="og-btn-stone"
            >
              <app-icon name="package" [size]="15" />
              npm
            </a>
          </div>
        </div>
      </div>

      <!-- ═══ Footer: always on the deep brand slate, whatever the theme ═══ -->
      <footer class="og-footer">
        <div
          class="mx-auto grid max-w-6xl grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 px-6 pb-10 pt-14 max-lg:grid-cols-2 max-sm:grid-cols-1"
        >
          <!-- brand column -->
          <div class="max-lg:col-span-2 max-sm:col-span-1">
            <a routerLink="/" class="flex items-center gap-2.5">
              <img src="favicon-192.png" alt="OGE logo" class="h-8 w-8" />
              <span class="text-[16px] font-bold tracking-tight text-[#e6e9f3]"
                >OGE</span
              >
            </a>
            <p class="mt-4 max-w-xs text-[13px] leading-relaxed text-[#8b93a5]">
              Components built for serious data — a complete Angular suite and a
              growing React one over the same framework-free engine. MIT
              forever.
            </p>
            <p class="mt-5 max-w-xs text-[12px] leading-relaxed text-[#555d6b]">
              <span class="og-gilded font-semibold">oge</span> is the Turkish
              <em>öge</em> — from the Old Turkic root <em>ög</em>, “mind, to
              think”; today it means “element”.
              <!-- inline SVG flag: Windows renders 🇹🇷 as plain "TR" letters -->
              <svg
                viewBox="0 0 30 20"
                width="15"
                height="10"
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
          </div>

          <!-- link columns -->
          <nav aria-label="Documentation links">
            <p class="og-footer-head">Docs</p>
            <ul class="og-footer-list">
              <li><a routerLink="/getting-started">Introduction</a></li>
              <li>
                <a routerLink="/getting-started/setup">Set up your project</a>
              </li>
              <li><a routerLink="/getting-started/styling">Theming</a></li>
              <li>
                <a routerLink="/getting-started/localization">Localization</a>
              </li>
              <li>
                <a routerLink="/components/data-grid/playground">Playground</a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Component links">
            <p class="og-footer-head">Components</p>
            <ul class="og-footer-list">
              <li><a routerLink="/components/data-grid">Data Grid</a></li>
              <li><a routerLink="/components/tree-list">Tree List</a></li>
              <li><a routerLink="/components/pivot-grid">Pivot Grid</a></li>
              <li><a routerLink="/components/buttons">Buttons</a></li>
              <li><a routerLink="/components/inputs">Inputs</a></li>
              <li><a routerLink="/components/overlay">Overlay</a></li>
            </ul>
          </nav>

          <nav aria-label="Resource links">
            <p class="og-footer-head">Resources</p>
            <ul class="og-footer-list">
              <li>
                <a
                  href="https://github.com/oge-ui/oge-ui"
                  target="_blank"
                  rel="noopener"
                  >GitHub</a
                >
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/oge-ui"
                  target="_blank"
                  rel="noopener"
                  >npm</a
                >
              </li>
              <li>
                <a
                  href="https://github.com/oge-ui/oge-ui/blob/main/ROADMAP.md"
                  target="_blank"
                  rel="noopener"
                  >Roadmap</a
                >
              </li>
              <li>
                <a
                  href="https://github.com/oge-ui/oge-ui/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener"
                  >MIT License</a
                >
              </li>
              <li>
                <a
                  href="https://github.com/oge-ui/oge-ui/issues"
                  target="_blank"
                  rel="noopener"
                  >Report an issue</a
                >
              </li>
              <li>
                <a
                  href="https://github.com/sponsors/kaya2m"
                  target="_blank"
                  rel="noopener"
                  >Sponsor</a
                >
              </li>
            </ul>
          </nav>
        </div>

        <!-- bottom bar -->
        <div class="border-t border-white/[0.08]">
          <div
            class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4"
          >
            <span class="text-[12px] text-[#555d6b]"
              >© 2026 OGE UI · MIT License</span
            >
            <span class="font-mono text-[11px] text-[#555d6b] max-sm:hidden"
              >v{{ version }}</span
            >
            <span class="ml-auto font-mono text-[11px] text-[#555d6b]"
              >signals all the way down</span
            >
          </div>
        </div>
      </footer>
    </section>
  `,
  styles: `
    /* ═══ framework coverage strip under the hero headline ═══ */
    app-home .og-fw-strip {
      margin-block-start: 1.25rem;
    }
    /* the hero sits on the brand palette, not the docs tokens */
    app-home .og-fw-strip .app-fw-group {
      border-color: var(--og-line);
      background: var(--og-stone-2);
    }
    app-home .og-fw-strip .app-fw-group button {
      color: var(--og-mut);
    }
    app-home .og-fw-strip .app-fw-group button.is-active {
      color: var(--og-bone);
      background: var(--og-stone);
      box-shadow:
        0 1px 2px rgb(15 23 42 / 10%),
        0 0 0 1px var(--og-line);
    }

    /* ═══ brand palette, matched to the logo: white by day, deep slate by
       night, indigo primary with the logo's cyan→violet→magenta ramp ═══ */
    app-home {
      --og-stone: #ffffff;
      --og-stone-2: #f8fafc;
      --og-line: rgba(15, 23, 42, 0.1);
      --og-bone: #0f172a;
      --og-mut: #64748b;
      --og-faint: #94a3b8;
      --og-gold: #6366f1;
      --og-gold-hi: #818cf8;
      --og-gold-deep: #4f46e5;
      --og-turk: #0891b2;
      --og-magenta: #c026d3;
      display: block;
      background: var(--og-stone);
      color: var(--og-bone);
    }

    .dark app-home {
      --og-stone: #0b0d14;
      --og-stone-2: #0f121b;
      --og-line: rgba(255, 255, 255, 0.08);
      --og-bone: #e6e9f3;
      --og-mut: #8b93a5;
      --og-faint: #555d6b;
      --og-gold: #818cf8;
      --og-gold-hi: #a5b4fc;
      --og-gold-deep: #6366f1;
      --og-turk: #22d3ee;
      --og-magenta: #e879f9;
    }

    app-home .og-entry-no {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    /* ═══ hero ═══ */
    app-home .og-hero {
      background: var(--og-stone);
    }

    /* display type: bold modern sans, tight tracking */
    app-home .og-display {
      font-size: 56px;
      font-weight: 700;
      line-height: 1.07;
      letter-spacing: -0.03em;
      color: var(--og-bone);
      text-wrap: balance;
    }

    @media (max-width: 48rem) {
      app-home .og-display {
        font-size: 38px;
      }
    }

    /* accent words: the logo's cyan→violet→magenta ramp */
    app-home .og-gilded {
      background-image: linear-gradient(
        90deg,
        var(--og-turk),
        var(--og-gold),
        var(--og-magenta)
      );
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

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

    /* ═══ buttons: indigo primary + quiet secondary ═══ */
    app-home .og-btn-gold {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: none;
      border-radius: 9px;
      background: linear-gradient(
        95deg,
        var(--og-gold-deep),
        var(--og-gold) 60%,
        var(--og-magenta) 150%
      );
      padding: 10px 18px;
      font-size: 13.5px;
      font-weight: 600;
      color: #fff;
      box-shadow: 0 10px 28px -12px
        color-mix(in srgb, var(--og-gold) 65%, transparent);
      transition:
        transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
        box-shadow 0.2s ease,
        filter 0.2s ease;
    }

    app-home .og-btn-gold:hover {
      transform: translateY(-1px);
      filter: brightness(1.07);
      box-shadow: 0 14px 34px -12px
        color-mix(in srgb, var(--og-gold) 75%, transparent);
    }

    app-home .og-btn-stone {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid color-mix(in srgb, var(--og-bone) 18%, transparent);
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 13.5px;
      font-weight: 600;
      color: color-mix(in srgb, var(--og-bone) 82%, var(--og-mut));
      transition:
        border-color 0.2s ease,
        background-color 0.2s ease,
        color 0.2s ease;
    }

    app-home .og-btn-stone:hover {
      border-color: color-mix(in srgb, var(--og-gold) 55%, transparent);
      background: color-mix(in srgb, var(--og-gold) 7%, transparent);
      color: var(--og-gold-hi);
    }

    /* ═══ install strip ═══ */
    app-home .og-install {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--og-line);
      border-radius: 8px;
      background: color-mix(in srgb, var(--og-stone-2) 70%, transparent);
      padding: 7px 8px 7px 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
      color: color-mix(in srgb, var(--og-bone) 85%, var(--og-mut));
    }

    app-home .og-install-select {
      appearance: none;
      background: transparent;
      border: none;
      outline: none;
      border-radius: 3px;
      padding: 2px 22px 2px 6px;
      font-family: inherit;
      font-size: 13px;
      color: var(--og-gold-hi);
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    app-home .og-install-select:hover,
    app-home .og-install-select:focus-visible {
      background: color-mix(in srgb, var(--og-gold) 10%, transparent);
    }

    app-home .og-install-select > option {
      background: var(--og-stone-2);
      color: var(--og-bone);
    }

    app-home .og-install-copy {
      display: flex;
      height: 28px;
      width: 28px;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
      color: var(--og-faint);
      transition:
        color 0.15s ease,
        background-color 0.15s ease;
    }

    app-home .og-install-copy:hover {
      color: var(--og-bone);
      background: color-mix(in srgb, var(--og-bone) 7%, transparent);
    }

    /* ═══ the live window: brand frame with corner ticks ═══ */
    @media (min-width: 64rem) and (hover: hover) {
      app-home .og-tilt {
        transform: perspective(1600px) rotateY(-7deg) rotateX(3deg);
        will-change: transform;
      }
    }

    app-home .og-stele {
      position: relative;
      overflow: hidden;
      border: 1px solid var(--og-line);
      border-radius: 16px;
      background: var(--og-stone);
      box-shadow:
        0 1px 2px rgba(15, 23, 42, 0.05),
        0 32px 72px -32px color-mix(in srgb, var(--og-gold) 38%, transparent),
        0 12px 28px -18px rgba(15, 23, 42, 0.18);
    }

    .dark app-home .og-stele {
      background: var(--og-stone-2);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.06),
        0 32px 72px -28px color-mix(in srgb, var(--og-gold) 35%, transparent),
        0 16px 36px -20px rgba(0, 0, 0, 0.7);
    }

    /* each demo sits on its own soft inset surface */
    app-home .og-demo-surface {
      border: 1px solid var(--og-line);
      border-radius: 10px;
      background: #fff;
      overflow: hidden;
    }

    .dark app-home .og-demo-surface {
      background: rgb(3 7 18);
    }

    app-home .og-glare {
      position: absolute;
      inset: 0;
      z-index: 5;
      pointer-events: none;
      background: radial-gradient(
        440px circle at var(--gx, 55%) var(--gy, 0%),
        color-mix(in srgb, var(--og-gold-hi) 9%, transparent),
        transparent 60%
      );
    }

    .dark app-home .og-glare {
      mix-blend-mode: screen;
    }

    /* the demo chrome is our own oge-tab-panel in its soft-pill mode,
       dressed as a segmented control for the hero card */
    app-home .og-demo-tabs {
      display: block;
      --oge-radius: 8px;
    }

    app-home .og-demo-tabs .oge-tab-strip {
      border-bottom: 1px solid var(--og-line) !important;
      background: color-mix(in srgb, var(--og-bone) 2%, transparent);
      padding: 8px 10px;
    }

    app-home .og-demo-tabs .oge-tab {
      margin: 0 3px 0 0;
      font-weight: 500;
    }

    app-home .og-demo-tabs .oge-tab-panel-body {
      padding: 12px;
    }

    /* the demo grid never needs to scroll — size to content */
    app-home .og-demo-surface .oge-viewport {
      overflow: hidden;
    }

    /* tab pane crossfade (opacity only — popups position:fixed inside) */
    app-home .home-pane {
      animation: home-fade 0.3s ease both;
    }

    /* ═══ body sections ═══ */
    app-home .og-body {
      background: var(--og-stone);
      color: var(--og-bone);
    }

    app-home .og-eyebrow {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--og-turk);
    }

    app-home .og-h2 {
      font-size: 34px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--og-bone);
    }

    app-home .og-h3 {
      font-size: 16px;
      font-weight: 600;
      color: var(--og-bone);
    }

    app-home .og-p {
      font-size: 13.5px;
      line-height: 1.7;
      color: var(--og-mut);
    }

    app-home .og-note {
      border: 1px solid var(--og-line);
      border-radius: 8px;
      background: color-mix(in srgb, var(--og-bone) 2%, transparent);
      padding: 8px 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      color: var(--og-faint);
      width: fit-content;
    }

    /* inscription entries: gold numeral + gold left rule */
    app-home .og-entry {
      display: grid;
      grid-template-columns: 52px 1fr;
      gap: 16px;
      border-left: 1px solid color-mix(in srgb, var(--og-gold) 25%, transparent);
      padding: 20px 0 20px 28px;
      transition:
        border-color 0.25s ease,
        background-color 0.25s ease;
    }

    app-home .og-entry:hover {
      border-left-color: color-mix(in srgb, var(--og-gold) 70%, transparent);
      background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--og-gold) 5%, transparent),
        transparent 55%
      );
    }

    @media (max-width: 48rem) {
      app-home .og-entry {
        grid-template-columns: 1fr;
        gap: 10px;
        padding-left: 20px;
      }
    }

    app-home .og-entry-no {
      font-size: 42px;
      line-height: 1;
      color: color-mix(in srgb, var(--og-gold) 60%, transparent);
    }

    /* ═══ playground slab + toggles ═══ */
    app-home .og-slab {
      border: 1px solid var(--og-line);
      border-radius: 12px;
      background: var(--og-stone-2);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.4),
        0 24px 60px -36px rgba(60, 50, 30, 0.35);
    }

    .dark app-home .og-slab {
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.05),
        0 24px 60px -32px rgba(0, 0, 0, 0.8);
    }

    app-home .og-toggle {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid var(--og-line);
      border-radius: 8px;
      background: transparent;
      padding: 6px 12px;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--og-mut);
      cursor: pointer;
      transition:
        color 0.18s ease,
        border-color 0.18s ease,
        background-color 0.18s ease,
        box-shadow 0.18s ease;
    }

    app-home .og-toggle:hover {
      border-color: color-mix(in srgb, var(--og-gold) 50%, transparent);
      color: var(--og-gold-hi);
    }

    app-home .og-toggle-on {
      background: color-mix(in srgb, var(--og-gold) 15%, transparent);
      border-color: color-mix(in srgb, var(--og-gold) 60%, transparent);
      color: color-mix(in srgb, var(--og-gold-deep) 80%, var(--og-bone));
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }

    .dark app-home .og-toggle-on {
      color: var(--og-gold-hi);
    }

    /* ═══ component rows ═══ */
    app-home .og-row {
      display: flex;
      gap: 11px;
      border-radius: 10px;
      padding: 12px 11px;
      transition: background-color 0.2s ease;
    }

    app-home .og-row:hover {
      background: color-mix(in srgb, var(--og-gold) 4%, transparent);
    }

    app-home .og-row-icon {
      display: flex;
      height: 28px;
      width: 28px;
      align-items: center;
      justify-content: center;
      border: 1px solid color-mix(in srgb, var(--og-gold) 35%, transparent);
      border-radius: 8px;
      color: var(--og-gold);
      background: color-mix(in srgb, var(--og-gold) 8%, transparent);
    }

    app-home .og-row-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--og-bone);
    }

    /* clamped to two lines so every row is exactly the same height and the
       grid stays a tidy 3 × 3 */
    app-home .og-row-desc {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      font-size: 12px;
      line-height: 1.55;
      color: var(--og-mut);
    }

    /* ═══ footer: fixed deep brand slate in both themes ═══ */
    app-home .og-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: #0b0d14;
    }

    app-home .og-footer-head {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #e6e9f3;
    }

    app-home .og-footer-list {
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 9px;
      list-style: none;
      padding: 0;
    }

    app-home .og-footer-list a {
      font-size: 13px;
      color: #8b93a5;
      transition: color 0.15s ease;
    }

    app-home .og-footer-list a:hover {
      color: #a5b4fc;
    }

    /* the gilded word keeps the bright dark-mode ramp on the slate */
    app-home .og-footer .og-gilded {
      background-image: linear-gradient(90deg, #22d3ee, #818cf8, #e879f9);
    }

    /* ═══ package marquee ═══ */
    app-home .og-marquee {
      mask-image: linear-gradient(
        90deg,
        transparent,
        black 10%,
        black 90%,
        transparent
      );
    }

    app-home .og-marquee-track {
      display: flex;
      width: max-content;
      animation: og-marquee 36s linear infinite;
    }

    /* a leaning hairline instead of a dot — reads as the separator in a
       package path and carries the brand gradient across the ticker */
    app-home .og-marquee-sep {
      height: 0.9rem;
      width: 1px;
      flex: none;
      transform: rotate(18deg);
      background: linear-gradient(
        180deg,
        transparent,
        var(--og-gold),
        var(--og-turk),
        transparent
      );
    }

    @keyframes og-marquee {
      to {
        transform: translateX(-50%);
      }
    }

    /* ═══ npm downloads band: a medallion total over an endless chip strip ═══ */
    app-home .og-npm {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      overflow: hidden;
      padding: 40px 0 28px;
      text-align: center;
      border: 1px solid var(--og-line);
      border-radius: 20px;
      background: var(--og-stone-2);
    }

    /* a quiet radial halo behind the number */
    app-home .og-npm::before {
      content: '';
      position: absolute;
      inset: -55% 15% auto;
      height: 120%;
      background: radial-gradient(
        closest-side,
        color-mix(in srgb, var(--og-gold) 12%, transparent),
        transparent 72%
      );
      pointer-events: none;
    }

    app-home .og-npm-eyelet {
      position: relative;
      display: flex;
      height: 34px;
      width: 34px;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
      border: 1px solid color-mix(in srgb, var(--og-gold) 35%, transparent);
      border-radius: 999px;
      color: var(--og-gold);
      background: color-mix(in srgb, var(--og-gold) 9%, transparent);
    }

    app-home .og-npm-rule {
      display: block;
      height: 1px;
      width: 72px;
      margin-block: 10px 8px;
      background: linear-gradient(
        90deg,
        transparent,
        var(--og-gold),
        transparent
      );
      opacity: 0.55;
    }

    app-home .og-total-value {
      position: relative;
      font-size: 54px;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
      background-image: linear-gradient(
        90deg,
        var(--og-turk),
        var(--og-gold),
        var(--og-magenta)
      );
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    app-home .og-total-label {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--og-bone);
    }

    app-home .og-npm-sub {
      position: relative;
      font-size: 11.5px;
      color: var(--og-faint);
    }

    /* the endless strip: edges dissolve, motion pauses under the pointer */
    app-home .og-npm-marquee {
      position: relative;
      width: 100%;
      margin-top: 24px;
      overflow: hidden;
      mask-image: linear-gradient(
        90deg,
        transparent,
        #000 14%,
        #000 86%,
        transparent
      );
      -webkit-mask-image: linear-gradient(
        90deg,
        transparent,
        #000 14%,
        #000 86%,
        transparent
      );
    }

    app-home .og-npm-track {
      display: flex;
      width: max-content;
      animation: og-npm-scroll 36s linear infinite;
    }

    app-home .og-npm-marquee:hover .og-npm-track,
    app-home .og-npm-marquee:focus-within .og-npm-track {
      animation-play-state: paused;
    }

    @keyframes og-npm-scroll {
      to {
        transform: translateX(-50%);
      }
    }

    app-home .og-npm-chip {
      display: inline-flex;
      flex: none;
      align-items: baseline;
      gap: 8px;
      margin-inline-end: 10px;
      padding: 7px 14px;
      border: 1px solid var(--og-line);
      border-radius: 999px;
      background: color-mix(in srgb, var(--og-gold) 4%, transparent);
      transition:
        border-color 0.15s ease,
        background-color 0.15s ease;
    }

    app-home a.og-npm-chip:hover {
      border-color: color-mix(in srgb, var(--og-gold) 45%, transparent);
      background: color-mix(in srgb, var(--og-gold) 9%, transparent);
    }

    app-home .og-npm-pkg {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      color: var(--og-mut);
    }

    app-home a.og-npm-chip:hover .og-npm-pkg {
      color: var(--og-bone);
    }

    app-home .og-npm-count {
      font-size: 13px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--og-bone);
    }

    @media (prefers-reduced-motion: reduce) {
      app-home .og-npm-track {
        animation: none;
        width: auto;
      }

      app-home .og-npm-marquee {
        overflow-x: auto;
        mask-image: none;
        -webkit-mask-image: none;
      }
    }

    /* ═══ trend cell, code, virt stream, kbd, swatches ═══ */
    app-home .home-trend {
      font-size: 11.5px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--oge-muted-color);
      transition: color 200ms ease;
      white-space: nowrap;
    }

    app-home .home-trend-up {
      color: #10b981;
    }

    app-home .home-trend-down {
      color: #f43f5e;
    }

    /* the code block stays an editor-dark surface in both moods */
    app-home .home-code {
      overflow-x: auto;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      background: #0a0d14;
      padding: 14px 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12.5px;
      line-height: 1.65;
      color: #c3c9d4;
      max-width: 560px;
    }

    app-home .home-code .hc-c {
      color: #565c69;
    }
    app-home .home-code .hc-k {
      color: #e8bd6d;
    }
    app-home .home-code .hc-f {
      color: #2dd4bf;
    }
    app-home .home-code .hc-n {
      color: #f0d29a;
    }

    app-home .home-caret {
      display: inline-block;
      width: 7px;
      height: 13px;
      margin-left: 2px;
      vertical-align: -2px;
      background: #d4a24a;
      animation: home-blink 1.1s steps(1) infinite;
    }

    @keyframes home-blink {
      50% {
        opacity: 0;
      }
    }

    app-home .home-virt {
      height: 5.5rem;
      max-width: 420px;
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
      height: 7px;
      border-radius: 2px;
      background: color-mix(in srgb, var(--og-bone) 11%, transparent);
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
      background: linear-gradient(90deg, var(--og-turk), var(--og-gold));
      opacity: 0.6;
    }

    @keyframes home-virt-scroll {
      to {
        transform: translateY(-50%);
      }
    }

    app-home .og-swatch {
      display: inline-block;
      height: 22px;
      width: 22px;
      border-radius: 8px;
      box-shadow: inset 0 0 0 1px
        color-mix(in srgb, var(--og-bone) 18%, transparent);
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    app-home .og-swatch:hover {
      transform: translateY(-3px) scale(1.1);
    }

    app-home .home-kbd {
      border: 1px solid var(--og-line);
      border-radius: 8px;
      background: color-mix(in srgb, var(--og-bone) 4%, transparent);
      padding: 3px 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 11.5px;
      color: var(--og-mut);
      animation: home-keypress 3.2s ease-in-out infinite;
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
        border-color: color-mix(in srgb, var(--og-gold) 70%, transparent);
        color: var(--og-gold-hi);
      }
    }

    /* ═══ entrances ═══ */
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

    @keyframes home-fade {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    app-home .home-in {
      animation: home-fade-up 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    app-home .home-in-fade {
      animation: home-fade 0.65s ease both;
    }

    app-home .home-d1 {
      animation-delay: 0.06s;
    }
    app-home .home-d3 {
      animation-delay: 0.14s;
    }
    app-home .home-d4 {
      animation-delay: 0.2s;
    }
    app-home .home-d6 {
      animation-delay: 0.22s;
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

    /* ═══ reduced motion: settle instantly ═══ */
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
  private readonly fwService = inject(FrameworkService);

  /** Render layers a family ships in, derived from its docs route. */
  protected readonly layersOf = (path: string): FrameworkLogoName[] => {
    const family = path.split('/components/')[1]?.split('/')[0] ?? '';
    return this.fwService.frameworks
      .filter((entry) => this.fwService.supports(family, entry.id))
      .map((entry) => entry.id as FrameworkLogoName);
  };

  /** Single source: `shared/site-version.ts`, bumped with `nx release`. */
  protected readonly version = SITE_VERSION;

  protected readonly rotatorWords = [
    'data grids',
    'tree lists',
    'pivot tables',
    'dashboards',
    'forms',
    'data grids', // duplicate of the first word for a seamless loop
  ];

  /** Every published package, looping in the hero marquee. */
  protected readonly packages = [
    'oge-ui',
    '@oge-ui/core',
    '@oge-ui/behavior',
    '@oge-ui/react-buttons',
    '@oge-ui/grid',
    '@oge-ui/tree-list',
    '@oge-ui/pivot',
    '@oge-ui/bpmn',
    '@oge-ui/scheduler',
    '@oge-ui/gantt',
    '@oge-ui/upload',
    '@oge-ui/kanban',
    '@oge-ui/charts',
    '@oge-ui/buttons',
    '@oge-ui/inputs',
    '@oge-ui/overlay',
    '@oge-ui/tabs',
    '@oge-ui/layout',
    '@oge-ui/navigation',
    '@oge-ui/forms',
  ];

  /**
   * All-time npm downloads per package; '—' until the fetch lands. Derived
   * from `packages`, so registering a new package there is the only step —
   * the chip strip and the total both follow.
   */
  protected readonly npmStats = signal(
    this.packages.map((pkg) => ({ pkg, downloads: '—' })),
  );

  /** All-time downloads summed across every package that reported; '—' until fetched. */
  protected readonly npmTotal = signal('—');

  /** How many packages actually contributed to the total (0 until fetched). */
  protected readonly npmCounted = signal(0);

  /** Selected demo tab key — two-way with the oge-tab-panel chrome. */
  protected readonly demoKey = signal<string | undefined>('grid');

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

  protected readonly virtRows = [0, 1, 2, 3, 4, 5, 6, 7];

  protected readonly kbdKeys = ['↑', '↓', 'PgUp', 'Enter', 'Esc'];

  protected readonly swatches = [
    { name: 'Default', color: '#6366f1' },
    { name: 'Dark', color: '#0f172a' },
    { name: 'Tailwind', color: '#0ea5e9' },
    { name: 'Bootstrap', color: '#7c3aed' },
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
      icon: 'workflow',
      name: 'BPMN Editor',
      desc: 'BPMN 2.0 modeler with its own XML engine, undo/redo and no watermark.',
      path: '/components/bpmn',
    },
    {
      icon: 'activity',
      name: 'Charts',
      desc: 'Line, bar, area, pie and more on a dependency-free SVG kernel.',
      path: '/components/charts',
    },
    {
      icon: 'list',
      name: 'Gantt',
      desc: 'Task tree + timeline with dependencies, critical path and drag editing.',
      path: '/components/gantt',
    },
    {
      icon: 'upload',
      name: 'Upload',
      desc: 'Drag & drop, restrictions with reasons, previews, chunked resumable transfer.',
      path: '/components/upload',
    },
    {
      icon: 'columns',
      name: 'Kanban',
      desc: 'Columns, swimlanes and WIP limits with drag & drop and keyboard moving.',
      path: '/components/kanban',
    },
    {
      icon: 'calendar',
      name: 'Scheduler',
      desc: 'Day, week and month views with drag & resize, popup and form editing.',
      path: '/components/scheduler',
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
      desc: 'Text, number, select, tag, date and toggle editors on one field chrome.',
      path: '/components/inputs',
    },
    {
      icon: 'layers',
      name: 'Overlay',
      desc: 'Modals, toasts, anchored panels, menus, tooltips and context menus.',
      path: '/components/overlay',
    },
    {
      icon: 'tabs',
      name: 'Tabs',
      desc: 'Lazy panels, closable tabs with async guards, overflow nav and drag reorder.',
      path: '/components/tabs',
    },
    {
      icon: 'text-cursor',
      name: 'Forms',
      desc: 'Responsive form layout, fieldset groups, validation summary.',
      path: '/components/forms',
    },
    {
      icon: 'accordion',
      name: 'Accordion',
      desc: 'Single or multiple expansion, lazy content, async expand guards.',
      path: '/components/accordion',
    },
    {
      icon: 'card',
      name: 'Card',
      desc: 'Content surface with media, actions and footer as attribute slots.',
      path: '/components/card',
    },
    {
      icon: 'splitter',
      name: 'Splitter',
      desc: 'Resizable, collapsible, nestable panes with full keyboard control.',
      path: '/components/splitter',
    },
    {
      icon: 'toolbar',
      name: 'Toolbar',
      desc: 'APG command bar with roving tabindex and a real overflow menu.',
      path: '/components/toolbar',
    },
    {
      icon: 'tree',
      name: 'Tree View',
      desc: 'Tri-state checkboxes, search, load-on-demand and drag & drop reparenting.',
      path: '/components/tree-view',
    },
    {
      icon: 'drawer',
      name: 'Drawer',
      desc: 'Overlay, push or side panel — the modality follows the mode.',
      path: '/components/drawer',
    },
    {
      icon: 'loader',
      name: 'Progress & Loading',
      desc: 'Bar, ring and skeleton as one trio — role="progressbar" with the aria rules done right.',
      path: '/components/progress',
    },
    {
      icon: 'breadcrumb',
      name: 'Breadcrumb',
      desc: 'The APG trail with container-width collapse; hidden crumbs stay reachable as links.',
      path: '/components/breadcrumb',
    },
    {
      icon: 'menubar',
      name: 'Menubar',
      desc: 'APG menubar with nested submenus and a container-width hamburger collapse.',
      path: '/components/menubar',
    },
    {
      icon: 'stepper',
      name: 'Stepper',
      desc: 'Linear or free wizard with async leave guards and refusals that say why.',
      path: '/components/stepper',
    },
  ];

  protected readonly org = ORG;

  /** Push-driven source so `highlightChanges` flashes exactly the patched cells. */
  protected readonly heroSource = new ArrayDataSource<TickerRow>(
    BASE_ROWS.map((row) => ({ ...row })),
    { key: 'id' },
  );
  private readonly heroRows = BASE_ROWS.map((row) => ({ ...row }));

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

  protected readonly fakeSave = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, 1200));

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private tiltTarget = { rx: 3, ry: -7 };
  private tiltCurrent = { rx: 3, ry: -7 };
  private tiltEl: HTMLElement | null = null;

  /**
   * Tab switch clears the tilt transform SYNCHRONOUSLY when entering the
   * select tab — a popup opened before the next rAF frame would otherwise
   * measure its anchor under the residual transform and land offset.
   */
  protected onDemoTab(event: OgeTabSelectionChangedEvent): void {
    if (event.key === 'select' && this.tiltEl) {
      this.tiltEl.style.transform = '';
    }
  }

  constructor() {
    const id = setInterval(() => this.tick(), 1500);
    this.destroyRef.onDestroy(() => clearInterval(id));
    afterNextRender(() => {
      this.setupPointerFx();
      this.loadNpmStats();
    });
  }

  /** First month an `@oge-ui` package hit npm — the base of every total. */
  private static readonly NPM_SINCE = '2026-01-01';

  /**
   * npm caps a `point/{from}:{to}` range at 18 months, so the span from the
   * first release to today is split into 12-month windows and summed — the
   * total stays correct as the project ages, with no date to maintain.
   */
  private static downloadWindows(): string[] {
    const iso = (date: Date): string => date.toISOString().slice(0, 10);
    const today = new Date();
    const windows: string[] = [];
    let from = new Date(`${HomePage.NPM_SINCE}T00:00:00Z`);
    while (from <= today) {
      const to = new Date(from);
      to.setUTCFullYear(to.getUTCFullYear() + 1);
      to.setUTCDate(to.getUTCDate() - 1);
      const end = to < today ? to : today;
      windows.push(`${iso(from)}:${iso(end)}`);
      from = new Date(end);
      from.setUTCDate(from.getUTCDate() + 1);
    }
    return windows;
  }

  /**
   * Fetches all-time download counts from api.npmjs.org (CORS-open): npm
   * refreshes its counters daily, so every page load shows the latest figure.
   * Failures leave the '—' placeholder — the section degrades gracefully
   * offline or under rate limiting.
   */
  private loadNpmStats(): void {
    const format = (n: number): string =>
      n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(1)}M`
        : n >= 1_000
          ? `${(n / 1_000).toFixed(1)}k`
          : String(n);
    const windows = HomePage.downloadWindows();
    void Promise.all(
      this.packages.map(async (pkg) => {
        try {
          const perWindow = await Promise.all(
            windows.map(async (range) => {
              const res = await fetch(
                `https://api.npmjs.org/downloads/point/${range}/${pkg}`,
              );
              if (!res.ok) return null;
              const body = (await res.json()) as { downloads?: number };
              return typeof body.downloads === 'number' ? body.downloads : null;
            }),
          );
          // A missing window would silently understate the total — bail out.
          if (perWindow.some((value) => value === null)) {
            return { pkg, count: null };
          }
          return {
            pkg,
            count: perWindow.reduce<number>(
              (sum, value) => sum + (value ?? 0),
              0,
            ),
          };
        } catch {
          return { pkg, count: null };
        }
      }),
    ).then((results) => {
      const counts = new Map(results.map((r) => [r.pkg, r.count]));
      this.npmStats.set(
        this.packages.map((pkg) => {
          const count = counts.get(pkg);
          return { pkg, downloads: count == null ? '—' : format(count) };
        }),
      );
      const known = results.filter(
        (r): r is { pkg: string; count: number } => r.count !== null,
      );
      if (known.length > 0) {
        this.npmTotal.set(format(known.reduce((sum, r) => sum + r.count, 0)));
        this.npmCounted.set(known.length);
      }
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

  /**
   * Streams push-updates into the hero grid: two random rows tick with a
   * visible price move, a signed trend cell and a `highlightChanges` flash on
   * exactly the patched cells.
   */
  private tick(): void {
    const picked = new Set<number>();
    while (picked.size < 2) {
      picked.add(Math.floor(Math.random() * this.heroRows.length));
    }
    this.heroSource.push(
      [...picked].map((index) => {
        const row = this.heroRows[index];
        const movePct = (Math.random() - 0.45) * 6; // −2.7% … +3.3%
        row.change = Math.round(movePct * 10) / 10;
        row.price = Math.max(1, Math.round(row.price * (1 + movePct / 100)));
        row.qty = Math.max(0, row.qty + Math.round((Math.random() - 0.5) * 40));
        return {
          type: 'update' as const,
          key: row.id,
          patch: { price: row.price, qty: row.qty, change: row.change },
        };
      }),
    );
  }

  /**
   * The window tilt and glare sheen, outside Angular change detection:
   * native mousemove listeners feed the targets, one rAF loop eases toward
   * them. Stops on destroy and never starts under prefers-reduced-motion.
   */
  private setupPointerFx(): void {
    const host = this.hostRef.nativeElement;
    const hero = host.querySelector<HTMLElement>('.og-hero');
    const tilt = host.querySelector<HTMLElement>('.og-tilt');
    const glare = host.querySelector<HTMLElement>('.og-glare');
    this.tiltEl = tilt;
    if (!hero || !tilt) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const canTilt = window.matchMedia(
      '(min-width: 64rem) and (hover: hover)',
    ).matches;
    if (reduced || !canTilt) return;

    const onMove = (event: MouseEvent): void => {
      // sheen follows the pointer across the window
      if (glare?.parentElement) {
        const frame = glare.parentElement.getBoundingClientRect();
        glare.style.setProperty(
          '--gx',
          `${(((event.clientX - frame.left) / frame.width) * 100).toFixed(1)}%`,
        );
        glare.style.setProperty(
          '--gy',
          `${(((event.clientY - frame.top) / frame.height) * 100).toFixed(1)}%`,
        );
      }
      // tilt reacts only inside the hero
      const rect = hero.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
        const nx = x / rect.width - 0.5;
        const ny = y / rect.height - 0.5;
        this.tiltTarget = { rx: 3 - ny * 7, ry: -7 + nx * 9 };
      } else {
        this.tiltTarget = { rx: 3, ry: -7 };
      }
    };
    const onLeave = (): void => {
      this.tiltTarget = { rx: 3, ry: -7 };
    };
    host.addEventListener('mousemove', onMove, { passive: true });
    host.addEventListener('mouseleave', onLeave, { passive: true });
    this.destroyRef.onDestroy(() => {
      host.removeEventListener('mousemove', onMove);
      host.removeEventListener('mouseleave', onLeave);
    });

    let raf = 0;
    const frame = (): void => {
      if (this.demoKey() === 'select') {
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
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    this.destroyRef.onDestroy(() => cancelAnimationFrame(raf));
  }
}
