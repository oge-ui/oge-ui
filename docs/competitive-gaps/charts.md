# Charts family: competitive feature-gap report

Date: 2026-10-03. Scope: `@oge-ui/charts` (Angular), `@oge-ui/react-charts` (`packages/react/charts`), `@oge-ui/charts-engine`.
Components: `oge-chart` (cartesian), `oge-pie-chart`, `oge-polar-chart`, `oge-range-selector`, plus their React twins (`chart.tsx`, `pie-chart.tsx`, `polar-chart.tsx`, `range-selector.tsx`).

Competitors: DevExtreme (dx), Kendo UI for Angular (K), Syncfusion (SF), Highcharts (HC), amCharts 5 (am), AG Charts Enterprise (AG).

How I checked: I read `charts-api-data.ts`, ROADMAP.md §Charts, `series-model.ts`, `charts-types.ts`, `chart-keyboard.ts`, `chart-gesture.ts`, `polar-model.ts`, `pie-model.ts`, `range-selector-model.ts` and `chart.scss`. Every "Missing" claim was grepped across `packages/charts`, `packages/charts-engine` and `packages/react/charts`, excluding spec files. Competitor coverage comes from the official docs pages I fetched (Kendo series-types, DevExtreme series-types, AG Charts Enterprise) and from documented product feature lists. Where I am less sure about one vendor, the row says so.

## What OGE has today (baseline)

- **16 cartesian series types:** line, spline, stepLine, area, splineArea, stepArea, stackedArea, fullStackedArea, bar, stackedBar, fullStackedBar, rangeBar, scatter, bubble, rangeArea, candlestick.
- **Series options:** `stack` groups (negatives handled separately), dashStyle, width and opacity, initial `visible`, `showLabels` (only on small series, under `markerThreshold`).
- **Axes:**
  - The argument axis auto-detects number, date or category. Time ticks follow real calendar boundaries and are DST-safe.
  - Value axes support logarithmic scale, `inverted`, several value axes (`axis` index, `position:'end'`), SI abbreviation, `labelFormat`, and label overlap handling (rotate or skip).
- **Strip lines:** on the argument axis only, as a line or a band.
- **Annotations:** point and text types, plus an HTML template.
- **Zoom and pan:** wheel zoom, drag-select zoom, Shift+drag pan, `[(visualRange)]`, Escape to reset, and `zoomToRange`/`resetZoom`.
- **Tooltip and crosshair:** single or shared tooltip with a template; vertical crosshair, optionally horizontal too.
- **Legend:** interactive, four positions, a template, a cancelable click, and hover spotlight.
- **Selection:** point or series mode, Ctrl adds points, Enter selects.
- **Accessibility:**
  - Keyboard point inspection (arrow keys walk arguments and series, Home/End jump).
  - Live announcements.
  - A screen-reader data table (`a11yTableLimit`).
  - Reduced motion and forced-colors support.
  - Dark and high-contrast themes through `--oge-chart-*` tokens.
- **Performance:** automatic LTTB downsampling with a 50k-point smoke test.
- **Export:** PNG and SVG through `@oge-ui/charts/export-image`, plus `getExportData()`.
- **Sizing and i18n:** ResizeObserver sizing; i18n through messages and `locale`.
- **Pie:** pie and doughnut, `innerRadius`, `startAngle`, small-values grouping ("Others"), outside labels that avoid overlapping, slice selection.
- **Polar:** line, area, scatter and bar types, spider (polygon) grid, `startAngle`, selection.
- **Range selector:** a mini chart (area or line) with draggable window handles that follow the APG slider pattern, `scaleType` time or linear, `[(value)]`.

## 1. Cartesian chart: series types

