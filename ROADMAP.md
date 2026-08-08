# OGE Data Grid — Feature Parity Roadmap

Comparison of `@oge-ui/grid` against the feature set of leading commercial data grids.
Legend: Done · Partial · Missing.

Last updated: 2026-08-08 (after TreeView / `@oge-ui/navigation` initial release).

## 1. Data binding & data operations

| Feature                                 | Reference | OGE  | Notes                                                                                       |
| --------------------------------------- | --------- | ---- | ------------------------------------------------------------------------------------------- |
| Local array binding                     | Yes       | Done | `T[]`, `ArrayDataSource`                                                                    |
| Custom remote store                     | Yes       | Done | `CustomDataSource` + serializable `LoadOptions`                                             |
| OData store                             | Yes       | Done | `ODataDataSource` + `buildODataQuery` (v4: `$skip`/`$top`/`$orderby`/`$filter`/`$count`)    |
| CRUD write-back                         | Yes       | Done | `insert/update/remove`, in-place array CRUD                                                 |
| Push / live updates (`reshapeOnPush`)   | Yes       | Done | `ArrayDataSource.push()` + `changes` stream; updates patch in place, insert/remove reload   |
| `highlightChanges` (flash pushed cells) | Yes       | Done | exact patched cells flash, re-triggers on repeat updates (Phase 14)                         |
| Server-side sort/filter/page/group      | Yes       | Done | verified with request-log e2e                                                               |
| Server-side summaries                   | Yes       | Done | positional `summary` payload                                                                |
| Deferred group loading (`items: null`)  | Yes       | Done | `grouping.autoExpandAll: false`; children fetched on expand, cached, skeleton while loading |

## 2. Paging & scrolling

| Feature                                   | Reference | OGE  | Notes                                                                   |
| ----------------------------------------- | --------- | ---- | ----------------------------------------------------------------------- |
| Paging + page-size selector + info        | Yes       | Done | `pageSizes`, `showInfo`                                                 |
| "All" page size option                    | Yes       | Done | `pageSizes: [10, 'all']` (Phase 13)                                     |
| Pager display modes (compact/adaptive)    | Yes       | Done | `displayMode: full/compact/adaptive` + width-driven adaptive (Phase 13) |
| Row virtual scrolling                     | Yes       | Done | Fenwick-tree windowing, 100k e2e                                        |
| **Column virtualization**                 | Yes       | Done | `columnRenderingMode: 'virtual'`; plain columns only (no pins/bands)    |
| **Infinite scrolling**                    | Yes       | Done | `scrolling.mode: 'infinite'`, skeleton fillers, growing scroll space    |
| Remote virtual scrolling (windowed fetch) | Yes       | Done | 100-row block cache, de-dupe, sort/filter invalidation; 1M-row demo     |
| Variable row heights (measured)           | Yes       | Done | `autoRowHeight`: measured after render, scroll-anchored corrections     |
| scrollToRow public API                    | Yes       | Done | `scrollToRow(index                                                      | key)` (Phase 13) |

## 3. Sorting

| Feature                                           | Reference | OGE  | Notes                                                   |
| ------------------------------------------------- | --------- | ---- | ------------------------------------------------------- |
| Single/multi/none + allowUnsorting                | Yes       | Done | incl. global config                                     |
| Initial sort via column (`sortIndex`/`sortOrder`) | Yes       | Done | + `groupIndex` (Phase 11); stateKey/user wins           |
| Custom sort (`calculateSortValue`)                | Yes       | Done | works client-side incl. lookup display order (Phase 13) |

## 4. Filtering & search

| Feature                                | Reference | OGE  | Notes                                                                     |
| -------------------------------------- | --------- | ---- | ------------------------------------------------------------------------- |
| Filter row                             | Yes       | Done | dataType-aware editors, debounce                                          |
| Filter row **operator menu** per cell  | Yes       | Done | per-dataType operators + Reset (Phase 10)                                 |
| Header filter (distinct values)        | Yes       | Done | via `DataSource.distinct`                                                 |
| Header filter search box               | Yes       | Done | Phase 10; date columns group by year with tri-state checkboxes (Phase 14) |
| Search panel                           | Yes       | Done |                                                                           |
| Search result **highlighting**         | Yes       | Done | default cells, `<mark>` (Phase 10)                                        |
| **Filter Builder + filter panel**      | Yes       | Done | recursive and/or editor + readable panel (Phase 10)                       |
| Programmatic filter value input/output | Yes       | Done | `[(filterValue)]`, persisted via `stateKey` (Phase 10)                    |
| `calculateFilterExpression` per column | Yes       | Done | filter row + builder use the custom expression (Phase 13)                 |

## 5. Grouping & summaries

| Feature                                   | Reference | OGE  | Notes                                                     |
| ----------------------------------------- | --------- | ---- | --------------------------------------------------------- |
| Group panel drag & drop, multi-level      | Yes       | Done |                                                           |
| Group summaries / total summaries         | Yes       | Done | sum/avg/min/max/count, localized patterns                 |
| Multiple summaries per column             | Yes       | Done | `[groupSummary]="['sum','avg']"` (Phase 14)               |
| Custom summary (`calculateCustomSummary`) | Yes       | Done | `type: 'custom'` + column reducer, client-side (Phase 14) |
| Summaries in **group footer**             | Yes       | Done | `groupSummaryPosition: 'footer'` per column (Phase 14)    |
| Expand/collapse **all** (API + UI)        | Yes       | Done | API (Phase 13) + toolbar buttons when grouped (Phase 14)  |
| `autoExpandGroup` control                 | Yes       | Done | `grouping.autoExpandAll` (Phase 12)                       |
| Column `groupIndex` input                 | Yes       | Done | Phase 11                                                  |

## 6. Columns

| Feature                                        | Reference | OGE  | Notes                                                                                                     |
| ---------------------------------------------- | --------- | ---- | --------------------------------------------------------------------------------------------------------- |
| Resize / reorder / fixed (pin) / chooser       | Yes       | Done | chooser anchored to its button, drag-reorder rows, drop indicators on headers (Phase 14)                  |
| minWidth / width / visible                     | Yes       | Done |                                                                                                           |
| **Banded columns** (multi-row headers)         | Yes       | Done | `<oge-column-group>` (Phase 11)                                                                           |
| **Lookup columns** (display + dropdown editor) | Yes       | Done | display/filter/header-filter/editor/CSV (Phase 11); cascading via `dataSource: (row) => items` (Phase 13) |
| Calculated columns (`calculateCellValue`)      | Yes       | Done | display/CSV (Phase 11); sort/filter via `calculateSortValue`/`calculateFilterExpression` (Phase 13)       |
| Adaptive column hiding (`hidingPriority`)      | Yes       | Done | width-driven, restores automatically (Phase 11)                                                           |
| Command/buttons column customization           | Yes       | Done | `commandButtons` input: built-in + custom buttons, `visible(row)`, icons (Phase 13)                       |
| Header/cell/edit templates                     | Yes       | Done | fully typed                                                                                               |
| Word wrap / auto row height                    | Yes       | Done | `wordWrap` input (Phase 11; virtual mode stays fixed-height)                                              |

## 7. Selection, focus, keyboard

| Feature                               | Reference | OGE  | Notes                                                                                                                                     |
| ------------------------------------- | --------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| single/multiple/checkbox + shift/ctrl | Yes       | Done |                                                                                                                                           |
| Select-all (filtered) + indeterminate | Yes       | Done |                                                                                                                                           |
| `selectAllMode: 'page'`               | Yes       | Done | page or all filtered pages, async fetch for remote (Phase 13)                                                                             |
| Deferred selection                    | Yes       | Done | `selectionDeferred` + `[(selectionFilter)]` FilterExpr (Phase 14)                                                                         |
| Focused row                           | Yes       | Done | `[(focusedRowKey)]` + `focusedRowChanged`; `navigateToRow(key)` scrolls & focuses (tree-list additionally has `autoNavigateToFocusedRow`) |
| Excel-like keyboard navigation        | Yes       | Done | axe-verified ARIA; RTL-aware arrows                                                                                                       |
| Clipboard copy                        | Yes       | Done | `copyToClipboard()` + Ctrl+C, TSV of selection (Phase 13)                                                                                 |

## 8. Editing

| Feature                             | Reference | OGE  | Notes                                                                          |
| ----------------------------------- | --------- | ---- | ------------------------------------------------------------------------------ |
| cell / row / batch / popup modes    | Yes       | Done |                                                                                |
| **form** mode (inline form)         | Yes       | Done | `editing.mode: 'form'` — labeled inline form row (Phase 13)                    |
| Validation rules                    | Yes       | Done | `required` + any Angular validators                                            |
| Custom editors (`editCellTemplate`) | Yes       | Done | `*ogeEditTemplate` with FormControl                                            |
| Lookup editors                      | Yes       | Done | default select editor (Phase 11); cascading via function dataSource (Phase 13) |
| Row drag & drop reordering          | Yes       | Done | `rowDragging` + drag handle + `rowReordered` (Phase 13)                        |
| Confirmation on delete              | Yes       | Done | `editing.confirmDelete` (Phase 13)                                             |

## 9. Appearance, UX, misc

| Feature                                       | Reference | OGE  | Notes                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | --------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theming (tokens, dark, bridges)               | Yes       | Done | arguably ahead (Tailwind/Bootstrap bridges)                                                                                                                                                                                                                                                                                                                                                          |
| Localization of all texts                     | Yes       | Done | `provideOgeGridConfig` messages                                                                                                                                                                                                                                                                                                                                                                      |
| RTL support                                   | Yes       | Done | `rtlEnabled` / auto-detect, logical CSS properties, mirrored chevrons & arrows (Phase 13)                                                                                                                                                                                                                                                                                                            |
| Row alternation (striping)                    | Yes       | Done | `rowAlternation` + `--oge-row-alt-bg` token (Phase 13)                                                                                                                                                                                                                                                                                                                                               |
| Loading indicator                             | Yes       | Done | `loadPanel` spinner overlay (Phase 13)                                                                                                                                                                                                                                                                                                                                                               |
| Custom no-data template                       | Yes       | Done | `*ogeNoDataTemplate` (Phase 13)                                                                                                                                                                                                                                                                                                                                                                      |
| Row template (full row)                       | Yes       | Done | `*ogeRowTemplate` with typed context (Phase 13)                                                                                                                                                                                                                                                                                                                                                      |
| Toolbar customization (custom items)          | Yes       | Done | `[ogeToolbar]` projected slot (Phase 13)                                                                                                                                                                                                                                                                                                                                                             |
| Context menu (rows)                           | Yes       | Done | event-driven items                                                                                                                                                                                                                                                                                                                                                                                   |
| Header context menu                           | Yes       | Done | sort/group/pin/hide, localized (Phase 9); customizable via `headerContextMenu` (Phase 15)                                                                                                                                                                                                                                                                                                            |
| **State persistence**                         | Yes       | Done | `stateKey` + sync/async `OGE_STATE_STORAGE`; `state()` / `applyState()` / `stateChange` (Phase 15)                                                                                                                                                                                                                                                                                                   |
| **Export CSV/Excel**                          | Yes       | Done | CSV in core; Excel via lazy `@oge-ui/grid/export-excel` (exceljs, typed cells); `scope: all/page/selection`                                                                                                                                                                                                                                                                                          |
| Export PDF                                    | Yes       | Done | lazy `@oge-ui/grid/export-pdf` (jspdf + autotable, optional peers) (Phase 14)                                                                                                                                                                                                                                                                                                                        |
| Imperative public API (refresh, expandAll, …) | Yes       | Done | Phase 13 set + Phase 17: editing (`addRow/editRow/deleteRow/saveChanges/discardChanges/hasChanges`), selection (`selectAll/deselectAll/clearSelection/isRowSelected/getSelectedRowsData`), data (`getVisibleRows/getRowByKey`), navigation (`navigateToRow/expandRow/collapseRow/isRowExpanded`), loading (`beginCustomLoading/endCustomLoading`), paging getters/setters — see "API parity" section |
| Event surface (cellClick, saving, …)          | Yes       | Done | Phase 13 set + Phase 17: `cellDblClick/selectionChanged/focusedRowChanged/editingStart/initNewRow/rowInserting‑ed/rowUpdating‑ed/rowRemoving‑ed/savedChanges/editCanceled/exporting/dataErrorOccurred` — see "API parity" section                                                                                                                                                                    |
| Master-detail                                 | Yes       | Done | typed template                                                                                                                                                                                                                                                                                                                                                                                       |
| Hierarchical data (tree grid)                 | Yes       | Done | separate `@oge-ui/tree-list` component (see table below)                                                                                                                                                                                                                                                                                                                                             |

