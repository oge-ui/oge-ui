# oge Data Grid — Feature Parity Roadmap

Comparison of `@oge-ui/grid` against the feature set of leading commercial data grids.
Legend: ✅ implemented · 🟡 partial · ❌ missing.

Last updated: 2026-08-06 (after Phase 16 / pivot grid).

## 1. Data binding & data operations

| Feature                                 | Reference | oge | Notes                                                                                       |
| --------------------------------------- | --------- | --- | ------------------------------------------------------------------------------------------- |
| Local array binding                     | ✔         | ✅  | `T[]`, `ArrayDataSource`                                                                    |
| Custom remote store                     | ✔         | ✅  | `CustomDataSource` + serializable `LoadOptions`                                             |
| OData store                             | ✔         | ✅  | `ODataDataSource` + `buildODataQuery` (v4: `$skip`/`$top`/`$orderby`/`$filter`/`$count`)    |
| CRUD write-back                         | ✔         | ✅  | `insert/update/remove`, in-place array CRUD                                                 |
| Push / live updates (`reshapeOnPush`)   | ✔         | ✅  | `ArrayDataSource.push()` + `changes` stream; updates patch in place, insert/remove reload   |
| `highlightChanges` (flash pushed cells) | ✔         | ✅  | exact patched cells flash, re-triggers on repeat updates (Phase 14)                         |
| Server-side sort/filter/page/group      | ✔         | ✅  | verified with request-log e2e                                                               |
| Server-side summaries                   | ✔         | ✅  | positional `summary` payload                                                                |
| Deferred group loading (`items: null`)  | ✔         | ✅  | `grouping.autoExpandAll: false`; children fetched on expand, cached, skeleton while loading |

## 2. Paging & scrolling

| Feature                                   | Reference | oge | Notes                                                                   |
| ----------------------------------------- | --------- | --- | ----------------------------------------------------------------------- |
| Paging + page-size selector + info        | ✔         | ✅  | `pageSizes`, `showInfo`                                                 |
| "All" page size option                    | ✔         | ✅  | `pageSizes: [10, 'all']` (Phase 13)                                     |
| Pager display modes (compact/adaptive)    | ✔         | ✅  | `displayMode: full/compact/adaptive` + width-driven adaptive (Phase 13) |
| Row virtual scrolling                     | ✔         | ✅  | Fenwick-tree windowing, 100k e2e                                        |
| **Column virtualization**                 | ✔         | ✅  | `columnRenderingMode: 'virtual'`; plain columns only (no pins/bands)    |
| **Infinite scrolling**                    | ✔         | ✅  | `scrolling.mode: 'infinite'`, skeleton fillers, growing scroll space    |
| Remote virtual scrolling (windowed fetch) | ✔         | ✅  | 100-row block cache, de-dupe, sort/filter invalidation; 1M-row demo     |
| Variable row heights (measured)           | ✔         | ✅  | `autoRowHeight`: measured after render, scroll-anchored corrections     |
| scrollToRow public API                    | ✔         | ✅  | `scrollToRow(index                                                      | key)` (Phase 13) |

## 3. Sorting

| Feature                                           | Reference | oge | Notes                                                   |
| ------------------------------------------------- | --------- | --- | ------------------------------------------------------- |
| Single/multi/none + allowUnsorting                | ✔         | ✅  | incl. global config                                     |
| Initial sort via column (`sortIndex`/`sortOrder`) | ✔         | ✅  | + `groupIndex` (Phase 11); stateKey/user wins           |
| Custom sort (`calculateSortValue`)                | ✔         | ✅  | works client-side incl. lookup display order (Phase 13) |

## 4. Filtering & search

