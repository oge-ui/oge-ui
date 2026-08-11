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
