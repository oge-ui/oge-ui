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

export const SITE_ORIGIN = 'https://www.ogeui.com';
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
 * - `platform` — `'angular'` (default), `'react'` or `'agnostic'` (a
 *   framework-free engine package, ADR 0003). Selects which "Writing OGE
 *   code" rules and which "Common mistakes" table the package's `llms.txt`
 *   carries — an engine gets neither pair, only a framework-free note. Getting this wrong ships actively misleading instructions to every
 *   coding assistant, so it is explicit rather than inferred from the name.
 * - `usage` — optional key into `USAGE_NOTES` (`lib/prose.mjs`): a framework-free
 *   package that is not an engine (`@oge-ui/locales`) carries that prose instead.
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
      'Buttons with async actions and automatic loading, click guards, hold-to-confirm, auto-repeat, badges, stand-alone toggle buttons with `aria-pressed`, button groups and drop-down/split buttons.',
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
      'Popup foundation and surfaces: flip-aware anchored placement, WAI-ARIA menus with checkbox/radio/header rows, `oge-popover` with modal and non-modal modes, tooltips with rich templates and an arrow, context menus with selector delegation and an imperative `open(x, y)`, the `oge-modal` dialog with `OgeModalService` and its promise-based `confirm()` / `alert()` / `prompt()` helpers, the non-modal `oge-window`, and `OgeToastService` notifications.',
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
      'Layout containers and loading visuals — accordion panels with single or multiple expansion, a nested panel bar and a stand-alone expansion panel, a splitter with resizable, collapsible and nestable panes, a toolbar with an overflow menu, a card content surface with attribute-slot sections, and the loading trio: progress bar (buffer/chunked/severity), circular progress ring, load-indicator spinner, shimmer skeleton and a load panel that shades a busy container (`aria-busy`), with the aria progressbar contract done right.',
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
      'Navigation controls — a tree view over flat or nested data with tri-state checkboxes, search, lazy load on demand, virtual scrolling, load-more paging, F2 label editing and drag & drop within and between trees, a drawer with built-in navigation items and touch swipe whose modality follows its layout mode (dialog when it covers the content, landmark when it shares the row), a WAI-ARIA APG menubar with nested submenus, checkbox/radio rows and a More-item or container-width hamburger overflow, an APG breadcrumb whose oldest middle crumbs collapse into an ellipsis menu against the container width while staying reachable as links, and a standalone pagination bar with a constant-width ellipsis page window, page-size selector, info range and adaptive compact mode.',
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
      'From-scratch BPMN 2.0 modeler: its own dependency-free XML + diagram-interchange engine, orthogonal routing, snapping, undo/redo, bpmnlint-style validation with a problems panel, pluggable properties providers, custom palette / context-pad entries and renderers, element templates, editable Camunda / Zeebe extensions and event payloads, a keyboard-accessible SVG canvas and no watermark.',
    docsRoot: '/components/bpmn',
    pageDirs: ['bpmn'],
    apiPage: 'apps/dev-app/src/app/pages/bpmn/api.ts',
    tier: 'commercial',
  },
  {
    dir: 'bpmn-engine',
    npm: '@oge-ui/bpmn-engine',
    label: 'BPMN Engine',
    summary:
      'Framework-free engine of the BPMN editor (ADR 0003): the diagram model, BPMN XML + DI reader/writer, JSON envelope, SVG export, orthogonal routing, snapping, alignment, modeling rules, the snapshot command stack, the validation rules (`lintBpmnDiagram`), the properties-provider / element-template / Camunda + Zeebe helpers and the editor core both the Angular and the React editor run. Installed automatically by either editor — import it directly for server-side or test pipelines.',
    docsRoot: null,
    pageDirs: [],
    apiPage: null,
    tier: 'commercial',
    platform: 'agnostic',
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
    dir: 'charts-engine',
    npm: '@oge-ui/charts-engine',
    label: 'Charts engine',
    summary:
      'Framework-free charts engine shared by the Angular and React charts: scales, series normalization, stacking, path builders with LTTB downsampling, pie and radar geometry, the cartesian/pie/polar/range-selector view models, keyboard maps, the gesture machine, the message catalog and the image exporter. Installed automatically — you rarely import it directly.',
    docsRoot: null,
    pageDirs: [],
    apiPage: null,
    tier: 'commercial',
    // no render layer of its own (ADR 0003)
    platform: 'agnostic',
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
    dir: 'kanban-engine',
    npm: '@oge-ui/kanban-engine',
    label: 'Kanban engine',
    summary:
      'Framework-free engine both Kanban render layers run: card normalization and write-back, swimlane grouping, search, drag hit-testing and auto-scroll, virtual windows, WIP arithmetic, keyboard and move machines, the edit-dialog model and the message catalog. Installed automatically with @oge-ui/kanban or @oge-ui/react-kanban.',
    docsRoot: null,
    pageDirs: [],
    apiPage: null,
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
    dir: 'locales',
    npm: '@oge-ui/locales',
    label: 'Locales',
    summary:
      "Ready-made translations of every message catalog — German, French, Spanish, Italian, Brazilian Portuguese, Turkish, Japanese, Simplified Chinese, Arabic and Hebrew — as framework-free data, one entry point per language (`import { tr } from '@oge-ui/locales/tr'`). Applied with `provideOgeLocale(tr)` from `oge-ui` or `<OgeLocaleProvider pack={tr}>` from `@oge-ui/react`; commercial families take `ogeMergeMessages(OGE_DEFAULT_<X>_MESSAGES, tr.<x>)` through their own provider.",
    docsRoot: '/getting-started/localization',
    pageDirs: ['locales'],
    // the Angular page carries the Angular wiring, the React half the
    // <OgeLocaleProvider>; the packs block is shared — this package serves
    // both layers, so its reference documents both
    apiPage: [
      'apps/dev-app/src/app/pages/locales/api.ts',
      'apps/dev-app/src/app/pages/locales/react-api.ts',
    ],
    tier: 'mit',
    platform: 'agnostic',
    // not an engine: its own "Using this package" prose (lib/prose.mjs)
    usage: 'locales',
  },
  {
    dir: 'react/buttons',
    npm: '@oge-ui/react-buttons',
    label: 'Buttons (React)',
    summary:
      'React buttons and button groups: severity/styling variants, async single-flight actions, click guarding, badges, hold-to-confirm, auto-repeat and stand-alone toggle buttons — running the same press machine and the same stylesheet as the Angular package.',
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
      'React layout containers and loading visuals: card, accordion with async expand guards and lazy content, splitter with the APG window-splitter keyboard, toolbar with an overflow menu, a nested panel bar and a stand-alone expansion panel, plus the linear and circular progress bar, load indicator, shimmer skeleton and load panel — running the same config defaults, decision functions and stylesheet as the Angular layout package.',
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
      'React navigation and wayfinding: a virtualized tree view with lazy children, checkbox tri-state, load-more paging, label editing and drag & drop between trees, a drawer with overlay/push/side modes, derived modality, navigation items and touch swipe, a linear or free stepper with async step guards, a full WAI-ARIA menubar with submenus, type-ahead, checkbox/radio rows and More overflow, a collapsing breadcrumb and a pagination bar — running the same config defaults, decision functions and stylesheet as the Angular navigation package.',
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
    dir: 'react/forms',
    npm: '@oge-ui/react-forms',
    label: 'Forms (React)',
    summary:
      'React form layout over the editors: a nested layout array of items, groups and tabbed/accordion/wizard sections, responsive container-query columns, declarative validation rules and a validation summary — running the same item model, the same rule evaluator and the same stylesheet as the Angular forms package.',
    // The React content renders inside the single Forms routes (ADR 0002:
    // routes stay single, the header switch picks the layer).
    docsRoot: '/components/forms',
    pageDirs: ['react-forms'],
    apiPage: 'apps/dev-app/src/app/pages/react-forms/api.ts',
    tier: 'mit',
    platform: 'react',
  },
  {
    dir: 'react/upload',
    npm: '@oge-ui/react-upload',
    label: 'Upload (React)',
    summary:
      'React file upload: drag & drop with directory and paste support, client-side restrictions that stay on the row with their reason, image previews and a lightbox, per-file progress with rate and ETA, chunked resumable transfer with pause, resume and retry, a pluggable transport adapter, external drop zones and triggers — running the same upload engine, list machine and stylesheet as the Angular upload package.',
    // The React content renders inside the single Upload routes (ADR 0002).
    docsRoot: '/components/upload',
    pageDirs: ['react-upload'],
    apiPage: 'apps/dev-app/src/app/pages/react-upload/api.ts',
    tier: 'mit',
    platform: 'react',
  },
  {
    dir: 'react/kanban',
    npm: '@oge-ui/react-kanban',
    label: 'Kanban (React)',
    summary:
      'React Kanban board: columns + swimlanes over a plain card array with field mapping, WIP limits, per-column virtualization, drag & drop with Escape-cancel and edge auto-scroll, Ctrl+Arrow keyboard card moving with live announcements, cancelable CRUD and move callbacks, built-in edit dialog, context menu and toolbar — running the same engine and stylesheet as the Angular Kanban package.',
    // The React content renders inside the single Kanban routes (ADR 0002).
    docsRoot: '/components/kanban',
    pageDirs: ['react-kanban'],
    apiPage: 'apps/dev-app/src/app/pages/react-kanban/api.ts',
    tier: 'commercial',
    platform: 'react',
  },
  {
    dir: 'react/charts',
    npm: '@oge-ui/react-charts',
    label: 'Charts (React)',
    summary:
      'React charts on a dependency-free SVG kernel: sixteen cartesian series types (line/spline/step/area/stacked/bar/range/scatter/bubble/candlestick), pie and doughnut, radar/polar and a range selector — time and log axes, multiple value axes, strip lines, annotations, wheel/drag zoom and pan, crosshair, shared tooltips, an interactive legend, selection, keyboard point inspection and PNG/SVG export — running the same charts engine and stylesheet as the Angular charts package.',
    // The React content renders inside the single Charts routes (ADR 0002).
    docsRoot: '/components/charts',
    pageDirs: ['react-charts'],
    apiPage: 'apps/dev-app/src/app/pages/react-charts/api.ts',
    tier: 'commercial',
    platform: 'react',
  },
  {
    dir: 'react/grid',
    npm: '@oge-ui/react-grid',
    label: 'Data Grid (React)',
    summary:
      'React data grid: data-driven columns with render props, multi-column sorting, a typed filter row with an operator menu, global search, paging, row and column virtualization, windowed remote loading, single/multiple/checkbox selection, Excel-like keyboard navigation, grouping with summaries and deferred groups, master-detail, row render props, row drag, pinned/resizable/reorderable columns, state persistence and CSV export — running the same framework-free grid engine, state slices and stylesheet as the Angular grid package.',
    // The React content renders inside the single Data Grid routes (ADR 0002).
    docsRoot: '/components/data-grid',
    pageDirs: ['react-grid'],
    apiPage: 'apps/dev-app/src/app/pages/react-grid/api.ts',
    tier: 'mit',
    platform: 'react',
  },
  {
    dir: 'react/tree-list',
    npm: '@oge-ui/react-tree-list',
    label: 'Tree List (React)',
    summary:
      'React tree list: the data-grid feature set on hierarchical data — flat parentId or nested payloads, lazy per-expansion loading with remote match discovery, ancestor-preserving filtering, recursive tri-state selection, paging over visible rows, virtualization, editing in all five modes and drag & drop reparenting — running the same framework-free tree engine, state slices and stylesheet as the Angular tree-list package.',
    // The React content renders inside the single Tree List routes (ADR 0002).
    docsRoot: '/components/tree-list',
    pageDirs: ['react-tree-list'],
    apiPage: 'apps/dev-app/src/app/pages/react-tree-list/api.ts',
    tier: 'mit',
    platform: 'react',
  },
  {
    dir: 'react/bpmn',
    npm: '@oge-ui/react-bpmn',
    label: 'BPMN Editor (React)',
    summary:
      'React BPMN 2.0 modeler: palette click-then-place and drag-to-canvas, context pad, inline label editing, orthogonal routing, snapping with guides, pools and lanes, boundary events and sub-processes, properties panel, minimap, element search, align/distribute, clipboard, snapshot undo/redo, BPMN XML + JSON + SVG + PNG export, live validation, properties providers, custom palette / context-pad entries and renderers, element templates and Camunda / Zeebe editing, and overlays on a keyboard-accessible canvas — running the same framework-free engine and editor core (`@oge-ui/bpmn-engine`) and the same stylesheet as the Angular editor. No watermark.',
    // The React content renders inside the single BPMN routes (ADR 0002).
    docsRoot: '/components/bpmn',
    pageDirs: ['react-bpmn'],
    apiPage: 'apps/dev-app/src/app/pages/react-bpmn/api.ts',
    tier: 'commercial',
    platform: 'react',
  },
  {
    dir: 'react/overlay',
    npm: '@oge-ui/react-overlay',
    label: 'Overlay (React)',
    summary:
      'React overlay surfaces: viewport-aware anchored popups (flip + clamp, RTL-aware, shared Escape stack), a full WAI-ARIA menu with submenus and type-ahead, a popover, accessible tooltips with rich content, a right-click context menu with selector delegation, a modal dialog with async close guards, drag/resize, an imperative provider and confirm/alert/prompt helpers, a non-modal window, and stacked toasts with pause-on-hover timers, coalescing and promise morphing — running the same machines and stylesheet as the Angular overlay package.',
    // The React content renders inside the single Overlay routes (ADR 0002).
    docsRoot: '/components/overlay',
    pageDirs: ['react-overlay'],
    apiPage: 'apps/dev-app/src/app/pages/react-overlay/api.ts',
    tier: 'mit',
    platform: 'react',
  },
  {
    dir: 'behavior',
    npm: '@oge-ui/behavior',
    label: 'Behavior',
    summary:
      'Framework-free interaction and accessibility layer shared by every package: popup positioning, focus trapping, the single overlay Escape stack, ref-counted body scroll locking and the one writing-direction helper every component resolves RTL through (`ogeIsRtl`, `ogeResolveDirection`, `observeDirection` — SSR-safe). Installed automatically — you rarely import it directly.',
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
  {
    dir: 'scheduler-engine',
    npm: '@oge-ui/scheduler-engine',
    label: 'Scheduler engine',
    summary:
      'Framework-free engine behind both scheduler render layers (ADR 0003): view-model builders, the transitive-overlap column layout, lane packing, the RFC 5545 RRULE-subset parser and expander, gesture math, keyboard maps, the editing/recurrence/CRUD core (`OgeSchedulerCore`), default config and message catalog. Installed automatically with `@oge-ui/scheduler` or `@oge-ui/react-scheduler` — you rarely import it directly.',
    docsRoot: null,
    pageDirs: [],
    apiPage: null,
    tier: 'commercial',
    platform: 'agnostic',
  },
  {
    dir: 'react/scheduler',
    npm: '@oge-ui/react-scheduler',
    label: 'Scheduler (React)',
    summary:
      'React scheduler / event calendar: day, work-week, week, month, agenda, timeline and year views, all-day strip, pure-kernel overlap layout, drag & resize with Escape-cancel, drag-to-create, recurrence with occurrence-vs-series editing, resource grouping, reminders, an appointment popup and a form editor — running the same scheduler engine and stylesheet as the Angular scheduler package.',
    // The React content renders inside the single Scheduler routes (ADR 0002).
    docsRoot: '/components/scheduler',
    pageDirs: ['react-scheduler'],
    apiPage: 'apps/dev-app/src/app/pages/react-scheduler/api.ts',
    tier: 'commercial',
    platform: 'react',
  },
  {
    dir: 'pivot-engine',
    npm: '@oge-ui/pivot-engine',
    label: 'Pivot Engine',
    summary:
      'Framework-free pivot grid engine shared by @oge-ui/pivot and @oge-ui/react-pivot (ADR 0003): field layout, header layout and virtualization math, the remote-store adapter, menus, value filters, the field chooser, keyboard navigation, persistence snapshots, the message catalog and the Excel workbook builder. Installed automatically — you rarely import it directly.',
    docsRoot: null,
    pageDirs: [],
    apiPage: null,
    tier: 'commercial',
    platform: 'agnostic',
  },
  {
    dir: 'react/pivot',
    npm: '@oge-ui/react-pivot',
    label: 'Pivot Grid (React)',
    summary:
      'React pivot grid: local rows or a remote pre-aggregated store, four drag & drop field areas, multi-level column headers, expand/collapse on both axes, sub and grand totals, display modes and running totals, header and measure menus, value filters, a field chooser, two-axis virtual scrolling, state persistence and CSV/Excel export — running the same framework-free pivot engine (@oge-ui/pivot-engine) and the same stylesheet as the Angular pivot package.',
    // The React content renders inside the single Pivot Grid routes (ADR 0002).
    docsRoot: '/components/pivot-grid',
    pageDirs: ['react-pivot'],
    apiPage: 'apps/dev-app/src/app/pages/react-pivot/api.ts',
    tier: 'commercial',
    platform: 'react',
  },
  {
    dir: 'gantt-engine',
    npm: '@oge-ui/gantt-engine',
    label: 'Gantt engine',
    summary:
      'Framework-free engine behind the Angular and React Gantt (ADR 0003): task-tree model and field mapping, calendar-true time scales, auto-scheduling, critical path, dependency routing, the OgeGanttCore controller, message catalogs and the Excel/PDF/PNG export builders. Installed automatically by @oge-ui/gantt and @oge-ui/react-gantt — you rarely import it directly.',
    docsRoot: null,
    pageDirs: [],
    apiPage: null,
    tier: 'commercial',
    platform: 'agnostic',
  },
  {
    dir: 'react/gantt',
    npm: '@oge-ui/react-gantt',
    label: 'Gantt (React)',
    summary:
      'React Gantt chart: virtualized task tree pane + timeline chart, summary/milestone/baseline bars, FS/SS/FF/SF dependency arrows, critical path, auto-scheduling on work calendars, resources and workload, drag editing with Escape-cancel, snapshot undo/redo, built-in context menu and task dialog, Excel/PDF/PNG export — running the same @oge-ui/gantt-engine controller and stylesheet as the Angular Gantt package.',
    // The React content renders inside the single Gantt routes (ADR 0002).
    docsRoot: '/components/gantt',
    pageDirs: ['react-gantt'],
    apiPage: 'apps/dev-app/src/app/pages/react-gantt/api.ts',
    tier: 'commercial',
    platform: 'react',
  },
];

/** Package dir → entry, for `packages/<dir>/llms.txt` lookups. */
export function packageByDir(dir) {
  return PACKAGES.find((entry) => entry.dir === dir);
}