| Feature                                | Reference | oge | Notes                                                                     |
| -------------------------------------- | --------- | --- | ------------------------------------------------------------------------- |
| Filter row                             | ✔         | ✅  | dataType-aware editors, debounce                                          |
| Filter row **operator menu** per cell  | ✔         | ✅  | per-dataType operators + Reset (Phase 10)                                 |
| Header filter (distinct values)        | ✔         | ✅  | via `DataSource.distinct`                                                 |
| Header filter search box               | ✔         | ✅  | Phase 10; date columns group by year with tri-state checkboxes (Phase 14) |
| Search panel                           | ✔         | ✅  |                                                                           |
| Search result **highlighting**         | ✔         | ✅  | default cells, `<mark>` (Phase 10)                                        |
| **Filter Builder + filter panel**      | ✔         | ✅  | recursive and/or editor + readable panel (Phase 10)                       |
| Programmatic filter value input/output | ✔         | ✅  | `[(filterValue)]`, persisted via `stateKey` (Phase 10)                    |
| `calculateFilterExpression` per column | ✔         | ✅  | filter row + builder use the custom expression (Phase 13)                 |

## 5. Grouping & summaries

| Feature                                   | Reference | oge | Notes                                                     |
| ----------------------------------------- | --------- | --- | --------------------------------------------------------- |
| Group panel drag & drop, multi-level      | ✔         | ✅  |                                                           |
| Group summaries / total summaries         | ✔         | ✅  | sum/avg/min/max/count, localized patterns                 |
| Multiple summaries per column             | ✔         | ✅  | `[groupSummary]="['sum','avg']"` (Phase 14)               |
| Custom summary (`calculateCustomSummary`) | ✔         | ✅  | `type: 'custom'` + column reducer, client-side (Phase 14) |
| Summaries in **group footer**             | ✔         | ✅  | `groupSummaryPosition: 'footer'` per column (Phase 14)    |
| Expand/collapse **all** (API + UI)        | ✔         | ✅  | API (Phase 13) + toolbar buttons when grouped (Phase 14)  |
| `autoExpandGroup` control                 | ✔         | ✅  | `grouping.autoExpandAll` (Phase 12)                       |
| Column `groupIndex` input                 | ✔         | ✅  | Phase 11                                                  |

## 6. Columns

| Feature                                        | Reference | oge | Notes                                                                                                     |
| ---------------------------------------------- | --------- | --- | --------------------------------------------------------------------------------------------------------- |
| Resize / reorder / fixed (pin) / chooser       | ✔         | ✅  | chooser anchored to its button, drag-reorder rows, drop indicators on headers (Phase 14)                  |
| minWidth / width / visible                     | ✔         | ✅  |                                                                                                           |
| **Banded columns** (multi-row headers)         | ✔         | ✅  | `<oge-column-group>` (Phase 11)                                                                           |
| **Lookup columns** (display + dropdown editor) | ✔         | ✅  | display/filter/header-filter/editor/CSV (Phase 11); cascading via `dataSource: (row) => items` (Phase 13) |
| Calculated columns (`calculateCellValue`)      | ✔         | ✅  | display/CSV (Phase 11); sort/filter via `calculateSortValue`/`calculateFilterExpression` (Phase 13)       |
| Adaptive column hiding (`hidingPriority`)      | ✔         | ✅  | width-driven, restores automatically (Phase 11)                                                           |
| Command/buttons column customization           | ✔         | ✅  | `commandButtons` input: built-in + custom buttons, `visible(row)`, icons (Phase 13)                       |
| Header/cell/edit templates                     | ✔         | ✅  | fully typed                                                                                               |
| Word wrap / auto row height                    | ✔         | ✅  | `wordWrap` input (Phase 11; virtual mode stays fixed-height)                                              |

## 7. Selection, focus, keyboard

| Feature                               | Reference | oge | Notes                                                                        |
| ------------------------------------- | --------- | --- | ---------------------------------------------------------------------------- |
| single/multiple/checkbox + shift/ctrl | ✔         | ✅  |                                                                              |
| Select-all (filtered) + indeterminate | ✔         | ✅  |                                                                              |
| `selectAllMode: 'page'`               | ✔         | ✅  | page or all filtered pages, async fetch for remote (Phase 13)                |
| Deferred selection                    | ✔         | ✅  | `selectionDeferred` + `[(selectionFilter)]` FilterExpr (Phase 14)            |
| Focused row                           | ✔         | ✅  | `[(focusedRowKey)]`; `autoNavigateToFocusedRow` expands the path and scrolls |
| Excel-like keyboard navigation        | ✔         | ✅  | axe-verified ARIA; RTL-aware arrows                                          |
| Clipboard copy                        | ✔         | ✅  | `copyToClipboard()` + Ctrl+C, TSV of selection (Phase 13)                    |

