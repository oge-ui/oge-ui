import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
// Read at build time, so the numbers are the baseline CI enforces.
// eslint-disable-next-line @nx/enforce-module-boundaries -- a build-time data file at the repo root, not a project import
import budgets from '../../../../../../tools/size-budgets.json';
import { formatKb } from '../resources/bundle-size-data';
import { GuideTable } from './guide-table';
import {
  DEFERRED,
  ENTRY_POINTS,
  GRID_DEFAULTS,
  LAZY_EXPORT,
  REMOTE,
  VIRTUAL,
  VIRTUAL_REACT,
} from './performance-snippets';

const SECTIONS = [
  'Virtualization',
  'Remote data',
  'First render and loadSync',
  'Load heavy families later',
  'Bundle size',
] as const;

const ANGULAR_SIZES = [
  'oge-ui',
  '@oge-ui/core',
  '@oge-ui/grid',
  '@oge-ui/grid/export-excel',
  '@oge-ui/inputs/select-box',
  '@oge-ui/buttons',
  '@oge-ui/buttons/fab',
] as const;

const REACT_SIZES = [
  '@oge-ui/react',
  '@oge-ui/react/styles.css',
  '@oge-ui/react-grid',
  '@oge-ui/react-grid/styles.css',
  '@oge-ui/react-inputs',
  '@oge-ui/core',
  '@oge-ui/behavior',
] as const;

const ENTRIES: Readonly<Record<string, number>> = budgets.entries;

