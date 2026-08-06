# @oge-ui/tree-list

Hierarchical data grid (tree list) for Angular, built on the same engine as
[`@oge-ui/grid`](https://www.npmjs.com/package/@oge-ui/grid): shared column
model, theming, virtualization, keyboard navigation and data layer.

- Flat self-referencing data (`id` / `parentId`) or nested payloads (`itemsExpr`)
- O(visible) expand/collapse; 100k-node trees stay smooth with `virtualScroll`
- Lazy child loading against any `DataSource` (one `parentId eq key` request per expansion)
- Client-side filtering & search that keep ancestor rows visible — with
  `expandNodesOnFiltering`, per-column operator menu, a filter builder
  (`[(filterValue)]`) and `<mark>` search highlighting
- Excel-style header filter popups (distinct values with search), client-side
  paging over the visible rows
- Column chooser, drag-and-drop column reordering, row & header context menus,
  `[ogeToolbar]` slot, `commandButtons`, `loadPanel`, `wordWrap`
- Selection (single / multiple / checkbox / recursive tri-state), full treegrid ARIA, RTL-aware keyboard
- Editing in all five modes (cell / row / batch / form / popup) with the grid's
  editors, validators and `savingChanges` flow; `addRow(parentKey)` inserts
  under a chosen node
- Drag & drop: reparent by dropping onto a row, or reorder among siblings by
  dropping before/after (with drop indicators)
- State persistence (`stateKey`) for sort, filters, column layout and expansion
- CSV export with first-column indentation; Excel export
  (`@oge-ui/tree-list/export-excel`, lazy) with native spreadsheet outlining

## Install

```sh
npm i @oge-ui/tree-list @oge-ui/grid @oge-ui/core
```

## Quick start

```ts
import { OgeTreeList, OgeColumn } from '@oge-ui/tree-list';

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list [data]="tasks" keyExpr="id" parentIdExpr="parentId" [autoExpandAll]="true">
      <oge-column field="title" />
      <oge-column field="owner" />
      <oge-column field="progress" dataType="number" />
    </oge-tree-list>
  `,
})
export class TasksPage {
  tasks = [
    { id: 1, parentId: null, title: 'Planning', owner: 'Ada', progress: 80 },
    { id: 2, parentId: 1, title: 'Requirements', owner: 'Grace', progress: 100 },
  ];
}
```

`<oge-column>`, cell/header templates, themes and `provideOgeGridConfig` are the
grid's own building blocks — one shared configuration drives both components.

## Lazy loading (remote children)

Give it a `DataSource` plus `hasItemsExpr`; children are fetched per expansion
with `filter: [parentIdExpr, '=', parentKey]` (the root load uses `rootValue`):

```html
<oge-tree-list [data]="source" keyExpr="id" parentIdExpr="parentId" hasItemsExpr="hasSubordinates" />
```

The server sees a plain filter — an OData backend works out of the box
(`$filter=parentId eq 42`). A sort change invalidates the child cache; the
active sort is repeated on every child request. Lazy mode requires a string
`parentIdExpr`.

## Filtering

`filterRow` and `searchPanel` run **client-side over the loaded rows** — the
DataSource never receives filter/search, so ancestors of matches always stay
visible. `filterMode` controls the visible set: `'withAncestors'` (default,
matches + ancestor chain) or `'fullBranch'` (also all descendants of matches).

## State persistence

```html
<oge-tree-list [data]="rows" keyExpr="id" stateKey="tasks-tree" />
```

Sort, filters, column layout and the expansion state round-trip through
`OGE_STATE_STORAGE` (default: localStorage; pluggable with any async backend).
For full control use `state()` / `applyState()` and the `stateChange` output.

## Imperative API

`expandAll()`, `collapseAll()`, `expandRow(key)`, `collapseRow(key)`,
`isRowExpanded(key)`, `getNodeByKey(key)`, `scrollToRow(key | index)`,
`refresh()`, `clearFilters()`, `clearSorting()`, `state()`, `applyState()`.

## Theming

The shared theme files ship with `@oge-ui/grid` and style both components:

```css
@import '@oge-ui/grid/themes/dark.css';
```
