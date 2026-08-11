/**
 * Dependency-free image export for `@oge-ui/charts`: the live SVG is
 * serialized with its computed styles inlined (external CSS never reaches
 * a rasterized image), then downloaded as `.svg` or drawn onto a canvas
 * and saved as `.png`.
 */

/** Style properties that carry the chart's look into the serialized SVG. */
const INLINE_PROPS = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'font-size',
  'font-family',
  'font-weight',
  'letter-spacing',
] as const;

export interface OgeChartImageExportOptions {
  /** Download file name. Default: `chart.png` / `chart.svg`. */
  filename?: string;
  /** Device-pixel scale factor for crisp PNG output. Default: 2. */
  pixelRatio?: number;
  /** Background fill. Default: white. */
  background?: string;
}

/** Anything exposing the chart's SVG root (OgeChart, OgePieChart). */
export interface OgeChartSvgSource {
  getSvgElement(): SVGSVGElement;
}

/**
 * Serializes the chart's SVG with computed styles inlined — pure DOM, no
 * dependencies. Returns a standalone `<svg>` markup string.
 */
export function serializeChartSvg(
  svg: SVGSVGElement,
  options: OgeChartImageExportOptions = {},
): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const sourceNodes = svg.querySelectorAll<SVGElement>('*');
  const cloneNodes = clone.querySelectorAll<SVGElement>('*');
  sourceNodes.forEach((node, index) => {
    const target = cloneNodes[index];
    if (target === undefined) return;
    const computed = getComputedStyle(node);
    for (const prop of INLINE_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value !== '' && target.getAttribute(prop) === null) {
        target.setAttribute(prop, value);
      }
    }
  });
  const rect = svg.ownerDocument.createElementNS(
    'http://www.w3.org/2000/svg',
    'rect',
  );
  rect.setAttribute('width', '100%');
  rect.setAttribute('height', '100%');
  rect.setAttribute('fill', options.background ?? '#ffffff');
  clone.insertBefore(rect, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
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

/**
 * Rasterizes the chart onto a canvas and downloads it as `.png`.
 *
 * ```ts
 * const { exportChartToPng } = await import('@oge-ui/charts/export-image');
 * await exportChartToPng(this.chart());
 * ```
 */
export async function exportChartToPng(
  chart: OgeChartSvgSource,
  options: OgeChartImageExportOptions = {},
): Promise<void> {
  if (typeof document === 'undefined') return;
  const svg = chart.getSvgElement();
  const markup = serializeChartSvg(svg, options);
  const ratio = options.pixelRatio ?? 2;
  const width = svg.clientWidth || Number(svg.getAttribute('width')) || 600;
  const height = svg.clientHeight || Number(svg.getAttribute('height')) || 400;
  const canvas = document.createElement('canvas');
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return; // jsdom
  const svgUrl = URL.createObjectURL(
    new Blob([markup], { type: 'image/svg+xml' }),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve();
      };
      image.onerror = () => reject(new Error('SVG rasterization failed'));
      image.src = svgUrl;
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (blob === null) return;
  const url = URL.createObjectURL(blob);
  download(url, options.filename ?? 'chart.png');
  URL.revokeObjectURL(url);
}
