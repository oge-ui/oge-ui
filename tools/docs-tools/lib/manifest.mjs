/**
 * The only hand-maintained table in the docs toolchain: per-package metadata
 * that cannot be derived from the sources (npm name, docs route root, the API
 * page that owns its reference tables, and a one-line pitch).
 *
 * Everything else — routes, API member tables, exported symbols, demo sources —
 * is read out of the workspace so it cannot drift.
 */

/** Repo-relative paths, POSIX separators. */
export const PATHS = {
  routes: 'apps/dev-app/src/app/app.routes.ts',
  seo: 'apps/dev-app/src/app/shared/seo.service.ts',
  publicDir: 'apps/dev-app/public',
  pagesDir: 'apps/dev-app/src/app/pages',
  tsconfigBase: 'tsconfig.base.json',
};

/**
 * Docs folders that belong to no package — guides rather than component demos.
 * Their snippets land in `llms-full.txt` under "Getting started samples".
 */
export const GUIDE_DIRS = ['getting-started', 'ai'];

export const SITE_ORIGIN = 'https://ogeui.com';
export const REPO_URL = 'https://github.com/oge-ui/oge-ui';

/**
 * Publishable packages, in the order they should appear in `llms.txt`.
 *
 * - `dir` — folder under `packages/`, also the Nx project name.
 * - `npm` — published name.
 * - `apiPage` — the docs API page whose `<app-api-reference>` blocks document
 *   this package, or an array of them when the package ships more than one
 *   family; `null` when the package has no reference page yet.
 * - `docsRoot` — route the docs live under; `null` for engine-only packages.
 * - `pageDirs` — folders under `pages/` whose demos belong to this package.
 * - `tier` — `'mit'` or `'commercial'`; drives the licence banner.
 * - `platform` — `'angular'` (default) or `'react'`. Selects which "Writing OGE
 *   code" rules and which "Common mistakes" table the package's `llms.txt`
 *   carries. Getting this wrong ships actively misleading instructions to every
 *   coding assistant, so it is explicit rather than inferred from the name.
 */
