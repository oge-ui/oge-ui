import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { GuideTable } from './guide-table';
import {
  CLIENT_COMPONENT,
  INSTALL,
  LAYOUT,
  LAZY,
  PROVIDERS,
  SERVER_PAGE,
} from './nextjs-snippets';

const SECTIONS = [
  'Install and import the CSS',
  'Client components',
  'Providers',
  'Server rendering and hydration',
  'Locale on the server',
  'Loading heavy families later',
] as const;

/** `/guides/nextjs` — the React packages in the Next.js App Router. */
@Component({
  selector: 'app-guide-nextjs',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Next.js App Router"
      category="Guides"
      categoryLink="/guides"
      [chips]="['React 18 / 19', 'use client', 'SSR + hydration']"
    >
      <p>
        The React packages are client components that render on the server: a
        Server Component can import and render them directly, Next.js
        server-renders them, and the browser hydrates the markup without a
        mismatch. This page is about <code>&#64;oge-ui/react-*</code>; the
        Angular packages are covered in
        <a
          class="text-indigo-600 underline dark:text-indigo-400"
          routerLink="/guides/angular-ssr"
          >Angular SSR</a
        >.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="install-and-import-the-css" class="scroll-mt-20">
      Install and import the CSS
    </h2>
    <app-code-block [code]="install" language="bash" />
    <p>
      The packages ship class names, not CSS-in-JS: import the stylesheet once
      in the root layout. The JavaScript deliberately does not import its own
      CSS, so a server render or a bundler without a CSS loader never has to
      resolve it.
    </p>
    <app-code-block [code]="layout" language="tsx" />

    <h2 id="client-components" class="scroll-mt-20">Client components</h2>
    <p>
      Every JavaScript file of every React package starts with
      <code>'use client'</code> — CI's <code>use-client-check</code> fails a
      build that loses it. What that means for your code:
    </p>
    <app-guide-table
      caption="Where OGE components can be used in the App Router"
      [head]="['From', 'Works', 'Note']"
      [rows]="boundaries"
    />
    <app-code-block [code]="serverPage" language="tsx" />
    <app-code-block [code]="clientComponent" language="tsx" />

    <h2 id="providers" class="scroll-mt-20">Providers</h2>
    <p>
      <code>OgeLocaleProvider</code> and the per-family
      <code>Oge…ConfigProvider</code>s are React context, so they sit in a
      client module that the layout renders:
    </p>
    <app-code-block [code]="providers" language="tsx" />

    <h2 id="server-rendering-and-hydration" class="scroll-mt-20">
      Server rendering and hydration
    </h2>
    <ul>
      <li>
        <code>apps/ssr-smoke/src/react-hydration.spec.tsx</code> renders every
        React family with <code>renderToString</code> in plain Node — any
        browser global touched while rendering throws, exactly as on a Next.js
        server — then hydrates it under <code>&lt;StrictMode&gt;</code>
        "seven minutes later" and fails on any warning.
      </li>
      <li>Ids come from <code>useId()</code>, so server and client agree.</li>
      <li>
        In-memory data renders on the server: an array or an
        <code>ArrayDataSource</code> answers <code>loadSync</code> during the
        first render, so the first page of rows is in the HTML. Remote sources
        (<code>CustomDataSource</code>, <code>CursorDataSource</code>,
        <code>ODataDataSource</code>) start loading after mount.
      </li>
      <li>
        "Today" markers in the scheduler and the Gantt appear only after
        hydration, so a page rendered minutes earlier still hydrates cleanly.
      </li>
    </ul>
    <p>
      The repository has no Next.js application under test; these guarantees
      come from the plain-Node render and hydrate suite above, which is what a
      Next.js server does with the components.
    </p>

    <h2 id="locale-on-the-server" class="scroll-mt-20">Locale on the server</h2>
    <p>
      Without a <code>locale</code>, a React family formats with
      <code>navigator.language</code> in the browser and the Node runtime's
      default on the server — a hydration mismatch for every reader whose
      language differs from the server's. Pass it explicitly (from the request,
      a cookie or your i18n router):
    </p>
    <app-guide-table
      caption="React components with a locale prop"
      [head]="['Package', 'Components with locale']"
      [rows]="localeProps"
    />

    <h2 id="loading-heavy-families-later" class="scroll-mt-20">
      Loading heavy families later
    </h2>
    <p>
      A family the first paint does not need can load after hydration with
      <code>next/dynamic</code>. Export helpers are separate entry points
      already (<code>&#64;oge-ui/react-grid/export-excel</code>, …) and load
      only when imported — see
      <a
        class="text-indigo-600 underline dark:text-indigo-400"
        routerLink="/guides/performance"
        >Performance</a
      >.
    </p>
    <app-code-block [code]="lazy" language="tsx" />
  `,
})
export class GuideNextjsPage {
  protected readonly sections = SECTIONS;
  protected readonly install = INSTALL;
  protected readonly layout = LAYOUT;
  protected readonly providers = PROVIDERS;
  protected readonly serverPage = SERVER_PAGE;
  protected readonly clientComponent = CLIENT_COMPONENT;
  protected readonly lazy = LAZY;

  protected readonly boundaries = [
    [
      'A Server Component',
      'Yes',
      'Render an OGE component directly, with serializable props only — arrays, plain objects, strings, numbers.',
    ],
    [
      'Function props (`onClick`, render props, `calculateCellValue`)',
      'In a client module',
      "Functions cannot cross the server → client boundary; put them in your own `'use client'` component.",
    ],
    [
      'Refs and imperative methods',
      'In a client module',
      'Same reason — `useRef` and component methods live on the client.',
    ],
    [
      'A `DataSource` instance',
      'In a client module',
      'A class instance is not serializable; create it client-side (or pass the rows array from the server).',
    ],
  ];

  protected readonly localeProps = [
    ['`@oge-ui/react-grid`', '`OgeGrid`'],
    ['`@oge-ui/react-tree-list`', '`OgeTreeList`'],
    [
      '`@oge-ui/react-inputs`',
      '`OgeCalendar`, `OgeDateBox`, `OgeDateRangeBox`, `OgeNumberBox`, `OgeOtpInput`, `OgeRating`',
    ],
    [
      '`@oge-ui/react-layout`',
      '`OgeAvatar`, `OgeBadge`, `OgeCarousel`, `OgeDataView`, `OgeListView`, `OgeTileLayout`, `OgeTimeline`',
    ],
    [
      '`@oge-ui/react-scheduler`, `-gantt`, `-kanban`, `-pivot`',
      '`OgeScheduler`, `OgeGantt`, `OgeKanban`, `OgePivotGrid`',
    ],
    [
      '`@oge-ui/react` (`OgeLocaleProvider`)',
      'Passes the pack’s `locale` to the families it configures that format numbers or dates (grid, inputs, editor, layout)',
    ],
  ];
}
