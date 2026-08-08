# Changelog

Notable changes to the OGE UI packages. Versions are tagged per package
(`grid@0.7.0`, `core@0.7.0`, …); entries below group them by release wave.
Maintained by hand: `nx release` disables its workspace changelog when projects
are versioned independently, which is the case here.

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