## API parity — Methods & Events (dxDataGrid / dxTreeList, Phase 17)

Audited against the official dxDataGrid/dxTreeList Methods and Events references.
jQuery/option-machinery members are **deliberately not replicated**:
`option()/resetOption()/defaultOptions()/instance()/getInstance()/element()/dispose()/on()/off()/repaint()/repaintRows()/updateDimensions()/getScrollable()/beginUpdate()/endUpdate()`
(signals + Angular change detection cover them), `onInitialized/onOptionChanged/onContentReady`
lifecycle callbacks (Angular lifecycle, `effect()`; our `contentReady` is a
post-render notification, not a lifecycle hook), `keyDown` (native `keydown`
bubbles from the host), `cellHoverChanged` (CSS), `rowPrepared/cellPrepared/
editorPreparing/editorPrepared/toolbarPreparing` (typed templates and the
`commandButtons`/`[ogeToolbar]` slots replace preparation callbacks), adaptive
detail rows (`hidingPriority` is the house solution) and the AI-column surface
(out of scope).

### Methods (dxDataGrid → OgeGrid)

| Reference method (group)                                                                 | OGE     | Notes                                                                                                |
| ---------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `refresh()`                                                                              | Done    | `refresh()`                                                                                          |
| `byKey(key)` / `getVisibleRows()` / `keyOf(obj)`                                         | Done    | `getRowByKey(key)` (sync, loaded rows) / `getVisibleRows()` / `keyField` selector                    |
| `addRow()` / `deleteRow()` / `undeleteRow()`                                             | Done    | `addRow()` + `initNewRow` prefill; `deleteRow(key)` — key-addressed, batch mode toggles (= undelete) |
| `editRow()` / `editCell()`                                                               | Done    | `editRow(key)` (row/form/popup); cell editors are pointer/keyboard-driven, `editingStart` can veto   |
| `saveEditData()` / `cancelEditData()` / `hasEditData()` / `closeEditCell()`              | Done    | `saveChanges()` / `discardChanges()` / `hasChanges()`; `discardChanges` also closes editors          |
| `selectAll()` / `deselectAll()` / `clearSelection()`                                     | Done    | same names; `selectAll()` honors `selectAllMode` and deferred mode (filter expression, no keys)      |
| `selectRows()` / `deselectRows()` / `getSelectedRowKeys()`                               | Done    | the `[(selectedKeys)]` model is the read/write surface                                               |
| `getSelectedRowsData()` / `isRowSelected(key)`                                           | Done    | same names (loaded rows)                                                                             |
| `filter()` / `clearFilter()` / `searchByText()`                                          | Done    | `[(filterValue)]` + `clearFilters()`; search via the search panel and the state snapshot             |
| `clearSorting()` / `clearGrouping()`                                                     | Done    | `clearSorting()`; grouping via the `groupBy` input (`[]` clears)                                     |
| `expandRow()` / `collapseRow()` / `isRowExpanded()`                                      | Done    | same names — group rows (group node key) and master-detail rows                                      |
| `expandAll()` / `collapseAll()`                                                          | Done    | `expandAllGroups()` / `collapseAllGroups()` (all levels; no per-`groupIndex` variant)                |
| `pageIndex()` / `pageSize()` / `pageCount()` / `totalCount()`                            | Done    | same getters + explicit `setPageIndex()` / `setPageSize()` setters (no overloaded getter/setter)     |
| `navigateToRow(key)` / `focus()` / `isRowFocused()`                                      | Done    | `navigateToRow(key)`; focus state reads from `focusedRowKey()`                                       |
| `beginCustomLoading()` / `endCustomLoading()`                                            | Done    | same names; message defaults to `messages.loading`                                                   |
| `state()`                                                                                | Done    | `state()` / `applyState()` / `stateChange`                                                           |
| Export (via `onExporting`)                                                               | Done    | `getExportData()` / `getCsv()` / `exportCsv()` + lazy Excel/PDF entries; `copyToClipboard()`         |
| Column DOM/option access (`columnOption`, `cellValue`, `getCellElement`, `addColumn`, …) | —       | deliberate: columns are declarative signal inputs (`visible` is a model); no runtime option bag      |
| `showColumnChooser()` / `hideColumnChooser()`                                            | Partial | `columnChooser` input renders the button; no imperative open — backlog                               |
| `getTotalSummaryValue(name)`                                                             | Partial | totals render in the UI; no programmatic getter — backlog                                            |

### Events (dxDataGrid → OgeGrid)

| Reference event                                                | OGE     | Notes                                                                                       |
| -------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `rowClick` / `rowDblClick` / `cellClick` / `cellDblClick`      | Done    | same names, flat payloads with `row`/`key`/`field`/`value`/`event`                          |
| `selectionChanged`                                             | Done    | `{ selectedKeys, addedKeys, removedKeys }` diffs                                            |
| `focusedRowChanged` / `focusedRowChanging`                     | Done    | `focusedRowChanged { key, row }`; pre-event skipped — set the `focusedRowKey` model instead |
| `editingStart`                                                 | Done    | cancelable, `{ key, row, field?, cancel }` (cell and row editors)                           |
| `initNewRow`                                                   | Done    | `{ key, values }` prefill hook (tree-list adds `parentKey`)                                 |
| `rowInserting/-ed`, `rowUpdating/-ed`, `rowRemoving/-ed`       | Done    | per-change around the DataSource write; `-ing` events cancelable                            |
| `saving` / `saved`                                             | Done    | `savingChanges` (cancelable, whole batch) / `savedChanges` (applied changes)                |
| `editCanceled` / `editCanceling`                               | Done    | `editCanceled`; the sync discard needs no pre-event                                         |
| `exporting`                                                    | Done    | cancelable, mutable `fileName` (CSV path; Excel/PDF helpers call `getExportData` directly)  |
| `dataErrorOccurred`                                            | Done    | `{ error }` — load failures and save failures                                               |
| `contextMenuPreparing`                                         | Done    | `rowContextMenu` / `headerContextMenu` with prebuilt mutable `items`                        |
| `contentReady`                                                 | Done    | post-render notification (not a jQuery lifecycle hook)                                      |
| `rowExpanding/-ed`, `rowCollapsing/-ed` (groups/master-detail) | Partial | tree-list has all four (cancelable); grid group/detail toggles are not evented — backlog    |
| `focusedCellChanged/-ing`                                      | Partial | keyboard model tracks the cell internally; not exposed as an output — backlog               |
| `rowValidating`                                                | —       | deliberate: Angular validators run per `FormControl`                                        |

### dxTreeList extras

| Reference member                                         | OGE     | Notes                                                                              |
| -------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `forEachNode()` / `getNodeByKey()`                       | Done    | same names (`getNodeByKey` returns the row; nodes are flat rows + `treeIndex`)     |
| `getSelectedRowKeys(mode)` / `getSelectedRowsData(mode)` | Done    | `'all' \| 'leavesOnly' \| 'excludeRecursive'`                                      |
| `addRow(parentId)`                                       | Done    | `addRow(parentKey?)` + `initNewRow { key, parentKey, values }`                     |
| `expandRow/collapseRow/isRowExpanded`                    | Done    | polarity-aware under `autoExpandAll`; `rowExpanding/rowCollapsing` veto UI toggles |
| `loadDescendants()`                                      | Partial | lazy loader fetches per expansion; no bulk prefetch API — backlog                  |
| `getRootNode()`                                          | —       | deliberate: flat rows + `rootValue`; there is no node-object tree                  |
| `nodesInitialized`                                       | —       | deliberate: the `treeIndex` is a computed — react with `effect()`                  |

### dxPivotGrid (small surface)

Methods beyond the jQuery machinery: `getDataSource()` → engine/`OgePivotStore`
inputs; `getFieldChooserPopup()` → `showFieldChooser()`; `bindChart()` → missing
(needs a charting package, see backlog); `updateDimensions()` → not needed
(signals). Events: `cellClick` done, `cellPrepared` → `customizeCell` input done,
`contentReady/initialized/optionChanged/disposing` → deliberate,
`contextMenuPreparing` → partial: internal menus are not customizable — backlog,
`exporting` → partial: `exportCsv()` has no pre-event yet — backlog. The pivot also
has `cellDblClick`, `fieldLayoutChange` and `stateChange` beyond the reference.

## Prioritized backlog

**Phase 9 — shipped** (state persistence, CSV export, header context menu, READMEs, v0.1.0 release prep; Excel export deferred to Phase 13).

**Phase 10 — Filtering parity — shipped** (filter builder + panel, operator menu, header-filter search, `[(filterValue)]`, search highlighting).

**Phase 11 — Column parity — shipped** (lookup columns + editors, banded columns, `calculateCellValue`, `sortOrder`/`sortIndex`/`groupIndex`, word wrap, adaptive hiding). Remaining → Phase 13: cascading lookups, buttons-column customization, `calculateFilterExpression`.

**Phase 12 — Data & scrolling parity — shipped** (infinite scrolling, remote virtual scrolling with block cache, column virtualization, push/live updates, OData adapter, measured variable row heights + scroll anchoring, deferred group loading via `grouping.autoExpandAll: false`).

**Phase 13 — UX & API parity — shipped** (imperative API, richer event surface, loading panel, row alternation, focused-row mode, delete confirmation, noData/row templates, toolbar customization, Excel export secondary entry with export scopes, clipboard copy, `selectAllMode: 'page'`, pager display modes + "All" page size, RTL, row drag reordering, form edit mode, cascading lookups, buttons-column customization, `calculateSortValue`/`calculateFilterExpression`).

**Phase 14 — Summary, selection & export parity — shipped (v0.3.0)** (multiple summaries per column, `calculateCustomSummary`, group footer summaries, expand/collapse-all toolbar UI, grouped date values in the header filter, deferred selection via `selectionFilter`, PDF export secondary entry, `highlightChanges` cell flash, anchored column chooser with drag reorder + drop indicators, Rows & Templates docs page).

**Phase 15 — TreeList (`@oge-ui/tree-list`) — core shipped** (new package; grid foundation extraction; see table below).

## TreeList — Feature Parity

`@oge-ui/tree-list` reuses the grid engine via the new `@oge-ui/grid/foundation`
secondary entry (ColumnModel, ColumnLayoutModel, RowVirtualizerModel,
KeyboardNavModel, DeferredChildrenLoader, EditingModel, state persistence) and
the `@oge-ui/core` tree primitives (`buildTreeIndex`, `flattenTreeData`,
`filterTreeKeys`, tri-state selection helpers).

