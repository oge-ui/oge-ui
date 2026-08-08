# @oge-ui/grid

Fast, complete **data grid for Angular** — built on signals, runs zoneless, themes through CSS design tokens. The first component of the **OGE** UI suite.

## Features

- **Virtualized rendering** — 100.000+ rows with ~30 DOM elements (Fenwick-tree windowing), measured variable row heights, column virtualization, infinite scrolling
- **Server-side data** — one serializable `LoadOptions` contract (skip/take/sort/filter/group) for .NET / Node backends, `AbortSignal` cancellation, OData v4 adapter, remote virtual scrolling with block cache
- **Live updates** — `ArrayDataSource.push()` patches changed cells in place
- **Sorting** — single & multi (Shift+click), stable, locale-aware, `calculateSortValue`
- **Filtering** — filter row with per-cell operator menu, Excel-style header filter with search, global search with highlighting, filter builder + panel, `calculateFilterExpression`
- **Grouping** — drag & drop group panel, multi-level, group/total aggregates (`sum · avg · min · max · count · custom`), multiple aggregates per column, group footer rows, deferred child loading, expand/collapse-all (API + toolbar)
- **Editing** — `cell` / `row` / `batch` / `popup` / `form` modes on Reactive Forms with validation, delete confirmation and cancelable `savingChanges`
- **Selection** — single / multiple / checkbox, filtered select-all (`selectAllMode: 'page' | 'allPages'`), Shift-ranges, focused-row mode, deferred selection as a serializable `selectionFilter` expression
- **Columns** — resize, reorder, pin, chooser, banded headers, lookup columns (incl. cascading), calculated columns, adaptive hiding, typed cell/header/edit templates, customizable command buttons
- **Master-detail** — fully typed `*ogeDetailTemplate`; custom full-row rendering via `*ogeRowTemplate`
- **Row drag & drop** — handle-based reordering with `rowReordered` event
- **Keyboard & a11y** — Excel-like navigation, WAI-ARIA grid/treegrid pattern, axe-verified, clipboard copy (Ctrl+C)
- **RTL** — `rtlEnabled` or auto-detected, fully mirrored layout
- **Header & row context menus** — built-in sort/group/pin/hide items arrive prebuilt and mutable (`headerContextMenu`), row menus fully event-driven (`rowContextMenu`)
- **State persistence** — `stateKey` restores sort/filters/grouping/column layout through any sync or async backend (localStorage, API, IndexedDB via `OGE_STATE_STORAGE`), or take control with `state()` / `applyState()` and the debounced `stateChange` event
- **Export** — CSV built in, Excel via lazy `@oge-ui/grid/export-excel` (exceljs) and PDF via lazy `@oge-ui/grid/export-pdf` (jspdf) — heavy libs stay out of your main bundle; `scope: 'all' | 'page' | 'selection'`
- **Toolbar** — default items plus your own controls via the `[ogeToolbar]` slot
- **Imperative API** — `refresh`, `scrollToRow`, `navigateToRow`, `clearFilters`, `clearSorting`, `expandRow`/`collapseRow`/`isRowExpanded`, `expandAllGroups`/`collapseAllGroups`, `selectAll`/`deselectAll`/`clearSelection`/`isRowSelected`/`getSelectedRowsData`, `getVisibleRows`/`getRowByKey`, `addRow`/`editRow`/`deleteRow`/`saveChanges`/`discardChanges`/`hasChanges`, `beginCustomLoading`/`endCustomLoading`, `pageIndex`/`setPageIndex`/`pageSize`/`setPageSize`/`pageCount`/`totalCount`, `state`/`applyState`, `getExportData`/`getCsv`/`exportCsv`, `copyToClipboard`
- **Theming** — `--oge-*` design tokens, dark theme, Tailwind & Bootstrap bridge themes, row striping, loading panel
- **Localization** — every UI string configurable via `provideOgeGridConfig`

## Installation

```sh
npm install @oge-ui/core @oge-ui/grid
```

Requires Angular ≥ 22. All components are standalone.

For Excel export, additionally install the optional peer and lazy-import the secondary entry:

```sh
npm install exceljs
```

```ts
const { exportGridToExcel } = await import('@oge-ui/grid/export-excel');
await exportGridToExcel(grid, { filename: 'orders.xlsx', scope: 'all' });
```

### Security note on export dependencies

The grid's only hard runtime dependency is `@oge-ui/core` (zero third-party
code). `exceljs`, `jspdf` and `jspdf-autotable` are **optional peer
dependencies**: they are never installed, bundled or executed unless you
install them yourself to use the `/export-excel` / `/export-pdf` secondary
entries. Supply-chain scanners (Socket, Snyk…) attribute those libraries'
transitive trees — minified bundles, `eval` in canvg/core-js, deprecated
utilities, install scripts — to this package's dependency graph; skipping the
export peers skips all of it.

