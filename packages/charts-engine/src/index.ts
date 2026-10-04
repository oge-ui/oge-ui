// Public API of @oge-ui/charts-engine (commercial — see LICENSE).
//
// The framework-free engine both chart render layers run (ADR 0003):
// `@oge-ui/charts` (Angular) and `@oge-ui/react-charts` (React) import it,
// and neither carries chart logic of its own. Explicit named exports only
// (house rule). The image exporter is the separate `./export-image` entry.

/* ---------------- public types, palette, config ---------------- */

export {
  OGE_CHART_PALETTE,
  type OgeChartAnnotation,
  type OgeChartAxisOptions,
  type OgeChartAxisType,
  type OgeChartCrosshairOptions,
  type OgeChartExportData,
  type OgeChartIndicatorOptions,
  type OgeChartLabelInfo,
  type OgeChartLabelOptions,
  type OgeChartLabelPosition,
  type OgeChartLegendClickEvent,
  type OgeChartLegendItem,
  type OgeChartLegendOptions,
  type OgeChartPieSliceEvent,
  type OgeChartPoint,
  type OgeChartPointCustomizer,
  type OgeChartPointEvent,
  type OgeChartPointExtra,
  type OgeChartPointInfo,
  type OgeChartPointRef,
  type OgeChartPointStyle,
  type OgeChartTrendlineOptions,
  type OgeChartRange,
  type OgeChartSeriesEvent,
  type OgeChartSeriesInput,
  type OgeChartSeriesType,
  type OgeChartSmallValuesGrouping,
  type OgeChartStripLine,
  type OgeChartTooltipOptions,
  type OgeChartTooltipShowingEvent,
} from './lib/charts-types';
export {
  OGE_DEFAULT_CHARTS_CONFIG,
  OGE_DEFAULT_CHARTS_MESSAGES,
  formatOgeChartMessage,
  mergeOgeChartsMessages,
  resolveOgeChartsConfig,
  type OgeChartsAnnouncementMessages,
  type OgeChartsAriaMessages,
  type OgeChartsConfig,
  type OgeChartsConfigInput,
  type OgeChartsMessages,
  type OgeChartsValueMessages,
} from './lib/charts-config';

/* ---------------- analytics (pure) ---------------- */

export {
  ogeBollingerBands,
  ogeBoxStats,
  ogeEma,
  ogeHistogramBins,
  ogeMacd,
  ogeQuantile,
  ogeRsi,
  ogeSma,
  ogeTrendline,
  type OgeAnalyticsInput,
  type OgeBollingerBand,
  type OgeBoxStats,
  type OgeHistogramBin,
  type OgeHistogramBinning,
  type OgeMacdPoint,
  type OgeTrendlineFit,
  type OgeTrendlineFitOptions,
  type OgeTrendlineType,
} from './lib/analytics';

/* ---------------- print ---------------- */

export {
  chartPrintDocument,
  printOgeChart,
  type OgeChartPrintOptions,
} from './lib/chart-print';

/* ---------------- view models ---------------- */

export {
  buildCartesianData,
  buildCartesianScene,
  cartesianActivePoints,
  cartesianAriaLabel,
  cartesianCrosshair,
  cartesianExportData,
  cartesianHoverAt,
  cartesianNearestSeries,
  cartesianPanRange,
  cartesianPointAnnouncement,
  cartesianSelectionRange,
  cartesianPointEventColor,
  cartesianSrRows,
  cartesianTooltip,
  cartesianTooltipRowText,
  cartesianWheelRange,
  cartesianZoomTo,
  chartArgumentText,
  chartDragMode,
  chartLegendSwatch,
  chartMarkerRadius,
  chartPointColor,
  chartSeriesColor,
  chartSeriesGroupOpacity,
  chartValueAxesList,
  chartValueText,
  chartWheelZoomEnabled,
  chartZoomSelectionRect,
  detectArgumentKind,
  isChartPointSelected,
  mergeChartSeriesInputs,
  nextChartSelection,
  type OgeCartesianData,
  type OgeCartesianDataInput,
  type OgeCartesianHoverState,
  type OgeCartesianScene,
  type OgeCartesianSceneInput,
  type OgeChartAnnotationVm,
  type OgeChartAxisTick,
  type OgeChartCrosshairVm,
  type OgeChartLegendEntry,
  type OgeChartPlotRect,
  type OgeChartRenderBar,
  type OgeChartRenderCandle,
  type OgeChartRenderDot,
  type OgeChartRenderLabel,
  type OgeChartRenderMarker,
  type OgeChartRenderPath,
  type OgeChartRenderSegment,
  type OgeChartRenderSeries,
  type OgeChartSrRow,
  type OgeChartStripRect,
  type OgeChartTooltipVm,
  type OgeChartValueAxisVm,
} from './lib/cartesian-model';
export {
  buildPieScene,
  pieAriaLabel,
  pieLabelText,
  pieSelectedAnnouncement,
  pieSrTable,
  pieTooltip,
  pieValueText,
  togglePieSlice,
  type OgeChartFieldExpr,
  type OgePieGeometry,
  type OgePieLabelVm,
  type OgePieLegendItemVm,
  type OgePieRingVm,
  type OgePieScene,
  type OgePieSceneInput,
  type OgePieSeriesInput,
  type OgePieSliceVm,
  type OgePieTooltipVm,
} from './lib/pie-model';
export {
  buildPolarData,
  buildPolarScene,
  nextPolarSelection,
  polarPointAnnouncement,
  polarPointIndex,
  polarSrRows,
  polarTooltip,
  type OgePolarData,
  type OgePolarDataInput,
  type OgePolarHover,
  type OgePolarMarkerVm,
  type OgePolarRingVm,
  type OgePolarScene,
  type OgePolarSceneInput,
  type OgePolarSectorVm,
  type OgePolarSeriesVm,
  type OgePolarSpokeVm,
  type OgePolarTooltipVm,
} from './lib/polar-model';
export {
  buildRangeSelectorData,
  buildRangeSelectorScene,
  commitRangeSelection,
  detectRangeSelectorKind,
  rangeCenteredAt,
  rangeHandleDragRange,
  rangeSelectorAnnouncement,
  rangeSelectorDeltaValue,
  rangeSelectorEffective,
  rangeSelectorLabel,
  rangeSelectorWindowPx,
  rangeWindowDragRange,
  type OgeRangeSelectorData,
  type OgeRangeSelectorDataInput,
  type OgeRangeSelectorScene,
  type OgeRangeSelectorSceneInput,
  type OgeRangeSelectorSeriesVm,
} from './lib/range-selector-model';