| Feature                                                                                   | Who has it                                                     | OGE status                                                                                                                  | Impact | Effort                                                   |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------- |
| Line/spline/step/area families                                                            | all                                                            | Have                                                                                                                        | –      | –                                                        |
| Stacked/fullStacked area                                                                  | all                                                            | Have                                                                                                                        | –      | –                                                        |
| stackedLine / stackedSpline / fullStackedLine / stackedSplineArea / fullStackedSplineArea | dx, SF, HC                                                     | Missing (grep: none; the type union stops at stackedArea/fullStackedArea)                                                   | M      | S (the stack accumulator already exists)                 |
| Column vs **horizontal bar** (rotated chart / `rotated:true` / `type:'bar'` horizontal)   | dx (rotated), K (bar vs column), SF (isTransposed), HC, am, AG | **Missing**: `bar` draws vertical columns only, and nothing in the engine swaps the axes (`argRotated` only rotates labels) | **H**  | M (layout transpose in cartesian-model plus hit-testing) |
| Range bar / range area                                                                    | dx, K, SF, AG                                                  | Have                                                                                                                        | –      | –                                                        |
| Candlestick                                                                               | all                                                            | Have                                                                                                                        | –      | –                                                        |
| OHLC bars (stock series)                                                                  | dx (`stock`), K, SF (Hilo, HiloOpenClose), HC, AG              | Missing (candlestick only)                                                                                                  | M      | S                                                        |
| Waterfall (incl. intermediate and total sums)                                             | K, SF, HC, am, AG, dx (demo built from rangeBar)               | Missing                                                                                                                     | H      | M                                                        |
| Box plot (box and whisker)                                                                | K, SF, HC, AG                                                  | Missing                                                                                                                     | M      | M                                                        |
| Error bars (fixed, percent, stdDev, custom)                                               | dx, K, SF, HC                                                  | Missing (grep `errorBar`: 0)                                                                                                | M      | M                                                        |
| Histogram (auto binning)                                                                  | SF, HC, am                                                     | Missing                                                                                                                     | M      | S–M                                                      |
| Pareto (bars plus a cumulative line on a secondary axis)                                  | SF, HC                                                         | Missing (could be composed by hand today, but there is no first-class type)                                                 | L      | S                                                        |
| Bullet chart                                                                              | K (series), SF (component), AG                                 | Missing                                                                                                                     | M      | M                                                        |
| Heatmap (category × category colour grid)                                                 | K (series), SF (component), HC, am, AG                         | Missing                                                                                                                     | H      | M                                                        |
| Spline range area / step range                                                            | dx, SF, HC                                                     | Missing                                                                                                                     | L      | S                                                        |
| Lollipop / dumbbell                                                                       | HC, am                                                         | Missing                                                                                                                     | L      | S                                                        |
| Mixed series in one chart                                                                 | all                                                            | Have                                                                                                                        | –      | –                                                        |
| Per-point colour (`colorField` / `customizePoint` / `pointColorMapping`)                  | dx, K, SF, HC, AG                                              | **Missing** (grep: none)                                                                                                    | H      | S                                                        |
| Gradient and pattern fills                                                                | SF, HC, am, AG                                                 | Missing                                                                                                                     | L      | M                                                        |
| Bar corner radius, bar width/spacing control                                              | dx, K, SF, AG                                                  | Missing (grep `cornerRadius`/`barWidth`: 0)                                                                                 | L      | S                                                        |
| Bubble min/max size                                                                       | dx, SF, HC                                                     | Partial: `sizeField` maps to area, but no min/max size options                                                              | L      | S                                                        |
| 3D charts                                                                                 | SF (3D chart), am                                              | Missing                                                                                                                     | L      | L (and arguably off-brand)                               |

## 2. Axes and plot layout

