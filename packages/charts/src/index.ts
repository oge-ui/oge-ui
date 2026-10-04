// Public API of @oge-ui/charts (commercial — see LICENSE).
// Explicit named exports only (house rule). The engine is its own package,
// @oge-ui/charts-engine (ADR 0003); the public types come from it.

export { OgeChart, OGE_CHART_PALETTE } from './lib/chart/chart';
export { OgePieChart, type OgeChartPieSliceEvent } from './lib/chart/pie-chart';
export { OgePolarChart } from './lib/chart/polar-chart';
export { OgeRangeSelector } from './lib/chart/range-selector';
export {
  OgeChartAnnotationTemplate,
  OgeChartLegendTemplate,
  OgeChartTooltipTemplate,
  type OgeChartAnnotationTemplateContext,
  type OgeChartLegendTemplateContext,
  type OgeChartTooltipTemplateContext,
} from './lib/chart/chart-templates';
export {
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
  type OgeChartLegendClickEvent,
  type OgeChartLabelFormat,
  type OgeChartLabelOverlap,
  type OgeChartLegendOptions,
  type OgeChartMinorTickOptions,
  type OgeChartPane,
  type OgeChartPeriod,
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
export {
  OGE_CHARTS_CONFIG,
  OGE_DEFAULT_CHARTS_CONFIG,
  OGE_DEFAULT_CHARTS_MESSAGES,
  provideOgeChartsConfig,
  type OgeChartsAnnouncementMessages,
  type OgeChartsAriaMessages,
  type OgeChartsConfig,
  type OgeChartsConfigInput,
  type OgeChartsMessages,
  type OgeChartsPeriodMessages,
} from './lib/config';
