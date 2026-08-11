# @oge-ui/charts

> **Commercial package.** Unlike the rest of the OGE UI suite (MIT), the
> charts are source-available commercial software: free for evaluation,
> development and testing — a paid license is required for production use.
> No watermark, no runtime license checks. See [LICENSE](LICENSE) and
> [ogeui.com/license](https://ogeui.com/license).

Signal-based Angular charts on a **dependency-free SVG kernel** — no D3,
no Chart.js, no canvas library, and unlike `@oge-ui/scheduler`/`gantt`
this package takes no suite dependency beyond `@oge-ui/core`: the tooltip
and legend are plain positioned markup, so the whole family rides on one
pure engine.

**Series & axes**

- `<oge-chart>`: 16 series types — `line`, `spline` (Catmull-Rom),
  `stepLine`, `area`, `splineArea`, `stepArea`, `stackedArea`,
  `fullStackedArea`, `bar`, `stackedBar`, `fullStackedBar`, `rangeBar`
  (value1..value2 spans), `scatter`, `bubble` (`sizeField` drives the
  bubble area), `rangeArea`, `candlestick` — mixed freely, with
  `commonSeries` defaults, per-series color/dash/width/opacity,
  `visible` initial state, `showLabels` value labels and null-value
  gaps (never fake zeros)
- `<oge-pie-chart>`: pie/doughnut with outside labels in two
  anti-overlap columns, connector lines, small-value grouping
  (`topN`/`smallValueThreshold` → an "Others" slice) and slice explode
  on selection
- Axes: argument axis auto-detects numbers/dates/categories;
  calendar-true time ticks (real month boundaries, DST-safe), 1-2-5
  nice-tick linear axes, logarithmic axes, multiple value axes
  (`position: 'end'`), grid, titles, `labelFormat`, overlap resolution
  (`rotate`/`skip`), SI-abbreviated labels and `stripLines`
  markers/bands
- Stacking accumulates positives and negatives on separate branches;
  `fullStackedBar` normalizes each argument to 100%; `stack` groups
  split independent stacks
- `<oge-polar-chart>`: radar/polar on the same kernel — `line`/`area`
  radar loops (null values break the loop into gaps), `scatter` markers
  and `bar` sectors around a category circle, with circular or `spider`
  (polygon) grids
- Annotations: `point` (marker dot + connector + label box) and `text`
  labels anchored at (argument, value), with a
  `*ogeChartAnnotationTemplate` HTML override
- `<oge-range-selector>`: the overview strip — a mini background chart
  with a draggable window and two WAI-ARIA slider handles; bind
  `[(value)]` to a chart's `[(visualRange)]` and the two stay in
  lockstep

**Interaction**

- Cursor-centered wheel zoom, drag-select zoom (Escape cancels
  mid-drag), Shift+drag pan, `[(visualRange)]` two-way, Escape reset
- Crosshair snapping to the nearest argument, single or `shared`
  tooltips (`*ogeChartTooltipTemplate` override), interactive legend
  (real buttons, cancelable `legendClick`, axes rescale on toggle),
  point/series selection with `[(selectedPoints)]`
- **Performance contract:** one `<path>` per series regardless of point
  count, automatic **LTTB downsampling** to ~one point per pixel for
  oversized line/area series (peaks survive; hit-testing keeps the full
  data), markers only under `markerThreshold`, O(log n) binary-search
  hit-testing, rAF-coalesced pointer/resize work — 50k/200k-point smoke
  tests guard it
- Legend items spotlight their series on hover (the rest dim), toggle
  visibility on click, and respect the series' initial `visible` flag

**Export** — `@oge-ui/charts/export-image` (lazy, dependency-free): the
live SVG is serialized with computed styles inlined, downloaded as a
standalone `.svg` or rasterized to `.png` (pixel ratio, background).

**Accessibility (honest limits)**

No WAI-ARIA APG pattern covers a chart; the widget composes:
`role="img"` with a generated label, a screen-reader-only `role="table"`
carrying the first rows of data (an OGE extra — none of the reference
libraries ship one), real legend buttons with `aria-pressed`, and a
focusable plot region where arrow keys walk arguments and series with
polite live-region announcements — Enter selects, Escape resets zoom.
All strings, including every aria label, live in `OgeChartsMessages`
(`provideOgeChartsConfig`, config-level `locale`).

Docs: [ogeui.com/components/charts](https://ogeui.com/components/charts)
· AI reference: [`llms.txt`](llms.txt)