| Feature                                                             | Reference | OGE  | Notes                                                                                                                                                                    |
| ------------------------------------------------------------------- | --------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Flat self-referencing data (`keyExpr`/`parentIdExpr`/`rootValue`)   | Yes       | Done | + `orphanPolicy: discard/promoteToRoot`                                                                                                                                  |
| Expand/collapse + `autoExpandAll` + `[(expandedRowKeys)]`           | Yes       | Done | polarity-aware toggled set, O(visible) flatten; cancelable `rowExpanding`/`rowCollapsing`                                                                                |
| Remote lazy loading (`hasItemsExpr`)                                | Yes       | Done | `filter: [parentIdExpr,'=',key]` per expansion; cache + skeleton; sort invalidates; remote match discovery under filters with `[keyField,'in',keys]` ancestor completion |
| Row + column virtualization                                         | Yes       | Done | 100k-node spec; `columnRenderingMode: 'virtual'` (plain columns)                                                                                                         |
| Sorting (sibling-scoped, multi)                                     | Yes       | Done | source-applied sort inherits bucket order                                                                                                                                |
| Filter row + search panel                                           | Yes       | Done | client-side, ancestors preserved; `filterMode`; `expandNodesOnFiltering`; operator menu; `<mark>` highlighting                                                           |
| Selection (single/multiple/checkbox)                                | Yes       | Done | shared SelectionSlice; two-way `selectedKeys`                                                                                                                            |
| Recursive tri-state selection                                       | Yes       | Done | `selectionRecursive` + `getSelectedRowKeys(mode)`; lazy branches bulk-fetch (`parentId in [...]`) before cascading                                                       |
| Focused row                                                         | Yes       | Done | `[(focusedRowKey)]`; `autoNavigateToFocusedRow` expands the path and scrolls                                                                                             |
| Keyboard navigation (treegrid)                                      | Yes       | Done | logical ArrowRight/Left expand/collapse, parent/first-child jumps, RTL-aware                                                                                             |
| ARIA treegrid                                                       | partial   | Done | `aria-level/posinset/setsize/expanded`                                                                                                                                   |
| Columns: resize, reorder, chooser, templates, bands, lookup display | Yes       | Done | shared `<oge-column>`; drag reorder + anchored chooser                                                                                                                   |
| Drag & drop reparent + sibling ordering                             | Yes       | Done | drop inside/before/after with indicators; descendant guard; array auto-apply + `rowReparented`                                                                           |
| State persistence (`stateKey`)                                      | Yes       | Done | sort/filters/columns/expansion                                                                                                                                           |
| Theming (dark/bootstrap/tailwind)                                   | Yes       | Done | shared `_structure.scss` + theme css                                                                                                                                     |
| Editing (cell/row/batch/form/popup)                                 | Yes       | Done | shared `EditingModel`; `formItems`/`formColCount` layouts; `addRow(parentKey)` + `initNewRow` prefill                                                                    |
| Export CSV + Excel (native outline)                                 | Yes       | Done | indented CSV; lazy `@oge-ui/tree-list/export-excel` sets real `outlineLevel`s                                                                                            |
| Column chooser / filter builder + panel / context menus / toolbar   | Yes       | Done | anchored chooser with drag reorder; `[(filterValue)]` builder; row + header menus; `[ogeToolbar]`; `loadPanel`/`wordWrap`/`commandButtons`                               |
| Nested payloads (`itemsExpr`)                                       | Yes       | Done | inline `items` arrays flattened internally (array data)                                                                                                                  |
| Header filter (distinct values popup, date-year groups)             | Yes       | Done | client-side distinct over loaded rows; popup search; tri-state year groups; fold-ordered (locale-safe)                                                                   |
| Paging                                                              | Yes       | Done | client-side over the flattened visible rows; shared pager; filter resets the page                                                                                        |

## Pivot Grid (`@oge-ui/pivot`) — Feature Parity

`@oge-ui/pivot` builds on a pure engine in `@oge-ui/core` (`PivotEngine`,
serializable `PivotFieldConfig`, `OgePivotStore` remote contract) and reuses
the grid foundation for state persistence and shared UI primitives.

| Feature                                                | Reference | OGE     | Notes                                                                                                                      |
| ------------------------------------------------------ | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| Four areas (row/column/data/filter) + field panel      | Yes       | Done    | `<oge-pivot-field>` directives; drag chips between areas                                                                   |
| Expand/collapse on both axes                           | Yes       | Done    | expanded group keeps its own line carrying the subtotals                                                                   |
| Summary types (sum/count/avg/min/max/custom)           | Yes       | Done    | `calculateCustomSummary` reducers travel out-of-band                                                                       |
| Date/number group intervals                            | Yes       | Done    | year/quarter/month/day/dayOfWeek + numeric bucket size                                                                     |
| Display modes (percent-of, running totals, variations) | Yes       | Done    | post-processing over the materialized matrix; UI via measure chip menu                                                     |
| Sorting (labels, `sortBySummary` on the opposite axis) | Yes       | Done    | header context menu; nulls always last                                                                                     |
| Field filters (include/exclude, search)                | Yes       | Done    | distinct-value popup, capped at 1000, locale-folded search                                                                 |
| Field chooser dialog                                   | Yes       | Done    | search + 4 zones; `applyChangesMode: instantly/onDemand`                                                                   |
| Totals visibility settings                             | Yes       | Done    | row/column sub + grand totals independently                                                                                |
| Drill-down (raw rows behind a cell)                    | Yes       | Done    | `drillDown({ rowPath, columnPath })`; timezone-safe date range filters                                                     |
| Two-axis virtual scrolling                             | Yes       | Done    | fixed-track windows on rows _and_ columns; 20k-row DOM budget spec                                                         |
| Remote/custom store                                    | Yes       | Done    | serializable `PivotLoadOptions`/`PivotLoadResult`; `LocalPivotStore` reference impl; abortable loads                       |
| State persistence                                      | Yes       | Done    | `stateKey` via shared `OGE_STATE_STORAGE`; `state()`/`applyState()`/`stateChange`                                          |
| Export CSV / Excel                                     | Yes       | Done    | `getCsv()`/`exportCsv()` in the package; lazy `@oge-ui/pivot/export-excel` with merged multi-level headers and typed cells |
| `customizeCell` appearance hook                        | Yes       | Done    | mutable `{ text, cssClass }` per cell                                                                                      |
| Keyboard navigation + i18n                             | partial   | Done    | arrow/Home/End over the matrix, Enter/Space toggles headers; full `OgePivotMessages` token                                 |
| Field panel collapse + header context menus            | Yes       | Done    | sort, filter, remove, expand/collapse all, chooser                                                                         |
| Pivot chart binding                                    | Yes       | Missing | needs a charting package first                                                                                             |

**Phase 16 — Pivot Grid — shipped** (P0 engine → P5 export/persistence; docs overview + analytics pages, e2e smoke).

**Phase 17 — Methods & events API parity (grid + tree-list) — shipped** (imperative editing/selection/data/navigation/loading/paging methods; `selectionChanged`/`focusedRowChanged`, editing lifecycle events, `exporting`, `dataErrorOccurred`, `cellDblClick`; dev-app API reference pages via the shared `ApiReference` component).

**Phase 18 — Editor & popup unification (grid + tree-list) — shipped.**
Editors: one `OgeCellEditor` component (exported from `@oge-ui/grid`) replaced
the six duplicated cell/form/popup editor blocks — lookup → `oge-select-box`,
boolean → `oge-check-box`, number → `oge-number-box`, text → `oge-text-box`
(compact `size=sm` shape); date stays native until the DateBox wave. Filter
row + filter builder value editors migrated to the same components; select-all
/ header-filter tri-state / column chooser checkboxes → `oge-check-box`.
Popups: header filter, column chooser, operator menu and row/header context
menus now run on `@oge-ui/overlay` (`OgeAnchoredPanel` + `oge-popup` +
`oge-menu-list`) — flip/clamp/scroll-reposition, ARIA menu keyboard,
panel-stack Escape and outside-pointerdown dismissal replace the hand-rolled
fixed positioning and `document:click` listeners. **Breaking (pre-1.0):** the
grid's legacy `OgeMenuItem {text, disabled?, action?}` is replaced by the
canonical `@oge-ui/overlay` type (a superset — existing handlers compile
unchanged); grid re-exports it. The pivot keeps its inline popups (commercial
package, out of scope) with locally restored styles.

## Date editors (`@oge-ui/inputs`) — Feature Parity

`OgeCalendar` + `OgeDateBox` (reference Calendar/DateBox scope) on native
`Date` + `Intl` only — no date library, no `DateAdapter`. Pure day math lives
in `@oge-ui/core` (`date-utils.ts`: `startOfDay`/`addDays`/`monthMatrix`/
`weekNumber`/`serializeLikeOriginal`/`toLocalDate` — all local construction,
never `Date.parse`).

| Feature                                           | Reference | OGE     | Notes                                                                     |
| ------------------------------------------------- | --------- | ------- | ------------------------------------------------------------------------- |
| Calendar month/year/decade zoom                   | Yes       | Done    | `'century'` deliberately dropped; `zoomLevel` two-way + min/max bounds    |
| Calendar selection single/multiple/range          | Yes       | Done    | range with hover preview; `viewsCount: 2` two-month layout                |
| DateRangeBox (start–end on one field)             | Yes       | Done    | `[start, end]` tuple, two parsed inputs, two-view range popup             |
| Time picker views (`timeView: list \| columns`)   | partial   | Done    | interval list or hour+minute columns; dx rollers not replicated           |
| Autocomplete search highlight (`searchHighlight`) | Yes       | Done    | matched substring marked in suggestions                                   |
| min/max, `disabledDates` (array/fn)               | Yes       | Done    | day-granular; today button disabled when gated                            |
| `firstDayOfWeek` (locale default), week numbers   | Yes       | Done    | Intl weekInfo fallback; `firstDay/firstFourDays/fullWeek` rules           |
| Cell template + `focusedDate` controlled nav      | Yes       | Done    | typed `[ogeCalendarCellTemplate]`; Kendo-style `focusedDate` model        |
| APG date-grid keyboard (roving DOM focus)         | partial   | Done    | ±1/±7 days, PgUp/PgDn ±month, Shift ±year, Home/End; `aria-current`       |
| DateBox `type` date/time/datetime                 | Yes       | Done    | picker = calendar and/or interval time list; no dx `pickerType`           |
| Intl-only `displayFormat` + locale-aware parsing  | Yes       | Done    | part order from `formatToParts` (dd/mm vs mm/dd), month names, 2-digit yr |
| Invalid/out-of-range typing                       | Yes       | Done    | invalid while typing, blur reverts — never clamps, never a wrong date     |
| `applyValueMode` instantly/useButtons             | Yes       | Done    | OK/Cancel footer drafts picker changes                                    |
| `dateSerializationFormat`                         | Yes       | —       | deliberate: the value is always a local `Date`; serialization is app-side |
| `useMaskBehavior`                                 | Yes       | Missing | deferred to the input-masking wave                                        |
| Grid/tree-list date editors + filter row          | —         | Done    | `OgeCellEditor` date branch; timezone-safe day-range filter expressions   |
| Time-list virtualization                          | —         | Backlog | plain scroll list in v1 (48 rows at the default 30-min interval)          |

**Phase 19 — Date editors — shipped** (core date-utils; `OgeCalendar`;
`OgeDateBox` incl. time/datetime + useButtons; grid/tree-list `dataType:
'date'` editors and the `dateFilterExpr` day-range filter; rows keep their
storage shape via `serializeLikeOriginal`).

**Next:** time-list virtualization ·
`Intl.DateTimeFormatOptions` column display formats · input
masking wave (incl. `useMaskBehavior`) · pivot chart binding · parity backlog:
grid group/detail toggle events, `focusedCellChanged`, imperative column
chooser open, `getTotalSummaryValue`, pivot `exporting` pre-event +
customizable pivot context menus.

**Internal debt:** consolidate the per-spec `settle()` test helpers (78
copies, six diverging bodies) into one shared helper per package · give
`oge-modal` a decorator host class like every other component · align the
pivot config on the `provideOge<X>Config()` idiom · stop shipping `src/` in
the `@oge-ui/core` tarball.

## Buttons (`@oge-ui/buttons`) — Feature Parity

`OgeButton` + `OgeButtonGroup` + `OgeDropDownButton` (reference
button/button-group/drop-down-button scope, adapted to the signal-based house
API). The drop-down builds on the new `@oge-ui/overlay` package
(`resolvePopupPosition` flip/clamp math, `OgeAnchoredPanel` behavior model,
`oge-popup` chrome, `oge-menu-list` with the canonical `OgeMenuItem`) — the
grid's inline popups migrate to it in a future wave.

