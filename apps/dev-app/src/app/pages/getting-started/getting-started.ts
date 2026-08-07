import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { Icon, type IconName } from '../../shared/icon';
import { SITE_VERSION } from '../../shared/site-version';
import { PageToc } from '../../shared/page-toc';

const SECTIONS = [
  'Installation',
  'Quick start',
  'Components',
  'Packages',
  'Next steps',
] as const;

const INSTALL = `# everything at once — one install, one import path
npm install oge-ui

# …or install only what you use — every package is standalone
npm install @oge-ui/grid        # data grid (+ @oge-ui/core)
npm install @oge-ui/tree-list   # hierarchical grid
npm install @oge-ui/pivot       # pivot table
npm install @oge-ui/buttons     # buttons, groups, drop-downs (+ @oge-ui/overlay)
npm install @oge-ui/inputs      # text, textarea, number and select editors`;

const QUICK_START = `import { Component, signal } from '@angular/core';
import { OgeButton } from '@oge-ui/buttons';
import { OgeTextBox } from '@oge-ui/inputs';

@Component({
  selector: 'app-search-bar',
  imports: [OgeTextBox, OgeButton],
  template: \`
    <oge-text-box
      label="Search"
      [(value)]="query"
      [showClearButton]="true"
      (enterKey)="run()"
    />
    <oge-button text="Search" severity="accent" [action]="load" />
  \`,
})
export class SearchBar {
  readonly query = signal('');

  // async action: the button manages its own loading spinner
  readonly load = () => fetch('/api/search?q=' + this.query());
}`;

interface ComponentCard {
  path: string;
  icon: IconName;
  name: string;
  description: string;
}

