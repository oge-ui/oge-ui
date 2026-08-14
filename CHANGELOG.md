# Changelog

Notable changes to the OGE UI packages. Versions are tagged per package
(`grid@0.8.0`, `core@0.8.0`, …); entries below group them by release wave.
Maintained by hand: `nx release` disables its workspace changelog when projects
are versioned independently, which is the case here.

## 0.12.0 — 2026-08-14

### New render layer: React

The suite now ships a **native React layer** — real React components, not
wrappers. One framework-free engine drives both layers (ADR 0001): data
arithmetic in `@oge-ui/core`, interaction and accessibility in
`@oge-ui/behavior`, one stylesheet, one message table. Every family extracted
to the engine was rewired in Angular in the same change, with its existing
specs passing unchanged.

- **`@oge-ui/react`** — umbrella package; installs and re-exports every
  `@oge-ui/react-*` family so an app can install once and import from one path.
- **`@oge-ui/react-overlay`** — the anchored-panel substrate: viewport-aware
  positioning with flip and clamp, the single Escape stack, focus trap,
  ref-counted scroll lock.
- **`@oge-ui/react-buttons`**, **`@oge-ui/react-inputs`**,
  **`@oge-ui/react-tabs`**, **`@oge-ui/react-layout`**,
  **`@oge-ui/react-navigation`** — the five component families, API member for
  API member with their Angular counterparts. React idioms where the framework
  requires them: controlled/uncontrolled pairs (`value` + `onValueChange` /
  `defaultValue`), imperative handles through `forwardRef`, render props in
  place of `TemplateRef`, context providers in place of DI tokens. Every
  deliberate difference is recorded in `docs/REACT-PARITY.md`.

The docs are **one site, not two**: a global framework switch stamps
`<html data-framework>`, rides in the URL as `?framework=react`, and every
component page renders the chosen layer on the same route. Coverage is
page-granular, so a React reader on an Angular-only page gets a notice instead
of syntax they cannot use. A cross-framework parity gate compares the two API
tables member for member on every build.

### New package

- **`@oge-ui/upload`** — file uploader with a transport engine (chunking,
  retry, progress, abort), drag & drop from an external drop zone, per-file
  validation with the rejection reason kept on the list, and a roving-tabindex
  file list.

### `@oge-ui/behavior`

- The shared engine grew to cover the input commit/debounce pipeline, the
  select-list machine (filtering, grouping, lazy item sources), the dropdown
  virtualizer, number/date/calendar/slider math, the anchored-panel machine and
  the layout, tabs and navigation decision layers.
- **Now tested framework-free**: every module carrying a decision has a spec
  beside it (49 → 664 tests), plus a barrel guard, since that barrel is the
  React layer's entire import surface. Two defects it found: the scroll lock
  could leave its own `padding-right` behind on release, and the React tree
  view painted its first frame with no roving tab stop, which made the
  virtualized tree a scrollable region with no keyboard access (WCAG 2.1.1).

### Accessibility

- In-prose links across the docs site now carry a persistent underline
  (axe `link-in-text-block`) — colour alone was the only signal.

## 0.11.0 — 2026-08-11

### New package

- **`@oge-ui/charts`** (commercial) — data visualization on a
  **dependency-free SVG kernel** (no D3, no Chart.js, no canvas library; the
  only suite dependency is `core`). `<oge-chart>` ships sixteen cartesian
  series types — `line`, `spline`, `stepLine`, `area`, `splineArea`,
  `stepArea`, `stackedArea`, `fullStackedArea`, `bar`, `stackedBar`,
  `fullStackedBar`, `rangeBar`, `scatter`, `bubble`, `rangeArea`,
  `candlestick` — over pure engines for 1-2-5 nice-tick scales,
  calendar-true time axes, logarithmic axes, multi value axes, stacking with
  separate negative branches and strip lines. Interaction: cursor-centered
  wheel zoom, drag-select zoom and Shift-pan with Escape reset
  (`[(visualRange)]` two-way), crosshair, single/`shared` tooltips with
  templates, an interactive legend that spotlights its series on hover,
  point/series selection, plot annotations (`point` callouts and `text`
  labels with an HTML template) and per-series value labels.
  `<oge-pie-chart>` adds pie/doughnut with anti-overlap outside labels and
  small-value grouping; `<oge-polar-chart>` adds radar/polar (line/area
  loops, scatter, sector bars, `spider` grids); `<oge-range-selector>` is
  the overview strip whose `[(value)]` pairs with a chart's
  `[(visualRange)]`. **Performance:** one `<path>` per series plus automatic
  **LTTB downsampling** to ~one point per pixel for oversized series (50k+
  points fluid; hit-testing keeps the full data). **Accessibility** (no APG
  chart pattern exists): `role="img"` labels, a screen-reader data table,
  real legend buttons and keyboard point inspection with live-region
  announcements — none of the reference libraries ship the latter two.
  Image export lives in the dependency-free `@oge-ui/charts/export-image`
  entry (inline-styled SVG serialization + PNG rasterization).