| Feature                                               | Reference | OGE     | Notes                                                                        |
| ----------------------------------------------------- | --------- | ------- | ---------------------------------------------------------------------------- |
| text / icon / iconPosition                            | Yes       | Done    | icons via `[ogeButtonIcon]` SVG projection (no icon font)                    |
| type/severity + stylingMode (contained/outlined/text) | Yes       | Done    | `severity: normal/accent/success/warning/danger`, token-driven               |
| sizes                                                 | No        | Done    | `size: sm/md/lg` (house addition)                                            |
| disabled / hint / tabIndex / accessKey                | Yes       | Done    |                                                                              |
| useSubmitBehavior                                     | Yes       | Done    | renders `type="submit"`                                                      |
| focus/hover/active state flags                        | Yes       | Skipped | CSS pseudo-classes always on (simpler, documented)                           |
| rtlEnabled                                            | Yes       | Done    | logical properties; follows `dir`, no input needed                           |
| onClick                                               | Yes       | Done    | `(clicked)` output (guarded pipeline); native `(click)` documented as bypass |
| **Async action + auto loading (single-flight)**       | No        | Done    | OGE extra: `[action]`, `[(loading)]`, `actionDone`/`actionFailed`            |
| **Click guard (throttle/debounce)**                   | No        | Done    | OGE extra: `clickGuard: true / { mode, ms }`                                 |
| **Badge / dot indicator**                             | No        | Done    | OGE extra: `badge: number/string/true`, 99+ capping, a11y-aware              |
| **Hold-to-confirm**                                   | No        | Done    | OGE extra: CSS-only progress bar, Escape/pointer-cancel abort, keyboard hold |
| **Auto-repeat (stepper)**                             | No        | Done    | OGE extra: delay + interval, disabled-flip stop                              |
| ButtonGroup items + declarative children              | Yes       | Done    | both; items render after projected children                                  |
| ButtonGroup selectionMode + selectedKeys              | Yes       | Done    | `none/single/multiple`, two-way model, added/removed diffs                   |
| ButtonGroup keyboard nav + ARIA                       | partial   | Done    | roving tabindex, arrow/Home/End, radiogroup/toolbar/group roles, RTL-aware   |
| DropDownButton (items / async items / placement)      | Yes       | Done    | `items` array or lazy fn (loading/error/empty rows, cache, runId race guard) |
| SplitButton                                           | Yes       | Done    | `splitButton` input: main action + chevron toggle, segmented styling         |
| **rememberLastAction (split)**                        | No        | Done    | OGE extra: last item becomes the main label+action (IDE Run-button pattern)  |
| Menu keyboard: arrows/Home/End + **type-ahead**       | partial   | Done    | WAI-ARIA menu-button, `aria-activedescendant`, focus restore, Tab handling   |
| Custom panel content                                  | Yes       | Done    | `*ogeDropDownContent` template with `$implicit` close fn                     |
| Overlay: flip/clamp + scroll reposition               | No        | Done    | `@oge-ui/overlay`; grid popups migrate later                                 |

## Inputs (`@oge-ui/inputs`) — Feature Parity

`OgeTextBox` + `OgeTextArea` + `OgeNumberBox` on one shared field chrome
(reference TextBox/TextArea/NumberBox scope, Angular-native API). First
package implementing the Signal Forms `FormValueControl` contract and the
repo's CVA house pattern. Input masking is deferred to a later wave.

| Feature                                            | Reference | OGE     | Notes                                                                                                                            |
| -------------------------------------------------- | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| mode/type (text/email/password/search/tel/url)     | Yes       | Done    | native `type` + first-class inputmode/enterkeyhint/autocomplete                                                                  |
| label + labelMode (static/floating/hidden/outside) | Yes       | Done    | floating label with placeholder suppression                                                                                      |
| stylingMode (outlined/filled/underlined)           | Yes       | Done    | token-driven, all three themes                                                                                                   |
| sizes                                              | No        | Done    | `sm/md/lg` = 28/34/42px (button parity)                                                                                          |
| showClearButton / placeholder / maxLength          | Yes       | Done    | clear keeps focus (mousedown prevented), tabindex -1                                                                             |
| buttons (custom editor buttons)                    | Yes       | Done    | replaced with `[ogeInputPrefix]`/`[ogeInputSuffix]` projection + fixed rail                                                      |
| hint / validation display                          | Yes       | Done    | subscript with `subscriptSizing: fixed/dynamic/none`, aria-live, describedby                                                     |
| isValid/validationError inputs                     | Yes       | Done    | `invalid` + `errorText` (grid-editor parity), `errorDisplay` policy                                                              |
| **Signal Forms (FormValueControl)**                | No        | Done    | `[formField]` auto-binds errors/touched/disabled/min/max/…                                                                       |
| Reactive/template forms (CVA)                      | Yes       | Done    | constructor-assignment pattern, `control.events` state bridge                                                                    |
| valueChangeEvent/debounce                          | Yes       | Done    | `debounce` ms + raw `inputChange` stream; blur/Enter flush                                                                       |
| **Grapheme-accurate counter (soft limit)**         | No        | Done    | OGE extra: Intl.Segmenter, emoji family = 1; `counterMode: limit/soft`                                                           |
| **Password reveal + copy button**                  | No        | Done    | OGE extra: in-place type flip (caret kept), clipboard + live-region                                                              |
| **Async pending indicator + success icon**         | No        | Done    | OGE extra: rail spinner via `pending`, `showSuccessIcon`                                                                         |
| TextArea autoResize (minRows/maxRows)              | Yes       | Done    | CSS `field-sizing: content` + measurement fallback                                                                               |
| NumberBox null-empty / min/max/step / spin         | Yes       | Done    | `number \| null`, clamp-on-commit, hold-to-repeat + Arrow keys                                                                   |
| NumberBox format                                   | Yes       | Done    | `Intl.NumberFormatOptions` display-on-blur, locale-aware parse                                                                   |
| onValueChanged parity (previousValue + event)      | Yes       | Done    | `valueCommitted { value, previousValue, event? }`; `event === undefined` = programmatic                                          |
| reset() / imperative parity                        | Yes       | Done    | input `reset(value?)`, group `focus()`, drop-down `open/close/toggle()` + `selectionChanged`, group `itemClick { item?, index }` |
| mask                                               | Yes       | Missing | deferred — external mask libraries attach to the native input; adapter wave later                                                |
| Grid editor migration to `<oge-text-box>`          | —         | Planned | `size=sm + labelMode=hidden + subscriptSizing=none` is the compact shape                                                         |

## Toggle controls (`@oge-ui/inputs`) — Feature Parity

`OgeCheckBox` + `OgeSwitch` + `OgeRadioGroup` (reference
CheckBox/Switch/RadioGroup scope). First bare (chrome-free) controls, built on
the new `OgeControlBase` — the chrome-free slice extracted from
`OgeInputBase` (commit pipeline, CVA constructor-assignment, Signal Forms
`FormValueControl`). The tag box checkbox glyph moved to a shared
`_selection-glyph.scss` partial both consume.

| Feature                                         | Reference | OGE     | Notes                                                                   |
| ----------------------------------------------- | --------- | ------- | ----------------------------------------------------------------------- |
| CheckBox two-state + `text`/content label       | Yes       | Done    | visually-hidden native input — label/Space/`aria-checked=mixed` free    |
| CheckBox three-state (`value: boolean \| null`) | Yes       | Done    | `threeState` gates the user cycle; `null` always renders indeterminate  |
| Switch on/off + `switchedOnText/OffText`        | Yes       | Done    | `onText`/`offText` → localized `switchOn`/`switchOff` messages fallback |
| Switch swipe gesture                            | Yes       | Skipped | deliberate — click/Space/Enter only                                     |
| RadioGroup items + `valueExpr`/`displayExpr`    | Yes       | Done    | select box expression vocabulary, `disabledExpr` included               |
| RadioGroup `layout` vertical/horizontal         | Yes       | Done    |                                                                         |
| RadioGroup `itemTemplate`                       | Yes       | Done    | typed `OgeSelectItemTemplateContext`                                    |
| APG radiogroup keyboard (roving tabindex, wrap) | partial   | Done    | arrows move focus **and** selection, disabled skipped, RTL-aware        |
| Sizes (`sm/md/lg`)                              | No        | Done    | house addition, button scale                                            |
| Forms (CVA + Signal Forms + `[(value)]`)        | partial   | Done    | shared `OgeControlBase`; `valueCommitted` with `previousValue`          |
| jQuery option machinery / state-flag inputs     | Yes       | —       | deliberate (signals, CSS pseudo-classes)                                |

## Select family (`@oge-ui/inputs`) — Plan

Research baseline: DevExtreme SelectBox/TagBox/Autocomplete, Kendo
ComboBox/DropDownList/MultiSelect, PrimeNG Select, ng-select, MatSelect and
the WAI-ARIA APG combobox pattern. Design decisions that came out of it:

- **Lives in `@oge-ui/inputs`** on the shared field chrome (`OgeInputBase`,
  `OGE_INPUT_HOST`), popup from `@oge-ui/overlay` (`OgeAnchoredPanel` +
  `oge-popup`, `width: 'anchor'`, anchored on `.oge-input-container` so the
  panel ignores label/subscript). `oge-menu-list` is **not** reused — its
  `role="menu"` and container-focus model conflict with the combobox pattern;
  the select renders its own `role="listbox"` options.
- **DevExtreme vocabulary** (`displayExpr`/`valueExpr`, `searchEnabled`,
  `acceptCustomValue`, `noDataText`) — string **or function** expressions.
- **a11y = APG combobox with `aria-activedescendant`** (DOM focus never
  leaves the input; the active option is referenced by id and scrolled into
  view manually). Select-only variant gets printable type-ahead.
- **Search architecture**: client-side filter built in; `searchChanged`
  output + `loading` input as the server-side escape hatch (Kendo/ng-select
  model) instead of a DataSource abstraction.
- **Known pitfall handled in the design**: the selected value's item may not
  be in the filtered/current list — `selectedItem` is derived from the full
  item set, never the filtered one; uncommitted search text reverts to the
  selected display text on blur.

### Phase S1 — `OgeSelectBox` core — **shipped**

| Feature                                             | Reference         | OGE  | Notes                                                                 |
| --------------------------------------------------- | ----------------- | ---- | --------------------------------------------------------------------- |
| items + displayExpr/valueExpr (string or fn)        | Yes               | Done | `valueExpr` omitted → whole item is the value                         |
| value model + selectedItem/displayText (read-only)  | Yes               | Done | `[(value)]`, CVA + Signal Forms via `OgeInputBase`                    |
| searchEnabled + searchMode (contains/startswith)    | Yes               | Done | client-side; `searchExpr` string/array/fn; `minSearchLength`          |
| opened model + open/close/toggle methods            | Yes               | Done | `[(opened)]`; popup deferred behind `@if` (deferRendering semantics)  |
| Chevron drop-down button in the field rail          | Yes               | Done | new `OgeInputDropDownApi` feature block in the chrome                 |
| showClearButton / placeholder / labelModes / sizes  | Yes               | Done | inherited chrome                                                      |
| Keyboard: APG combobox                              | partial           | Done | arrows, Alt+arrows, Enter/Esc/Tab, Home/End (select-only), PgUp/PgDn  |
| Type-ahead when not searchable                      | Yes               | Done | printable chars jump to match, repeated char cycles                   |
| Item disabled expression                            | No (ref: partial) | Done | `disabledExpr` — Kendo/PrimeNG have it, DevExtreme struggles          |
| itemTemplate (TemplateRef input)                    | Yes               | Done | same shape as `OgeDropDownButton.itemTemplate`                        |
| noDataText via messages i18n                        | Yes               | Done | `OgeInputsMessages.noDataText` + chevron aria label                   |
| Events: selectionChanged/itemClick/dropDownOpened/… | Yes               | Done | + inherited `valueCommitted` (with `previousValue`), `cleared`, focus |
| searchChanged output + loading input                | No                | Done | server-side filtering escape hatch (house addition)                   |

### Phase S2 — combobox extras — **shipped**

Done: `acceptCustomValue` + `customItemCreating` (mutable payload; sync/async
item or `null` to reject; exact display match selects the existing item; the
custom item is cached so `selectedItem`/display resolve even though it is not
in `items`), `groupBy` string/fn for flat data (headers + first-seen-group
reorder), lazy `items` function with loading/error rows and a runId race
guard, `searchTimeout` debounce (config default 250ms; typed text is never
debounced), `showDataBeforeSearch` + real `minSearchLength` semantics,
`wrapItemText`, `useItemTextAsTitle`, `dropdownMaxHeight`.