## 8. Editing

| Feature                             | Reference | oge | Notes                                                                          |
| ----------------------------------- | --------- | --- | ------------------------------------------------------------------------------ |
| cell / row / batch / popup modes    | ✔         | ✅  |                                                                                |
| **form** mode (inline form)         | ✔         | ✅  | `editing.mode: 'form'` — labeled inline form row (Phase 13)                    |
| Validation rules                    | ✔         | ✅  | `required` + any Angular validators                                            |
| Custom editors (`editCellTemplate`) | ✔         | ✅  | `*ogeEditTemplate` with FormControl                                            |
| Lookup editors                      | ✔         | ✅  | default select editor (Phase 11); cascading via function dataSource (Phase 13) |
| Row drag & drop reordering          | ✔         | ✅  | `rowDragging` + drag handle + `rowReordered` (Phase 13)                        |
| Confirmation on delete              | ✔         | ✅  | `editing.confirmDelete` (Phase 13)                                             |

## 9. Appearance, UX, misc

| Feature                                       | Reference | oge | Notes                                                                                                                                 |
| --------------------------------------------- | --------- | --- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Theming (tokens, dark, bridges)               | ✔         | ✅  | arguably ahead (Tailwind/Bootstrap bridges)                                                                                           |
| Localization of all texts                     | ✔         | ✅  | `provideOgeGridConfig` messages                                                                                                       |
| RTL support                                   | ✔         | ✅  | `rtlEnabled` / auto-detect, logical CSS properties, mirrored chevrons & arrows (Phase 13)                                             |
| Row alternation (striping)                    | ✔         | ✅  | `rowAlternation` + `--oge-row-alt-bg` token (Phase 13)                                                                                |
| Loading indicator                             | ✔         | ✅  | `loadPanel` spinner overlay (Phase 13)                                                                                                |
| Custom no-data template                       | ✔         | ✅  | `*ogeNoDataTemplate` (Phase 13)                                                                                                       |
| Row template (full row)                       | ✔         | ✅  | `*ogeRowTemplate` with typed context (Phase 13)                                                                                       |
| Toolbar customization (custom items)          | ✔         | ✅  | `[ogeToolbar]` projected slot (Phase 13)                                                                                              |
| Context menu (rows)                           | ✔         | ✅  | event-driven items                                                                                                                    |
| Header context menu                           | ✔         | ✅  | sort/group/pin/hide, localized (Phase 9); customizable via `headerContextMenu` (Phase 15)                                             |
| **State persistence**                         | ✔         | ✅  | `stateKey` + sync/async `OGE_STATE_STORAGE`; `state()` / `applyState()` / `stateChange` (Phase 15)                                    |
| **Export CSV/Excel**                          | ✔         | ✅  | CSV in core; Excel via lazy `@oge-ui/grid/export-excel` (exceljs, typed cells); `scope: all/page/selection`                           |
| Export PDF                                    | ✔         | ✅  | lazy `@oge-ui/grid/export-pdf` (jspdf + autotable, optional peers) (Phase 14)                                                         |
| Imperative public API (refresh, expandAll, …) | ✔         | ✅  | `refresh/expandAllGroups/collapseAllGroups/clearFilters/clearSorting/scrollToRow/exportCsv/copyToClipboard/selectAllPages` (Phase 13) |
| Event surface (cellClick, rowPrepared, …)     | ✔         | ✅  | + `cellClick/rowDblClick/contentReady/rowReordered` (Phase 13)                                                                        |
| Master-detail                                 | ✔         | ✅  | typed template                                                                                                                        |
| Hierarchical data (tree grid)                 | ✔         | ✅  | separate `@oge-ui/tree-list` component (see table below)                                                                              |

## Prioritized backlog

**Phase 9: ✅ DONE** (state persistence, CSV export, header context menu, READMEs, v0.1.0 release prep; Excel export deferred to Phase 13).