@Component({
  selector: 'app-getting-started',
  imports: [CodeBlock, RouterLink, Icon, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-toc [sections]="sections" />

    <div class="border-b border-gray-200 pb-10 dark:border-gray-800">
      <h1
        class="!m-0 text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100"
      >
        UI components for Angular
      </h1>
      <p class="mt-3 max-w-2xl text-[15px] text-gray-600 dark:text-gray-400">
        OGE is a suite of Angular UI components built on signals: a virtualized
        data grid, tree list, pivot table, buttons and form editors. Components
        run zoneless, ship with full template type checking and theme through
        CSS design tokens.
      </p>
      <div class="mt-6 flex flex-wrap items-center gap-3">
        <a
          routerLink="/components"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Explore components
        </a>
      </div>
      <p class="!mb-0 mt-4 text-[13px] text-gray-400 dark:text-gray-500">
        Requires Angular 22+.
      </p>
    </div>

    <h2 id="installation" class="scroll-mt-20">Installation</h2>
    <p>
      Packages are independent — install only the families you need. Shared
      engines (<code>&#64;oge-ui/core</code> for data,
      <code>&#64;oge-ui/overlay</code> for positioning) are pulled in as
      dependencies automatically.
    </p>
    <app-code-block [code]="install" language="bash" />

    <h2 id="quick-start" class="scroll-mt-20">Quick start</h2>
    <p>
      Every component is standalone: import the classes you use into the
      <code>imports</code> array and bind with signals. No modules, no forms
      boilerplate — <code>[(value)]</code> works directly against a
      <code>signal()</code>, and the same editors also plug into Signal Forms
      (<code>[formField]</code>) and reactive forms (<code>formControl</code>).
    </p>
    <app-code-block [code]="quickStart" language="ts" />

    <h2 id="components" class="scroll-mt-20">Components</h2>
    <div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
      @for (card of componentCards; track card.path) {
        <a
          [routerLink]="card.path"
          class="group rounded-xl border border-gray-200 p-5 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-gray-800 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/5"
        >
          <div class="flex items-center gap-2.5">
            <span
              class="text-gray-400 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
            >
              <app-icon [name]="card.icon" [size]="18" />
            </span>
            <span class="font-medium text-gray-900 dark:text-gray-100">{{
              card.name
            }}</span>
            <span
              class="ml-auto rounded-full border border-gray-200 px-2 py-0.5 font-mono text-[11px] text-gray-400 dark:border-gray-700 dark:text-gray-500"
              >v{{ version }}</span
            >
          </div>
          <p class="!mb-0 mt-2 text-sm text-gray-500 dark:text-gray-400">
            {{ card.description }}
          </p>
        </a>
      }
    </div>

    <h2 id="packages" class="scroll-mt-20">Packages</h2>
    <table class="api-table">
      <thead>
        <tr>
          <th>Package</th>
          <th>Contents</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>oge-ui</code></td>
          <td>
            <strong>Umbrella:</strong> installs and re-exports every package
            below — one install, one import path. The scoped packages remain the
            à-la-carte alternative.
          </td>
        </tr>
        <tr>
          <td><code>&#64;oge-ui/core</code></td>
          <td>
            Framework-agnostic engine: data sources, filtering, row pipeline,
            tree and pivot math, virtualization. No Angular dependency.
          </td>
        </tr>
        <tr>
          <td><code>&#64;oge-ui/grid</code></td>
          <td>
            Data Grid component, column directives, templates, CSV/Excel/PDF
            export entries and the shared theme files.
          </td>
        </tr>
        <tr>
          <td><code>&#64;oge-ui/tree-list</code></td>
          <td>
            Hierarchical grid with lazy loading, tri-state selection, drag &amp;
            drop and Excel outline export.
          </td>
        </tr>
        <tr>
          <td><code>&#64;oge-ui/pivot</code></td>
          <td>Pivot table with field chooser, totals and export.</td>
        </tr>
        <tr>
          <td><code>&#64;oge-ui/buttons</code></td>
          <td>
            Button, ButtonGroup and DropDownButton with async actions, click
            guards and hold-to-confirm.
          </td>
        </tr>
        <tr>
          <td><code>&#64;oge-ui/overlay</code></td>
          <td>
            Anchored panels, popups and menu lists — the positioning engine
            behind drop-downs.
          </td>
        </tr>
        <tr>
          <td><code>&#64;oge-ui/inputs</code></td>
          <td>
            TextBox, TextArea, NumberBox plus SelectBox and TagBox (multi-select
            combobox) on one field chrome, with three form-binding modes.
          </td>
        </tr>
      </tbody>
    </table>

    <h2 id="next-steps" class="scroll-mt-20">Next steps</h2>
    <div class="grid grid-cols-3 gap-4 max-md:grid-cols-1">
      @for (guide of guides; track guide.path) {
        <a
          [routerLink]="guide.path"
          class="group rounded-xl border border-gray-200 p-5 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-gray-800 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/5"
        >
          <div class="flex items-center gap-2.5">
            <span
              class="text-gray-400 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
            >
              <app-icon [name]="guide.icon" [size]="18" />
            </span>
            <span class="font-medium text-gray-900 dark:text-gray-100">{{
              guide.name
            }}</span>
          </div>
          <p class="!mb-0 mt-2 text-sm text-gray-500 dark:text-gray-400">
            {{ guide.description }}
          </p>
        </a>
      }
    </div>
  `,
})
export class GettingStartedPage {
  protected readonly version = SITE_VERSION;
  protected readonly sections = SECTIONS;
  protected readonly install = INSTALL;
  protected readonly quickStart = QUICK_START;

  protected readonly guides: ComponentCard[] = [
    {
      path: '/getting-started/setup',
      icon: 'package',
      name: 'Set up your project',
      description:
        'Requirements, package installation, optional export dependencies and application providers.',
    },
    {
      path: '/getting-started/styling',
      icon: 'palette',
      name: 'Style the app',
      description:
        'Design tokens, scoped overrides, bridge themes, dark mode and per-component colors.',
    },
    {
      path: '/getting-started/localization',
      icon: 'globe',
      name: 'Localization',
      description:
        'Message catalogs, validation strings, number locales and behavior defaults.',
    },
  ];

  protected readonly componentCards: ComponentCard[] = [
    {
      path: '/components/data-grid',
      icon: 'table',
      name: 'Data Grid',
      description:
        'Virtualized rows, sorting, filtering, grouping, editing, master-detail, remote data and export.',
    },
    {
      path: '/components/tree-list',
      icon: 'layout',
      name: 'Tree List',
      description:
        'Hierarchical data with lazy loading, tri-state selection, drag & drop reordering and editing.',
    },
    {
      path: '/components/pivot-grid',
      icon: 'gauge',
      name: 'Pivot Grid',
      description:
        'Cross-tab analytics: rows × columns × measures with totals, sorting and export.',
    },
    {
      path: '/components/buttons',
      icon: 'pointer',
      name: 'Buttons',
      description:
        'Async actions with automatic loading, click guards, hold-to-confirm, groups and drop-down menus.',
    },
    {
      path: '/components/inputs',
      icon: 'text-cursor',
      name: 'Inputs',
      description:
        'Text, textarea, number and select editors with floating labels, validation and three form-binding modes.',
    },
  ];
}