export const PACKAGES = [
  {
    dir: 'grid',
    npm: '@oge-ui/grid',
    label: 'Data Grid',
    summary:
      'Virtualized data grid: 100k+ rows, sorting, filtering, grouping with summaries, inline/batch/form editing, selection, master-detail, state persistence and CSV/Excel/PDF export.',
    docsRoot: '/components/data-grid',
    pageDirs: [
      'data-grid',
      'playground',
      'sorting',
      'virtual-scroll',
      'infinite-scroll',
      'remote-data',
      'live-updates',
    ],
    apiPage: 'apps/dev-app/src/app/pages/data-grid/api.ts',
    tier: 'mit',
  },
  {
    dir: 'tree-list',
    npm: '@oge-ui/tree-list',
    label: 'Tree List',
    summary:
      'The data-grid feature set on hierarchical data: lazy loading, ancestor-preserving filtering, tri-state selection and drag & drop.',
    docsRoot: '/components/tree-list',
    pageDirs: ['tree-list'],
    apiPage: 'apps/dev-app/src/app/pages/tree-list/api.ts',
    tier: 'mit',
  },
  {
    dir: 'inputs',
    npm: '@oge-ui/inputs',
    label: 'Inputs',
    summary:
      'Form editors on one field chrome: TextBox, TextArea, NumberBox, SelectBox, TagBox, Autocomplete, DateBox, ColorBox, CheckBox, Switch, and the APG Slider/RangeSlider with live drag commits and Escape-to-cancel — floating labels, validation, Signal Forms and reactive forms.',
    docsRoot: '/components/inputs',
    pageDirs: ['inputs'],
    apiPage: 'apps/dev-app/src/app/pages/inputs/api.ts',
    tier: 'mit',
  },
  {
    dir: 'buttons',
    npm: '@oge-ui/buttons',
    label: 'Buttons',
    summary:
      'Buttons with async actions and automatic loading, click guards, hold-to-confirm, auto-repeat, badges, button groups and drop-down/split buttons.',
    docsRoot: '/components/buttons',
    pageDirs: ['buttons'],
    apiPage: 'apps/dev-app/src/app/pages/buttons/api.ts',
    tier: 'mit',
  },
  {
    dir: 'overlay',
    npm: '@oge-ui/overlay',
    label: 'Overlay',
    summary:
      'Popup foundation and surfaces: flip-aware anchored placement, WAI-ARIA menus, tooltips, context menus, the `oge-modal` dialog with `OgeModalService`, and `OgeToastService` notifications.',
    docsRoot: '/components/overlay',
    pageDirs: ['overlay'],
    apiPage: 'apps/dev-app/src/app/pages/overlay/api.ts',
    tier: 'mit',
  },
  {
    dir: 'tabs',
    npm: '@oge-ui/tabs',
    label: 'Tabs',
    summary:
      'Tab strip and tab panel: declarative or data-driven tabs, deferred rendering with keep-alive, closable and reorderable tabs, router integration.',
    docsRoot: '/components/tabs',
    pageDirs: ['tabs'],
    apiPage: 'apps/dev-app/src/app/pages/tabs/api.ts',
    tier: 'mit',
  },
  {
    dir: 'layout',
    npm: '@oge-ui/layout',
    label: 'Layout',
    summary:
      'Layout containers and loading visuals — accordion panels with single or multiple expansion, a splitter with resizable, collapsible and nestable panes, a toolbar with an overflow menu, a card content surface with attribute-slot sections, and the loading trio: progress bar (buffer/chunked/severity), load-indicator ring and shimmer skeleton with the aria progressbar contract done right.',
    docsRoot: '/components/accordion',
    pageDirs: ['layout'],
    apiPage: [
      'apps/dev-app/src/app/pages/layout/api.ts',
      'apps/dev-app/src/app/pages/layout/card-api.ts',
      'apps/dev-app/src/app/pages/layout/progress-api.ts',
      'apps/dev-app/src/app/pages/layout/splitter-api.ts',
      'apps/dev-app/src/app/pages/layout/toolbar-api.ts',
    ],
    tier: 'mit',
  },
  {
    dir: 'forms',
    npm: '@oge-ui/forms',
    label: 'Forms',
    summary:
      'Form layout over the editors — responsive columns, fieldset groups, declarative validation rules and a validation summary.',
    docsRoot: '/components/forms',
    pageDirs: ['forms'],
    apiPage: 'apps/dev-app/src/app/pages/forms/api.ts',
    tier: 'mit',
  },
  {
    dir: 'upload',
    npm: '@oge-ui/upload',
    label: 'Upload',
    summary:
      'File uploader — drag & drop with directory and paste support, client-side restrictions, image previews, per-file progress, and chunked resumable transfer with pause, resume and retry.',
    docsRoot: '/components/upload',
    pageDirs: ['upload'],
    apiPage: 'apps/dev-app/src/app/pages/upload/api.ts',
    tier: 'mit',
  },
  {
    dir: 'navigation',
    npm: '@oge-ui/navigation',
    label: 'Navigation',
    summary:
      'Navigation controls — a tree view over flat or nested data with tri-state checkboxes, search, lazy load on demand, virtual scrolling and drag & drop reparenting, a drawer whose modality follows its layout mode (dialog when it covers the content, landmark when it shares the row), a WAI-ARIA APG menubar with nested submenus and a container-width hamburger collapse, an APG breadcrumb whose oldest middle crumbs collapse into an ellipsis menu against the container width while staying reachable as links, and a standalone pagination bar with a constant-width ellipsis page window, page-size selector, info range and adaptive compact mode.',
    docsRoot: '/components/tree-view',
    pageDirs: ['navigation'],
    apiPage: 'apps/dev-app/src/app/pages/navigation/api.ts',
    tier: 'mit',
  },
  {
    dir: 'pivot',
    npm: '@oge-ui/pivot',
    label: 'Pivot Grid',
    summary:
      'Cross-tab analytics: rows × columns × measures, grand totals, field chooser, sorting and Excel export.',
    docsRoot: '/components/pivot-grid',
    pageDirs: ['pivot-grid'],
    apiPage: 'apps/dev-app/src/app/pages/pivot-grid/api.ts',
    tier: 'commercial',
  },
  {
    dir: 'bpmn',
    npm: '@oge-ui/bpmn',
    label: 'BPMN Editor',
    summary:
      'From-scratch BPMN 2.0 modeler: its own dependency-free XML + diagram-interchange engine, orthogonal routing, snapping, undo/redo, a keyboard-accessible SVG canvas and no watermark.',
    docsRoot: '/components/bpmn',
    pageDirs: ['bpmn'],
    apiPage: 'apps/dev-app/src/app/pages/bpmn/api.ts',
    tier: 'commercial',
  },
  {
    dir: 'charts',
    npm: '@oge-ui/charts',
    label: 'Charts',
    summary:
      'Charts: cartesian line/spline/area/bar/stacked/scatter/range/candlestick series and pie/doughnut on a dependency-free SVG kernel — time/log axes, zoom & pan, crosshair, shared tooltips, interactive legend and keyboard point inspection.',
    docsRoot: '/components/charts',
    pageDirs: ['charts'],
    apiPage: 'apps/dev-app/src/app/pages/charts/api.ts',
    tier: 'commercial',
  },
  {
    dir: 'gantt',
    npm: '@oge-ui/gantt',
    label: 'Gantt',
    summary:
      'Gantt chart: virtualized task tree pane + timeline chart, summary/milestone/baseline bars, FS/SS/FF/SF dependency arrows, critical path, drag editing with Escape-cancel and snapshot undo/redo.',
    docsRoot: '/components/gantt',
    pageDirs: ['gantt'],
    apiPage: 'apps/dev-app/src/app/pages/gantt/api.ts',
    tier: 'commercial',
  },
  {
    dir: 'kanban',
    npm: '@oge-ui/kanban',
    label: 'Kanban',
    summary:
      'Kanban board: columns + swimlanes over a plain card array with field mapping, WIP limits with drag previews, per-column virtualization, drag & drop with Escape-cancel, Ctrl+Arrow keyboard card moving with live announcements, built-in edit dialog, context menu and toolbar.',
    docsRoot: '/components/kanban',
    pageDirs: ['kanban'],
    apiPage: 'apps/dev-app/src/app/pages/kanban/api.ts',
    tier: 'commercial',
  },
  {
    dir: 'scheduler',
    npm: '@oge-ui/scheduler',
    label: 'Scheduler',
    summary:
      'Scheduler / event calendar: day, week and month views, all-day strip, pure-kernel overlap layout, drag & resize with Escape-cancel, appointment popup and form editing.',
    docsRoot: '/components/scheduler',
    pageDirs: ['scheduler'],
    apiPage: 'apps/dev-app/src/app/pages/scheduler/api.ts',
    tier: 'commercial',
  },
  {
    dir: 'core',
    npm: '@oge-ui/core',
    label: 'Core',
    summary:
      'Framework-free data engine shared by every package: sort/filter/group/aggregate pipelines, selection and virtualization math. Installed automatically — you rarely import it directly.',
    docsRoot: null,
    pageDirs: [],
    apiPage: null,
    tier: 'mit',
  },
  {
    dir: 'react/buttons',
    npm: '@oge-ui/react-buttons',
    label: 'Buttons (React)',
    summary:
      'React buttons and button groups: severity/styling variants, async single-flight actions, click guarding, badges, hold-to-confirm and auto-repeat — running the same press machine and the same stylesheet as the Angular package.',
    // The React content renders inside the single Buttons route (ADR 0002:
    // routes stay single, the header switch picks the layer) — there is no
    // /components/react-buttons route to link to.
    docsRoot: '/components/buttons',
    pageDirs: ['react-buttons'],
    apiPage: 'apps/dev-app/src/app/pages/react-buttons/api.ts',
    tier: 'mit',
    platform: 'react',
  },
  {
    dir: 'react/inputs',
    npm: '@oge-ui/react-inputs',
    label: 'Inputs (React)',
    summary:
      'React form editors on the same field chrome: TextBox, TextArea, NumberBox, SelectBox, TagBox, Autocomplete (virtual scrolling, custom values), CheckBox, Switch, RadioGroup, Slider/RangeSlider, ColorBox, Calendar and DateBox/DateRangeBox — running the same commit pipeline, list/selection machines and stylesheet as the Angular package.',
    // The React content renders inside the single Inputs routes (ADR 0002:
    // routes stay single, the header switch picks the layer).
    docsRoot: '/components/inputs',
    pageDirs: ['react-inputs'],
    apiPage: 'apps/dev-app/src/app/pages/react-inputs/api.ts',
    tier: 'mit',
    platform: 'react',
  },
  {
    dir: 'react/tabs',
    npm: '@oge-ui/react-tabs',
    label: 'Tabs (React)',
    summary:
      'React tab strip and tab panel: the WAI-ARIA APG tabs pattern with declarative or data-driven tabs, automatic/manual activation, overflow scrolling with an all-tabs menu, closable tabs with async close guards, drag reordering and lazy panel rendering — running the same selection/close/reorder pipelines and the same stylesheet as the Angular tabs package.',
    // The React content renders inside the single Tabs routes (ADR 0002:
    // routes stay single, the header switch picks the layer).
    docsRoot: '/components/tabs',
    pageDirs: ['react-tabs'],
    apiPage: 'apps/dev-app/src/app/pages/react-tabs/api.ts',
    tier: 'mit',
    platform: 'react',
  },
  {
    dir: 'react/layout',
    npm: '@oge-ui/react-layout',
    label: 'Layout (React)',
    summary:
      'React layout containers and loading visuals: card, accordion with async expand guards and lazy content, splitter with the APG window-splitter keyboard, toolbar with an overflow menu, plus the progress bar, load indicator and shimmer skeleton — running the same config defaults, decision functions and stylesheet as the Angular layout package.',
    // The React content renders inside the single layout routes (ADR 0002:
    // routes stay single, the header switch picks the layer). The docs pages
    // branch when the family's docs parity lands.
    docsRoot: '/components/accordion',
    pageDirs: ['react-layout'],
    apiPage: [
      'apps/dev-app/src/app/pages/react-layout/api.ts',
      'apps/dev-app/src/app/pages/react-layout/card-api.ts',
      'apps/dev-app/src/app/pages/react-layout/progress-api.ts',
      'apps/dev-app/src/app/pages/react-layout/splitter-api.ts',
      'apps/dev-app/src/app/pages/react-layout/toolbar-api.ts',
    ],
    tier: 'mit',
    platform: 'react',
  },
  {
    dir: 'react/navigation',
    npm: '@oge-ui/react-navigation',
    label: 'Navigation (React)',
    summary:
      'React navigation and wayfinding: a virtualized tree view with lazy children, checkbox tri-state and drag reparenting, a drawer with overlay/push/side modes and derived modality, a linear or free stepper with async step guards, a full WAI-ARIA menubar with submenus and type-ahead, a collapsing breadcrumb and a pagination bar — running the same config defaults, decision functions and stylesheet as the Angular navigation package.',
    // The React content renders inside the single navigation routes (ADR 0002:
    // routes stay single, the header switch picks the layer).
    docsRoot: '/components/tree-view',
    pageDirs: ['react-navigation'],
    apiPage: [
      'apps/dev-app/src/app/pages/react-navigation/api.ts',
      'apps/dev-app/src/app/pages/react-navigation/tree-view-api.ts',
      'apps/dev-app/src/app/pages/react-navigation/drawer-api.ts',
      'apps/dev-app/src/app/pages/react-navigation/stepper-api.ts',
      'apps/dev-app/src/app/pages/react-navigation/menubar-api.ts',
      'apps/dev-app/src/app/pages/react-navigation/breadcrumb-api.ts',
      'apps/dev-app/src/app/pages/react-navigation/pagination-api.ts',
    ],
    tier: 'mit',
    platform: 'react',
  },
  {
    dir: 'react/overlay',
    npm: '@oge-ui/react-overlay',
    label: 'Overlay (React)',
    summary:
      'React overlay primitives: viewport-aware anchored popups (flip + clamp, RTL-aware, shared Escape stack) and a full WAI-ARIA menu with submenus and type-ahead — running the same positioning and menu machines as the Angular overlay package.',
    // The primitives are documented through their consumers today (the
    // drop-down button demos); a dedicated React overlay page arrives with
    // the tooltip/modal/toast surfaces.
    docsRoot: '/components/buttons',
    pageDirs: [],
    apiPage: null,
    tier: 'mit',
    platform: 'react',
  },
  {
    dir: 'behavior',
    npm: '@oge-ui/behavior',
    label: 'Behavior',
    summary:
      'Framework-free interaction and accessibility layer shared by every package: popup positioning, focus trapping, the single overlay Escape stack and ref-counted body scroll locking. Installed automatically — you rarely import it directly.',
    docsRoot: null,
    pageDirs: [],
    apiPage: null,
    tier: 'mit',
  },
  {
    dir: 'react/oge',
    npm: '@oge-ui/react',
    label: 'Umbrella package (React)',
    summary:
      "Re-exports every React family from a single import path, with one stylesheet for all of them. `npm i @oge-ui/react` then `import { OgeButton, OgeTextBox } from '@oge-ui/react'`.",
    docsRoot: null,
    pageDirs: [],
    apiPage: null,
    tier: 'mit',
    platform: 'react',
  },
  {
    dir: 'ui',
    npm: 'oge-ui',
    label: 'Umbrella package',
    summary:
      "Re-exports every MIT family from a single import path. `npm i oge-ui` then `import { OgeGrid, OgeButton } from 'oge-ui'`.",
    docsRoot: null,
    pageDirs: [],
    apiPage: null,
    tier: 'mit',
  },
];

/** Package dir → entry, for `packages/<dir>/llms.txt` lookups. */
export function packageByDir(dir) {
  return PACKAGES.find((entry) => entry.dir === dir);
}