Deliberately not copied from DevExtreme: `dropDownOptions` kitchen sink
(typed `dropdownPlacement/Width/MaxHeight` instead), deprecated
`fieldTemplate` (prefix/suffix slots), `deferRendering` (always deferred),
`valueChangeEvent` (fixed Enter/blur), state-flag inputs (CSS pseudo-classes),
`elementAttr`/`height`/`width` (host bindings), `rtlEnabled` (logical
properties). Moved to S3: preventable `opening`/`closing` pre-events,
`groupTemplate`, `fieldAddons`.

### Phase S3 — `OgeTagBox` (multi-select) — **shipped (core)**

Shipped: `value: T[]`, removable chips + `maxDisplayedTags` overflow chip,
`showSelectionControls` checkboxes, `hideSelectedItems`, add/remove delta
events, Backspace-removes-last, `aria-multiselectable` listbox, `imageExpr`.
Remaining backlog: `tagTemplate`, `multiline`, `selectAllMode`,
`applyValueMode` (`'instantly' | 'useButtons'`).

### Phase S4 — `OgeAutocomplete` + virtualization — **shipped**

Shipped: text-valued model (`value: string`), `maxItemCount` (10),
`minSearchLength` (1, typing below closes the list), no chevron by default,
`openOnFieldClick: false`, `forceSelection` (house addition, PrimeNG-style
blur revert), exact-match canonicalization, `selectionChanged`/`selectedItem`,
lazy items + `searchChanged`/`loading` escape hatch, `groupBy`/`itemTemplate`.

Shipped alongside: the duplicated select-box/tag-box list logic extracted into
an internal `SelectListEngine` + `SelectPanelController`
(`packages/inputs/src/lib/select-list/`), and **fixed-item-height virtual
scrolling** (`virtualScroll: boolean | { itemHeight, overscan }`, Kendo
contract) on SelectBox, TagBox and Autocomplete — built on core's
`OffsetTree`/`computeWindow`, absolute `aria-posinset`/`aria-setsize`, exported
`OGE_SELECT_OPTION_HEIGHT` size map. Constraint: `virtualScroll` ignores
`groupBy`/`wrapItemText` (fixed row heights; dev-mode warning).

### Tree Select (`oge-tree-select`)

The hierarchical member of the family, against dxDropDownBox+dxTreeView, Kendo
`kendo-dropdowntree` and PrimeNG `TreeSelect`. It is the field chrome of
`oge-select-box` with a full `oge-tree-view` as the popup, so it inherits both
sides wholesale rather than reimplementing either. That is also why the package
edge points `inputs → navigation`: the editor infrastructure (`OgeInputBase`,
the CVA/Signal-Forms contract, the field chrome) only exists in `inputs`, the
same direction Kendo's dropdowns package takes to its treeview.

| Feature                                                        | Reference | OGE     | Notes                                                                                                                                                                              |
| -------------------------------------------------------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single-node picking with a key value                           | Yes       | Done    | `[(value)]` is the node key; the field shows its `displayExpr` label                                                                                                               |
| Multiple selection (Kendo `checkboxes`, Prime `selectionMode`) | Yes       | Done    | `selectionMode="multiple"` makes `value` an array and keeps the popup open                                                                                                         |
| Tri-state cascade checkboxes                                   | Yes       | Done    | `showCheckBoxes` + `selectNodesRecursive`, straight from the tree                                                                                                                  |
| Value projection                                               | No        | Done    | OGE extra: `selectedKeysMode: 'all' \| 'leavesOnly' \| 'excludeRecursive'` — store the leaves rather than the cascade                                                              |
| Flat **and** nested data                                       | partial   | Done    | every accessor forwarded to the tree; `itemsExpr` switches shape                                                                                                                   |
| In-popup search (Kendo `filterable`, Prime `filter`)           | Yes       | Done    | `searchEnabled` + `searchMode`/`filterMode`                                                                                                                                        |
| Lazy load on demand                                            | Yes       | Done    | `loadChildren` with a placeholder row                                                                                                                                              |
| Virtual scrolling in the popup (Prime)                         | Yes       | Done    | `virtualScroll`                                                                                                                                                                    |
| Closed-field rendering (Prime `display: 'comma' \| 'chip'`)    | Yes       | partial | `displayMode: 'text' \| 'count'`; chips are `oge-tag-box`'s job — a chip-rendering mode is backlog                                                                                 |
| WAI-ARIA combobox semantics                                    | Yes       | Done    | `role="combobox"` + `aria-haspopup="tree"`, `aria-expanded`, and `aria-controls` pointing at the tree element (not the panel) via the tree's `treeId`                              |
| Focus model                                                    | partial   | Done    | opening moves real DOM focus into the tree, so its APG keyboard map stays intact — the combobox pattern's other sanctioned option, unlike the select box's `aria-activedescendant` |
| Field chrome: label modes, validation, clear, forms            | Yes       | Done    | inherited from `OgeInputBase` — CVA, Signal Forms `FormValueControl`, `showClearButton`, subscript                                                                                 |
| `expandEvent` default                                          | No        | Done    | defaults to `dblclick` here, not the tree's `click`: in a picker a single click should choose, and the chevron expands either way                                                  |

## Overlay Modal (`@oge-ui/overlay`) — Feature Parity

Research baseline: DevExtreme dx-popup, PrimeNG p-dialog, Angular Material
MatDialog (CDK a11y), Kendo Dialog/Window and the headless Radix/shadcn
composition pattern. `OgeModal` is the centered dialog primitive: `div` +
`role="dialog"` (deliberately **not** native `<dialog>.showModal()` — its
top-layer would paint above the library's `position: fixed` select/date
popups inside the modal form). Shipped alongside: the anchored-panel Escape
stack extracted into a shared `overlay-stack.ts` (popup inside modal closes
first), plus standalone `focus-trap.ts` and ref-counted `scroll-lock.ts`
utilities, and the overlay config's first `messages` block (`modalClose`).
The grid and tree-list edit-popup + filter-builder dialogs now run on
`oge-modal` (focus trap and Escape stack for free); the pivot keeps its
inline dialogs (commercial tier) and the legacy `.oge-edit-popup` CSS in
`_structure.scss` stays until the pivot migrates.

| Feature                                 | Reference | OGE     | Notes                                                                                                                                        |
| --------------------------------------- | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Modal backdrop (shading)                | Yes       | Done    | `--oge-modal-backdrop-bg` token; layer doubles as backdrop                                                                                   |
| Declarative open + two-way binding      | Yes       | Done    | `[(opened)]` + `open()/close()/toggle()`; content lazy behind `@if`                                                                          |
| Title bar + close button                | Yes       | Done    | `title` / `showCloseButton`; ✕ aria label from overlay messages                                                                              |
| Header/footer templating                | Yes       | Done    | `*ogeModalTitle` / `*ogeModalFooter` slots (`$implicit` = close fn)                                                                          |
| Custom title-bar actions (toolbarItems) | Yes       | Done    | `*ogeModalHeaderActions` slot between title and maximize/✕ (config API rejected)                                                             |
| Close on Escape (topmost-only)          | Yes       | Done    | shared overlay stack; `closeOnEscape`                                                                                                        |
| Close on backdrop click                 | Yes       | Done    | pointerdown-origin check — select-drag released outside never closes                                                                         |
| Focus trap                              | Yes       | Done    | keydown-computed tabbables (no sentinels); zero-tabbable → panel                                                                             |
| Initial-focus modes                     | partial   | Done    | `autoFocus: 'first-tabbable' \| 'panel' \| selector`; `[autofocus]` wins                                                                     |
| Restore focus on close                  | Yes       | Done    | orphaned-focus guarded — never steals a moved focus                                                                                          |
| Scroll lock                             | Yes       | Done    | ref-counted body lock + scrollbar-width compensation; `scrollLock`                                                                           |
| width/height + min/max variants         | Yes       | Done    | `number \| string`; default `min(560px, 100%)`                                                                                               |
| Cancelable closing pre-event            | partial   | Done    | `closing` with mutable `cancel` + reason                                                                                                     |
| **Async close guard (single-flight)**   | No        | Done    | OGE extra: `closeGuard: () => boolean \| Promise<boolean>`, `closePending` signal                                                            |
| **Typed close result (declarative)**    | No        | Done    | OGE extra: `OgeModal<R>`, `close(result)` → `closed.result`                                                                                  |
| **Built-in busy state**                 | No        | Done    | OGE extra: spinner veil + `aria-busy`; user closes blocked, `close()` allowed                                                                |
| `opening` pre-event                     | Yes       | Done    | cancelable `opening { cancel }` on every open path                                                                                           |
| fullScreen / maximizable                | Yes       | Done    | `[(fullScreen)]` + `showMaximizeButton` title-bar toggle (dx has no button)                                                                  |
| Shading off (transparent backdrop)      | Yes       | Done    | `shading: false` — visual only, stays modal; color via `--oge-modal-backdrop-bg`                                                             |
| dragEnabled / resizeEnabled             | Yes       | Done    | header drag (viewport clamp, `dragOutsideBoundary`, `restorePosition`) + bottom-end handle (`resizeStarted`/`resized`); pointer-only, opt-in |
| position (non-centered)                 | Yes       | partial | `placement: 'center' \| 'top'`; full my/at/of config stays anchored-panel work                                                               |
| container / appendTo / portal           | Yes       | Done    | declarative stays inline (theming + stacking); `OgeModalService` body-appends                                                                |
| Animation config                        | Yes       | partial | no config API (deliberate); duration/curve via `--oge-modal-transition` CSS var                                                              |
| Service-based dynamic open              | Yes       | Done    | `OgeModalService.open(component\|template, config)`, `OGE_MODAL_DATA`, `OgeModalRef.closed` promise                                          |
| Background `inert`/`aria-hidden`        | partial   | Done    | opt-in `inertBackground` — inerts siblings of every layer ancestor, restore-safe                                                             |

## Overlay Toast (`@oge-ui/overlay`) — Feature Parity

Research baseline: DevExtreme dxToast + `ui.notify()`, PrimeNG p-toast +
MessageService, Angular Material MatSnackBar, ngx-toastr and sonner /
react-hot-toast. `OgeToastService` is the suite's first service-first
surface: one lazily-created, body-appended host renders a fixed region per
used position plus two permanently-mounted hidden live-region announcers
(error asserts, the rest are polite — visual toasts carry no `aria-live`, so
`promise()` morphs never double-announce). Toasts never take focus and never
join the Escape stack. JS owns timer truth (per-toast timeout + remaining-time
bookkeeping, ref-counted pause causes); the progress bar is a JS-driven
`scaleX` transition reading the same remaining value — provably in sync.