**Phase 10 — Filtering parity: ✅ DONE** (filter builder + panel, operator menu, header-filter search, `[(filterValue)]`, search highlighting).

**Phase 11 — Column parity: ✅ DONE** (lookup columns + editors, banded columns, `calculateCellValue`, `sortOrder`/`sortIndex`/`groupIndex`, word wrap, adaptive hiding). Remaining → Phase 13: cascading lookups, buttons-column customization, `calculateFilterExpression`.

**Phase 12 — Data & scrolling parity: ✅ DONE** (infinite scrolling, remote virtual scrolling with block cache, column virtualization, push/live updates, OData adapter, measured variable row heights + scroll anchoring, deferred group loading via `grouping.autoExpandAll: false`).

**Phase 13 — UX & API parity: ✅ DONE** (imperative API, richer event surface, loading panel, row alternation, focused-row mode, delete confirmation, noData/row templates, toolbar customization, Excel export secondary entry with export scopes, clipboard copy, `selectAllMode: 'page'`, pager display modes + "All" page size, RTL, row drag reordering, form edit mode, cascading lookups, buttons-column customization, `calculateSortValue`/`calculateFilterExpression`).

**Phase 14 — Summary, selection & export parity: ✅ DONE (v0.3.0)** (multiple summaries per column, `calculateCustomSummary`, group footer summaries, expand/collapse-all toolbar UI, grouped date values in the header filter, deferred selection via `selectionFilter`, PDF export secondary entry, `highlightChanges` cell flash, anchored column chooser with drag reorder + drop indicators, Rows & Templates docs page).

**Phase 15 — TreeList (`@oge-ui/tree-list`): ✅ CORE DONE** (new package; grid foundation extraction; see table below).

## TreeList — Feature Parity

`@oge-ui/tree-list` reuses the grid engine via the new `@oge-ui/grid/foundation`
secondary entry (ColumnModel, ColumnLayoutModel, RowVirtualizerModel,
KeyboardNavModel, DeferredChildrenLoader, EditingModel, state persistence) and
the `@oge-ui/core` tree primitives (`buildTreeIndex`, `flattenTreeData`,
`filterTreeKeys`, tri-state selection helpers).

