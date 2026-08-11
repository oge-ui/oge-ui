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

## BPMN Editor (`@oge-ui/bpmn`, commercial) — Feature Parity & Roadmap

No Angular-native BPMN editor exists on the market — every offering wraps
bpmn-js, whose own license requires keeping the bpmn.io watermark ("must not
remove or hide the logo") in all deployments; that behavior bar is quoted here
honestly because it is also the parity bar. JointJS+ sells a commercial BPMN
demo on a generic diagram engine; Syncfusion's Diagram draws BPMN _shapes_ but
has no BPMN 2.0 XML/DI interop; Material, Kendo, PrimeNG and DevExtreme ship
nothing (absence rows below). No WAI-ARIA APG pattern covers a canvas editor,
so the a11y is composed and its limits documented.

**Structural decisions.**

- **Engine fully in-package** — a deliberate deviation from the
  pivot-engine-in-core precedent. Pivot math was generic analytics; the BPMN
  XML/DI reader/writer plus interaction geometry _is_ the commercial product,
  and `@oge-ui/core`'s MIT-forever commitment would gift it irreversibly.
  Engine Angular-freeness is enforced by an eslint `no-restricted-imports`
  override over `src/lib/engine/**`.
- **Immutable model + snapshot undo** — commands are pure
  `model => model` functions and undo is a reference stack (limit 100, with a
  save-point marker driving `isDirty`), so undo corruption is impossible and
  Escape-cancel needs no transient command.
- **String-builder XML writer** — byte-deterministic output (never
  `XMLSerializer`), fixed attribute order, input prefixes normalized to
  `bpmn:`/`bpmndi:`/`dc:`/`di:` (documented, spec-guarded:
  `read(write(read(x)))` is model-equal and `write(read(write(m)))` is
  byte-identical).

| Feature                                                 | Reference (bpmn-js) | OGE  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core element subset (events/tasks/gateways/annotations) | Yes                 | Done | 11 node types + sequence flow (name, condition, default flow) + association                                                                                                                                                                                                                                                                                                                                                                                                            |
| BPMN 2.0 XML + DI round-trip                            | Yes                 | Done | prefix-agnostic reader; `extensionElements`/`documentation`/unknown children preserved verbatim                                                                                                                                                                                                                                                                                                                                                                                        |
| Import without DI                                       | Yes (partial)       | Done | topological auto-layout + `missing-di` warning                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Palette (click-then-place + drag-to-canvas)             | Yes (drag)          | Done | click-then-place is keyboard-accessible for free; v0.5 added drag-to-canvas (snapped ghost follows the cursor, release places through the same validated path incl. boundary border-attach and pool membership, release outside cancels)                                                                                                                                                                                                                                               |
| Context pad with append                                 | Yes                 | Done | connect / append task / gateway / end event / edit label / toggle default / delete                                                                                                                                                                                                                                                                                                                                                                                                     |
| Orthogonal routing, no obstacle avoidance               | same (no avoidance) | Done | dock-side choice, L/Z/U waypoints; bpmn-js default Manhattan layout has no avoidance either                                                                                                                                                                                                                                                                                                                                                                                            |
| Snapping + alignment guides                             | Yes                 | Done | grid snap + center/edge neighbor alignment (5px threshold beats the grid)                                                                                                                                                                                                                                                                                                                                                                                                              |
| Undo/redo with save-point dirty tracking                | Yes                 | Done | snapshot stack; `isDirty()`/`markSaved()`/`dirtyChanged`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Zoom / pan / zoom-to-fit                                | Yes                 | Done | cursor-anchored wheel zoom, middle/Space drag pan, `F` fit, two-way `zoom` model                                                                                                                                                                                                                                                                                                                                                                                                       |
| Inline label editing                                    | Yes                 | Done | HTML textarea overlay (dblclick/F2/Enter), Enter commit / Escape cancel                                                                                                                                                                                                                                                                                                                                                                                                                |
| Read-only viewer mode                                   | Yes (viewer build)  | Done | one `readOnly` input instead of a separate build                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Messages i18n                                           | No (English source) | Done | every string incl. announcement templates in `OgeBpmnMessages` / `provideOgeBpmnConfig()`                                                                                                                                                                                                                                                                                                                                                                                              |
| **No watermark, Angular-native signals API**            | watermark required  | Done | OGE extra: commercial license, no logo requirement, no runtime checks                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Keyboard node cycling + keyboard connect**            | No                  | Done | OGE extra: Tab cycles elements, `C` + Tab/arrows/Enter connects without a pointer                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Live-region announcements**                           | No                  | Done | OGE extra: every create/move/connect/delete/undo narrated politely                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Escape cancels any drag or tool**                     | partial             | Done | mid-drag Escape restores positions; never consumes an undo step                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Properties panel                                        | Yes (extra package) | Done | in-package, dependency-free; process / name / condition / default-flow fields, each commit its own undo step                                                                                                                                                                                                                                                                                                                                                                           |
| Edge-drag connect (shape border ring)                   | Yes                 | Done | 8px transparent-stroke ring; drag-release commits, plain click arms the click-then-click connect tool                                                                                                                                                                                                                                                                                                                                                                                  |
| Bend-point editing                                      | Yes                 | Done | handle drag + dblclick segment insert; v0.5 added handle-dblclick waypoint REMOVE (endpoints and 2-point polylines protected) and perpendicular SEGMENT drag (end segments gain a dock waypoint first, as in bpmn-js); `manual` flag is runtime-only (translated when both endpoints move together, re-routed + cleared when one moves; not serialized to XML — DI waypoints carry the geometry)                                                                                       |
| Marquee selection                                       | Yes                 | Done | >3px drag on empty canvas; nodes by bounds intersection + edges with both endpoints selected; Shift adds, Escape cancels, sub-3px click still clears                                                                                                                                                                                                                                                                                                                                   |
| Copy / paste / cut / select all                         | Yes                 | Done | internal clipboard, Ctrl+C/X/V/A; fresh ids, +20/+20 growing offset, internal edge refs remapped, `defaultFlowId` remapped-or-dropped                                                                                                                                                                                                                                                                                                                                                  |
| **JSON persistence (`toBpmnJson`/`fromBpmnJson`)**      | No                  | Done | OGE extra: versioned envelope with structural validation (version, required maps, id cross-refs); `exportJson()`/`importJson()` on the component                                                                                                                                                                                                                                                                                                                                       |
| **Autosave stream (`diagramChanged`)**                  | No                  | Done | OGE extra: debounced JSON+XML emission per settled change (`autoSaveDebounceMs`, default 500ms, 0 = sync); never serializes mid-drag                                                                                                                                                                                                                                                                                                                                                   |
| Static SVG export (`exportSvg`)                         | Yes                 | Done | self-contained SVG string, neutral hardcoded colors, fitted viewBox (pulled forward from the v0.5 list); custom element colors are honored (arrowheads stay neutral)                                                                                                                                                                                                                                                                                                                   |
| Per-element colors (bpmn.io `bioc` interop)             | Yes                 | Done | `bioc:stroke`/`bioc:fill` read prefix-agnostically and written with the `bioc` namespace — files recolored in bpmn.io render identically here and vice versa; preset swatches + fill/stroke pickers in the panel                                                                                                                                                                                                                                                                       |
| Resize (corner handles)                                 | Yes                 | Done | activities and text annotations only — events and gateways are fixed-size by BPMN convention, exactly as in bpmn-js; ghost preview, grid snap, min-size clamp, Escape cancel; pointer-only (see a11y limits)                                                                                                                                                                                                                                                                           |
| Replace / morph menu                                    | Yes (popup menu)    | Done | via a "Type" select in the properties panel — a deliberate simplification of bpmn-js's canvas popup menu (popup variant on the v0.5 tools-pack list); same-group morphs only, rule-checked against existing flows                                                                                                                                                                                                                                                                      |
| Event definitions (9 standard kinds)                    | Yes                 | Done | single definition per event (multiple → first kept + warning), position-validity matrix enforced in reader and panel select, throw glyphs filled / catch outlined, deterministic `{eventId}_def` serialization                                                                                                                                                                                                                                                                         |
| Boundary events                                         | Yes                 | Done | palette drop on an activity border (12px ring, nearest border-midpoint dock), non-interrupting dashed via `cancelActivity`, host move carries them, solo move slides along the border, flow-target denied                                                                                                                                                                                                                                                                              |
| SubProcess / event sub-process / transaction            | Yes                 | Done | nested import/export with `parentId`, DI `isExpanded`, collapsed [+] rendering hides (but preserves) children, panel collapse toggle, cross-container flows denied; re-parenting by drag is v0.5 (see below)                                                                                                                                                                                                                                                                           |
| Activity markers (loop / multi-instance / compensation) | Yes                 | Done | `standardLoopCharacteristics` / `multiInstanceLoopCharacteristics isSequential` / `isForCompensation` round-tripped; bottom-center glyphs; panel marker select + compensation checkbox                                                                                                                                                                                                                                                                                                 |
| Pools (collaboration participants) + lanes              | Yes                 | Done | full multi-process import/export: nodes carry `poolId`, one `<bpmn:process>` per participant reconstructed; palette pool (600×250, horizontal, lane-less as in bpmn-js); black-box pools (no `processRef`) read/write as empty bands and are valid message-flow endpoints; panel add/remove/rename lanes; lane membership auto-maintained from geometry on every editing command (imports keep the file's `flowNodeRef`s verbatim); moving/deleting/copying a pool carries its members |
| Message flows                                           | Yes                 | Done | dashed line, open (unfilled) arrowhead, source circle per BPMN convention; endpoints must be in different pools (pool bands themselves connectable); `connectionKindFor` picks `messageFlow` automatically for cross-pool connects; sequence flows across pools denied (`cross-pool-flow`)                                                                                                                                                                                             |
| Data objects / data stores + data associations          | Yes                 | Done | page-with-fold 36×50 and cylinder 50×50 glyphs; our node IS the reference — writer emits a deterministic backing `<bpmn:dataObject id="{id}_ref">`; dotted open-arrow edges serialized INSIDE the activity as `dataInput/OutputAssociation` (documented simplification: the non-data endpoint must be an activity)                                                                                                                                                                     |
| Group artifact                                          | Yes                 | Done | dashed rounded rect, resizable, fill-none (no containment semantics, interior clicks pass through); label round-tripped via a definitions-level `category`/`categoryValue` pair with deterministic `{id}_cat`/`{id}_val` ids                                                                                                                                                                                                                                                           |
| Call activity                                           | Yes                 | Done | thick-border task rect, `calledElement` panel field, member of the activity morph group (morphing away drops the reference)                                                                                                                                                                                                                                                                                                                                                            |
| Align & distribute                                      | Yes (plugin)        | Done | v0.5: multi-selection context pad grows an "Align" flyout — 6 align modes (edges + bbox centers) and 2 distributions (equal center gaps, 3+ elements); each element moves by its own delta, edges re-route once; no keyboard shortcut (parity with the bpmn-js plugin)                                                                                                                                                                                                                 |
| Hand / lasso / space / global-connect tools             | Yes                 | Done | v0.5 tool strip under the palette; H/L/S shortcuts as in bpmn-js; space tool locks the dominant axis at 10px, ghost-previews and commits one `makeSpaceCommand` (strictly-beyond-origin centers shift; positive inserts, negative removes); Escape returns to select                                                                                                                                                                                                                   |
| External label drag                                     | Yes                 | Done | v0.5: below-shape labels (events/gateways/data) and edge labels are their own hit targets (`.oge-bpmn-label[data-owner]`); ghost drag commits `moveLabelCommand` (first drag creates `labelBounds` from the render-matching estimate); positions round-trip via `BPMNLabel` DI                                                                                                                                                                                                         |
| Element search (Ctrl+F)                                 | Yes (popup)         | Done | v0.5: in-canvas overlay, live name/id containment filter (locale-lowercase), top-8 result list with ArrowUp/Down + Enter, non-matches dimmed at 0.25 opacity, selection + `centerOn(id)` pan on pick, result count announced; works in read-only viewers                                                                                                                                                                                                                               |
| Minimap                                                 | Yes (extra package) | Done | v0.5: 180×120 bottom-right overlay (`showMinimap` input, hidden when empty); rect/circle/diamond primitives + accent viewport rect from one computed (pure fit math, no `getScreenCTM`); click/drag pans the main viewport                                                                                                                                                                                                                                                             |
| Overlays API                                            | Yes                 | Done | v0.5: `addOverlay`/`removeOverlay`/`clearOverlays` render absolutely-positioned HTML badges (5 anchor positions + offset) tracking elements through pan/zoom/model changes; dangling element ids hide (not drop) the badge; `html` goes through Angular's sanitizing `[innerHTML]`                                                                                                                                                                                                     |
| Unknown-attribute preservation                          | Yes (moddle)        | Done | v0.5: unknown attributes on every supported element are preserved verbatim by qualified name (`foreignAttributes`) and re-emitted after the fixed attrs (alphabetical); non-standard root `xmlns:*` decls ride along in `definitionsAttrs`; camunda-flavored files round-trip byte-identically — the `unsupported-attribute` warning code is gone                                                                                                                                      |
| Material / Kendo / PrimeNG / DevExtreme BPMN            | —                   | —    | none of the four ships any BPMN offering (absence rows)                                                                                                                                                                                                                                                                                                                                                                                                                                |
| JointJS+ BPMN                                           | commercial          | —    | generic diagram engine + BPMN shape kit; comparable commercial tier                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Syncfusion Diagram BPMN shapes                          | shapes only         | —    | draws BPMN glyphs but has no BPMN 2.0 XML/DI import/export                                                                                                                                                                                                                                                                                                                                                                                                                             |

**Honest lossiness** (every drop surfaces as a `BpmnImportWarning`, never
silently). Sub-processes, boundary events and event definitions stopped being
dropped in v0.3; pools, lanes and message flows in v0.4; unknown attributes
in v0.5 (preserved verbatim, no warning left to raise). What remains:

| Lost on import                           | Behavior                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Nested lanes (`childLaneSet`)            | flattened to one level with `nested-lanes-flattened`                                                           |
| Lanes of a process without a participant | dropped with `unsupported-element` (the model ties lanes to pools)                                             |
| Extra processes without a participant    | first process is the default; further unreferenced ones dropped with `multiple-processes`                      |
| Extra event definitions on one event     | first kept, rest dropped with `event-definition-stripped`; position-invalid kinds → `invalid-event-definition` |
| Event definition payloads (timers, refs) | `timeDuration`/`errorRef`-style children dropped with `unsupported-element` (kind survives)                    |
| Input namespace prefixes                 | normalized on export (documented; byte-determinism contract)                                                   |
| Label DI bounds                          | estimated from character-width math (`getBBox` is unavailable in jsdom)                                        |

**Skipped with rationale**: obstacle-avoidance routing (bpmn-js's default
router does not avoid obstacles either — parity holds without it).
Bend-point editing and edge-drag connect, deferred here in v0.1, shipped in
v0.2 (see the Done rows above).

**Phase roadmap**

- **v0.2 (remaining — since shipped in v0.5)** — palette drag-to-place and
  bend-point handle delete both landed in the v0.5 tools pack.
  Shipped from the original v0.2 list: properties panel (built in-package and
  dependency-free instead of via `@oge-ui/forms`), edge-drag connect,
  bend-point editing (drag + dblclick insert), plus marquee selection,
  clipboard, JSON persistence, the autosave stream and SVG export. Manual
  edge routing is runtime-only: the `manual` flag is not serialized to XML,
  so it is lost on an export/import round trip (JSON persistence keeps it).
  The v0.2b customization pack added per-element colors (bioc interop),
  corner-handle resize and the properties-panel type morph (all Done rows
  above).
- **v0.3 (shipped)** — sub-processes (collapsed/expanded, event sub-process,
  transaction, nested import/export), boundary events (border attach/slide,
  interrupting toggle), the nine event definitions with a position-validity
  matrix, and activity markers. Honest cuts, deliberately deferred: children
  can only be created inside a sub-process via import or the context-pad
  append chain (re-parenting by drag is v0.5), a single event definition per
  event (multiple definitions → first kept, backlog), and the palette's
  boundary-event replace menu is the panel definition select (bpmn-js's
  replace-menu equivalence noted). Task-type switching shipped early in v0.2b
  as the properties-panel morph select.
- **v0.4 (shipped)** — pools/lanes, collaboration, message flows, data
  objects/stores with data associations, groups (category-labeled) and call
  activities (see the Done rows above). Honest cuts, deliberately deferred:
  pool creation is horizontal-only (vertical pools render if imported);
  creating a pool does not absorb existing elements (they stay in the default
  process, unlike bpmn-js's wrap-on-first-participant); nodes keep their
  `poolId` when dragged outside the band (pool re-parenting joins sub-process
  re-parenting on the v0.5 list); data associations require an activity
  endpoint so the in-activity `dataInput/OutputAssociation` serialization
  stays total; copying a pool copies its member subgraph, not the participant
  band itself; pools are not part of the Tab element cycle (selectable by
  pointer, panel and `select()`).
- **v0.5 (shipped — the tools pack)** — align & distribute (context-pad
  flyout), the tool strip (hand / lasso / space / global connect, H/L/S),
  palette drag-to-canvas, bend-point remove + perpendicular segment drag,
  external label drag with `BPMNLabel` round-trip, element search (Ctrl+F,
  dimming, `centerOn`), the minimap, the public Overlays API and full
  unknown-attribute preservation (byte-identical camunda round trips).
- **Backlog (post-v0.5, honest)** — re-parenting by drag (into/out of
  sub-processes and pools), vertical pools (render-only today), multiple
  event definitions per event, event definition payloads
  (`timeDuration`/`errorRef` children still drop with a warning), the canvas
  popup replace menu (the panel morph select covers the capability), PNG
  export (SVG shipped), viewport virtualization for very large diagrams.
  Token simulation is out of scope — it is a separate bpmn-js ecosystem
  product, not part of the editor parity bar.

**A11y limits (v0.1, stated plainly).** The canvas is `role="application"`
with `aria-activedescendant` and a polite live region — a screen reader can
walk, create, connect and delete every element, and hears each action. What it
cannot yet do: query the topology ("what does this task connect to?") without
walking, or edit bend points / marquee-select / resize from the keyboard (all
pointer-only in v0.2 — bpmn-js has no keyboard resize either; recolor and
type morph ARE keyboard-accessible through the properties panel). These are
composition limits of an SVG canvas with no APG pattern to lean on; the
announcement vocabulary is the mitigation and topology querying stays on the
backlog. v0.5 additions, stated plainly: element search is fully
keyboard-driven (Ctrl+F, arrows, Enter, Escape) and works in read-only
viewers, and align/distribute are reachable through the pad flyout buttons —
but the minimap is pointer-only (keyboard users pan with the arrow keys and
`F` fit instead), the space tool, segment drag, palette drag and label drag
are pointer-only gestures (their outcomes remain achievable via arrow-key
moves), and the H/L/S tool shortcuts are edit-mode only.

## Scheduler (`@oge-ui/scheduler`, commercial) — Feature Parity & Roadmap

`OgeScheduler` against dxScheduler, Kendo Angular Scheduler and FullCalendar
(the framework-agnostic incumbent). **Angular Material has no scheduler**
(only a datepicker), and **PrimeNG removed its FullCalendar wrapper
entirely** in 2022 (`p-schedule` → `p-fullCalendar` → removed, issues
#6758/#12152) — two honest absence rows: OgeScheduler is the only
Angular-native scheduler in the current ecosystem. No WAI-ARIA APG scheduler
pattern exists; the a11y is composed from the calendar-grid pattern (roving
`role="grid"` cells) plus a chip tab stop with keyboard move/resize
(**OGE extra** — none of the three references move appointments from the
keyboard) and polite live-region announcements.

**Structural decisions.**

- **Consumer of the MIT suite, by design** — the opposite stance to bpmn's
  self-containment: the appointment popup is `overlay`'s `OgeAnchoredPanel`
  (virtual anchor rect), the editor is `oge-modal` + `oge-form`
  (`[(formData)]` mode), the date navigator embeds `inputs`' `OgeCalendar`.
  The composition is the selling point.
- **Pure kernel** (`src/lib/engine/`, lint-enforced framework-free):
  view-model builders, deterministic transitive-overlap column layout
  (equal-width clusters; FullCalendar-style right-expansion deferred), lane
  packing shared by the all-day strip and month rows, gesture math, and an
  RFC 5545 RRULE-subset parser (FREQ DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL,
  COUNT ⊕ UNTIL, BYDAY, BYMONTHDAY, BYMONTH, WKST — unsupported parts reject
  the whole rule, never truncate).
- **Intl-only local dates** (house rule): no date library, no adapter, no TZ
  database — `UNTIL=…Z` reads as local wall time, documented honestly.

| Feature (references)                                                       | Reference | Status  | Notes                                                                                                                |
| -------------------------------------------------------------------------- | --------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| Day / Week / Month views                                                   | dx/K/FC   | covered | per-view `dayStartHour`/`dayEndHour`/`cellDuration` overrides via `views` option objects                             |
| workWeek view + `hiddenWeekDays`                                           | dx/K/FC   | covered | `workWeek` always drops the weekend; `hiddenWeekDays` filters any week grid                                          |
| All-day strip + lane packing                                               | dx/K/FC   | covered | `showAllDayPanel`; grows to CSS max-height + scroll                                                                  |
| Overlap layout                                                             | dx/K/FC   | covered | deterministic clusters + greedy columns; right-expansion → v0.2                                                      |
| `maxAppointmentsPerCell` + "+N more"                                       | dx/K/FC   | covered | overflow drills into the day view (dx option parity); collector popup list → v0.2                                    |
| dataSource array / DataSource + field exprs + `keyExpr`                    | dx/K/FC   | covered | string dates round-trip in their storage shape (`serializeLikeOriginal`)                                             |
| `[(currentDate)]` / `[(currentView)]`, toolbar, Intl period title          | dx/K/FC   | covered | Today disables while visible; `dateNavigatorText` formatter                                                          |
| Date-navigator calendar drop-down                                          | dx/K      | covered | title button opens `OgeCalendar` in an anchored panel                                                                |
| `min`/`max` navigation bounds                                              | dx/K/FC   | covered | clamps every date write; prev/next disable at the edges                                                              |
| Current-time indicator + past-time shading                                 | dx/K/FC   | covered | `showCurrentTimeIndicator`, `shadeUntilCurrentTime`                                                                  |
| Working-hours emphasis                                                     | K/FC      | covered | `workHours: { start, end, days? }` off-hours shading; weekends always shaded                                         |
| `scrollTime` + `scrollToTime()`/`scrollTo(date)`                           | dx/K/FC   | covered |                                                                                                                      |
| Click/dblclick/Enter create; popup; form dialog; `editorShowing`           | dx/K/FC   | covered | dx `onAppointmentFormOpening` parity via mutable `formItems`                                                         |
| Drag-to-create range selection                                             | dx/K/FC   | covered | `rangeSelected` + prefilled editor; Escape cancels                                                                   |
| Drag-move / edge-resize + Escape-cancel + `snapDuration`                   | dx/K/FC   | covered | bpmn five-part gesture machine; month/all-day drags move by day, preserving time                                     |
| Keyboard move/resize (Ctrl+Arrow, Ctrl+Shift+Up/Down)                      | —         | covered | **OGE extra** — announced via the live region                                                                        |
| Cancelable CRUD events + past-tense events                                 | dx/K      | covered | `appointment{Adding,Updating,Deleting}` (+ed); programmatic `addAppointment`/`updateAppointment`/`deleteAppointment` |
| Context-menu events                                                        | dx        | covered | `appointmentContextMenu` / `cellContextMenu` with full payloads                                                      |
| `readOnly`                                                                 | K/FC      | covered | overrides every `allow*` flag                                                                                        |
| Templates: appointment / cell / date header                                | dx/K/FC   | covered | `[ogeAppointmentTemplate]` (+ cell/date-header **OGE extras**); collector + tooltip templates → v0.2                 |
| Messages/i18n incl. aria + announcements                                   | dx/K/FC   | covered | `provideOgeSchedulerConfig` + per-instance `[messages]`                                                              |
| Recurrence expansion + editor UI + `recurrenceEditMode`                    | dx/K/FC   | covered | subset expansion engine, occurrence/series scope dialog, EXDATE detach; `getOccurrences()` API → backlog             |
| Resources & grouping (`resources`, `groups`)                               | dx/K/FC   | covered | editor selects, color-by-resource, timeline rows; day/week column grouping + `groupByDate`/orientation → v0.3        |
| Timeline (`timelineDay`/`timelineWeek`) + Agenda views                     | dx/K/FC   | covered | timeline bars via the transposed overlap kernel; timeline drag + Year view + `intervalCount` → v0.3                  |
| Virtual scrolling, adaptive/mobile popovers, cross-scrolling               | dx        | v0.2    | no horizontal axis exists yet in v0.1                                                                                |
| Timezone options (`timeZone`, `*TimeZoneExpr`, `allowTimeZoneEditing`)     | dx/K/FC   | v0.2    | interacts with recurrence; v0.1 documents "local wall time" honestly                                                 |
| Drag between schedulers / external drag sources                            | dx/FC     | v0.2    |                                                                                                                      |
| PDF export / iCal & Google Calendar feeds                                  | K/FC      | v0.2    |                                                                                                                      |
| Remote range filtering through LoadOptions                                 | dx/K/FC   | v0.2    | v0.1 filters client-side after load                                                                                  |
| Reminders (`reminderExpr` + `reminderTriggered`)                           | Outlook   | covered | **OGE extra** — none of dx/K/FC fire reminder events                                                                 |
| Hover appointment tooltip (`appointmentTooltipTemplate`)                   | dx/FC     | Skipped | the click popup covers the role; hover preview reconsidered on demand                                                |
| `allDayPanelMode: 'all'` (long events kept in the grid)                    | dx        | Skipped | the boolean panel covers real cases; 'all' is a dx oddity                                                            |
| `dateSerializationFormat`, `offset` (shifted day window)                   | dx        | Skipped | serialization belongs to the DataSource layer; overnight-shift windows revisit with timeline                         |
| `accessKey/tabIndex/hint/elementAttr`, `repaint/beginUpdate/option/on/off` | dx        | Skipped | jQuery-era widget plumbing — signals, host bindings and Angular lifecycle replace them                               |
| Kendo `navigable` extra shortcut map                                       | K         | Skipped | the composed grid + chip model covers the keyboard contract; no APG pattern exists to mandate more                   |

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
| **Auto-repeat (spinner)**                             | No        | Done    | OGE extra: delay + interval, disabled-flip stop                              |
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

## Splitter (`@oge-ui/layout`) — Feature Parity

`OgeSplitter` + declarative `OgeSplitterPane` against DevExtreme `dxSplitter`,
Kendo `SplitterComponent`/`SplitterPaneComponent`, PrimeNG `Splitter`/
`SplitterPanel`, and the WAI-ARIA APG **window splitter** pattern — adapted to
the signal-based house API. **Angular Material has no splitter at all**
(angular/components#17440 is still open), so it contributes no column here;
where the other three disagree, the APG wins.

Three decisions shape the implementation. First, layout is **one CSS grid** in
which the separators are real tracks, so sizes never need the
`calc(N% - gutters)` fudge PrimeNG carries — and because grid follows the
writing mode, panes mirror in RTL for free. Second, sizes are **ratios, not
percentages**: `[30, 30]` lays out exactly like `[50, 50]`, which turns "the
numbers do not add up to 100" from an error case into a non-event; `'<n>px'`
pins a pane instead, and `'<n>%'` is accepted as a ratio spelling. Third, the
**two-way `sizes` model is the whole persistable state**, so PrimeNG's
`stateKey`/`stateStorage` pair needs no counterpart. jQuery-era lifecycle
events (`onInitialized`/`onOptionChanged`/`onContentReady`/`onDisposing`) and
the imperative `option()`/`repaint()`/`beginUpdate()` shims are intentionally
not replicated, per the house rule.

| Feature                                                                  | Reference | OGE     | Notes                                                                                                                                                                                        |
| ------------------------------------------------------------------------ | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items[]` (dx), `panelSizes` (Prime)                                     | Yes       | Done    | `OgeSplitterPaneData[]`: `key/size/minSize/maxSize/collapsible/collapsed/collapsedSize/resizable/scrollable/visible/text/cssClass/panes/orientation`                                         |
| Declarative panes (Kendo `kendo-splitter-pane`, Prime `p-splitterPanel`) | Yes       | Done    | `<oge-splitter-pane>`; merged with `panes`, children first                                                                                                                                   |
| Both sources at once                                                     | No        | Done    | OGE extra — same merge rule as tabs and the accordion                                                                                                                                        |
| `orientation` (dx, Kendo) / `layout` (Prime)                             | Yes       | Done    | `orientation: 'horizontal' \| 'vertical'`; drives the grid axis and which arrow keys move a separator                                                                                        |
| Pane `size` (all three)                                                  | Yes       | Done    | `number` ratio, `'40%'` or `'240px'`; a px size becomes a fixed track and leaves the share pool                                                                                              |
| Pane `minSize`/`maxSize` (dx), `min`/`max` (Kendo), `minSize` (Prime)    | Yes       | Done    | both accept a ratio **or** a px string, independently of how the pane itself is sized                                                                                                        |
| Sizes that do not sum to 100                                             | partial   | Done    | not an error: sizes are ratios, normalized to 100 — Prime drifts here once past two panes                                                                                                    |
| Pane `resizable` (dx, Kendo)                                             | Yes       | Done    | per pane, plus a splitter-level `resizable`; a locked separator reports `aria-disabled`                                                                                                      |
| Pane `collapsible` / `collapsed` (dx, Kendo)                             | Yes       | Done    | `collapsible` + two-way `[(collapsed)]` per pane; `collapse()`/`expand()`/`toggle()` take an index **or** a key                                                                              |
| Pane `collapsedSize` (dx)                                                | Yes       | Done    | `collapsedSize`, any ratio or px value; defaults to `0`                                                                                                                                      |
| Restore to the pre-collapse size                                         | Yes       | Done    | remembered per pane, and the siblings are scaled back down so it returns at exactly the size it left                                                                                         |
| Pane `scrollable` (Kendo)                                                | Yes       | Done    | `scrollable`                                                                                                                                                                                 |
| Pane `visible` (dx)                                                      | Yes       | Done    | `visible`                                                                                                                                                                                    |
| Nested splitters (dx `items[].splitter`)                                 | Yes       | Done    | the same component recurses — a `panes` entry carrying `panes`, or simply an `<oge-splitter>` inside a pane; a nested level defaults to the opposite axis                                    |
| `separatorSize` (dx) / `splitbarWidth` (Kendo) / `gutterSize` (Prime)    | Yes       | Done    | `separatorSize`, a real grid track so it never eats into a pane                                                                                                                              |
| `itemTemplate` (dx)                                                      | Yes       | Done    | `[ogeSplitterPaneTemplate]` (context: `$implicit`, `index`, `collapsed`)                                                                                                                     |
| dx item `text` (plain body)                                              | Yes       | Done    | `text` renders as the pane body when no template is given                                                                                                                                    |
| `allowKeyboardNavigation` (dx)                                           | Yes       | Done    | `keyboardNavigation`; while off the separators also leave the Tab sequence                                                                                                                   |
| `resizeStep` (Kendo) / `step` (Prime)                                    | Yes       | Done    | `step`, in share points (Prime's unit) rather than Kendo's pixels                                                                                                                            |
| `onResizeStart` / `onResize` / `onResizeEnd` (dx, Prime)                 | Yes       | Done    | `resizeStarted` / `resized` / `resizeEnded`; deliberately not named `resize`, which is a native DOM event name                                                                               |
| `onItemCollapsed` / `onItemExpanded` (dx)                                | Yes       | Done    | `paneCollapsed` / `paneExpanded`, flat payloads with `index`/`key`/`item`/`event`                                                                                                            |
| `onItemClick` (dx)                                                       | Yes       | Done    | `paneClick`, resolved on the host so a nested splitter reports its own panes instead of double-firing through the parent                                                                     |
| Kendo `collapsedChange` / `sizeChange` per pane                          | Yes       | covered | `[(collapsed)]` is per pane; sizes are mutually constrained, so one `[(sizes)]` model is the coherent channel rather than N bindings that can contradict each other                          |
| Kendo `layoutChange`                                                     | Yes       | covered | `sizesChange`, which carries the new layout instead of only announcing that it changed                                                                                                       |
| Prime `stateKey` / `stateStorage`                                        | Yes       | covered | `[(sizes)]` is the whole state — persist it to localStorage, an API or a route param in ~3 lines, with no storage token to provide                                                           |
| `onItemContextMenu` / `onItemHold` / `itemHoldTimeout` (dx)              | Yes       | Done    | `paneContextMenu` and `paneHold` with `itemHoldTimeout`; both resolve from the host like `paneClick`, so a nested splitter reports its own panes instead of double-firing through the parent |
| `dataSource` (dx Store/DataSource)                                       | Yes       | Done    | `dataSource` takes core's `DataSource` contract, merged after `panes`; a source that publishes `changes` re-loads                                                                            |
| `height` / `width` / `hoverStateEnabled` (dx, component level)           | Yes       | Skipped | plain CSS and native attributes on the host — an Angular component element takes them directly                                                                                               |
| `rtlEnabled` (dx)                                                        | Yes       | covered | the grid follows the writing mode and the gestures read the computed direction — no RTL flag in new code                                                                                     |
| Kendo `splitterBarClass`/`splitterBarAttributes`, Prime `pt`             | Yes       | covered | one `.oge-splitter-separator` class in the global stylesheet, themed through the `--oge-*` tokens                                                                                            |
| APG `role="separator"` with `tabindex="0"`                               | Yes       | Done    | every separator is focusable — of the three references only PrimeNG gets this right                                                                                                          |
| APG `aria-valuenow` / `aria-valuemin` / `aria-valuemax`                  | Yes       | Done    | one 0–100 scale: the primary pane's share of the pane area, with the range narrowed by **both** neighbours' bounds                                                                           |
| APG `aria-orientation`                                                   | Yes       | Done    | mirrors `orientation`                                                                                                                                                                        |
| APG `aria-controls` → the primary pane                                   | Yes       | Done    | the pane **before** the separator; it keeps its element while collapsed, so the reference never dangles                                                                                      |
| APG labelling (`aria-label` / `aria-labelledby`)                         | Yes       | Done    | `messages.separator` with `{{first}}`/`{{second}}` placeholders, plus `ariaLabel` on the container                                                                                           |
| APG keyboard: Arrow keys                                                 | Yes       | Done    | axis-aware and RTL-mirrored, `step` share points per press                                                                                                                                   |
| APG keyboard: Enter collapses / restores the primary pane                | Yes       | Done    | advertised with `aria-keyshortcuts="Enter"`, and only on a collapsible pane                                                                                                                  |
| APG keyboard: Home / End                                                 | optional  | Done    | jump to the primary pane's smallest and largest reachable size                                                                                                                               |
| APG keyboard: F6 (cycle panes)                                           | optional  | Skipped | collides with browser and screen-reader chrome, and models a window manager rather than an in-page widget                                                                                    |
| Collapse affordance on the separator (Kendo, Ignite UI, Syncfusion)      | Yes       | Done    | `showCollapseGrips` renders an `aria-hidden` chevron per collapsible neighbour, resolved through `closest()`, so no focusable child ever sits inside `role="separator"`                      |
| Collapsing the pane **after** the separator                              | Yes       | Done    | a second `'end'` grip; Enter stays on the APG primary pane, `Ctrl`+Arrow reaches either side                                                                                                 |
| `Ctrl`+Arrow expand/collapse (Ignite UI)                                 | Yes       | Done    | collapses the pane the arrow points at, or first restores the collapsed one it points away from; RTL-mirrored and advertised via `aria-keyshortcuts`                                         |
| `nonCollapsible` (Ignite UI)                                             | Yes       | covered | per-pane `collapsible` (default `false`) plus `showCollapseGrips` for the chrome                                                                                                             |
| `addPane()` / `removePane()` (Syncfusion)                                | Yes       | covered | `panes` is a signal input — add or remove entries and the layout follows; there is no imperative mutation API                                                                                |
| `enablePersistence` (Syncfusion)                                         | Yes       | covered | `[(sizes)]`, the same channel as PrimeNG's `stateKey`                                                                                                                                        |
| `enableHtmlSanitizer` / string HTML pane content (Syncfusion)            | Yes       | Skipped | deliberate — injecting raw markup is an XSS footgun; use `text` or a pane template                                                                                                           |
| Double-click to collapse                                                 | Yes       | Done    | on the separator, alongside Enter and the grip                                                                                                                                               |
| Live resize                                                              | Yes       | Done    | all three references resize live, as do the in-repo grid and modal gestures; there is no ghost-bar mode                                                                                      |
| `noDataText` (dx)                                                        | Yes       | Done    | `messages.noData`                                                                                                                                                                            |
| Config provider                                                          | partial   | Done    | `provideOgeSplitterConfig()` carries `separatorSize`, `step`, `showCollapseGrips` and every user-facing string in `OgeSplitterMessages`                                                      |
| `prefers-reduced-motion`                                                 | No        | Done    | CSS-level suppression of the separator and grip transitions                                                                                                                                  |
| dx pane `elementAttr` / Syncfusion `htmlAttributes`                      | Yes       | Done    | `htmlAttributes` per pane; keys removed from the bag are removed from the DOM, so clearing it clears the element                                                                             |
| **Escape cancels an in-flight drag**                                     | No        | Done    | OGE extra: reverts to the sizes the gesture started from — no reference splitter lets you undo a mis-drag                                                                                    |
| **Touch that actually resizes**                                          | No        | Done    | OGE extra: `touch-action: none` plus pointer capture and `pointercancel` handling; without it a touch drag scrolls the page, which is what the in-repo grid gesture still does               |
| **Cancelable collapse pipeline**                                         | No        | Done    | OGE extra: `paneCollapsing` / `paneExpanding` with a mutable `cancel`, and a vetoed write to `[(collapsed)]` reverts the binding                                                             |
| **Collapse keeps focus reachable**                                       | No        | Done    | OGE extra: a collapsed pane is `inert` rather than removed, and focus inside it is handed to its separator first                                                                             |

## Toolbar (`@oge-ui/layout`) — Feature Parity

`OgeToolbar` + declarative `OgeToolbarItem` against DevExtreme `dxToolbar`,
Kendo `ToolBarComponent`, PrimeNG `Toolbar`, Angular Material `MatToolbar`, and
the WAI-ARIA APG **toolbar** pattern — adapted to the signal-based house API.

Two of the four references contribute almost nothing here, and that is the
headline. **Angular Material's `MatToolbar` is purely presentational** — a
`color` input and `<mat-toolbar-row>`, no keyboard model, no overflow.
**PrimeNG's `Toolbar` is a three-slot container** whose own accessibility docs
say it "contains no built-in interactive elements; content follows normal page
tab sequence" — so it has neither a roving tabindex nor an overflow menu. Only
DevExtreme and Kendo collapse commands that stop fitting, and this component
matches both.

Three decisions shape the implementation. First, **the fitting math is a pure
function in `@oge-ui/core`** (`fitToolbarItems`): it takes measured sizes and a
policy per item and returns which indices stay inline, so it is unit-tested with
numbers instead of pixels and the component only feeds it `ResizeObserver`
readings. A container query cannot express "how many of these N items fit" — the
house preference for `@container` covers _layout_, not item counting. Second,
there is **no `widget` + `options` bag**: `items` is a curated union the toolbar
renders itself, and anything richer arrives through `[ogeToolbarItemTemplate]`
or one of the three projection slots — the same call as the form editors'
"curated type plus template escape hatch". Third, **`locateInMenu` defaults to
`'auto'`, not DevExtreme's `'never'`**, because collapsing is the point of the
component.

The retired duplication is the other half of the change: the grid's and tree
list's hand-rolled `.oge-toolbar` markup is gone, both now render
`<oge-toolbar>`, and grid's compact button style moved out of the way to
`.oge-tool-btn` so one package owns the `.oge-toolbar-*` namespace. jQuery-era
lifecycle events (`onInitialized`/`onOptionChanged`/`onContentReady`/`onDisposing`)
and the `option()`/`repaint()` shims are intentionally not replicated, per the
house rule.

| Feature                                                                                   | Reference | OGE     | Notes                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items[]` (dx), `tools` (Kendo)                                                           | Yes       | Done    | `OgeToolbarItemData[]`: `key/type/text/icon/hint/location/locateInMenu/showText/showIcon/disabled/visible/cssClass/severity/active/data`                                                                                                                      |
| Declarative children (Kendo `kendo-toolbar-button`)                                       | Yes       | Done    | `<oge-toolbar-item>`, with its own `itemClick` output                                                                                                                                                                                                         |
| Both sources at once                                                                      | No        | Done    | OGE extra — children first, the merge rule shared with tabs, the accordion and the splitter                                                                                                                                                                   |
| dx item `location: 'before' \| 'center' \| 'after'`                                       | Yes       | Done    | three flex groups; `center` claims the remaining space, matching dx's semantics                                                                                                                                                                               |
| PrimeNG `start` / `center` / `end` templates                                              | Yes       | Done    | `[ogeToolbarBefore]` / `[ogeToolbarCenter]` / `[ogeToolbarAfter]` attribute slots take any control                                                                                                                                                            |
| dx item `locateInMenu: 'never' \| 'always' \| 'auto'`                                     | Yes       | Done    | same triple; the default is **`'auto'`** rather than dx's `'never'`                                                                                                                                                                                           |
| dx item `showText: 'always' \| 'inMenu'`                                                  | Yes       | Done    | plus `'never'`, and a toolbar-level `showText` default (Kendo's `DisplayMode` idea)                                                                                                                                                                           |
| Kendo `showIcon` (`boolean \| DisplayMode`)                                               | Yes       | Done    | `showIcon` per item and per toolbar, same three values                                                                                                                                                                                                        |
| Icon-only items keep an accessible name                                                   | partial   | Done    | the item's `text` becomes the button's `aria-label`; dx leaves an icon-only `dxButton` unnamed unless you pass `hint`                                                                                                                                         |
| dx item `text` / `icon`                                                                   | Yes       | Done    | `text`, and `icon` as SVG path data — the house convention, no icon font or icon package                                                                                                                                                                      |
| dx item `disabled` / `visible`                                                            | Yes       | Done    | `disabled` (also skipped by arrow navigation), `visible: false` removes the entry                                                                                                                                                                             |
| dx item `cssClass`                                                                        | Yes       | Done    | `cssClass` on the item wrapper, alongside `.oge-toolbar-item`                                                                                                                                                                                                 |
| dx item `template` (per item)                                                             | Yes       | Done    | `<ng-template ogeToolbarItemTemplate>` inside an `<oge-toolbar-item>`                                                                                                                                                                                         |
| dx `itemTemplate` (component level)                                                       | Yes       | Done    | `[ogeToolbarItemTemplate]` on the toolbar; queried with `descendants: false` so it never steals a child's template                                                                                                                                            |
| dx `menuItemTemplate` / item `menuItemTemplate`                                           | Yes       | Done    | `[ogeToolbarMenuItemTemplate]`, rendered through `oge-menu-list`'s item template with the toolbar's own context                                                                                                                                               |
| dx item `widget` + `options` bag                                                          | Yes       | covered | deliberately not replicated: a curated `type` union the toolbar renders itself, plus the template and projection slots. A string-keyed widget registry cannot be type-checked, and layout may not depend on `buttons`/`inputs`                                |
| dx item `html` (raw markup)                                                               | Yes       | Skipped | injecting raw markup is an XSS footgun — the same call as the splitter's `enableHtmlSanitizer`; use `text` or a template                                                                                                                                      |
| Kendo tool: button                                                                        | Yes       | Done    | `type: 'button'`, with `severity` and an `active` toggle state (`aria-pressed`)                                                                                                                                                                               |
| Kendo tool: separator                                                                     | Yes       | Done    | `type: 'separator'` — a real `role="separator"` with the cross-axis `aria-orientation`                                                                                                                                                                        |
| Kendo tool: spacer                                                                        | Yes       | Done    | `type: 'spacer'`                                                                                                                                                                                                                                              |
| Label / static text tool                                                                  | partial   | Done    | `type: 'label'`; Kendo has no label tool and dx needs a `template` for one                                                                                                                                                                                    |
| Kendo tools: buttongroup / dropdownbutton / splitbutton                                   | Yes       | covered | project `<oge-button-group>` / `<oge-drop-down-button>` from `@oge-ui/buttons` into a slot, or stamp one from an item template — the toolbar does not re-wrap components another package already ships                                                        |
| Kendo custom tools (`ToolBarToolComponent` subclass)                                      | Yes       | covered | the template and projection slots cover it without an inheritance contract; `canFocus`/`handleKey` need no counterpart because the toolbar discovers focusable elements from the DOM                                                                          |
| Kendo `overflow` (`'menu'` mode)                                                          | Yes       | Done    | `overflow: 'menu'` (the default) — `OgeAnchoredPanel` + `oge-menu-list` from `@oge-ui/overlay`, no new popup code                                                                                                                                             |
| dx `multiline`                                                                            | Yes       | Done    | `overflow: 'wrap'` — one input covers both spellings                                                                                                                                                                                                          |
| Kendo `overflow: 'none'`                                                                  | Yes       | Done    | `overflow: 'none'`                                                                                                                                                                                                                                            |
| Kendo `overflow: 'scroll'` / Syncfusion `'Scrollable'`                                    | Yes       | Done    | `overflow: 'scroll'` with `scrollStep`; the arrows appear only when the row actually overflows, and disable at each end                                                                                                                                       |
| Kendo `overflow: 'section'` / Syncfusion `'Extended'`                                     | Yes       | Done    | `overflow: 'extended'` — the remainder moves to a second row behind an `aria-expanded` toggle that names the row through `aria-controls`                                                                                                                      |
| Kendo `popupSettings`                                                                     | Yes       | covered | the menu runs on `OgeAnchoredPanel`, which resolves its own placement, flipping and viewport padding — there is no second positioning API to configure                                                                                                        |
| Kendo `open` / `close` (`PreventableEvent`)                                               | Yes       | Done    | `menuOpening` / `menuClosing` with a mutable `cancel`, plus past-tense `menuOpened` / `menuClosed` carrying the close reason                                                                                                                                  |
| Kendo `toggle(popupOpen?)`                                                                | Yes       | Done    | `toggleMenu()`, plus explicit `openMenu()` / `closeMenu(reason)`                                                                                                                                                                                              |
| Which commands are collapsed, as an event                                                 | No        | Done    | **OGE extra**: `overflowChanged` reports the keys and count now in the menu — neither dx nor Kendo tells you                                                                                                                                                  |
| dx `onItemClick`                                                                          | Yes       | Done    | `itemClick`, flat payload with `index`/`key`/`item`/`inMenu`/`event`; `inMenu` says whether the activation came from the menu                                                                                                                                 |
| Per-item click output                                                                     | No        | Done    | **OGE extra**: `<oge-toolbar-item (itemClick)>` saves the index lookup when the items are written declaratively                                                                                                                                               |
| dx `onItemContextMenu` / `onItemHold` / `itemHoldTimeout`                                 | Yes       | Done    | `itemContextMenu` and `itemHold` with `itemHoldTimeout`; both carry the flat `index`/`key`/`item`/`event` payload                                                                                                                                             |
| dx `onItemRendered`                                                                       | Yes       | Skipped | a jQuery-era render hook; Angular lifecycle, `effect()` and the template own rendering here                                                                                                                                                                   |
| dx `dataSource` (Store/DataSource)                                                        | Yes       | Done    | `dataSource` takes core's `DataSource` contract, merged after `items`; a source that publishes `changes` re-loads. `load({})` only — a toolbar has no paging, sorting or filtering to push down                                                               |
| dx `disabled`                                                                             | Yes       | Done    | disables every item **and** takes the whole toolbar out of the Tab sequence                                                                                                                                                                                   |
| dx `visible` / `width` / `height` / `elementAttr` / `hoverStateEnabled` (component level) | Yes       | Skipped | plain CSS and native attributes on the host — an Angular component element takes them directly. Per-**item** `elementAttr` is implemented as `htmlAttributes`                                                                                                 |
| dx `noDataText`                                                                           | Yes       | Done    | `messages.noData`, shown only when the toolbar owns no items **and** no slot content is projected (watched with a `MutationObserver`, since `ng-content` has no signal counterpart and Angular 22 has no per-render hook)                                     |
| dx `rtlEnabled`                                                                           | Yes       | covered | logical properties throughout and the arrow keys read the computed `direction` — no RTL flag in new code                                                                                                                                                      |
| Kendo `size` (`ToolbarSize`)                                                              | Yes       | Done    | `size: 'sm' \| 'md' \| 'lg'`                                                                                                                                                                                                                                  |
| Kendo `fillMode` (`ToolbarFillMode`)                                                      | Yes       | Done    | `stylingMode: 'outlined' \| 'filled' \| 'flat'`, the accordion's spelling                                                                                                                                                                                     |
| Kendo `tabindex`                                                                          | Yes       | covered | the APG roving tabindex owns `tabindex` — a fixed container value would break the pattern                                                                                                                                                                     |
| Material `color`                                                                          | Yes       | covered | `stylingMode` plus the `--oge-*` tokens; there is no Material palette concept in this suite                                                                                                                                                                   |
| Material `<mat-toolbar-row>` (multiple rows)                                              | Yes       | covered | `overflow: 'wrap'` flows onto more lines and `location` groups within a line — a manual row API would fight the overflow model                                                                                                                                |
| PrimeNG `pt` / Kendo class hooks                                                          | Yes       | covered | global `.oge-toolbar-*` classes themed through the `--oge-*` tokens                                                                                                                                                                                           |
| APG `role="toolbar"`                                                                      | Yes       | Done    | on the host; of the four references only PrimeNG also sets it                                                                                                                                                                                                 |
| APG labelling (`aria-label` / `aria-labelledby`)                                          | Yes       | Done    | `ariaLabel`, `ariaLabelledBy` (which wins and suppresses `aria-label`), defaulting to `messages.toolbar`                                                                                                                                                      |
| APG `aria-orientation`                                                                    | Yes       | Done    | written only when vertical — horizontal is the ARIA default, and spelling it out is noise                                                                                                                                                                     |
| APG roving tabindex (one Tab stop)                                                        | Yes       | Done    | over the toolbar's own buttons **and** projected controls, resolved from the DOM so an `<oge-select-box>` in a slot participates                                                                                                                              |
| APG Left/Right (Up/Down when vertical)                                                    | Yes       | Done    | axis-aware and RTL-mirrored, using core's `stepEnabledIndex`                                                                                                                                                                                                  |
| APG optional wrapping                                                                     | optional  | Done    | `wrap`, on by default, off with one input                                                                                                                                                                                                                     |
| APG Home / End                                                                            | optional  | Done    | first and last **enabled** control, via core's `edgeEnabledIndex`                                                                                                                                                                                             |
| APG "disabled controls are not focusable"                                                 | Yes       | Done    | disabled stops are skipped by the arrows and never hold the Tab stop                                                                                                                                                                                          |
| APG "avoid controls that need the arrow keys"                                             | Yes       | Done    | **the toolbar hands the arrows, Home and End back to a focused text-entry control** — the grid's search box lives on this toolbar, so this is not theoretical                                                                                                 |
| Overflow button ARIA (`aria-haspopup` / `expanded` / `controls`)                          | Yes       | Done    | full wiring, and focus returns to the button when the menu closes (`OgeAnchoredPanel.restoreFocus`)                                                                                                                                                           |
| Escape / outside-click close the menu                                                     | Yes       | Done    | the shared overlay stack, so Escape always closes the topmost surface first                                                                                                                                                                                   |
| Config provider                                                                           | partial   | Done    | `provideOgeToolbarConfig()` carries `size`, `stylingMode` and every user-facing string in `OgeToolbarMessages`                                                                                                                                                |
| `prefers-reduced-motion`                                                                  | No        | Done    | CSS-level suppression of the button transitions                                                                                                                                                                                                               |
| Syncfusion `overflowMode: 'MultiRow'`                                                     | Yes       | Done    | `overflow: 'wrap'`                                                                                                                                                                                                                                            |
| Syncfusion `scrollStep`                                                                   | Yes       | Done    | `scrollStep`, in pixels                                                                                                                                                                                                                                       |
| Syncfusion `allowKeyboard`                                                                | Yes       | Done    | `keyboardNavigation`; while off the controls keep their natural Tab order instead of a roving tabindex                                                                                                                                                        |
| Syncfusion `refreshOverflow()`                                                            | Yes       | Done    | `refreshOverflow()` — drops the measurement cache and re-measures, for the things the toolbar cannot observe (a late web font, a stylesheet swap)                                                                                                             |
| Syncfusion `addItems()` / `removeItems()` / `hideItem()` / `enableItems()`                | Yes       | Done    | `addItem()` / `removeItem()` / `hideItem()` / `enableItem()` / `clearItemOverrides()`. `items` stays the declared source of truth and the imperative calls are an override layer on top, so a re-supplied array cannot silently undo one                      |
| Syncfusion item `prefixIcon` / `suffixIcon`                                               | Yes       | Done    | `icon` (leading) and `suffixIcon`, both SVG path data                                                                                                                                                                                                         |
| Kendo `iconClass` / Syncfusion icon classes                                               | Yes       | Done    | `iconClass` / `suffixIconClass` render an empty `<i>` — the hook for an icon font the app already ships, without this suite growing one                                                                                                                       |
| Syncfusion item `width`                                                                   | Yes       | Done    | `width`, a number (pixels) or any CSS length                                                                                                                                                                                                                  |
| dx `elementAttr` / Syncfusion `htmlAttributes` (per item)                                 | Yes       | Done    | `htmlAttributes`; keys removed from the bag are removed from the DOM, so clearing it clears the element                                                                                                                                                       |
| Syncfusion `showTextOn: 'Toolbar' \| 'Overflow' \| 'Both'`                                | Yes       | Done    | `showText: 'always' \| 'onBar' \| 'inMenu' \| 'never'` — a superset, since `'never'` has no Syncfusion counterpart                                                                                                                                            |
| Kendo `toggleable` / `selected` / `selectedChange`                                        | Yes       | Done    | a defined `active` makes the item a toggle; `[(active)]` is two-way on a declarative child, and `activeChanged` reports for `items` entries, which the toolbar must not mutate                                                                                |
| Syncfusion `enableCollision`                                                              | Yes       | covered | `OgeAnchoredPanel` flips and clamps the menu to the viewport on its own                                                                                                                                                                                       |
| Syncfusion `enablePersistence`                                                            | Yes       | covered | a toolbar has no user-mutable layout state to persist                                                                                                                                                                                                         |
| Syncfusion item `type: 'Input'`                                                           | Yes       | covered | `[ogeToolbarItemTemplate]` or a projection slot takes any editor, typed                                                                                                                                                                                       |
| Syncfusion item `tabIndex`                                                                | Yes       | Skipped | the APG roving tabindex owns `tabindex`; a per-item value would break the pattern. Turn the whole thing off with `keyboardNavigation` instead                                                                                                                 |
| Syncfusion item `id`                                                                      | Yes       | covered | `key`                                                                                                                                                                                                                                                         |
| Ignite UI `IgxToolActionCheckbox` / `…NumberInput` / `…Radio`                             | Yes       | covered | projection slots take the real `@oge-ui/inputs` controls, which are richer than a toolbar-local reimplementation                                                                                                                                              |
| Ignite UI `IgxToolActionIconMenu` (grouping wrapper)                                      | Yes       | covered | `.oge-toolbar-cluster` groups controls on the bar; the overflow menu groups what does not fit                                                                                                                                                                 |
| **Fitting math as a testable pure function**                                              | No        | Done    | OGE extra: `fitToolbarItems()` in `@oge-ui/core` — the reference toolbars bury this in DOM code, where it can only be tested through a browser                                                                                                                |
| **Toggle state on a toolbar button**                                                      | No        | Done    | OGE extra: `active` renders `aria-pressed` on the bar and a checkmark (`menuitemcheckbox`) on the menu row — dx needs a `dxButton` with `options` for this                                                                                                    |
| **One toolbar behind the grid, the tree list and your app**                               | No        | Done    | OGE extra: `<oge-grid>` and `<oge-tree-list>` render this component, so their command bars gained the overflow menu and the APG keyboard model in the same change                                                                                             |
| **Per-item `overflowPriority`**                                                           | No        | Done    | OGE extra: every reference toolbar drops strictly from the end of the row, so keeping a primary command means reordering the bar. A numeric priority decides yield order independently of position; equal priorities reproduce the reference behavior exactly |
| **Icons survive the collapse into the overflow menu**                                     | partial   | Done    | dx renders menu icons, Kendo/PrimeNG/Material have no overflow menu at all. `showIcon` resolves separately for the bar and the menu row (`'onBar'` / `'inMenu'`), and one icon anywhere gives every row an icon column so labels stay aligned                 |
| **Style and item measurement kept off the resize path**                                   | No        | Done    | OGE extra: a drag-resize reads only the container box — `getComputedStyle` and the per-item layout reads run on content/density changes instead, and notifications coalesce to one pass per frame (locked in by `toolbar-perf.spec.ts`)                       |

## Card (`@oge-ui/layout`) — Feature Parity

`OgeCard` against Angular Material `MatCard`, Kendo `CardComponent`, PrimeNG
`Card` — and **no DevExtreme column to fake**: DevExtreme ships no single-card
container. Its `dxCardView` (v24+) is a _data-collection_ view — the grid
family's card-layout sibling, with columns, a toolbar and methods — and its
Tile View / Drawer are equally not this component, so rows below cite the three
references that actually have one (the Kendo-Wizard rule: absence is written
down, not painted over).

**There is no WAI-ARIA card pattern** — no APG entry, no ARIA role, no `<card>`
element. That absence is a design input, the same way it was for the drawer and
the stepper. It means the card must stay a plain container: no role of its own
(PrimeNG draws the same conclusion; the consumer adds `role="article"` for an
independently distributable piece of content, or `role="region"` + a label for
a page landmark, and most cards correctly carry neither), and **no "clickable
card" API**. Wrapping the whole card in an `<a>`/`<button>` is the
`nested-interactive` axe violation as soon as the card contains a second
control, breaks text selection, and reads the entire card contents as one link
name to a screen reader. None of the three references ships such an input
either. The accessible pattern — one primary `<a>` in the content, its hit
area stretched over the card with a CSS pseudo-element — is a documented demo
instead of an API. Related guidance baked into the docs: card collections
belong in `<ul>`/`<li>`, and the heading stays before the media in DOM order
even when the image renders on top.

The retired duplication is the other half of the change, per the toolbar
precedent: the dev-app's hand-rolled card boxes — the playground's four stat
tiles and its feature sidebar, and the five scroll-log/state panels on the
editing, persistence, selection and remote-data pages — now render
`<oge-card>` (the log panels as `stylingMode="filled" size="sm"`, keeping
their e2e hook classes on the host). The docs `app-demo-card` deliberately
stays hand-rolled: it is a tabbed editor frame whose header swaps to VS Code
chrome when the Code tab opens — wrapping it in `OgeCard` would mean
overriding nearly all of the card's chrome, which is costume, not reuse.

The shape is the drawer's, not Material's: **one component, not a sub-component
army**. Material needs eleven directives; here the sections are attribute slots
(`[ogeCardMedia]`, `[ogeCardActions]`, `[ogeCardFooter]`, `[ogeCardAvatar]`,
`[ogeCardHeaderActions]`, `[ogeCardSeparator]`) and everything else projected
is the content. Unlike the drawer's bare `ng-content` attributes the slots are
minimal host-class directives, because the card must _detect_ a slot to skip
an empty section wrapper — queried with `descendants: false` so a nested
card's slots never leak into the outer header, mirroring what `ng-content
select` projects.

| Feature                                                                                    | Reference | OGE     | Notes                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------ | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mat `appearance: 'raised' \| 'outlined' \| 'filled'`                                       | Yes       | Done    | `stylingMode: 'outlined' \| 'raised' \| 'filled' \| 'flat'` — the house word and the layout family's values plus Material's `raised`; the default is `outlined`, not Material's `raised`, matching every other oge surface                     |
| PrimeNG `header` / `subheader` inputs                                                      | Yes       | Done    | same names on purpose — a `title` input would double as a native tooltip when bound statically                                                                                                                                                 |
| Mat `mat-card-header/title/subtitle` / Kendo `kendoCardTitle/Subtitle`                     | Yes       | covered | the `header`/`subheader` inputs render the title block; richer headers are plain projection — the drawer's call: any markup goes in directly, no template indirection                                                                          |
| Mat `mat-card-content` / Kendo `kendo-card-body`                                           | Yes       | Done    | the default projection **is** the content — no marker element to remember                                                                                                                                                                      |
| Mat `mat-card-actions` (`align: 'start' \| 'end'`) / Kendo `kendo-card-actions` (`layout`) | Yes       | Done    | `[ogeCardActions]` with `align: 'start' \| 'center' \| 'end' \| 'stretched'` — the Kendo superset; Material only has two of the four                                                                                                           |
| Kendo actions `orientation: 'horizontal' \| 'vertical'`                                    | Yes       | Skipped | a vertical button stack inside a card is a layout the consumer's own flex rule expresses in one line                                                                                                                                           |
| Kendo actions `actions: CardAction[]` + `action` event                                     | Yes       | Skipped | deliberate — real projected buttons with real click handlers; a data-driven button bag would re-wrap what `@oge-ui/buttons` already ships (the toolbar's `widget`+`options` call)                                                              |
| Mat `mat-card-footer` / Kendo `kendo-card-footer`                                          | Yes       | Done    | `[ogeCardFooter]` — a divided strip on the header surface, for metadata rather than commands                                                                                                                                                   |
| Mat `[mat-card-image]` + `sm/md/lg/xl` variants / Kendo `kendo-card-media`                 | Yes       | Done    | `[ogeCardMedia]`, full-bleed; sized by consumer CSS (`aspect-ratio`, `block-size`) instead of four fixed-size directives                                                                                                                       |
| Mat `[mat-card-avatar]`                                                                    | Yes       | Done    | `[ogeCardAvatar]` — the round header image before the titles                                                                                                                                                                                   |
| Mat `mat-card-title-group`                                                                 | Yes       | covered | titles + header actions + avatar already compose the same row; a dedicated grouping component would exist only to exist                                                                                                                        |
| Kendo `orientation: 'horizontal' \| 'vertical'`                                            | Yes       | Done    | `orientation`, Material has no counterpart; horizontal is a two-column grid with the media spanning the inline-start column                                                                                                                    |
| Kendo `width` (default `'285px'`)                                                          | Yes       | Skipped | deliberate — size is the parent layout's job; a card that defaults to 285px fights every grid it is dropped into                                                                                                                               |
| Kendo `kendo-card-separator` (`orientation`)                                               | Yes       | Done    | `[ogeCardSeparator]` on an `<hr>` — full-bleed inside the padded content; the vertical variant falls with actions `orientation` above                                                                                                          |
| PrimeNG `style` / `styleClass`                                                             | Yes       | covered | plain `class`/`style` on the host — an Angular component element takes them directly                                                                                                                                                           |
| DevExtreme single-card container                                                           | —         | —       | does not exist: `dxCardView` is a data-collection view (the grid family's concern), Tile View is a tiled scroller — neither is a content surface, so there is nothing to match                                                                 |
| No enforced role (PrimeNG)                                                                 | Yes       | Done    | no `role`, no `tabindex`; consumer-set `role="article"` / `role="region"` passes through untouched, locked in by `card-parity.spec.ts`                                                                                                         |
| Clickable-card input                                                                       | No        | covered | none of the references has one, and neither does this — the `nested-interactive` trap; the accessible stretched-link pattern is a documented demo instead                                                                                      |
| Config provider                                                                            | partial   | Done    | `provideOgeCardConfig()` carries `stylingMode` and `orientation`. **No messages block, deliberately**: the card renders no user-facing string and no interactive chrome — the first string to appear must bring the messages interface with it |
| **`flat` chrome preset**                                                                   | No        | Done    | OGE extra: a border-less, background-less card for nesting inside another surface — the accordion/toolbar `stylingMode` vocabulary completed                                                                                                   |
| **Empty sections render nothing**                                                          | No        | Done    | OGE extra: the header row appears only when titles, an avatar or header actions exist, and an empty content wrapper hides itself — Material renders whatever empty elements you leave in                                                       |
| **Card elevation as a theme token**                                                        | No        | Done    | OGE extra: `raised` rests on `--oge-shadow-card` (dark theme overrides it), so an app re-themes elevation without touching the component                                                                                                       |
| **`size` density preset**                                                                  | No        | Done    | OGE extra: `'sm' \| 'md' \| 'lg'` — the accordion/toolbar density vocabulary; scales padding and type ramp together, `--oge-card-pad` is the per-card escape hatch. No reference card has density at all                                       |
| **`severity` status rail**                                                                 | No        | Done    | OGE extra: the toast's inline-start rail idiom on a static surface (`accent`/`success`/`warning`/`danger` from the shared severity tokens) — a status card without hand-rolled CSS                                                             |
| **`interactive` visual lift**                                                              | No        | Done    | OGE extra: hover/focus-within elevation and ring for the stretched-link pattern — visual only, no role/tabindex/wrapper, so it cannot recreate the nested-interactive trap; honours `prefers-reduced-motion`                                   |
| **`loading` skeleton state**                                                               | No        | Done    | OGE extra: shimmer lines replace content and actions under `aria-busy`, header/media/footer keep the footprint — the accordion `contentLoader` skeleton, without the loader machinery                                                          |

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

## Drawer (`@oge-ui/navigation`) — Feature Parity

`OgeDrawer` against DevExtreme `dxDrawer`, Kendo `DrawerComponent`, Angular
Material `MatDrawer`/`MatSidenav` and PrimeNG `Drawer`.

**There is no WAI-ARIA APG "drawer" pattern**, and that is the whole story of
this component. The APG says to mark a surface modal _only_ when background
interaction is actually blocked; otherwise it is a landmark. A drawer is
therefore two different widgets wearing one name, and every reference library
gets the split wrong in a different direction:

- **Material** emits no `role` at all, never emits `aria-modal` even in `over`
  mode where it genuinely is modal, and never applies `inert` — under-labelled.
- **PrimeNG** emits `role="complementary"` _and_ `aria-modal="true"` at the same
  time and always traps focus, with no persistent mode at all — mis-labelled.
- **DevExtreme** ships no ARIA, no keyboard model, and not even an
  `opened`/`closed` event (only `onOptionChanged`).
- **Kendo** documents keyboard/ARIA support but is horizontal-only.

So modality here is **derived from `mode`** and is not separately configurable:
`overlay` and `push` cover or displace the content and are dialogs; `side`
shares the row and is a landmark. An independent `modal` flag is precisely the
API shape that produces PrimeNG's contradiction.

Mode naming maps as: our `overlay` = dx `overlap` = Kendo/PrimeNG `overlay` =
Material `over`; our `push` = dx `push` = Material `push`; our `side` = dx
`shrink` = Kendo `push` = Material `side`.

| Feature                                                      | Reference | OGE     | Notes                                                                                                                                                                                                               |
| ------------------------------------------------------------ | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `opened` / `visible` / `expanded` two-way                    | Yes       | Done    | `[(opened)]`                                                                                                                                                                                                        |
| `openedStateMode` / `mode`                                   | Yes       | Done    | `mode: 'overlay' \| 'push' \| 'side'` — all three, which only dx also offers                                                                                                                                        |
| `position` left/right                                        | Yes       | Done    | `'start' \| 'end'`, logical so it mirrors in RTL                                                                                                                                                                    |
| `position` top/bottom                                        | partial   | Done    | dx and PrimeNG only; Kendo and Material are horizontal-only                                                                                                                                                         |
| dx `position: 'before' \| 'after'` (RTL-aware)               | Yes       | covered | `start`/`end` **are** the logical names — there is no second physical set to disambiguate                                                                                                                           |
| `minSize` / Kendo `mini` + `miniWidth`                       | Yes       | Done    | one `minSize` input covers both spellings; scoped to `side`, because a rail belongs to the layout and a half-visible modal is not closed                                                                            |
| `maxSize` (dx)                                               | Yes       | covered | `size` is the open size; dx needs two because `minSize`/`maxSize` are its only sizing model                                                                                                                         |
| `width` / `height`                                           | Yes       | Done    | `size`, resolved along whichever axis `position` selects                                                                                                                                                            |
| `shading` / `modal` / `hasBackdrop`                          | Yes       | Done    | `shading`; ignored for `side`, which never shades content it shares the row with                                                                                                                                    |
| `closeOnOutsideClick` / `dismissible` / backdrop click       | Yes       | Done    | `closeOnBackdropClick`; only a press that _started_ on the backdrop counts, so a drag ending there does not close it                                                                                                |
| dx `closeOnOutsideClick` as a predicate                      | Yes       | covered | `closing` is cancelable and `closeGuard` takes a function — both strictly more expressive than a boolean-or-predicate option                                                                                        |
| `closeOnEscape`                                              | Yes       | Done    | and only when topmost: a popup opened inside the drawer closes first, through overlay's shared stack                                                                                                                |
| `disableClose` (Material)                                    | Yes       | covered | `closeOnEscape` + `closeOnBackdropClick`, so the two paths are independently controllable                                                                                                                           |
| `blockScroll` / body scroll lock                             | Yes       | Done    | `scrollLock`, on overlay's ref-counted lock, so nested surfaces cannot unlock each other                                                                                                                            |
| `animationEnabled` / `animation: false`                      | Yes       | Done    | `animationEnabled`                                                                                                                                                                                                  |
| `animationDuration` / `animation.duration`                   | Yes       | Done    | `animationDuration`                                                                                                                                                                                                 |
| dx `revealMode: 'expand'`                                    | Yes       | covered | `side` already grows the panel in place; `expand` is dx's way of getting that inside an overlay, which is a different component in our model                                                                        |
| `open()` / `close()` / `toggle()`                            | Yes       | Done    | all three; `toggle(force?)` also takes Kendo's explicit target state, so a router or media-query subscription need not read the current one first                                                                   |
| `disabled` (dx)                                              | Yes       | Done    | blocks every open/close gesture while leaving an open drawer usable; the `compact` downgrade is exempt, since that is the component reacting to its own container rather than a user gesture                        |
| Promise-returning `show`/`hide`/`toggle` (dx, Material)      | Yes       | Skipped | the promise reports "animation ended", which `prefers-reduced-motion` makes meaningless; `afterOpened`/`closed` fire on a render hook so they arrive for every user                                                 |
| `openedChange` / `expandedChange`                            | Yes       | Done    | the `opened` model's own change output                                                                                                                                                                              |
| `opened`/`closed`, `expand`/`collapse` events                | partial   | Done    | `afterOpened` + `closed`; dx has none of these                                                                                                                                                                      |
| `openedStart` / `closedStart` (Material)                     | Yes       | covered | `opening`/`closing` fire before anything happens, and are cancelable as well                                                                                                                                        |
| `backdropClick` (Material)                                   | Yes       | covered | `closing` carries `reason: 'backdrop'` — one event with a reason instead of one event per source                                                                                                                    |
| `autoFocus` (Material)                                       | Yes       | Done    | `'first-tabbable' \| 'panel' \| 'none' \| <selector>`, and `[autofocus]` always wins                                                                                                                                |
| Focus restore on close                                       | Yes       | Done    | `restoreFocus`, and only when focus would otherwise be orphaned — it never steals a target the user moved to                                                                                                        |
| Focus trap in modal modes                                    | partial   | Done    | Material traps in `over`/`push`, PrimeNG always traps; ours traps exactly when it is a dialog, reusing overlay's trap rather than a second copy                                                                     |
| `autoCollapse` (Kendo)                                       | Yes       | covered | the app closes the drawer in its own click handler; a built-in flag would fight router-driven navigation                                                                                                            |
| `items` + `itemTemplate` + preventable `select` (Kendo)      | Yes       | covered | the drawer is a container: project `<oge-tree-view>` from the same package, which brings hierarchy, search, lazy loading and tri-state checkboxes Kendo's `DrawerItem` cannot                                       |
| `isItemExpanded` / hierarchical items (Kendo)                | Yes       | covered | same — that is the tree view's job                                                                                                                                                                                  |
| header / footer / item templates (Kendo, PrimeNG)            | Yes       | covered | the panel is plain projection, so any markup goes in directly with no template indirection                                                                                                                          |
| `showCloseIcon` (PrimeNG)                                    | Yes       | Done    | `showCloseButton`, labelled from `messages.close` and placed with logical properties so it lands correctly for all four edges                                                                                       |
| `fullScreen` (PrimeNG)                                       | Yes       | covered | `size: '100%'`                                                                                                                                                                                                      |
| `appendTo` / `baseZIndex` / `autoZIndex` (PrimeNG)           | Yes       | Skipped | the drawer renders where declared and layers on `--oge-z-drawer`; ordering comes from the shared overlay stack, not from z-index arithmetic                                                                         |
| `fixedInViewport` / `fixedTopGap` (Material `MatSidenav`)    | Yes       | Skipped | a viewport-fixed panel is page layout, not a component concern; the host is positioned by its own container                                                                                                         |
| `autosize` (Material container)                              | Yes       | covered | the panel is a flex track, so it tracks its content without a remeasure flag                                                                                                                                        |
| Content margin/shift arithmetic (Material container)         | Yes       | covered | CSS grid/flex plus `translate` — no measured inline margins to recompute                                                                                                                                            |
| `elementAttr` / `style` / `styleClass`                       | Yes       | covered | plain class and style bindings on the host                                                                                                                                                                          |
| RTL (dx `rtlEnabled`)                                        | Yes       | covered | logical properties throughout — no `rtlEnabled` flag in new code                                                                                                                                                    |
| `MAT_*`-style app defaults                                   | Yes       | Done    | `provideOgeDrawerConfig()`; every user-facing string in `OgeDrawerMessages`                                                                                                                                         |
| **Modality derived from mode, not a separate flag**          | No        | Done    | OGE extra: `overlay`/`push` are `role="dialog"` + `aria-modal` + trap + Escape + `inert`; `side` is a landmark with none of them. PrimeNG emits `complementary` _and_ `aria-modal` together; Material emits neither |
| **`inert` on the background of a modal drawer**              | No        | Done    | OGE extra: none of the four references applies `inert`, so Tab and assistive tech can still reach the page behind them                                                                                              |
| **One component instead of a container/drawer/content trio** | No        | Done    | OGE extra: the panel is the `[ogeDrawerPanel]` slot and everything else projected is the content — Material and Kendo both need three cooperating components                                                        |
| **Responsive to its own container, not the window**          | partial   | Done    | OGE extra: `compactBelow` measures the drawer's own box, so a drawer inside a dialog or a split pane adapts to the room it has; dx and Kendo watch the window                                                       |
| **The mode decision is a pure, DOM-free function**           | No        | Done    | OGE extra: `resolveDrawerMode()` in `@oge-ui/core`, unit-tested without a browser — the references bury this in DOM code                                                                                            |
| **Async `closeGuard` with veto semantics**                   | No        | Done    | OGE extra: `false`, a throw and a rejection all veto; a promise reports `closePending` and a second gesture meanwhile is dropped                                                                                    |
| **Shares one Escape stack with every other OGE overlay**     | No        | Done    | OGE extra: a popup opened inside the drawer closes before the drawer, because both register with the same stack rather than each running their own                                                                  |

## Stepper (`@oge-ui/navigation`) — Feature Parity

`OgeStepper` against Angular Material `MatStepper`/`CdkStepper`, Kendo
`StepperComponent` and PrimeNG `p-stepper`.

**Two findings from the reference sweep shaped this component.**

First, **Kendo UI for Angular has no Wizard**. `components/layout/wizard/` and
`api/WizardComponent/` both return 404, the Layout API index lists zero Wizard
entries, and Telerik's own forum answer recommends composing a Stepper with a
TabStrip. Kendo's Wizard exists in jQuery, ASP.NET and Blazor only. So the
"wizard" column that would be natural to expect simply has no Angular referent,
and Kendo's Stepper is an **indicator only** — it hosts no panels at all.

Second, **there is no WAI-ARIA APG pattern for a stepper**, and the libraries
diverge sharply because of it. Angular Material's role **changes with the
orientation**: horizontal renders `role="tablist"` / `tab` / `tabpanel` with a
roving tabindex, vertical renders `button` + `aria-current="step"` +
`role="region"`. The same widget therefore presents itself to a screen reader
as two different things depending on a layout choice, and its own
`stepper.md` still describes the whole component as a tablist — the docs
contradict the template. PrimeNG uses `tablist`/`tab`/`tabpanel` unconditionally.

OGE picks **one semantic for both orientations**: an ordered list of `<button>`
headers carrying `aria-current="step"`, with each body a `role="region"`
labelled by its header. ARIA 1.2 defines the `step` token for exactly this
("a link within a step indicator for a step-based process"), and a tablist
claims panels may be browsed freely — which is precisely what `linear` exists
to forbid. Because the headers are buttons in a list rather than tabs, they all
stay in the Tab sequence (the accordion pattern) and arrow/Home/End are an
opt-in enhancement that deliberately does **not** wrap.

| Feature                                                    | Reference | OGE     | Notes                                                                                                                                                                                        |
| ---------------------------------------------------------- | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `selectedIndex` / `currentStep` / `value` two-way          | Yes       | Done    | `[(activeIndex)]`                                                                                                                                                                            |
| Select by key                                              | No        | Done    | OGE extra: `[(activeKey)]`, and it wins over the index on first run                                                                                                                          |
| `orientation` horizontal/vertical                          | Yes       | Done    | `orientation`                                                                                                                                                                                |
| `linear`                                                   | Yes       | Done    | `linear`; default `false` like Material and PrimeNG (Kendo defaults it `true`)                                                                                                               |
| `stepType` (Kendo) / label position (Material)             | Yes       | Done    | `display: 'full' \| 'label' \| 'indicator'` — Kendo's three values; Material's `labelPosition` is styling, and stays styling here                                                            |
| Declarative steps                                          | Yes       | Done    | `<oge-step>`                                                                                                                                                                                 |
| Data-driven steps                                          | Yes       | Done    | `[steps]`, merged **after** the declarative children — one component does both, where PrimeNG is projection-only and Kendo is array-only                                                     |
| Step `label` / `text`                                      | Yes       | Done    | `label`                                                                                                                                                                                      |
| Step `description` / sub-label                             | partial   | Done    | Material has `errorMessage` only; a neutral second line is ours                                                                                                                              |
| Step icon (`icon` / `svgIcon` / `iconClass`)               | Yes       | Done    | `icon` (SVG path data) and `iconClass` (icon-font hook), matching the suite's dependency-free convention                                                                                     |
| `optional`                                                 | partial   | Done    | Material and Kendo only; PrimeNG has none. Rendered as a labelled sub-line and wired through `aria-describedby`                                                                              |
| `disabled` per step                                        | Yes       | Done    | `disabled`                                                                                                                                                                                   |
| `editable` (Material)                                      | Yes       | Done    | `editable: false` blocks going _back_ into a step, and reports `stepBlocked` with `reason: 'editable'`                                                                                       |
| `completed` override (Material)                            | Yes       | Done    | `completed`                                                                                                                                                                                  |
| `hasError` / `isValid` / `validate`                        | Yes       | Done    | `invalid`; the error state outranks `done`, so a completed step that later fails still reads as needing attention                                                                            |
| `errorMessage` (Material)                                  | partial   | Done    | Material only; Kendo and PrimeNG have no per-step message. Ours replaces the description while invalid, so two sub-lines never compete                                                       |
| Indicator states (`number`/`edit`/`done`/`error`)          | Yes       | Done    | `OgeStepState = 'number' \| 'active' \| 'done' \| 'error'`, exported as a union and proven rendered by a spec. `'edit'` is dropped — it encodes _editability_, which `editable` already says |
| `STEPPER_GLOBAL_OPTIONS.showError` (Material)              | Yes       | Skipped | Material needs a global opt-in because its error state is inferred; ours is an explicit `invalid` input, so there is nothing to gate                                                         |
| `stepControl` (Material)                                   | Yes       | covered | the stepper stays form-agnostic; `<oge-form-steps>` binds `completed`/`invalid` from the form's own per-step error rollup, in **all three** binding modes                                    |
| `matStepperNext` / `matStepperPrevious`                    | partial   | Done    | `[ogeStepperNext]` / `[ogeStepperPrevious]`; Kendo and PrimeNG ship no such directives                                                                                                       |
| Built-in Back / Next bar                                   | No        | Done    | OGE extra: `showNavigation` — **none** of the three references renders navigation buttons, so every one of them makes you hand-roll a wizard's most predictable part                         |
| `next()` / `previous()` / `reset()`                        | Yes       | Done    | all three, plus `goTo(index \| key)`                                                                                                                                                         |
| `selectionChange` / `activate` / `currentStepChange`       | Yes       | Done    | `stepChanged` + the model's own change output                                                                                                                                                |
| Cancelable activation                                      | partial   | Done    | Kendo's `activate` + `preventDefault()` only; ours is `stepChanging` with `cancel`, the house idiom                                                                                          |
| `validateSteps()` (Kendo)                                  | Yes       | covered | validity is an input, so it re-derives on its own — an imperative re-check would only exist to work around not being reactive                                                                |
| Lazy step content (`matStepContent`)                       | partial   | Done    | `deferRendering` + `keepAlive`, the same pair the tabs and accordion use                                                                                                                     |
| `animationDuration` / `transitionOptions` / `animation`    | Yes       | covered | transitions are CSS on `--oge-stepper-transition`, and suppressed under `prefers-reduced-motion` — a JS duration cannot honour that                                                          |
| Custom templates (indicator / label / step)                | Yes       | Done    | `[ogeStepIndicatorTemplate]`, `[ogeStepHeaderTemplate]`, `[ogeStepContentTemplate]`                                                                                                          |
| `MatStepperIntl` / `kendo-stepper-messages`                | Yes       | Done    | `provideOgeStepperConfig()`; every user-facing string in `OgeStepperMessages`                                                                                                                |
| `disableRipple`, `color`, `dt`/`unstyled`/`pt`             | Yes       | Skipped | ripples and per-instance style bags are not this suite's theming model — the `--oge-*` tokens are                                                                                            |
| `p-step-item` (vertical grouping)                          | Yes       | covered | vertical mode already renders each body under its own header                                                                                                                                 |
| Keyboard: arrows + Home/End                                | Yes       | Done    | opt-in `keyboardNavigation`, focus-only (manual activation), and **non-wrapping**                                                                                                            |
| Roving tabindex                                            | Yes       | Skipped | correct for a tablist, wrong here: the headers are buttons in a list, so removing them from the Tab sequence would hide reachable controls for no gain                                       |
| RTL                                                        | Yes       | covered | logical properties throughout; the arrow keys resolve direction at keypress                                                                                                                  |
| **One ARIA semantic in both orientations**                 | No        | Done    | OGE extra: Material swaps `tablist`↔`aria-current` with the orientation and its docs contradict its template; a stepper is a process in either direction                                     |
| **`aria-current="step"`, the token ARIA defines for this** | partial   | Done    | Material emits it in vertical mode only; PrimeNG never does                                                                                                                                  |
| **`stepBlocked` says _why_ a move was refused**            | No        | Done    | OGE extra: `'linear' \| 'editable' \| 'guard' \| 'disabled'`. Material refuses **silently** — its own docs tell you to add a live region yourself                                            |
| **Async `stepGuard` with veto semantics**                  | No        | Done    | OGE extra: `false`, a throw and a rejection all veto; a promise reports `changePending` and a second gesture meanwhile is dropped. It gates the finish, too                                  |
| **Nav buttons work from outside the component**            | No        | Done    | OGE extra: `[ogeStepperNext]="wizard"` takes an explicit target; Material's directives only work inside the stepper                                                                          |
| **Per-step touched on advance (`<oge-form-steps>`)**       | No        | Done    | OGE extra: leaving step 1 touches only step 1, so the steps ahead stay quiet — the reason a naive wizard paints every later step red                                                         |

## Progress & Loading (`@oge-ui/layout`) — Feature Parity

`OgeProgressBar` + `OgeLoadIndicator` + `OgeSkeleton` against DevExtreme
`dxProgressBar`/`dxLoadIndicator`, Kendo `ProgressBar`/`ChunkProgressBar`/
`Loader`/`Skeleton`, PrimeNG `p-progressBar`/`p-progressSpinner` and Angular
Material `progress-bar`/`progress-spinner`.

**There is no APG progressbar pattern** — the patterns index carries only the
related **Meter** pattern, whose own words draw the line these docs repeat:
"the meter should not be used to indicate progress… use the progressbar role
instead" — and the inverse: a current measurement within a known range
(battery, disk usage) is a meter, not a progressbar. The ARIA contract comes
from the role definition: `aria-valuenow` in the determinate state and
**omitted entirely when indeterminate** (never a sentinel — most references
pin `0`), a required accessible name, `aria-busy` on the loading region. MDN
recommends native `<progress>` where it suffices; these components exist for
the styled, token-driven cases, and the docs say so.

| Feature                                                      | Reference | OGE     | Notes                                                                                                                                                                                      |
| ------------------------------------------------------------ | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `min` / `max` / `value`                                      | Yes       | Done    | dx/Material/PrimeNG's 0/100 defaults (Kendo agrees)                                                                                                                                        |
| Indeterminate (`value: false`, dx; `mode`, PrimeNG/Material) | Yes       | Done    | `value: null` — the honest house type for dx's `value: false`; no separate mode input, the value's own shape says it                                                                       |
| `statusFormat(ratio, value)` (dx) / label `format` (Kendo)   | Yes       | Done    | `showLabel` + `formatLabel(value, ratio)` — house argument order; feeds the visible label **and** `aria-valuetext`, so display and announcement never diverge                              |
| Kendo label `position` start/center/end                      | Yes       | Skipped | one label position is the design system's job; the label sits at the end with tabular numerals                                                                                             |
| Material `buffer` + `bufferValue`                            | Yes       | Done    | `bufferValue` — the soft second layer behind the primary fill (media pre-loading)                                                                                                          |
| Material `query`                                             | Yes       | Skipped | the "not yet measurable" phase IS the indeterminate state; a reversed animation is a styling difference, not a semantic one                                                                |
| Kendo `ChunkProgressBar` (`chunkCount: 5`)                   | Yes       | Done    | `chunkCount` input on the same component — a segmented render mode, not a second widget                                                                                                    |
| Kendo `orientation: vertical` / `reverse`                    | Yes       | Skipped | single-reference features; `reverse`'s legitimate use is RTL, which the logical-properties + `transform-origin` recipe already mirrors                                                     |
| PrimeNG `unit` / `color`, Kendo css hooks                    | Yes       | covered | `formatLabel` subsumes `unit`; colors are `severity` on the token palette, not per-instance style bags                                                                                     |
| `onComplete` (dx)                                            | Yes       | Done    | `completed` — once per arrival at `max`, silent while staying there, re-armed by a reset; locked in by `progress-bar.spec.ts`                                                              |
| Kendo `animation {duration}` / `animationEnd` (Material)     | Yes       | covered | value changes glide on token transitions (transform-driven, the toast recipe — no layout work per frame); an end event for a css transition would be a lie under `prefers-reduced-motion`  |
| Load indicator: indeterminate-only ring                      | Yes       | Done    | dx, Kendo and PrimeNG spinners all are; Material's determinate spinner is Skipped — a circle filling toward completion is the progress bar's job                                           |
| Kendo Loader `type` (3 animations) / dx `indicatorSrc`       | Yes       | Skipped | a design system speaks one spinner; image/animation swaps are token and CSS work, not inputs                                                                                               |
| Loader `size` / Material `diameter`+`strokeWidth`            | Yes       | Done    | `size: 'sm' \| 'md' \| 'lg'` (16/24/32) plus `inheritSize` — the `1em` inside-a-button case the suite's own button spinner proved                                                          |
| Kendo Skeleton `shape` / `animation`                         | Yes       | Done    | same unions; `shimmer` canonicalizes the card/accordion gradient recipe (PrimeNG's `wave` maps here too), `pulse` the grid filler rows' beat, `none` a static block                        |
| Skeleton `width`/`height` (Kendo; PrimeNG `size`)            | Yes       | Done    | numbers mean pixels, strings pass through; PrimeNG's square `size` shorthand is the same pair set once                                                                                     |
| PrimeNG Skeleton `borderRadius`                              | Yes       | covered | the shape unions carry the radius (`--oge-radius` / 50%); a per-instance radius string is CSS on the host, not an input                                                                    |
| `hint` (dx, both widgets)                                    | Yes       | covered | the host element passes a plain `title` attribute through natively — no input needed                                                                                                       |
| dx editor/validation surface (`isValid`, `validationError`)  | Yes       | Skipped | a progressbar displays progress; it is not a form editor, and dx only carries that surface because its widget base does                                                                    |
| **Skeleton `lines`**                                         | No        | Done    | OGE extra: a tapered multi-line text stack in one input — the exact card/accordion placeholder pattern, ready for their adoption; no reference skeleton composes lines                     |
| **`aria-valuenow` omitted when indeterminate**               | No        | Done    | OGE extra: the ARIA rule most references miss — locked in by `progress-bar.spec.ts` and `load-indicator.spec.ts`                                                                           |
| **Reduced motion slows, never freezes, indeterminates**      | No        | Done    | OGE extra: a frozen bar or ring reads as finished; determinate transitions and skeletons stop, indeterminate animations halve their speed — the drop-down button's precedent, now the rule |
| **Severity vocabulary**                                      | partial   | Done    | `'accent' \| 'success' \| 'warning' \| 'danger'` on bar and ring — the card/toast palette; references offer raw color strings instead                                                      |

**Loading-visual adoption.** The suite drew these by hand before the trio
existed. This change canonicalizes the recipes and fixes what the sweep found
(grid's `.oge-spinner` had no reduced-motion rule; grid's filler-row class
became `.oge-grid-skeleton` so the canonical component owns `.oge-skeleton`).
Migrating the surfaces themselves is deliberate follow-up work, not silence:

| Surface                                                                               | Verdict                                                                                                                                      |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| grid / tree-list / pivot `.oge-spinner` + `.oge-load-panel`                           | adopt `OgeLoadIndicator` next — one class already shared across three packages, purely presentational                                        |
| modal busy veil, toast loading spinner, tree-view lazy rows, accordion pending header | adopt — same ring at 28/16/12/14px; `size`/`inheritSize` cover all four                                                                      |
| button + drop-down `1em` SVG-arc spinners                                             | adopt via `inheritSize` — low priority, em-scaling and the drop-down's slow-not-stop reduced-motion already match the canonical behavior     |
| card + accordion skeleton blocks                                                      | adopt `OgeSkeleton` — the shimmer recipe now lives there; the accordion keeps its `role="status"` wrapper (the region owns the announcement) |
| grid `.oge-grid-skeleton` filler rows                                                 | keep ad hoc — per-cell sizing in the virtual-scroll hot path, and the only one with a theme token                                            |
| toast progress bar                                                                    | keep ad hoc — deeply coupled to timer pause/resume and rAF arming; its `transform: scaleX()` recipe is what `OgeProgressBar` was built from  |

## Menubar (`@oge-ui/navigation`) — Feature Parity

`OgeMenubar` against DevExtreme `dxMenu`, Kendo UI for Angular `kendo-menu` and
PrimeNG `p-menubar`, with the **WAI-ARIA APG menubar pattern as the backbone**
of the keyboard and ARIA rows — this component, unlike the card or the stepper,
has a real APG pattern to conform to.

**Angular Material has no menubar.** `MatMenu` is a button-triggered dropdown
panel, not a persistent horizontal bar — there is nothing to map a menubar row
to (the dxCardView rule: absence is written down, not painted over). The CDK
does ship unstyled directives (`cdkMenuBar` / `cdkMenu` / `cdkMenuItem` /
`cdkMenuTriggerFor`), so where a "Material" comparison would be natural the CDK
is the referent instead.

The APG's editorial position is also written into the docs page rather than
hidden: a menubar is **rarely the right pattern for site navigation** — a
`<nav>` of links, optionally with the disclosure pattern, needs none of this
keyboard machinery. `role="menubar"` is for application-style command menus,
and the docs open by saying so.

The submenu machinery was **built once, in the overlay package**: the canonical
`OgeMenuItem` gained an additive `items` field and `oge-menu-list` now opens
nested levels itself (one `OgeAnchoredPanel` per level on the shared Escape
stack, `'escape'`/`'back'` absorbed per level, `'select'`/`'tab'` chained to
the root owner). The grid's context menus, the drop-down button and the
toolbar's overflow menu all inherit nesting from the same change — locked in by
`menu-list-submenu.spec.ts`.

| Feature                                                         | Reference | OGE     | Notes                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `items` / `dataSource` tree                                     | Yes       | Done    | `items: OgeMenubarItemData[]` — the canonical overlay `OgeMenuItem` narrowed recursively; no separate `dataSource`/expr layer, data shaping belongs to the application                                                                                                                                                                           |
| Declarative items (`kendo-menu-item`, PrimeNG none)             | partial   | Done    | nestable `<oge-menubar-item>` children, merged **before** `items` — the house both-APIs rule; DevExtreme and PrimeNG are array-only                                                                                                                                                                                                              |
| Nested submenus at any depth                                    | Yes       | Done    | `items` on any item, rendered by the shared `oge-menu-list` recursion — the same list the grid's context menu uses                                                                                                                                                                                                                               |
| `orientation` `'horizontal' \| 'vertical'` (dxMenu)             | Yes       | Done    | `orientation`; vertical keeps `role="menubar"` + `aria-orientation="vertical"` with swapped arrow axes, as the APG allows. Kendo's `vertical` and PrimeNG's CSS-only vertical map here                                                                                                                                                           |
| `showFirstSubmenuMode` onClick/onHover + delay (dxMenu)         | Yes       | Done    | `openMode: 'click' \| 'hover'` + `hoverDelay` (Kendo's 100 ms default) — applied to the **top level only**                                                                                                                                                                                                                                       |
| `showSubmenuMode` for nested levels (dxMenu)                    | Yes       | covered | nested levels always open on hover (overlay config `menuShowDelayMs`/`menuHideDelayMs`, DevExtreme's 50/300 defaults) and on ArrowRight/Enter — behavior, not a second input                                                                                                                                                                     |
| Kendo `openOnClick.toggle` `'select' \| 'leave' \| 'click'`     | Yes       | covered | `'select'` is the built-in close-on-select; `'click'` is `openMode: 'click'`; `'leave'` is the deliberately dropped hover-out close below                                                                                                                                                                                                        |
| `hideSubmenuOnMouseLeave` (dxMenu, default `false`)             | Yes       | Skipped | matches DevExtreme's own default: menus persist until outside click, Escape or select — the Windows-menu convention. A knob to leave that convention buys ambiguity, not capability                                                                                                                                                              |
| PrimeNG `autoDisplay`                                           | Yes       | covered | once a root menu is open, hovering siblings switches without a click — in both open modes                                                                                                                                                                                                                                                        |
| `adaptivityEnabled` (dxMenu) / `breakpoint` (PrimeNG)           | Yes       | Done    | `compactBelow` — **container** inline size via ResizeObserver + core's pure `resolveMenubarCompact()`, never the window (PrimeNG's `'960px'` is a media query); the whole bar becomes one hamburger opening the full tree as nested menus, DevExtreme-style                                                                                      |
| `submenuDirection` (dxMenu)                                     | Yes       | covered | `resolvePopupPosition` flips and clamps per level (`'bottom-start'` at the bar, `'right-start'` nested) — an override input would fight the viewport                                                                                                                                                                                             |
| `selectionMode` / `selectByClick` (dxMenu)                      | Yes       | Skipped | a menubar issues commands; persistent selection belongs to the application (`activeKey` covers the marked-current case)                                                                                                                                                                                                                          |
| Item `url` / `linkAttr` (dxMenu, Kendo, PrimeNG)                | Yes       | Done    | `url` renders items as real `<a href>` at the bar **and at every submenu depth** (middle-click and copy-address work; keyboard activation clicks the link, so `preventDefault()` in `itemClick` hands navigation to a router). `routerLink` deliberately absent: no package takes a router dependency, the routed demo shows the two-line wiring |
| PrimeNG `MenuItem.routerLink` + router integration              | Yes       | covered | `activeKey` bound from the URL renders `aria-current="page"`; navigation happens in `itemClick` (hierarchical `path` included) — the tabs family's routed pattern                                                                                                                                                                                |
| Item `icon` / `svgIcon` / `iconClass`                           | Yes       | Done    | `icon` (SVG path data) + `iconClass` (icon-font hook), the suite's dependency-free pair, at every depth via `oge-menu-list`                                                                                                                                                                                                                      |
| Item `disabled` / `visible` / separator                         | Yes       | Done    | `disabled` (exposed via `aria-disabled`, skipped by arrows and type-ahead), `visible: false` prunes the subtree, `separator: true` renders `role="separator"`                                                                                                                                                                                    |
| `beginGroup` (dxMenu)                                           | Yes       | covered | `separator: true` between items expresses the same grouping                                                                                                                                                                                                                                                                                      |
| Item templates (`itemTemplate`, `#item`, Kendo three templates) | Yes       | Done    | `[ogeMenubarItemTemplate]` replaces top-level bar items and `submenuItemTemplate` replaces submenu rows at every depth (the shared `oge-menu-list` context). Kendo's link/content templates have no counterpart — they exist to escape the pattern                                                                                               |
| Widget-level `disabled` (dxMenu)                                | Yes       | Done    | `disabled` — every item goes inert and the bar leaves the Tab sequence, matching dxMenu's non-focusable disabled state                                                                                                                                                                                                                           |
| Item `badge` (PrimeNG)                                          | Yes       | Done    | `badge` on any item — a counter pill on the bar and in menu rows, via the canonical `OgeMenuItem`, so drop-down buttons and context menus gained it too                                                                                                                                                                                          |
| `#start` / `#end` slots (PrimeNG)                               | Yes       | Skipped | that composition is `OgeToolbar`'s job — put the menubar inside a toolbar; a second start/end slot system would exist only to exist                                                                                                                                                                                                              |
| Cancelable `onSubmenuShowing`/`onSubmenuHiding` (dxMenu, Kendo) | Yes       | Done    | `submenuOpening` / `submenuClosing` with the house mutable `cancel` flag (PrimeNG has no cancelable pair at all); plus `submenuOpened` / `submenuClosed` with the close `reason`. Fires for the top-level panel; per-nested-level cancelation is not exposed                                                                                     |
| `onItemClick` / `select`                                        | Yes       | Done    | `itemClick` with `{ item, key, index, path, event }` — `path` is the hierarchical index chain no reference event carries                                                                                                                                                                                                                         |
| Methods (`selectItem`, Kendo `toggle(open, indices)`)           | Yes       | Done    | `open(index \| key)` / `close()` through the cancelable pipeline, plus `focus()`                                                                                                                                                                                                                                                                 |
| Messages / i18n (`MatMenu` none, Kendo messages)                | partial   | Done    | `provideOgeMenubarConfig()`; `OgeMenubarMessages` carries the bar's accessible name and the hamburger label — every user-facing string, aria included                                                                                                                                                                                            |
| APG keyboard: Left/Right, Down/Enter, Up-opens-last, Home/End   | Yes       | Done    | full set incl. the optional Up-focuses-last; locked in by `menubar-keyboard.spec.ts`                                                                                                                                                                                                                                                             |
| APG: Right on a leaf hops to the next bar item, menu open       | partial   | Done    | at **any** depth — the nested lists deliberately let the key bubble; ArrowLeft from a level-1 list hops backwards                                                                                                                                                                                                                                |
| APG: Escape unwinds one level, focus returns to the opener      | Yes       | Done    | per-level absorption in `oge-menu-list`; the shared overlay stack keeps a document Escape away from lower surfaces                                                                                                                                                                                                                               |
| Type-ahead                                                      | partial   | Done    | core's accent-folding `matchByPrefix` on the bar (so `o` matches `Ödeme`), the menu-list buffer inside panels; DevExtreme/PrimeNG have none on the bar                                                                                                                                                                                           |
| Roving tabindex                                                 | Yes       | Done    | the tab-strip idiom — one `tabindex="0"` stop, `aria-haspopup="menu"`/`aria-expanded` on parents, `aria-controls` on the open one                                                                                                                                                                                                                |
| Menu-aim / diagonal pointer tolerance (CDK `CdkTargetMenuAim`)  | partial   | Skipped | the 300 ms hide grace covers the common diagonal path; a trajectory heuristic is real complexity for a marginal gain — revisit only with evidence                                                                                                                                                                                                |
| RTL                                                             | Yes       | covered | arrow meanings resolve against `direction` at keypress, placement flips in `resolvePopupPosition`, carets mirror in CSS                                                                                                                                                                                                                          |
| **Container-width hamburger, not a media query**                | No        | Done    | OGE extra: `compactBelow` measures the menubar's own box — a bar inside a split pane adapts to the room it actually has; `compactChanged` reports the flip                                                                                                                                                                                       |
| **Hierarchical `path` in every event payload**                  | No        | Done    | OGE extra: `itemClick`/`submenu*` carry the index chain from the bar down — no reference event says _where_ in the tree its item lives                                                                                                                                                                                                           |
| **Nesting shipped to every `oge-menu-list` owner**              | No        | Done    | OGE extra: grid/tree-list context menus and the drop-down button gained submenu support from the same additive overlay change, with zero consumer code churn                                                                                                                                                                                     |
| **`shortcut` accelerator hints + `aria-keyshortcuts`**          | No        | Done    | OGE extra: no reference menu renders accelerator text at all — a menubar-defining affordance (right-aligned hint, announced on the row; display only, the application owns the binding), locked in by `menu-list.spec.ts`                                                                                                                        |

## Breadcrumb (`@oge-ui/navigation`) — Feature Parity

`OgeBreadcrumb` against Kendo UI for Angular `kendo-breadcrumb` and PrimeNG
`p-breadcrumb`, with the **WAI-ARIA APG breadcrumb pattern as the backbone** —
one of the few APG patterns whose keyboard section is literally
"Not applicable", which is itself a parity decision: crumbs are plain links in
the Tab order and **no roving tabindex is invented** (the ARCHITECTURE rule
that not every APG pattern uses tab-strip focus machinery, applied verbatim).

**Two references do not have the component at all.** DevExtreme ships no
Breadcrumb widget — verified against the UI Components API index; its own
support channel points users at composing Menu/Toolbar. Angular Material and
the CDK have nothing either — verified against the `angular/components` source
tree (`src/material`, `src/cdk`). Absence is written down, not painted over;
the table below is measured against Kendo + PrimeNG + APG, with Bootstrap's
markup conventions as a sanity check.

The collapse machinery was **not written twice**: `collapseMode: 'auto'` is
core's pure `fitToolbarItems` — first and last crumb pinned (`'never'`),
middles yielding oldest-first via `priority` — measured against the
breadcrumb's own container by ResizeObserver, and the ellipsis opens the
collapsed crumbs in the suite's shared `oge-menu-list`, where the just-shipped
`url` support keeps them real links. Locked in by `breadcrumb-collapse.spec.ts`.

| Feature                                                 | Reference | OGE     | Notes                                                                                                                                                                                                                                                |
| ------------------------------------------------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items` trail                                           | Yes       | Done    | `items: OgeBreadcrumbItemData[]` — a deliberately narrow interface (no submenu/checked fields, they mean nothing on a trail)                                                                                                                         |
| Declarative items                                       | No        | Done    | OGE extra: `<oge-breadcrumb-item>` children merged **before** `items` — the house both-APIs rule; Kendo and PrimeNG are array-only                                                                                                                   |
| `collapseMode: 'auto' \| 'wrap' \| 'none'` (Kendo)      | Yes       | Done    | same three values, same default (`'auto'`), same first-and-last-stay-visible contract                                                                                                                                                                |
| **Collapsed crumbs stay reachable**                     | No        | Done    | OGE extra: Kendo documents only that items collapse; ours parks them in an ellipsis menu as **real links** (`aria-haspopup`/`aria-expanded`, ArrowDown focuses the menu) — nothing on the trail becomes unreachable                                  |
| **Container-width measurement**                         | partial   | Done    | OGE extra: measured against the breadcrumb's **own box** (a trail inside a split pane adapts to its room), via core's `fitToolbarItems` — the same kernel the toolbar overflow uses, not a second implementation                                     |
| PrimeNG separate `home` item                            | Yes       | covered | the first crumb with an `icon` expresses the same thing; a second item-shaped input would exist only to exist (`homeAriaLabel` falls with it)                                                                                                        |
| Item `url` / `routerLink`                               | Yes       | Done    | `url` renders real `<a href>` crumbs (middle-click and copy-address work); `preventDefault()` in `itemClick` hands navigation to a router. `routerLink` deliberately absent — no package takes a router dependency, the routed demo shows the wiring |
| Item `icon` / `svgIcon` / `iconClass`                   | Yes       | Done    | `icon` (SVG path data) + `iconClass` (icon-font hook), the suite's dependency-free pair                                                                                                                                                              |
| Kendo `imageUrl`                                        | Yes       | Skipped | an image-by-URL item is what `iconClass`/custom templates are for; a third icon channel earns nothing                                                                                                                                                |
| Item `title` (Kendo) / `disabled` / `visible` (PrimeNG) | Yes       | Done    | `hint` (the house word), `disabled` exposed via `aria-disabled` and inert, `visible: false` removes the crumb                                                                                                                                        |
| Kendo `size` density                                    | Yes       | Skipped | density on a one-line trail is token styling, not component state — the `--oge-*` tokens are the theming model                                                                                                                                       |
| `itemClick` (Kendo bare item / PrimeNG `onItemClick`)   | Yes       | Done    | `{ item, key, index, event }` — the house payload; like Kendo it never fires for disabled crumbs or the last crumb (the current page)                                                                                                                |
| Last crumb non-interactive + `aria-current="page"`      | partial   | Done    | Kendo makes it inert but the APG's `aria-current` isn't documented; PrimeNG's plain-anchor branch drops it in source. Ours is a `<span aria-current="page">`, locked in by `breadcrumb-a11y.spec.ts`                                                 |
| Item template (`kendoBreadCrumbItemTemplate`, `#item`)  | Yes       | Done    | `[ogeBreadcrumbItemTemplate]` — replaces the crumb's **interior only**, so a template can never break the link/current/disabled semantics                                                                                                            |
| Separator template (`separatorIcon`, `#separator`)      | Yes       | Done    | `[ogeBreadcrumbSeparatorTemplate]`, rendered inside the `aria-hidden` separator — decoration stays decoration                                                                                                                                        |
| Keyboard: Tab/Enter only                                | Yes       | Done    | the APG defines nothing more; the only addition is ArrowDown/ArrowUp on the ellipsis button focusing its menu — the suite's drop-down convention                                                                                                     |
| Ellipsis menu opening/closing events                    | —         | Skipped | no reference has them and nothing needs vetoing — the menu is a view of the trail, not a state change worth a cancelable pipeline                                                                                                                    |
| Messages / i18n                                         | partial   | Done    | `provideOgeBreadcrumbConfig()`; `OgeBreadcrumbMessages` carries the nav landmark's label and the ellipsis label — every user-facing string, aria included                                                                                            |
| RTL                                                     | Yes       | covered | logical properties throughout; the separator chevron mirrors via `[dir='rtl']`                                                                                                                                                                       |

## Pagination (`@oge-ui/navigation`) — Feature Parity

`OgePagination` against DevExtreme's new standalone `dxPagination`, Kendo's
`Pager` (`@progress/kendo-angular-pager`), PrimeNG's `Paginator` and Angular
Material's `MatPaginator`. **No WAI-ARIA APG pagination pattern exists** —
the a11y backbone is a composition and the table's spine is that
composition: a `<nav>` landmark named by messages (dx's `label`, PrimeNG's
documented landmark), real `<button>`s with `aria-current="page"` on the
active page, icon buttons with message-driven `aria-label`s, the info range
in an `aria-live="polite"` region (PrimeNG precedent), and the page-size
`<select>`/jump `<input>` inside visible `<label>`s. Keyboard is the native
Tab order — the APG defines no arrow-key behavior for pagination and every
control is a native element, so none is invented (the breadcrumb's
no-roving-tabindex reasoning).

Structural decisions: `pageIndex` is **0-based** (Material, Kendo's
0-based `skip`, and the grid pager agree; dx's documentation is ambiguous
about its base — noted as a migration check, not painted over) and
`pageSize: 0` means "all items" — both contracts deliberately identical to
the grid's `OgePager` so eventual delegation is a template swap, not an API
migration. The window arithmetic is a new DOM-free core kernel
(`pagination-math.ts` — `resolvePageWindow`/`resolvePageRange`/
`resolvePageCount`, the `slider-math.ts` precedent) whose defining invariant
is a **constant window length**: ellipsis slots count toward `maxButtons`,
so the bar's width never changes while paging. Material's i18n service
(`MatPaginatorIntl`) maps onto the house messages-config
(`provideOgePaginationConfig` + per-instance `[messages]`) — DI-based string
overrides either way, ours signal-merged.

| Feature                                                               | Reference | OGE     | Notes                                                                                                                                                                                            |
| --------------------------------------------------------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pageIndex` / `pageSize` two-way (dx)                                 | Yes       | Done    | `model()`s — implicit changes free; rich `pageChanged`/`pageSizeChanged` add `previousPageIndex`/`previousPageSize` + `event`, and fire **only on user interaction** (Material `PageEvent` rule) |
| `itemCount` (dx) / `total` (Kendo) / `length` (Material)              | Yes       | Done    | dx name; `undefined` = unknown total → prev/next + "Page N" only, **next never disables** (documented loudly — Kendo leaves the `total: 0` case undocumented)                                    |
| `getPageCount()` (dx)                                                 | Yes       | Done    | the public readonly `pageCount` computed — signals are the house read API                                                                                                                        |
| `allowedPageSizes` (dx) / `pageSizeValues` (Kendo)                    | Yes       | Done    | `pageSizes: (number \| 'all')[]` — presence shows the selector; `'all'` commits `pageSize 0` (grid contract). dx `showPageSizeSelector` Skipped: the `undefined`-fallback idiom does both jobs   |
| `buttonCount` (Kendo) / `pageLinkSize` (PrimeNG)                      | Yes       | Done    | `maxButtons` (default 7, not Kendo's 10) — **counts ellipsis slots**, so the window width is constant; floor at the smallest honest shape                                                        |
| MUI-style `siblingCount`/`boundaryCount` pair                         | partial   | Skipped | over-constrained next to `maxButtons` (which wins?); `boundaryCount` survives in the kernel signature, off the public surface                                                                    |
| `showInfo`/`infoText` (dx) / `info` (Kendo) / report (PrimeNG)        | Yes       | Done    | `showInfo` + the `info` message template `{from}–{to} of {itemCount}` — PrimeNG's `currentPageReportTemplate` placeholders covered by messages; rendered `aria-live="polite"`                    |
| `showNavigationButtons` (dx) / `previousNext` (Kendo)                 | Yes       | Done    | dx name; forced on in compact and unknown-total modes                                                                                                                                            |
| `showFirstLastButtons` (Material) / `showFirstLastIcon` (PrimeNG)     | Yes       | Done    | Material name **and default (`false`)** — the numeric rails already render both end pages, so the extra chrome is opt-in                                                                         |
| Jump to page (`type: 'input'` Kendo; `showJumpToPageInput` PrimeNG)   | Yes       | Done    | PrimeNG name; native number input, 1-based display, Enter/change commit, clamped, display re-synced. PrimeNG's jump _dropdown_ Skipped — it duplicates the numeric buttons                       |
| `displayMode: 'full' \| 'compact' \| 'adaptive'` (dx)                 | Yes       | Done    | grid-pager parity; adaptive via core's `resolveMenubarCompact` against the **container** (config `compactBelow`, default 480 — the grid's hardcoded magic number, now configurable)              |
| `responsive` (Kendo) / `adaptiveMode` ActionSheet (Kendo)             | Yes       | covered | the adaptive display mode; the ActionSheet variant Skipped (no suite-wide adaptive story yet — same call as the color box)                                                                       |
| Methods `firstPage/lastPage/nextPage/previousPage`, `has*` (Material) | Yes       | Done    | plus dx's `focus()`; `lastPage()` no-ops and `hasNextPage()` returns `true` while the total is unknown                                                                                           |
| `disabled` (Material/dx)                                              | Yes       | Done    | native `disabled` on every control — they are all real buttons/selects/inputs, no `aria-disabled` gymnastics                                                                                     |
| `size` density (Kendo)                                                | Yes       | Done    | `'sm' \| 'md' \| 'lg'` host classes on token-driven padding                                                                                                                                      |
| i18n (`MatPaginatorIntl` service; Kendo messages component)           | Yes       | covered | `OgePaginationMessages` + `provideOgePaginationConfig()` + per-instance `[messages]` — the house config idiom, no service subclassing                                                            |
| `showPageLinks` (PrimeNG)                                             | Yes       | covered | hiding the numeric links is `displayMode: 'compact'` (the `N / M` indicator keeps orientation, which bare prev/next lose)                                                                        |
| `dropdownAppendTo` (PrimeNG)                                          | Yes       | covered | the page-size selector is a native `<select>` — the platform owns its popup, no overlay re-anchoring knob to expose                                                                              |
| Icon-button hover tooltips (dx `hint`, Kendo titles)                  | Yes       | Done    | `title` mirrors the message-driven `aria-label` on first/last/prev/next                                                                                                                          |
| Kendo `navigable` keyboard shortcuts                                  | Yes       | Skipped | no APG pattern defines pagination keys; native Tab order over real controls is the whole contract                                                                                                |
| Kendo pager template directives                                       | Yes       | Skipped | v1; the slot-directive idiom can come later without breaking the data API                                                                                                                        |
| dx `rtlEnabled` / lifecycle events                                    | Yes       | covered | logical properties + `dir` handling; Angular lifecycle and signals replace `onOptionChanged` et al. (house rule)                                                                                 |
| **Constant-width ellipsis window**                                    | No        | Done    | OGE extra: `result.length === min(pageCount, maxButtons)` always — locked by a kernel spec loop; no reference guarantees it (the grid's own pager jitters), and an ellipsis never hides one page |
| **Zero-item honesty**                                                 | partial   | Done    | one disabled-rails page + "0–0 of 0" (the Material `getRangeLabel` convention) — the bar never vanishes or renders an empty loop                                                                 |

Grid note: grid and tree-list still render the internal `OgePager`. Planned:
grid delegates to `OgePagination` in the next major — requires the
`grid → navigation` dep edge, a `.oge-pager` → `.oge-pagination` class break
(theme files + consumer CSS), and bridging the pager keys of
`OgeGridMessages` into `OgePaginationMessages`. The contracts (0-based
`pageIndex`, `'all' → pageSize 0`) are already aligned by design.

## Slider (`@oge-ui/inputs`) — Feature Parity

`OgeSlider` + `OgeRangeSlider` against DevExtreme `dxSlider`/`dxRangeSlider`,
Kendo `Slider`/`RangeSlider`, PrimeNG `p-slider` and Angular Material
`MatSlider`, with **both WAI-ARIA APG patterns as the backbone**: `slider`
(arrows ±step, PageUp/PageDown larger step, Home/End to the ends,
`aria-valuenow/min/max` + `aria-valuetext`) and `slider-multithumb` (each
thumb a separate focusable `role="slider"` whose `aria-valuemin`/`aria-valuemax`
is dynamically updated by the sibling's value — quoted verbatim in the pattern).

Two structural decisions up front. **Two components, not one** — a single
component with a `range` flag would make the value type dishonest
(PrimeNG's `number | number[]`); dx and Kendo also ship two widgets, and the
shared machinery lives in an internal `OgeSliderBase`. **Custom render with
manual ARIA, not Material's native `<input type="range">` per thumb** — the
suite's controls are token-styled custom DOM (the splitter's
`role="separator"` value-widget precedent), and the native input's styling
model would fork the theming. The range pair deliberately omits the
`FormValueControl` **clause** (the contract types `min`/`max` as
`NonNullable<TValue>` — tuple-typed bounds are nonsense); runtime
`[formField]` binding works regardless, and the single slider carries the
clause exactly like the number box.

| Feature                                                                       | Reference | OGE     | Notes                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `min` / `max` / `step`                                                        | Yes       | Done    | defaults 0/100/1 — the dx/Material consensus (Kendo's max=10 and PrimeNG's undefined step are the outliers). Thumbs always sit on the step grid, with float-error correction (core `slider-math.ts`)                                                                         |
| `keyStep` (dx) / `largeStep` (Kendo) for PageUp/PageDown                      | Yes       | Done    | `largeStep`, `undefined` → `step × 10` — dx's `keyStep = 1` default makes PageUp equal an arrow key, which misses the APG's "larger than step" intent                                                                                                                        |
| `valueChangeMode: onHandleMove \| onHandleRelease` (dx)                       | Yes       | covered | live commits stream through `valueCommitted` (throttled by the inherited `[debounce]`); release-time consumers use `slideEnded` — PrimeNG's two-event shape without a mode switch                                                                                            |
| `onSlideEnd` (PrimeNG) / `dragStart`/`dragEnd` (Material)                     | Yes       | Done    | `dragStarted` + `slideEnded { value, event }`                                                                                                                                                                                                                                |
| `tooltip {enabled, showMode, format}` (dx) / `discrete` (Mat)                 | Yes       | Done    | `valueIndicator: 'none' \| 'active' \| 'always'` — `'active'` covers focus, drag **and hover** (dx `showMode: 'onHover'` included); an inline element, not an overlay (a moving thumb is no anchor)                                                                          |
| `hint` (dx) / `dragHandleTitle` (Kendo)                                       | Yes       | Done    | the family-wide inherited `tooltip` input renders as the thumb `title`; the range thumbs' accessible names come from `startAriaLabel`/`endAriaLabel` + messages                                                                                                              |
| `name` / `startName` / `endName` (dx form posts)                              | Yes       | Done    | hidden inputs rendered when set — the single slider uses the inherited `name`, the range pair dx's `startName`/`endName`                                                                                                                                                     |
| `label {visible, format}` (dx)                                                | Yes       | Done    | `showLabels` renders the formatted `min`/`max` ends                                                                                                                                                                                                                          |
| `displayWith` (Material) / `format` (dx)                                      | Yes       | Done    | one `formatValue` input feeds the bubble, the end labels **and** `aria-valuetext` — display and announcement cannot diverge                                                                                                                                                  |
| `showRange` (dx)                                                              | Yes       | Done    | same name, same default (`true`); fills between the thumbs on the range pair                                                                                                                                                                                                 |
| `showButtons` + `incrementTitle`/`decrementTitle` (Kendo)                     | Yes       | Done    | single slider only, like Kendo; press-and-hold repeats on the number box's spin timing config; titles come from the `sliderIncrement`/`sliderDecrement` messages                                                                                                             |
| Ticks (`tickPlacement`/`title`/`fixedTickWidth`, Kendo; `showTickMarks`, Mat) | Yes       | Done    | `showTicks` + `tickStep` (→ `largeStep` → `step`), capped at 200 marks; Kendo's tick `title` callback is `showTickLabels` fed by `formatValue`. `tickPlacement`'s four positions and `fixedTickWidth` are Skipped — one tick design is the design system's job, not a knob's |
| `orientation` / `vertical`                                                    | Yes       | Done    | `orientation: 'horizontal' \| 'vertical'`; vertical announces `aria-orientation` and Up still increases (APG)                                                                                                                                                                |
| `minStepsBetweenHandles` (PrimeNG, version-dependent)                         | partial   | Done    | `minRange` — a value distance, not a step count; reflected in each thumb's dynamic aria bounds. (The PrimeNG input exists in its docs but not in master — noted, not painted over)                                                                                           |
| Track click behavior                                                          | Yes       | Done    | jumps to the position (single) / moves the **nearest** thumb (range) and starts dragging — with real focus following                                                                                                                                                         |
| Forms: CVA + ngModel + reactive                                               | Yes       | Done    | inherited from `OgeControlBase` — zero new bridge code; `<oge-form>` gained `editorType: 'slider'` as a bare editor                                                                                                                                                          |
| RTL                                                                           | Yes       | covered | horizontal arrows and pointer projection mirror against the computed `direction`; vertical is direction-agnostic                                                                                                                                                             |
| dx form/validation surface (`isValid`, `validationError`, …)                  | Yes       | covered | the family-wide `invalid`/`errors`/`errorText`/`showError` state on `OgeControlBase` — sliders render the invalid accent like every other editor                                                                                                                             |
| Kendo `animate` / PrimeNG `animate` / Material ripples                        | Yes       | covered | discrete moves (keys, track clicks, buttons) glide on 160ms token transitions while dragging stays instant, all suppressed under `prefers-reduced-motion` — the behavior the flag exists for, without the flag                                                               |
| **Escape cancels the drag**                                                   | No        | Done    | OGE extra: the splitter's gesture rule applied to a slider — Escape mid-drag restores the start value and emits no `slideEnded`. No reference slider offers it                                                                                                               |
| **`formatValue` → `aria-valuetext`, always**                                  | partial   | Done    | Material wires `displayWith` to the indicator only (the aria mapping is guide prose); ours is one input, locked in by `slider-a11y.spec.ts`                                                                                                                                  |
| **Signal Forms `FormValueControl` membership**                                | No        | Done    | OGE extra: native contract membership (value/disabled/readonly/errors/touch) with schema `min`/`max` metadata flowing into the scale automatically inside `<oge-form>`                                                                                                       |

## Color Box (`@oge-ui/inputs`) — Feature Parity

`OgeColorBox` against DevExtreme `dxColorBox` and Kendo `ColorPicker` (+ its
standalone `ColorGradient`/`ColorPalette`/`FlatColorPicker`). **Angular
Material and the CDK ship no color picker at all** (community packages only) —
the absence row, written down. **PrimeNG deprecated its `ColorPicker`**
("use InputColor instead") and its old accessibility section says outright
"not compatible with screen readers" / "Specification does not cover a color
picker yet" — the replacement `InputColor` is a composable area/slider/swatch
kit. That spec gap is real: **no WAI-ARIA APG color-picker pattern exists**
(the 30-pattern index was checked), so the a11y backbone here is a
composition, and the table's spine is that composition: the trigger is the
date box's combobox + `aria-haspopup="dialog"`; the popup is a `role="dialog"`
that takes **real DOM focus** (APG date-picker-dialog precedent); hue and
alpha are APG `role="slider"`s with mandatory `aria-valuetext` (the APG's own
"Color Viewer Slider" example sets that precedent); the 2D
saturation/brightness surface — which the APG never covers — is a
`role="slider"` with `aria-roledescription`, brightness as `aria-valuenow`
and a both-axes `aria-valuetext`; the palette is a `role="grid"` with a
roving tabindex. Where the native `<input type="color">` suffices (no format
contract, no palette, no alpha), the docs page says to prefer it.

Structural decisions: the value is a **CSS color string normalized to
`format` on user commits** (dx: hex default widening to rgba with alpha —
generalized here across `'hex' | 'rgb' | 'rgba' | 'hsl'`); programmatic
writes keep any parseable CSS string verbatim. The color arithmetic is a new
DOM-free core kernel (`color-math.ts` — parse/convert/format/luminance, the
`slider-math.ts` precedent, exhaustively unit-tested without a DOM). The
panel parts are **internal components, deliberately not `OgeSliderBase`
subclasses** — that base drags a form control's whole CVA/commit machinery,
and a panel part is not a form control; the slider's gesture and keyboard
idioms are copied per the house rule, the arithmetic reused from core.
Kendo's standalone `ColorGradient`/`ColorPalette` are a possible v2
extraction of exactly these internals.

| Feature                                                           | Reference | OGE     | Notes                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value` as color string, any CSS text accepted (dx)               | Yes       | Done    | hex 3/4/6/8, `rgb()`/`rgba()` comma **and** space/slash syntax, `hsl()`, the 148 CSS named colors, `transparent` — core `parseColor`, ~2.5 KB name table accepted for dx parse parity                                                                         |
| Output format control (dx implicit; Kendo `format`)               | Yes       | Done    | `format: 'hex' \| 'rgb' \| 'rgba' \| 'hsl'`, default hex (dx); Kendo's rgba default rejected — apps store hex. Kendo's `formats` list (a format switcher UI) is Skipped: one committed shape is a contract                                                    |
| `editAlphaChannel` (dx) / `gradientSettings.opacity` (Kendo)      | Yes       | Done    | dx name; adds alpha slider + percent input, output widens to `#rrggbbaa`/`rgba()`/`hsla()` only while translucent; without it alpha coerces to 1 on commit (typed `rgba()` still parses)                                                                      |
| `applyValueMode: 'instantly' \| 'useButtons'` + apply/cancel      | Yes       | Done    | dx semantics on the date box's exact draft + OK/Cancel machinery (`okButton`/`cancelButton` messages reused); `'instantly'` live-commits through `queueCommit` so `[debounce]` throttles drags                                                                |
| `acceptCustomValue` (dx)                                          | Yes       | Done    | `false` = picker-only text; unparseable typed text sets `parseInvalid` (always-visible `invalidColorError`) and reverts on blur — never committed                                                                                                             |
| `keyStep` (dx) / `gradientSliderStep` 5px + 2px shift (Kendo)     | Yes       | Done    | one `keyStep` (default 5) in **value units** — hue degrees, alpha/saturation/brightness percent; PageUp/Down ×5. Kendo's pixel steps are zoom-dependent — deliberate deviation                                                                                |
| `view` / `views` gradient \| palette (Kendo)                      | Yes       | Done    | `view: 'gradient' \| 'palette' \| 'both'` — `'both'` stacks them; Kendo's `activeView` two-way + switcher UI Skipped (both surfaces render at once instead)                                                                                                   |
| `paletteSettings {palette, columns}` (Kendo)                      | Yes       | Done    | flat inputs `palette` (string array) + `paletteColumns`; exported `OGE_DEFAULT_COLOR_PALETTE` fallback. Named presets (`'office'`/`'basic'`/`'apex'`) Skipped — apps pass arrays; `tileSize` Skipped (token-sized)                                            |
| `showClearButton` (dx) / `clearButton` (Kendo)                    | Yes       | Done    | inherited field-chrome clear → commits `null`                                                                                                                                                                                                                 |
| `opened` + `open()/close()/toggle()` + open/close events          | Yes       | Done    | `[(opened)]` model, `dropDownOpened`/`dropDownClosed` (house names); `openOnFieldClick`, `dropdownPlacement` as the family's dropdown editors                                                                                                                 |
| Field swatch + text (dx editor shape)                             | Yes       | Done    | checkerboard-underlaid swatch in the chrome prefix driven by the committed string; the rail keeps the family chevron                                                                                                                                          |
| Hex + R/G/B/A inputs in the popup (dx/Kendo gradient view)        | Yes       | Done    | labeled (`hexInputLabel` etc.), parse-validated, garbage reverts in place; channel edits preserve the working hue                                                                                                                                             |
| Contrast tool (`gradientSettings.contrastTool`, Kendo)            | Yes       | Skipped | WCAG-ratio preview against a supplied background is a niche audit tool; `relativeLuminance` sits in the core kernel if ever revisited                                                                                                                         |
| `preview` before/after panes (Kendo)                              | Yes       | Done    | folded into the `useButtons` footer as a compact committed \| draft pane pair on a checkerboard — where a draft actually exists; `'instantly'` needs none (the field swatch is live)                                                                          |
| `showDropDownButton` (dx)                                         | Yes       | Done    | hides the rail chevron; field click and ArrowDown still open (the select box's exact contract)                                                                                                                                                                |
| `adaptiveMode` ActionSheet (Kendo)                                | Yes       | Skipped | no reference-wide consensus; the popup is small enough on touch — revisit with a suite-wide adaptive story                                                                                                                                                    |
| Inline / flat rendering (PrimeNG `inline`; Kendo FlatColorPicker) | Yes       | Skipped | deferred to v2 — the internal surface/slider/palette parts are shaped for exactly that extraction                                                                                                                                                             |
| Angular Material / CDK color picker                               | No        | —       | **does not exist** (community packages only) — absence written down per the dxCardView rule                                                                                                                                                                   |
| **Composed dialog a11y with real DOM focus**                      | No        | Done    | OGE extra: no reference moves DOM focus into a labeled `role="dialog"` and restores it on Escape; PrimeNG's own docs concede screen readers are unsupported                                                                                                   |
| **2-axis surface `aria-valuetext` + `aria-roledescription`**      | No        | Done    | OGE extra: "Saturation X%, Brightness Y%" per move, RTL-aware Left/Right, Home/End deliberately no-ops (ambiguous in 2D)                                                                                                                                      |
| **Palette as APG grid with WCAG-contrast checkmark**              | partial   | Done    | Kendo renders a grid but no per-cell color announcement contract; ours: cell `aria-label` = the color string, `aria-selected`, Ctrl+Home/End corners, checkmark black/white by `contrastForeground`                                                           |
| **Escape cancels a panel drag**                                   | No        | Done    | OGE extra: the slider/splitter gesture rule applied to the surface and both sliders — mid-drag Escape restores the gesture-start value                                                                                                                        |
| **Eyedropper (`EyeDropper` API)**                                 | No        | Done    | OGE extra: `showEyedropper` renders a pick-from-screen button only where the platform API exists (Chromium today) — progressive enhancement, no polyfill; no reference color editor offers it. Picks keep the working alpha; localized via `eyedropperButton` |
| **Signal Forms `FormValueControl` membership**                    | No        | Done    | OGE extra: `TValue = string \| null` carries no `min`/`max`, so the range-slider typing trap does not apply; `<oge-form>` gained `editorType: 'colorBox'` (chrome'd, not bare)                                                                                |

Grid note: `OgeCellEditor` picks editors by `dataType`, and no color dataType
exists — the grid is untouched in v1. Recent-colors (session-only) is a noted
OGE-extra candidate, deliberately out of v1.

## Forms (`@oge-ui/forms`) — Feature Parity

`OgeForm` + declarative `OgeFormItem` / `OgeFormGroup` and `OgeValidationSummary`
against DevExtreme `dxForm`, Kendo UI for Angular `Form` / `FormField` /
`FormFieldSet`, Angular Material's `MatFormField`, PrimeNG's form-layout
primitives, and — most importantly — **Angular 22's own Signal Forms**, adapted
to the signal-based house API.

Three findings shape the implementation. First, Signal Forms is the validation
engine; the package ships none of its own. `validationRules` is declarative
sugar that compiles into a schema (`required()`, `minLength()`, `min()`,
`pattern()`, `validateAsync()`, …), and `[(formData)]` builds that schema over
an internally owned `form()`. All three binding modes therefore converge on one
code path, and validation behaves identically in every one of them.

Second, `[formField]` **overwrites** any template `[disabled]` / `[readonly]`
binding on the same editor — verified against the real directive, not assumed.
The form therefore binds those inputs only on the reactive-forms arm; in
`[fieldTree]` mode the schema owns them, and form-level `disabled` is applied
with a `<fieldset disabled>` wrapper. That is why the editor template carries
the `@switch` twice.

Third, responsiveness is a **container query** on the form's own inline size,
not a window-width callback. A form inside a dialog, a drawer or a grid cell
gets the column count its own width deserves, which `screenByWidth` cannot do.

Sections reuse rather than reimplement: `<oge-form-tabs>` renders
`@oge-ui/tabs` and `<oge-form-accordion>` renders `@oge-ui/layout`, each child
group becoming a tab or a panel. Both default `deferRendering` to **false**,
unlike the components themselves — a form usually wants every field in the DOM,
and validation runs on the model either way. A failed submit reveals the section
holding the first invalid field before focusing it.

The grid and the tree list now render `<oge-form>` for `editing.mode: 'form'`
and `'popup'`, which retires the field-layout block that used to be duplicated
between them. That is what `renderFormElement` exists for: nested `<form>`
elements are invalid HTML, so the row editor renders the fields without one.

jQuery-era lifecycle members (`onInitialized` / `onOptionChanged` /
`onContentReady` / `onDisposing`) and the imperative `option()` / `repaint()` /
`beginUpdate()` shims are intentionally not replicated — Angular lifecycle,
`effect()` and signals cover them.

| Feature                                                                        | Reference | OGE     | Notes                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------ | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items` array of form items (dx)                                               | Yes       | Done    | `OgeFormItemData[]`: `field/label/hint/dataType/editorType/editorOptions/colSpan/visible/visibleIndex/isRequired/validationRules/readOnly/disabled`                                                                                                        |
| Declarative children (Kendo `kendo-formfield`, Material `mat-form-field`)      | Yes       | Done    | `<oge-form-item>`; renderless config child, same shape as `oge-column` / `oge-tab`                                                                                                                                                                         |
| Both sources at once                                                           | No        | Done    | OGE extra — children first, then `items`; one shared query token keeps document order across items and groups                                                                                                                                              |
| `formData` two-way (dx)                                                        | Yes       | Done    | `[(formData)]` model; the form owns a Signal Forms tree over it                                                                                                                                                                                            |
| Reactive `formGroup` (Kendo, Material)                                         | Yes       | Done    | `[formGroup]` — binds each item's `FormControl` through the editors' CVA path                                                                                                                                                                              |
| Angular Signal Forms                                                           | Angular   | Done    | `[fieldTree]` — the point of the package; the caller's schema owns validity, required marks, disabled and readonly                                                                                                                                         |
| `itemType: 'simple'` (dx)                                                      | Yes       | covered | every item is a field; groups and future sections are their own elements, not an `itemType` discriminator                                                                                                                                                  |
| `itemType: 'group'` (dx), Kendo `FormFieldSet`                                 | Yes       | Done    | `<oge-form-group caption>` → real `<fieldset>` + `<legend>`; nestable, own `colCount`                                                                                                                                                                      |
| `itemType: 'tabbed'` (dx)                                                      | Yes       | Done    | `<oge-form-tabs>` wrapping `@oge-ui/tabs` — each child group becomes a tab, its caption the tab text                                                                                                                                                       |
| **Accordion sections**                                                         | No        | Done    | OGE extra: `<oge-form-accordion>` over `@oge-ui/layout`, driving its invalid-section indicator from the panel's own field errors                                                                                                                           |
| **Sections reveal the first invalid field**                                    | No        | Done    | OGE extra: a failed submit selects the tab / expands the panel that holds it, then focuses it                                                                                                                                                              |
| **Invalid-count badge per tab**                                                | No        | Done    | OGE extra: `showErrorBadges` puts each tab's invalid-field count on the tab                                                                                                                                                                                |
| `itemType: 'empty'` (dx)                                                       | Yes       | Skipped | spacing is `colSpan` plus CSS; an empty item as a layout primitive is a jQuery-era workaround                                                                                                                                                              |
| `itemType: 'button'` (dx)                                                      | Yes       | covered | the `ogeFormActions` content slot + `@oge-ui/buttons` — a button is not a form field                                                                                                                                                                       |
| `dataField` (dx)                                                               | Yes       | Done    | `field`, dot-notation for nested models                                                                                                                                                                                                                    |
| `editorType: 'dxTextBox'` … (dx)                                               | Yes       | covered | house camelCase union `'textBox' \| 'textArea' \| 'numberBox' \| 'selectBox' \| 'tagBox' \| 'autocomplete' \| 'treeSelect' \| 'dateBox' \| …`                                                                                                              |
| `editorOptions` free-form bag (dx)                                             | Yes       | covered | a curated, typed `OgeFormEditorOptions`; anything richer is a template, so `strictTemplates` still checks the demo code                                                                                                                                    |
| Editor chosen from the data type                                               | Yes       | Done    | `dataType` → editor, and `dataType` itself is inferred from the model value; an option list beats it, `editorType` beats everything                                                                                                                        |
| `helpText` (dx), `kendo-formhint`                                              | Yes       | Done    | `hint` — rendered in the editor's own subscript, or by the form for bare controls                                                                                                                                                                          |
| `isRequired` (dx)                                                              | Yes       | Done    | `isRequired`; adds a `required()` rule and the required mark                                                                                                                                                                                               |
| `validationRules` (dx)                                                         | Yes       | Done    | `OgeValidationRule[]`, compiled to a Signal Forms schema — required/email/numeric/stringLength/pattern/range/custom/async                                                                                                                                  |
| `{ type: 'compare' }` rule (dx)                                                | Yes       | Skipped | a rule object naming another field loses type safety; a `custom` rule sees the whole model, and a real schema has `validate()` + `valueOf()`                                                                                                               |
| PrimeVue/PrimeNG zod / yup / valibot resolvers                                 | Yes       | covered | Angular ships `validateStandardSchema()` — bind `[fieldTree]` and use it; the package adds nothing of its own                                                                                                                                              |
| `colCount` (dx), Kendo `cols`                                                  | Yes       | Done    | `colCount: number \| 'auto'`                                                                                                                                                                                                                               |
| `colSpan` (dx, Kendo)                                                          | Yes       | Done    | `colSpan`, clamped to the column count in force                                                                                                                                                                                                            |
| `minColWidth` (dx)                                                             | Yes       | Done    | `minColWidth`, driving `repeat(auto-fit, minmax(…))`                                                                                                                                                                                                       |
| `colCountByScreen` (dx), Kendo `ResponsiveFormBreakPoint[]`                    | Yes       | Done    | `colCountByScreen` — but implemented as `@container` queries on the form's own width                                                                                                                                                                       |
| `screenByWidth` callback (dx)                                                  | Yes       | Skipped | deliberate: window width is the wrong input for a component that may live in a dialog or a grid cell                                                                                                                                                       |
| `labelLocation` (dx), Kendo `orientation`                                      | Yes       | Done    | `labelLocation: 'top' \| 'start' \| 'end'` (logical, so RTL mirrors it)                                                                                                                                                                                    |
| `labelMode` (dx), Material `floatLabel`                                        | Yes       | Done    | `labelMode` forwarded to the editors; forced to `hidden` for side labels so nothing renders twice                                                                                                                                                          |
| `alignItemLabels` / `alignItemLabelsInAllGroups` (dx)                          | Yes       | covered | one `alignItemLabels` — a shared label column width, group-independent                                                                                                                                                                                     |
| `showColonAfterLabel` (dx)                                                     | Yes       | Done    | `showColonAfterLabel` + `messages.labelColon`                                                                                                                                                                                                              |
| `requiredMark` / `optionalMark` / `showRequiredMark` / `showOptionalMark` (dx) | Yes       | Done    | all four; the marks are `aria-hidden` decoration with a screen-reader word beside them                                                                                                                                                                     |
| `requiredMessage` (dx)                                                         | Yes       | covered | `@oge-ui/inputs`' `requiredError`, so a field reads the same inside and outside a form                                                                                                                                                                     |
| `readOnly` (dx)                                                                | Yes       | Done    | form → group → item, each overridable; in `[fieldTree]` mode the schema's `readonly()` owns it                                                                                                                                                             |
| `disabled` (dx)                                                                | Yes       | Done    | `<fieldset disabled>` wrapper, because `[formField]` overwrites a template `[disabled]` binding                                                                                                                                                            |
| `visible` / `visibleIndex` (dx)                                                | Yes       | Done    | both; indexed items come first in index order, the rest keep declaration order                                                                                                                                                                             |
| `cssClass` per item / group (dx)                                               | Yes       | Done    | `cssClass`                                                                                                                                                                                                                                                 |
| `showValidationSummary` (dx)                                                   | Yes       | Done    | `showValidationSummary`, plus a standalone `<oge-validation-summary>` for custom placement                                                                                                                                                                 |
| Kendo `showErrors` / `showHints` timing                                        | Yes       | covered | one display rule: an error appears once the field is touched or dirty, or once a submit has been attempted                                                                                                                                                 |
| `validationGroup` (dx)                                                         | Yes       | Skipped | a `FieldTree` (or a `FormGroup`) _is_ the validation group                                                                                                                                                                                                 |
| `customizeItem` callback (dx)                                                  | Yes       | Skipped | mutating resolved items from a callback fights signals; map the `items` array before binding it                                                                                                                                                            |
| `getEditor(dataField)` (dx)                                                    | Yes       | covered | `focus(field)`, `updateData(field, value)` and `itemOption(field)` — handing out a component instance invites imperative mutation of an OnPush tree                                                                                                        |
| `updateData(data)` / `updateData(field, value)` (dx)                           | Yes       | Done    | both overloads                                                                                                                                                                                                                                             |
| `validate()` (dx)                                                              | Yes       | Done    | `validate()`, and it emits `validated`                                                                                                                                                                                                                     |
| `resetValues()` / `clear()` (dx)                                               | Yes       | Done    | `reset(values?)` and `clear()`                                                                                                                                                                                                                             |
| `focus()` (dx)                                                                 | Yes       | Done    | `focus(field?)`                                                                                                                                                                                                                                            |
| `itemOption(id, option, value)` setter (dx)                                    | Yes       | covered | read-only `itemOption(field)`; items are signal inputs, so change the source, not the rendered copy                                                                                                                                                        |
| `getButton(name)` (dx)                                                         | Yes       | Skipped | buttons are projected content the app already holds a reference to                                                                                                                                                                                         |
| `getScrollable()` / `scrollingEnabled` (dx)                                    | Yes       | Skipped | plain CSS on the host                                                                                                                                                                                                                                      |
| `onFieldDataChanged` (dx)                                                      | Yes       | Done    | `fieldChanged` with `{ field, value, previousValue }` — one model diff, so it fires in all three binding modes                                                                                                                                             |
| `onEditorEnterKey` (dx)                                                        | Yes       | Done    | `editorEnterKey` with `{ field, event }`                                                                                                                                                                                                                   |
| Submit event                                                                   | Yes       | Done    | cancelable `submitting` → `submitted`; a native `<form>` submit runs the same pipeline                                                                                                                                                                     |
| `isDirty` (dx)                                                                 | Yes       | Done    | `dirty()` signal, working in all three binding modes                                                                                                                                                                                                       |
| `aiIntegration` / `smartPaste` / `onSmartPasting` (dx)                         | Yes       | Skipped | out of scope for a layout package; nothing stops an app writing the model itself                                                                                                                                                                           |
| `height` / `width` / `elementAttr` / `tabIndex` / `accessKey` (dx)             | Yes       | Skipped | plain CSS and native attributes on the host                                                                                                                                                                                                                |
| `rtlEnabled` (dx)                                                              | Yes       | covered | logical properties throughout — no `rtlEnabled` flag in new code                                                                                                                                                                                           |
| Item `template` / label `template` (dx)                                        | Yes       | Done    | `[ogeFormItemTemplate]` (whole field) and `[ogeFormLabelTemplate]`; both legal at form level or per item, the per-item one wins                                                                                                                            |
| `captionTemplate` on a group (dx)                                              | Yes       | Done    | `[ogeFormGroupCaptionTemplate]` — replaces the legend content, keeps the fieldset/legend pair                                                                                                                                                              |
| **Editor-only slot**                                                           | No        | Done    | OGE extra: `[ogeFormEditorTemplate]` keeps the form's label, required mark and error chrome, and hands the template `editorId` so the label association survives                                                                                           |
| Kendo `FormRenderer` / field generator                                         | Yes       | covered | `[items]` is the data-driven renderer; a separate renderer component would be a second way to say the same thing                                                                                                                                           |
| Material `MatFormFieldControl` custom-control contract                         | Yes       | covered | Angular's own `FormValueControl` — which every `@oge-ui/inputs` editor already implements                                                                                                                                                                  |
| Material `subscriptSizing`                                                     | Yes       | Done    | forwarded to every editor; `'fixed'` keeps an appearing error from shifting the layout                                                                                                                                                                     |
| PrimeNG `formgrid` / `field` / `col` CSS classes                               | Yes       | covered | a real grid layout with `colCount` / `colSpan`, not utility classes the app has to apply itself                                                                                                                                                            |
| `MAT_*`-style app defaults                                                     | Yes       | Done    | `provideOgeFormsConfig()`; every user-facing string in `OgeFormsMessages`                                                                                                                                                                                  |
| `<fieldset>` + `<legend>` for a section                                        | partial   | Done    | real elements, nested for nested groups — Kendo's FormFieldSet is the only reference that does this                                                                                                                                                        |
| **Container-query responsiveness**                                             | No        | Done    | OGE extra: the column count follows the form's own width, so a form in a dialog or a grid cell lays out correctly                                                                                                                                          |
| **One component, three binding modes**                                         | No        | Done    | OGE extra: `[fieldTree]`, `[formGroup]` and `[(formData)]` on the same component, mode derived not configured                                                                                                                                              |
| **Rules compile to Signal Forms**                                              | No        | Done    | OGE extra: declarative rules with no second engine, so async validation and cross-field logic are Angular's, not ours                                                                                                                                      |
| **`focusFirstInvalid()` + scroll**                                             | No        | Done    | OGE extra: a failed submit focuses and scrolls to the first invalid field                                                                                                                                                                                  |
| **Summary rows focus their field**                                             | No        | Done    | OGE extra: `role="alert"` list of real buttons; `errorClick` carries `{ field, label, message }`                                                                                                                                                           |
| **Chrome for the bare controls**                                               | No        | Done    | OGE extra: check box, switch and radio group render no field chrome of their own, so the form supplies label, hint and error for them                                                                                                                      |
| **Grid form editing re-hosted on `OgeForm`**                                   | No        | Done    | OGE extra: grid and tree-list `editing.mode: 'form' \| 'popup'` now render `<oge-form [formGroup]>`, retiring the block that was duplicated between them; per-column `*ogeEditTemplate` keeps its documented context through one adapter template          |
| **`renderFormElement`**                                                        | No        | Done    | OGE extra: renders the fields without a `<form>` element, because nested forms are invalid HTML — what makes the grid re-host legal                                                                                                                        |
| **Schema-carried layout metadata**                                             | No        | Done    | OGE extra: `OGE_FORM_LABEL` / `_HINT` / `_PLACEHOLDER` / `_COL_SPAN` / `_EDITOR` / `_EDITOR_OPTIONS` / `_DATA_TYPE` / `_GROUP` / `_ORDER` on `createMetadataKey()`, so `<oge-form [fieldTree]>` needs no items at all; a schema `hidden()` drops the field |
| **Data-driven per-item slots**                                                 | No        | Done    | OGE extra: `OgeFormItemData` carries `itemTemplate` / `editorTemplate` / `labelTemplate` refs, so a host that generates its items can still give one field a custom editor                                                                                 |