| Feature                                            | Reference | OGE     | Notes                                                                                                  |
| -------------------------------------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------ |
| Imperative show + severity sugar                   | Yes       | Done    | `show(message \| options)`, `success/info/warning/error()`                                             |
| type/severity + message + title                    | Yes       | Done    | `severity` union; PrimeNG summary/detail model via `title`                                             |
| displayTime / life / duration                      | Yes       | Done    | `displayTime`; config `toastDisplayTime: 4000`                                                         |
| sticky / disableTimeOut                            | Yes       | Done    | `sticky`; `loading` toasts implicitly sticky                                                           |
| closable / closeButton                             | Yes       | Done    | default `true`; label from `messages.toastClose`                                                       |
| Stack positions (notify stack / PrimeNG)           | Yes       | Done    | 6 logical positions `top/bottom × start/center/end`, RTL-aware; dx `{x,y}` and center rejected         |
| notify stack.direction (8 variants)                | Yes       | covered | flex order per region: newest nearest edge; push falls out of flow + collapse                          |
| newestOnTop                                        | Yes       | covered | fixed convention; DOM stays chronological (SR/Tab order) — knob rejected                               |
| maxOpened + queue                                  | Yes       | Done    | `toastMaxVisible: 5`/position, lossless FIFO promotion (drop-oldest rejected)                          |
| closeOnClick / tapToDismiss                        | Yes       | Done    | `closeOnClick` → reason `'click'`; button presses excluded                                             |
| closeOnSwipe                                       | Yes       | Backlog | pointer-drag dismissal deferred                                                                        |
| contentTemplate / headless                         | Yes       | Done    | `template` (`$implicit` = close fn, `data` in context)                                                 |
| openFromComponent (Mat)                            | Yes       | Skipped | template covers custom content; heavy interaction belongs in `OgeModalService`                         |
| hideOnOutsideClick / hideOnParentScroll            | Yes       | Skipped | non-modal surface must not react to outside interaction                                                |
| shading / shadingColor                             | Yes       | Skipped | a toast with a backdrop is a modal                                                                     |
| animation config                                   | Yes       | covered | fixed house CSS; duration via `--oge-toast-transition` var                                             |
| width/height/min/max props                         | Yes       | covered | `--oge-toast-width` token + `cssClass`                                                                 |
| wrapperAttr / toastClass / panelClass              | Yes       | Done    | `cssClass`                                                                                             |
| data passthrough (Mat/PrimeNG)                     | Yes       | Done    | `data?: D` generic — template context + action event                                                   |
| politeness / announcementMessage (Mat)             | Yes       | Done    | `announce: 'polite' \| 'assertive' \| 'off'`; default derives from severity                            |
| Pause on hover (WCAG 2.2.1)                        | Yes       | Done    | hover **and** focus-within; ref-counted causes                                                         |
| extendedTimeOut (ngx-toastr)                       | Yes       | covered | resume with remaining time — never less than promised                                                  |
| progressBar (+ direction)                          | Yes       | Done    | `progressBar`/`toastProgressBar`; `'increasing'` rejected (remaining-time metaphor)                    |
| preventDuplicates / countDuplicates / resetTimeout | Yes       | Done    | coalescing with ×N badge (`coalesce`/`toastCoalesceDuplicates`), timer restart, same ref; title in key |
| onShown/onHiding/onTap/onDismiss/onAutoClose       | Yes       | covered | `ref.closed` promise with 6-value typed reason                                                         |
| clear / dismissAll                                 | Yes       | Done    | `clear(position?)`, reason `'clear'`                                                                   |
| Action button + reason'd close (Mat/sonner)        | Yes       | Done    | `action: { text, handler }` → reason `'action'` (undo pattern)                                         |
| sonner cancel second button                        | No        | Skipped | ✕ button covers dismissal                                                                              |
| custom icon (sonner icons / PrimeNG Message.icon)  | Yes       | Done    | `icon: TemplateRef` replaces the severity icon (`loading` spinner still wins)                          |
| announcementMessage (MatSnackBar)                  | Yes       | Done    | `announceText` — SR text decoupled from the visual text                                                |
| offset / gap (sonner)                              | No        | Done    | `--oge-toast-offset` / `--oge-toast-gap` CSS vars (16px / 8px defaults)                                |
| enableHtml (ngx-toastr)                            | Yes       | Skipped | XSS foot-gun; `template` covers rich content                                                           |
| richColors (sonner)                                | No        | Skipped | themes own color                                                                                       |
| Stacked/expanded deck (PrimeNG mode + sonner)      | Yes       | Backlog | now in two major libs — collapsed-deck view, expands on hover; v1.1 candidate                          |
| PrimeNG secondary/contrast severities              | Yes       | Skipped | PrimeNG-theme-specific; severity palette + `cssClass` cover                                            |
| PrimeNG key (multi-outlet) / auto-baseZIndex       | Yes       | covered | `position` + `clear(position)`; `--oge-z-toast` token                                                  |
| dx widget-base props (accessKey/tabIndex/hint/…)   | Yes       | Skipped | toasts never take focus by design; RTL via logical properties                                          |
| **promise() with in-place morph**                  | No        | Done    | unique in Angular: `promise(p, {loading, success, error})`, fn forms return patches                    |
| **ref.update(patch) live morph**                   | No        | Done    | OGE extra: message/severity/timing patch; powers `promise()`                                           |
| **Pause on tab hidden**                            | No        | Done    | unique vs Angular libs: `visibilitychange` pauses/resumes all timers                                   |
| **Coalesce ×N count badge**                        | No        | Done    | duplicate merge shows a live counter, not just suppression                                             |
| Focus hotkey (F6-style)                            | No        | Backlog | regions sit at body end (last Tab stops); action toasts should be `sticky`                             |

## Tabs (`@oge-ui/tabs`) — Feature Parity

`OgeTabs` (stand-alone strip) + `OgeTabPanel` (strip + content) + `OgeTab`
(declarative child) against dxTabs/dxTabPanel, MatTabs, PrimeNG Tabs (v18+ and
legacy TabView), Kendo TabStrip and the WAI-ARIA APG tabs pattern, adapted to
the signal-based house API. The overflow menu builds on `@oge-ui/overlay`
(`OgeAnchoredPanel` + `oge-menu-list`). jQuery-era lifecycle events
(`onInitialized`/`onOptionChanged`/`onContentReady`/`onItemRendered`/
`onTitleRendered`) are intentionally not replicated. Model writes
(`selectedIndex`/`selectedKey`) are programmatic and bypass the cancelable
pipeline — mirrors the modal's `opened` model semantics.