| Feature                                                             | Reference | oge | Notes                                                                                                                                                                    |
| ------------------------------------------------------------------- | --------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Flat self-referencing data (`keyExpr`/`parentIdExpr`/`rootValue`)   | ✔         | ✅  | + `orphanPolicy: discard/promoteToRoot`                                                                                                                                  |
| Expand/collapse + `autoExpandAll` + `[(expandedRowKeys)]`           | ✔         | ✅  | polarity-aware toggled set, O(visible) flatten; cancelable `rowExpanding`/`rowCollapsing`                                                                                |
| Remote lazy loading (`hasItemsExpr`)                                | ✔         | ✅  | `filter: [parentIdExpr,'=',key]` per expansion; cache + skeleton; sort invalidates; remote match discovery under filters with `[keyField,'in',keys]` ancestor completion |
| Row + column virtualization                                         | ✔         | ✅  | 100k-node spec; `columnRenderingMode: 'virtual'` (plain columns)                                                                                                         |
| Sorting (sibling-scoped, multi)                                     | ✔         | ✅  | source-applied sort inherits bucket order                                                                                                                                |
| Filter row + search panel                                           | ✔         | ✅  | client-side, ancestors preserved; `filterMode`; `expandNodesOnFiltering`; operator menu; `<mark>` highlighting                                                           |
| Selection (single/multiple/checkbox)                                | ✔         | ✅  | shared SelectionSlice; two-way `selectedKeys`                                                                                                                            |
| Recursive tri-state selection                                       | ✔         | ✅  | `selectionRecursive` + `getSelectedRowKeys(mode)`; lazy branches bulk-fetch (`parentId in [...]`) before cascading                                                       |
| Focused row                                                         | ✔         | ✅  | `[(focusedRowKey)]`; `autoNavigateToFocusedRow` expands the path and scrolls                                                                                             |
| Keyboard navigation (treegrid)                                      | ✔         | ✅  | logical ArrowRight/Left expand/collapse, parent/first-child jumps, RTL-aware                                                                                             |
| ARIA treegrid                                                       | partial   | ✅  | `aria-level/posinset/setsize/expanded`                                                                                                                                   |
| Columns: resize, reorder, chooser, templates, bands, lookup display | ✔         | ✅  | shared `<oge-column>`; drag reorder + anchored chooser                                                                                                                   |
| Drag & drop reparent + sibling ordering                             | ✔         | ✅  | drop inside/before/after with indicators; descendant guard; array auto-apply + `rowReparented`                                                                           |
| State persistence (`stateKey`)                                      | ✔         | ✅  | sort/filters/columns/expansion                                                                                                                                           |
| Theming (dark/bootstrap/tailwind)                                   | ✔         | ✅  | shared `_structure.scss` + theme css                                                                                                                                     |
| Editing (cell/row/batch/form/popup)                                 | ✔         | ✅  | shared `EditingModel`; `formItems`/`formColCount` layouts; `addRow(parentKey)` + `initNewRow` prefill                                                                    |
| Export CSV + Excel (native outline)                                 | ✔         | ✅  | indented CSV; lazy `@oge-ui/tree-list/export-excel` sets real `outlineLevel`s                                                                                            |
| Column chooser / filter builder + panel / context menus / toolbar   | ✔         | ✅  | anchored chooser with drag reorder; `[(filterValue)]` builder; row + header menus; `[ogeToolbar]`; `loadPanel`/`wordWrap`/`commandButtons`                               |
| Nested payloads (`itemsExpr`)                                       | ✔         | ✅  | inline `items` arrays flattened internally (array data)                                                                                                                  |
| Header filter (distinct values popup, date-year groups)             | ✔         | ✅  | client-side distinct over loaded rows; popup search; tri-state year groups; fold-ordered (locale-safe)                                                                   |
| Paging                                                              | ✔         | ✅  | client-side over the flattened visible rows; shared pager; filter resets the page                                                                                        |

## Pivot Grid (`@oge-ui/pivot`) — Feature Parity

`@oge-ui/pivot` builds on a pure engine in `@oge-ui/core` (`PivotEngine`,
serializable `PivotFieldConfig`, `OgePivotStore` remote contract) and reuses
the grid foundation for state persistence and shared UI primitives.

| Feature                                                | Reference | oge | Notes                                                                                                                      |
| ------------------------------------------------------ | --------- | --- | -------------------------------------------------------------------------------------------------------------------------- |
| Four areas (row/column/data/filter) + field panel      | ✔         | ✅  | `<oge-pivot-field>` directives; drag chips between areas                                                                   |
| Expand/collapse on both axes                           | ✔         | ✅  | expanded group keeps its own line carrying the subtotals                                                                   |
| Summary types (sum/count/avg/min/max/custom)           | ✔         | ✅  | `calculateCustomSummary` reducers travel out-of-band                                                                       |
| Date/number group intervals                            | ✔         | ✅  | year/quarter/month/day/dayOfWeek + numeric bucket size                                                                     |
| Display modes (percent-of, running totals, variations) | ✔         | ✅  | post-processing over the materialized matrix; UI via measure chip menu                                                     |
| Sorting (labels, `sortBySummary` on the opposite axis) | ✔         | ✅  | header context menu; nulls always last                                                                                     |
| Field filters (include/exclude, search)                | ✔         | ✅  | distinct-value popup, capped at 1000, locale-folded search                                                                 |
| Field chooser dialog                                   | ✔         | ✅  | search + 4 zones; `applyChangesMode: instantly/onDemand`                                                                   |
| Totals visibility settings                             | ✔         | ✅  | row/column sub + grand totals independently                                                                                |
| Drill-down (raw rows behind a cell)                    | ✔         | ✅  | `drillDown({ rowPath, columnPath })`; timezone-safe date range filters                                                     |
| Two-axis virtual scrolling                             | ✔         | ✅  | fixed-track windows on rows _and_ columns; 20k-row DOM budget spec                                                         |
| Remote/custom store                                    | ✔         | ✅  | serializable `PivotLoadOptions`/`PivotLoadResult`; `LocalPivotStore` reference impl; abortable loads                       |
| State persistence                                      | ✔         | ✅  | `stateKey` via shared `OGE_STATE_STORAGE`; `state()`/`applyState()`/`stateChange`                                          |
| Export CSV / Excel                                     | ✔         | ✅  | `getCsv()`/`exportCsv()` in the package; lazy `@oge-ui/pivot/export-excel` with merged multi-level headers and typed cells |
| `customizeCell` appearance hook                        | ✔         | ✅  | mutable `{ text, cssClass }` per cell                                                                                      |
| Keyboard navigation + i18n                             | partial   | ✅  | arrow/Home/End over the matrix, Enter/Space toggles headers; full `OgePivotMessages` token                                 |
| Field panel collapse + header context menus            | ✔         | ✅  | sort, filter, remove, expand/collapse all, chooser                                                                         |
| Pivot chart binding                                    | ✔         | ❌  | needs a charting package first                                                                                             |

