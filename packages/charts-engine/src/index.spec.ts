import * as engine from './index';
import * as exportImage from './export-image';

/**
 * The barrel IS both render layers' import surface (ADR 0003): an export that
 * quietly disappears breaks `@oge-ui/charts` or `@oge-ui/react-charts`
 * without failing one engine spec. Guard the values each layer uses.
 */
describe('@oge-ui/charts-engine barrel', () => {
  it.each([
    'OGE_CHART_PALETTE',
    'OGE_DEFAULT_CHARTS_CONFIG',
    'OGE_DEFAULT_CHARTS_MESSAGES',
    'resolveOgeChartsConfig',
    'mergeOgeChartsMessages',
    'formatOgeChartMessage',
    'buildCartesianData',
    'buildCartesianScene',
    'cartesianActivePoints',
    'cartesianTooltip',
    'cartesianCrosshair',
    'cartesianKeyCommand',
    'buildPieScene',
    'buildPolarData',
    'buildPolarScene',
    'polarKeyCommand',
    'buildRangeSelectorData',
    'buildRangeSelectorScene',
    'rangeHandleKeyRange',
    'beginChartGesture',
    'observeChartSize',
    'createLinearScale',
    'linePath',
    'downsamplePath',
    'cartesianTooltipRowText',
    'cartesianPointEventColor',
    'pieSrTable',
    'printOgeChart',
    'ogeSma',
    'ogeEma',
    'ogeBollingerBands',
    'ogeMacd',
    'ogeRsi',
    'ogeTrendline',
    'ogeBoxStats',
    'ogeHistogramBins',
    // W8c: gauges, sparkline, bullet and the non-cartesian charts
    'buildCircularGaugeScene',
    'buildLinearGaugeScene',
    'buildBulletScene',
    'buildSparklineScene',
    'buildFunnelScene',
    'buildHeatmapScene',
    'buildChartHierarchy',
    'buildTreemapScene',
    'buildSunburstScene',
    'buildSankeyScene',
    'buildMapScene',
    'resolveChartColorScale',
    'squarify',
    'layoutSankey',
    'chartHierarchyKeyCommand',
    'chartGridKeyCommand',
    'chartListKeyCommand',
    'chartColumnsKeyCommand',
    'chartMapKeyCommand',
  ])('exports %s', (name) => {
    expect((engine as Record<string, unknown>)[name]).toBeDefined();
  });

  it('keeps the image exporter on its own entry', () => {
    expect(typeof exportImage.serializeChartSvg).toBe('function');
    expect(typeof exportImage.exportChartToPng).toBe('function');
    expect(typeof exportImage.exportChartToSvg).toBe('function');
    expect(typeof exportImage.exportChartToJpeg).toBe('function');
    expect(
      (engine as Record<string, unknown>)['serializeChartSvg'],
    ).toBeUndefined();
    // the PDF builder (and its jspdf import) never reaches the main barrel
    expect(
      (engine as Record<string, unknown>)['exportChartToPdf'],
    ).toBeUndefined();
  });
});