/** `/guides/performance` — virtualization, remote data and bundle size. */
@Component({
  selector: 'app-guide-performance',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Performance"
      category="Guides"
      categoryLink="/guides"
      [chips]="['virtual scrolling', 'DataSource', 'lazy entry points']"
    >
      <p>
        Large data stays fast when only what is visible is rendered, the server
        does the querying, and code nobody needs on the first screen loads
        later. The knobs for each, with the defaults they start from.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="virtualization" class="scroll-mt-20">Virtualization</h2>
    <p>
      Virtual scrolling renders the rows inside the viewport plus an overscan
      margin. It needs a bounded height — a viewport to be inside of.
    </p>
    <app-guide-table
      caption="Virtualization settings per family"
      [head]="['Family', 'Setting', 'Default']"
      [rows]="virtualRows"
    />
    <app-code-block
      [code]="virtual()"
      [language]="fw.isReact() ? 'tsx' : 'ts'"
    />
    @if (!fw.isReact()) {
      <app-code-block [code]="gridDefaults" language="ts" />
    }
    <p>
      Column virtualization renders only the columns in view; it does not
      combine with pinned columns or column bands, and a column without a
      numeric width counts with the minimum width. <code>autoRowHeight</code>
      measures real row heights in virtual mode at some cost — keep a fixed
      <code>rowHeight</code> when rows are uniform.
    </p>

    <h2 id="remote-data" class="scroll-mt-20">Remote data</h2>
    <p>
      Pass a <code>DataSource</code> instead of an array and the grid sends its
      whole query — sort, filter, search, grouping, summaries, page — to it; the
      source's <code>capabilities</code> say which parts the server handles.
    </p>
    <app-guide-table
      caption="Data sources in @oge-ui/core"
      [head]="['Source', 'Use it for', 'Server does']"
      [rows]="sources"
    />
    <app-code-block [code]="remote" language="ts" />
    <p>
      Block loading while scrolling: <code>scrolling.mode: 'infinite'</code> (or
      <code>'virtual'</code> with <code>remote: true</code>) fetches row blocks
      from the source as the viewport moves — rows only, no grouping or
      master-detail in that mode.
    </p>

    <h2 id="first-render-and-loadsync" class="scroll-mt-20">
      First render and loadSync
    </h2>
    <p>
      <code>DataSource.load()</code> returns a promise.
      <code>ArrayDataSource</code> (and a plain array, which the grid wraps in
      one) also implements the optional <code>loadSync()</code>, so in-memory
      data is in the very first render — on the server too
      @if (fw.isReact()) {
        (the React grid and tree list call it while rendering, so
        <code>renderToString</code> contains the first page of rows).
      } @else {
        (the server-rendered HTML contains the first page of rows).
      }
      Remote sources omit <code>loadSync</code> and load after mount; give the
      page a loading state rather than an empty grid.
    </p>

    <h2 id="load-heavy-families-later" class="scroll-mt-20">
      Load heavy families later
    </h2>
    @if (fw.isReact()) {
      <p>
        Load a family the first screen does not show with
        <code>React.lazy</code> (or <code>next/dynamic</code> — see
        <a
          class="text-indigo-600 underline dark:text-indigo-400"
          routerLink="/guides/nextjs"
          >Next.js</a
        >). The suite does this itself: the grid's form editor loads
        <code>&#64;oge-ui/react-editor</code> with <code>React.lazy</code>.
      </p>
    } @else {
      <p>
        Wrap a family the first screen does not show in
        <code>&#64;defer</code>; Angular splits its code into a chunk that loads
        on the trigger you pick. The suite does this itself: the grid renders
        its form and popup editors inside <code>&#64;defer</code>, so
        <code>&#64;oge-ui/forms</code> is not in a grid-only bundle.
      </p>
      <app-code-block [code]="deferred" language="ts" />
    }
    <p>
      Exports are separate entry points, and their libraries are optional peers
      — <code>exceljs</code> and <code>jspdf</code> load with the export chunk
      on the first export, not with the component:
    </p>
    <app-code-block [code]="lazyExport" language="ts" />

    <h2 id="bundle-size" class="scroll-mt-20">Bundle size</h2>
    <p>
      Gzip size of a few entry points (the baseline CI holds every pull request
      to, +10 %). Each number is the entry and its package-internal chunks;
      shared dependencies (<code>&#64;oge-ui/core</code>,
      <code>&#64;oge-ui/behavior</code>) are counted once, on their own row, and
      tree-shaking takes off whatever your app does not import. Every entry
      point is listed on
      <a
        class="text-indigo-600 underline dark:text-indigo-400"
        routerLink="/bundle-size"
        >Bundle size</a
      >.
    </p>
    <app-guide-table
      caption="Gzip size of selected entry points"
      [head]="['Entry point', 'Gzip']"
      [rows]="sizes()"
    />
    @if (!fw.isReact()) {
      <p>
        Import per component where a family offers it — the
        <code>&#64;oge-ui/inputs</code> barrel itself is tiny, but a per-editor
        entry keeps one editor from pulling in its neighbours' dependencies:
      </p>
      <app-code-block [code]="entryPoints" language="ts" />
    }
  `,
})
export class GuidePerformancePage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly gridDefaults = GRID_DEFAULTS;
  protected readonly remote = REMOTE;
  protected readonly deferred = DEFERRED;
  protected readonly lazyExport = LAZY_EXPORT;
  protected readonly entryPoints = ENTRY_POINTS;

  protected readonly virtual = computed(() =>
    this.fw.isReact() ? VIRTUAL_REACT : VIRTUAL,
  );

  protected readonly sizes = computed(() =>
    (this.fw.isReact() ? REACT_SIZES : ANGULAR_SIZES)
      .filter((entry) => entry in ENTRIES)
      .map((entry) => ['`' + entry + '`', formatKb(ENTRIES[entry])]),
  );

  protected readonly virtualRows = [
    [
      'Data grid',
      "`virtualScroll` (shorthand) or `scrolling: { mode: 'virtual' | 'infinite', remote, columnRenderingMode }`; `rowHeight`, `overscan`, `autoRowHeight`",
      'standard (off); `rowHeight` 36, `overscan` 6',
    ],
    [
      'Tree list',
      '`virtualScroll`, `columnRenderingMode`, `rowHeight`, `overscan`',
      'off',
    ],
    ['Pivot grid', '`virtualScrolling`', 'off'],
    [
      'Select box, tag box, autocomplete, multi-column combo box',
      '`virtualScroll: true | { itemHeight, overscan }`',
      'off; `overscan` 4',
    ],
    [
      'Scheduler (timeline)',
      "`virtualScrolling: boolean | 'auto'`",
      "`'auto'` — on above 50 timeline rows",
    ],
    [
      'Kanban',
      '`virtualScrolling` (per-column card windowing), `cardHeight`',
      'on; `cardHeight` 112',
    ],
    ['Gantt', 'Always on; fixed `rowHeight` in the config', '`rowHeight` 36'],
  ];

  protected readonly sources = [
    [
      '`ArrayDataSource`',
      'In-memory rows (what a plain array becomes)',
      'Nothing — everything runs in the browser; implements `loadSync`',
    ],
    [
      '`CustomDataSource`',
      'Your own endpoint: one `load(options)` function',
      'Whatever `capabilities` says (default: everything)',
    ],
    [
      '`CursorDataSource`',
      'Cursor-paged APIs (`after=…&limit=50` → `{ items, nextCursor }`) with infinite scrolling',
      'Sort and filter by default',
    ],
    [
      '`ODataDataSource`',
      'OData v4 services (read-only); `buildODataQuery` for your own',
      'Sort, filter, paging, counts',
    ],
  ];
}