| Feature                                                                  | Who has it                                          | OGE status                                                                       | Impact                                                   | Effort                                                |
| ------------------------------------------------------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| Numeric, date-time and category argument axes, with auto-detect          | all                                                 | Have                                                                             | –                                                        | –                                                     |
| Logarithmic value axis                                                   | all                                                 | Have                                                                             | –                                                        | –                                                     |
| Multiple value axes, opposite side                                       | all                                                 | Have                                                                             | –                                                        | –                                                     |
| Multiple **argument** axes                                               | K, SF, HC                                           | Missing                                                                          | L                                                        | M                                                     |
| **Panes** (stacked plot areas sharing one argument axis)                 | dx, K, SF (rows/columns), HC (yAxis top/height), AG | **Missing** (grep `pane`: only `panEnabled`)                                     | **H** (needed for financial and price+volume dashboards) | L                                                     |
| Axis breaks / scale breaks                                               | dx, SF, HC                                          | Missing                                                                          | M                                                        | M                                                     |
| Discrete axis with explicit `categories` order                           | dx, K                                               | Partial: categories come from data order; there is no explicit `categories` list | M                                                        | S                                                     |
| DateTimeCategory axis (dates with no gaps for weekends)                  | SF, HC (`ordinal`), K (`baseUnit` category dates)   | Missing                                                                          | M (stock charts)                                         | M                                                     |
| `tickInterval` / `minorTicks` / `tickCount`                              | all                                                 | Missing (grep `tickInterval`: 0; nice ticks are automatic only)                  | M                                                        | S                                                     |
| Axis label template or rich label                                        | dx, K, SF                                           | Partial: `labelFormat` function only, no template                                | L                                                        | S                                                     |
| Strips on the **value** axis                                             | dx, K (plotBands on both axes), SF, HC, AG          | Missing (`stripLines` is argument-axis only)                                     | M                                                        | S                                                     |
| Constant lines on the value axis (target or threshold line with a label) | dx, K, SF, HC, AG                                   | Missing (grep `constantLine`: 0; a value-axis line is not possible)              | **H**                                                    | S                                                     |
| Crosshair axis labels                                                    | dx, K, SF, HC, AG                                   | Unverified/likely missing: `crosshair` has only `{enabled, horizontal}`          | M                                                        | S                                                     |
| Value-axis zoom (x+y or y only)                                          | dx, SF, HC, AG                                      | Missing: zoom is argument-axis only                                              | L                                                        | M                                                     |
| Synchronised axes across charts                                          | HC, dx demos, SF                                    | Missing as a feature; possible by hand via `[(visualRange)]`                     | M                                                        | S (document the pattern plus a shared-crosshair hook) |

## 3. Annotations, indicators and analytics

| Feature                                                                          | Who has it                                                         | OGE status                                                                             | Impact      | Effort                                                  |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------- |
| Point and text annotations, HTML template                                        | dx, SF, HC, am, AG                                                 | Have                                                                                   | –           | –                                                       |
| Shape annotations (rect, line, arrow) and image annotations                      | dx (image), SF, HC, AG                                             | Missing                                                                                | L           | S                                                       |
| User-drawn annotations or drawing tools (Fibonacci, channel, trend line)         | HC Stock, AG Financial, SF Stock                                   | Missing (Skipped in ROADMAP)                                                           | M (finance) | L                                                       |
| Trendlines (linear, exponential, log, polynomial, power, moving average)         | K, SF, HC, am, AG                                                  | Missing (grep `trend`: no match apart from `afterNextRender`)                          | **H**       | S–M (pure math in the engine)                           |
| Technical indicators (SMA, EMA, Bollinger, MACD, RSI, ATR, Stochastic, Momentum) | SF (10+), HC Stock (40+), AG Financial, am Stock                   | Missing (Skipped in ROADMAP)                                                           | M           | M (pure engine functions plus a "derived series" input) |
| Stock-chart composite (navigator, range buttons, indicators, panes, volume)      | K (StockChart), SF (Stock Chart), HC Stock, AG Financial, am Stock | Partial: a range selector exists, but there are no panes, period buttons or indicators | H           | L                                                       |
| Drill-down (click a point to reload the series, with a breadcrumb)               | HC (drilldown module), am, SF (demo), dx/K (demos)                 | Missing as a feature; it can be done through `pointClick`                              | M           | S–M                                                     |

## 4. Interaction