**Phase 16 — Pivot Grid: ✅ DONE** (P0 engine → P5 export/persistence; docs overview + analytics pages, e2e smoke).

**Next:** pivot chart binding · grid popup migration to `@oge-ui/overlay`.

## Buttons (`@oge-ui/buttons`) — Feature Parity

`OgeButton` + `OgeButtonGroup` + `OgeDropDownButton` (reference
button/button-group/drop-down-button scope, adapted to the signal-based house
API). The drop-down builds on the new `@oge-ui/overlay` package
(`resolvePopupPosition` flip/clamp math, `OgeAnchoredPanel` behavior model,
`oge-popup` chrome, `oge-menu-list` with the canonical `OgeMenuItem`) — the
grid's inline popups migrate to it in a future wave.

| Feature                                               | Reference | oge     | Notes                                                                        |
| ----------------------------------------------------- | --------- | ------- | ---------------------------------------------------------------------------- |
| text / icon / iconPosition                            | Yes       | Done    | icons via `[ogeButtonIcon]` SVG projection (no icon font)                    |
| type/severity + stylingMode (contained/outlined/text) | Yes       | Done    | `severity: normal/accent/success/warning/danger`, token-driven               |
| sizes                                                 | No        | Done    | `size: sm/md/lg` (house addition)                                            |
| disabled / hint / tabIndex / accessKey                | Yes       | Done    |                                                                              |
| useSubmitBehavior                                     | Yes       | Done    | renders `type="submit"`                                                      |
| focus/hover/active state flags                        | Yes       | Skipped | CSS pseudo-classes always on (simpler, documented)                           |
| rtlEnabled                                            | Yes       | Done    | logical properties; follows `dir`, no input needed                           |
| onClick                                               | Yes       | Done    | `(clicked)` output (guarded pipeline); native `(click)` documented as bypass |
| **Async action + auto loading (single-flight)**       | No        | Done    | unique: `[action]`, `[(loading)]`, `actionDone`/`actionFailed`               |
| **Click guard (throttle/debounce)**                   | No        | Done    | unique: `clickGuard: true / { mode, ms }`                                    |
| **Badge / dot indicator**                             | No        | Done    | unique: `badge: number/string/true`, 99+ capping, a11y-aware                 |
| **Hold-to-confirm**                                   | No        | Done    | unique: CSS-only progress bar, Escape/pointer-cancel abort, keyboard hold    |
| **Auto-repeat (stepper)**                             | No        | Done    | unique: delay + interval, disabled-flip stop                                 |
| ButtonGroup items + declarative children              | Yes       | Done    | both; items render after projected children                                  |
| ButtonGroup selectionMode + selectedKeys              | Yes       | Done    | `none/single/multiple`, two-way model, added/removed diffs                   |
| ButtonGroup keyboard nav + ARIA                       | partial   | Done    | roving tabindex, arrow/Home/End, radiogroup/toolbar/group roles, RTL-aware   |
| DropDownButton (items / async items / placement)      | Yes       | Done    | `items` array or lazy fn (loading/error/empty rows, cache, runId race guard) |
| SplitButton                                           | Yes       | Done    | `splitButton` input: main action + chevron toggle, segmented styling         |
| **rememberLastAction (split)**                        | No        | Done    | unique: last item becomes the main label+action (IDE Run-button pattern)     |
| Menu keyboard: arrows/Home/End + **type-ahead**       | partial   | Done    | WAI-ARIA menu-button, `aria-activedescendant`, focus restore, Tab handling   |
| Custom panel content                                  | Yes       | Done    | `*ogeDropDownContent` template with `$implicit` close fn                     |
| Overlay: flip/clamp + scroll reposition               | No        | Done    | `@oge-ui/overlay`; grid popups migrate later                                 |

