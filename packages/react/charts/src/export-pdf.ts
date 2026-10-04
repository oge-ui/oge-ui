/**
 * Chart → PDF for `@oge-ui/react-charts` — the React face of
 * `@oge-ui/charts/export-pdf`, and the very same functions (they live in
 * `@oge-ui/charts-engine`, ADR 0003). Every chart handle exposes
 * `getSvgElement()`, which is all the exporter needs; `jspdf` is an optional
 * peer pulled in only by this entry point:
 *
 * ```tsx
 * const chart = useRef<OgeChartHandle>(null);
 * // …
 * const { exportChartToPdf } = await import('@oge-ui/react-charts/export-pdf');
 * await exportChartToPdf(chart.current!, { title: 'Revenue 2026' });
 * ```
 */
export {
  buildChartPdfDocument,
  chartPdfLayout,
  exportChartToPdf,
  type OgeChartPdfExportOptions,
  type OgeChartPdfLayout,
} from '@oge-ui/charts-engine/export-pdf';
