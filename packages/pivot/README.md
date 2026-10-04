# @oge-ui/pivot

> **Commercial package.** Unlike the rest of the OGE UI suite (MIT), the
> pivot grid is source-available commercial software: free for evaluation,
> development and testing — a paid license is required for production use.
> See [LICENSE](LICENSE) and [ogeui.com/license](https://www.ogeui.com/license).

Pivot grid for Angular, built on the same signal-based foundation as
[`@oge-ui/grid`](https://www.npmjs.com/package/@oge-ui/grid). The aggregation
engine lives in `@oge-ui/core` as pure, framework-free TypeScript and the grid
core (layout, keyboard, field moves, chart binding, calculated fields, member
filters) in the commercial
[`@oge-ui/pivot-engine`](https://www.npmjs.com/package/@oge-ui/pivot-engine)
that the React pivot shares — the component renders whatever the engines
materialize.

- Four areas (row / column / data / filter) declared with `<oge-pivot-field>`
  directives; drag chips between areas (pointer events — a drop on a chip
  inserts before it, touch needs a long press, Escape cancels) or use the
  field chooser dialog (`applyChangesMode: 'instantly' | 'onDemand'`)
- Keyboard and single-pointer alternatives to dragging: each chip is a
  focusable button with a field menu (move left / right, move to each area,
  remove — Enter / Space / Shift+F10), Ctrl+Left/Right reorders, Ctrl+Up/Down
  changes area, Delete removes; every move is announced. Headers and cells
  share one roving tab stop (APG grid)
- Single-pass aggregation: axis paths are interned once, expand/collapse only
  re-materializes the visible matrix; an expanded group keeps its own line,
  which carries the subtotals
- Summary types (sum / count / avg / min / max / custom reducers) and display
  modes: percent of row/column/grand totals, running totals with per-group
  reset, absolute/percent variation against the previous column
- Date and numeric group intervals (`year` / `quarter` / `month` / `day` /
  `dayOfWeek`, numeric bucket size)
- Sorting by labels or by a summary value at any opposite-axis path; field
  filters with include/exclude and searchable distinct values
- Drill-down: `drillDown({ rowPath, columnPath })` returns the raw rows behind
  any cell, with timezone-safe date range filters for remote stores
- Two-axis virtual scrolling (`[virtualScrolling]="true"`) — only visible
  headers and cells hit the DOM on both axes
- Remote mode: implement `OgePivotStore` and receive fully serializable
  `PivotLoadOptions` (fields, measures, expanded paths, filter); loads are
  abortable, `LocalPivotStore` is the reference implementation
- `customizeCell` appearance hook, keyboard navigation over the matrix,
  localizable via the `OGE_PIVOT_MESSAGES` token
- State persistence (`stateKey`) through the shared `OGE_STATE_STORAGE`
  token; `state()` / `applyState()` / `stateChange` for manual control
- Calculated measures (`calculatedFields`: computed from a cell's other
  measures, totals included, with format, display modes and running totals),
  label / value / Top-N member filters applied before aggregation,
  `rowHeaderLayout: 'compact' | 'outline' | 'tabular'`, and
  `*ogePivotCellTemplate` / `*ogePivotRowHeaderTemplate` /
  `*ogePivotColumnHeaderTemplate`; `(resultChange)`, `getPreparedCell()`,
  `getRowHeaderLayout()`
- Chart binding: `getChartData()` turns the view into `@oge-ui/charts` series
  data (no dependency on the charts package)
- Export: `getCsv()` / `exportCsv()` built in; Excel with merged multi-level
  headers and typed cells via the lazy `@oge-ui/pivot/export-excel` entry; PDF
  via the lazy `@oge-ui/pivot/export-pdf` entry (`exportPivotToPdf`, Unicode
  fonts through `OgePdfFont`)
- Container-driven chrome: field areas wrap and the field chooser restacks on
  narrow widths; forced-colors and high-contrast safe

## Install

```sh
npm i @oge-ui/pivot @oge-ui/grid @oge-ui/core
```

## Quick start

```ts
import { OgePivotGrid, OgePivotField } from '@oge-ui/pivot';

@Component({
  imports: [OgePivotGrid, OgePivotField],
  template: `
    <oge-pivot-grid [data]="sales">
      <oge-pivot-field dataField="region" area="row" />
      <oge-pivot-field dataField="city" area="row" />
      <oge-pivot-field dataField="date" area="column" groupInterval="year" />
      <oge-pivot-field dataField="amount" area="data" summaryType="sum" />
    </oge-pivot-grid>
  `,
})
export class SalesPage {
  sales = [
    { region: 'EU', city: 'Berlin', date: '2024-03-01', amount: 100 },
    { region: 'EU', city: 'Paris', date: '2024-06-11', amount: 50 },
  ];
}
```

## Display modes

Measures can post-process their values after aggregation:

```html
<oge-pivot-field dataField="amount" caption="% of Column" area="data" summaryType="sum" summaryDisplayMode="percentOfColumnGrandTotal" /> <oge-pivot-field dataField="amount" caption="Running" area="data" summaryType="sum" [runningTotal]="{ direction: 'row' }" />
```

The same options are reachable at runtime from each measure chip's menu.

## Remote data

Pass an `OgePivotStore` instead of an array. The store receives a serializable
description of the request — fields per area, measures as standard summary
descriptors, the combined field filter and the expanded paths of both axes —
and answers with header trees plus an aligned value matrix:

```ts
class SalesPivotStore implements OgePivotStore<Sale> {
  load(options: PivotLoadOptions): Promise<PivotLoadResult> {
    return this.http.post<PivotLoadResult>('/api/sales/pivot', options);
  }
}
```

Expanding a header issues a new load with the extended path set; in-flight
requests are aborted through `options.signal`.

## Export

```ts
grid.exportCsv('sales.csv'); // what's on screen, headers flattened

const { exportPivotToExcel } = await import('@oge-ui/pivot/export-excel');
await exportPivotToExcel(grid, { filename: 'sales.xlsx' });
```

The Excel entry keeps `exceljs` out of your main bundle (optional peer);
`buildPivotWorkbook(result)` is exported separately for custom pipelines.

## State persistence

```html
<oge-pivot-grid [data]="sales" stateKey="sales-report" />
```

Field layout (areas, order, summary settings, filters), expansion on both axes
and the field panel state round-trip through `OGE_STATE_STORAGE` (default:
localStorage; pluggable with any async backend).

## Imperative API & events

Methods: `getResult()` (the matrix exactly as rendered), `getChartData()`,
`getPreparedCell()`, `getRowHeaderLayout()`, `drillDown(args)`,
`expandAll(area)` / `collapseAll(area)`, `getFieldLayout()`,
`showFieldChooser()`, `state()` / `applyState()`, `getCsv()` / `exportCsv()`.
Events: `(cellClick)` / `(cellDblClick)` → `{ rowPath, columnPath,
measureIndex, value, event }`, `(fieldLayoutChange)`, `(stateChange)`,
`(resultChange)`; the
DevExtreme `cellPrepared` callback maps to the `customizeCell` input, and
jQuery-era lifecycle members (`option()`, `repaint()`,
`onInitialized`/`onOptionChanged`/`onContentReady`) are intentionally not
replicated — signals and Angular lifecycle cover them.

## Theming

The shared theme files ship with `@oge-ui/grid` and style all suite components:

```css
@import '@oge-ui/core/themes/dark.css';
```

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/pivot/llms.txt` — conventions, every documented member and
copy-pasteable demos in one file. Online: <https://www.ogeui.com/llms.txt> (index) and
<https://www.ogeui.com/llms-full.txt> (the whole suite).