### `@oge-ui/gantt`

- **v0.2 feature wave:** `workCalendar` work-time calendars (off-day
  shading; auto-scheduling rolls pushed starts onto working days and keeps
  durations in working days) with per-resource `calendar` overrides;
  multi-resource assignment (scalar or array `resourceId` stores with
  shape-preserving write-back, a tag editor in the dialog and bar labels);
  `showResourceWorkload` utilization band with overallocation marks; hover
  tooltips with `*ogeGanttTooltipTemplate`; and three lazy export entry
  points — `export-excel` (exceljs), `export-pdf` (jspdf, the chart drawn
  as vector graphics) and the dependency-free `export-image` PNG.
- **Usability wave:** built-in right-click menu (edit, new task/subtask,
  indent/outdent, delete), double-click or **draw on empty chart space** to
  create a task at that date, MS Project-style Alt+Shift+Left/Right
  reparenting, a toolbar Today button, an empty state with a create
  shortcut — plus a visual refresh (segmented toolbar pills, gradient bars
  with hover lift, glowing today line).
- **Fixes from live use:** resize handles are reachable again (bar labels
  no longer intercept the pointer), dragging the earliest/latest task no
  longer re-anchors the whole chart (the rendered range only widens), and
  tooltips/drag tips never disappear under the sticky scale header.

### `@oge-ui/scheduler`

- Built-in right-click menu: edit/delete on chips through the guarded
  pipelines (recurrence occurrence/series scope included) and a prefilled
  "new appointment" on empty cells; toolbar and chips share the new visual
  language (segmented pills, gradient chips, glowing now-line).

### i18n

- Config-level `locale` for the scheduler and the date editors
  (`OgeInputsConfig.locale` / `OgeSchedulerConfig.locale`; per-instance
  `[locale]` wins) — the same pattern the gantt and charts shipped with.

## 0.10.0 — 2026-08-10

### New components

