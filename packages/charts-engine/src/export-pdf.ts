/**
 * Chart → PDF for both chart render layers: the chart is rasterized with
 * the dependency-free image exporter (computed styles inlined, so the PDF
 * looks exactly like the screen) and embedded as a PNG into a jsPDF page,
 * under an optional title drawn as real PDF text.
 *
 * `jspdf` and `@oge-ui/behavior` (the shared Unicode-font registry,
 * `setOgePdfDefaultFont`) are **optional peers** pulled in only by this
 * entry point — the engine's main entry still depends on `core` alone.
 */
import { jsPDF } from 'jspdf';
import {
  registerOgePdfFont,
  resolveOgePdfFont,
  warnOgePdfUnicode,
  type OgePdfFont,
} from '@oge-ui/behavior';
import {
  chartSvgSize,
  rasterizeChartSvg,
  type OgeChartSvgSource,
} from './lib/svg-export';

export interface OgeChartPdfExportOptions {
  /** Download file name. Default: `chart.pdf`. */
  filename?: string;
  /** Heading printed above the chart. */
  title?: string;
  /** Smaller line under the title. */
  subtitle?: string;
  /** Page orientation. Default: from the chart's aspect ratio. */
  orientation?: 'portrait' | 'landscape';
  /** jsPDF page format. Default: `a4`. */
  pageFormat?: string | number[];
  /** Page margin, mm. Default: 12. */
  margin?: number;
  /** Raster scale of the embedded image. Default: 2. */
  pixelRatio?: number;
  /** Background behind the chart. Default: white. */
  background?: string;
  /**
   * Unicode TrueType font for the title — needed for text outside WinAnsi
   * (Turkish `ğ ş ı İ`, Greek, Cyrillic, …). Default: the font set by
   * `setOgePdfDefaultFont()` from `@oge-ui/behavior`, else Helvetica;
   * `null` forces Helvetica.
   */
  font?: OgePdfFont | null;
}

/** Where the title and the image land on the page, mm. Pure. */
export interface OgeChartPdfLayout {
  readonly titleY: number | null;
  readonly subtitleY: number | null;
  readonly imageX: number;
  readonly imageY: number;
  readonly imageW: number;
  readonly imageH: number;
}

/**
 * Fits a `chartW × chartH` chart (any unit — only the aspect matters) into
 * the page below the heading lines, centered horizontally.
 */
export function chartPdfLayout(
  page: { readonly width: number; readonly height: number },
  chart: { readonly width: number; readonly height: number },
  options: {
    readonly margin?: number;
    readonly title?: boolean;
    readonly subtitle?: boolean;
  } = {},
): OgeChartPdfLayout {
  const margin = options.margin ?? 12;
  let y = margin;
  const titleY = options.title === true ? y + 5 : null;
  if (titleY !== null) y += 9;
  const subtitleY = options.subtitle === true ? y + 3 : null;
  if (subtitleY !== null) y += 7;
  const availW = Math.max(1, page.width - margin * 2);
  const availH = Math.max(1, page.height - y - margin);
  const aspect = chart.width / Math.max(1, chart.height);
  const imageW = Math.min(availW, availH * aspect);
  const imageH = imageW / aspect;
  return {
    titleY,
    subtitleY,
    imageX: margin + (availW - imageW) / 2,
    imageY: y,
    imageW,
    imageH,
  };
}

/**
 * Builds the jsPDF document of a chart (the rasterized chart plus the
 * title). Resolves `null` where the chart cannot be rasterized (no 2D
 * canvas, e.g. jsdom).
 */
export async function buildChartPdfDocument(
  chart: OgeChartSvgSource,
  options: OgeChartPdfExportOptions = {},
): Promise<jsPDF | null> {
  const svg = chart.getSvgElement();
  const size = chartSvgSize(svg);
  const canvas = await rasterizeChartSvg(svg, {
    pixelRatio: options.pixelRatio ?? 2,
    background: options.background,
  });
  if (canvas === null) return null;
  const doc = new jsPDF({
    orientation:
      options.orientation ??
      (size.width >= size.height ? 'landscape' : 'portrait'),
    format: options.pageFormat ?? 'a4',
  });
  const font = resolveOgePdfFont(options);
  const family = font ? registerOgePdfFont(doc, font) : 'helvetica';
  if (family === 'helvetica') {
    warnOgePdfUnicode(
      [options.title, options.subtitle].filter(
        (text): text is string => text !== undefined,
      ),
    );
  }
  const layout = chartPdfLayout(
    {
      width: doc.internal.pageSize.getWidth(),
      height: doc.internal.pageSize.getHeight(),
    },
    size,
    {
      margin: options.margin,
      title: options.title !== undefined && options.title !== '',
      subtitle: options.subtitle !== undefined && options.subtitle !== '',
    },
  );
  const left = options.margin ?? 12;
  if (layout.titleY !== null && options.title !== undefined) {
    doc.setFont(family, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text(options.title, left, layout.titleY);
  }
  if (layout.subtitleY !== null && options.subtitle !== undefined) {
    doc.setFont(family, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(options.subtitle, left, layout.subtitleY);
  }
  doc.addImage(
    canvas.toDataURL('image/png'),
    'PNG',
    layout.imageX,
    layout.imageY,
    layout.imageW,
    layout.imageH,
  );
  return doc;
}

/**
 * Exports the chart to a one-page PDF and downloads it.
 *
 * ```ts
 * const { exportChartToPdf } = await import('@oge-ui/charts/export-pdf');
 * await exportChartToPdf(this.chart(), { title: 'Revenue 2026' });
 * ```
 */
export async function exportChartToPdf(
  chart: OgeChartSvgSource,
  options: OgeChartPdfExportOptions = {},
): Promise<void> {
  if (typeof document === 'undefined') return;
  const doc = await buildChartPdfDocument(chart, options);
  if (doc === null) return;
  doc.save(options.filename ?? 'chart.pdf');
}
