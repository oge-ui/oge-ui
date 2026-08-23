# @oge-ui/react-grid

React data grid from the OGE UI suite — running the **same** framework-free
grid engine as the Angular `@oge-ui/grid` package: the state slices (sort,
paging, filter, selection, column layout), the data core with switchMap loads
and windowed block fetching, the column resolver, the row and column
virtualizers, the keyboard machine and the persistence core all come from
`@oge-ui/behavior`, and the markup is the same `.oge-grid` structure the one
shared stylesheet styles.

The OGE suite is one component engine with a native render layer per
framework: nothing here wraps Angular, and the React layer is heading for full
component and feature parity with the Angular suite, family by family.

## What ships

- **`<OgeGrid>`** — data-driven columns (`columns={[…]}`) with `renderCell` /
  `renderHeader` render props, in-memory arrays or any `DataSource`,
  multi-column sorting (shift+click chains, `aria-sort`), a typed filter row
  (text, number, date, boolean, lookup editors) with a per-column operator
  menu, a global search panel, paging with the full pager, row virtualization
  with measured heights, column virtualization, windowed remote loading and
  infinite scrolling, `single` / `multiple` / `checkbox` selection with shift
  ranges, Ctrl+A and a select-all header checkbox, Excel-like keyboard
  navigation on a roving tabindex, a focused row, pinned, resizable and
  drag-reorderable columns, responsive column hiding, `stateKey` persistence,
  CSV export and clipboard copy — and grouping with a drag-and-drop group
  panel, group / footer / total summaries, custom summaries and deferred group
  loading, master-detail (`renderDetail`), whole-row (`renderRow`) and empty
  state (`renderNoData`) render props, and row drag with `onRowReordered` —
  every one of them through the same machine the Angular grid drives.
- **`<OgePager>`** — the grid's pager, also usable on its own.
- **`<OgeGridConfigProvider>`** — the React counterpart of
  `provideOgeGridConfig()`; every default and every message string is
  single-sourced in `@oge-ui/behavior`.
- **`<OgeGridStateStorageProvider>`** — the counterpart of the
  `OGE_STATE_STORAGE` token: where `stateKey` persistence writes (default
  `localStorage`).

Editing (cell / row / batch / popup / form), the command column, header
filters, the filter builder, the column chooser, column bands and context
menus are the next slices of the same engine — tracked, with dates, in the
suite's `docs/REACT-PARITY.md`.

## Installation

```sh
npm install @oge-ui/react-grid
```

Requires React 18 or 19. `@oge-ui/behavior`, `@oge-ui/core`,
`@oge-ui/react-inputs` (the filter-row editors), `@oge-ui/react-layout` (the
toolbar) and `@oge-ui/react-overlay` (the operator menu) come along as regular
dependencies.

```tsx
import { OgeGrid } from '@oge-ui/react-grid';
import '@oge-ui/react-grid/styles.css';
import '@oge-ui/react-inputs/styles.css';
import '@oge-ui/react-layout/styles.css';
import '@oge-ui/react-overlay/styles.css';

const columns = [{ field: 'id', caption: '#', width: 60, dataType: 'number' }, { field: 'customer' }, { field: 'total', dataType: 'number', format: money }, { field: 'shipped', dataType: 'date', width: 120 }];

export function Orders() {
  return <OgeGrid data={orders} keyField="id" columns={columns} paging={{ pageSize: 10 }} filterRow selectionMode="multiple" />;
}
```

The umbrella `@oge-ui/react` re-exports this package and ships one combined
stylesheet.

## Documentation

Live demos and the full API reference: <https://ogeui.com/components/data-grid>
(switch the header to **React**). The package also ships an `llms.txt` for
coding assistants.

## License

MIT
