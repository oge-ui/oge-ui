# oge Data Grid — DevExtreme Parity Roadmap

Comparison of `@oge-ui/grid` against DevExtreme DataGrid (v25/26 feature set).
Legend: ✅ implemented · 🟡 partial · ❌ missing.

Last updated: 2026-08-05 (after Phase 11 / Column parity).

## 1. Data binding & data operations

| Feature | DevExtreme | oge | Notes |
|---|---|---|---|
| Local array binding | ✔ | ✅ | `T[]`, `ArrayDataSource` |
| Custom remote store | CustomStore | ✅ | `CustomDataSource` + serializable `LoadOptions` |
| OData store | ODataStore | ✅ | `ODataDataSource` + `buildODataQuery` (v4: `$skip`/`$top`/`$orderby`/`$filter`/`$count`) |
| CRUD write-back | ✔ | ✅ | `insert/update/remove`, in-place array CRUD |
| Push / live updates (`reshapeOnPush`) | ✔ | ✅ | `ArrayDataSource.push()` + `changes` stream; updates patch in place, insert/remove reload |
| Server-side sort/filter/page/group | ✔ | ✅ | verified with request-log e2e |
| Server-side summaries | ✔ | ✅ | positional `summary` payload |
| Deferred group loading (`items: null`) | ✔ | 🟡 | flatten supports `null` children; no on-demand fetch trigger |

## 2. Paging & scrolling

| Feature | DevExtreme | oge | Notes |
|---|---|---|---|
| Paging + page-size selector + info | ✔ | ✅ | `pageSizes`, `showInfo` |
| "All" page size option | ✔ | ❌ | |
| Pager display modes (compact/adaptive) | ✔ | ❌ | |
| Row virtual scrolling | ✔ | ✅ | Fenwick-tree windowing, 100k e2e |
| **Column virtualization** | ✔ | ✅ | `columnRenderingMode: 'virtual'`; plain columns only (no pins/bands) |
| **Infinite scrolling** | ✔ | ✅ | `scrolling.mode: 'infinite'`, skeleton fillers, growing scroll space |
| Remote virtual scrolling (windowed fetch) | ✔ | ✅ | 100-row block cache, de-dupe, sort/filter invalidation; 1M-row demo |
| Variable row heights (measured) | ✔ | ✅ | `autoRowHeight`: measured after render, scroll-anchored corrections |
| scrollToRow public API | ✔ | 🟡 | internal only |

## 3. Sorting

| Feature | DevExtreme | oge | Notes |
|---|---|---|---|
| Single/multi/none + allowUnsorting | ✔ | ✅ | incl. global config |
| Initial sort via column (`sortIndex`/`sortOrder`) | ✔ | ✅ | + `groupIndex` (Phase 11); stateKey/user wins |
| Custom sort (`calculateSortValue`) | ✔ | ❌ | |

## 4. Filtering & search

| Feature | DevExtreme | oge | Notes |
|---|---|---|---|
| Filter row | ✔ | ✅ | dataType-aware editors, debounce |
| Filter row **operator menu** per cell | ✔ | ✅ | per-dataType operators + Reset (Phase 10) |
| Header filter (distinct values) | ✔ | ✅ | via `DataSource.distinct` |
| Header filter search box | ✔ | ✅ | Phase 10; grouped items still ❌ |
| Search panel | ✔ | ✅ | |
| Search result **highlighting** | ✔ | ✅ | default cells, `<mark>` (Phase 10) |
| **Filter Builder + filter panel** | ✔ | ✅ | recursive and/or editor + readable panel (Phase 10) |
| Programmatic filter value input/output | ✔ | ✅ | `[(filterValue)]`, persisted via `stateKey` (Phase 10) |
| `calculateFilterExpression` per column | ✔ | ❌ | |

## 5. Grouping & summaries

| Feature | DevExtreme | oge | Notes |
|---|---|---|---|
| Group panel drag & drop, multi-level | ✔ | ✅ | |
| Group summaries / total summaries | ✔ | ✅ | sum/avg/min/max/count, localized patterns |
| Multiple summaries per column | ✔ | 🟡 | one `groupSummary` + one `totalSummary` per column |
| Custom summary (`calculateCustomSummary`) | ✔ | ❌ | |
| Summaries in **group footer** | ✔ | ❌ | inline on group row only |
| Expand/collapse **all** (API + UI) | ✔ | ❌ | per-group only |
| `autoExpandGroup` control | ✔ | ❌ | always expanded by default |
| Column `groupIndex` input | ✔ | ✅ | Phase 11 |

## 6. Columns

