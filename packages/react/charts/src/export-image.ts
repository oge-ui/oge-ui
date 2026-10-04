/**
 * Dependency-free image export for `@oge-ui/react-charts` — the React face
 * of `@oge-ui/charts/export-image`, and the very same functions: the
 * exporter is framework-free, so it lives in `@oge-ui/charts-engine`
 * (ADR 0003). Every chart handle exposes `getSvgElement()`, which is all the
 * exporters need, so the ref goes straight in:
 *
 * ```tsx
 * const chart = useRef<OgeChartHandle>(null);
 * // …
 * const { exportChartToPng } = await import('@oge-ui/react-charts/export-image');
 * await exportChartToPng(chart.current!, { filename: 'chart.png' });
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
