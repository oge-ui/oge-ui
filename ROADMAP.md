# oge Data Grid — Feature Parity Roadmap

Comparison of `@oge-ui/grid` against the feature set of leading commercial data grids.
Legend: ✅ implemented · 🟡 partial · ❌ missing.

Last updated: 2026-08-05 (after Phase 14 / summary, selection & export parity).

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

| Feature                               | Reference | oge | Notes                                                             |
| ------------------------------------- | --------- | --- | ----------------------------------------------------------------- |
| single/multiple/checkbox + shift/ctrl | ✔         | ✅  |                                                                   |
| Select-all (filtered) + indeterminate | ✔         | ✅  |                                                                   |
| `selectAllMode: 'page'`               | ✔         | ✅  | page or all filtered pages, async fetch for remote (Phase 13)     |
| Deferred selection                    | ✔         | ✅  | `selectionDeferred` + `[(selectionFilter)]` FilterExpr (Phase 14) |
| Focused row mode (`focusedRowKey`)    | ✔         | ✅  | `focusedRowEnabled` + `[(focusedRowKey)]` (Phase 13)              |
| Excel-like keyboard navigation        | ✔         | ✅  | axe-verified ARIA; RTL-aware arrows                               |
| Clipboard copy                        | ✔         | ✅  | `copyToClipboard()` + Ctrl+C, TSV of selection (Phase 13)         |

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
| Header context menu                           | ✔         | ✅  | sort/group/pin/hide, localized (Phase 9)                                                                                              |
| **State persistence**                         | ✔         | ✅  | `stateKey` + `OGE_STATE_STORAGE` (Phase 9)                                                                                            |
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

| Feature                                                           | Reference | oge | Notes                                                                                      |
| ----------------------------------------------------------------- | --------- | --- | ------------------------------------------------------------------------------------------ |
| Flat self-referencing data (`keyExpr`/`parentIdExpr`/`rootValue`) | ✔         | ✅  | + `orphanPolicy: discard/promoteToRoot`                                                    |
| Expand/collapse + `autoExpandAll` + `[(expandedRowKeys)]`         | ✔         | ✅  | polarity-aware toggled set, O(visible) flatten                                             |
| Remote lazy loading (`hasItemsExpr`)                              | ✔         | ✅  | `filter: [parentIdExpr,'=',key]` per expansion; cache + skeleton; sort invalidates         |
| Row virtualization                                                | ✔         | ✅  | 100k-node spec                                                                             |
| Sorting (sibling-scoped, multi)                                   | ✔         | ✅  | source-applied sort inherits bucket order                                                  |
| Filter row + search panel                                         | ✔         | ✅  | client-side, ancestors preserved; `filterMode: withAncestors/fullBranch/matchOnly`         |
| Selection (single/multiple/checkbox)                              | ✔         | ✅  | shared SelectionSlice; two-way `selectedKeys`                                              |
| Recursive tri-state selection                                     | ✔         | ✅  | `selectionRecursive` + `getSelectedRowKeys(mode)`                                          |
| Focused row                                                       | ✔         | ✅  | `[(focusedRowKey)]`                                                                        |
| Keyboard navigation (treegrid)                                    | ✔         | ✅  | logical ArrowRight/Left expand/collapse, parent/first-child jumps, RTL-aware               |
| ARIA treegrid                                                     | partial   | ✅  | `aria-level/posinset/setsize/expanded`                                                     |
| Columns: resize, templates, bands, lookup display                 | ✔         | ✅  | shared `<oge-column>`                                                                      |
| Drag & drop reparenting                                           | ✔         | ✅  | drop-onto-row; descendant guard; array auto-apply + `rowReparented`                        |
| State persistence (`stateKey`)                                    | ✔         | ✅  | sort/filters/columns/expansion                                                             |
| Theming (dark/bootstrap/tailwind)                                 | ✔         | ✅  | shared `_structure.scss` + theme css                                                       |
| Editing (cell/row/batch)                                          | ✔         | ✅  | shared `EditingModel`; `addRow(parentKey)` pre-stages the parent; form/popup modes planned |
| Export CSV (indented)                                             | ✔         | ✅  | `getCsv()/exportCsv()` over the visible tree; Excel outline planned                        |
| Column chooser / header filter / filter builder                   | ✔         | ❌  | planned (shared slices ready)                                                              |
| Paging                                                            | ✔         | ❌  | planned (post-flatten page)                                                                |
| Node drag between-sibling ordering                                | ✔         | ❌  | planned (reparent-only today)                                                              |

**Next:** TreeList editing wiring + export · pivot-style features · editing form layouts (`formItems` customization) · export appearance hooks (`customizeCell`).
