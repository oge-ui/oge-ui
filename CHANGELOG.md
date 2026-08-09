# Changelog

Notable changes to the OGE UI packages. Versions are tagged per package
(`grid@0.8.0`, `core@0.8.0`, …); entries below group them by release wave.
Maintained by hand: `nx release` disables its workspace changelog when projects
are versioned independently, which is the case here.

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
