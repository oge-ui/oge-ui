# OGE workspace — architecture & conventions

Single source of truth for how this workspace is organized and how new code must be written.
New to the codebase? Start here — this page answers most "where does X live
/ how do we do Y" questions before you have to dig through the sources.

## Stack

Nx 23 / Angular 22 / TypeScript 6 / npm. Tests: **vitest** (no Jest/Karma). E2e: Playwright + axe.
CI (`.github/workflows/ci.yml`): `npx nx run-many -t lint test build typecheck e2e` + `nx format:check`.

## Packages

| Project            | Path                        | npm                        | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | --------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `behavior`         | `packages/behavior`         | `@oge-ui/behavior`         | Framework-free interaction/a11y layer: popup positioning, focus trap, the single overlay Escape stack, ref-counted scroll lock, and the one pointer-gesture machine every drag runs on (`lib/gesture/`: long press, `touch-action`, edge auto-scroll, pointer drag & drop). `core`'s sibling — same `platform:agnostic` rules, same `@nx/rollup` build, but jsdom specs because it touches the DOM. `overlay` re-exports its primitives for backward compatibility.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `upload`           | `packages/upload`           | `@oge-ui/upload`           | File uploader. Selection (dialog, drag & drop including dropped folders, paste), restrictions that stay on the row with their reason, image previews over an owned `ObjectUrlRegistry`, and transfers through a pluggable `OgeUploadAdapter` — XHR by default, because `xhr.upload.onprogress` is the only API reporting request-body progress. Chunked and resumable transfer, concurrency, batching, abort and retry live in a framework-free `src/lib/engine/` (`UploadQueue` is a plain non-reactive class), which is the `@oge-ui/behavior` seed. Forms three ways at once; the restrictions attach to the bound control as a plain `ValidatorFn`, never `NG_VALIDATORS` — that token next to a `self`-injected `NgControl` is a real DI cycle. Depends on `core` and `layout` (the progress bar).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `core`             | `packages/core`             | `@oge-ui/core`             | Framework-free TS data engine (DataSource, filtering, virtualization math). **No Angular imports — lint-enforced.** Built with `@nx/rollup`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `grid`             | `packages/grid`             | `@oge-ui/grid`             | Data grid. Secondary entries: `/foundation`, `/export-excel`, `/export-pdf`. Owns the design tokens and theme CSS. Depends on `inputs` (editors: one `OgeCellEditor` renders the dataType-matched `oge-*-box` in the compact `size=sm` shape; `.oge-editor` host class is load-bearing) and `overlay` (header filter / chooser / operator + context menus run on `OgeAnchoredPanel` + `oge-menu-list`; the edit-popup and filter-builder dialogs run on `oge-modal`; the canonical `OgeMenuItem` is re-exported from the barrel), plus `forms` (the `form`/`popup` edit surfaces render `<oge-form>`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `tree-list`        | `packages/tree-list`        | `@oge-ui/tree-list`        | Depends on grid, re-exports its column/template API. Secondary entries `/export-excel`, `/export-pdf`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pivot`            | `packages/pivot`            | `@oge-ui/pivot`            | Pivot grid on top of `core`'s PivotEngine. Commercial. A thin Angular seam over `pivot-engine`'s `OgePivotGridCore`; fields arrive as `<oge-pivot-field>` children and/or the `[fields]` data twin.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `pivot-engine`     | `packages/pivot-engine`     | `@oge-ui/pivot-engine`     | **Commercial engine (ADR 0003).** Framework-free like `core`/`behavior` (`platform:agnostic`, rollup, jsdom specs) but under pivot's commercial LICENSE: `OgePivotGridCore` (field layout, remote loads, header layout, virtualization windows, cell text, keyboard, drag & drop, menus, value filter, chooser, persistence snapshot, CSV), `OgePivotStateCore`, the pure helpers (calculated fields, label / value / Top-N member filters, row-header layouts, the `toChartSeries` chart adapter), the message catalog, `/export-excel`'s `buildPivotWorkbook` and `/export-pdf`'s `buildPivotPdfDocument`. Both pivot render layers depend on it; neither MIT umbrella does. Manifest `platform: 'agnostic'` — its `llms.txt` carries no framework's rules.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `bpmn`             | `packages/bpmn`             | `@oge-ui/bpmn`             | Commercial BPMN 2.0 modeler (Angular): `oge-bpmn-editor` (`role="application"` canvas), palette and properties panel — thin templates over `@oge-ui/bpmn-engine`'s `OgeBpmnEditorCore` through a local signal adapter. Depends only on the engine package.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `bpmn-engine`      | `packages/bpmn-engine`      | `@oge-ui/bpmn-engine`      | **Commercial engine (ADR 0003)**, `platform:agnostic`, rollup, dependency-free: model, geometry, XML + DI reader/writer, JSON/SVG, routing, rules, commands, command stack, plus the editor core both BPMN layers run (tools, gestures, keyboard map, view models, autosave, public API), the properties-panel view model, the palette key map, the message catalog and `resolveOgeBpmnConfig`. `@oge-ui/bpmn-engine/testing` ships the sample documents.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `scheduler`        | `packages/scheduler`        | `@oge-ui/scheduler`        | Commercial scheduler / event calendar: framework-free `engine/` (view-model builders, transitive-overlap column layout, lane packing, RRULE-subset parser, gesture math) + `oge-scheduler` (day/week/month `role="grid"` views, all-day strip, drag/resize with Escape-cancel, `OgeAnchoredPanel` appointment popup, `OgeForm` editor dialog). Deliberately a _consumer_ of the MIT suite: depends on `core`, `overlay`, `inputs` (transitively) and `forms` — the opposite stance to `bpmn`, because the composition is the selling point.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `scheduler-engine` | `packages/scheduler-engine` | `@oge-ui/scheduler-engine` | Commercial (ADR 0003), `platform:agnostic`, rollup + vitest like `core`: everything both scheduler render layers share — layout kernels, RRULE, gesture math + the pointer-gesture machine, keyboard maps as pure decisions, per-view view-model builders, editor mapping + default form items, the message catalog, and `OgeSchedulerCore` (shell machine over an `OgeReactivityAdapter`). Depends on `core` + `behavior` (MIT) only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `gantt`            | `packages/gantt`            | `@oge-ui/gantt`            | Commercial Gantt chart: `oge-gantt` is a thin signal seam over `OgeGanttCore` from `@oge-ui/gantt-engine` (ADR 0003) — (virtualized treegrid pane + timeline chart, drag editing, undo/redo, task dialog). Like the scheduler, a deliberate consumer of the MIT suite (`core`, `overlay`, `inputs`, `forms`). Lazy secondary entries: `/export-excel`, `/export-pdf`, `/export-image`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `gantt-engine`     | `packages/gantt-engine`     | `@oge-ui/gantt-engine`     | **Commercial engine package (ADR 0003).** Framework-free like `core`/`behavior` (rollup, `platform:agnostic`, jsdom specs) but under the Gantt's commercial LICENSE: the kernel (tree model + field mapping, time scales, auto-scheduling, critical path, dependency routing, workload, gesture math), the pointer-gesture machine, the message catalog + `resolveGanttConfig`, the public types and `OgeGanttCore` — the whole controller on an `OgeReactivityAdapter` — plus `/export-excel`, `/export-pdf`, `/export-image` builders (optional peers). Both Gantt render layers depend on it; depends only on `core` + `behavior`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `kanban`           | `packages/kanban`           | `@oge-ui/kanban`           | Commercial Kanban board: framework-free `engine/` (board model + write-back, drag hit-testing, per-column virtual windows, WIP arithmetic) + `oge-kanban` (columns/swimlanes, WIP limits with drag previews, drag & drop with Escape-cancel and edge auto-scroll, Ctrl+Arrow keyboard card moving with live announcements, built-in `OgeForm` dialog + context menu + toolbar). Columns are labeled `role="list"`s of `listitem`-wrapped, roving-focus cards (`role="group"` + `aria-roledescription`), not a listbox — no APG kanban pattern exists, and options cannot hold the quick-action buttons and template controls, which stay Tab-reachable in the column's stop card (`syncKanbanCardTabStops`). A consumer of the MIT suite: `core`, `overlay`, `forms` (transitively `inputs`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `kanban-engine`    | `packages/kanban-engine`    | `@oge-ui/kanban-engine`    | **Commercial, framework-free** (ADR 0003): the Kanban engine both render layers run — board model + write-back, drag math, virtual windows, WIP, the pointer-gesture machine, the board view model, keyboard/move machines, DOM readers, the edit-dialog model and the message catalog. `platform:agnostic`, rollup build like `core`, jsdom specs; depends on `core` and `behavior`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `react-kanban`     | `packages/react/kanban`     | `@oge-ui/react-kanban`     | **React, commercial.** `<OgeKanban>` + `<OgeKanbanConfigProvider>` over `kanban-engine`; a versioned external store (`useSyncExternalStore`) holds the board state so ref-handle calls read it synchronously. The edit dialog is `react-overlay`'s modal + `react-forms`. Not in the MIT `@oge-ui/react` umbrella.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `charts`           | `packages/charts`           | `@oge-ui/charts`           | Commercial charts: dependency-free SVG rendering over a pure kernel; cartesian series (rotated, panes, constant lines, breaks, RTL) + pie/doughnut, polar, gauges, bullet, funnel, heatmap, treemap, sunburst, Sankey and a GeoJSON vector map, zoom & pan (pinch too), crosshair, tooltips, legend. Depends only on `core` and `overlay`. Lazy secondary entries: `/export-image`, `/export-pdf` (optional `jspdf` peer); `/sparkline` (never loads the cartesian chart) over the `/config` base entry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `charts-engine`    | `packages/charts-engine`    | `@oge-ui/charts-engine`    | **Commercial engine (ADR 0003).** The charts family's framework-free half, shared by both render layers: the kernel (scales, series model/layout, path builders, LTTB, pie/polar geometry, zoom math, hit-testing), the staged view-model builders (`buildCartesianData` → `buildCartesianScene` → hover helpers; pie, polar, range selector), keyboard maps, the gesture machine, the size observer, the message catalog + merge rules, the pure analytics (`ogeSma`/`ogeEma`/`ogeBollingerBands`/`ogeMacd`/`ogeRsi`/`ogeTrendline`/`ogeBoxStats`/`ogeHistogramBins`), `printOgeChart` and the `/export-image` + `/export-pdf` entries (the latter is the only module importing the optional peers `jspdf` and `@oge-ui/behavior`). `platform:agnostic`, rollup like `core`, jsdom specs. Commercial LICENSE — never merged into MIT `behavior`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `buttons`          | `packages/buttons`          | `@oge-ui/buttons`          | Button family (OgeButton, OgeButtonGroup, OgeDropDownButton) plus the `@oge-ui/buttons/fab` secondary entry (OgeFab, OgeSpeedDial — the family's first per-component entry; it draws its own `<button>` because importing the primary would be a cycle). Depends on `overlay`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `overlay`          | `packages/overlay`          | `@oge-ui/overlay`          | Anchored popup primitives: `resolvePopupPosition` (incl. centered bare-side placements), `OgeAnchoredPanel` (virtual `anchorRect`, `transient` mode), `oge-popup`, `oge-menu-list` + canonical `OgeMenuItem` (an `items` field on any item makes the row a submenu parent — the list opens nested levels itself, one panel per level on the shared Escape stack, absorbing `'escape'`/`'back'` per level and chaining `'select'`/`'tab'` to the root owner, so every consumer nests for free), and the `ogeTooltip` / `[ogeContextMenu]` directives (body-appended via `createComponent`; host element must be removed manually on destroy). Plus `oge-modal` (centered/top dialog: focus trap, ref-counted scroll lock, async `closeGuard`, typed `close(result)`, opt-in drag/resize/fullscreen/`inertBackground`) — all open surfaces share the internal `overlay-stack.ts` so Escape always closes the topmost (popup inside modal closes first). The declarative modal renders inline where declared: keep it away from `transform`ed ancestors; `OgeModalService.open()` is the body-appended imperative escape hatch (`OGE_MODAL_DATA` + `OgeModalRef`). `OgeToastService` (service-only) renders body-appended toast regions and speaks through the shared `OgeLiveAnnouncer`; toasts never take focus and never join the Escape stack, and their timers pause on hover/focus/tab-hidden with remaining-time resume. `OgeActionSheet` (W8d) is the bottom sheet of actions: a body-portaled modal dialog holding an APG menu, on `behavior`'s `OgeActionSheetCore`. The modal/toast/popover/action-sheet strings own the config's `messages` entries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `inputs`           | `packages/inputs`           | `@oge-ui/inputs`           | Form editors (OgeTextBox — with an optional `mask` — / OgeMaskedTextBox / OgeTextArea / OgeNumberBox), choice groups (OgeCheckBoxGroup, OgeToggleGroup), colour editors (OgeColorBox, OgeColorGradient, OgeColorPalette over the internal `color-parts` base entry), dropdown editors (OgeSelectBox/OgeTagBox/OgeAutocomplete), bare toggle controls (OgeCheckBox/OgeSwitch/OgeRadioGroup), date editors (OgeCalendar/OgeDateBox/OgeDateRangeBox) and the APG sliders (OgeSlider/OgeRangeSlider — bare controls on `OgeControlBase`; drag via the splitter's gesture idiom with Escape-to-cancel, arithmetic in core's `slider-math.ts`; the range pair deliberately omits the `FormValueControl` clause because the contract's `min`/`max` typing is `NonNullable<TValue>`, while runtime `[formField]` binding still works). Base split: `OgeControlBase` (chrome-free — commit pipeline, CVA constructor-assignment, Signal Forms `FormValueControl`) → `OgeInputBase` (adds the field chrome). Dropdown editors share `lib/select-list/` (`SelectListEngine`, `SelectPanelController`, `ListVirtualizerModel` on core's `OffsetTree`, `expr.ts` resolvers). **Date convention:** native `Date` + `Intl` only — no date library, no `DateAdapter`; all day math goes through core's `date-utils.ts` (local construction, never `Date.parse`/`toISOString`); typed text parses via `formatToParts` part order; the calendar popup uses real DOM focus (APG date-picker-dialog), not `aria-activedescendant`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `tabs`             | `packages/tabs`             | `@oge-ui/tabs`             | Tab family: `OgeTabs` (stand-alone strip), `OgeTabPanel` (strip + content), declarative `OgeTab` children merged with a data-driven `items` input (children first — ButtonGroup precedent). Internal `oge-tab-strip` presentational component owns keyboard (APG roving tabindex, automatic/manual activation), overflow arrows, the all-tabs menu (depends on `overlay`: `OgeAnchoredPanel` + `oge-menu-list`) and drag reorder; the shared abstract `OgeTabsBase` directive owns the models and the cancelable selection/close/reorder pipelines. Per-tab async `closeGuard` follows the modal's guard semantics (single-flight, rejection = veto); the app removes closed tabs on `tabClosed`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `layout`           | `packages/layout`           | `@oge-ui/layout`           | Layout containers. Today `OgeAccordion` + declarative `OgeAccordionItem` (WAI-ARIA APG accordion: heading-wrapped `<button>` headers, all in the Tab sequence, opt-in arrow/Home/End/type-ahead, single/multiple + `collapsible`, lazy render, async `expandGuard`, invalid-section indicator, per-panel async `contentLoader` with skeleton/retry, header-actions slot) and `OgeSplitter` + declarative `OgeSplitterPane` (WAI-ARIA APG **window splitter**: focusable `role="separator"` tracks in one CSS grid, `fr`-ratio sizing with `'<n>px'`/`'<n>%'` escape hatches, arrow/Home/End/Enter, collapse-to-`inert`, pointer capture + `touch-action: none`, self-recursive nesting) and `OgeToolbar` + declarative `OgeToolbarItem` (WAI-ARIA APG **toolbar**: `role="toolbar"`, roving tabindex over its own buttons _and_ projected controls, before/center/after groups, three projection slots, and an overflow menu built on `overlay`s `OgeAnchoredPanel` + `oge-menu-list` — the "which items fit" arithmetic is core's pure `fitToolbarItems`, so it is unit-tested without a DOM) and `OgeCard` (a content surface with attribute-slot sections — `[ogeCardMedia]`/`[ogeCardActions]`/`[ogeCardFooter]`/`[ogeCardAvatar]`/`[ogeCardHeaderActions]`/`[ogeCardSeparator]` — `stylingMode` outlined/raised/filled/flat on the `--oge-shadow-card` token, `size` density, a `severity` rail, an `aria-busy` `loading` skeleton and a visual-only `interactive` lift; **no role and no clickable input**, because no ARIA card pattern exists — the stretched-link pattern is documented instead) and the loading trio `OgeProgressBar` / `OgeLoadIndicator` / `OgeSkeleton` (canonicalizing the hand-drawn spinners and shimmers the suite carried; `role="progressbar"` with `aria-valuenow` omitted in the indeterminate state, reduced motion slows the indeterminate animations rather than freezing them, the skeleton is always `aria-hidden` decoration — the loading region owns `aria-busy`; grid's filler-row class became `.oge-grid-skeleton` so the canonical component owns `.oge-skeleton`). Since W8a also the display and feedback set, one entry each: `OgeAvatar` + `OgeAvatarGroup`, `OgeBadge`, `OgeChip` + `OgeChipList`, `OgeAlert`, `OgeTimeline` and `OgeAppBar` (see **Layout and feedback components (W8a)**), and since W8d the collection and dashboard set: `OgeCarousel` + `OgeCarouselSlide`, `OgeListView`, `OgeDataView` and `OgeTileLayout` + `OgeTileLayoutItem` (see **Carousel, action sheet, list / data view and tile layout (W8d)**). Depends on `core` and, since the toolbar, `overlay`. |
| `forms`            | `packages/forms`            | `@oge-ui/forms`            | Form layout over the `inputs` editors: `OgeForm` (+ renderless `OgeFormItem` / `OgeFormGroup` config children, merged through the shared `OgeFormNode` query token so one query keeps document order) and `OgeValidationSummary`. Three binding modes on one component — `[fieldTree]` (Signal Forms), `[formGroup]` (reactive), `[(formData)]` (plain model, over an internally owned `form()`); the mode is **derived**, never configured. **Validation is Angular's Signal Forms, full stop**: `validationRules` compiles to a schema (`schema-from-rules.ts`), so there is no second engine. Responsive columns are `@container` queries on the form's own inline size, not window width. Sections (`<oge-form-tabs>` / `<oge-form-accordion>` / `<oge-form-steps>`) **wrap** `tabs`, `layout` and `navigation` rather than copying them, and a failed submit reveals the section holding the first invalid field. `createMetadataKey()`-based `OGE_FORM_*` keys let a Signal Forms schema carry its own layout, so `<oge-form [fieldTree]>` can need no items at all. Depends on `inputs`, `tabs`, `layout` and `navigation`. **`grid` and `tree-list` render `<oge-form>` for `editing.mode: 'form'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 'popup'`** — that duplication is retired; `renderFormElement: false`is what makes it legal, because nested`<form>` elements are invalid HTML. |
| `navigation`       | `packages/navigation`       | `@oge-ui/navigation`       | Navigation controls. Today `OgeTreeView` (WAI-ARIA APG treeview: roving tabindex, Right/Left open-child / close-parent semantics, type-ahead, `*`; flat **or** nested data; tri-state cascade checkboxes; search; lazy `loadChildren`; virtual scrolling; drag & drop reparenting). The tree needed no new data code — core's `lib/tree/` engine was already there from tree-list. Also `OgeDrawer` (overlay/push/side, with modality derived from the mode), `OgeStepper` + `OgeStep` (no APG stepper pattern exists, so an ordered list of `<button>` headers carrying `aria-current="step"` with `role="region"` panels — one semantic in both orientations, unlike Material) and `OgeMenubar` + nestable `OgeMenubarItem` (WAI-ARIA APG **menubar**: roving tabindex over the bar, submenus at every depth are `overlay`'s `oge-menu-list` recursion; `openMode` click/hover applies to the top level only; `compactBelow` collapses the whole bar into a hamburger via core's pure `resolveMenubarCompact` — container width, never the window; `url` items render as real links and `activeKey` drives `aria-current="page"`, because no package takes a router dependency) and `OgeBreadcrumb` + flat `OgeBreadcrumbItem` (WAI-ARIA APG **breadcrumb**: a `<nav>` landmark with an `<ol>` of real links, `aria-current="page"` on the non-interactive last crumb, and — deliberately — **no roving tabindex**, because the APG defines no keyboard behavior for it; `collapseMode: 'auto'` folds the oldest middle crumbs into an ellipsis menu via core's `fitToolbarItems` against the **container** width, and the collapsed crumbs stay reachable as links). Depends on `core` and, since the drawer, `overlay`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `locales`          | `packages/locales`          | `@oge-ui/locales`          | MIT ready-made translations: one typed `OgeLocalePack` per language (de, fr, es, it, pt-BR, tr, ja, zh-CN, ar, he), each its own rollup entry (`@oge-ui/locales/tr`, `package.json` `exports`), plus `ogeMergeMessages` and the lazy `ogeLocalePacks` map in the primary entry. `platform:agnostic`, no runtime dependencies — catalog types come from `behavior` and the commercial engines via `import type` (optional peers; see **Licensing**). Wired by `provideOgeLocale()` (`ui`) and `<OgeLocaleProvider>` (`react-oge`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `ui`               | `packages/ui`               | `oge-ui`                   | Umbrella: pinned deps on every family + a re-export barrel (`export *` is this package's sanctioned exception; name collisions resolved by explicit re-export - see `src/index.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `react-overlay`    | `packages/react/overlay`    | `@oge-ui/react-overlay`    | **React.** The whole overlay family on `@oge-ui/behavior`: `useAnchoredPanel` + `<OgePopup>`, `<OgeMenuList>` (nested submenus, type-ahead), `<OgeTooltip>`, `<OgeContextMenu>`, `<OgeModal>` + `OgeModalProvider` (async close guards, drag/resize, focus trap), `<OgeToastRegion>` + `useOgeToast` (stacking, pause-on-hover, coalescing, promise morphing), `<OgeActionSheet>`, `<OgeOverlayConfigProvider>`. Same machines, same stylesheet as the Angular overlay.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `react-inputs`     | `packages/react/inputs`     | `@oge-ui/react-inputs`     | **React.** The full editor set (20 components) on one field chrome, driven by `@oge-ui/behavior`'s input commit, select-list, virtualizer, calendar/date/date-segment/number/slider/color/mask/choice-group machines. `<OgeInputsConfigProvider>`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `react-tabs`       | `packages/react/tabs`       | `@oge-ui/react-tabs`       | **React.** `<OgeTabs>` + `<OgeTabPanel>` on the shared tab machine (APG activation, overflow, closable tabs with async guards, drag reorder, lazy panels).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `react-layout`     | `packages/react/layout`     | `@oge-ui/react-layout`     | **React.** Card, accordion, splitter, toolbar (`before`/`center`/`after` slots + overflow), progress bar, load indicator, skeleton, avatar + avatar group, badge, chip + chip list, alert, timeline, app bar, carousel, list view, data view, tile layout — on the layout cores in `behavior`. Also depends on `core` (plural messages, type-ahead).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `react-navigation` | `packages/react/navigation` | `@oge-ui/react-navigation` | **React.** Tree view (virtualized), drawer, stepper, menubar, breadcrumb, pagination — on the navigation cores in `behavior`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `react-forms`      | `packages/react/forms`      | `@oge-ui/react-forms`      | **React.** `<OgeForm>` over the React editors: a nested `layout` array (the one API shape that differs from Angular's projected children), the shared item model, rule evaluator and layout math from `behavior`, `<OgeValidationSummary>`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `react-upload`     | `packages/react/upload`     | `@oge-ui/react-upload`     | **React.** `<OgeFileUploader>` (+ `<OgeUploadDropZone>`, `<OgeUploadTrigger>`, config + transport providers) over `behavior`'s upload engine and `OgeFileUploaderCore` — the same list machine the Angular uploader is a seam over.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `react-bpmn`       | `packages/react/bpmn`       | `@oge-ui/react-bpmn`       | **React, commercial.** `<OgeBpmnEditor>` + `<OgeBpmnConfigProvider>` over the same `OgeBpmnEditorCore` (a versioned rx adapter); styles are the Angular SCSS. Not in the MIT `@oge-ui/react` umbrella.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `react-grid`       | `packages/react/grid`       | `@oge-ui/react-grid`       | **React.** `<OgeGrid>` + `<OgePager>` over the grid engine in `behavior` (`OgeGridStateCore`, `OgeGridDataCore`, column resolver, row/column virtualizers, keyboard, persistence, deferred-children cores) and `core`'s data sources. Ships **in slices** (A: sort/filter/search/paging/virtualization/selection/keyboard/persistence/CSV; B: grouping + summaries + deferred groups, master-detail, row render props, row drag, column reorder; C editing and D header filter/builder/chooser/context menus pending) — the phase table and recorded exceptions live in `docs/REACT-PARITY.md`. Depends on `react-inputs` (filter-row editors), `react-layout` (toolbar) and `react-overlay` (operator menu). Its `styles.scss` compiles the Angular grid's SCSS plus `packages/grid/src/lib/pager/pager.scss`, which the Angular pager also loads — one pager stylesheet, two render layers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `react-tree-list`  | `packages/react/tree-list`  | `@oge-ui/react-tree-list`  | **React.** `<OgeTreeList>` over `@oge-ui/behavior`'s `OgeTreeListCore` — the tree model the Angular tree list was rewired onto (index, expansion polarity, ancestor-preserving filtering, lazy children, remote match discovery, recursive selection, paging, reparenting, export shape) — plus the grid engine. Builds on `@oge-ui/react-grid/foundation` (editing bridge, rx adapter, filter-builder editor) the way the Angular tree list builds on `@oge-ui/grid/foundation`; columns are `OgeGridColumnProps`. Secondary entry `/export-excel`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `react-charts`     | `packages/react/charts`     | `@oge-ui/react-charts`     | **React, commercial.** `<OgeChart>`, `<OgePieChart>`, `<OgePolarChart>`, `<OgeRangeSelector>`, `<OgeChartsConfigProvider>` and the `/export-image` entry over `@oge-ui/charts-engine` — the same view models the Angular charts draw, so `chart.scss` styles both. Inline JSX options go through a structural `useStable` so a hover render never rebuilds a 50k-point scene; wheel zoom uses a non-passive native listener (React's is passive). Not in the MIT `@oge-ui/react` umbrella.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `react-scheduler`  | `packages/react/scheduler`  | `@oge-ui/react-scheduler`  | **React, commercial.** `<OgeScheduler>` + `<OgeSchedulerConfigProvider>` over `@oge-ui/scheduler-engine`; composes `react-overlay` (popup, modal), `react-inputs` (navigator calendar) and `react-forms` (editor). Never in the MIT `@oge-ui/react` umbrella.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `react-pivot`      | `packages/react/pivot`      | `@oge-ui/react-pivot`      | **React, commercial.** `<OgePivotGrid>` (a `fields` array for the Angular children, a `ref` handle, `<OgePivotMessagesProvider>`, `/export-excel`) over `pivot-engine`'s core, compiling the Angular pivot SCSS verbatim. Depends on `react-grid` only for `useOgeGridStateStorage` — the storage seam the Angular pivot takes from the grid's `OGE_STATE_STORAGE`. Its reactivity adapter tracks dependencies per derived value (props enter as quiet input cells) instead of invalidating everything per render, because the pivot's data-dependent phase is one pass over every row and must not re-run on scroll. Not part of the MIT `@oge-ui/react` umbrella.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `react-gantt`      | `packages/react/gantt`      | `@oge-ui/react-gantt`      | **React, commercial.** `<OgeGantt>` over the same `OgeGanttCore` the Angular Gantt runs; task dialog on `react-overlay`'s modal + `react-forms`; `<OgeGanttConfigProvider>`; export entries take the `ref` handle. Never part of the MIT `@oge-ui/react` umbrella.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `react-oge`        | `packages/react/oge`        | `@oge-ui/react`            | **React umbrella.** Pinned deps on every `react-*` family, `export *` barrel (collisions resolved by explicit named re-exports) and one combined `styles.css`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `react-buttons`    | `packages/react/buttons`    | `@oge-ui/react-buttons`    | **React.** `OgeButton` + `OgeButtonGroup` on `@oge-ui/behavior`'s `OgeButtonPress` — the same machine the Angular button runs — plus `OgeDropDownButton` over `@oge-ui/react-overlay` (full family parity: lazy items, split mode, rememberLastAction, renderContent). Vite lib build (`index.js`/`index.cjs` + rolled-up `index.d.ts`), and `styles.css` compiled from the Angular package's SCSS, so there is no second stylesheet. Config arrives by context (`OgeButtonsConfigProvider`) instead of DI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `dev-app`          | `apps/dev-app`              | —                          | Docs/demo site (port 4200, Tailwind v4). **One site for every framework** (ADR 0002): a global header switch picks the render layer, `FrameworkService.COVERAGE` is the single source of what exists where, and React demos mount inside Angular pages via `shared/react-host.ts`. React packages' docs live in their own page dirs (`pages/react-buttons/`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `dev-app-e2e`      | `apps/dev-app-e2e`          | —                          | Playwright (chromium) + `@axe-core/playwright`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

All component libs are buildable + publishable (ng-packagr via `@nx/angular:package`, APF partial-Ivy),
`publishConfig.access: public`, Angular `>=22.0.0 <24.0.0` peers, `sideEffects: false`. Versions are
tag-driven (`nx release`); don't hardcode them in docs.

## Platform layering (Angular + React)

The suite is growing a **React render layer beside the Angular one**, over a shared
framework-free substrate — the Kendo pattern (separate native implementations, shared
utilities and themes), with the shared layer pushed deeper, to component _behaviour_, the
way Zag.js does. Full rationale, rejected alternatives and the phase plan:
[`docs/adr/0001-multi-framework-strategy.md`](adr/0001-multi-framework-strategy.md).

Four layers, the first three single-sourced:

| Layer                   | Tag                 | Contains                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@oge-ui/core`          | `platform:agnostic` | Data: DataSource, filtering, grouping, pivot, virtualization arithmetic.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `@oge-ui/behavior`      | `platform:agnostic` | Interaction + a11y: positioning, focus trap, the overlay Escape stack, scroll lock — and, as each family was split, the input/select/calendar machines, the layout/tabs/navigation cores, the form model + rule evaluator, the upload engine, the overlay tooltip/modal/toast cores and the whole grid engine (state slices, data core, column resolver, virtualizers, keyboard, persistence, deferred children, config + option vocabulary). Every machine takes an `OgeReactivityAdapter` (signals in Angular, a versioned store in React). |
| `@oge-ui/themes`        | `platform:agnostic` | The SCSS. **Not extracted yet** — still in `packages/grid/src/lib/styles/`; shared verbatim when it moves, because the styles are already global `.oge-*` classes.                                                                                                                                                                                                                                                                                                                                                                            |
| `packages/<name>`       | `platform:angular`  | Angular templates + bindings.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `packages/react/<name>` | `platform:react`    | React components. Published as `@oge-ui/react-<name>`; Angular keeps the unprefixed names.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `tools/<name>`          | `platform:agnostic` | Build-time scripts (docs generators, `ng add` schematics). Framework-free like the rest of the substrate; only their specs are exempt, where @angular-devkit's Observable API forces rxjs.                                                                                                                                                                                                                                                                                                                                                    |

Three rules govern the split:

- **The shared layers are not reactive.** No shared signal library — engines are pure classes
  and view-model-returning functions; each framework owns its own reactivity (Angular
  `signal()`, React `useSyncExternalStore`). A common reactivity primitive would force a
  refactor of every existing Angular component, which is the cost this design exists to avoid.
- **Every project carries a `platform:` tag beside its `scope:` tag**, and the root
  `eslint.config.mjs` enforces the layering: `platform:agnostic` may depend only on
  `platform:agnostic` and bans `@angular/*` / `rxjs*` / `zone.js*` / `react*`; the two render
  layers may each depend on the substrate and never on each other. Nx applies **all** matching
  constraints, so these intersect with the per-package `scope:` rules rather than replacing
  them. (`bannedExternalImports` only classifies packages present in the project graph, so the
  `react` bans stay inert until React is installed — see the ADR's "Known gap".)
- **The extraction bar is the same as the existing one, one level up.** `Cross-package sharing`
  below says extract to `core` only what is non-trivial _and_ framework-free; `behavior` widens
  the second half from "pure data logic" to "pure interaction logic", nothing more. A machine
  that needs `TemplateRef`, DI or a framework lifecycle belongs in the render layer.
- **`core` keeps what it already has; `behavior` is where _new_ interaction logic lands.**
  Several of core's `util/` helpers are interaction logic by topic (`nav-index`, `type-ahead`,
  `toolbar-fit`, `split-sizes`, `slider-math`, `menubar-compact`, `drawer-mode`) and would sit
  in `behavior` if the packages were designed today. They are **deliberately not moving.** Both
  packages are `platform:agnostic`, so a consumer gains nothing from the reshuffle — while the
  move would break every published import path for pure taxonomy. Do not relitigate this;
  the split is by _date_, not by topic.

### React package template (per new React family)

`packages/react/buttons` is the template; the execution schedule and the full
per-family definition of done live in [`ROADMAP-REACT.md`](../ROADMAP-REACT.md).
The rules that exist because the pilot's audit found their absence breaking real
consumers:

- **Stateful machines take a reactivity adapter, never a framework
  primitive.** `packages/behavior/src/lib/reactivity.ts` defines
  `OgeReactivityAdapter` (`cell` + `derived`); a machine that needs state asks
  for one in its constructor. Each Angular package declares its own
  `SIGNAL_ADAPTER` (`signal()`/`computed()`) — `@oge-ui/behavior` may not
  import `@angular/core`, so there is nowhere shared to put it. Scheduling
  stays with the host: a core exposes `sync()` / `noteSnapshot()` and the host
  decides _when_, with `effect()` or `useEffect`. Where a core reads state that
  Angular would track (a DOM measurement pass), the Angular seam wraps the call
  in `untracked()` rather than the core knowing what tracking is.
- **The docs app compiles the whole workspace from source, so
  `@oge-ui/behavior` does not tree-shake there.** `tsconfig.base.json` maps
  every package to its source barrel, and a package's `sideEffects: false`
  only reaches a bundler through `node_modules` — so whatever the barrel
  exports lands in `dev-app`'s initial chunk, engine and all. That is why its
  `initial` budget is 1.1 MB and keeps growing with the shared layer; it says
  nothing about what an app installing `@oge-ui/inputs` from npm downloads,
  which is the per-package ESM build with its own `sideEffects: false`. Do not
  "fix" a budget breach by moving shared code out of the barrel — the barrel
  is the React layer's whole import surface (ADR 0001).
- **Extract by the narrowest contract the concern needs.** The grid's column
  layout takes a four-field `OgeGridLayoutColumn`, not the host's full resolved
  column — the full column carries per-framework content slots (`TemplateRef`s,
  render props), and a narrow structural contract is what lets both layers pass
  their own type in unchanged.
- **Extract to `behavior` first, rewire Angular in the same change.** The React
  component may not carry logic the Angular one also has — and vice versa. The
  Angular component's existing specs passing unchanged is the proof.
- **StrictMode-safe machine lifetime.** A machine held in a `useRef` is
  destroyed by the effect cleanup and **revived on the effect's mount side**
  (`machine.revive()`): StrictMode runs cleanup → remount with the same
  instance still in the ref, and without the revive the component is
  permanently dead in every Next.js/CRA dev session. A `<StrictMode>`-wrapped
  spec is mandatory.
- **`'use client'` must survive the build.** Rollup strips module-level
  directives; the Vite config re-adds it via `output.banner`. Check the dist,
  not the sources.
- **The dist must be publishable.** `@nx/vite` generates `package.json`; the
  config's `publishAssets` plugin copies `README.md`, `LICENSE` and `llms.txt`.
  Peers are exactly what the code imports (`react` — not `react-dom` unless it
  is actually imported).
- **SSR-safe by default.** `useIsomorphicLayoutEffect` instead of bare
  `useLayoutEffect` (client components still server-render), and first-paint
  attribute parity where the DOM-order effect can be approximated (see the
  group's `initialTabIndex`).
- **SSR-safe ids: React ids come from `useId()`.** Every DOM id a React
  component renders (ARIA `aria-controls` / `aria-labelledby` targets, panel
  and input ids) is derived from `useId()`, stripped to `[a-zA-Z0-9_-]` so it
  is valid in a selector and in `url(#…)`. Never `performance.now()`,
  `Math.random()`, `Date.now()` or a module-level counter: the server and the
  client compute different values, so hydration mismatches and the ARIA
  references point at nothing — and a counter shared across requests leaks
  render order between users. Keys of internal maps that never reach the DOM
  are exempt.
- **Dev warnings in effects, off by default.** Warn from `useEffect`, never the
  render body; `isDevMode()` returns `false` when no `NODE_ENV` signal exists,
  so unshimmed production toolchains do not warn forever.
- **Styles are `@use` lines** pointing at the Angular package's SCSS — and the
  list must stay **complete**. Every SCSS partial of the Angular counterpart
  belongs in the React package's `styles.scss`; adding a component without its
  stylesheet ships an unstyled component that every gate passes (the inputs
  family shipped slider/color-box/calendar/date-box this way for one commit).
  When you add a component, `find packages/<family>/src/lib -name '*.scss'` and
  reconcile.
- **Docs previews inline that stylesheet.** The React demo components carry
  `styleUrl: '…/packages/react/<family>/src/styles.scss'` under
  `ViewEncapsulation.None`, so `dev-app`'s `anyComponentStyle` budget is sized
  for a whole package stylesheet, not an app component's (warning 88 kB since
  W8a took the React layout sheet to 68 kB and W8b `react-inputs` to ~80 kB;
  error 96 kB). Since W8d the React layout sheet is past that budget, so the
  layout demos inline `shared/react-layout-demo-base.scss` or their own
  entry's SCSS instead (see **Carousel, action sheet, list / data view and
  tile layout (W8d)**).
  Writing a rule in the React package is a defect.
- **Anything the first paint is judged on must be derived, not seeded in an
  effect.** Angular seeds state inside change detection and paints with it
  already applied; React's `useEffect` runs _after_ the first paint, so a value
  only an effect provides is absent in that frame. Where a11y depends on it,
  that frame is a real failure — the React tree view painted every row
  `tabindex="-1"` until its roving-focus effect ran, which made the virtualized
  tree a scrollable region with no keyboard access (axe
  `scrollable-region-focusable`) and produced an e2e flake that passed in
  isolation. Compute a `useMemo` fallback for the first paint and keep the
  effect for the state sync.
- **Generic React components need an explicit instantiation in the docs.**
  The demo modules build their trees with `createElement`, which cannot infer a
  component's type parameter from a props object — `createElement(OgeForm, …)`
  widens the model to `object` and every prop fails. Write
  `createElement(OgeForm<Employee>, …)` (a TS instantiation expression) and
  declare the model interface beside the demo. JSX — which is what the snippet
  shows the reader — infers it, so the snippet stays annotation-free.
- **A commercial family's engine lives in `@oge-ui/<family>-engine`, not in
  `behavior`** (ADR 0003 — `behavior` is MIT). The engine is dependency-free
  and declares its own reactivity contract, structurally identical to
  `OgeReactivityAdapter` (`packages/bpmn-engine/src/lib/reactivity.ts`), so
  either layer's adapter fits without an import. A core that handles DOM
  events types them **structurally** (`BpmnPointerInput`, `BpmnKeyInput`:
  the fields it reads plus `preventDefault`/`stopPropagation`) rather than as
  `PointerEvent`: React then passes its synthetic event unchanged, and a
  handler's `stopPropagation()` stops React's own propagation — passing
  `nativeEvent` instead would let a shape's pointer-down bubble into the
  canvas handler. React's `onWheel` is passive, so a zoom gesture that must
  `preventDefault` is a native `{ passive: false }` listener. A core
  constructed during render subscribes only to objects it owns (its command
  stack); document listeners wait for `revive()`, so the instance StrictMode's
  double render throws away leaks nothing.
- **Native `change` commits stay native.** Where the Angular template commits
  on `(change)` (blur/Enter — one undoable command per edit), the React field
  is uncontrolled, synced from the model in a layout effect, with a native
  `change` listener (`packages/react/bpmn/src/lib/native-field.tsx`). React's
  `onChange` is the `input` event and would commit per keystroke.
- **A React family has more than one shared file.** Splitting a family's
  components across parallel authors is only safe if every file more than one
  of them writes is either append-only or owned by a single author. Besides
  `src/index.ts`, the per-family `*-config.tsx` (the context providers) is
  shared by **every** component in the family — a whole-file write of it
  silently deletes the siblings' providers, and the failure surfaces far away
  as `useOgeXConfig is not a function` in specs that look unrelated (the
  navigation family lost five providers to exactly this). Name each shared file
  explicitly when parallelizing, require re-read-then-`Edit`, and keep the
  cross-cutting files — the docs manifest, `FrameworkService.COVERAGE`, the
  routes, `REACT-PARITY.md` — with one owner.

## Licensing (open-core)

Everything is MIT **except `packages/pivot`, `packages/bpmn`,
`packages/scheduler`, `packages/gantt`, `packages/kanban` and
`packages/charts`** — plus their framework-free engine packages
(`packages/<family>-engine`, ADR 0003) and their React render layers
(`packages/react/<family>`) — which are source-available commercial (free for
evaluation/development, paid for production — per-package `LICENSE`,
`"license": "SEE LICENSE IN LICENSE"` in their package.json). The MIT
packages carry a public "will remain MIT" commitment (root README) — never
move an MIT package or an existing MIT feature into the commercial tier.
New enterprise-oriented packages (e.g. charts) may be commercial; copy
bpmn's LICENSE when scaffolding one (pivot's carries a historical 0.5.0
MIT note — don't copy that). The `oge-ui`
umbrella is MIT-only and must **not** depend on or re-export commercial
packages — nor may the MIT `@oge-ui/react` umbrella. The one sanctioned
MIT → commercial edge is **type-level**: `@oge-ui/locales` (MIT, translations)
types its commercial slices with `import type` from the engines' message
interfaces. The build erases those imports, the engines are optional peers of
the package, and its `scope:locales` lint rule lists the engine scopes with
that comment — never import a _value_ from an engine there. The umbrellas
depend on `@oge-ui/locales`, not on any engine; their locale wiring
(`provideOgeLocale` / `<OgeLocaleProvider>`) covers the MIT families only, and
commercial families take `ogeMergeMessages(OGE_DEFAULT_<X>_MESSAGES, pack.<x>)`
through their own provider. A commercial family's
framework-free logic goes into its own `@oge-ui/<family>-engine` (a copy of
the family LICENSE, `platform:agnostic`, rollup like `core`), never into MIT
`behavior`; both render layers of the family depend on it (ADR 0003,
`packages/kanban-engine` is the first). Copy the family's LICENSE into both
the engine and the `react-<family>` package (adapting only the package name in
its header), list both directories in the root `LICENSE`, and rewire the
Angular package onto the engine in the same change. The root `LICENSE` lists the per-directory split. There is no
license-key/runtime enforcement yet — deliberate, revisit when sales start.

## New package checklist

Scaffold by copying `packages/tree-list`'s config file set and renaming:
`project.json` (prefix `oge`, tags `["scope:<name>"]`, `@nx/angular:package` build, `nx-release-publish`,
`release.version` git-tag block), `package.json`, `ng-package.json` (`dest: ../../dist/packages/<name>`,
`entryFile: src/index.ts`), `tsconfig.json` / `tsconfig.lib.json` / `tsconfig.lib.prod.json`
(`compilationMode: "partial"`) / `tsconfig.spec.json`, `vite.config.mts` (vitest, jsdom,
`setupFiles: ['src/test-setup.ts']`), `eslint.config.mjs`, `src/test-setup.ts` (4 lines, identical everywhere),
`src/index.ts` barrel.

Then register in **four** places:

1. `tsconfig.base.json` → `"@oge-ui/<name>": ["./packages/<name>/src/index.ts"]`
2. `nx.json` → `release.projects` array
3. root `eslint.config.mjs` → `depConstraints`: add `scope:<name>` entry and allow it from `scope:app`.
   `project.json`'s `tags` must carry **both** a `scope:` and a `platform:` tag — see
   **Platform layering** above; a project with no `platform:` tag is unconstrained and silently
   escapes the layering rules.
4. root `README.md` package table (+ `ROADMAP.md` if feature-tracked)
5. `tools/docs-tools/lib/manifest.mjs` → `PACKAGES` entry, and `"assets": ["llms.txt"]` in
   `ng-package.json` (see **Machine-readable docs** below). `nx run docs-tools:llms` warns about any
   package folder missing from the manifest, so this step cannot be forgotten silently.

There is **no test target in project.json** — `@nx/vitest` infers it from `vite.config.mts`.

### Per-component entry points (`@oge-ui/inputs/*`, `@oge-ui/layout/*`, `@oge-ui/buttons/*`)

A family whose components are used independently ships one **secondary entry point per component**
(`packages/<pkg>/<component>/ng-package.json` + `src/`), with the primary `@oge-ui/<pkg>` entry
re-exporting the exact public list from them. Why: every entry point is one FESM module and esbuild
code-splits at module granularity, so when two lazy chunks use different parts of one monolithic
family, the _union_ lands in the eager shared chunk. Measured on a one-grid CLI app: splitting
inputs and layout took the initial JS from 913 KB to 704 KB.

- Library packages import siblings from the component entry (`@oge-ui/inputs/text-box`), never from
  the primary; apps and docs may use either. `rewrite_imports`-style tooling keys off the primary
  index, so keep its `export { … } from '@oge-ui/<pkg>/<entry>'` statements explicit (no `export *`).
- The docs site's **eager shell** (`app.ts`, `shared/*`) imports component entries only. One
  `import { OgeSelectBox } from '@oge-ui/inputs'` in `app.ts` (the version menu) put every inputs
  entry into the initial bundle — 861 KB → 1.29 MB; the `dev-app` budget (error at 1 MB) is the
  guard. Lazy demo pages may use the primary, as consumers do.
  Even one entry is a lot. The select-box entry imports the `@oge-ui/overlay` primary barrel.
  Workspace sources compile as app code, so their component classes (`static ɵcmp = …`) are
  never tree-shaken, which means every overlay component and most of `behavior` rode along.
  G5a's popover and window took the initial bundle to 1.01 MB this way. The header's two
  selects (version, theme) now render inside `@defer (on idle)` with fixed-size placeholders,
  and the initial bundle dropped to 438 KB. Keep every library component out of the eager
  shell's templates unless it is deferred.
- Code shared between sibling entries lives in a base entry (`@oge-ui/inputs/field`,
  `@oge-ui/layout/element-attrs`) and is exported there under a "shared with sibling entry points"
  comment — reachable, but deliberately absent from the primary's public list.
- The entry graph must stay acyclic (ng-packagr builds entries in dependency order); specs may import
  siblings by relative path because they are not part of the build.
- `tsconfig.base.json` maps `@oge-ui/<pkg>/*` → `./packages/<pkg>/*/src/index.ts`; `tsconfig.lib.json`,
  `tsconfig.spec.json` and `vite.config.mts` include `*/src/**` alongside `src/**`. SCSS token paths
  from an entry are three levels deep (`@use '../../../grid/src/lib/styles/tokens'`).

## Cross-package sharing (what gets extracted vs. copied)

Sibling component packages (tabs, layout, …) grow the same shapes. The rule:

- **Extract to `@oge-ui/core` only what is non-trivial _and_ framework-free.** Core cannot import Angular
  (lint-enforced), which is the right filter — it keeps the shared layer to pure logic that can be unit
  tested on its own. Currently: `runAsyncGuard` (`util/async-guard.ts` — the veto pipeline where a boolean
  settles synchronously, a promise reports pending, and throw _and_ reject both mean veto),
  `stepEnabledIndex` / `edgeEnabledIndex` (`util/nav-index.ts` — arrow and Home/End math with wrapping and
  disabled-skipping) and `createTypeAheadBuffer` / `matchByPrefix` (`util/type-ahead.ts`, folding through
  `foldText` so matching is locale- and accent-insensitive) and `normalizeSplitTracks` /
  `resizeSplitAt` / `splitSeparatorRange` (`util/split-sizes.ts` — the splitter's two-unit pane math:
  `fr` shares normalized to 100 next to fixed-pixel tracks, a two-neighbour delta clamped by both
  panes' bounds, and the APG separator value triple) and `fitToolbarItems` (`util/toolbar-fit.ts` —
  which toolbar entries fit and which collapse into the overflow menu, given measured sizes and an
  `'auto' | 'always' | 'never'` policy each; a non-positive container size means "not measured yet"
  and everything stays inline, which is what keeps jsdom specs deterministic).
  Consumed by tabs, layout and navigation.
  Reach for an existing engine before writing one: `packages/navigation`'s tree view needed **no** new data
  code because `lib/tree/` (index, nested flatten, filter modes, tri-state cascade) was already there from
  tree-list. Note the flip side — do not force a kernel helper where it does not fit: the tree's
  `loadChildren` deliberately avoids `runAsyncGuard`, because that models a veto (rejection = "no") and
  would swallow the error a failed fetch has to report.
- **Copy the Angular-shaped conventions**; do not build a shared `@oge-ui/foundation`. These are 4–15 line
  idioms whose types differ per component, so a generic base would trade a little duplication for awkward
  `TemplateRef` generics and a permanent public npm surface for internal plumbing. The three to copy:
  1. **Descriptor merge** — a `computed()` producing `[...fromChildren, ...fromItems]` (children first,
     ButtonGroup precedent), each source filtered by `visible` and given a stable `id` (`key` ?? a per-source
     auto id, distinct prefixes so the two namespaces cannot collide).
  2. **Cancelable pipeline** — build the `-ing` event with `cancel: false`, `emit()` it, re-read `cancel`,
     bail; then guard, then commit, then emit the past-tense event. Guards run _after_ the pre-event.
  3. **Config/messages** — per-package `InjectionToken` + `provideOge<X>Config()` shallow-merging `messages`,
     overlaid per instance by a `[messages]` input in a `mergedMessages` computed.
- A **component-level template slot** queried with `contentChild(X, { descendants: false })` applies to
  `items`-mode entries only; a slot that is really container chrome (e.g. the accordion's toggle icon) may
  fall back for declarative children too — say which in the TSDoc.
- **A render layer's family may build on a sibling's foundation entry.** The
  Angular tree list imports `@oge-ui/grid/foundation`; the React tree list
  imports `@oge-ui/react-grid/foundation` (editing bridge, reactivity adapter,
  filter-builder editor). Such an entry is reachable but deliberately not part
  of the sibling's primary barrel — apps never need it. The data model itself
  still lives in `behavior` (`OgeTreeListCore`), never in a foundation entry.
- **Live announcements go through `OgeLiveAnnouncerCore`; components never create their own live
  regions.** `@oge-ui/behavior`'s `OgeLiveAnnouncerCore` (`lib/a11y/live-announcer.ts`) owns one
  polite and one assertive visually hidden `aria-live` region per document
  (`.oge-live-announcer[data-oge-live-announcer]`, deliberately no `status`/`alert` role — the
  e2e suite and consumers use `getByRole('status')` for page status messages). It touches no DOM
  until the first `announce()` and is inert without a document (SSR); it writes clear-then-set
  after a delay (latest wins inside the window — the debounce bursts need), drops the identical
  message inside a second, and clears after a few seconds so a repeat is heard again;
  `inertModalBackground` skips the regions. The Angular seam is `OgeLiveAnnouncer`
  (`providedIn: 'root'`) in **`@oge-ui/overlay`** — the lowest Angular package every announcing
  family already depends on (grid, tree list, toast, Gantt, uploader, scheduler, kanban), since
  `behavior` cannot import Angular and the suite has no Angular base package; the React seam is
  `useOgeLiveAnnouncer()` in `@oge-ui/react-overlay`. Specs read the shared region
  (`[data-oge-live-announcer="polite"]`) after the write delay, never a component-local element.
  The grid family's rules (what changed → which `OgeGridMessages` `*Announcement` pattern, when a
  filter count is safe to speak) are `OgeGridAnnouncements`, shared by both grids and both tree
  lists, opt-out via `announcements` (input/prop + config). Recorded exceptions: `bpmn` and
  `charts` keep component-local regions because their engines are dependency-free by design;
  `kanban` and `scheduler` regions are pending migration; visible text that is itself live
  (pagination indicator, field subscript, scheduler period title) is content, not an announcer
  region.
- **Compact editors wire their own error semantics.** Grid / tree-list cell editors render
  without a subscript, so `OgeCellEditor` (both layers) renders the error text visually hidden
  beside the control and calls `syncOgeEditorErrorAria` (`@oge-ui/behavior`): `aria-invalid`,
  `aria-errormessage` and an `aria-describedby` entry pointing at it, taken back exactly when
  valid. Ids are a per-instance counter in Angular and `useId()` in React.
- **Drag interactions use `beginPointerGesture`; there is no HTML5 drag and drop in `packages/`.**
  `@oge-ui/behavior`'s `lib/gesture/` is the one pointer machine: `beginPointerGesture` (3px
  threshold, pointer capture, document listeners, capture-phase Escape, blur/`pointercancel`
  cancel, a single `finish`, optional click suppression), the touch rules — `longPress` (a touch
  pointer only arms after a hold without moving past the threshold; moving earlier abandons the
  gesture so the page scrolls), `touch-action: none` on the source while armed (restored after) and
  `prepareTouchDrag()`, the one non-passive document `touchmove` guard that blocks panning only
  while a touch gesture is armed (Chrome decides at `touchstart`, so components with touch drags
  call it once on mount) — plus `createAutoScroller` (edge auto-scroll, the quadratic
  `ogeEdgeScrollVelocity` ramp) and `beginPointerDragDrop` (hit-testing with `elementFromPoint`
  through a consumer `resolve()`, a ghost preview, auto-scroll, re-hit-test after each scroll
  frame). `draggable`, `dragstart`, `dragover` and `drop` never fire for touch, cannot be cancelled
  with Escape and draw a ghost the page cannot style, so a new drag never uses them. The **one
  exception is file drops from the OS** (`upload`'s drop zone, `dataTransferHasFiles`): only HTML5
  DnD carries files. Rules every drag follows:
  - **The pointer drop runs the keyboard command.** `resolve()` maps the hit to what the
    keyboard alternative already takes (a column id, a row key + tree position, an area + insert
    index) and `onDrop` calls the same method (`columns.reorder`, `commitRowMove`, `applyDrop`,
    `grouping.move` via `ogeMoveGroupingTo`, `moveFieldTo`) — pointer, touch and keyboard emit
    identical events, and the specs compare them. The grid family's target resolution is shared in
    `grid-pointer-drag.ts` (`resolveOgeHeaderDropTarget`, `resolveOgeRowDropIndex`,
    `resolveOgeAttributeTarget`, nested-grid-safe `ogeOwnedClosest`, `isOgeDragExcludedTarget`
    for buttons/inputs/the resize separator inside a draggable source).
  - **Touch: handles drag at once, everything else after a long press.** A dedicated handle
    (row drag handle, column resize separator) declares `touch-action: none` in CSS and passes
    `longPress: 0`; a source that must stay scrollable at rest (headers, chips, chooser rows,
    kanban cards and column headers, Gantt bars, scheduler appointments) keeps the house
    `OGE_LONG_PRESS_DELAY` (300 ms).
  - **Engine packages.** `kanban-engine`, `gantt-engine` and `scheduler-engine` depend on
    `behavior` and keep their exported names as thin wrappers (`beginKanbanGesture`,
    `beginGanttGesture`, the scheduler's `beginPointerGesture` — `preventDefault: false`, so a
    press still focuses). `charts-engine` (published dependency: `core` only; `behavior` is an
    optional peer reached solely by `/export-pdf` for the PDF font registry) and `bpmn-engine`
    (no dependencies) are dependency-free by design and keep their local gesture twins: zoom/pan
    and the modeler's canvas tools need neither the long press nor drop hit-testing, and
    taking `behavior` for one function would change their published dependency stance. Keep the
    twins' cancel rules in step with `pointer-gesture.ts`. The charts twin follows only the
    pointer that started it (a second finger never jerks a drag), returns a `cancel()` handle,
    and pairs with `createChartPinchTracker` for two-finger pinch-zoom / pan: the plot feeds it
    every touch `pointerdown`, and the second finger cancels the one-finger gesture.
- **Exports run on one model; the file builders never read a component.** `@oge-ui/behavior`'s
  `lib/grid/grid-export.ts` defines it: `OgeExportColumn` carries the on-screen layout facts
  (`width` px, `alignment`, `pinned`, `bandCaption`), and `OgeExportData.items` is the ordered list
  of lines — `data` rows at their group / tree depth, `group` headers worded like the on-screen
  group row, `groupFooter`s for footer-position summaries (and a tree's per-parent recursive
  summaries, emitted after the parent's subtree) and the `total` row, each summary typed with its
  formatted `text` and `label`. The grids build it with `ogeGridExportItems` /
  `ogeGridExportLoadOptions` (group fields lead the sort so groups come out in screen order;
  totals come from the source when it summarizes itself), the tree lists with
  `OgeTreeListCore.getExportData(columns, messages, { summaryText })`. `/export-excel` and
  `/export-pdf` are pure builders over that model — merged band headers, freeze panes from the
  header rows and left-pinned columns, outline levels with `summaryBelow: false` (headers sit above
  their rows), `SUBTOTAL(9/1/5/4/3, range)` formulas that ignore nested subtotals, the PDF header
  repeated per page and page chrome drawn after layout so the footer knows the page count.
  **PDF text is WinAnsi unless a font is embedded**: jsPDF's built-in Helvetica cannot draw Turkish
  `ğ ş ı İ`, Central European, Greek or Cyrillic letters. Every PDF builder (grid, tree list,
  pivot, Gantt) takes `font: OgePdfFont` and falls back to the one registered with
  `setOgePdfDefaultFont()` (`@oge-ui/behavior`, `lib/export/pdf-font.ts` — jsPDF-agnostic, so the
  barrel pulls no PDF code); missing bold/italic faces map to the regular face so a bold header
  never drops back to Helvetica, and `warnOgePdfUnicode` warns once when such text is exported
  without one. The docs demos register Noto Sans (`public/fonts`, SIL OFL) lazily on the first
  export through `shared/pdf-font.ts`. CSV keeps its UTF-8 BOM and XLSX is Unicode by format.
  Styling
  is one value-level seam, `cellStyle(args)` → `OgeExportCellStyle`, reaching every line; the data
  cell's `customizeCell` stays the value override and gains a mutable `style`. It runs for data
  cells only, so existing customizers that read `row` keep working. A grid feature that changes
  what a cell looks like (conditional formatting) exports by returning the same style from
  `cellStyle` — never by teaching a builder about the feature. The pivot's PDF builder lives in
  `pivot-engine` (commercial) and reuses behavior's page helpers (`createOgePdfDocument`,
  `ogePdfLayout`, `applyOgePdfPageChrome`, `ogePdfCellStyles`).
- **Chart depth runs in the engine; render layers draw generic primitives.** Analytic series
  (`waterfall`, `boxPlot`, `histogram`, `pareto`, `indicator`) are a data-stage derive pass
  (`series-derive.ts`): it rewrites points (`value`, `extra`, `outliers`, `kind`), supplies
  waterfall base/top through the same `stacks` slot the stacked series use, fits trendlines and
  applies `customizePoint` last so hooks see derived values. The scene then emits only generic
  marks per series — `bars` (with `color`/`stroke`/`cls`), `candles`, `markers`, `segments`
  (OHLC ticks, whiskers, medians, connectors, reference levels), `dots`, `extraPaths` (bands,
  trendlines, signal and pareto lines) and `labels` — so a new analytic type needs no render-layer
  change. Data labels are placed by `data-labels.ts` and resolved once per chart
  (`resolveChartLabels`: clip into the plot, then `hide`/`shift`/`none`); they never touch the sr
  table. Colour is never the only channel: `customizePoint`'s `description` and the waterfall kind
  words (`messages.values`) are appended to value texts. Text fills that depend on a mark colour use
  `style` bindings (CSS classes would beat a `fill` attribute). All of these marks are in the
  frame's logical coordinates (argument along x, value along the pane's y), so rotation and panes
  apply to them for free; data labels alone are counter-rotated with `cartesianLabelTransform` and
  anchored with `cartesianDataLabelAnchor` (inside labels stay centered), and the overlap pass
  measures in logical space. Indicators take a pane like any series (`pane: 'rsi'`); the pareto
  implicit 0–100% scale spans the series' own value axis so it stays in its pane. Export: JPEG/PNG share
  `rasterizeChartSvg`; PDF embeds that PNG under real-text headings drawn with
  `resolveOgePdfFont` (so `setOgePdfDefaultFont` applies); `print()` writes the serialized SVG into
  a hidden iframe with a print stylesheet.
- **Pivot ↔ charts binding is plain data.** The commercial pivot packages must not depend on
  `@oge-ui/charts`: `pivot-engine`'s `toChartSeries(result, options)` (and `getChartData()` on both
  grids, generic over the series `type` so `'bar'` stays a literal the charts' series type accepts)
  returns a `{ dataSource, series }` pair shaped like the charts' inputs, and the app wires
  `resultChange` / `onResultChange` to re-read it. Calculated fields are a post-pass over the
  materialized `PivotResult` (`applyPivotCalculatedFields`, reusing core's `applyDisplayModes`),
  member filters a pre-pass over the rows (`applyPivotMemberFilters`) — neither touches the MIT
  aggregation engine in `core`.
- **Tree-list remote filtering has a server contract, not a client fallback.** With
  `remoteOperations.filtering` (full load mode) `ogeTreeDataSource` passes `filter` / `searchText`
  through and `source.distinct(field, { filter })` serves the header-filter values; the source
  must answer with every match **plus all of its ancestors**, flat. The core then skips its own
  predicate (re-filtering could hide an ancestor the server kept for a reason it alone knows) and
  opens every loaded branch. Lazy trees keep their client-driven discovery (`syncRemoteFilter`).
  Summaries (`summary.totalItems` / `recursiveItems`) aggregate the filter-visible rows at every
  level, collapsed branches included — `OgeTreeListCore.totalSummaries` / `recursiveSummaries`.
- **Keyboard context menus** on grid-like components use `@oge-ui/behavior`'s grid-context-menu helpers
  (`isOgeContextMenuKey`, `ogeContextMenuKeyTarget`, `OgeContextMenuEcho`): handle the Menu key /
  Shift+F10 in `keydown`, anchor at the focused cell (header cells carry `data-colid`, body rows
  `data-rowindex`), and let every pointer handler call `echo.swallow(event)` first. Context-menu event
  payloads carry `source` and the originating `event`.
- **Declarative children + a programmatic twin.** Anything consumers declare as content children must also
  be accepted as plain data (`[columns]="OgeColumnDef[]"` ↔ `<oge-column>`): content queries never see
  children projected through a wrapper component's `<ng-content>`, so without the data form nobody can
  wrap the component. Build the data form into the same signal surface the directive exposes
  (`ogeColumnFromDef`) so there is one read path.
- **Optional heavy dependencies go behind `@defer`.** A template branch that only some consumers reach
  (the grid's form/popup editors → `@oge-ui/forms` and its tabs/upload/navigation cone) renders inside
  `@defer (on immediate)` with a `@placeholder`, and the deferred symbol must not be referenced eagerly
  anywhere else in the file. Measure with a CLI app, not by reading the FESM: esbuild splits at module
  granularity, so a package needed both eagerly and lazily lands whole in the eager shared chunk.

## Component authoring rules

Every component in every lib follows all of these (see `packages/grid/src/lib/pager/pager.ts` for the
smallest complete example):

- Standalone (implicit — no `standalone: true`), `changeDetection: ChangeDetectionStrategy.OnPush`,
  `encapsulation: ViewEncapsulation.None`.
- **Signals only**: `input()`, `input.required()`, `model()` (two-way), `output()`, `computed()`, `signal()`,
  `effect()`, `afterRenderEffect()`, `afterNextRender()`, `viewChild()` / `contentChild()` / `contentChildren()`.
  **Never** decorators (`@Input`, `@Output`, `@ViewChild`, `@HostBinding`, `@HostListener`).
- Host bindings go in the decorator `host` object:
  `host: { class: 'oge-button', '[class.oge-disabled]': 'disabled()' }`.
- New control flow only: `@if` / `@for (…; track …)` / `@switch`. `NgTemplateOutlet` is the only
  `@angular/common` import in use.
- Class names: `Oge<Name>` with **no** `Component`/`Directive` suffix (`OgeGrid`, `OgeColumn`, `OgeButton`).
  Selectors: `oge-<kebab>` elements, `[oge<Camel>]` attribute directives. Renderless config directives
  (e.g. `oge-column`) use element selectors with an inline eslint-disable.
- Members: `readonly` fields, `protected` for template-only, `private` internals. TSDoc (1–3 sentence,
  no `@param`) on every public member; class-level JSDoc carries a runnable HTML snippet.
- Zoneless-ready: no `NgZone` assumptions; callbacks only set signals / emit outputs.
- **Secondary affordances inside an interactive header** — two cases, pick by the parent's role:
  - Inside a **composite-widget role** (`role="tab"`, `option`, `treeitem`, `gridcell` headers…) axe fails a
    focusable child as `nested-interactive`. Render the affordance as an `aria-hidden` `<span>`, resolve its
    clicks from `event.target.closest('.oge-x')` in the parent's handler, and give the parent a keyboard path
    advertised via `aria-keyshortcuts` (see `packages/tabs`' close ✕ / Delete).
  - When the header is a **plain `<button>`** (the APG accordion shape: title in a `<button>` wrapped in a
    heading), the button carries no composite role, so the fix is simply to put the action _outside_ it —
    a real `<button>` sibling in the header row. It is natively Tab-reachable, needs no `aria-keyshortcuts`,
    and the widget's arrow navigation only visits the toggles (see `packages/layout`'s
    `[ogeAccordionHeaderActionsTemplate]`). Prefer this whenever the role allows it.
  - The composite case also covers **state**, not just actions: a tree's checkbox cannot be a real
    `<input>` inside `role="treeitem"`. Put the state on the row itself (`aria-checked`, incl. `mixed`)
    and render an `aria-hidden` glyph — see `packages/navigation`'s `.oge-tree-view-check`.
- **Not every APG pattern uses a roving tabindex.** The accordion pattern deliberately does not: all header
  buttons stay `tabindex="0"` and only Enter/Space/Tab are required. Arrow/Home/End/type-ahead (and
  `Ctrl+PageUp/PageDown`, handled on the host so they work from inside panel content) are an opt-in
  enhancement. The treeview pattern is the opposite — exactly one node in the Tab sequence. Check the
  actual pattern before copying (or omitting) tab-strip focus machinery.
- **Bind `[tabindex]`, not `[attr.tabindex]`, on a roving-tabindex row, and put the `(keydown)` on the same
  element as the `(click)`.** `@angular-eslint`'s `interactive-supports-focus` and
  `click-events-have-key-events` cannot see through `[attr.…]` or an ancestor handler, and will fail an
  otherwise correct widget (see `tab-strip.ts` and `tree-view.ts`).
- **Recursion has two shapes; pick by what repeats.** A standalone component **may list itself in its
  own `imports`** and render its own selector — verified against Angular 22, and what
  `packages/layout`'s splitter uses for nested panes, because each level is a real splitter with its
  own separators, gestures and outputs. When the repetition is only markup, keep it to a
  self-outletting `<ng-template>` instead (`packages/forms`' `#nodeList`, which recurses for nested
  groups without a second component instance). Neither needs `forwardRef`.
- **A composite widget may render a flat DOM.** Where the structure is expressed with `aria-level` /
  `aria-posinset` / `aria-setsize`, the APG does not require nested containers — and a flat list is what
  makes windowed rendering possible at all. `packages/navigation`'s tree renders one `role="treeitem"` per
  visible node with no nested `role="group"`, which is why it can virtualize; core's `flattenTreeData`
  already emits `level`/`posInSet`/`setSize` for exactly this.
- **Every drag has a keyboard and single-pointer twin (WCAG 2.1.1 / 2.5.7)** that runs the _same_
  commit path and fires the _same_ event as the pointer drop, announces the result in a permanent
  polite live region (`.oge-sr-only` + `aria-live`, text from the messages catalog) and keeps the
  focus on the moved item. The decisions are shared, not re-derived per layer: the grid family's
  scheme lives in `@oge-ui/behavior`'s `grid-keyboard-moves.ts` (header `Alt+←/→` resize — 10px,
  `Shift` 1px — and `Ctrl+Shift+←/→` move; `Ctrl+↑/↓` row move; tree `Ctrl+→/←` indent/outdent;
  group chips `Ctrl+←/→` + `Delete`; chooser `Ctrl+↑/↓`), horizontal keys are visual and mirror
  in RTL through `resizedColumnWidth`'s direction rule. Advertise the keys with
  `aria-keyshortcuts`. A resize handle is a focusable `role="separator"` (`tabindex="-1"`,
  `aria-valuenow/min/max` in px, APG window-splitter keys) with `touch-action: none`. The pointer
  side of every drag is `beginPointerDragDrop` (see **Cross-package sharing**), never HTML5 DnD.
- **A header that contains named controls is labelled by its caption** (`aria-labelledby` → the
  caption span, ids from a per-instance prefix — `useId()` in React): name-from-content would
  otherwise fold the separator's and filter button's labels into the column name
  (`City Resize City Filter values`).
- An expanded panel the user may not collapse gets **`aria-disabled="true"`, never the `disabled`
  attribute** — it has to stay focusable (APG accordion).
- Generics where rows are involved: `OgeGrid<T extends object = Record<string, unknown>>`.
- **Two Signal Forms facts a component that hosts editors must know** (both verified against
  `@angular/forms/signals`, not assumed):
  1. When `[formField]` is on an element, the `FormField` directive **writes `disabled` / `readonly`
     / `required` / `min` / `max` itself and overwrites any template binding of the same input**. So
     never bind those alongside `[formField]` — express them in the schema (`disabled()`,
     `readonly()`), or apply form-level disabling with a `<fieldset disabled>` wrapper. Angular
     cannot apply a directive conditionally, which is why `packages/forms`' editor template carries
     its `@switch` twice (one `[formField]` arm, one `[formControl]` arm).
  2. `FieldTree<T>` is **invariant** in `T` (its `FieldState` holds a `WritableSignal<T>`), so Angular
     cannot infer a component generic from an `input<FieldTree<T>>` position — it falls back to
     `any`, and `FieldTree<any>` resolves to the _compat_ field state that no real tree satisfies.
     Accept a **structural alias naming only the members you use** with the value type erased
     (`packages/forms`' `OgeFormFieldTree`), not `FieldTree<any>`.
- Reactive-forms state is **not reactive**: `AbstractControl.invalid` / `.touched` are plain
  properties, so a `computed()` over them never re-runs. Bridge `control.events` into a revision
  signal and read it inside the computed (`packages/forms`' `controlRevision`, and the grid's
  editing model hit the same thing).

### Public API language

- Outputs are past-tense/noun names **without `on` prefix** (`rowClick`, `selectionChanged`, `contentReady`).
  Cancelable pre-events use `-ing` names and a mutable `cancel: boolean` (`savingChanges`, `rowExpanding`).
- Event payloads: flat exported interfaces `Oge<Name>Event`, raw DOM event under `event`,
  no component/element back-reference.
- Modes are lowercase string unions exported as named types (`'single' | 'multiple'`), **never enums**.
- Complex features use the **boolean-shorthand-or-options-object** idiom:
  `input<boolean | OgeFilterRowOptions>(false)`.
- `undefined` default means "fall back to DI config / enclosing parent".
- Barrels (`src/index.ts`): explicit named exports with inline `type` modifiers, no `export *`
  (core is the historical exception).
- Config/i18n: `InjectionToken` with factory default + `provideOge<X>Config()` shallow-merge provider —
  copy `packages/grid/src/lib/config.ts`. **Every user-facing string (incl. aria labels) lives in a
  messages interface.**
  The root `eslint.config.mjs` enforces the narrowest slice of this mechanically: a capitalised
  literal `aria-label` (`aria-label="Reorder"`, `[attr.aria-label]="'Reorder row'"`, or the JSX
  forms) is a `no-restricted-syntax` error in library templates and TSX (specs and the dev-app,
  whose demos show consumer code, are exempt). A glyph that carries meaning (the grid's `✓` / `✗`
  boolean cells) is rendered `aria-hidden` with a visually hidden `.oge-sr-only` word from the
  catalog beside it.
- **Locale-derived calendar facts go through core's `date-utils.ts`**: `resolveFirstDayOfWeek` and
  `resolveWeekendDays` (both `Intl.Locale#getWeekInfo()` / `weekInfo`, with Sunday-first and
  Saturday + Sunday fallbacks). Never hardcode `day === 0 || day === 6` — expose a
  `weekendDays` input defaulting to the locale (scheduler, Gantt). Specs stub `Intl.Locale` with a
  constructible `function`, because host ICU week data differs between Node builds.
- **Formatters come from the core Intl cache.** Never write `new Intl.NumberFormat` /
  `DateTimeFormat` / `RelativeTimeFormat` / `PluralRules` in a render path: call
  `ogeNumberFormat` / `ogeDateTimeFormat` / `ogeRelativeTimeFormat` / `ogePluralRules`
  (`@oge-ui/core`, `util/intl-cache.ts`) — one instance per locale + options, SSR-safe, an
  unknown locale degrades to the runtime default instead of throwing. Number text a user types
  is read with `ogeParseNumber(text, locale)`. A component that formats data takes a `locale`
  input / prop **and** a config `locale`, resolved instance → config → app locale (Angular
  `LOCALE_ID`, React `ogeDefaultLocale()` = `navigator.language`). The grid family resolves it
  once into `OgeGridResolvedColumn.locale` (`resolveOgeGridColumns({ locale })`), so every
  cell, summary, group caption, header-filter value, filter-row parse, paste and export reads
  `column.locale` instead of threading the grid's. Declarative formats (`OgeValueFormat`:
  `{ type: 'currency' | 'percent' | 'number' | 'decimal' | 'date' | 'time' | 'datetime', … }`)
  are compiled once per locale by `ogeValueFormatter`; the resolved column's `format` stays a
  plain function, so consumers never branch on the format's shape. Unformatted number columns
  keep `String(value)` on purpose (ids, years); specs that format without a locale must pin
  one — this machine runs tr-TR.
- **Plural messages use `ogeFormatMessage`.** A catalog string with a count is an ICU plural
  (`'{count, plural, one {# row} other {# rows}}'`) rendered by core's `ogeFormatMessage(template,
values, locale)` (`=n`, `zero one two few many other`, `#`, `offset:`, `selectordinal`,
  `select`, ICU apostrophe quoting; a malformed template falls back to `{name}` substitution
  and never throws) — never a `count === 1 ? one : other` pair of keys. Pass the count as a
  number so `#` gets the locale's digits. When a pair is retired, keep the old key optional and
  `@deprecated` for one minor: honour it when a catalog still supplies it and call
  `warnOgeDeprecatedMessage(oldKey, newKey)` (dev-mode, once per key). Plain `{name}` patterns
  whose values are free text keep using `formatPattern` — ICU quoting would change how a
  consumer's apostrophes render.
- **Translations live in `@oge-ui/locales`, one entry point per language.** A pack mirrors
  every catalog (`grid`, `inputs`, …, `layout.{accordion,…}`, `navigation.{…}`, the commercial
  slices) as `OgeDeepPartial<…>`, so a key added to a catalog never breaks a pack: it falls back
  to English through `ogeMergeMessages`, which every wiring uses (the family resolvers merge
  `messages` only one level deep — a nested block like `operators` would otherwise be replaced
  whole). **Adding or renaming a catalog key:** keep the English default the source of truth;
  `docs-tools:locales-check` (run by `docs-tools:lint`) fails on keys a pack has that no catalog
  has, on placeholder drift against the English string, on an English ICU plural that no longer
  parses and on plural categories the language does not have — and only _warns_ (coverage
  table) on missing keys, so a parallel catalog change never reds the build. Translate the new
  key in every pack when you can; a new catalog means a new `SLICES` entry in the check, a slice
  in `OgeLocalePack` and a line in `provideOgeLocale` / `<OgeLocaleProvider>` (MIT families) or
  the docs' commercial example. ICU strings in French/Italian packs use the typographic `’`:
  an ASCII `'` next to a brace is ICU quoting. `LOCALE_ID` and the page's `dir` stay the
  application's job (`pack.locale`, `pack.dir`).
- Template slots: structural directive per slot, selector `[oge<Slot>Template]`, exported context interface.
  When the same slot directive is legal both at component level and inside a child config component
  (e.g. `[ogeTabContentTemplate]` in `oge-tab-panel` vs inside an `<oge-tab>`), query the component-level
  one with `contentChild(X, { descendants: false })` — the signal `contentChild` default (`descendants: true`)
  would steal the first child-level template.
  - `ngTemplateContextGuard` — see `packages/grid/src/lib/templates/cell-template.ts`.

## Styling & theming

- **Container queries over window-width callbacks.** When a component's layout depends on how much
  room it has, key it off its own inline size (`container-type: inline-size` on the host + `@container`
  blocks reading custom properties the component sets) — never a `window`-width callback. A form or
  grid nested in a dialog, a drawer or a cell must lay itself out from _its_ width; see
  `packages/forms/src/lib/form/form.scss`.
- Token source of truth: `packages/grid/src/lib/styles/_tokens.scss` (`@mixin core-tokens`) — `--oge-bg`,
  `--oge-text-color`, `--oge-border-color`, `--oge-accent`, `--oge-accent-soft`, `--oge-focus-ring`,
  `--oge-radius`, severity tokens, etc. **Components must reference tokens, never raw values.**
- Other packages `@use` the tokens via a relative path into grid
  (`@use '../../../../grid/src/lib/styles/tokens';` — three `../` from a per-component entry's `src/`) and `@include tokens.core-tokens;` at their host class.
  SCSS reads source, not dist — no Nx graph edge results (accepted limitation).
- **Token defaults never live on a component host.** `core-tokens` hoists them (`@at-root`) to
  `:where(:root, .oge-theme-light, [data-oge-theme='light'], .oge-theme-auto, [data-oge-theme='auto'])`
  — zero specificity, so any consumer declaration wins and tokens cascade into subtrees. (Before 1.1
  every host re-declared the whole set, so a `:root` override silently lost and consumers needed
  `html .oge-button` selectors.) A new shared token goes into `literal-tokens` (raw value) or
  `derived-tokens` (an expression over other tokens) — never into a component's host rule.
  Component-local knobs with size variants (`--oge-card-pad`, `--oge-toolbar-gap`) may stay on the host.
- A `var(--oge-x, <literal>)` fallback for a shared token is a bug: the token is always declared, so the
  literal only misleads (and, when the name is misspelt, silently wins — `themes.spec.ts` style checks
  exist because `--oge-text-muted`, `--oge-border` and `--oge-muted-text-color` once did exactly that).
- All styles are global `.oge-*` classes (ViewEncapsulation.None), BEM-ish dashes.
- Themes: source in `packages/grid/src/lib/styles/themes/{dark,high-contrast,bootstrap,tailwind}.css`, shipped as
  **`@oge-ui/core/themes/*`** (core's rollup assets — every package installs core, React ones included)
  and, for pre-1.1 imports, `@oge-ui/grid/themes/*`. They target **scopes, not component hosts**:
  dark is `.oge-theme-dark, [data-oge-theme='dark']` plus the same block under
  `prefers-color-scheme: dark` for `.oge-theme-auto` / `[data-oge-theme='auto']`; high-contrast is
  `.oge-theme-high-contrast, [data-oge-theme='high-contrast']` (its spec also checks AAA text / 3:1 UI
  contrast and a solid `--oge-focus-ring`); the bridges target
  `:root` (bootstrap also `[data-bs-theme]`). A new component needs **no** theme-file entry. Every
  scoped block must re-declare each derived token so a themed subtree re-resolves it —
  `packages/grid/src/lib/styles/themes.spec.ts` enforces that, the zero-specificity emission, and the
  dark/auto blocks being identical.
- Scroll containers the suite draws use `--oge-scrollbar-thumb` / `-thumb-hover` / `-track` (the
  `tokens.scrollbar` mixin, or `scrollbar-color: var(--oge-scrollbar-thumb) var(--oge-scrollbar-track)`),
  never `--oge-border-color` — a border-coloured thumb is invisible on a mouse desktop.
- Focus convention: two rings. Pointer/programmatic focus gets the soft ring
  (`@include tokens.focus-ring($color: var(--oge-accent-soft))`); keyboard `:focus-visible` gets the
  strong ring (`@include tokens.focus-ring`; `($inset: true)` inside clipped cells/rows/tabs). The
  mixin is `outline: 2px solid transparent; outline-offset; box-shadow: 0 0 0 3px var(--oge-focus-ring)`:
  forced colors (Windows High Contrast) drop `box-shadow` but repaint the transparent outline, so the
  ring survives there and is invisible everywhere else. **Never write `outline: none` / `outline: 0`** —
  a rule that hides the UA ring uses `outline: 2px solid transparent` on `:focus`/`:focus-visible`, never
  on the base state (under forced colors a base-state transparent outline is drawn all the time).
  Transitions `120ms ease`. RTL via logical properties; a script that needs the direction asks
  `ogeResolveDirection` (see "Direction (RTL)" below).
- **Forced colors.** Every stylesheet with state (selected, checked, active, focused, disabled,
  progress, chart/gantt marks) ends with an `@include tokens.forced-colors { … }` block using system
  colours only — `Highlight`/`HighlightText` for selection, `CanvasText` for frames and marks,
  `ButtonText`/`ButtonFace` for buttons, `GrayText` for disabled, `LinkText` for links. Forced colors
  replace backgrounds and drop shadows, so a state carried by a tint or a box-shadow ring needs a real
  border/outline/position cue there (switch: thumb position + filled track; kanban card: a border).
  `forced-color-adjust: none` only where colour itself is the meaning (chart series ↔ legend), and
  then with a `CanvasText` edge.
- **Reduced motion.** Every stylesheet that transitions or animates has an
  `@include tokens.reduced-motion { … }` (or `@media (prefers-reduced-motion: reduce)`) block. Script
  motion asks `prefersReducedMotion()` / `motionScrollBehavior()` from `@oge-ui/behavior` (SSR-safe) —
  never a literal `behavior: 'smooth'`.
- **Target size.** A pointer target under 24×24 (WCAG 2.5.8) gets `@include tokens.hit-area` (a
  transparent `::before`: 24px, 44px under `pointer: coarse`) with its visual size unchanged. Inside an
  `overflow: hidden` parent grow the hit area inward instead (the grid column resize handle). Hover-only
  affordances also show on `:focus-within`, on the selected item and under `@media (hover: none)`.
- Icons are inline SVG with `aria-hidden="true"` — there is no icon font or icon package.
- **State colours: idle is not disabled.** `--oge-border-color` is a hairline for frames and
  dividers; a control whose _off_ state is drawn by its outline alone (unchecked check box, radio
  ring, switch track, tree-view check) outlines it in `--oge-muted-color`, or it all but vanishes.
  Idle-but-enabled text a user acts on (unselected tab, unpressed toggle-group segment, switch
  track text) uses the readable `--oge-input-muted`; `--oge-muted-color` plus opacity is what
  disabled looks like. A rule that rotates the dropdown glyph on open is scoped to chevrons — the
  date editors share `.oge-select-box-open` but draw a calendar / clock (`visual-states.spec.ts`).
- **Visually hidden tables use `table-layout: fixed`.** An auto-layout table never shrinks below
  its content, so a 1px sr-only `<table>` (the charts' data table) still widened the page on phones.
- **Viewport units: never a bare `vh` limit.** On mobile `100vh` is the _largest_ viewport (toolbar
  collapsed), so a `max-height: calc(100vh - …)` dialog runs under the browser chrome and the
  on-screen keyboard. Write the `vh` line as the old-engine fallback and follow it with `dvh` (tracks
  the chrome — modal-like limits) or `svh` (stable — content that must not resize while the toolbar
  slides, e.g. the upload lightbox): `max-height: calc(100vh - 64px); max-height: calc(100dvh - 64px);`.
  Widths may keep `vw` (nothing resizes the viewport horizontally).
- **Safe areas.** Surfaces pinned to a screen edge pad with `env(safe-area-inset-*)` — as a floor,
  `max(<gutter>, env(safe-area-inset-top, 0px))`, so the normal gutter is unchanged where the inset
  is 0 (it always is unless the app opts into `viewport-fit=cover`). Done for the modal layer
  (incl. full-screen), toast regions, drawer panels (only the edges they touch, `:dir(rtl)`-aware)
  and the adaptive sheet's home-indicator edge.
- **No iOS focus zoom.** Text inputs reach 16px under `@media (pointer: coarse)` only
  (`font-size: max(16px, 1em)` on `.oge-input-native`; the sheet search field likewise), so mouse
  desktops keep the token-driven density.
- **Anchored panels follow the visual viewport.** `OgeAnchoredPanelCore` positions against
  `ogeVisibleViewport()` (`visualViewport` offset + size, translated back to layout coordinates for
  `position: fixed`), listens to `visualViewport` `resize`/`scroll` (the keyboard and pinch zoom fire
  no window `resize` on iOS) and writes `--oge-popup-available-height` — the room left on the
  resolved side — which `.oge-popup` caps its `max-height` with (`overflow-y: auto`). SSR-safe: no
  `window`, no listeners. A custom property the stylesheets read and only script writes must be
  set with a literal `setProperty('--oge-x', …)` — `themes.spec.ts` scans for that spelling.

### Adaptive (mobile) mode convention

Every popup-based editor — select box, tag box, autocomplete, tree select, date box, date range
box, color box and the drop-down button — takes `adaptiveMode: 'auto' | 'none'` and
`adaptiveBreakpoint` (px) in both layers, with family-wide defaults in the config
(`provideOgeInputsConfig` / `provideOgeButtonsConfig`, the React providers):

- **Default `'none'`, breakpoint 600.** A minor release must not turn existing apps' drop-downs into
  sheets; apps opt in per editor or globally (`adaptiveMode: 'auto'` in the config), the Kendo
  `adaptiveMode` precedent.
- **One presentation primitive.** `oge-popup` / `<OgePopup>` take `adaptive: 'popup' | 'sheet' |
'fullscreen'`, `adaptiveTitle` (the field label) and `closeLabel` (from the owner's messages);
  lists use `'sheet'` (full-width bottom sheet), calendars `'fullscreen'`. The surface is a titled
  `role="dialog"` + `aria-modal` with a close button; editors project a search field
  (`[ogePopupSheetHeader]` / `sheetHeader`) and a Done action (`[ogePopupSheetFooter]` /
  `sheetFooter`) — Done where picks do not close the popup (tag box, multi tree select, date
  range, which then waits for Done instead of closing on the second pick).
- **The modal half is `@oge-ui/behavior`'s `OgeAdaptiveSheetCore`**: focus moves in _before_ the
  background goes inert (inerting a focused field blurs it with no related target), the shared
  ref-counted scroll lock, `inertModalBackground`, a Tab trap, initial focus on
  `[data-oge-sheet-focus]`, focus restore to the element focused before, `visualViewport` tracking
  (`--oge-sheet-viewport-top/-height`, so the sheet rides above the keyboard) and swipe-down on the
  handle. Escape stays with the anchored panel's overlay stack; backdrop and close button call
  `panel.close('escape')`.
- **Editors' focus contract while adaptive:** the field's blur is ignored while the sheet is open
  (focus is in the sheet, the field is inert), Tab never closes (the sheet traps it), and
  `activedescendant` lists move DOM focus into the sheet's search field or, when not searchable,
  the `tabindex="0"` listbox itself. No history entries are pushed (routers own history).
- The viewport query is `matchMedia` (`ogeAdaptiveViewport()` / `useOgeAdaptiveViewport()`), false on
  the server and in React's first client render — the hydrated markup is always the anchored one.
  This is the one place a _window_ width is right: a bottom sheet is about the screen, not the
  editor's container.
- **Grid family: data hidden by width stays reachable.** `columnHidingMode: 'detail'` (default;
  `'hide'` is the old drop) gives each row a toggle in the expander track that reveals the hidden
  columns' caption / value pairs on a second grid line of the same `.oge-row`, rendered through the
  cell path (format, lookups, boolean words, cell templates / `renderCell`). The hiding pass counts
  the toggle's width only once something is hidden (`detailToggleWidth`), which keeps the
  computation acyclic. The scheduler's `adaptiveView` and the BPMN/pivot chrome key off their
  **own** width (ResizeObserver / container queries), never the window. Do not put
  `container-type` on a host that has `position: fixed` descendants (menus, popups): size
  containment makes it their containing block — the pivot field areas wrap intrinsically
  (`repeat(auto-fit, minmax(min(100%, 150px), 1fr))`) for that reason.

### List editors: remote data, pre-events, templates (select box family)

The dropdown list editors — select box, tag box, autocomplete and the multi-column combo box —
share one vocabulary in both layers, and every decision in it lives in `@oge-ui/behavior`:

- **`dataSource` reuses the grid's contract.** The input type is `OgeListDataSource<TItem>` —
  structurally `Pick<DataSource, 'load'>` plus an optional `byKey(value)` — so every
  `@oge-ui/core` source (`CustomDataSource`, `ArrayDataSource`, `CursorDataSource`,
  `ODataDataSource`) fits unchanged. Do not invent a list-specific loader. The machine is
  `OgeRemoteListCore` (`lib/input/remote-list-core.ts`): `skip`/`take` pages + `searchText`,
  `requireTotalCount: true`, one page in flight, an `AbortController` per request (a new query
  aborts the old one and an aborted request never writes state), pages cached per search text,
  `searchTimeout` debounce, `minSearchLength` gating (`showDataBeforeSearch` decides between
  "load unfiltered" and "load nothing"), and remembered items + `byKey` so a committed value
  stays resolvable while the list shows another search. Without `totalCount` a short page marks
  the end.
- **Paging follows the view, never a timer.** The editor calls `notifyVisibleEnd(index)` with
  `max(virtual window end, keyboard active index)`; a non-virtual list loads on
  `isNearScrollEnd` and, after render, fills a page too short to scroll (guarded on
  `clientHeight > 0`, so jsdom never pages itself to the end). In remote mode the list core
  runs with `serverFiltering` (no client-side text filter) and `maxItemCount` does not apply.
- **`aria-setsize` / `aria-rowcount` report the server total**, or `-1` while open-ended.
- **Cancelable `opening` / `closing`** (`OgeDropDownOpeningEvent` / `OgeDropDownClosingEvent`
  with a `reason`) follow the house pre-event pattern. Owner-initiated closes run the veto
  themselves; closes the panel machine starts (outside pointer-down, Escape) go through the new
  `OgeAnchoredPanelCore` `beforeClose` hook. An editor that handles Escape in its own keydown
  calls `stopPropagation()` so the panel's document listener does not run a second close (and a
  second `closing`) for the same key.
- **Templates are `TemplateRef` inputs in Angular and render props in React**
  (`groupTemplate`/`renderGroup`, `fieldTemplate`/`renderField`, `headerTemplate`/`renderHeader`,
  `footerTemplate`/`renderFooter`, `tagTemplate`/`renderTag`) — the pairs are recorded in
  `check-parity.mjs`. `fieldTemplate` paints over the real input (`aria-hidden`, input text made
  transparent) so focus, typing and the accessible value never move.
- **The tag box's "select all" row is an option in the listbox** (`aria-checked` true / false /
  mixed) reached by ArrowUp from the first option — it must be inside the activedescendant
  navigation, because focus never leaves the input. `ogeSelectAllState` / `ogeToggleAllValues`
  act on the visible, enabled items and respect `maxSelectedItems`; the cap's message is a
  `role="status"` line **above** the listbox (a listbox may not own a status).
- **The multi-column combo box is the APG combobox-with-grid-popup.** `aria-activedescendant`
  names the active `gridcell`; Left/Right/Home/End move cells only once the keyboard is in the
  grid (before that they belong to the caret). The sticky header shares the scroller, so the
  virtualizer gets `maxHeight − headerRow` as its viewport — that keeps window and
  `scrollToIndex` arithmetic exact. Column helpers (`ogeComboCellText`, `ogeComboGridTemplate`,
  …) live in `lib/input/multi-column-core.ts`.
- **`OgeSelectListCore.syncItemsSource()` is a no-op for static → static.** A React owner passes
  a fresh `items` array on every render (inline literals, `items = []` defaults); re-seeding the
  state for each identity bumped the store and re-rendered forever.

### Forms: conditions, compare rule, server errors

- `visibleWhen` / `requiredWhen` / `disabledWhen` on items take an `OgeFormCondition` — a
  predicate over the model or `{ field, equals | notEquals | in }` — evaluated by
  `evaluateOgeFormCondition` (behavior). A hidden or conditionally disabled item is **not
  validated**: React skips it in its evaluator loop, Angular's `schemaFromRules` returns no
  errors for it and adds a Signal Forms `disabled()` rule for `disabledWhen`.
- The declarative `compare` rule lives in the shared evaluator; unlike the other format rules it
  checks an empty field unless `ignoreEmptyValue` (DevExtreme parity), and its message is the
  inputs catalog's `compareError`.
- `setErrors()` / `setFieldErrors()` / `clearErrors()` exist in both layers. The form keeps the
  server map as the source of truth for `errors()` and the summary (ungated — the fields are
  marked touched) and clears a field's entry when its value changes. How the editor _shows_ it
  differs per binding, because Signal Forms owns the editor's invalid state: `formData` mode
  feeds the map into its own schema as a `validate()`; `[fieldTree]` mode hands it to Signal
  Forms as **submission errors** (`submit(tree, { action, ignoreValidators: 'all' })`, which
  Angular clears on the next edit — `clearErrors()` cannot retract those early);
  `[formGroup]` mode sets `{ server }` on the control.
- `src/lib/forms/form-values.ts` holds `readPath` / `writePath` / `isEmptyFormValue` so the item
  model and the rule evaluator can share them without an import cycle.

### Grid interaction depth (ranges, clipboard, formats, spans, drag groups)

The spreadsheet layer of both grids is `@oge-ui/behavior` code; the render layers only wire events
and markup. Conventions a change here must keep:

- **One coordinate system.** Cell ranges (`OgeGridRangeSelectionCore`), spans
  (`computeOgeGridSpans`), the fill handle and paste planning all use the keyboard machine's
  coordinates — flat row index (group / detail rows count) × visible column index. Only data rows
  hold cells: every helper takes an `isDataRow` predicate and skips the rest. A new view (any
  `loadOptions` change) clears the ranges instead of re-mapping them.
- **Every value write is one pipeline.** Paste, fill, Ctrl+D / Ctrl+R and undo / redo call
  `OgeGridEditingCore.applyCellValues()`: validators first (`OgeGridEditorBridge.validateValue`,
  sync or async), then staged changes in batch mode or one `runSave` batch otherwise — the same
  `savingChanges` → `rowUpdating` → `savedChanges` events a committed cell edit fires. Read-only
  and calculated columns are skipped by construction. `OgeGridEditHistory` records committed
  cell / row edits and every apply; an undo is an apply of the `before` values (row inserts and
  removals are not in the history — Discard / Undo-delete cover them).
- **Clipboard goes through the native events.** Copy writes the range TSV in the `copy` event
  (`buildOgeRangeTsv`, formula-guarded like the CSV export — a pasted `=HYPERLINK(…)` is the same
  injection); paste reads the `paste` event outside an open editor. `pasteText()` / the React
  handle's `pasteText` are the programmatic twins. In `selectionMode: 'cell'` a single click
  selects — editing starts on double-click, F2 or Enter.
- **Async validation is a bridge capability.** `OgeGridEditorState.pending` makes a commit wait
  on `whenValidated()`. Angular wraps each `AsyncValidatorFn` so its settling is observable
  (Angular runs the first validation with `emitEvent: false`, so `statusChanges` never reports
  it) and bumps a `controlRevision` signal the template reads; React classifies rules into
  sync / async `WeakSet`s on first call so a server check runs once per typed value, not per
  render. Pending editors are `aria-busy` with a visually hidden `validationPending` text — never
  `role="status"` (the e2e suite owns that role for page status).
- **Formats are tokens and custom properties.** `resolveOgeConditionalFormat` returns classes
  (`oge-cf-tone-*`, `oge-cf-bg-*`, `oge-cf-bar-*`, `oge-cf-scale-from/to-*`) and
  `--oge-cf-bar` / `--oge-cf-bar-start` / `--oge-cf-scale` values; colours live only in
  `_structure.scss`, and forced colours swap bars for a `CanvasText` edge. A custom property set
  from a template binding must also appear in a `.ts` record (`'--oge-span-rows': …`) —
  `themes.spec.ts` scans TS/TSX, not HTML.
- **`rowPrepared` / `cellPrepared` hand out the element** — the one deliberate exception to "no
  element back-reference in payloads", because the hook exists for imperative decoration.
  `OgePreparedTracker` fires once per (element, row object), so re-renders stay silent and
  recycled virtual rows report again.
- **Pinned rows are display rows.** Key entries leave the body (`flatNodes` filters them, the
  unfiltered list is `allFlatNodes`); pinned rows render in the sticky header / `.oge-footer`
  sections with `aria-rowindex` offsets (body rows shift by the pinned-top count) and take no part
  in roving focus, selection or editing. Sticky group rows are an `aria-hidden` overlay positioned
  `top: 100%` inside the sticky header — absolute, so they never shift the body — computed from
  the first visible row (`ogeStickyGroupChain`); the real group rows stay focusable.
- **Spans need real DOM rows.** `spanLayout` is `OGE_NO_SPANS` while virtualized or with column
  virtualization. An owner cell sets `grid-column: span n` and, for row spans,
  `height: calc(n × 100% + borders)` over uniform rows; covered cells of later rows render as
  `aria-hidden` placeholders, covered cells of the owner's own row are omitted. The keyboard's
  `spans` hook steps out of the owner's area and snaps into owners.
- **Cross-component row drag is a registry, not a DOM attribute.** `registerOgeRowDragParticipant`
  (behavior) holds `{ componentId, group, element, resolve, over, drop }`; the dragging grid
  hit-tests with `findOgeRowDragParticipant` (innermost host wins) and the drop runs the target's
  `drop`, which emits `rowDrop`. Cross-component drops move no data — consumers move rows, as with
  DevExtreme's `onAdd`. The component id is the host `id` (React: the `id` prop), else an internal
  id. Tree lists do not register yet.
- **Header filter conditions live in the row-filter map** under `ogeHeaderConditionKey(field)`
  (`hf:<field>`), so they persist through `stateKey`, combine with every other filter and clear
  with `clearFilters()` — no snapshot change. The menu re-reads its draft with
  `parseHeaderConditionExpr` (best effort; an unknown shape stays active and `Clear` removes it).
- **Escapes in generated files.** Some editing tools turn backslash-u escape sequences (the
  no-break space, U+202F) into the literal character when writing a file;
  `no-irregular-whitespace` then fails lint. Check new regexes for literal no-break spaces
  before committing.

### Input masks (`OgeMaskCore`)

Every masked editor — the text box's `mask` inputs and `@oge-ui/inputs/masked-text-box` /
`<OgeMaskedTextBox>` — runs `@oge-ui/behavior`'s `OgeMaskCore`; the render layers only wire
events. Rules a change here must keep:

- **The mask owns the text through `beforeinput`.** Every insert/delete `inputType` is mapped by
  `core.beforeInput()` and the event is `preventDefault()`ed; the host writes `el.value` and the
  caret itself (no flicker, no React restore-controlled-state fight). React listens to the
  **native** `beforeinput` — React's `onBeforeInput` is a keypress polyfill without
  `inputType`, so deletions never reach it.
- **Three paths, one engine.** IME composition cannot be cancelled: `beforeInput` returns `null`
  for `insertCompositionText`, the browser renders the composition natively (React keeps it in a
  `compositionText` state so a re-render does not wipe it), and `compositionend` applies
  `insert()` once at the selection captured on `compositionstart`. Input no `beforeinput`
  announced (autofill, some virtual keyboards) arrives as a plain `input` event and is folded
  back with `reconcile()`.
- **Overwrite, never shift.** Typing fills the slot at the caret and skips literals (a typed
  character equal to the next literal is consumed by it — that is what makes formatted paste
  work); Backspace/Delete empty a slot without moving the rest. A collapsed caret types at the
  first empty slot at the latest, so clicking into the placeholder tail never opens a gap.
  Positions are logical indices, so RTL needs nothing.
- **Values are exact inverses.** `setValue(value, includeLiterals)` is the inverse of
  `value(includeLiterals)` (raw: k-th character → k-th edit slot; with literals: position by
  position), which is why the model → mask sync can compare and skip its own commits. React
  compares against the last **model** value seen, never the core's value — a debounced commit in
  flight must not look like an external write.
- **Completeness is a format error, not a parse error.** `OgeControlBase.formatError` (React:
  `useOgeField({ formatError })`) participates in `effectiveInvalid` but follows
  `errorDisplay` (default after blur), unlike `parseInvalid`, which shows while typing. A bound
  reactive control gets a plain `{ mask: message }` validator via `addValidators` (never
  `NG_VALIDATORS` — the DI cycle again); Signal Forms schemas call `ogeMaskComplete()`, whose
  `kind: 'mask'` error resolves to `messages.maskInvalidError`.
- **A secondary entry cannot inherit a template.** `OgeMaskedTextBox` extends `OgeTextBox` across
  entry points, but a partial-compilation template must be a literal in its own file, so the
  masked twin carries a copy of the text box markup. Change both together.
- **No backslashes in snippet templates.** `demoSource()` copies templates into a TS template
  literal without escaping backslashes, so `mask="\#000"` silently loses its escape in the
  generated component. Bind escaped masks from a class field (`'\\A-000'`) instead.

### Segmented dates, number typing, choice groups and colour parts

- **Segmented date entry and time parts are shared machines.** The date box's `useMaskBehavior`
  runs `@oge-ui/behavior`'s non-reactive `OgeDateSegmentCore`, whose template comes from
  `Intl.DateTimeFormat#formatToParts` (Gregorian, Latin digits) — segment order and separators
  are never hard-coded. The host consumes keys on `keydown` (`core.key(event, selection, rtl,
reference)` → `preventDefault`) and writes `core.text` and `core.activeRange()` into the
  native input **before** bumping its reactive revision, so the value binding sees an unchanged
  string and leaves the selection on the active segment. The `input` event is only the fallback
  (autofill, IME, mobile keyboards): the whole text is parsed and re-masked. Commit rules match
  free typing — blur/Enter commits a complete date, an incomplete one reverts, an impossible one
  is invalid while typing. Plain arrows edit segments, so Alt+ArrowDown opens the picker.
- **Pure helpers both layers call:** the 12h / seconds / AM-PM column vocabulary
  (`time-parts.ts`), the range presets (`ogeDateRangePresets`: lazy `range()` so a page left
  open past midnight stays right, labels from the messages by `id`, a custom `label` wins) and
  `formatNumberWhileTyping` (caret kept by significant-character count; the integer part is
  grouped by `Intl` on a `BigInt`, so lakh grouping and digits beyond 2^53 survive).
- **Wheel stepping is a native `{ passive: false }` listener in both layers** (`wheelStep`, only
  while focused) — React's `onWheel` is passive and cannot stop the page scrolling.
- **`@oge-ui/inputs/color-parts` is the colour editors' base entry**: the surface, hue/alpha
  slider, swatch grid (`oge-color-swatch-grid`, so `oge-color-palette` can be the public
  component) and the hex/RGB(A) input row, with one stylesheet (`color-parts.scss`). The colour
  box, `color-gradient` and `color-palette` entries all import it, which keeps the entry graph
  acyclic and keeps the colour box out of the gradient's chunk. The React `styles.scss` lists
  `color-parts` too. The palette grid follows the APG grid pattern: arrows neither wrap nor
  cross rows (`colorPaletteNavIndex`).
- **Choice groups are inputs entries, not buttons.** `oge-check-box-group` and
  `oge-toggle-group` sit on `OgeControlBase` (label, validation subscript, Signal Forms scalar /
  array `value`, CVA); the toggle group runs the button group's selection and arrow-key
  functions from `behavior` (`applyButtonGroupSelection`, `buttonGroupNavIndex`,
  `buttonGroupRole`) so the two cannot drift — `oge-button-group` stays the action/segmented
  control, and buttons keeps no `@angular/forms` peer. Arrays commit in items order, not click
  order; disabled items keep their state under "select all".
- **Signal Forms `required()` treats `[]` as a value.** Array editors express "at least one"
  as `minLength(path, 1, { message })`; reactive `Validators.required` already rejects `[]`.

### Rating, OTP, signature pad, list box, transfer list and mention (W8b)

- **Each editor is an `@oge-ui/inputs` entry over a `behavior` core** (`rating-core.ts`,
  `otp-core.ts`, `signature-core.ts`, `list-box-core.ts`, `transfer-list-core.ts`,
  `mention-core.ts`, `caret-rect.ts`); their strings join `OgeInputsMessages`, so
  `provideOgeInputsConfig()` / `<OgeInputsConfigProvider>` and the locale packs cover them.
- **A `FormValueControl` with a `max` input types it `number | undefined`.** The contract
  declares `max?: InputSignal<NonNullable<T> | undefined>`, so `input(5)` does not satisfy it;
  the rating declares `input<number | undefined>(5)` and treats `undefined` as the default
  (the range slider instead omits the clause — see **Packages**).
- **Fractional fills are two layers, not a gradient.** A rating item draws the empty glyph
  and, on top, the filled glyph inside a clip box whose inline size is the fill share,
  anchored at `inset-inline-start` — half values and RTL need no extra rule, and an item
  template (rendered once per layer with `filled`) gets fractional fills for free.
- **The OTP value is always a contiguous prefix.** Removing a character closes the gap and
  the caret can never sit past the first empty cell, so `value.length === length` means
  complete and forms see no holes. One Tab stop (the caret cell); the `input` event is the
  source of truth (`otpTypedText` strips the selected character a browser kept, but takes a
  whole code — autofill — as is), keydown only handles Backspace/Delete/navigation.
- **Signature strokes are surface-normalized data, the bitmap is a projection.** Points are
  stored 0…1 with timestamps, so a `ResizeObserver` redraw is exact; PNG export needs a 2D
  context and silently falls back to SVG without one (jsdom, SSR). Our own SVG values embed
  the strokes in `<metadata id="oge-signature">` and round-trip as editable strokes; any
  other external value is an image through `sanitizeResourceUrl`. The keyboard alternative
  (WCAG 2.1.1) is the typed-signature mode — a real labelled input rendered into the export.
- **The list box is the select list without a popup.** `OgeListBoxCore` extends
  `OgeSelectListCore` with `opened: () => true` and adds selection, the APG listbox key map
  and type-ahead; it returns the next value and never commits — the host does. The transfer
  list's buttons, Ctrl/⌘+arrow shortcuts and `beginPointerDragDrop` drop all call one
  cancelable move (`moving` → `moved`, `cause: 'button' | 'keyboard' | 'drag'`) and announce
  through the shared live announcer.
- **A `<textarea>` cannot be a `combobox`.** ARIA allows no such role on it (axe
  `aria-allowed-role`), so the multi-line mention field stays a textbox carrying
  `aria-autocomplete` / `aria-haspopup` / `aria-controls` / `aria-activedescendant`; only the
  `multiline: false` field is `role="combobox"`. The popup is the anchored panel with a
  virtual `anchorRect` from `ogeCaretRect` (mirror-div measurement, SSR-safe). Mention tokens
  follow edits by a common prefix/suffix diff (`ogeShiftMentions`): a token the edit touched
  drops out.
- **A structural template directive with no inputs defaults its generic to `any`.** Angular
  cannot infer `T` for `let-item`, and an `unknown` default makes `item.name` fail under
  `strictTemplates` (the snippet gate caught it in the list box and the mention); the
  directive carries an eslint-disable with that reason.

### Direction (RTL)

- **Direction comes from `ogeResolveDirection`.** Layout mirrors through CSS logical properties;
  everything a _script_ decides — horizontal arrow-key maps, pointer `deltaX` maths, absolutely
  positioned SVG `x`, which side an anchored panel opens on — asks `@oge-ui/behavior`'s
  `lib/a11y/direction.ts`: `ogeResolveDirection(el, explicit?)` → `'ltr' | 'rtl'` (an explicit
  `rtlEnabled` wins; otherwise the computed `direction`, then the nearest `dir` attribute for
  engines that do not resolve inherited `direction`, e.g. jsdom), `ogeIsRtl(el, explicit?)`, and
  `observeDirection(el, cb)` (one `MutationObserver` on `<html>` filtered to `dir`, so a later
  language switch re-mirrors a mounted component; returns the disconnect). All three are SSR-safe.
  **Never write `getComputedStyle(el).direction === 'rtl'` in a component** — the copies that
  existed (anchored panel, toolbar, grid context menu, button group, inputs, splitter, menubar,
  stepper, menu list, tab strip, both grids and tree lists) now call the helper.
- **Pure decisions take an `rtl` boolean.** Key maps and delta maths live in the engines/cores
  (`scheduler-engine` keyboard, `OgeGanttCore`, `kanban-engine` interaction + drag math,
  `pivot-keyboard`, `sliderKeyboardTarget`, `menubarBarKeys` …) and receive the resolved
  direction from the render layer, so both layers mirror identically and the specs test the
  decision without a DOM.
- **`rtlEnabled` only where geometry is computed in script** (grid, tree list, charts,
  scheduler, Gantt, kanban, pivot): `boolean | undefined`; unset follows the page (read after the
  first render, kept current with `observeDirection`), an explicit value wins and is also set as
  `dir` on the host so the logical-property layout follows it. Components whose layout is pure
  CSS take no input — wrap them in `dir`.
- **Geometry stays logical; mirror at the edges.** Pointer input becomes a logical x
  (`rect.right - clientX`, inverted `deltaX`) and positions are written as `inset-inline-start`,
  so the maths is direction-free. Absolutely positioned SVG cannot use logical properties: the
  Gantt draws dependency arrows in logical px inside one `<g transform="matrix(-1 0 0 1 W 0)">`
  (`core.arrowsTransform()`), never a `scaleX(-1)` on the whole canvas (it would mirror text).
  RTL `scrollLeft` is negative in Chromium — read it through `Math.abs`, write it negated.
  Render layers without a direct `behavior` dependency reach the helper through their engine
  (`watchKanbanDirection` in `kanban-engine`, `pivotIsRtl` in `pivot-engine`).
- **Dependency-free engines keep twins.** `charts-engine` (`detectChartRtl` / `observeChartRtl`)
  and `bpmn-engine` (`bpmnIsRtl` / `observeBpmnDirection`) copy the rule instead of importing
  `behavior` (their published dependency stance); keep them in step with `direction.ts`.
- **The BPMN canvas stays LTR.** DI coordinates are absolute, so a diagram is the same diagram
  in an RTL page: the canvas and minimap SVGs declare `direction: ltr` (an inherited `rtl` would
  flip every label's `text-anchor`) and the arrow-key nudges move shapes in diagram space. Only
  the chrome mirrors — rail and properties panel swap sides through the flex row, their separator
  keys and drags invert, and the context pad sits left of the shape (`side: 'left'`).
- **e2e proves the geometry.** `apps/dev-app-e2e/src/rtl.spec.ts` boots each page with
  `<html dir="rtl">` in both layers and asserts mirrored positions and arrow keys; jsdom has no
  layout, so unit specs cover only the decisions and the `dir` plumbing.

### Charts: orientation frame, panes and guides

- **Series geometry is logical; only the frame turns.** `charts-engine`'s scene lays everything
  out in a logical frame — argument along `a`, value along `v` (higher values at smaller `v`) —
  and `chart-frame.ts` maps it to the screen: identity, a 90° rotation for `rotated`
  (`matrix(0 1 -1 0 valLen 0)`), or the mirrored rotation for `rotated` + RTL. Both render
  layers draw the series inside one `<g class="oge-chart-plot-frame" [transform]>`, so every
  series type (and any type added later) rotates without per-type code. Text inside that group
  (series value labels) takes `cartesianLabelTransform()` + the scene's `pointLabelAnchor` /
  `pointLabelBaseline` to stay upright; everything else — axis labels and titles, grid, guides,
  break markers, crosshair lines, the zoom rect, annotations — comes out of the scene in
  screen px and is drawn outside the group. Pointer input goes the other way through
  `frameLogical` (`cartesianHoverAt`, `cartesianPlotArgPx`, `cartesianWheelRange(…, y)`,
  `cartesianPanRange(…, dx, dy)`, `cartesianPinchRange`). A new series-level text must follow
  the label rule; a new overlay must be emitted in screen px.
- **RTL is a frame/scale decision, not CSS.** An unrotated chart mirrors through an inverted
  argument scale and swapped value-axis sides; a rotated chart mirrors through the frame. The
  SVG declares `direction: ltr` so a page-level `dir="rtl"` does not flip `text-anchor` a second
  time. `rtlEnabled` unset reads `detectChartRtl()` (computed `direction`, then the nearest
  `dir`) after the first render — SSR-safe — `observeChartRtl` follows a later `dir` flip and
  `refresh()` re-reads it; an explicit value is
  also set as `dir` on the host so the HTML legend and tooltip follow.
- **Panes split the logical value axis.** `layoutChartPanes` gives each pane a band; value
  scales are created per pane and shifted with `offsetChartScale`, so every `valueScale.toPx`
  in the series code lands in the right band untouched. `bindChartPaneAxes` resolves series →
  axis → pane (explicit `axis` wins, a series `pane` takes that pane's first axis or a synthetic
  default one) and the scene writes the bound index back into `scene.data.seriesList[i].input.axis`,
  so downstream readers of `input.axis` stay correct. Stacks and bar slots are recomputed per
  pane; each pane has its own clip path (`<clipId>-<pane>`).
- **Guides share one VM.** Top-level `stripLines`, `argumentAxis.strips/constantLines` and
  `valueAxis[].strips/constantLines` all become `OgeChartGuideVm`s (band or line, plot-local
  px, an edge-aware label). Bands draw under the grid, lines and labels over the series.
  `position: 'outside'` labels reserve margin (`chartOutsideLabelMargins`) before the plot is
  sized.
- **The draw-in is CSS, keyed by the engine.** `resolveChartAnimation` folds the
  `boolean | OgeChartAnimationOptions` input with the local SSR-safe `chartPrefersReducedMotion()`
  (the engine cannot use `behavior`'s). Series groups carry `.oge-chart-series-enter` until
  `duration` after the first render with data, with `transform-origin` from
  `cartesianSeriesEnterOrigin` (the value baseline in logical space), and the keyframes scale
  `y` — which grows columns up and rotated bars sideways alike. The timer only runs in the
  browser.

### Charts: gauges, sparkline and the non-cartesian charts (W8c)

- **One model + layout per chart kind in the engine.** Gauges (`gauge-model`),
  bullet (`bullet-model`), sparkline (`sparkline-model`), funnel
  (`funnel-layout` + `funnel-model`), heatmap, treemap (`treemap-layout` with
  `squarify` / `sliceAndDice`), sunburst, Sankey (`sankey-layout`) and the
  vector map (`geo-model`) each return a plain scene — paths, labels, the
  tooltip VM, the sr-table rows, the aria label and the announcements — and
  the keyboard decisions are pure maps (`visual-keyboard.ts`,
  `chartHierarchyKeyCommand`). The render layers draw the scene and apply
  commands; neither computes geometry or text.
- **Shared Angular base, shared React hook.** `OgeChartVisualBase` (and its
  `…RtlBase`) hold config, messages, the measured size, the page direction,
  the draw-in and `refresh()` / `getSvgElement()` / `print()`; React's
  `useChartVisual` is the twin. Not public API.
- **Colours stay CSS.** Data-driven fills that reference tokens (colour
  scales, treemap depth shades, bullet bands, gauge ranges) are written to
  the inline `style` as `var()` / `color-mix()` so they follow the theme;
  `serializeChartSvg` replaces those inline values with the computed colour,
  so exports stay standalone. Never put a token into a `fill` attribute.
- **Meters, not images, for gauges.** Gauges are `role="meter"` with the svg
  `aria-hidden` and the sr table outside the meter (its children are
  presentational); `aria-valuenow` is clamped into the scale while
  `aria-valuetext` speaks the real value and the labelled range.
- **Indicator motion is a CSS transition.** The needle / marker rotate or
  translate through `style.transform`; the bar is a stroke with
  `pathLength = 1000` and a four-entry `stroke-dasharray`, so CSS
  interpolates it. The first-render sweep paints the scale minimum for one
  frame (`requestAnimationFrame`) and then the value.
- **Sparkline entry.** `@oge-ui/charts/sparkline` must not import the
  primary entry (which re-exports it), so the DI config lives in its own
  `@oge-ui/charts/config` entry; specs guard the sparkline's import list in
  both the engine model and the component.

### Scheduler depth: grouping, availability, history and exports

- **Grouping is a leaf list, not a field.** `scheduler-engine/grouping.ts` resolves `groups`
  (outermost first) into levels and their cartesian leaves; every grouped column, row block and
  timeline row is one leaf carrying the values of _all_ levels. Day/week placement goes through
  `buildDayWeekGroupLayout` (date-major for `groupByDate`, resource-major otherwise, row blocks
  for `groupOrientation: 'vertical'`), so a view never computes a column index itself — hit
  tests (`dayWeekSlotAt`), drag deltas and keyboard moves all ask the layout. Header rows come
  from `buildColumnHeaderRows` / `buildRowHeaderBlocks` with spans, and the resource-header
  template / render prop receives `{ item, resource, level, view }` for every one of them.
- **Every write passes one guard.** `OgeSchedulerCore`'s insert/update path checks blocked
  slots (`availability.ts`: predicate or ranges with RRULE + resource scope) and conflicts
  (`conflicts.ts`: series expanded, a look-back for occurrences starting earlier, same leaf
  when grouped) _before_ the cancelable `-ing` events. A refusal sets the core's `notice` cell
  (rendered as a visible status for 4 s) and announces it; it never throws. New mutating paths
  — paste, drop, undo replay — must go through `insertItem` / `updateItem` with `guarded`.
- **History records applied store changes.** `history.ts` keeps operations (`insert`,
  `update` with before/after items, `remove`), grouped by `transaction()` so a paste or a
  detached occurrence is one step; undo replays the inverses through the normal cancelable
  pipelines, so the `-ing` / `-ed` events fire for an undo exactly as for the original edit. The clipboard (`clipboard.ts`) stores item copies with keys
  dropped and pastes relative to the earliest copy. Shortcuts are decided by `schedulerShortcut`
  and ignored inside editing targets (`isSchedulerEditingTarget`).
- **External drag is a registry, with a keyboard twin.** Mounted schedulers register their host
  in `external-drag.ts`; `beginOgeSchedulerExternalDrag` runs the shared `beginPointerDragDrop`
  and hit-tests the innermost registered host — no HTML5 drag and drop. Picking up from the
  keyboard (`ogeSchedulerDraggableKey`) arms a module-level payload that the next Enter / click
  on any scheduler cell takes. A chip released outside its own rect (`isOgeSchedulerDragOut`,
  which ignores unmeasured rects so jsdom specs stay moves) is a drag-out.
- **Message keys added after 1.1 are optional.** The catalog interfaces mark them `?`, and
  `fillSchedulerMessages()` deep-fills from the English defaults into
  `OgeSchedulerResolvedMessages`, which is what the core and both layers read. A locale pack
  that predates a key keeps type-checking and falls back to English; plural strings are ICU
  messages formatted with `ogeFormatMessage`.
- **Exports are lazy entries over one model.** `getExportData(range?)` returns appointments
  (series unexpanded) plus expanded, chronological rows; `scheduler-engine/export-ical|pdf|excel`
  are pure builders and each layer's `/export-*` entry only adapts its scheduler type and
  downloads. The PDF builder takes the shared `setOgePdfDefaultFont` font. iCalendar writes
  `TZID=<IANA zone>` values (the series zone, else the display zone; floating local time
  without either) and reads `TZID` through core's `ogeFromZoned`; no `VTIMEZONE` is
  emitted, an unknown (Windows) zone name reads as floating time.
- **Remote range loading is a machine of its own.** `range-loader.ts`
  (`SchedulerRangeLoader`) owns one request per visible range (instants), the prefetched
  neighbour periods, the navigation debounce (the first load is immediate), the
  `AbortController` per range (a range neither current nor a neighbour is aborted; an
  aborted answer never writes), an LRU range cache and the loading / error cells. The core
  binds it for an `OgeSchedulerDataSource` (a `load` without `capabilities`) or a filtering
  core `DataSource` with `remoteFiltering` (`schedulerRangeFilter`: overlap **or** any
  recurring series — a server cannot expand RRULEs). Hosts call `core.syncRange()` from an
  effect over the view inputs (Angular) or after every render (React; a no-op for an
  unchanged range). A write through the source's `insert` / `update` / `remove` reloads the
  range; a local write updates the cached range (`replaceCurrent`).
- **Timeline rows are fixed-height and virtualized.** `timelineRowHeight` derives each row's
  height from its lane count, the rows feed core's `OffsetTree` and `timelineVirtualWindow`
  renders the visible window (`virtualScrolling: 'auto'` above 50 rows). Month/year timelines
  run at day scale (`TimelineGridVm.scale === 'day'`), one bar per day span.

### Time zones: zoned date math lives in core

- **One helper set, `Intl`-only.** `@oge-ui/core` `util/time-zone.ts` derives a zone's
  offset from `Intl.DateTimeFormat({ timeZone })` (through the shared formatter cache):
  `ogeTzOffset`, `ogeZonedParts`, `ogeFromZoned` (Temporal's `compatible` / `earlier` /
  `later` disambiguation — skipped wall times move forward, repeated ones take the earlier
  side), `ogeZonedStartOfDay`, `ogeZonedDayMinutes`, `ogeTimeZones`, `ogeTimeZoneLabel`.
  Never compute an offset with `getTimezoneOffset()` or ship a zone table; specs pin
  New York, Istanbul (historic DST), Lord Howe (half-hour DST) and Kathmandu (+5:45).
- **Engines compute in a wall-clock frame.** The scheduler and the Gantt were written in
  local wall time; with a display `timeZone` their model dates are **wall clocks** of that
  zone (`ogeToWallClock`: a `Date` whose local fields read as the zone's clocks) and every
  write converts back (`ogeFromWallClock`). So slot generation, day boundaries (23- and
  25-hour days are still midnight → midnight), drag snapping, work hours and calendars need
  no zone code; only the edges do — normalization (`normalizeAppointment`,
  `buildGanttTasks`), serialization (`serializeSchedulerDate`, `ganttTaskPatch`), the core's
  inputs (`viewDate()`, `viewMin/Max()`, `viewDisabledSlots()`, "now") and the public
  events (`cellDate`, `rangeSelected`, `getStartViewDate()` are instants). New date paths
  must go through those edges. All-day values are calendar days and never shift. The frame's
  one limit: a wall time the _runtime's_ own zone skips cannot be held by a local `Date`.
- **Recurrence runs on the series' own clocks.** The zone is `DTSTART;TZID=` in the rule,
  else the appointment's `startTimeZone`, else the display zone (`schedulerRecurrenceZone`).
  A different zone expands there (window padded a day) and converts each occurrence back;
  `parseRecurrenceRule(text, { timeZone })` converts `Z` / `TZID` stamps into the frame and
  EXDATE stamps of a detached occurrence are written in the series zone
  (`occurrenceSeriesStart`).
- **The editor has its own frame.** With `showTimeZoneEditor` the editor model carries
  `timeZoneFrame`: its dates are wall clocks of the item's start / end zones and the pickers
  edit those zones; `editorZones()` names the frames on save.

### Gantt depth: scheduling engine, task list, resources and MS Project

- **One scheduling engine, pure.** `gantt-engine/engine/schedule.ts` owns every date decision:
  `scheduleGanttProject` (topological forward pass — lag/lead on all four link types via
  `applyGanttLag`, working days on a calendar, constraint floors/pins/caps — then an ALAP
  backward pass), `detectGanttConflicts` (link, constraint and deadline violations of the
  _current_ dates) and `computeGanttSlack` (total/free slack; `criticalPathKeys` is its zero set).
  Links touching a summary are drawn but never scheduled; manually scheduled tasks are inputs,
  never outputs. Unlinked ASAP tasks keep their start unless `projectStart` is set — so turning
  `autoScheduling` on never collapses a plan to one date. `autoScheduleForward` (push-only) stays
  exported for 1.x callers; the core no longer uses it.
- **Conflicts are derived, the event is host-scheduled.** `core.conflicts()` re-derives from the
  store; hosts call `core.syncConflicts()` from an effect (Angular) or after each render (React),
  which emits `schedulingConflict` only when the conflict signature changes — including when it
  empties.
- **Bulk edits are one undo step.** `core.batch()` takes one snapshot and defers auto-scheduling to
  the end; bulk delete/indent/outdent, predecessor-cell diffs and `setBaseline()` run through it.
  New multi-item mutations must too.
- **The task list is a view over the store.** Sort reorders siblings via `buildGanttTasks`'
  `order`, filters pass `include` (matches + ancestors, collapse ignored while filtering); WBS
  numbers always follow the store order. Column order/width are core cells, not inputs (events
  report them). Headers become one roving tab stop only when sorting/resizing/reordering is on;
  the resize grip is an `aria-hidden` span with Alt+Arrow as its keyboard twin, reordering's twin
  is Ctrl+Shift+Arrow (house `grid-keyboard-moves` scheme). The pane head is pinned to the chart
  scale's height (49px) so rows and lanes stay aligned with or without the filter row.
- **Inline editing commits on Enter / Tab / blur, never per keystroke.** The editor value lives in
  `core.editingCell`; the React editor is an uncontrolled input synced in a layout effect. The
  editor's keydown stops propagation — the row map would otherwise delete the task on Backspace.
- **Resource view rows are synthetic.** `buildResourceViewRows` emits group rows (key prefix
  `GANTT_RESOURCE_ROW_PREFIX`, `source: null`) and assignment copies under composite keys whose
  `source` is the real item; `core.realKeyOf()` maps a row back for selection, critical path and
  conflicts. Every mutation path guards `source == null`; arrows are hidden in that view.
- **Message keys added in G3b are optional**, deep-filled from English by `fillGanttMessages` into
  `OgeGanttResolvedMessages` (what `core.msg()` returns) — the scheduler's rule.
- **MS Project XML has its own tokenizer.** `engine/msproject.ts` parses MSPDI without `DOMParser`
  (no new Trusted Types sink, DTDs skipped, only predefined/numeric entities), maps midnight dates
  to 08:00–17:00 and back so a round trip is lossless, and returns plain data in the default field
  names. Resource ids come back as MSPDI UIDs. `/export-msproject` is a lazy entry in all three
  packages although it has no peer.

### Kanban depth: filters, selection, transfers and history

- **The visible board is one pipeline.** Both layers derive it the same way:
  normalize → toolbar search (`filterCards`) → `applyKanbanFilters` over the
  compiled `filter` input/prop and the chip bar's `filterValue`
  (`compileKanbanFilter`: a predicate or an expression — any-of inside a field,
  all-of across fields) → `groupBoard` → `sortKanbanLanes(columnSort)`. Counts
  (column WIP, `kanbanCellCounts` / `kanbanLaneCounts` for the per-swimlane
  limits), the chip choices and `getExportData()` read the **unfiltered**
  cards — WIP is a data fact. `sortKanbanLanes` returns untouched lanes by
  identity, so memoized views and drag geometry stay stable when nothing sorts.
- **Selection is a key list plus an anchor.** `kanbanSelectCard` decides
  Ctrl / Shift / plain clicks (Shift ranges stay inside the anchor's cell),
  `kanbanSelectionShortcut` the keys (Ctrl+A cell, Ctrl+Space, Shift+↑/↓,
  Escape). `selectedCardKey` stays the primary card for backward
  compatibility; `selectedCardKeys` is the set. A plain pointer-down on an
  already-selected card must **not** reset the selection, or a multi-card
  drag could never start — the click decides instead.
- **Multi-card moves insert before one anchor.** `kanbanMultiMoveAnchor` picks
  the first non-moving card at the drop index (counted without the dragged
  card, like the hit-test), and each carried card is moved through the
  ordinary `cardMoving` pipeline before that anchor (`kanbanAnchorIndex`), in
  board order — so `orderExpr` midpoints, array reordering and the per-card
  events all stay the single-card code path.
- **Cross-board drag is a registry, not HTML5 DnD.** Mounted boards register
  a `KanbanBoardPeer` (`board-registry.ts`); a drag that leaves its own host
  hit-tests the peers of its `dragGroup` (`kanbanPeerAt`, unmeasured hosts
  never match so jsdom stays local), the peer measures itself and previews the
  placeholder, and the drop calls `peer.receive()` — the target's cancelable
  `cardTransferring`, then `cardTransferred` on **both** boards (source removes
  `sourceCards`, target adds `cards`). The card menu's "Move to {board}" is the
  keyboard and single-pointer twin. Transfers are deliberately outside the
  undo history: a step that spans two boards cannot be undone by one of them.
- **History records what the pipelines applied** (`KanbanHistory`: insert /
  remove with the store index, update before/after, move from/to places),
  grouped by `transaction()` for multi-card moves and bulk deletes. Undo
  replays the inverses through the same pipelines (capability gates bypassed
  only for the replay), locating items **by key**, so hosts that re-bind
  `dataSource` from the events keep a working history. The board's host
  keydown handles Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z outside editing targets.
- **Message keys added in G3b are optional** and resolved with
  `fillKanbanMessages()` into `OgeKanbanResolvedMessages` (same rule as the
  scheduler); counts use ICU plurals through `formatKanbanCount`
  (`ogeFormatMessage`). Exports: `buildKanbanExportRows` → `buildKanbanCsv`
  (core's guarded `buildCsv`) and the lazy `@oge-ui/kanban-engine/export-excel`
  builder that both `/export-excel` entries wrap.

### Overlay, navigation, layout and buttons depth (G5a)

- **Popover and callout arrow.** `OgePopoverCore` (`behavior/lib/overlay/popover-core.ts`)
  owns trigger timing (hover dwell + grace into the panel), open / close reasons, focus and the
  ARIA decisions. Both layers keep the anchored panel's own closes inside the pipeline
  (`beforeClose: core.beforePanelClose` always returns `false` and re-enters through `close()`),
  so Escape and outside clicks fire the same cancelable `closing`. A portaled non-modal panel keeps
  its focus order "as if inline": Tab on the trigger enters the panel, Tab from its last stop goes
  to `nextTabbableAfter(trigger)`, and focus leaving closes it. Trigger ARIA is written
  imperatively (`syncPopoverTriggerAria`) onto the trigger's focusable control, never onto a
  wrapper host, and `aria-expanded` is left off text fields. The arrow is anchored-panel data
  (`arrow` option → `position().arrow`, `resolvePopupArrow`), drawn as a rotated square from
  `popup/_callout-arrow.scss` with physical sides (the geometry is measured, so RTL is already
  resolved); under forced colors it draws a `CanvasText` chevron, because forced colors repaint
  transparent borders.
- **Tooltips stay non-interactive.** Template / render-prop content and the click / focus /
  manual `showMode`s route through `OgeTooltipCore`; the bubble keeps `pointer-events: none` and
  never joins the Escape stack. Interactive content belongs in a popover.
- **Context menus resolve a target before they open.** `ogeResolveContextMenuOpen`
  (`context-menu-core.ts`) maps a pointer, keyboard or `open(x, y)` request to the delegated
  `closest(target)` inside the host, then runs the cancelable `opening` (whose `items` the handler
  may replace per target). A cancelled opening still suppresses the browser menu; an ignored
  request (outside every target) leaves it alone.

- **Dialog helpers are a core plus markup.** `behavior/lib/overlay/dialog-helpers.ts`
  (`resolveOgeDialog`, `OgeDialogCore`) resolves options, the initial focus (prompt → the
  field, `danger` confirm → Cancel, otherwise OK), the Enter / Escape defaults and the prompt
  validation flow (only the latest async run counts). The render layers open the dialogs through
  their modal service with `dialogRole` / `ariaDescribedBy` / `autoFocus` and draw only the
  markup. A core built outside render (React `confirm()`) is held in a versioned store read with
  `useSyncExternalStore`. The modal input is `dialogRole`, not `role`, because a static `role`
  attribute would also stamp the host element.
- **Non-modal windows never join the overlay Escape stack.** `oge-window` / `<OgeWindow>`
  (`OgeWindowCore`) keep their own z-order in `window-stack.ts`, which both layers share, so
  windows of either layer stack together. A window handles Escape locally, and only when focus
  is inside it and `overlayStackSize() === 0`, so a popup opened inside it closes first. Window
  geometry is physical viewport px (like BPMN DI); only the placements are logical
  (`start` / `end` through `ogeIsRtl`). An element that stays `visibility: hidden` until it is
  placed is focused one render after the placing render. `--oge-z-window` (900) sits below
  popups (1000) and modals (1100).
- **Menus own no check state.** `OgeMenuItem.type` (`checkbox` | `radio` | `header`) picks the
  role, and the menu reports the next state in the item-click event's `checked`. The owner
  updates its items, usually with `applyMenuItemCheck` (immutable, any depth; a radio unchecks
  the rest of its `group`). Rows that set only `checked` and no `type` keep their historical
  `menuitemcheckbox` rendering. Space keeps check and radio rows open (APG); `keepOpen` keeps
  any row open. The list keeps its active row across a re-render with the same rows
  (`menuRetainedActiveIndex`). Header rows are `role="presentation"` captions that label a
  `role="group"`, and every navigation helper skips them through `isMenuItemNavigable`
  (`behavior/lib/menu/menu-item-state.ts`).
- **Overflow that must stay measurable stays rendered.** The menubar's `overflowMode: 'more'`
  keeps overflowed entries in the DOM, absolutely positioned with `visibility: hidden`. That
  takes them out of the accessibility tree and the tab order while `fitToolbarItems` can still
  read their natural width (`resolveMenubarOverflow`). The synthetic More entry
  (`OGE_MENUBAR_MORE_KEY`) is a normal roving-tabindex stop.
- **Toggle buttons.** `resolveButtonSelectionState` (`behavior/lib/button/button-toggle.ts`)
  lets a `single` / `multiple` button group always own the selection. Outside one, including a
  `selectionMode: 'none'` toolbar group, `toggle` renders `aria-pressed`. The buttons family has
  no `-ing` events, so the toggle has none either.
- **Cross-tree moves are a registry.** Mounted trees with `allowDragging` register an
  `OgeTreeDragPeer` (`behavior/lib/navigation/tree-view-transfer.ts`) under
  `ogeTreeDragGroupOf(dragGroup, treeId)`; an ungrouped tree's group is private.
  - Pointer drags (`beginOgeTreeDrag` on `beginPointerDragDrop`) hit-test the innermost peer
    host.
  - Ctrl+X / Ctrl+V is a per-group clipboard.
  - Both paths run `ogeTreeCommitMove`: the target's `itemReordering` → `itemReordered`, then
    the source's `itemTransferred`, then an announcement.
  - Trees move no data; the app applies the move.
- **Tree items may hold a transient editor.** Label editing puts an `<input>` inside
  `role="treeitem"`. That is legal because treeitem has no presentational children, so axe's
  `nested-interactive` does not apply. The editor's keydown stops propagation, and it commits on
  Enter / blur, never per keystroke. "Load more" rows are `OgeTreeViewNode`s with `more` set:
  their keys use the reserved `OGE_TREE_LOAD_MORE_PREFIX`, they carry no posinset / setsize, and
  the real children keep `aria-setsize` equal to the true total.
- **Drawer items are a tabbable list, not a composite widget.** They are real links / buttons,
  each in the Tab order, with `aria-current="page"` on the active one; arrow keys are a
  convenience. The swipe is touch-only, on `beginPointerGesture` with `touchLock: false` plus CSS
  `touch-action: pan-y` / `pan-x`, so a cross-axis scroll still works. It is opt-in
  (`swipeEnabled`), because a minor release must not change existing apps.
- **The panel bar is an APG disclosure, not a treeview.** A `role="tree"` may own only tree
  items, but panel bar groups hold free content. So every header is a `<button>` in the Tab
  sequence and arrow keys are an opt-in layer. Stand-alone toggles (expansion panel, panel bar
  groups) run `runOgeExpansionToggle` (pre-event → guard → commit). The expansion panel's
  past-tense events are `opened` / `closed` because its model is named `expanded`.
- **Loading overlays mark the covered container busy, never `<body>`, and never use `inert`.**
  `ogeAcquireLoadPanelTarget` ref-counts `aria-busy` and restores the previous value. Making the
  target inert would blur a focused field and drop focus to `<body>`, so pointer input is blocked
  by the shade instead. A full-screen panel without a target marks nothing busy: `aria-busy` on
  `<body>` would mute the shared live regions its own message goes to. A React component that
  calls `createPortal` declares `react-dom` as a peer (`@oge-ui/react-layout`).

### BPMN depth: validation, extension points and Camunda (G5b)

- **Rules are data plus a pure check over the immutable model** (`lint.ts`:
  `OgeBpmnLintRule { id, severity, check(model, context) }`). The same
  `lintBpmnDiagram()` runs live in the editor core (`lintIssues` derived, the
  host's effect calls `syncLint()` so `lintChanged` emits only on a real
  change), behind `validate()` and headless on a server. `lintRules` merges by
  id — a full rule adds or replaces, `{ id, severity }` re-grades, `'off'`
  removes — and a throwing rule is skipped, never fatal. Badges are
  `aria-hidden`; the problem text is appended to the element's accessible
  name (WCAG: the information is not in the badge only). The problems panel is
  a `role="region"` of real buttons: click / Enter selects and centers.
- **Every extension point is data plus callbacks.** The properties panel is a
  list of providers (`OgeBpmnPropertiesProvider.getGroups(context)`) whose
  entries carry a `set(value)` returning an engine command, so every field —
  built-in or custom — commits one undoable step through `onPanelCommand`.
  The G5b built-ins (event details, "Move to…", documentation) are themselves
  providers (`OGE_BPMN_DEFAULT_PROPERTIES_PROVIDERS`), merged with the input
  by id. Custom entries are an Angular `ng-template[ogeBpmnPropertiesEntry]`
  and a React `renderPropertiesEntry` render prop — recorded as a parity pair.
  Palette / context-pad entries and `renderers` take icons and shapes as
  `OgeBpmnSvgNode` trees (`bpmnSvg` builders, `sanitizeBpmnSvg` allowlist:
  presentational tags and attributes only, no `href`, `on*`, `style` or
  external `url()`); Angular draws them through `<svg:*>` templates with an
  attribute directive, React through `createElement` with the engine's
  attribute → prop map. There is no markup-string path — keep it that way.
  Custom hotkeys never shadow the canvas's built-in keys (`bpmnHotkey`).
- **Extension elements are an editable tree, not a string.** The reader turns
  an attribute-less `<bpmn:extensionElements>` into `BpmnXmlElement[]`
  (qualified names, `#text` / `#comment` for mixed content, `xmlns:*` added on
  the element when the prefix is not declared on `<definitions>`), and the
  writer serializes it deterministically — Camunda files still round-trip
  byte-identically after the first write. Edits declare `xmlns:zeebe` /
  `xmlns:camunda` on `<definitions>` (`declareBpmnNamespace`). The writer
  drops element and attribute names that are not QNames, so a hostile JSON
  envelope cannot break out of a tag. `documentation`, event-definition
  payloads (`BpmnEventDetails`) and the definitions-level messages / signals /
  errors / escalations (`rootElements`) are first-class model fields; the
  derived `{eventId}_def` id is not stored, an imported one is (and stripped
  from pasted copies so ids stay unique).
- **Camunda / Zeebe and element templates share one binding vocabulary**
  (`OgeBpmnPropertyBinding`, `bpmnBindingValue` / `setBpmnBindingCommand`).
  The Camunda preset (`OGE_BPMN_CAMUNDA_PROVIDERS`) is opt-in — the default
  panel stays vendor-neutral. List edits keep empty rows (a just-added row
  must survive until it is filled) and leave complex Camunda 7 parameters
  (`camunda:list` / `map` / `script`) untouched.
- **Re-parenting: the pointer drop runs the keyboard command's half.**
  `bpmnContainerAt` resolves the innermost expanded sub-process, else the
  pool, under the dragged element's center (the move set excluded); the drop
  composes `moveElementsCommand` + `reparentElementsCommand` into one undo
  step, and the panel's "Move to…" select is `moveToContainerCommand`
  (position inside the target, then re-parent). Sequence flows that would
  cross pools or scopes are removed; lanes stay geometric. Pools never
  re-parent, a drop outside every pool keeps the current container.
- **PNG export rasterizes in the render packages** (`bpmn-png.ts` in both
  layers, a canvas and an `Image` of the SVG export) — the engine stays
  DOM-free and dependency-free; jsdom / SSR resolve `null`.
- **New strings are optional blocks** (`lint`, `extensions`, `camunda`)
  filled key by key from English by `fillBpmnMessages()`; the core's `msg()`
  is the resolved catalog.

### Layout and feedback components (W8a)

Seven small components, each its own secondary entry with its decisions in a
`behavior` core (`lib/layout/{avatar,badge,chip,alert,timeline,app-bar}-core.ts`,
`lib/button/fab-core.ts`), so the two render layers only draw markup.

- **Decoration is `aria-hidden`; the meaning travels as text.** An avatar is
  `role="img"` named by `ogeAvatarLabel` (name + presence through the
  `withStatus` message — the status dot itself is decoration), unless
  `decorative`, when the visible name beside it is the label and the avatar
  leaves the tree. A badge's glyph ("5", "99+", the dot) is always
  `aria-hidden`; its **description** ("5 new items", ICU plural) is an inline
  visually hidden span when the badge stands alone, and — when it overlays
  content — a hidden span referenced from the anchored control's
  `aria-describedby` (`syncOgeBadgeHostAria`, written imperatively onto the
  first focusable element of the projected content, keeping the control's own
  ids). `announce` adds a polite live region that speaks changes, never the
  first value. Visual overflow ("99+") and spoken overflow ("More than 99 new
  items") are separate catalog strings.
- **A chip list picks its APG shape from what it can do** (`ogeChipListRole`):
  selectable → `listbox` of `option`s (roving tab stop, Space / Enter toggle,
  the ✕ an `aria-hidden` glyph with Delete / Backspace advertised in
  `aria-keyshortcuts` — the tab strip's nested-interactive rule); removable
  only → layout `grid` (one `row` per chip, label cell + a cell with a real
  remove `<button>`, arrows walk `ogeChipGridStops`); neither → a static
  `list`. A list moves no data: `itemRemoving` (cancelable) → `itemRemoved`,
  the app drops the item, focus lands on `ogeChipFocusAfterRemove`. A
  stand-alone `oge-chip` is not composite, so its remove control is a real
  sibling button.
- **Alert role follows severity**: `error` / `warning` → `role="alert"`,
  `info` / `success` → `role="status"`, `live` overrides (`off` = no live
  role for permanent notes). A visually hidden severity prefix keeps the
  meaning off colour alone. Dismissing an alert that holds focus hands focus
  to the next tabbable element (`ogeAlertFocusAfterClose`) instead of dropping
  it to `<body>`.
- **A timeline is an `<ol>`** — no APG pattern exists and nothing in it is a
  widget, so it adds no roles and no keyboard model. Marker and connector are
  decoration; a `Date` time renders as `<time datetime>` from the **local**
  fields (`ogeTimelineDateTimeAttr`, never `toISOString`) and formats through
  the core Intl cache.
- **An app bar adds a landmark only on request** (`landmark`: `banner` /
  `contentinfo` / `navigation` / `region`, default `none`). Banner and
  contentinfo must be unique and top-level, so a default would collide with
  every page header that hosts a bar; `aria-label` is written only when a
  landmark can carry it. Sticky / fixed bars pad with `env(safe-area-inset-*)`
  as a floor.
- **The speed dial is the APG menu button**: the FAB carries
  `aria-haspopup="menu"` / `aria-expanded` / `aria-controls`, the actions are
  `menuitem`s whose label bubble is their accessible name, focus moves into
  the menu on open (not on hover-open), arrows run along the dial axis
  (`ogeSpeedDialAwayKey` — mirrored in RTL for start / end dials) and wrap,
  Escape returns focus to the FAB, Tab closes. The dial unfolds away from the
  edge the FAB is pinned to unless `direction` says otherwise.
- **Stacking**: `--oge-z-app-bar` (700) < `--oge-z-fab` (800) <
  `--oge-z-window` (900) < popups (1000) < modals (1100), so a FAB never hides
  under a bottom bar and every popup still covers both.

### Carousel, action sheet, list / data view and tile layout (W8d)

Four layout entries (`@oge-ui/layout/{carousel,list-view,data-view,tile-layout}`)
and one overlay surface (`OgeActionSheet` in `@oge-ui/overlay`), each with its
decisions in a `behavior` core (`lib/layout/{carousel,list-view,data-view,tile-layout}-core.ts`,
`lib/overlay/action-sheet-core.ts`).

- **A carousel is the APG carousel, with the picker shape derived from the
  view.** The host is a `region` (named by `ariaLabel`; an unnamed one falls
  back to a `group` named by the `label` message, never an unnamed landmark)
  with `aria-roledescription="carousel"`; slides are `group`s (or `tabpanel`s)
  named "Beach, 2 of 5" and every slide out of view is `inert` +
  `aria-hidden`, so a link in a hidden slide never takes a Tab stop. With one
  slide per view the picker is the **tabbed** carousel (a `tablist`, automatic
  activation, ←/→ mirrored in RTL, Home / End); with several a picker entry no
  longer maps to one panel, so it becomes the **grouped** carousel's row of
  `aria-current` buttons (`ogeCarouselPickerMode`). Previous / next are
  `aria-disabled` at an end — `disabled` would drop the focus the user is
  standing on.
- **Rotation follows WCAG 2.2.2 and the APG to the letter.** The rotation
  control is rendered first and always visible; pointer hover and a hidden tab
  are temporary holds (`OgeCarouselAutoplay.hold/release`), keyboard focus
  entering the carousel is a user **stop** that only the user (or `play()`)
  undoes — a pointer press, which also moves focus, is told apart by a
  `pointerdown` flag. The slides are `aria-live="off"` while rotating and
  `polite` once stopped; rotation always rewinds; under
  `prefers-reduced-motion` it starts stopped. `loop` rewinds rather than
  cloning slides, so the accessibility tree always holds the real count.
- **The carousel track is a script-driven scroll-snap container**
  (`overflow: hidden`, which is still a scroll container, so programmatic
  scrolls snap; and never a keyboard-scrollable region with nothing to
  focus). Offsets are `index × step` with the step measured from two rendered
  slides and negated in RTL (`ogeCarouselScrollOffset` — engines report RTL
  scroll offsets as zero-or-negative). Swipes run on `beginPointerGesture`
  with `touchLock: false` + `touch-action: pan-y` (a vertical pan still
  scrolls the page) and switch snapping off while dragging; the release lands
  on `ogeCarouselSwipeTarget` (a fifth of a slide or 48 px).
- **The action sheet is a modal dialog holding an APG menu.** A
  `role="dialog"` + `aria-modal` labelled by its title (or the
  `actionSheetLabel` message), portaled to `<body>` like the popover, with a
  `role="menu"` of `menuitem` buttons (one tab stop, ↑/↓ wrap past disabled
  rows, Home / End — `ogeActionSheetKeyIntent`) and Cancel as a separate
  button, so Tab moves between exactly two stops inside the trap. Disabled
  actions stay focusable (discoverable) but never run. `OgeActionSheetCore`
  owns the modal half through the house primitives — the ref-counted scroll
  lock, `inertModalBackground`, the overlay Escape stack, `trapTabKey`, focus
  restore — and dismisses on a backdrop press and a swipe down from the
  handle / header (`beginPointerGesture`, `OGE_SHEET_SWIPE_DISMISS`). Its
  strings are two optional `OgeOverlayMessages` keys, so the overlay slice of
  every locale pack carries them. `open()` resolves with the chosen action or
  `null`.
- **A selectable list view is a listbox whose scroll viewport owns focus**
  and tracks the active option with `aria-activedescendant` — the one focus
  model that survives windowing, because only the active option has to be
  rendered; keyboard navigation scrolls it into the window first.
  `selectionMode: 'none'` is a `role="list"` with a roving tab stop. Groups
  render as labelled segments in both modes (`group` + `aria-label`, or a
  `listitem` holding a labelled nested `list`) whose visible header is
  `aria-hidden` and `position: sticky` inside its segment; a window that
  starts mid-group pins that group's header (`ogeListViewSegments`). Items
  carry `aria-posinset` / `aria-setsize` over the whole filtered list. Swipe
  and hover actions are `aria-hidden` glyphs inside the option (the
  nested-interactive rule) with each action's `shortcut` as the keyboard twin
  (`aria-keyshortcuts` + a shared hidden description). Selection and
  navigation are pure reducers (`ogeListViewKeyDown` / `ogeListViewClick`);
  infinite scroll asks at most once per item count.
- **A data view's shape follows from selection**: none gives a `list` of
  `listitem`s whose templates may hold controls; selectable gives a listbox
  with one roving tab stop, reading-order arrows (mirrored in RTL), Up/Down by
  the column count measured from the rendered row
  (`ogeDataViewMeasureColumns`, 1 when unmeasured) and PageUp/PageDown turning
  the page. Columns are a container query on the view's own inline size
  (`--oge-data-view-min-item-width` through auto-fill), never the window. The
  view draws its own pager from behavior's pagination decisions — layout must
  not depend on navigation — as a `role="group"`, not a `<nav>`, so several
  views on a page do not collide as landmarks; apps wanting the full bar bind
  `oge-pagination` to `[(pageIndex)]` with `showPager=false`.
  `remoteOperations` turns the view into a pure renderer driven by
  `optionsChanged`.
- **A tile layout is a labelled `role="list"` of `role="group"` tiles** with
  one roving tab stop (the kanban precedent; no APG dashboard pattern exists);
  content inside a tile keeps its own Tab order and the tile's keys act only
  while the tile itself is focused. The model is display order plus spans on a
  dense-flow CSS grid; the serializable state
  (`{ version: 1, tiles: [{ key, order, colSpan, rowSpan }] }`) wins over item
  defaults and every import goes through `sanitizeOgeTileLayoutState`.
  Ctrl+←/→ move, Ctrl+↑/↓ move a row, Ctrl+Shift+arrows resize (horizontal
  keys mirror in RTL), announced through the shared announcer; the pointer
  drop runs the same commit. The grid never reflows mid-drag (the drop index
  comes from tile rects measured at drag start); the corner resize handle is
  pointer-only and `aria-hidden` because its twin lives on the tile.
- **React demos load their component's stylesheet, not the family sheet.**
  With these components the compiled React layout sheet reached ~99 kB —
  past the 96 kB `anyComponentStyle` error budget every demo that inlined it
  would have hit. The package's own `styles.scss` still `@use`s every
  partial (consumers import the compiled `styles.css` once); the docs now
  inline `apps/dev-app/src/app/shared/react-layout-demo-base.scss` (the
  partials up to W8a) where the full sheet used to go, and the W8d demos
  point `styleUrl` at the one Angular SCSS file they render
  (`packages/layout/<entry>/src/<entry>.scss`,
  `packages/overlay/src/lib/action-sheet/action-sheet.scss`). A new layout
  component's React demos follow the W8d shape.

## Component completeness standard

Every component (new and existing) ships with a **complete, reference-parity-checked
API surface**: properties, imperative methods (`focus()`, `reset()`,
`open()/close()/toggle()` where applicable), and a full event set — rich
payloads (`previousValue`, originating `event`, `item`/`index`) following the
house naming (no `on` prefix; never an output named after a native DOM event —
they double-fire; native `keydown`/`paste` etc. are reachable via host
bubbling and documented instead). jQuery-era lifecycle events
(`onInitialized`/`onOptionChanged`/`onContentReady`) are intentionally not
replicated — Angular lifecycle, `effect()` and signals cover them. Each
component page in the dev-app is expected to grow a full API
reference section (Properties / Methods / Events / Types).
The API reference is published as a `components/<area>/api` page per area:
a hand-compiled `<area>-api-data.ts` (entries mirror the source TSDoc — update
it whenever the public API changes) rendered by the shared `ApiReference`
component (`apps/dev-app/src/app/shared/api-reference.ts`); parity mapping
decisions live in ROADMAP.md's "API parity" section.

**The parity sweep is proactive, not on request.** Before a component is called
done: fetch the live docs of every reference library (DevExtreme, Kendo,
PrimeNG, Material/CDK — and the relevant WAI-ARIA APG pattern, which is the
backbone when one exists), map **every** member, and close the gaps in the same
change. A ROADMAP row may end as `Skipped` only with a written rationale;
`partial` rows are unfinished work, not a resting state — either complete the
feature or demote it to `Skipped` with the reason. Where a reference lacks the
component entirely, write the absence down (the dxCardView rule). Missing
capabilities the references never had but the pattern calls for (e.g. a
menubar's `shortcut` + `aria-keyshortcuts`) are fair game — bold them as
**OGE extra** rows.

**Visual bar: a current-generation design system, not a wireframe.** Every
component's SCSS is expected to look contemporary out of the box — token-driven
(never raw values): consistent radii (`--oge-radius`/`-lg`), soft state layers
(`--oge-row-hover-bg`, `--oge-accent-soft`) instead of hard color swaps, the
house focus ring (`@include tokens.focus-ring` on `:focus-visible` — it survives forced colors),
an `@include tokens.forced-colors` block for every state, 120ms ease micro-transitions suppressed under
`prefers-reduced-motion`, logical properties for RTL, and open/selected states
that read at a glance (accent tint + indicator, not just a border). "Works but
looks like a prototype" does not pass review.

## Security rules (untrusted data)

Every component renders data the host did not write, so these are invariants,
not guidelines. `SECURITY.md` is the consumer-facing statement of the same
rules — change both together.

- **Row/item data never becomes markup, and no component uses a trusted-HTML
  API.** Bind text, not HTML. Search highlighting goes through
  `buildSearchHighlightSegments` (`@oge-ui/core`), which returns matched and
  unmatched _runs_; each layer emits real text nodes and `<mark>` elements.
  There is no `bypassSecurityTrustHtml` or `dangerouslySetInnerHTML` left in
  any package, and a new one does not land: "escaped by construction" is a
  correct argument but not a sufficient one, because consumers who ban those
  APIs by lint rule lose the whole component either way — return data the
  template can render instead.
- **Data-driven `href`/`src` goes through `sanitizeUrl` /
  `sanitizeResourceUrl` (`@oge-ui/behavior`) in the React layer.** Angular
  gets this free from `DomSanitizer`; React does not, so `href={item.url}`
  written plain is an XSS sink in one layer and not the other. Treat it as
  part of parity: a React component with a `url`-shaped prop is not done
  until the sanitizer is on it. `sanitizeUrl` is a scheme **allowlist**
  (relative, `http(s)`, `mailto`, `tel`, `ftp`, `sms`; `allowedSchemes`
  extends it, never to a script scheme) — do not add a denylist check beside it.
- **Exports are neutralized, not just quoted.** Anything writing CSV or TSV
  goes through `escapeCsvCell` / `buildCsv`, which apply `guardCsvFormula` —
  RFC 4180 quoting alone still lets Excel evaluate `=cmd|…!A1`. The guard
  reads the first non-whitespace character (ASCII and full-width leads); an
  exporter that decorates a value (the tree list's indentation) guards the
  value _before_ decorating it.
- **Persisted / imported state is untrusted input.** Every `applyState()` and
  `stateKey` restore goes through the `sanitize*StateSnapshot` validators
  (`@oge-ui/core`): unknown keys dropped, prototype keys rejected at any depth,
  types checked, never a throw. A new persistable snapshot ships with its
  validator and a fuzz spec.
- **Trusted Types: one named policy per engine, created lazily.** The only
  sink is `DOMParser.parseFromString` in `@oge-ui/bpmn-engine`, behind the
  `oge-ui#bpmn` policy (`trusted-types.ts`). A new sink reuses a documented
  policy or adds one to `SECURITY.md` → "Trusted Types" in the same change.
- **No raw control characters in source.** Write `\0`, `\u0000`, `\x1f` as
  escapes; a literal NUL makes grep treat the file as binary and hides it from
  every search. `node tools/docs-tools/check-control-chars.mjs` (run by
  `docs-tools:lint`) fails on any byte below 0x20 other than tab, LF and CR.
- **No `eval`, `new Function`, `document.write` or string-built DOM,** in
  library code or in the docs app. It also keeps `script-src 'self'` viable
  for consumers, which is a documented promise.
- **Client-side validation is UX.** Upload extension/size rules, form
  validators and grid edit rules exist for feedback; nothing in the suite
  claims to be a server-side control, and the docs must not imply it.
- **`npm audit` is a build gate** (`audit` job → `tools/audit-check.mjs`, moderate and above). The
  only exception is an advisory with **no patched release yet**: it goes into `audit-allowlist.json`
  with the reason it cannot reach consumers and an `expires` date a few weeks out, after which the gate
  fails again and someone re-checks upstream (an entry that no longer matches is flagged for
  deletion). Everything else is fixed, never listed. The fix is an upgrade; when the advisory sits in a
  dependency a tool **pins exactly** (nx pins `axios`/`smol-toml`, verdaccio
  pins `js-yaml`), it is a targeted `overrides` entry in the root
  `package.json`, scoped by major (`"brace-expansion@^5": "^5.0.12"`) so other
  majors in the tree keep their own line. After changing either, regenerate the
  lockfile from a clean directory (`npm install --package-lock-only` beside a
  copy of `package.json`) — an in-place `npm install` keeps stale nested
  entries and `npm ci` then fails on CI. Consumer-facing peers (Angular,
  React, jspdf/exceljs) get their **peer floor** raised as well.

## Testing

- Specs live **beside the source**; large components split into feature-named files
  (`tree-list-selection.spec.ts`, `button-hold.spec.ts`).
- Pattern: local host `@Component` + `TestBed.createComponent` + a `settle(fixture)` helper
  (`detectChanges → whenStable → detectChanges`); assert on rendered DOM by `.oge-*` class.
  `globals: true` (no vitest imports needed).
- E2e: `apps/dev-app-e2e/src/*.spec.ts` against `http://localhost:4200`; a11y via `AxeBuilder`
  (`a11y.spec.ts`), `color-contrast` rule disabled — except `high-contrast.spec.ts`, which scans the
  grid under the high-contrast theme with it on. `forced-colors.spec.ts` / `reduced-motion.spec.ts`
  use `page.emulateMedia({ forcedColors | reducedMotion })` to guard the focus ring, system-colour
  selection and zeroed transitions.
- **Visual states are guarded by computed styles, not screenshots.** `visual-states.spec.ts`
  compares the painted colours of on/off/selected/idle/disabled states (toggle controls, date box
  closed/open, buttons, tabs, open select box; light and dark) with the token each must resolve
  to, read through a probe inside the component, plus a 390px no-sideways-scroll check. Pixel
  baselines were rejected: Windows and the Linux CI runners rasterise text differently, so
  `toHaveScreenshot` would need per-platform baselines and still flake on sub-pixel text, while
  the regressions it must catch are a state losing its colour.
- **Docs chrome vs. component CSS.** The components' styles are unlayered, so they beat any
  Tailwind utility on the same element: never hide or resize an `oge-*` host with a utility
  (`max-sm:hidden` on `<oge-select-box>` did nothing and widened every page on phones) — use a
  wrapper or a rule in `apps/dev-app/src/styles.css`. Tailwind v4 paints a bare `border` in
  `currentColor`; `tailwind.css` restores a neutral default for the docs' own boxes.
- **Vitest workers are capped, on purpose.** Nx runs projects concurrently
  (`parallel: 3` in `nx.json`) and each vitest would otherwise size its own pool to the whole
  machine — 3 × cores threads on cores cores. That oversubscription is what used to make heavy
  jsdom specs (grid virtualization, tree-list filtering) miss the default 5 s timeout in a full
  `run-many -t test`, while the same specs passed in isolation. `nx.json` therefore passes
  `--maxWorkers=30%` to the inferred `test` target: a **percentage**, so it adapts to a 4-core CI
  runner as well as a 16-core laptop, and scoped to the Nx target, so running `vitest` directly in
  one package still uses the whole machine. If you change `parallel`, change the share to match.
- **`@oge-ui/behavior` carries its own specs.** An engine covered only through
  the Angular and React components is tested twice by accident and nowhere on
  purpose: the render specs exercise the paths their markup happens to take,
  and neither can reach an engine's edges (a superseded lazy load, a
  `pointercancel` mid-drag, a two-digit-year pivot). Every module with a
  decision in it has a `*.spec.ts` beside it, plus `src/index.spec.ts` guarding
  the barrel — that barrel _is_ the React layer's whole import surface, so an
  export that quietly disappears breaks a render layer without failing one
  family spec. Machines taking an `OgeReactivityAdapter` are tested against a
  plain-closure adapter (no memoization), which is what proves the machine does
  not depend on either framework's caching.
- **Pointer drags in jsdom.** jsdom has no `PointerEvent` constructor, no `elementFromPoint` and
  drops `touch-action` from `CSSStyleDeclaration`. Specs dispatch a `MouseEvent` named
  `pointerdown`/`pointermove`/`pointerup` with `pointerId` / `pointerType` added through
  `Object.defineProperty`, and dispatch each move **on the element it is over** —
  `ogeElementAtPoint` falls back to the move's target, which then stands in for the hit-test.
  `touch-action` is asserted against a source with a plain `style` object (behavior spec) and in
  e2e (`toHaveCSS`). A drop swallows the browser's follow-up `click` until the next task, so a spec
  that clicks right after a drop awaits `setTimeout(0)` first. E2e drives the mouse with
  `page.mouse` and touch with dispatched `pointerType: 'touch'` sequences (plus a CDP
  `Input.dispatchTouchEvent` run on the board) — `pointer-drag.spec.ts`.
- Overlay-flavored specs must stub `requestAnimationFrame` **asynchronously**
  (`setTimeout(cb, 0)`) — a synchronous stub re-enters Angular's render scheduler mid-tick and
  produces bogus NG0100 errors (see `select-box.spec.ts`).

## Dev-app registration (per new component)

1. Page under `apps/dev-app/src/app/pages/<area>/<page>.ts` — standalone, `app-` selector, OnPush,
   inline template using `DocHeader` + `DemoCard`.
2. Code samples in a sibling **`<page>-snippets.ts`** data module (never inline in the page) —
   see **Docs snippets must compile** below.
3. Lazy route in `apps/dev-app/src/app/app.routes.ts` (`components/<name>/…`, `title: 'OGE — …'`).
4. Nav entry in `allSections` in `apps/dev-app/src/app/app.ts` — icon must exist in the `IconName` union
   in `apps/dev-app/src/app/shared/icon.ts`. A new **family** gets its own section with
   `group: COMPONENTS_GROUP`; sections in that group render alphabetically.
5. Three places a new family must also appear, or it is invisible to visitors:
   the `/components` gallery (`pages/components/components.ts` — `FamilyKey`, a `@case` preview and a
   `families` entry; also add the family to `components-index.spec.ts`'s `FAMILIES` list, and **never
   mention another family's name in a gallery description** — the e2e locates cards by case-insensitive
   `hasText` substring, so a description containing "overlay" hijacks the Overlay card's locator), the
   landing page index (`pages/home/home.ts` — `tiles`, kept at three columns so
   the page does not grow), and the landing page's npm band (`packages`).
6. API members in the family's `*-api-data.ts`, rendered from its `api.ts` page — this is what
   `llms.txt` reads, so an undocumented member is invisible to every coding assistant.
7. `npx nx run docs-tools:llms`, and commit the regenerated artifacts.
8. Optional Playwright smoke/a11y spec in `apps/dev-app-e2e/src/`.

**A component is not done until its AI-facing docs ship with it.** Three gates enforce that:

| Gate                    | Fails when                                                          |
| ----------------------- | ------------------------------------------------------------------- |
| `docs-tools:typecheck`  | a page declares a code sample inline, or a snippet does not compile |
| `docs-tools:llms`       | a demo folder is claimed by no package's `pageDirs`                 |
| `docs-tools:llms-check` | the committed `llms.txt` / `sitemap.xml` differ from the generator  |

`docs-tools:llms` additionally _warns_ about exported symbols with no API-reference row. That list is
the backlog of members an assistant currently has to guess at — keep it shrinking.

### `demo-card` descriptions are double-decoded

`<app-demo-card description="…">` reaches the DOM through `[innerHTML]`, and a
static Angular attribute is entity-decoded **before** that. A single `&lt;` is
therefore decoded to a real `<`, and the sanitizer then eats the element name it
forms — `&lt;oge-form&gt;` renders as an empty `<code>` box. Escape angle
brackets **twice** in a `description`: `&amp;lt;oge-form&amp;gt;`. Prose inside a
component template (a `<p>` in the doc header) is parsed once and needs the
single escape, as usual.

### Docs snippets must compile

Docs snippets are the code developers _and_ coding assistants copy out of ogeui.com, so a snippet
that does not compile is worse than no snippet. Two rules make that enforceable:

- **Snippets live in `<page>-snippets.ts` pure data modules**, beside the page — the same split as
  `*-api-data.ts`. Those modules import only `shared/demo-source.ts` (Angular-free), which is what
  lets Node read them for the generator and the compile gate.
- **Each demo is one complete standalone component**, built with `demoSource({ use, helpers, types,
before, body, template, after, dataset })`: `use` lands in the import statement _and_
  `@Component.imports`, `helpers` are imported but not declarable (`form()`, `Validators`), `types`
  are `import type`. `@angular/core` imports are derived from a closed symbol list scanned over the
  TypeScript parts only. `dataset: 'employees' | 'org'` inlines a small row array so `[data]`
  bindings resolve. Demo cards render them with `language="ts"`.

`npx nx run docs-tools:typecheck` writes every snippet into a scratch program and compiles it with
`ngc` under `strictTemplates` — unknown elements, wrong string-union values, missing members and bad
bindings all fail the build. Genuine fragments (shell commands, CSS token blocks, provider excerpts)
stay plain strings and are skipped, but the checker **lists every exemption** so none is silent.

The landing page (`pages/home/home.ts`, route `''`) is the one full-bleed page: `App.isHome`
hides the sidebar shell and the `doc-shell` wrapper for it. Its canvas wave / pointer-parallax
effects run on native listeners + rAF outside change detection and must stay dependency-free
(no 3D/animation libraries) and disabled under `prefers-reduced-motion`.

### AI-facing docs are per-framework

A package's `llms.txt` must carry the rules of **its own** framework. Handing the
Angular conventions to a `@oge-ui/react-*` reader is not merely unhelpful — it
instructs an assistant to write `imports: [OgeButton]` into a `.tsx` file.

The docs are **one site** with a global framework switch (ADR 0002), so a React
package's docs live in the same `apps/dev-app` as everything else, under their
own page dir (`pages/react-buttons/`, listed in the manifest's `pageDirs`) with
an Angular-component API page the standard `readApiBlocks` reads. What makes the
generated file React-flavoured is the manifest's `platform: 'react'` field —
explicit rather than inferred from the name — which selects `CONVENTIONS_REACT`
/ `MISTAKES_REACT` from `lib/prose.mjs` instead of the Angular pair. Keeping the
React demos in their own page dir is also what keeps the Angular `pages/buttons/`
demos from leaking into the React package's `llms.txt` — teaching the exact
syntax the React rules just forbade.

React demo snippets export `{ title, description, source }` objects rather than
bare strings; the collector unwraps both. `docs-tools:typecheck` compiles the
React snippets with `tsc` under `jsx: react-jsx` in a second scratch program —
the same gate, the tool that fits. The classifier counts any
`'use client'` + `export function` module as checkable, props or not, so a
React demo cannot silently exit the gate.

## Machine-readable docs (`tools/docs-tools`)

Coding assistants are a first-class docs audience: they read the repo, `node_modules`, and whatever
the site serves. Three artifacts serve them, all **generated and committed**:

| Artifact                             | Purpose                                                      |
| ------------------------------------ | ------------------------------------------------------------ |
| `apps/dev-app/public/llms.txt`       | [llmstxt.org](https://llmstxt.org) index of packages + pages |
| `apps/dev-app/public/llms-full.txt`  | conventions, every API member, every demo — one file         |
| `apps/dev-app/public/llms/<pkg>.txt` | one self-contained reference per package                     |
| `packages/<pkg>/llms.txt`            | same file, shipped in the tarball via `assets`               |
| `apps/dev-app/public/sitemap.xml`    | generated from `app.routes.ts` (no longer hand-maintained)   |

Everything is **derived from the workspace**, never hand-written twice: routes from `app.routes.ts`,
link notes from `SeoService.DESCRIPTIONS`, member tables from each API page's
`<app-api-reference>` bindings back through `*-api-data.ts`, symbol inventories from the entry-point
barrels, demos from `*-snippets.ts`. The only hand-maintained input is
`tools/docs-tools/lib/manifest.mjs` (per-package npm name, docs root, pitch) and the LLM-facing prose
in `lib/prose.mjs` (**Writing OGE code** rules + a **Common mistakes** table of wrong guesses).

```sh
npx nx run docs-tools:llms         # regenerate (commit the result)
npx nx run docs-tools:llms-check   # CI gate: committed artifacts match the generator
npx nx run docs-tools:typecheck    # CI gate: every docs snippet compiles (see Testing)
```

`llms` also prints two "no silent gaps" reports: package folders missing from the manifest, and
exported symbols with no API-reference row. `*-api-data.ts` is hand-compiled from source TSDoc, so
that second report is the only signal that a table has fallen behind its component.

## Prerendered docs site (SEO + AI crawlers)

`dev-app` builds with `outputMode: "static"` (`project.json`) and `main.server.ts`: **every route is
prerendered at build time** to `dist/apps/dev-app/browser/<path>/index.html`, so Google and AI
crawlers get each page's real `<title>`, meta description, canonical URL and content without running
JavaScript. Before this, every URL served the same `index.html` with a canonical pointing at `/`,
and Search Console reported the whole site as "redirected / discovered – not indexed".

- Routes are discovered from `app.routes.ts` (`app.config.server.ts` maps `**` to
  `RenderMode.Prerender`); a new page needs no registration. `vercel.json` rewrites unknown URLs to
  `index.csr.html` (the client-only shell).
- Per-page head tags: route `title` stays short (`OGE — Button Group`) because it also labels the
  sidebar and `llms.txt`; `shared/title.strategy.ts` turns it into the document title
  (`Angular Button Group | OGE UI`). `shared/seo.service.ts` writes canonical, description and
  og/twitter tags on every `NavigationEnd` — on the server too, so they land in the static HTML.
  **Every indexable route has its own 140–160-character description** in `DESCRIPTIONS`
  (exact path first, then the longest whole-segment prefix, home text as the fallback);
  `seo.service.spec.ts` fails on a duplicate or an out-of-range length — a family-level fallback
  once gave 92 of 112 pages the same description. Each page also emits a `BreadcrumbList` JSON-LD
  (Home → Components/Getting Started → Family → Page); routed demo children canonicalise to the
  page they land on.
- The sitemap's `<lastmod>` is the last commit touching the page file, its snippets and (API
  pages) the api-data beside it; `llms-check` ignores `<lastmod>` so dates never fail CI.
- Redirects the static host must answer itself (legacy grid paths: 301; routed demo parents:
  307, which keeps `?framework=react`) live in `vercel.json` `redirects` — a prerendered Angular
  redirect stub would drop the query string.
- **Browser globals must be guarded** in code that runs during construction or destroy:
  `localStorage`, `document`, `window`, `ResizeObserver` are absent in the prerender worker
  (Angular's server DOM also lacks `dataset`; use `setAttribute`). Prefer `afterNextRender` /
  `DOCUMENT` injection; otherwise `typeof document !== 'undefined'`. One unguarded access fails the
  whole `dev-app:build`, and the first error kills the worker so later routes report
  "Terminating worker thread" — read the _first_ `ERROR` line.
- Canonical host is **`https://www.ogeui.com`** everywhere (`SITE_ORIGIN`, `SeoService.ORIGIN`,
  `robots.txt`, sitemap, `llms.txt` links, package `homepage`). Vercel serves `www.` as the primary
  domain and 308-redirects the apex to it, so the canonical must name `www.` — a canonical that
  points at a redirecting URL sends Google conflicting signals (2026-10-04: switched from apex).
- `robots.txt` explicitly allows the AI crawlers (GPTBot, ClaudeBot, PerplexityBot, …) — the
  `llms.txt` pipeline exists for them.
- **Security headers live in `vercel.json`** — CSP, HSTS, `frame-ancestors`, Permissions-Policy,
  COOP/CORP — and `/.well-known/security.txt` (RFC 9116) points at `SECURITY.md`. A static host
  cannot mint a per-request nonce, so the CSP admits the one inline snippet the build emits
  (Angular's deferred-stylesheet loader — an inline `<script>` swapping `data-beasties-media` into
  `media` since Angular 22.2) **by hash**, rather than opening `script-src` with `'unsafe-inline'`.
  (`'unsafe-hashes'` is only needed if the build goes back to an `onload=` handler attribute.) That hash is tied to a string Angular
  generates, so `docs-tools:csp-check` (CI, after `dev-app:build`) re-derives it from the built HTML
  and fails when the policy stops covering it — otherwise an Angular upgrade would silently ship an
  unstyled site. New inline script? Hash it and add it there, or move it into a bundled file.

### Versioned docs

The site on `main` is always the **latest** release (`SITE_VERSION`). An older line stays readable
as a **frozen deployment**: a `docs/v<major>.<minor>` branch cut from that line's last release tag
and served by Vercel on its own subdomain (`v0-13.ogeui.com` ← `docs/v0.13`). It is the site exactly
as it shipped — never a re-render of today's code with old API data.

Archiving a version, once per line:

1. `git worktree add ../oge-docs-vX.Y -b docs/vX.Y <last tag of that line>`; on the branch only:
   `noindex` (`<meta name="robots">` in `index.html` **and** an `X-Robots-Tag` header in
   `vercel.json`, so the archive never competes with latest in search), a sticky banner in
   `app.html` linking to the latest site, and whatever deploy fixes the old tree needs to build
   (lockfile, `vercel.json` route syntax). Commit, push the branch.
2. Vercel → Project → Domains: add `vX-Y.ogeui.com` and assign it to the `docs/vX.Y` branch.
3. On `main`, add `{ label: 'X.Y', origin: 'https://vX-Y.ogeui.com' }` to `ARCHIVED_DOCS`
   (`shared/docs-versions.ts`, newest first). The header's `app-version-menu` lists it and opens
   the same path on that origin.

Archive branches take no feature work; only a fix that keeps the old site building is allowed.

## `ng add` (`tools/oge-schematics`)

Every publishable package ships an `ng add` schematic. One implementation lives in
`tools/oge-schematics/src/` and `build.mjs` bundles it once per package with esbuild, substituting
the package name through `define`. Packages therefore carry **no schematic source** — only
`"schematics": "./schematics/collection.json"` in `package.json`; `collection.json`, `schema.json`
and the CJS bundle are written straight into `dist/packages/<pkg>/schematics/`.

What it does: registers an optional theme stylesheet (`--theme=dark|high-contrast|tailwind|bootstrap`, inserted
**first** in `styles` so the app's own stylesheet still wins), and writes an OGE usage block into the
consumer's `AGENTS.md` between `<!-- oge-ui:start -->` markers — regenerated from the OGE packages in
their `package.json`, opt out with `--skip-agents-file`. Nothing throws: a workspace it cannot read
(Nx repo, bare library, no `build` target) gets a warning and the manual one-liner.

Two constraints that are easy to break:

- The bundle must be **`index.cjs`**, not `index.js` — ng-packagr stamps `"type": "module"` on the
  dist `package.json`, and the schematics engine loads factories with `require`.
- `schematics` must run **after** the package builds (ng-packagr wipes `dist/packages/<pkg>` first),
  which is why the target `dependsOn` every package `build` and declares
  `dist/packages/*/schematics` as its outputs so a cache hit restores them.

```sh
npx nx run oge-schematics:typecheck   # tsc over the schematic sources
npx nx run oge-schematics:test        # SchematicTestRunner specs (vitest, node env)
npx nx run oge-schematics:schematics  # build the bundles into dist
```

## Release

`nx release` versioning via git tags (`release.version.currentVersionResolver: "git-tag"`), publishing from
`dist/{projectRoot}`. Keep workspace-internal deps pinned exactly to the current release
(`"@oge-ui/core": "0.6.0"` at the time of writing). `nx release` also generates the root
`CHANGELOG.md` and a GitHub Release per version.
