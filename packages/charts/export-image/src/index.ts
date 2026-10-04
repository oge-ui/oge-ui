/**
 * Dependency-free image export for `@oge-ui/charts`: the live SVG is
 * serialized with its computed styles inlined (external CSS never reaches
 * a rasterized image), then downloaded as `.svg` or drawn onto a canvas
 * and saved as `.png`.
 *
 * The exporter is framework-free, so it lives in the family's engine
 * package (ADR 0003) and the React charts ship the very same functions;
 * this entry re-exports it so the Angular import path is unchanged:
 *
 * ```ts
 * const { exportChartToPng } = await import('@oge-ui/charts/export-image');
 * await exportChartToPng(this.chart());
 * ```
 */
export {
  exportChartToJpeg,
  exportChartToPng,
  exportChartToSvg,
  rasterizeChartSvg,
  serializeChartSvg,
  type OgeChartImageExportOptions,
  type OgeChartJpegExportOptions,
  type OgeChartSvgSource,
} from '@oge-ui/charts-engine/export-image';