## Inputs (`@oge-ui/inputs`) — Feature Parity

`OgeTextBox` + `OgeTextArea` + `OgeNumberBox` on one shared field chrome
(reference TextBox/TextArea/NumberBox scope, Angular-native API). First
package implementing the Signal Forms `FormValueControl` contract and the
repo's CVA house pattern. Input masking is deferred to a later wave.

| Feature                                            | Reference | oge     | Notes                                                                        |
| -------------------------------------------------- | --------- | ------- | ---------------------------------------------------------------------------- |
| mode/type (text/email/password/search/tel/url)     | Yes       | Done    | native `type` + first-class inputmode/enterkeyhint/autocomplete              |
| label + labelMode (static/floating/hidden/outside) | Yes       | Done    | floating label with placeholder suppression                                  |
| stylingMode (outlined/filled/underlined)           | Yes       | Done    | token-driven, all three themes                                               |
| sizes                                              | No        | Done    | `sm/md/lg` = 28/34/42px (button parity)                                      |
| showClearButton / placeholder / maxLength          | Yes       | Done    | clear keeps focus (mousedown prevented), tabindex -1                         |
| buttons (custom editor buttons)                    | Yes       | Done    | replaced with `[ogeInputPrefix]`/`[ogeInputSuffix]` projection + fixed rail  |
| hint / validation display                          | Yes       | Done    | subscript with `subscriptSizing: fixed/dynamic/none`, aria-live, describedby |
| isValid/validationError inputs                     | Yes       | Done    | `invalid` + `errorText` (grid-editor parity), `errorDisplay` policy          |
| **Signal Forms (FormValueControl)**                | No        | Done    | `[formField]` auto-binds errors/touched/disabled/min/max/…                   |
| Reactive/template forms (CVA)                      | Yes       | Done    | constructor-assignment pattern, `control.events` state bridge                |
| valueChangeEvent/debounce                          | Yes       | Done    | `debounce` ms + raw `inputChange` stream; blur/Enter flush                   |
| **Grapheme-accurate counter (soft limit)**         | No        | Done    | unique: Intl.Segmenter, emoji family = 1; `counterMode: limit/soft`          |
| **Password reveal + copy button**                  | No        | Done    | unique: in-place type flip (caret kept), clipboard + live-region             |
| **Async pending indicator + success icon**         | No        | Done    | unique: rail spinner via `pending`, `showSuccessIcon`                        |
| TextArea autoResize (minRows/maxRows)              | Yes       | Done    | CSS `field-sizing: content` + measurement fallback                           |
| NumberBox null-empty / min/max/step / spin         | Yes       | Done    | `number \| null`, clamp-on-commit, hold-to-repeat + Arrow keys               |
| NumberBox format                                   | Yes       | Done    | `Intl.NumberFormatOptions` display-on-blur, locale-aware parse               |
| onValueChanged parity (previousValue + event)      | Yes       | Done    | `valueCommitted { value, previousValue, event? }`; `event === undefined` = programmatic |
| reset() / imperative parity                        | Yes       | Done    | input `reset(value?)`, group `focus()`, drop-down `open/close/toggle()` + `selectionChanged`, group `itemClick { item?, index }` |
| mask                                               | Yes       | Missing | deferred — Maskito attaches to the native input; adapter wave later          |
| Grid editor migration to `<oge-text-box>`          | —         | Planned | `size=sm + labelMode=hidden + subscriptSizing=none` is the compact shape     |
