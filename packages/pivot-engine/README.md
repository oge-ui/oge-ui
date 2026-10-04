# @oge-ui/pivot-engine

The framework-free engine of the OGE UI pivot grid: plain TypeScript, no
Angular or React import anywhere. Both render layers run it —
[`@oge-ui/pivot`](https://www.npmjs.com/package/@oge-ui/pivot) (Angular) and
[`@oge-ui/react-pivot`](https://www.npmjs.com/package/@oge-ui/react-pivot)
(React) — so a pivot behaves identically whichever framework draws it.

**Source-available commercial license** — free for evaluation and development,
a paid license is required for production use. See [LICENSE](LICENSE).

You rarely install this package directly: both render packages depend on it.

## What's inside

- `OgePivotGridCore` — the whole pivot grid below the template: field layout
  resolution (declared fields + user overrides), the local-engine /
  remote-store split with abortable loads, axis lines and multi-row column
  header layout, two-axis virtualization windows, cell text and the
  `customizeCell` hook, one roving tab stop over headers and cells, pointer
  drag of field chips (`fieldPointerDown`, long press on touch) plus the
  field menu and chip keyboard that run the same `moveFieldTo`, polite move
  announcements, the header and measure context menus, the distinct-value
  filter popup, the field chooser (live or draft), persistence snapshots and
  CSV export.
- `OgePivotStateCore` — field-layout overrides, the expansion of both axes
  and the field-panel flag, on a pluggable reactivity adapter (`signal()` in
  Angular, a versioned store in React).
- Pure helpers — `pivotFieldConfigOf`, `buildPivotLoadOptions`,
  `pivotResultFromPayload`, `pivotColumnHeaderCells`, `pivotRowWindow`,
  `pivotMatrixKeyTarget` and friends — each unit-tested on its own.
- Analysis helpers — `toChartSeries(result)` (the current view as plain
  `dataSource` + series for `@oge-ui/charts`; no charts dependency), the
  calculated-field evaluator behind `calculatedFields` and
  `applyPivotMemberFilters` (label / value / Top-N filters before aggregation).
- `OGE_DEFAULT_PIVOT_MESSAGES` — the message catalog both layers localize.
- `@oge-ui/pivot-engine/export-excel` — `buildPivotWorkbook`, the `.xlsx`
  builder with merged multi-level headers (`exceljs` is an optional peer).
- `@oge-ui/pivot-engine/export-pdf` — `buildPivotPdfDocument` /
  `downloadPivotPdf` (`jspdf` + `jspdf-autotable` optional peers; Unicode text
  through an `OgePdfFont`).

The aggregation itself (`PivotEngine`, `PivotFieldConfig`, the
`OgePivotStore` remote contract) is MIT and lives in
[`@oge-ui/core`](https://www.npmjs.com/package/@oge-ui/core).
