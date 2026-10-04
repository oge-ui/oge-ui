/**
 * The SVG serializer and rasterizer behind every chart export (`.svg`,
 * `.png`, `.jpeg`, `.pdf`) and `print()`. Pure DOM, no dependencies.
 */

/** Style properties that carry the chart's look into the serialized SVG. */
const INLINE_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'opacity',
  'font-size',
  'font-family',
  'font-weight',
  'letter-spacing',
] as const;

export interface OgeChartImageExportOptions {
  /** Download file name. Default: `chart.png` / `chart.svg` / `chart.jpeg`. */
  filename?: string;
  /** Device-pixel scale factor for crisp raster output. Default: 2. */
  pixelRatio?: number;
  /** Background fill. Default: white. */
  background?: string;
}

/** Anything exposing the chart's SVG root (OgeChart, OgePieChart, …). */
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

/** The chart's CSS-pixel size (the rendered box, else its attributes). */
export function chartSvgSize(svg: SVGSVGElement): {
  width: number;
  height: number;
} {
  return {
    width: svg.clientWidth || Number(svg.getAttribute('width')) || 600,
    height: svg.clientHeight || Number(svg.getAttribute('height')) || 400,
  };
}

/**
 * Draws the serialized chart onto a fresh canvas (`pixelRatio` × the CSS
 * size, background filled first). `null` where no 2D context exists
 * (jsdom, workers).
 */
export async function rasterizeChartSvg(
  svg: SVGSVGElement,
  options: OgeChartImageExportOptions = {},
): Promise<HTMLCanvasElement | null> {
  if (typeof document === 'undefined') return null;
  const markup = serializeChartSvg(svg, options);
  const ratio = options.pixelRatio ?? 2;
  const { width, height } = chartSvgSize(svg);
  const canvas = document.createElement('canvas');
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;
  ctx.fillStyle = options.background ?? '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  return canvas;
}
