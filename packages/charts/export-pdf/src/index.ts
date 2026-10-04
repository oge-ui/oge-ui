/**
 * Chart → PDF for `@oge-ui/charts`: the chart is rasterized with the
 * dependency-free image exporter and embedded into a jsPDF page under an
 * optional title (drawn with the `font` option, else the font registered
 * by `setOgePdfDefaultFont()` from `@oge-ui/behavior`).
 *
 * The builder is framework-free, so it lives in the family's engine package
 * (ADR 0003) and the React charts ship the very same functions. `jspdf` is
 * an optional peer pulled in only by this entry point:
 *
 * ```ts
 * const { exportChartToPdf } = await import('@oge-ui/charts/export-pdf');
 * await exportChartToPdf(this.chart(), { title: 'Revenue 2026' });
 * ```
 */
export {
  buildChartPdfDocument,
  chartPdfLayout,
  exportChartToPdf,
  type OgeChartPdfExportOptions,
  type OgeChartPdfLayout,
} from '@oge-ui/charts-engine/export-pdf';