- **`OgeMenubar`** (`@oge-ui/navigation`) — the WAI-ARIA APG menubar: roving
  tabindex, the full keyboard walk (a leaf's ArrowRight hops to the next bar
  item with its menu open, Escape unwinds one level at a time), `openMode`
  `click | hover` on the top level only, and a **container-width** hamburger
  collapse (`compactBelow`, core's pure `resolveMenubarCompact`). `url` items
  are real links, `activeKey` renders `aria-current="page"` — no router
  dependency. The docs open with the APG's own caveat that a `<nav>` of links
  usually serves site navigation better.
- **`OgeBreadcrumb`** (`@oge-ui/navigation`) — the APG breadcrumb verbatim:
  a `<nav>` landmark, an ordered list of real links, `aria-current="page"` on
  the non-interactive last crumb, and **no invented keyboard behavior**.
  `collapseMode: 'auto'` folds the oldest middle crumbs against the
  container width (core's `fitToolbarItems` reused, no second kernel) — and
  unlike the references the collapsed crumbs stay reachable as links in the
  ellipsis menu.
- **`OgeSlider` + `OgeRangeSlider`** (`@oge-ui/inputs`) — the APG slider and
  multi-thumb patterns as bare editors on `OgeControlBase` (Signal Forms,
  reactive and `[(value)]` with zero new bridge code): live drag commits
  throttled by `[debounce]`, `slideEnded` at release, **Escape cancels the
  gesture** (no reference slider offers it), dynamic aria constraints between
  range thumbs (`minRange`), `formatValue` feeding the bubble, the end labels
  and `aria-valuetext` alike, ticks with labels, Kendo-style `showButtons`,
  and `editorType: 'slider'` inside `<oge-form>`.
- **`OgeProgressBar` + `OgeLoadIndicator` + `OgeSkeleton`**
  (`@oge-ui/layout`) — the loading trio canonicalizing the hand-drawn
  spinners and shimmers across the suite. `role="progressbar"` with the ARIA
  rule most libraries miss: **indeterminate omits `aria-valuenow`** entirely
  (`value: null`); `bufferValue` and `chunkCount` variants, `severity`
  colors, a one-shot `completed`; the ring slows rather than freezes under
  `prefers-reduced-motion`; the skeleton is always `aria-hidden` decoration
  with a `lines` input rendering the tapered multi-line placeholder stack.

### Changed

- The canonical `OgeMenuItem` (`@oge-ui/overlay`) grew **nested submenus**
  (`items` on any item — one anchored panel per level on the shared Escape
  stack; `'escape'`/`'back'` absorbed per level, `'select'`/`'tab'` chained
  to the root owner), plus `url` link rows, `badge` and
  `shortcut`/`aria-keyshortcuts`. Every menu owner — grid and tree-list
  context menus, the drop-down button, the toolbar overflow — inherits all of
  it with zero consumer changes.
- The grid's filler-row class is now `.oge-grid-skeleton` (the canonical
  component owns `.oge-skeleton`), and the shared `.oge-spinner` gained its
  missing `prefers-reduced-motion` rule.
- The accordion docs page's first demo is `collapsible`, so the page's first
  touch toggles intuitively; the non-collapsible contract lives in the
  switches demo.

### Fixed

- Menubar/drop-down focus race: pending menu focus now applies after render,
  so switching bar items never lands keyboard focus on a stale item list.
- Splitter: removed a dead `?? []` that warned NG8102 on every build.

## 0.9.0 — 2026-08-09

### New components

- **`OgeCard`** (`@oge-ui/layout`) — a content surface that is **one component,
  not a sub-component army**: the sections are attribute slots
  (`[ogeCardMedia]`, `[ogeCardActions]` with `align`, `[ogeCardFooter]`,
  `[ogeCardAvatar]`, `[ogeCardHeaderActions]`, `[ogeCardSeparator]`) and
  everything else projected is the content. `stylingMode`
  `outlined | raised | filled | flat` rests on the new `--oge-shadow-card`
  token, `size` scales density, `severity` draws a status rail, `loading`
  swaps content for an `aria-busy` skeleton, and `interactive` is a
  visual-only hover/focus-within lift. **No role and no clickable input, on
  purpose** — there is no WAI-ARIA card pattern; the accessible stretched-link
  pattern is a documented demo instead of an API.

### Changed

- New design token: `--oge-shadow-card` (resting card elevation, dark theme
  override included).
- The dev-app's hand-rolled card boxes — the playground stat tiles and
  sidebar, and five scroll-log/state panels — now render `<oge-card>`.

### Fixed

- **Pivot**: the collapsed field panel now contains its toggle button and sits
  above the sticky column headers, which used to paint over it and swallow its
  clicks.
- **Stepper**: the connector rail is derived from the header padding and
  indicator size, so it runs exactly through every indicator centre in both
  orientations; completed steps tint their outgoing rail, and the active
  indicator gains a soft halo.
- **Drawer**: `overlay`/`push` panels keep their full size and only translate —
  a compositor-only animation with no mid-gesture reflow — on a decelerate
  curve, with a scoped backdrop blur.

## 0.8.0 — 2026-08-09

### New package

- **`@oge-ui/forms`** — form layout over the `inputs` editors. `OgeForm` takes
  three binding modes on one component: `[fieldTree]` (Angular Signal Forms),
  `[formGroup]` (reactive forms) and `[(formData)]` (a plain model over an
  internally owned `form()`); the mode is derived, never configured.
  Validation is Signal Forms throughout — `validationRules` compiles to a
  schema, so there is no second engine. Responsive columns are `@container`
  queries on the form's own inline size rather than window width, and
  `<oge-form-tabs>` / `<oge-form-accordion>` / `<oge-form-steps>` wrap the
  tabs, layout and navigation components instead of copying them.

### New components

- **`OgeSplitter`** (`@oge-ui/layout`) — the WAI-ARIA APG window splitter:
  focusable `role="separator"` tracks in one CSS grid, `fr`-ratio sizing with
  `'<n>px'` / `'<n>%'` escape hatches, collapse-to-`inert`, pointer capture and
  self-recursive nesting.
- **`OgeToolbar`** (`@oge-ui/layout`) — the APG toolbar: `role="toolbar"`, a
  roving tabindex over its own buttons _and_ the controls you project,
  before/center/after groups, and an overflow menu for the commands that stop
  fitting. Per-item `overflowPriority` decides which yield first, independently
  of their position — the reference toolbars drop strictly from the end.
- **`OgeDrawer`** (`@oge-ui/navigation`) — `overlay`, `push` or `side`, on four
  logical edges. **Modality is derived from the mode**, not configured
  separately: `overlay`/`push` cover or displace the content and are dialogs
  (`role="dialog"`, `aria-modal`, focus trap, Escape, `inert`); `side` shares
  the row and is a landmark. `compactBelow` measures the drawer's own container
  rather than the window.
- **`OgeStepper`** (`@oge-ui/navigation`) — a linear or free wizard. There is no
  APG stepper pattern, so it is an ordered list of `<button>` headers carrying
  `aria-current="step"` with `role="group"` bodies — **one semantic in both
  orientations**, where Angular Material swaps `tablist` for `aria-current`
  with the layout. `linear`, `editable` and an async `stepGuard` gate the flow,
  and every refusal reports why through `stepBlocked`.

### Changed

- The `.oge-toolbar` markup was duplicated in the grid (14 uses), the tree list
  (12) and the pivot grid (5). All three now render `<oge-toolbar>`, so they
  gained the overflow menu and the APG keyboard model; the CSS namespace moved
  to `@oge-ui/layout` and the grid's own toolbar buttons became `.oge-tool-*`.
- The grid and the tree list render `<oge-form>` for their `form` and `popup`
  edit surfaces, retiring that duplication too.
- `@oge-ui/overlay` now exports the focus trap, the ref-counted scroll lock and
  the shared Escape stack, so a modal surface in another package joins _that_
  ordering rather than growing a second one — a popup opened inside a drawer
  closes before the drawer does.
- `OgeMenuItem` gained optional `icon` / `iconClass`, so a command keeps its
  icon when it collapses into an overflow or context menu.
- `@oge-ui/grid`'s `OgeToolbarItem` template directive is now
  **`OgeGridToolbarItem`** (the selector `[ogeToolbar]` is unchanged), freeing
  the name for the layout toolbar's declarative child.
- The button `autoRepeat` docs call their use case "spinner/counter buttons"
  rather than "stepper", now that a stepper component exists.

### Fixed

- The toolbar re-read `getComputedStyle` and every item's size on every resize
  frame; style and per-item layout reads now stay off the resize path.
- `overflowChanged` stopped firing when only the container width changed.
- `hideItem()` / `enableItem()` silently did nothing for declarative
  `<oge-toolbar-item>` children.

## 0.7.0 — 2026-08-08

### Breaking changes

- Public types without the `Oge` prefix were renamed: `EditingSlice` →
  `OgeEditingSlice`, `BuilderGroup` → `OgeBuilderGroup`, `BuilderCondition` →
  `OgeBuilderCondition`, `FilterBuilderField` → `OgeFilterBuilderField`,
  `SelectionMode` → `OgeSelectionMode`, `PivotStateStore` →
  `OgePivotStateStore`, `PivotAxisLine` → `OgePivotAxisLine`,
  `PivotHeaderCell` → `OgePivotHeaderCell`, `PIVOT_FIELD_DRAG_TYPE` →
  `OGE_PIVOT_FIELD_DRAG_TYPE`.
- `OgeFilterBuilderGroup` outputs renamed to match the house event naming:
  `changed` → `treeChanged`, `remove` → `removeRequest`.

### New packages

- **@oge-ui/tabs** — tab strip and tab panel: declarative or data-driven tabs,
  deferred rendering with keep-alive, closable tabs with async guards, overflow
  navigation, drag reorder and router integration.
- **@oge-ui/layout** — accordion following the WAI-ARIA pattern: single or
  multiple expansion, lazy content, async expand guards, header actions and
  invalid-section jumping.
- **@oge-ui/navigation** — tree view over flat or nested data: tri-state
  checkboxes, ancestor-preserving search, load-on-demand children, virtual
  scrolling and drag & drop reparenting.

### Documentation for AI coding assistants

- Every package now publishes a machine-readable API reference. `llms.txt`
  (an [llmstxt.org](https://llmstxt.org) index), `llms-full.txt` (conventions,
  every documented member and every demo) and one file per package are served
  from the site **and shipped in each tarball** at
  `node_modules/<package>/llms.txt`.
- `ng add @oge-ui/<package>` works for every publishable package: it registers
  an optional theme stylesheet and writes an OGE usage block into the project's
  `AGENTS.md` (opt out with `--skip-agents-file`).
- Docs snippets are now complete standalone components, compiled in CI under
  `strictTemplates` — what you copy from the site builds.
- Every exported symbol has an API-reference entry; internals that are exported
  for the suite's own packages are labelled as such.

### Overlay

- **overlay:** `OgeModal` dialog primitive — focus trap, ref-counted scroll
  lock, async `closeGuard`, typed `close(result)`, opt-in drag/resize/
  fullscreen and `inertBackground`; `OgeModalService.open()` for imperative
  use. All open surfaces now share one Escape stack.
- **overlay:** `OgeToastService` notifications — severity sugar, stacking per
  position, pause on hover/focus/tab-hidden, duplicate coalescing with a live
  counter, `promise()` with in-place morph, live-region announcers.
- **grid, tree-list:** edit-popup and filter-builder dialogs migrated onto
  `oge-modal`.

### Other

- **inputs:** `OgeTreeSelect` editor.
- **core:** shared `async-guard`, `nav-index` and `type-ahead` utilities behind
  the new families.
- **dev-app:** AI section with its own sidebar heading, component families
  grouped and sorted in the sidebar, three new gallery cards.
- **repo:** CI no longer depends on Nx Cloud; workspace-wide prettier pass;
  npm metadata (descriptions, keywords) for every package.

## 0.6.0 — 2026-08-07

- **inputs:** date editors (`OgeCalendar`, `OgeDateBox`, `OgeDateRangeBox`)
  built on native `Date` + `Intl` — no date library.
- **inputs:** bare toggle controls (`OgeCheckBox`, `OgeSwitch`,
  `OgeRadioGroup`) and `OgeAutocomplete`.
- **grid:** cell editors unified onto the `oge-*-box` inputs; popup editing
  polish.
- **dev-app:** site version badges driven from a single constant.

## 0.5.0 — 2026-08-06

- First release of `@oge-ui/buttons`, `@oge-ui/overlay`, `@oge-ui/inputs`,
  `@oge-ui/tree-list`, `@oge-ui/pivot` and the `oge-ui` umbrella.
- **licensing:** open-core split — `@oge-ui/pivot` becomes source-available
  commercial; every other package is MIT with a public MIT-forever pledge.
- **inputs:** `OgeSelectBox` and `OgeTagBox` dropdown editors.
- **pivot:** field management, analytics UX, virtualization, remote data,
  state persistence and CSV/Excel export.
- **tree-list:** grid-parity feature waves — editing modes, header filters,
  drag & drop, lazy loading.
- Community health files (contributing guide, security policy, templates).

## 0.3.0 — 2026-08-05

- **core, grid:** sort-key precomputation and cached date formatting;
  grouping, summaries, state persistence, CSV/Excel/PDF export hooks.

## 0.2.0 — 2026-08-05

- Initial public versions of `@oge-ui/core` (data engine) and
  `@oge-ui/grid` (virtualized data grid).
