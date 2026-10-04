# @oge-ui/react-tree-list

React tree list (a hierarchical data grid) from the OGE UI suite — running the
**same** framework-free engine as the Angular `@oge-ui/tree-list` package. The
tree model (index, expansion polarity, ancestor-preserving filtering, lazy
children, remote match discovery, recursive selection, paging over the
flattened rows, drag & drop reparenting, the export shape) is
`@oge-ui/behavior`'s `OgeTreeListCore`; the grid's state slices, data core,
column resolver, row/column virtualizers, keyboard machine and persistence
core come from the same place, and the markup is the same `.oge-tree-list`
structure the one shared stylesheet styles.

The OGE suite is one component engine with a native render layer per
framework: nothing here wraps Angular.

## What ships

- **`<OgeTreeList>`** — flat `id`/`parentId` data or nested payloads
  (`itemsExpr`), `rootValue` / `orphanPolicy`, lazy per-expansion loading
  from any `DataSource` (`hasItemsExpr`, `loadMode`) with remote filter
  discovery, controlled or uncontrolled expansion (`expandedRowKeys`,
  `autoExpandAll`) with the cancelable `onRowExpanding` / `onRowCollapsing`
  pipeline, the filter row, header filter, search panel and filter builder
  (`filterMode: 'withAncestors' | 'fullBranch'`), sibling-scoped sorting,
  `single` / `multiple` / `checkbox` selection with recursive tri-state
  cascades, paging over the visible rows, row and column virtualization,
  editing in `cell` / `row` / `batch` / `form` / `popup` mode with
  `addRow(parentKey)` + `onInitNewRow`, drag & drop reparenting
  (`rowDragging` + `onRowReparented`), WAI-ARIA treegrid keyboard navigation,
  keyboard context menus (Menu key / Shift+F10), pinned, resizable and
  reorderable columns, bands (`bandCaption`), the column chooser, `stateKey`
  persistence (snapshots validated before they apply) and synchronous CSV
  export.
- **Summaries and remote filtering** — `summary.totalItems` (a footer row) and
  `summary.recursiveItems` (per-parent sum / avg / min / max / count / custom
  aggregates), both carried into the exports; `remoteOperations.filtering`
  sends filter, search and header-filter value requests to the source, which
  answers with the matches plus their ancestors.
- **Accessibility and small screens** — keyboard alternatives for every drag
  (Ctrl+Arrow moves and indents / outdents rows, Ctrl+Shift+Arrow reorders
  columns, Alt+Arrow resizes on a focusable separator), pointer-gesture drags
  with touch support, live announcements (`announcements` opt-out), and
  `columnHidingMode` (`'detail'` by default) for columns hidden by
  `hidingPriority`.
- **`@oge-ui/react-tree-list/export-excel`** — `exportOgeTreeListToExcel()`
  with Excel row outlining (optional `exceljs` peer).
- **`@oge-ui/react-tree-list/export-pdf`** — `exportOgeTreeListToPdf()` with
  indented rows and summaries (optional `jspdf` + `jspdf-autotable` peers;
  pass a `font` for non-WinAnsi text).
- Columns, config and storage are the grid's: `OgeGridColumnProps`,
  `<OgeGridConfigProvider>` and `<OgeGridStateStorageProvider>` are
  re-exported, exactly as the Angular tree list re-exports `@oge-ui/grid`'s
  column API.

## Install

```sh
npm install @oge-ui/react-tree-list
```

```tsx
import { OgeTreeList } from '@oge-ui/react-tree-list';
import '@oge-ui/react-tree-list/styles.css';
// the editors, toolbar, popups and edit form bring their own stylesheets
import '@oge-ui/react-inputs/styles.css';
import '@oge-ui/react-layout/styles.css';
import '@oge-ui/react-overlay/styles.css';

export function Org({ rows }: { rows: Employee[] }) {
  return (
    <OgeTreeList
      data={rows}
      keyExpr="id"
      parentIdExpr="parentId"
      autoExpandAll
      columns={[
        { field: 'name', caption: 'Name' },
        { field: 'title', caption: 'Title', width: 140 },
      ]}
    />
  );
}
```

Methods are on the `ref` handle (`OgeTreeListHandle`): `expandAll()`,
`focusRow(key)`, `addRow(parentKey)`, `getSelectedRowKeys('leavesOnly')`,
`getCsv()`, …

Docs: <https://www.ogeui.com/components/tree-list> (switch the header to React).

## License

MIT
