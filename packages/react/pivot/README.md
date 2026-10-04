# @oge-ui/react-pivot

React pivot grid from the [OGE UI](https://www.ogeui.com) suite — the React render
layer of [`@oge-ui/pivot`](https://www.npmjs.com/package/@oge-ui/pivot). Both
run the same framework-free engine
([`@oge-ui/pivot-engine`](https://www.npmjs.com/package/@oge-ui/pivot-engine))
and the same stylesheet, so a pivot behaves and looks identical in either
framework.

**Source-available commercial license** — free for evaluation and development,
a paid license is required for production use. See [LICENSE](LICENSE).

```sh
npm i @oge-ui/react-pivot
```

```tsx
'use client';

import { OgePivotGrid } from '@oge-ui/react-pivot';
import '@oge-ui/react-pivot/styles.css';

const fields = [
  { dataField: 'region', area: 'row' as const },
  { dataField: 'date', area: 'column' as const, groupInterval: 'year' as const },
  { dataField: 'amount', area: 'data' as const, summaryType: 'sum' as const },
];

export function Sales({ rows }: { rows: Sale[] }) {
  return <OgePivotGrid data={rows} fields={fields} />;
}
```

- Local rows or any remote `OgePivotStore` (pre-aggregated, abortable loads).
- Four field areas, a field chooser (live or `onDemand` draft). Field chips
  move by pointer drag (touch long press, Escape cancels; a drop on a chip
  inserts before it), by keyboard (Ctrl+Arrow reorder / change area, Delete
  removes) or from a field menu, with polite move announcements.
- Multi-level column headers, expand/collapse on both axes, sub and grand
  totals, percent-of / variation display modes and running totals.
- `calculatedFields` — measures computed from a cell's other measures, on
  totals too, with their own format and display mode.
- Member filters per row or column field: `labelFilter`, `valueFilter` and
  `topN`, applied before aggregation so totals follow.
- Header menus (sort, sort by summary, value filter, remove, expand/collapse
  all) and measure menus (summary type, display mode).
- `renderCell` / `renderRowHeader` / `renderColumnHeader` render props and
  `rowHeaderLayout` (`compact`, `outline`, `tabular`).
- Chart binding without a charts dependency: `getChartData()` on the handle
  (or `toChartSeries(result)`) returns a plain `dataSource` + `series` for
  `@oge-ui/react-charts`; `onResultChange` keeps a chart in sync.
- Two-axis virtual scrolling, one-tab-stop APG grid navigation across headers
  and values.
- `stateKey` persistence through the same `OgeGridStateStorageProvider` the
  React grid uses; `state()` / `applyState()` on the `ref` handle (snapshots
  are validated before they apply).
- `getCsv()` / `exportCsv()` on the handle, `@oge-ui/react-pivot/export-excel`
  for `.xlsx` (optional `exceljs` peer) and `@oge-ui/react-pivot/export-pdf`
  for PDF (optional `jspdf` + `jspdf-autotable` peers).
- `<OgePivotMessagesProvider>` localizes every string.

Docs and live demos: https://www.ogeui.com/components/pivot-grid (pick React in the
header switch).