| Feature                                                              | Reference | OGE     | Notes                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| items array (dx items / Kendo-Prime dynamic)                         | Yes       | Done    | `OgeTabItem[]`: `key/text/badge/hint/disabled/visible/closable/dirty/closeGuard`                                                                                                                                                                                                           |
| Declarative children (MatTab / kendo-tabstrip-tab)                   | Yes       | Done    | `<oge-tab>`; children render before `items` (ButtonGroup precedent)                                                                                                                                                                                                                        |
| selectedIndex two-way (dx / Mat)                                     | Yes       | Done    | `[(selectedIndex)]`; `-1` = none; clamped when tabs are removed                                                                                                                                                                                                                            |
| Key-based selection (PrimeNG `[(value)]`, dx selectedItemKeys)       | Yes       | Done    | `[(selectedKey)]`, reconciled with the index both ways                                                                                                                                                                                                                                     |
| selectionChanging cancelable (dx cancel / Kendo preventDefault)      | Yes       | Done    | `selectionChanging` with mutable `cancel` (sync; async veto belongs to `closeGuard`)                                                                                                                                                                                                       |
| selectionChanged payload                                             | Yes       | Done    | `index/key/previousIndex/previousKey/item/event`                                                                                                                                                                                                                                           |
| titleClick / itemClick                                               | Yes       | Done    | `tabClick` (pointer + Enter/Space)                                                                                                                                                                                                                                                         |
| deferRendering (dx) / matTabContent lazy                             | Yes       | Done    | default `true`; plain projected content = attach-on-activate, `[ogeTabContentTemplate]` = true lazy                                                                                                                                                                                        |
| keep-alive (Mat preserveContent / Kendo keepTabContent / Prime lazy) | Yes       | Done    | `keepAlive` (default `true`); `false` destroys lazy content on deactivate (Kendo `false` / Prime legacy `cache:false`)                                                                                                                                                                     |
| Closable tabs (Kendo closable / Prime legacy TabView)                | Yes       | Done    | component `closable` default + per-tab override; app removes the tab on `tabClosed` (Kendo model). The ✕ is a presentational span, never a nested focusable control inside `role="tab"` (axe `nested-interactive`); keyboard path is Delete/Backspace, advertised with `aria-keyshortcuts` |
| Guarded close (Prime legacy `controlClose` + `close()`)              | Yes       | Done    | **async per-tab `closeGuard: () => boolean \| Promise<boolean>`** — modal pipeline precedent, single-flight, rejection = veto, spinner on the ✕                                                                                                                                            |
| tabClosing cancelable                                                | partial   | Done    | sync `cancel` before the guard runs (Kendo's `tabClose` is not cancelable)                                                                                                                                                                                                                 |
| Delete-key close (APG optional / Kendo Delete+Backspace)             | Yes       | Done    | Delete & Backspace on a focused closable tab; APG focus hand-off (next, else previous)                                                                                                                                                                                                     |
| Overflow arrows (dx showNavButtons / Kendo scrollable / Mat paging)  | Yes       | Done    | `showNavButtons: 'auto' \| 'always' \| 'never'` + hidden-scrollbar strip, ResizeObserver-driven                                                                                                                                                                                            |
| Overflow all-tabs menu                                               | No        | Done    | OGE extra: `showTabListButton` → `oge-menu-list` with check on the active tab                                                                                                                                                                                                              |
| scrollByContent / swipe                                              | Yes       | Skipped | native wheel/touch scroll of the strip covers it; no drag-to-scroll machinery                                                                                                                                                                                                              |
| APG keyboard (arrows/Home/End, roving tabindex)                      | Yes       | Done    | wrap + skip disabled; RTL flips horizontal arrows; vertical maps Down/Up                                                                                                                                                                                                                   |
| Automatic vs manual activation (APG)                                 | partial   | Done    | `activation: 'automatic' \| 'manual'` (default automatic — panels are instant unless deferred; use manual for slow content)                                                                                                                                                                |
| tabsPosition (dx/Kendo top/bottom/left/right)                        | Yes       | Done    | `tabsPosition: 'top' \| 'bottom' \| 'start' \| 'end'` — logical values, RTL-safe                                                                                                                                                                                                           |
| orientation (dxTabs horizontal/vertical)                             | Yes       | Done    | `orientation` on `oge-tabs`; `aria-orientation` set when vertical                                                                                                                                                                                                                          |
| badge (dx item.badge)                                                | Yes       | Done    | `badge: string \| number` per tab/item                                                                                                                                                                                                                                                     |
| icon (dx item.icon string)                                           | Yes       | covered | no icon font by design — project SVG via `[ogeTabHeaderTemplate]`                                                                                                                                                                                                                          |
| itemTitleTemplate / kendoTabTitle / matTabLabel                      | Yes       | Done    | `[ogeTabHeaderTemplate]` — per tab or component-level for `items`; context `{item,index,selected,text}`                                                                                                                                                                                    |
| stylingMode (dx primary/secondary)                                   | Yes       | Done    | underline ink vs soft pills                                                                                                                                                                                                                                                                |
| size (Kendo small/medium/large)                                      | Yes       | Done    | `size: 'sm' \| 'md' \| 'lg'`                                                                                                                                                                                                                                                               |
| disabled (component + per tab)                                       | Yes       | Done    | disabled tabs keep `aria-disabled`, skipped by arrows & selection                                                                                                                                                                                                                          |
| hint (dx)                                                            | Yes       | Done    | native `title`                                                                                                                                                                                                                                                                             |
| visible (dx item.visible)                                            | Yes       | Done    | per tab/item                                                                                                                                                                                                                                                                               |
| noDataText                                                           | Yes       | Done    | `messages.noData` empty state (house rule: user-facing strings live in the messages interface rather than a property)                                                                                                                                                                      |
| Multi-select (dxTabs selectionMode multiple)                         | Yes       | Skipped | would break the ARIA tabs pattern (a tablist has exactly one selected tab / one visible panel); the filter-chip use case belongs to `OgeButtonGroup` `selectionMode='multiple'`                                                                                                            |
| animationEnabled (dxTabPanel) / animationDuration (Mat)              | Yes       | Done    | `panelAnimation: 'none' \| 'fade' \| 'slide'` — slide enters from the direction of travel, mirrored in RTL; duration is the `--oge-tab-panel-transition` var, suppressed under `prefers-reduced-motion`                                                                                    |
| loop / swipeEnabled (dxTabPanel)                                     | Yes       | Skipped | gesture machinery the house rejects suite-wide (same call as the switch swipe gesture); APG arrow keys already wrap                                                                                                                                                                        |
| fitInkBarToContent (Mat)                                             | Yes       | Done    | `indicatorFit: 'tab' \| 'content'` — inset by the shared `--oge-tab-pad-x`, correct in vertical strips and RTL                                                                                                                                                                             |
| stretchTabs (Mat) / tabAlignment (Kendo)                             | Yes       | Done    | `tabAlignment: 'start' \| 'center' \| 'end' \| 'justify' \| 'stretch'`                                                                                                                                                                                                                     |
| dynamicHeight (Mat)                                                  | Yes       | Done    | measured height lock + transition on the content box, `ResizeObserver` tracks async content                                                                                                                                                                                                |
| MatTabNav router variant                                             | Yes       | Done    | no extra component: bind `selectedKey` from the URL, navigate in `selectionChanged` — dev-app "Routed tabs" page proves it                                                                                                                                                                 |
| focus() method                                                       | Yes       | Done    | focuses the roving-tabindex target                                                                                                                                                                                                                                                         |
| selectTab (Kendo) / repaint etc.                                     | Yes       | covered | selection via model writes; `closeTab(indexOrKey)` and `scrollToTab(indexOrKey)` methods                                                                                                                                                                                                   |
| MAT_TABS_CONFIG-style defaults                                       | Yes       | Done    | `provideOgeTabsConfig()`; every user-facing string in `OgeTabsMessages`                                                                                                                                                                                                                    |
| **Drag & drop tab reorder**                                          | No        | Done    | OGE extra (Mat only documents a CDK recipe): `allowTabReordering`, cancelable `tabReordering`, `tabReordered`, Escape cancels, selection follows                                                                                                                                           |
| **Dirty-tab indicator**                                              | No        | Done    | OGE extra: `dirty` per tab/item — warning dot + SR announcement (`messages.dirty`)                                                                                                                                                                                                         |
| **Async close guard per tab**                                        | No        | Done    | OGE extra beyond Prime legacy's callback: promise-based, pending state, single-flight                                                                                                                                                                                                      |

## Accordion (`@oge-ui/layout`) — Feature Parity

`OgeAccordion` + declarative `OgeAccordionItem` against DevExtreme `dxAccordion`,
Angular Material `MatAccordion`/`MatExpansionPanel`, PrimeNG Accordion (v18+
`AccordionPanel`/`AccordionHeader`/`AccordionContent` and the legacy
`AccordionTab` era), Kendo `ExpansionPanel` + `PanelBar`, and the WAI-ARIA APG
accordion pattern — adapted to the signal-based house API.

Two APG findings shape the implementation. First, the pattern requires only
Enter/Space/Tab: **every header button stays in the page Tab sequence**, so
there is no roving tabindex (unlike tabs). Arrow/Home/End/type-ahead and
`Ctrl+PageUp/PageDown` ship as the opt-in `keyboardNavigation` enhancement that
Material and PrimeNG also provide. Second, an expanded panel that cannot be
collapsed is `aria-disabled`, never `disabled`. jQuery-era lifecycle events
(`onInitialized`/`onOptionChanged`/`onContentReady`/`onDisposing`) are
intentionally not replicated — Angular lifecycle, `effect()` and signals cover
them; so are the imperative `option()`/`repaint()`/`beginUpdate()` shims.

| Feature                                                                                                                    | Reference | OGE     | Notes                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------- | --------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| items array (dx `items`, PanelBar `items`)                                                                                 | Yes       | Done    | `OgeAccordionItemData[]`: `key/title/description/icon/badge/hint/disabled/visible/expanded/invalid/expandGuard/contentLoader`                                           |
| Declarative children (Mat `mat-expansion-panel`, Prime `AccordionPanel`, Kendo `PanelBarItem`)                             | Yes       | Done    | `<oge-accordion-item>`; merged with `items`, children first                                                                                                             |
| Both sources at once                                                                                                       | No        | Done    | OGE extra — same merge rule as tabs                                                                                                                                     |
| `multiple` / Mat `multi`                                                                                                   | Yes       | Done    | `multiple`                                                                                                                                                              |
| `collapsible` (dx)                                                                                                         | Yes       | Done    | `collapsible`; while off, the open header is `aria-disabled` per APG                                                                                                    |
| `selectedIndex` (dx)                                                                                                       | Yes       | Done    | two-way `model(-1)`; `-1` = none                                                                                                                                        |
| `selectedItem`/`selectedItems`/`selectedItemKeys` (dx)                                                                     | Yes       | covered | one two-way `expandedKeys` model instead of four overlapping properties                                                                                                 |
| Prime `value` model / Mat `expanded` per panel                                                                             | Yes       | Done    | `expandedKeys` (multi) + per-item `expanded` seed                                                                                                                       |
| `disabled` (all)                                                                                                           | Yes       | Done    | component-level and per panel                                                                                                                                           |
| `deferRendering` (dx)                                                                                                      | Yes       | Done    | `deferRendering`                                                                                                                                                        |
| Content cache: Prime `cache`, Kendo `keepItemContent`                                                                      | Yes       | Done    | `keepAlive`                                                                                                                                                             |
| `animationDuration` (dx) / Kendo `animation` / Prime `transitionOptions`                                                   | Yes       | Done    | `animation: boolean \| number`; `grid-template-rows` transition, no JS measuring                                                                                        |
| `prefers-reduced-motion`                                                                                                   | partial   | Done    | CSS-level suppression of every transition, keyframe and shimmer                                                                                                         |
| Mat `togglePosition` / Prime `iconPos`                                                                                     | Yes       | Done    | `togglePosition: 'start' \| 'end'` (logical, RTL mirrors it); overridable per panel like Mat's panel-level input                                                        |
| Mat `hideToggle` (accordion **and** panel level)                                                                           | Yes       | Done    | `hideToggle` on the accordion, overridable per `<oge-accordion-item>`                                                                                                   |
| Mat `displayMode` (`default`/`flat`)                                                                                       | Yes       | Done    | `displayMode`                                                                                                                                                           |
| Kendo `expandIcon`/`collapseIcon`/`svg*Icon`, Prime `expandIcon`/`collapseIcon`                                            | Yes       | covered | one `[ogeAccordionToggleIconTemplate]` slot (context: expanded state) instead of four icon inputs — the workspace has no icon package                                   |
| Panel title (Mat `mat-panel-title`, Kendo `title`)                                                                         | Yes       | Done    | `title`                                                                                                                                                                 |
| Panel description (Mat `mat-panel-description`, Kendo `subtitle`)                                                          | Yes       | Done    | `description`                                                                                                                                                           |
| Item icon (dx `icon`, Kendo `icon`/`iconClass`/`imageUrl`)                                                                 | Yes       | Done    | `icon` = raw SVG path data, rendered aria-hidden                                                                                                                        |
| Badge                                                                                                                      | No        | Done    | OGE extra: `badge` pill after the title                                                                                                                                 |
| `hint` / tooltip                                                                                                           | Yes       | Done    | native `title` attribute                                                                                                                                                |
| Custom header template (dx `itemTitleTemplate`, Prime `header`)                                                            | Yes       | Done    | `[ogeAccordionHeaderTemplate]`                                                                                                                                          |
| Custom content template (dx `itemTemplate`)                                                                                | Yes       | Done    | `[ogeAccordionContentTemplate]`, doubles as the lazy marker                                                                                                             |
| Mat `mat-action-row`                                                                                                       | Yes       | Done    | `[ogeAccordionActionRow]` — divided footer bar at the end of the panel body                                                                                             |
| Header actions beside the toggle                                                                                           | No        | Done    | OGE extra: `[ogeAccordionHeaderActionsTemplate]` — real buttons outside the header `<button>`, so no `nested-interactive` violation                                     |
| Expand/collapse events (Mat `opened`/`closed`, Kendo `expand`/`collapse`, Prime `onOpen`/`onClose`, dx `selectionChanged`) | Yes       | Done    | `itemExpanded` / `itemCollapsed`, flat payloads with `index`/`key`/`item`/`event`                                                                                       |
| Cancelable pre-event (Kendo `action`, PanelBar preventable `expand`/`collapse`)                                            | partial   | Done    | `itemExpanding` / `itemCollapsing` with mutable `cancel`                                                                                                                |
| Mat `afterExpand`/`afterCollapse`                                                                                          | Yes       | Done    | `afterExpand` / `afterCollapse` — driven by `transitionend`, emitted immediately when the animation is off or `prefers-reduced-motion` zeroes it                        |
| `onItemClick` (dx)                                                                                                         | Yes       | Done    | `itemClick` (fires for disabled panels too, before the pipeline)                                                                                                        |
| `onItemTitleClick` (dx)                                                                                                    | Yes       | covered | `itemClick` — the title _is_ the header button                                                                                                                          |
| `onItemContextMenu` / `onItemHold` (dx)                                                                                    | Yes       | Skipped | reachable via host event bubbling; the workspace has `[ogeContextMenu]` in `@oge-ui/overlay`                                                                            |
| `expandItem()`/`collapseItem()` return a Promise (dx)                                                                      | Yes       | Done    | `expand(target)` / `collapse(target)` / `toggle(target)` take an index **or** key and resolve `true` on commit, `false` on veto                                         |
| `openAll()`/`closeAll()` (Mat)                                                                                             | Yes       | Done    | `expandAll()` / `collapseAll()`                                                                                                                                         |
| `focus()` (dx)                                                                                                             | Yes       | Done    | `focus(target?)` — first enabled header by default                                                                                                                      |
| `isExpanded()`                                                                                                             | No        | Done    | OGE extra                                                                                                                                                               |
| APG roles: heading + button, `aria-expanded`, `aria-controls`, `aria-labelledby`                                           | Yes       | Done    | plus `role="region"` behind `useRegionRole`, and `headingLevel` (Prime `headerAriaLevel`)                                                                               |
| APG `aria-disabled` on a non-collapsible open panel                                                                        | Yes       | Done    | stays focusable — `disabled` is never used on the toggle                                                                                                                |
| Keyboard: Enter/Space, Tab                                                                                                 | Yes       | Done    | native `<button>` semantics                                                                                                                                             |
| Keyboard: Up/Down, Home/End                                                                                                | optional  | Done    | `keyboardNavigation`, wraps and skips disabled                                                                                                                          |
| Keyboard: `Ctrl+PageUp`/`Ctrl+PageDown`                                                                                    | optional  | Done    | handled on the host, so it also works from inside panel content                                                                                                         |
| Type-ahead                                                                                                                 | No        | Done    | OGE extra: accent- and locale-insensitive prefix match over titles                                                                                                      |
| Prime `selectOnFocus`                                                                                                      | Yes       | Done    | `selectOnFocus`                                                                                                                                                         |
| RTL (dx `rtlEnabled`)                                                                                                      | Yes       | covered | logical properties throughout — no `rtlEnabled` flag in new code                                                                                                        |
| `noDataText` (dx)                                                                                                          | Yes       | Done    | `messages.noData`                                                                                                                                                       |
| `MAT_EXPANSION_PANEL_DEFAULT_OPTIONS` (`hideToggle`, `expandedHeight`, `collapsedHeight`)                                  | Yes       | Done    | `provideOgeAccordionConfig()` carries all three, plus every user-facing string in `OgeAccordionMessages`                                                                |
| `height`/`width`/`elementAttr`/`tabIndex`/`accessKey` (dx)                                                                 | Yes       | Skipped | plain CSS and native attributes on the host                                                                                                                             |
| dx `keyExpr`, `dataSource` (Store/DataSource)                                                                              | Yes       | Skipped | `items` + `key` cover the component's needs; remote data belongs in the app                                                                                             |
| Kendo PanelBar nested items / `expandMode: 'full'`                                                                         | Yes       | Backlog | a tree-shaped panel bar is a separate component, not an accordion                                                                                                       |
| Mat `expandedHeight` / `collapsedHeight`                                                                                   | Yes       | Done    | `expandedHeaderHeight` / `collapsedHeaderHeight` (any CSS length)                                                                                                       |
| Per-panel two-way expanded (Kendo `[(expanded)]`, Mat `MatExpansionPanel.expanded`)                                        | Yes       | Done    | `<oge-accordion-item [(expanded)]>` — writes run the pipeline, so a veto reverts the binding                                                                            |
| Per-panel `open()`/`close()`/`toggle()` (Mat)                                                                              | Yes       | Done    | on `OgeAccordionItem`, reachable through a template ref                                                                                                                 |
| Focus returns to the header when a focused panel collapses (Mat `_containsFocus`)                                          | Yes       | Done    | required here because a collapsed panel is `inert`, which would otherwise drop focus to `<body>`                                                                        |
| dx item `text` (plain body)                                                                                                | Yes       | Done    | `text` renders as the panel body when no content template is given                                                                                                      |
| dx item `html`                                                                                                             | Yes       | Skipped | deliberate — injecting raw markup is an XSS footgun; use `text` or a content template                                                                                   |
| Native `h1`–`h6` heading wrapper                                                                                           | No        | Done    | real heading elements for levels 1–6, `div[role=heading][aria-level]` beyond that — Material wraps its header in no heading at all                                      |
| **Async expand guard per panel**                                                                                           | No        | Done    | OGE extra: `expandGuard` on expand _and_ collapse — promise-based, spinner, single-flight, throw/reject = veto                                                          |
| **Invalid-section indicator**                                                                                              | No        | Done    | OGE extra: `invalid` per panel — danger rail, dot and SR label (`messages.invalidSection`), plus `expandInvalid()` for the failed-submit case                           |
| **Per-panel async content loader**                                                                                         | No        | Done    | OGE extra: `contentLoader` with skeleton shimmer, resolved value in the template context, error state with a real retry button, `itemContentLoaded`/`itemContentFailed` |

## TreeView (`@oge-ui/navigation`) — Feature Parity

`OgeTreeView` against DevExtreme `dxTreeView`, Kendo `TreeViewComponent`,
PrimeNG `Tree`, Angular Material `CdkTree`/`MatTree`, and the WAI-ARIA APG
treeview pattern — adapted to the signal-based house API.

The entire data layer is `@oge-ui/core`'s existing tree engine, written for
tree-list: `buildTreeIndex`, `flattenNestedTree`, `filterTreeKeys`,
`flattenTreeData`, `computeTreeCheckStates`, `toggleTreeSelection`,
`resolveSelectedKeys`, `ancestorsOf`. The package adds no engine code.

Two structural notes. The tree renders a **flat DOM** — one `role="treeitem"`
per visible node, depth carried by `aria-level`/`aria-posinset`/`aria-setsize`
(which `flattenTreeData` already emits) rather than nested `role="group"`
wrappers. The APG sanctions that, and it is what makes virtual scrolling
possible. And because `treeitem` is a composite-widget role, the checkbox is an
`aria-hidden` glyph with the state on the row as `aria-checked` — a real
`<input>` there would be a `nested-interactive` violation, which is also why the
package needs no `@oge-ui/inputs` dependency. jQuery-era lifecycle events
(`onInitialized`/`onOptionChanged`/`onContentReady`/`onDisposing`) and the
imperative `option()`/`repaint()`/`beginUpdate()` shims are intentionally not
replicated.

| Feature                                                                                                  | Reference | OGE     | Notes                                                                                                                              |
| -------------------------------------------------------------------------------------------------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Flat parent-referencing data (dx `dataStructure: 'plain'`, Kendo flat-data-binding)                      | Yes       | Done    | `keyExpr` / `parentIdExpr` / `rootValue`                                                                                           |
| Nested children data (dx `'tree'`, Kendo hierarchy-binding, Prime `TreeNode.children`)                   | Yes       | Done    | `itemsExpr`; normalized by `flattenNestedTree` into the same pipeline                                                              |
| `dataStructure` switch                                                                                   | Yes       | Done    | explicit, and inferred from `itemsExpr` when unset                                                                                 |
| `displayExpr` / `disabledExpr` / `hasItemsExpr` (dx), Kendo `textField`/`isDisabled`/`hasChildren`       | Yes       | Done    | all accept a field name **or** a function, via core's `createFieldAccessor`                                                        |
| Per-node icon (dx `icon`, Kendo `icon`/`iconClass`/`imageUrl`, Prime `TreeNode.icon`)                    | Yes       | Done    | `iconExpr` = raw SVG path data, rendered aria-hidden — the workspace has no icon package                                           |
| Expanded state (dx `expandedExpr`, Kendo `isExpanded`, Prime `TreeNode.expanded`)                        | Yes       | Done    | two-way `expandedKeys`                                                                                                             |
| Selected state (dx `selectedExpr`, Kendo `isSelected`, Prime `selection`)                                | Yes       | Done    | two-way `selectedKeys`                                                                                                             |
| `selectionMode` single/multiple (dx, Prime)                                                              | Yes       | Done    | plus `'none'` as the default                                                                                                       |
| `showCheckBoxesMode` `none`/`normal`/`selectAll` (dx)                                                    | Yes       | Done    | `showCheckBoxes`; the select-all row is tri-state                                                                                  |
| `selectNodesRecursive` (dx) / Prime `propagateSelectionUp`/`Down`                                        | Yes       | Done    | one `selectNodesRecursive` covers both directions — cascade down, normalize up                                                     |
| Tri-state / partially selected (Kendo `CheckedState`, Prime `partialSelected`)                           | Yes       | Done    | `computeTreeCheckStates`; surfaced as `aria-checked="mixed"`                                                                       |
| Leaves-only / top-most selected reporting                                                                | partial   | Done    | `selectedKeysMode: 'all' \| 'leavesOnly' \| 'excludeRecursive'` and `getSelectedKeys(mode?)`                                       |
| `selectByClick` (dx)                                                                                     | Yes       | Done    | tri-state default: `undefined` → `true` without checkboxes, `false` with them                                                      |
| `expandEvent: 'click' \| 'dblclick'` (dx)                                                                | Yes       | Done    | the chevron always expands regardless                                                                                              |
| `expandNodesRecursive` (dx)                                                                              | Yes       | Done    | `expand(key)` opens the ancestors too                                                                                              |
| `expandAllEnabled` / the APG `*` key (dx)                                                                | Yes       | Done    | `allowExpandAll`; expands every sibling at the focused level                                                                       |
| `expandAll()` / `collapseAll()` (dx)                                                                     | Yes       | Done    | plus `expand`/`collapse`/`toggle`, which resolve `Promise<boolean>` and await a lazy fetch                                         |
| `selectAll()` / `unselectAll()` / `selectItem()` / `unselectItem()` (dx)                                 | Yes       | Done    | `selectAll` / `unselectAll` / `select` / `unselect`                                                                                |
| `scrollToItem()` (dx)                                                                                    | Yes       | Done    | offset math when virtualized, since the row may not exist in the DOM                                                               |
| `focus()` (dx, Kendo)                                                                                    | Yes       | Done    | `focus(key?)` — first enabled node by default                                                                                      |
| Search box (dx `searchEnabled`, Kendo `filterable`, Prime `filter`)                                      | Yes       | Done    | `searchEnabled` renders it; `searchValue` is two-way either way                                                                    |
| `searchMode` contains/startsWith/equals (dx)                                                             | Yes       | Done    | accent- and locale-insensitive through `foldText`                                                                                  |
| `searchExpr` over several fields (dx)                                                                    | Yes       | Done    | a single accessor or an array                                                                                                      |
| `searchTimeout` (dx)                                                                                     | Yes       | Done    | debounce on the built-in box                                                                                                       |
| Filter modes (dx TreeList `filterMode`)                                                                  | partial   | Done    | `matchOnly` / `withAncestors` / `fullBranch`                                                                                       |
| Auto-expand to matches, match highlighting                                                               | partial   | Done    | `expandNodesOnFiltering` + `highlightSearchResults` (`<mark class="oge-highlight">`)                                               |
| Lazy load on demand (dx `createChildren`, Kendo `children`/`loadOnDemand`, Prime `lazy`)                 | Yes       | Done    | `loadChildren`; placeholder row while pending, single-flight, fetched children join the index so cascades reach them               |
| `childrenLoaded` (Kendo)                                                                                 | Yes       | Done    | plus `childrenLoadFailed`, carrying the original error                                                                             |
| Virtual scrolling (dx `virtualModeEnabled`, Prime `virtualScroll`)                                       | Yes       | Done    | `virtualScroll: boolean \| { itemHeight }` on core's `OffsetTree` + `computeWindow`                                                |
| Drag & drop (Kendo `nodeDragStart`/`nodeDrop`, Prime `draggableNodes`)                                   | Yes       | Done    | `allowDragging`/`allowDropInside`; `inside`/`before`/`after`, cycle guard, hover-to-expand, Escape cancels                         |
| `validateDrop` (Prime)                                                                                   | Yes       | covered | the cancelable `itemReordering` pre-event is the general form                                                                      |
| `noDataText` (dx), `emptyMessage` (Prime)                                                                | Yes       | Done    | `messages.noData` plus a distinct `noSearchResults`, and `[ogeTreeNoDataTemplate]`                                                 |
| `itemTemplate` (dx), `node` template (Prime)                                                             | Yes       | Done    | `[ogeTreeItemTemplate]`                                                                                                            |
| Toggle icon template (Prime `togglericon`, Kendo `expandIcon`/`collapseIcon`)                            | Yes       | Done    | `[ogeTreeExpandIconTemplate]`, with a `loading` flag in the context                                                                |
| APG roles: `tree`/`treeitem`, `aria-expanded`, `aria-level`/`posinset`/`setsize`, `aria-multiselectable` | Yes       | Done    | flat DOM — see the note above                                                                                                      |
| APG: `aria-selected` **or** `aria-checked`, never both                                                   | Yes       | Done    | `aria-checked` in checkbox mode, `aria-selected` otherwise                                                                         |
| Keyboard: Down/Up, Home/End                                                                              | Yes       | Done    | skips disabled; trees do not wrap at the ends                                                                                      |
| Keyboard: Right opens / moves to first child, Left closes / moves to parent                              | Yes       | Done    | full APG semantics incl. the leaf no-op                                                                                            |
| Keyboard: type-ahead                                                                                     | Yes       | Done    | accent-insensitive prefix match                                                                                                    |
| Keyboard: multi-select `Space`, `Shift+Arrow`, `Shift+Space`, `Ctrl+Shift+Home/End`, `Ctrl+A`            | optional  | Done    | the APG "recommended" model — plain navigation needs no modifier                                                                   |
| `navigable` toggle (Kendo)                                                                               | Yes       | Done    | `keyboardNavigation`                                                                                                               |
| `size` (Kendo)                                                                                           | Yes       | Done    | `sm` / `md` / `lg`                                                                                                                 |
| `animate` (Kendo), `animationEnabled` (dx)                                                               | Yes       | Skipped | deliberate: an expand animation cannot be reconciled with windowed rendering of a flat list; row transitions stay CSS-token driven |
| `scrollDirection: 'horizontal'` (dx)                                                                     | Yes       | Skipped | vertical trees only; long labels ellipsize                                                                                         |
| `onItemContextMenu` / `onItemHold` (dx)                                                                  | Yes       | Skipped | reachable via host event bubbling; `[ogeContextMenu]` lives in `@oge-ui/overlay`                                                   |
| `dataSource` (Store/DataSource) (dx)                                                                     | Yes       | Skipped | `items` + `loadChildren` cover it; remote data belongs in the app                                                                  |
| Node page size / `setNodePageSize` (Kendo)                                                               | Yes       | Backlog | per-level paging; virtual scrolling covers the same need for now                                                                   |
| RTL (dx `rtlEnabled`)                                                                                    | Yes       | covered | logical properties throughout — no `rtlEnabled` flag in new code                                                                   |
| `MAT_*`-style app defaults                                                                               | Yes       | Done    | `provideOgeTreeViewConfig()`; every user-facing string in `OgeTreeViewMessages`                                                    |
| **Both data shapes in one component**                                                                    | No        | Done    | OGE extra: flat and nested go through the same pipeline, so switching payload shape is one input                                   |
| **Promise-returning expand/collapse/toggle**                                                             | partial   | Done    | dx returns a Promise from `expandItem`; ours also awaits the lazy child fetch and reports vetoes                                   |
| **Cancelable pre-events throughout**                                                                     | No        | Done    | OGE extra: `itemExpanding`, `itemCollapsing`, `selectionChanging` and `itemReordering` all carry `cancel`                          |