| Feature | DevExtreme | oge | Notes |
|---|---|---|---|
| Resize / reorder / fixed (pin) / chooser | ✔ | ✅ | |
| minWidth / width / visible | ✔ | ✅ | |
| **Banded columns** (multi-row headers) | ✔ | ✅ | `<oge-column-group>` (Phase 11) |
| **Lookup columns** (display + dropdown editor) | ✔ | ✅ | display/filter/header-filter/editor/CSV (Phase 11); cascading still ❌ |
| Calculated columns (`calculateCellValue`) | ✔ | 🟡 | display/CSV (Phase 11); sort/filter on computed values ❌ |
| Adaptive column hiding (`hidingPriority`) | ✔ | ✅ | width-driven, restores automatically (Phase 11) |
| Command/buttons column customization | ✔ | ❌ | fixed edit/delete buttons only |
| Header/cell/edit templates | ✔ | ✅ | fully typed |
| Word wrap / auto row height | ✔ | ✅ | `wordWrap` input (Phase 11; virtual mode stays fixed-height) |

## 7. Selection, focus, keyboard

| Feature | DevExtreme | oge | Notes |
|---|---|---|---|
| single/multiple/checkbox + shift/ctrl | ✔ | ✅ | |
| Select-all (filtered) + indeterminate | ✔ | ✅ | |
| `selectAllMode: 'page'` | ✔ | ❌ | all-filtered only |
| Deferred selection | ✔ | ❌ | |
| Focused row mode (`focusedRowKey`) | ✔ | ❌ | cell focus only |
| Excel-like keyboard navigation | ✔ | ✅ | axe-verified ARIA |
| Clipboard copy | ✔ | ❌ | |

## 8. Editing

| Feature | DevExtreme | oge | Notes |
|---|---|---|---|
| cell / row / batch / popup modes | ✔ | ✅ | |
| **form** mode (inline form) | ✔ | ❌ | popup covers the dialog case |
| Validation rules | ✔ | ✅ | `required` + any Angular validators |
| Custom editors (`editCellTemplate`) | ✔ | ✅ | `*ogeEditTemplate` with FormControl |
| Lookup editors | ✔ | ✅ | default select editor (Phase 11); cascading ❌ |
| Row drag & drop reordering | ✔ | ❌ | |
| Confirmation on delete | ✔ | ❌ | deletes immediately (non-batch) |

## 9. Appearance, UX, misc

| Feature | DevExtreme | oge | Notes |
|---|---|---|---|
| Theming (tokens, dark, bridges) | ✔ | ✅ | arguably ahead (Tailwind/Bootstrap bridges) |
| Localization of all texts | ✔ | ✅ | `provideOgeGridConfig` messages |
| RTL support | ✔ | ❌ | |
| Row alternation (striping) | ✔ | ❌ | trivial token/option |
| Loading indicator | ✔ | 🟡 | opacity only; no spinner/panel |
| Custom no-data template | ✔ | ❌ | message-only |
| Row template (full row) | ✔ | ❌ | |
| Toolbar customization (custom items) | ✔ | ❌ | fixed layout |
| Context menu (rows) | ✔ | ✅ | event-driven items |
| Header context menu | ✔ | ✅ | sort/group/pin/hide, localized (Phase 9) |
| **State persistence** | ✔ | ✅ | `stateKey` + `OGE_STATE_STORAGE` (Phase 9) |
| **Export CSV/Excel** | ✔ | 🟡 | CSV done (Phase 9); Excel (exceljs) pending |
| Export PDF | ✔ | ❌ | post-0.1 |
| Imperative public API (refresh, expandAll, …) | ✔ | 🟡 | inputs/outputs only; no method surface |
| Event surface (cellClick, rowPrepared, …) | ✔ | 🟡 | rowClick/contextMenu/savingChanges only |
| Master-detail | ✔ | ✅ | typed template |
| Hierarchical data | TreeList | ❌ | separate future component |

## Prioritized backlog

**Phase 9: ✅ DONE** (state persistence, CSV export, header context menu, READMEs, v0.1.0 release prep; Excel export deferred to Phase 13).

**Phase 10 — Filtering parity: ✅ DONE** (filter builder + panel, operator menu, header-filter search, `[(filterValue)]`, search highlighting).

**Phase 11 — Column parity: ✅ DONE** (lookup columns + editors, banded columns, `calculateCellValue`, `sortOrder`/`sortIndex`/`groupIndex`, word wrap, adaptive hiding). Remaining → Phase 13: cascading lookups, buttons-column customization, `calculateFilterExpression`.

**Phase 12 — Data & scrolling parity (in progress):** ~~infinite scrolling~~ ✅ · ~~remote virtual scrolling~~ ✅ · ~~column virtualization~~ ✅ · ~~push/live updates wiring~~ ✅ · ~~OData adapter~~ ✅ · ~~measured variable row heights + scroll anchoring~~ ✅ · deferred group loading.

**Phase 13 — UX & API parity:** imperative API (`refresh`, `expandAll/collapseAll`, `scrollToRow`, `clearFilters`…) · richer event surface (`cellClick`, `rowDblClick`, `contentReady`) · expand/collapse-all UI · loading panel · row alternation · noData/row templates · toolbar customization · clipboard copy · focused-row mode · `selectAllMode: 'page'` · delete confirmation · form edit mode · row drag reordering · RTL · "All" page size + pager modes.