/* ---------------- interaction ---------------- */

export {
  cartesianKeyCommand,
  polarKeyCommand,
  rangeHandleKeyRange,
  type OgeChartKeyCommand,
  type OgeChartKeyContext,
} from './lib/chart-keyboard';
export {
  beginChartGesture,
  type ChartGestureCallbacks,
} from './lib/chart-gesture';
export {
  measureChartElement,
  observeChartSize,
  type OgeChartSize,
} from './lib/chart-size';

/* ---------------- kernel ---------------- */

export {
  categoryBandPx,
  clampRange,
  createCategoryScale,
  createLinearScale,
  createLogScale,
  createTimeScale,
  logTicks,
  niceStep,
  niceTicks,
  pickTimeUnit,
  timeTicks,
  type ChartRange,
  type ChartScale,
  type ChartScaleKind,
  type TimeTickUnit,
} from './lib/scale';
export {
  buildSeries,
  chartFieldAccessor,
  chartNumber,
  collectCategories,
  isBarType,
  isFinancialType,
  isStackedType,
  isZeroBasedType,
  numericArgument,
  seriesValueExtent,
  type ChartFieldExpr,
  type ChartIndicatorOptions,
  type ChartLabelInfo,
  type ChartLabelOptions,
  type ChartLabelPosition,
  type ChartPoint,
  type ChartPointCustomizer,
  type ChartPointExtra,
  type ChartPointInfo,
  type ChartPointStyle,
  type ChartSeries,
  type ChartSeriesInput,
  type ChartSeriesType,
  type ChartTrendlineOptions,
} from './lib/series-model';
export {
  chartTrendlineOptions,
  deriveChartSeries,
  paretoCategoryOrder,
  type ChartDeriveContext,
  type ChartDerived,
} from './lib/series-derive';
export {
  chartBarLabelAnchor,
  chartContrastText,
  chartLabelBox,
  chartLabelOptions,
  chartLabelTemplateBox,
  chartLabelText,
  chartPointHasLabel,
  chartPointLabelAnchor,
  resolveChartLabels,
  type ChartLabelCandidate,
} from './lib/data-labels';
export {
  candleGeometry,
  computeBarSlots,
  computeStacks,
  type BarSlot,
  type CandleGeometry,
  type StackedValue,
} from './lib/series-layout';
export {
  areaPath,
  baselineAreaPath,
  linePath,
  splinePath,
  steppedPoints,
  type PathPoint,
} from './lib/path-builder';
export { downsamplePath } from './lib/downsample';
export {
  decideLabelLayout,
  numberFormat,
  siFormat,
  timeTickFormatter,
  type LabelLayoutDecision,
  type LabelOverlapMode,
} from './lib/tick-format';
export {
  buildArgumentIndex,
  nearestIndex,
  type ArgumentIndex,
} from './lib/hit-test';
export { panRange, rangeFromSelection, zoomRangeAt } from './lib/zoom-math';
export {
  buildPieSlices,
  groupSmallValues,
  layoutPieLabels,
  pieSliceAt,
  sliceArcPath,
  type GroupedPieValue,
  type PieLabelPosition,
  type PieSlice,
  type PieSmallValuesGrouping,
} from './lib/pie-layout';
export {
  angleForIndex,
  polarToCartesian,
  radarGridPath,
  radarLoopPath,
  type PolarXY,
} from './lib/polar-layout';
