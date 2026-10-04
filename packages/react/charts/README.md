# @oge-ui/react-charts

> **Commercial package.** Like the Angular `@oge-ui/charts`, the React
> charts are source-available commercial software: free for evaluation,
> development and testing — a paid license is required for production use.
> No watermark, no runtime license checks. See [LICENSE](LICENSE) and
> [ogeui.com/license](https://www.ogeui.com/license).

React charts from the OGE UI suite on a **dependency-free SVG kernel** — no
D3, no Chart.js, no canvas library. They run the **same** framework-free
engine as the Angular `@oge-ui/charts` package
([`@oge-ui/charts-engine`](https://www.npmjs.com/package/@oge-ui/charts-engine):
scales, series layout, path builders, the view models, keyboard maps and
gestures) and load the same stylesheet, so the two render layers draw the
same chart from the same data.

The OGE suite is one component engine with a native render layer per
framework: nothing here wraps Angular.

## What ships

- **`<OgeChart>`** — sixteen cartesian series types (`line`, `spline`,
  `stepLine`, `area`, `splineArea`, `stepArea`, `stackedArea`,
  `fullStackedArea`, `bar`, `stackedBar`, `fullStackedBar`, `rangeBar`,
  `scatter`, `bubble`, `rangeArea`, `candlestick`), calendar-true time axes,
  log axes, multiple value axes, strip lines, annotations, cursor-centered
  wheel zoom, drag-select zoom and Shift+drag pan with a controlled
  `visualRange`, crosshair, single or shared tooltips, an interactive legend,
  point/series selection and LTTB downsampling that keeps 50k-point series
  fluid.
- **`<OgePieChart>`** — pie and doughnut with outside labels, small-value
  grouping into an "Others" slice and slice explode on selection.
- **`<OgePolarChart>`** — radar/polar loops, markers and sectors on circular
  or spider grids.
- **`<OgeRangeSelector>`** — the overview strip: a mini chart with a
  draggable window and two WAI-ARIA slider handles; share one state with a
  chart's `visualRange` and the two stay in lockstep.
- **`<OgeChartsConfigProvider>`** — the counterpart of Angular's
  `provideOgeChartsConfig()`: every message string (aria labels included),
  the locale, the screen-reader table limit and the marker threshold.
- **`@oge-ui/react-charts/export-image`** — `exportChartToPng` /
  `exportChartToSvg` / `serializeChartSvg`, dependency-free; pass any chart's
  `ref` handle.

Callbacks are the Angular outputs with an `on` prefix (`onPointClick`,
`onLegendClick` — cancelable, `onTooltipShowing` — cancelable), the public
methods live on the `ref` handle (`zoomToRange`, `resetZoom`, `focus`,
`getExportData`, `getSvgElement`, …) and the template directives are render
props (`renderTooltip`, `renderLegendItem`, `renderAnnotation`).

## Installation

```sh
npm install @oge-ui/react-charts
```

Requires React 18 or 19. `@oge-ui/charts-engine` comes along as a regular
dependency. The components are client components — `'use client'` ships in
the published files.

Import the stylesheet once at your app entry:

```ts
import '@oge-ui/react-charts/styles.css';
```

## Quick start

```tsx
'use client';

import { OgeChart } from '@oge-ui/react-charts';

const sales = [
  { quarter: 'Q1', product: 120, services: 60 },
  { quarter: 'Q2', product: 150, services: 74 },
];

export function Revenue() {
  return (
    <OgeChart
      dataSource={sales}
      series={[
        { type: 'bar', argumentField: 'quarter', valueField: 'product', name: 'Product' },
        { type: 'line', argumentField: 'quarter', valueField: 'services', name: 'Services' },
      ]}
      title="Quarterly revenue"
      style={{ height: 380 }}
    />
  );
}
```

## Accessibility

No WAI-ARIA APG chart pattern exists; the charts compose `role="img"` with a
generated label, a screen-reader-only data table, real legend buttons with
`aria-pressed`, and a focusable plot region where the arrow keys walk
arguments and series with polite live-region announcements — Enter
selects, Escape resets the zoom.

## License

Source-available commercial — see [LICENSE](LICENSE).