| Feature                                                         | Who has it                    | OGE status                                                                              | Impact     | Effort |
| --------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------- | ---------- | ------ |
| Wheel zoom, drag-select zoom, pan                               | all                           | Have                                                                                    | –          | –      |
| **Touch pinch zoom / two-finger pan**                           | dx, K, SF, HC, AG             | **Missing**: the gesture machine tracks a single pointer only (grep `pinch`/`touch`: 0) | H (mobile) | M      |
| Zoom scrollbar on the axis                                      | dx, SF, HC                    | Missing (grep `scrollbar`: 0)                                                           | M          | M      |
| Keyboard zoom and pan (+/−, Shift+arrows)                       | HC (a11y), AG                 | Missing: the key map has argument, series, activate and resetZoom only                  | M          | S      |
| Shared and single tooltip with a template                       | all                           | Have                                                                                    | –          | –      |
| Tooltip follow-pointer or fixed position options                | SF, HC, AG                    | Unverified                                                                              | L          | S      |
| Interactive legend with toggle and template                     | all                           | Have (plus a hover spotlight extra)                                                     | –          | –      |
| Legend paging/scroll when it overflows                          | dx, K, SF, HC, AG             | Unverified/likely missing                                                               | L          | S      |
| Point and series selection (multiple)                           | dx, K, SF, AG                 | Have                                                                                    | –          | –      |
| Drag-rectangle **data** selection (lasso or box selects points) | SF, HC                        | Missing (drag is used for zoom)                                                         | L          | M      |
| Draggable points (edit a value by dragging)                     | SF, HC (draggable-points), am | Missing                                                                                 | L          | M      |
| Context menu / export menu button                               | HC, AG                        | Missing                                                                                 | L          | S      |

## 5. Data labels

| Feature                                             | Who has it                                 | OGE status                                                                                                                                                               | Impact | Effort |
| --------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ |
| Value labels on points                              | all                                        | **Partial**: `showLabels` applies only to small series under `markerThreshold`. There is no position (inside/outside/center), no label template and no per-series format | H      | S–M    |
| Smart label overlap resolution (cartesian)          | dx (`resolveLabelOverlapping`), SF, HC, AG | Partial: axis labels yes, data labels unverified                                                                                                                         | M      | M      |
| Pie labels outside with connectors and anti-overlap | all                                        | Have                                                                                                                                                                     | –      | –      |
| Pie labels inside or in columns, percent formatting | all                                        | Partial: outside labels only, unverified beyond that                                                                                                                     | M      | S      |

## 6. Pie / accumulation family

| Feature                                                | Who has it                     | OGE status                                                                                         | Impact | Effort |
| ------------------------------------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------- | ------ | ------ |
| Pie and doughnut, start angle, small-value grouping    | all                            | Have                                                                                               | –      | –      |
| Center label inside the doughnut                       | dx (template), K, SF, AG       | Unverified/likely missing                                                                          | M      | S      |
| Exploded slice on click, `endAngle` (semi-donut), sort | dx, K, SF, HC                  | Partial: the explode geometry exists ("plain and exploded" in pie-model); semi-donut is unverified | L      | S      |
| Nested donut (multiple rings)                          | dx (multi-series pie), K, SF   | Missing                                                                                            | M      | M      |
| Funnel / pyramid                                       | dx (Funnel), K, SF, HC, am, AG | Missing                                                                                            | H      | M      |
| Sunburst                                               | SF, HC, am, AG                 | Missing                                                                                            | M      | M      |

## 7. Polar family

| Feature                                           | Who has it                                   | OGE status               | Impact | Effort |
| ------------------------------------------------- | -------------------------------------------- | ------------------------ | ------ | ------ |
| Polar line, area, scatter, bar; radar/spider grid | dx, K, SF, HC, AG                            | Have                     | –      | –      |
| Stacked polar bar: wind rose / Nightingale rose   | dx (windrose demo), SF, HC, AG (Nightingale) | Missing (grep `rose`: 0) | M      | S–M    |
| Radial bar / radial column                        | AG, am, SF (via radial gauge)                | Missing                  | M      | M      |
| Polar zoom / `endAngle` (partial polar)           | HC, am                                       | Missing                  | L      | M      |

## 8. Range selector / navigator

| Feature                                                          | Who has it                                  | OGE status                                          | Impact | Effort |
| ---------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------- | ------ | ------ |
| Mini chart with draggable window and two-way value               | dx, K (navigator), SF (Range Navigator), HC | Have                                                | –      | –      |
| Period buttons (1M / 3M / YTD / 1Y / All)                        | SF, HC, am                                  | Missing                                             | M      | S      |
| Discrete scale (categories), snap to ticks, min/max range length | dx, SF                                      | Partial: only `scaleType` time or linear            | L      | S      |
| Navigator built into the chart (`navigator:true`)                | K Stock, HC Stock, AG                       | Missing: a separate component that is wired by hand | M      | S      |

## 9. Rendering, performance, real-time

