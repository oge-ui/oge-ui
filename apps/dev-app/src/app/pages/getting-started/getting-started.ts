import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { Icon } from '../../shared/icon';

const INSTALL = `npm install @oge-ui/core @oge-ui/grid`;

const CONFIG = `import { provideOgeGridConfig } from '@oge-ui/grid';

// app.config.ts — application-wide defaults + localization
providers: [
  provideOgeGridConfig({
    rowHeight: 32,
    filterDebounce: 400,
    allowUnsorting: false,
    messages: {
      noData: 'Veri yok',
      search: 'Ara…',
      groupPanelHint: 'Gruplamak için bir sütun başlığını buraya sürükleyin',
      rowsSuffix: 'satır',
      summaryLabels: { sum: 'Toplam', avg: 'Ort', min: 'Min', max: 'Maks', count: 'Adet' },
    },
  }),
]`;

const OPTIONS = `<!-- Option objects; plain booleans still work -->
<oge-grid [data]="rows" keyField="id"
          [paging]="{ pageSize: 20, pageSizes: [10, 20, 50], showInfo: true }"
          [filterRow]="{ debounce: 500 }"
          [searchPanel]="{ placeholder: 'Çalışan ara', width: 280 }"
          [headerFilter]="{ valueLimit: 50 }"
          [sorting]="{ mode: 'multi', allowUnsorting: false }"
          [messages]="{ noData: 'Kayıt bulunamadı' }">
  <oge-column field="name" filterOperator="startswith" [minWidth]="160" />
</oge-grid>`;

const THEMING = `/* Components read --oge-* design tokens — override them anywhere: */
.oge-grid {
  --oge-header-bg: #eef2f8;
  --oge-row-height: 32px;
}

/* Or use a bridge theme so components follow your CSS framework: */
@import '@oge-ui/grid/themes/tailwind.css';   /* Tailwind v4  */
@import '@oge-ui/grid/themes/bootstrap.css';  /* Bootstrap 5  */

/* Dark mode: add the class to <html> (or a single grid) and import once */
@import '@oge-ui/grid/themes/dark.css';
/* <html class="oge-theme-dark"> … */`;

@Component({
  selector: 'app-getting-started',
  imports: [CodeBlock, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="border-b border-gray-200 pb-10 dark:border-gray-800">
      <h1 class="!m-0 text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        UI components for Angular
      </h1>
      <p class="mt-3 max-w-2xl text-[15px] text-gray-600">
        oge is an open-source suite of Angular UI components built on signals. Components run
        zoneless, ship with full template type checking and theme through CSS design tokens.
      </p>
      <div class="mt-6 flex flex-wrap items-center gap-3">
        <code class="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 font-mono text-[13px] text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          {{ install }}
        </code>
        <a
          routerLink="/components/data-grid"
          class="rounded-lg bg-gray-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          Explore the Data Grid
        </a>
      </div>
      <p class="!mb-0 mt-4 text-[13px] text-gray-400">Requires Angular 22+. MIT licensed.</p>
    </div>

    <h2>Components</h2>
    <div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
      <a
        routerLink="/components/data-grid"
        class="group rounded-lg border border-gray-200 p-5 transition-colors hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
      >
        <div class="flex items-center gap-2.5">
          <span class="text-gray-400 transition-colors group-hover:text-indigo-600">
            <app-icon name="table" [size]="18" />
          </span>
          <span class="font-medium text-gray-900 dark:text-gray-100">Data Grid</span>
          <span class="ml-auto rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-400 dark:border-gray-700">v0.0.1</span>
        </div>
        <p class="!mb-0 mt-2 text-sm text-gray-500">
          Virtualized rows, server-side sorting/filtering/paging, typed cell templates, theming.
        </p>
      </a>
      <div class="rounded-lg border border-dashed border-gray-200 p-5 dark:border-gray-800">
        <div class="flex items-center gap-2.5 text-gray-400">
          <app-icon name="layout" [size]="18" />
          <span class="font-medium">More components</span>
        </div>
        <p class="!mb-0 mt-2 text-sm text-gray-400">
          Scheduler, TreeList and form components are planned. The Data Grid ships first.
        </p>
      </div>
    </div>

    <h2>Packages</h2>
    <table class="api-table">
      <thead><tr><th>Package</th><th>Contents</th></tr></thead>
      <tbody>
        <tr>
          <td><code>&#64;oge-ui/core</code></td>
          <td>Framework-agnostic engine: data sources, filtering, row pipeline, virtualization math. No Angular dependency.</td>
        </tr>
        <tr>
          <td><code>&#64;oge-ui/grid</code></td>
          <td>The Angular Data Grid component, column directives and templates.</td>
        </tr>
      </tbody>
    </table>

    <h2>Configuration &amp; localization</h2>
    <p>
      Every default and every UI string is configurable — globally through DI, or per grid with
      Option objects:
    </p>
    <app-code-block [code]="config" language="ts" />
    <app-code-block [code]="options" language="html" />

    <h2>Theming</h2>
    <p>
      Components never hardcode visual values — they read <code>--oge-*</code> tokens. Bridge
      themes map tokens onto Tailwind or Bootstrap variables; use the
      <em>Grid theme</em> selector in the top bar to compare them live on any example.
    </p>
    <app-code-block [code]="theming" language="css" />
  `,
})
export class GettingStartedPage {
  protected readonly install = INSTALL;
  protected readonly theming = THEMING;
  protected readonly config = CONFIG;
  protected readonly options = OPTIONS;
}
