// Public API of @oge-ui/react-charts (commercial — see LICENSE).
//
// The React render layer of the charts family. Every component runs the same
// framework-free engine as the Angular `@oge-ui/charts` (`@oge-ui/charts-engine`,
// ADR 0003) and renders the same `.oge-chart-*` markup, so the Angular SCSS
// styles it unchanged. The image exporter is the `./export-image` entry.

export { OgeChart, type OgeChartHandle, type OgeChartProps } from './lib/chart';
export {
  OgePieChart,
  type OgePieChartHandle,
  type OgePieChartProps,
} from './lib/pie-chart';
export {
  OgePolarChart,
  type OgePolarChartHandle,
  type OgePolarChartProps,
} from './lib/polar-chart';
export {
  OgeRangeSelector,
  type OgeRangeSelectorHandle,
  type OgeRangeSelectorProps,
} from './lib/range-selector';
export {
  OgeChartsConfigProvider,
  useOgeChartsConfig,
  type OgeChartsAnnouncementMessages,
  type OgeChartsAriaMessages,
  type OgeChartsConfig,
  type OgeChartsConfigInput,
  type OgeChartsMessages,
  type OgeChartsPeriodMessages,
} from './lib/charts-config';
// The public types, the palette and the default catalog come from the engine
// both layers share; re-exported so React consumers import one package — the
// same surface the Angular barrel exposes.
export {
  OGE_CHART_PALETTE,
  OGE_DEFAULT_CHARTS_CONFIG,
  OGE_DEFAULT_CHARTS_MESSAGES,
  type OgeChartAnimationEasing,
  type OgeChartAnimationOptions,
  type OgeChartAnnotation,
  type OgeChartAxisBreak,
  type OgeChartAxisLabelOptions,
  type OgeChartAxisOptions,
  type OgeChartAxisStrip,
  type OgeChartAxisType,
  type OgeChartConstantLine,
  type OgeChartCrosshairOptions,
  type OgeChartCustomPeriod,
  type OgeChartDateInterval,
  type OgeChartExportData,
  type OgeChartFieldExpr,
  type OgeChartLegendClickEvent,
  type OgeChartLegendItem,
  type OgeChartLabelFormat,
  type OgeChartLabelOverlap,
  type OgeChartLegendOptions,
  type OgeChartMinorTickOptions,
  type OgeChartPane,
  type OgeChartPeriod,
  type OgeChartPieSliceEvent,
  type OgeChartPoint,
  type OgeChartPointEvent,
  type OgeChartPointRef,
  type OgeChartRange,
  type OgeChartSeriesEvent,
  type OgeChartSeriesInput,
  type OgeChartSeriesType,
  type OgeChartSmallValuesGrouping,
  type OgeChartStripLine,
  type OgeChartTickInterval,
  type OgeChartTooltipOptions,
  type OgeChartTooltipShowingEvent,
} from '@oge-ui/charts-engine';