| Feature                                                                      | Who has it                                                           | OGE status                                                                              | Impact                  | Effort |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------- | ------ |
| Aggregation and downsampling (LTTB)                                          | dx, HC (dataGrouping), AG                                            | Have                                                                                    | –                       | –      |
| Canvas/WebGL renderer for 1M+ points                                         | HC (Boost, WebGL), SF (canvas mode), AG (canvas native), am (canvas) | Missing (SVG only, by design)                                                           | M–H for IoT and finance | L      |
| Real-time streaming API (append/shift points with animation, rolling window) | HC (`addPoint` shift), SF, am, AG                                    | Partial: replacing `dataSource` re-renders; no incremental API or rolling-window helper | M                       | S–M    |
| Initial load animation (grow/draw-in)                                        | all                                                                  | Partial: `animation` covers only hover and selection transitions                        | M (demo appeal)         | S–M    |
| Remote data binding (DataSource, async loading indicator, "no data" message) | dx (DataSource), K, SF (DataManager), HC (data module CSV/Sheets)    | Partial: arrays only; no loading or no-data state (unverified)                          | M                       | S      |

## 10. Export, print, accessibility, i18n, theming

| Feature                                                                | Who has it                                                                              | OGE status                                                                                                                   | Impact                                     | Effort                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| Export PNG/SVG                                                         | all                                                                                     | Have                                                                                                                         | –                                          | –                                                     |
| Export **PDF / JPEG / print()**                                        | dx (PDF via jsPDF, print), K (PDF via drawing), SF (PDF/print/XLSX/CSV), HC (exporting) | Missing (grep `pdf`: 0; `print` hits only a word in a comment)                                                               | M                                          | S (`print()` plus JPEG); M (PDF without dependencies) |
| Export of data to CSV/XLSX                                             | SF, HC (export-data), AG                                                                | Partial: `getExportData()` returns rows; no CSV helper                                                                       | L                                          | S                                                     |
| Keyboard navigation, screen-reader table, live region                  | HC (a11y module), AG, SF partially                                                      | Have (strong, ahead of most vendors)                                                                                         | –                                          | –                                                     |
| **Sonification** (audio charts)                                        | HC                                                                                      | Missing                                                                                                                      | L–M (differentiator)                       | M                                                     |
| Configurable chart description / `aria-describedby` / long description | HC, AG                                                                                  | Missing (grep: 0)                                                                                                            | M                                          | S                                                     |
| High-contrast, forced-colors, reduced motion                           | HC, partial in others                                                                   | Have                                                                                                                         | –                                          | –                                                     |
| **RTL** (mirrored axes, legend, tooltip)                               | dx (`rtlEnabled`), K, SF (`enableRtl`), am                                              | **Missing** (grep `rtl`/`direction`: no matches)                                                                             | M–H (suite already supports RTL elsewhere) | M                                                     |
| Themes and palettes (built-in palette set, dark)                       | all                                                                                     | Partial: one 10-colour palette plus token themes; no named palette catalogue (no "soft", "office" or colour-blind-safe sets) | L                                          | S                                                     |
| Responsive rules (hide legend or title at breakpoints)                 | dx (adaptiveLayout), HC (responsive), SF, AG                                            | Partial: ResizeObserver resizes, but there are no adaptive-layout rules                                                      | M                                          | S                                                     |

## 11. Missing visualization components (separate packages at the competitors)

