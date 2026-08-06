# @oge-ui/pivot

Pivot grid for Angular, built on the same signal-based foundation as
[`@oge-ui/grid`](https://www.npmjs.com/package/@oge-ui/grid). The aggregation
engine lives in `@oge-ui/core` as pure, framework-free TypeScript — the
component renders whatever the engine materializes.

- Four areas (row / column / data / filter) declared with `<oge-pivot-field>`
  directives; drag chips between areas or use the field chooser dialog
  (`applyChangesMode: 'instantly' | 'onDemand'`)
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
- Export: `getCsv()` / `exportCsv()` built in; Excel with merged multi-level
  headers and typed cells via the lazy `@oge-ui/pivot/export-excel` entry

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

Methods: `getResult()` (the matrix exactly as rendered), `drillDown(args)`,
`expandAll(area)` / `collapseAll(area)`, `getFieldLayout()`,
`showFieldChooser()`, `state()` / `applyState()`, `getCsv()` / `exportCsv()`.
Events: `(cellClick)` / `(cellDblClick)` → `{ rowPath, columnPath,
measureIndex, value, event }`, `(fieldLayoutChange)`, `(stateChange)`; the
DevExtreme `cellPrepared` callback maps to the `customizeCell` input, and
jQuery-era lifecycle members (`option()`, `repaint()`,
`onInitialized`/`onOptionChanged`/`onContentReady`) are intentionally not
replicated — signals and Angular lifecycle cover them.

## Theming

The shared theme files ship with `@oge-ui/grid` and style all suite components:

```css
@import '@oge-ui/grid/themes/dark.css';
```