## Quick start

```ts
import { Component } from '@angular/core';
import { OgeGrid, OgeColumn, OgeCellTemplate } from '@oge-ui/grid';

@Component({
  selector: 'app-orders',
  imports: [OgeGrid, OgeColumn, OgeCellTemplate],
  template: `
    <oge-grid [data]="orders" keyField="id" [paging]="{ pageSize: 20 }" [filterRow]="true" [searchPanel]="true">
      <oge-column field="id" caption="#" [width]="70" dataType="number" />
      <oge-column field="customer" caption="Customer" />
      <oge-column field="total" caption="Total" dataType="number" />
      <oge-column field="status" caption="Status">
        <span *ogeCellTemplate="let value" class="badge">{{ value }}</span>
      </oge-column>
    </oge-grid>
  `,
})
export class OrdersPage {
  orders = [
    { id: 1, customer: 'ACME', total: 1250, status: 'Shipped' },
    { id: 2, customer: 'Globex', total: 480, status: 'Pending' },
  ];
}
```

## Migrating from other data grids

Coming from DevExtreme? Every callback you wired there exists here,
signal-first:

| DevExtreme                                                     | OGE                                                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `onRowClick` / `onRowDblClick`                                 | `(rowClick)` / `(rowDblClick)` → `{ row, key, event }`                                         |
| `onCellClick` / `onCellDblClick`                               | `(cellClick)` / `(cellDblClick)` → `{ row, key, field, value, event }`                         |
| `onSelectionChanged`                                           | `(selectionChanged)` → `{ selectedKeys, addedKeys, removedKeys }` + `[(selectedKeys)]`         |
| `onFocusedRowChanged`                                          | `(focusedRowChanged)` → `{ key, row }` + `[(focusedRowKey)]`                                   |
| `onEditingStart`                                               | `(editingStart)` → `{ key, row, field?, cancel }` (cancelable, cell & row editors)             |
| `onInitNewRow`                                                 | `(initNewRow)` → `{ key, values }` — write into `values` to prefill                            |
| `onRowInserting/-ed`, `onRowUpdating/-ed`, `onRowRemoving/-ed` | same names, per-change around the DataSource write; `-ing` events cancelable                   |
| `onSaving` / `onSaved`                                         | `(savingChanges)` (cancelable, whole batch) / `(savedChanges)`                                 |
| `onEditCanceled`                                               | `(editCanceled)`                                                                               |
| `onExporting`                                                  | `(exporting)` → `{ fileName, cancel }` (CSV path)                                              |
| `onDataErrorOccurred`                                          | `(dataErrorOccurred)` → `{ error }`                                                            |
| `onContextMenuPreparing`                                       | `(rowContextMenu)` / `(headerContextMenu)` — prebuilt, mutable `items`                         |
| `onRowExpanding/…` (master-detail/groups)                      | not evented on the grid (tree-list has all four); `expandRow`/`collapseRow` cover the API side |
| `onKeyDown`                                                    | native `(keydown)` bubbles from the host                                                       |
| `onInitialized` / `onOptionChanged` / `onContentReady`         | Angular lifecycle, `effect()`, signals — not needed (`(contentReady)` fires post-render)       |

## Remote data

```ts
import { CustomDataSource } from '@oge-ui/core';

const source = new CustomDataSource<Order>({
  key: 'id',
  // LoadOptions = { skip, take, sort, filter, searchText, group, ... } — serialize as-is
  load: (options) => http.post<LoadResult<Order>>('/api/orders/query', options),
});
// <oge-grid [data]="source"> delegates sort/filter/page/group to the server.
```

## Theming

```css
/* override design tokens anywhere */
.oge-grid {
  --oge-header-bg: #eef2f8;
  --oge-row-height: 32px;
}

/* or use a bridge theme so the grid follows your CSS framework */
@import '@oge-ui/grid/themes/tailwind.css'; /* Tailwind v4  */
@import '@oge-ui/grid/themes/bootstrap.css'; /* Bootstrap 5  */
@import '@oge-ui/grid/themes/dark.css'; /* + <html class="oge-theme-dark"> */
```

## Global configuration & localization

```ts
import { provideOgeGridConfig } from '@oge-ui/grid';

providers: [
  provideOgeGridConfig({
    rowHeight: 32,
    allowUnsorting: false,
    messages: { noData: 'Veri yok', search: 'Ara…', rowsSuffix: 'satır' },
  }),
];
```

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/grid/llms.txt` — conventions, every documented member and
copy-pasteable demos in one file. Online: <https://ogeui.com/llms.txt> (index) and
<https://ogeui.com/llms-full.txt> (the whole suite).

## License

MIT