| Component                                                    | Who has it                                                                                                                              | OGE status                                                                         | Impact             | Effort                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------ | --------------------- |
| **Sparkline** (line/area/bar/win-loss, inline in grid cells) | dx, K, SF, HC (pattern), AG (sparklines in AG Grid)                                                                                     | Missing. High synergy: it would be a grid cell renderer                            | **H**              | S (reuses the engine) |
| **Gauges**: circular/radial, linear, arc, bar gauge          | dx (Circular, Linear, BarGauge), K (Arc, Circular, Linear, Radial), SF (Circular, Linear), HC (solid gauge), am, AG (radial and linear) | Missing                                                                            | **H** (dashboards) | M                     |
| Bullet chart                                                 | K, SF, AG, dx (Bullet)                                                                                                                  | Missing                                                                            | M                  | S                     |
| **Treemap**                                                  | dx, SF, HC, am, AG                                                                                                                      | Missing                                                                            | M–H                | M (squarified layout) |
| **Heatmap** component                                        | SF, HC, am, AG, K (series)                                                                                                              | Missing                                                                            | H                  | M                     |
| Sankey                                                       | dx, HC, am, AG, SF (newer)                                                                                                              | Missing                                                                            | M                  | M–L                   |
| Chord / dependency wheel                                     | HC, am, AG                                                                                                                              | Missing                                                                            | L                  | M                     |
| Funnel / pyramid                                             | dx, K, SF, HC, am, AG                                                                                                                   | Missing                                                                            | H                  | S–M                   |
| Sunburst                                                     | SF, HC, am, AG                                                                                                                          | Missing                                                                            | M                  | M                     |
| Vector maps / choropleth (GeoJSON)                           | dx (VectorMap), K (Map, tile+shape), SF (Maps), HC Maps, am, AG (Maps)                                                                  | Missing                                                                            | M                  | L                     |
| Diagram / flowchart                                          | K (Diagram), SF (Diagram), dx (Diagram)                                                                                                 | Partial elsewhere in the suite: `@oge-ui/bpmn` exists; there is no generic diagram | L–M                | L                     |
| Gantt (charts-adjacent)                                      | HC Gantt, SF, K, dx                                                                                                                     | Have in the suite (`@oge-ui/gantt`)                                                | –                  | –                     |
| Smith chart                                                  | SF                                                                                                                                      | Missing                                                                            | L                  | M                     |
| Word cloud, Venn, timeline, force-directed                   | am, HC                                                                                                                                  | Missing                                                                            | L                  | M                     |
| Pivot chart binding                                          | dx, K, SF                                                                                                                               | Missing (ROADMAP: "needs charting package first", so it is now unblocked)          | M–H                | M                     |

## Top 15 gaps for this family (prioritised)

1. **Horizontal bar / rotated chart.** Every competitor has it; OGE's `bar` is vertical only. This is a basic expectation. Impact H, effort M.
2. **Value-axis constant lines and strips** (target or threshold lines, value bands). Impact H, effort S.
3. **Per-point colour** (`colorField` / `customizePoint`). Unlocks conditional colouring and waterfall-style colouring. Impact H, effort S.
4. **Full data labels:** position, template and format on any series, not just small ones, plus overlap resolution. Impact H, effort S–M.
5. **Sparkline package**, including a grid cell renderer. Big synergy with `@oge-ui/grid`. Impact H, effort S.
6. **Gauges package** (circular/arc, linear, bar gauge). Required for dashboards. Impact H, effort M.
7. **Panes** (stacked plot areas over one argument axis). The prerequisite for stock charts and price+volume. Impact H, effort L.
8. **Trendlines plus core technical indicators** (SMA, EMA, Bollinger, MACD, RSI) as pure engine functions. Impact H, effort S–M.
9. **Waterfall series**, with intermediate and total sums. Impact H, effort M.
10. **Funnel / pyramid.** Impact H, effort S–M.
11. **Heatmap** (series or component). Impact H, effort M.
12. **Touch pinch zoom and two-finger pan.** Impact H for mobile, effort M.
13. **RTL support.** The rest of the suite supports RTL. Impact M–H, effort M.
14. **Treemap**, then Sankey and Sunburst. Impact M–H, effort M.
15. **Export PDF/JPEG and `print()`**, plus the smaller stack types (stackedLine/fullStackedLine/stackedSplineArea), OHLC bars, box plot and error bars as a "series catalogue" sweep. Impact M, effort S–M each.

Honourable mentions:

- Initial load animation.
- Range selector period buttons.
- Wind rose / Nightingale.
- Nested donut and doughnut centre label.
- Axis breaks.
- `tickInterval`.
- Canvas/WebGL renderer for 1M+ points.
- Streaming API.
- Sonification (an accessibility differentiator that fits OGE's a11y lead).
- Pivot chart binding (now unblocked).

## Note on React parity

`packages/react/charts` ships twins of all four components (`chart.tsx`, `pie-chart.tsx`, `polar-chart.tsx`, `range-selector.tsx`) over the same engine. Every gap above therefore applies to both layers. Adding engine-side features (layouts, math) keeps parity cheap; render-layer features such as panes and pinch need twin implementations.
