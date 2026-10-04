/**
 * Dependency-free image export for `@oge-ui/charts`: the live SVG is
 * serialized with its computed styles inlined (external CSS never reaches
 * a rasterized image), then downloaded as `.svg` or drawn onto a canvas
 * and saved as `.png` or `.jpeg`.
 */
import {
  rasterizeChartSvg,
  serializeChartSvg,
  type OgeChartImageExportOptions,
  type OgeChartSvgSource,
} from './lib/svg-export';

export {
  rasterizeChartSvg,
  serializeChartSvg,
  type OgeChartImageExportOptions,
  type OgeChartSvgSource,
} from './lib/svg-export';

/** JPEG export options: the image options plus the encoder quality. */
export interface OgeChartJpegExportOptions extends OgeChartImageExportOptions {
  /** Encoder quality, 0–1. Default 0.92. */
  quality?: number;
}

function download(url: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
}

/** Downloads the chart as a standalone `.svg` file. */
export function exportChartToSvg(
  chart: OgeChartSvgSource,
  options: OgeChartImageExportOptions = {},
): void {
  if (typeof document === 'undefined') return;
  const markup = serializeChartSvg(chart.getSvgElement(), options);
  const blob = new Blob([markup], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  download(url, options.filename ?? 'chart.svg');
  URL.revokeObjectURL(url);
}

async function exportRaster(
  chart: OgeChartSvgSource,
  options: OgeChartImageExportOptions,
  type: 'image/png' | 'image/jpeg',
  quality: number | undefined,
  fallbackName: string,
): Promise<void> {
  if (typeof document === 'undefined') return;
  const canvas = await rasterizeChartSvg(chart.getSvgElement(), options);
  if (canvas === null) return; // jsdom
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
  if (blob === null) return;
  const url = URL.createObjectURL(blob);
  download(url, options.filename ?? fallbackName);
  URL.revokeObjectURL(url);
}

/**
 * Rasterizes the chart onto a canvas and downloads it as `.png`.
 *
 * ```ts
 * const { exportChartToPng } = await import('@oge-ui/charts/export-image');
 * await exportChartToPng(this.chart());
 * ```
 */
export function exportChartToPng(
  chart: OgeChartSvgSource,
  options: OgeChartImageExportOptions = {},
): Promise<void> {
  return exportRaster(chart, options, 'image/png', undefined, 'chart.png');
}

/**
 * Rasterizes the chart and downloads it as `.jpeg` — JPEG has no alpha, so
 * the `background` (default white) fills the canvas first.
 */
export function exportChartToJpeg(
  chart: OgeChartSvgSource,
  options: OgeChartJpegExportOptions = {},
): Promise<void> {
  return exportRaster(
    chart,
    options,
    'image/jpeg',
    options.quality ?? 0.92,
    'chart.jpeg',
  );
}
