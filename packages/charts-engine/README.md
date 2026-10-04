# @oge-ui/charts-engine

> **Commercial package.** Like `@oge-ui/charts`, this engine is
> source-available commercial software: free for evaluation, development
> and testing — a paid license is required for production use. No
> watermark, no runtime license checks. See [LICENSE](LICENSE) and
> [ogeui.com/license](https://www.ogeui.com/license).

The framework-free engine behind the OGE UI charts. Plain TypeScript, no
Angular, no React, no D3 — both render layers of the family run this one
copy:

- [`@oge-ui/charts`](https://www.npmjs.com/package/@oge-ui/charts) — the
  Angular components,
- [`@oge-ui/react-charts`](https://www.npmjs.com/package/@oge-ui/react-charts)
  — the React components.

You rarely install it directly: both render packages depend on it. Reach
for it when you build a render layer of your own (a Vue, Svelte or
web-component chart) or need the chart math on a server.

## What's inside

**The kernel.** 1-2-5 nice-tick linear scales, log scales, category
scales and calendar-true time scales (real month boundaries, DST-safe),
series normalization (field names, dotted paths or getters; null values
become gaps), stacking with separate positive and negative branches, bar
slotting, single-path line/spline/step/area builders with LTTB
downsampling, pie/doughnut and radar geometry with anti-overlap outside
labels, zoom and pan math and binary-search hit-testing.

**The view models.** Everything a chart draws, computed once:

- `buildCartesianData` → `buildCartesianScene` → the hover layer
  (`cartesianActivePoints`, `cartesianTooltip`, `cartesianCrosshair`) —
  three stages so a render layer memoizes each on its own inputs (a hover
  never rebuilds the series, a zoom never re-normalizes the data);
- `buildPieScene`, `buildPolarData` / `buildPolarScene`,
  `buildRangeSelectorData` / `buildRangeSelectorScene`;
- the screen-reader data table rows, aria labels and live-region
  announcements, formatted through `Intl` in the configured locale.

**Interaction.** The keyboard maps (`cartesianKeyCommand`,
`polarKeyCommand`, the APG slider map `rangeHandleKeyRange`), selection
arithmetic, wheel/drag/pan decisions, the pointer-gesture machine
(`beginChartGesture`: pointer capture, a 3px threshold, capture-phase
Escape to cancel) and the rAF-coalesced container measuring
(`observeChartSize`).

**Configuration.** The message catalog and its defaults
(`OGE_DEFAULT_CHARTS_MESSAGES`, `OGE_DEFAULT_CHARTS_CONFIG`) and the merge
rules (`resolveOgeChartsConfig`, `mergeOgeChartsMessages`) that Angular's
`provideOgeChartsConfig()` and React's `<OgeChartsConfigProvider>` share.

**Image export** — the `@oge-ui/charts-engine/export-image` entry:
`serializeChartSvg` inlines computed styles into a standalone SVG,
`exportChartToSvg` / `exportChartToPng` download it (PNG via canvas
rasterization). Dependency-free.

## License

Source-available commercial — see [LICENSE](LICENSE).
