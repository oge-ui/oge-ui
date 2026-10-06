import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
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
  OgeAvatarGroup,
  OgeBadge,
  OgeChipList,
  OgeAlert,
  OgeTimeline,
  OgeAppBar,
  OgeAppBarEnd,
  OgeListView,
  OgeDataView,
  OgeDataViewItemTemplate,
  OgeTileLayout,
  OgeCarousel,
  OgeSplitter,
  OgeSplitterPane,
  OgeToolbar,
  OgeToolbarItem,
  type OgeTileLayoutItemData,
  type OgeCarouselItem,
  type OgeAvatarItem,
  type OgeChipItem,
  type OgeTimelineItem,
} from '@oge-ui/layout';
import {
  OgeBreadcrumb,
  OgeDrawer,
  OgeMenubar,
  OgePagination,
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
import {
  FrameworkLogo,
  type FrameworkLogoName,
} from '../../shared/framework-logo';
import { FrameworkService } from '../../shared/framework.service';
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
  | 'avatar'
  | 'chip'
  | 'alert'
  | 'timeline'
  | 'app-bar'
  | 'list-view'
  | 'data-view'
  | 'tile-layout'
  | 'carousel'
  | 'progress'
  | 'splitter'
  | 'toolbar'
  | 'tree-view'
  | 'drawer'
  | 'menubar'
  | 'breadcrumb'
  | 'pagination'
  | 'stepper'
  | 'pivot'
  | 'bpmn'
  | 'scheduler'
  | 'gantt'
  | 'upload'
  | 'editor'
  | 'kanban'
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
    FrameworkLogo,
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
    OgeAvatarGroup,
    OgeBadge,
    OgeChipList,
    OgeAlert,
    OgeTimeline,
    OgeAppBar,
    OgeAppBarEnd,
    OgeListView,
    OgeDataView,
    OgeDataViewItemTemplate,
    OgeTileLayout,
    OgeCarousel,
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
    OgePagination,
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

    <!-- Recently added pages. Deliberately not a <section>: the gallery e2e
         finds family cards as the first section whose text contains the
         family name, and these links name families. -->
    <nav aria-labelledby="recently-added" class="mt-8">
      <h2
        id="recently-added"
        class="!m-0 text-[13px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
      >
        Recently added
      </h2>
      <ul class="!m-0 mt-3 flex list-none flex-wrap gap-2 !p-0">
        @for (item of recentlyAdded; track item.path) {
          <li class="!m-0">
            <a
              [routerLink]="item.path"
              class="inline-flex items-baseline gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-[13px] text-gray-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-gray-800 dark:text-gray-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
            >
              <span class="text-[11px] text-gray-400 dark:text-gray-500">{{
                item.family
              }}</span>
              {{ item.label }}
            </a>
          </li>
        }
      </ul>
    </nav>

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
                @case ('editor') {
                  <!-- illustrative sketch; the live editor renders on its own pages -->
                  <svg
                    aria-hidden="true"
                    data-preview="editor"
                    viewBox="0 0 280 120"
                    class="w-full max-w-[280px] text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                  >
                    <rect x="10" y="8" width="260" height="104" rx="10" />
                    <path d="M10 34h260" />
                    <path
                      d="M24 16v10h5a2.5 2.5 0 0 0 0-5h-5m5 0a2.5 2.5 0 0 0 0-5h-5"
                    />
                    <path d="M44 16h6m-4 10h-4m4-10-3 10" />
                    <path d="M60 16v6a3 3 0 0 0 6 0v-6M58 28h10" />
                    <path d="M84 14v16M100 18h12M100 22h8M100 26h12" />
                    <rect
                      x="24"
                      y="46"
                      width="120"
                      height="9"
                      rx="4"
                      fill="currentColor"
                      opacity="0.45"
                      stroke="none"
                    />
                    <rect
                      x="24"
                      y="64"
                      width="220"
                      height="7"
                      rx="3.5"
                      fill="currentColor"
                      opacity="0.25"
                      stroke="none"
                    />
                    <rect
                      x="24"
                      y="78"
                      width="190"
                      height="7"
                      rx="3.5"
                      fill="currentColor"
                      opacity="0.25"
                      stroke="none"
                    />
                    <circle
                      cx="28"
                      cy="98"
                      r="2.5"
                      fill="currentColor"
                      stroke="none"
                    />
                    <rect
                      x="36"
                      y="95"
                      width="120"
                      height="7"
                      rx="3.5"
                      fill="currentColor"
                      opacity="0.25"
                      stroke="none"
                    />
                  </svg>
                }
                @case ('upload') {
                  <!-- illustrative sketch; the live uploader renders on its own pages -->
                  <svg
                    aria-hidden="true"
                    data-preview="upload"
                    viewBox="0 0 280 120"
                    class="w-full max-w-[280px] text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                  >
                    <rect
                      x="10"
                      y="8"
                      width="260"
                      height="52"
                      rx="10"
                      stroke-dasharray="6 5"
                    />
                    <path d="M140 44V22m0 0-10 10m10-10 10 10" />
                    <rect x="10" y="70" width="260" height="18" rx="6" />
                    <rect
                      x="14"
                      y="74"
                      width="150"
                      height="10"
                      rx="5"
                      fill="currentColor"
                      opacity="0.35"
                      stroke="none"
                    />
                    <rect x="10" y="96" width="260" height="18" rx="6" />
                    <rect
                      x="14"
                      y="100"
                      width="230"
                      height="10"
                      rx="5"
                      fill="currentColor"
                      opacity="0.2"
                      stroke="none"
                    />
                  </svg>
                }
                @case ('kanban') {
                  <!-- illustrative sketch; the live kanban renders on its own pages -->
                  <svg
                    aria-hidden="true"
                    data-preview="kanban"
                    viewBox="0 0 280 120"
                    class="w-full max-w-[280px] text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                  >
                    <rect x="10" y="10" width="80" height="100" rx="8" />
                    <rect x="100" y="10" width="80" height="72" rx="8" />
                    <rect x="190" y="10" width="80" height="86" rx="8" />
                    <rect
                      x="18"
                      y="26"
                      width="64"
                      height="20"
                      rx="4"
                      fill="currentColor"
                      opacity="0.25"
                      stroke="none"
                    />
                    <rect
                      x="18"
                      y="52"
                      width="64"
                      height="20"
                      rx="4"
                      fill="currentColor"
                      opacity="0.18"
                      stroke="none"
                    />
                    <rect
                      x="108"
                      y="26"
                      width="64"
                      height="20"
                      rx="4"
                      fill="currentColor"
                      opacity="0.35"
                      stroke="none"
                    />
                    <rect
                      x="198"
                      y="26"
                      width="64"
                      height="20"
                      rx="4"
                      fill="currentColor"
                      opacity="0.18"
                      stroke="none"
                    />
                    <rect
                      x="198"
                      y="52"
                      width="64"
                      height="20"
                      rx="4"
                      fill="currentColor"
                      opacity="0.25"
                      stroke="none"
                    />
                    <rect
                      x="128"
                      y="56"
                      width="64"
                      height="20"
                      rx="4"
                      opacity="0.7"
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
                @case ('avatar') {
                  <div
                    class="flex w-full flex-col items-start gap-4 self-start"
                  >
                    <oge-avatar-group
                      [items]="galleryPeople"
                      [max]="4"
                      ariaLabel="Project team"
                    />
                    <oge-badge [value]="12">
                      <button
                        type="button"
                        class="rounded border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-700"
                      >
                        Inbox
                      </button>
                    </oge-badge>
                  </div>
                }
                @case ('chip') {
                  <div class="w-full self-start">
                    <oge-chip-list
                      [items]="galleryChips"
                      selectionMode="multiple"
                      [selectedKeys]="['angular', 'signals']"
                      ariaLabel="Topics"
                    />
                  </div>
                }
                @case ('alert') {
                  <div class="flex w-full flex-col gap-2 self-start">
                    <oge-alert severity="success" title="Deployed" live="off">
                      Version 1.2 is live.
                    </oge-alert>
                    <oge-alert severity="warning" live="off">
                      Your trial ends in 3 days.
                    </oge-alert>
                  </div>
                }
                @case ('timeline') {
                  <div class="w-full self-start">
                    <oge-timeline
                      [items]="galleryEvents"
                      ariaLabel="Release history"
                    />
                  </div>
                }
                @case ('carousel') {
                  <div class="w-full self-start">
                    <oge-carousel
                      [items]="gallerySlides"
                      [height]="112"
                      ariaLabel="Gallery slides"
                    />
                  </div>
                }
                @case ('tile-layout') {
                  <div class="w-full self-start">
                    <oge-tile-layout
                      [items]="galleryTiles"
                      [columns]="3"
                      [rowHeight]="44"
                      [gap]="8"
                      ariaLabel="Gallery dashboard"
                    />
                  </div>
                }
                @case ('data-view') {
                  <div class="w-full self-start">
                    <oge-data-view
                      [items]="galleryProducts"
                      [minItemWidth]="96"
                      gap="8px"
                      ariaLabel="Products"
                    >
                      <ng-template ogeDataViewItemTemplate let-item>
                        <span class="block text-sm font-semibold">{{
                          item.name
                        }}</span>
                        <span class="block text-xs text-gray-500"
                          >{{ item.price }} USD</span
                        >
                      </ng-template>
                    </oge-data-view>
                  </div>
                }
                @case ('list-view') {
                  <div class="w-full self-start">
                    <oge-list-view
                      [items]="galleryContacts"
                      displayExpr="name"
                      selectionMode="single"
                      [selectedKeys]="galleryContactPick"
                      [height]="132"
                      ariaLabel="Contacts"
                    />
                  </div>
                }
                @case ('app-bar') {
                  <div class="w-full self-start">
                    <oge-app-bar color="primary" size="sm">
                      <span class="text-sm font-semibold">Dashboard</span>
                      <button
                        ogeAppBarEnd
                        type="button"
                        class="rounded px-2 py-1 text-sm"
                      >
                        Sign in
                      </button>
                    </oge-app-bar>
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
                @case ('pagination') {
                  <div class="w-full self-start">
                    <oge-pagination
                      [(pageIndex)]="previewPage"
                      [itemCount]="120"
                      [pageSize]="10"
                      [messages]="{ paginationLabel: 'Gallery preview' }"
                    />
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
              <!--
                Which render layers this family ships in, read from the single
                coverage table (ADR 0002) — so a new React package lights the
                mark up here without this page being touched.
              -->
              <span class="ml-auto flex items-center gap-1.5">
                @for (layer of layersOf(family.path); track layer) {
                  <app-framework-logo
                    [name]="layer"
                    [size]="15"
                    [brand]="true"
                  />
                }
              </span>
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
  private readonly fwService = inject(FrameworkService);

  /**
   * Render layers a family ships in, derived from its docs route so the card
   * and the header switch can never disagree.
   */
  protected readonly layersOf = (path: string): FrameworkLogoName[] => {
    const family = path.split('/components/')[1]?.split('/')[0] ?? '';
    return this.fwService.frameworks
      .filter((entry) => this.fwService.supports(family, entry.id))
      .map((entry) => entry.id as FrameworkLogoName);
  };

  protected readonly version = SITE_VERSION;
  protected readonly heroChips = [
    'signal-based APIs',
    'zoneless-ready',
    'design-token theming',
    'axe-tested accessibility',
    'zero runtime dependencies',
  ];

  /** Pages added since the last release line — newest feature work first. */
  protected readonly recentlyAdded: readonly {
    family: string;
    label: string;
    path: string;
  }[] = [
    { family: 'Layout', label: 'Avatar & badge', path: '/components/avatar' },
    { family: 'Layout', label: 'Chip', path: '/components/chip' },
    { family: 'Layout', label: 'Alert', path: '/components/alert' },
    { family: 'Layout', label: 'Timeline', path: '/components/timeline' },
    { family: 'Layout', label: 'App bar', path: '/components/app-bar' },
    { family: 'Layout', label: 'List view', path: '/components/list-view' },
    { family: 'Layout', label: 'Data view', path: '/components/data-view' },
    {
      family: 'Layout',
      label: 'Tile layout',
      path: '/components/tile-layout',
    },
    { family: 'Layout', label: 'Carousel', path: '/components/carousel' },
    {
      family: 'Overlay',
      label: 'Action sheet',
      path: '/components/overlay/action-sheet',
    },
    {
      family: 'Buttons',
      label: 'FAB & speed dial',
      path: '/components/buttons/fab',
    },
    {
      family: 'Inputs',
      label: 'Rating',
      path: '/components/inputs/rating',
    },
    {
      family: 'Inputs',
      label: 'OTP input',
      path: '/components/inputs/otp-input',
    },
    {
      family: 'Inputs',
      label: 'Signature pad',
      path: '/components/inputs/signature-pad',
    },
    {
      family: 'Inputs',
      label: 'List box',
      path: '/components/inputs/list-box',
    },
    {
      family: 'Inputs',
      label: 'Transfer list',
      path: '/components/inputs/transfer-list',
    },
    {
      family: 'Inputs',
      label: 'Mention',
      path: '/components/inputs/mention',
    },
    {
      family: 'Data Grid',
      label: 'Range selection & clipboard',
      path: '/components/data-grid/range-selection',
    },
    {
      family: 'Data Grid',
      label: 'Conditional formatting',
      path: '/components/data-grid/conditional-formatting',
    },
    {
      family: 'Data Grid',
      label: 'Pinned rows',
      path: '/components/data-grid/pinned-rows',
    },
    {
      family: 'Data Grid',
      label: 'Excel & PDF export',
      path: '/components/data-grid/export',
    },
    {
      family: 'Tree List',
      label: 'Summaries',
      path: '/components/tree-list/summaries',
    },
    {
      family: 'Pivot Grid',
      label: 'Chart integration',
      path: '/components/pivot-grid/chart-integration',
    },
    {
      family: 'Pivot Grid',
      label: 'Calculated fields',
      path: '/components/pivot-grid/calculated-fields',
    },
    {
      family: 'Inputs',
      label: 'Masked text box',
      path: '/components/inputs/masked-text-box',
    },
    {
      family: 'Inputs',
      label: 'Multi-column combo box',
      path: '/components/inputs/multi-column-combo-box',
    },
    {
      family: 'Inputs',
      label: 'Color gradient',
      path: '/components/inputs/color-gradient',
    },
    {
      family: 'Inputs',
      label: 'Color palette',
      path: '/components/inputs/color-palette',
    },
    {
      family: 'Inputs',
      label: 'Check box group',
      path: '/components/inputs/check-box-group',
    },
    {
      family: 'Inputs',
      label: 'Toggle group',
      path: '/components/inputs/toggle-controls',
    },
  ];

  protected readonly galleryPeople: readonly OgeAvatarItem[] = [
    { name: 'Ada Lovelace', status: 'online' },
    { name: 'Grace Hopper', status: 'busy' },
    { name: 'Alan Turing' },
    { name: 'Katherine Johnson' },
    { name: 'Edsger Dijkstra' },
    { name: 'Barbara Liskov' },
  ];
  protected readonly galleryContacts = [
    { id: 1, name: 'Ada Lovelace' },
    { id: 2, name: 'Grace Hopper' },
    { id: 3, name: 'Alan Turing' },
    { id: 4, name: 'Barbara Liskov' },
  ];
  protected readonly galleryContactPick: readonly number[] = [2];
  protected readonly gallerySlides: readonly OgeCarouselItem[] = [
    {
      key: 'coast',
      image: '/demo/carousel/coast.svg',
      imageAlt: 'A palm tree on a sandy beach',
    },
    {
      key: 'mountains',
      image: '/demo/carousel/mountains.svg',
      imageAlt: 'Snow-capped violet peaks',
    },
    {
      key: 'city',
      image: '/demo/carousel/city.svg',
      imageAlt: 'A city skyline at sunset',
    },
  ];
  protected readonly galleryTiles: readonly OgeTileLayoutItemData[] = [
    { key: 'sales', title: 'Sales', colSpan: 2 },
    { key: 'visits', title: 'Visits' },
    { key: 'goals', title: 'Goals' },
    { key: 'team', title: 'Team', colSpan: 2 },
  ];

  protected readonly galleryChips: readonly OgeChipItem[] = [
    { key: 'angular', label: 'Angular' },
    { key: 'react', label: 'React' },
    { key: 'signals', label: 'Signals' },
    { key: 'a11y', label: 'Accessibility' },
  ];
  protected readonly galleryProducts = [
    { id: 1, name: 'Desk', price: 420 },
    { id: 2, name: 'Chair', price: 260 },
    { id: 3, name: 'Lamp', price: 45 },
  ];
  protected readonly galleryEvents: readonly OgeTimelineItem[] = [
    { title: 'Design review', time: 'Mon', severity: 'success' },
    { title: 'Release candidate', time: 'Wed' },
    { title: 'General availability', time: 'Fri', variant: 'outlined' },
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
        'Virtualized rows into the millions, filtering, grouping with summaries, five editing modes, range selection with clipboard, conditional formatting, pinned rows and Excel/PDF export.',
    },
    {
      key: 'tree',
      name: 'Tree List',
      icon: 'layout',
      path: '/components/tree-list',
      description:
        'The grid feature set on hierarchical data: lazy loading, ancestor-preserving filtering, tri-state selection, drag & drop reordering and recursive summaries.',
    },
    {
      key: 'buttons',
      name: 'Buttons',
      icon: 'pointer',
      path: '/components/buttons',
      description:
        'Async actions with automatic loading, click guards, hold-to-confirm, badges, stand-alone toggle buttons, radio-pattern groups, drop-down/split buttons, a floating action button and a speed dial.',
    },
    {
      key: 'inputs',
      name: 'Inputs',
      icon: 'text-cursor',
      path: '/components/inputs',
      description:
        'TextBox, MaskedTextBox, NumberBox, SelectBox, TagBox, a multi-column combo box, date editors, color box, gradient and palette, check box and toggle groups, rating, OTP input, signature pad, list box, transfer list and mentions on one field chrome: floating labels, input masks, remote paged lists and WAI-ARIA comboboxes.',
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
        'Single or multiple expansion following the WAI-ARIA pattern: lazy content, async expand guards, header actions, a nested panel bar and a stand-alone expansion panel.',
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
      key: 'avatar',
      name: 'Avatar & Badge',
      icon: 'user',
      path: '/components/avatar',
      description:
        'Image, initials and icon fallback with presence dots, stacked groups that fold the rest into "+N", and count or dot badges whose meaning reaches screen readers through the decorated control.',
    },
    {
      key: 'chip',
      name: 'Chip',
      icon: 'tag',
      path: '/components/chip',
      description:
        'Selectable and removable chips with icons or avatars; a list that is a WAI-ARIA listbox when it selects and a layout grid when it only removes — Delete and Backspace included.',
    },
    {
      key: 'alert',
      name: 'Alert',
      icon: 'alert',
      path: '/components/alert',
      description:
        'Inline info, success, warning and error messages with a title, actions and dismiss — announced politely or assertively by severity, never by colour alone.',
    },
    {
      key: 'timeline',
      name: 'Timeline',
      icon: 'timeline',
      path: '/components/timeline',
      description:
        'Vertical, horizontal or alternating history as a real ordered list: severity markers with icons, locale-formatted times in datetime elements and per-item templates.',
    },
    {
      key: 'carousel',
      name: 'Carousel',
      icon: 'carousel',
      path: '/components/carousel',
      description:
        'A swipeable APG slide show with dots or thumbnails, looping and several slides per view; autoplay pauses on hover and always shows its rotation control.',
    },
    {
      key: 'tile-layout',
      name: 'Tile Layout',
      icon: 'dashboard',
      path: '/components/tile-layout',
      description:
        'Drag-and-drop dashboard tiles with column and row spans, resize handles, Ctrl+Arrow keyboard moves with announcements and a serializable layout to save and restore.',
    },
    {
      key: 'data-view',
      name: 'Data View',
      icon: 'data-view',
      path: '/components/data-view',
      description:
        'Templated items in responsive columns or rows that follow their container, with a layout switch, search, locale-aware sorting, paging and selectable items.',
    },
    {
      key: 'list-view',
      name: 'List View',
      icon: 'list-view',
      path: '/components/list-view',
      description:
        'A templated listbox or plain list: single or multiple selection, sticky group headers, windowed rendering for 10 000 rows, search, infinite scroll and swipe actions.',
    },
    {
      key: 'app-bar',
      name: 'App Bar',
      icon: 'app-bar',
      path: '/components/app-bar',
      description:
        'Top or bottom bar with start, center and end sections; sticky or fixed with safe-area padding, four surface colours, and a landmark only when you ask for one.',
    },
    {
      key: 'progress',
      name: 'Progress & Loading',
      icon: 'loader',
      path: '/components/progress',
      description:
        'Linear and circular bars, the spinner, the shimmer placeholder and a load panel that shades a busy container — role="progressbar" done right: indeterminate omits aria-valuenow, reduced motion slows motion instead of freezing it.',
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
        'A side panel that floats above, pushes or shrinks its content — and whose modality follows that choice: a dialog with a focus trap when it covers, a landmark when it shares the row. Built-in navigation items, a mini rail and touch swipe.',
    },
    {
      key: 'menubar',
      name: 'Menubar',
      icon: 'menubar',
      path: '/components/menubar',
      description:
        'A persistent APG menubar with nested submenus on the suite’s shared menu machinery, radio and checkbox rows, a More overflow item or a container-width hamburger collapse, and cancelable open/close pairs.',
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
      key: 'pagination',
      name: 'Pagination',
      icon: 'pages',
      path: '/components/pagination',
      description:
        'A standalone pager on two-way page index and size models: a constant-width numeric window with ellipses, page-size selector, live info range, jump-to-page and a container-width compact mode.',
    },
    {
      key: 'tree-view',
      name: 'Tree View',
      icon: 'tree',
      path: '/components/tree-view',
      description:
        'Flat or nested data with tri-state checkboxes, ancestor-preserving search, load-on-demand and load-more children, virtual scrolling, F2 label editing and drag & drop between trees.',
    },
    {
      key: 'pivot',
      name: 'Pivot Grid',
      icon: 'gauge',
      path: '/components/pivot-grid',
      description:
        'Cross-tab analytics on raw records: rows × columns × measures with grand totals, field chooser, calculated fields, Top N filters, chart integration and export.',
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
        'Data visualization on a dependency-free SVG kernel: cartesian series, pie, polar, gauges, sparklines, funnel, heatmap, treemap, sunburst, Sankey and GeoJSON maps — zoom & pan, tooltips and full keyboard access.',
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
      key: 'upload',
      name: 'Upload',
      icon: 'upload',
      path: '/components/upload',
      description:
        'File uploader: drag & drop with directory and paste, restrictions that stay on the row with their reason, previews, and chunked resumable transfer with pause, resume and retry.',
    },
    {
      key: 'editor',
      name: 'Rich Text Editor',
      icon: 'type',
      path: '/components/editor',
      description:
        'Rich-text editing on its own document model: headings, nested lists, links, images and colours, undo history, markdown shortcuts and Word paste cleanup — the HTML value is sanitized by a strict allowlist.',
    },
    {
      key: 'kanban',
      name: 'Kanban',
      icon: 'columns',
      path: '/components/kanban',
      description:
        'Task board with columns, swimlanes and WIP limits: virtualized card lists, polished drag & drop with Escape-cancel, keyboard card moving, built-in dialog and menu.',
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
        'The positioning engine behind every popup: anchored panels, popovers, WAI-ARIA menus, rich tooltips, delegated context menus, confirm/alert/prompt dialogs and non-modal windows.',
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

  protected readonly previewPage = signal(2);
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
