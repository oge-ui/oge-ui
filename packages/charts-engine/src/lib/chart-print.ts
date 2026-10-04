/**
 * `print()` for every chart: the serialized SVG (computed styles inlined,
 * like the image export) goes into a hidden same-origin iframe with a print
 * stylesheet — the chart scaled to the page width, nothing else on the
 * page — and the browser's print dialog opens on that frame. Dependency-free.
 */
import {
  serializeChartSvg,
  type OgeChartSvgSource,
} from './svg-export';

export interface OgeChartPrintOptions {
  /** Heading printed above the chart (and the print job's title). */
  title?: string;
  /** Page orientation hint for `@page`. Default: from the chart's aspect. */
  orientation?: 'portrait' | 'landscape';
  /** Background behind the chart. Default: white. */
  background?: string;
}

const escapeHtml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ] as string,
  );

/** The standalone print document for a serialized chart. Pure. */
export function chartPrintDocument(
  svgMarkup: string,
  options: OgeChartPrintOptions & { width: number; height: number },
): string {
  const orientation =
    options.orientation ??
    (options.width >= options.height ? 'landscape' : 'portrait');
  const title = options.title ?? '';
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    `<title>${escapeHtml(title || 'Chart')}</title>`,
    '<style>',
    `@page { size: ${orientation}; margin: 12mm; }`,
    'html, body { margin: 0; padding: 0; background: #fff; }',
    'body { font-family: system-ui, sans-serif; color: #111827; }',
    'h1 { font-size: 16px; font-weight: 600; margin: 0 0 8px; }',
    'svg { display: block; width: 100%; height: auto; max-height: 90vh; }',
    '@media print { svg { break-inside: avoid; } }',
    '</style></head><body>',
    title === '' ? '' : `<h1>${escapeHtml(title)}</h1>`,
    svgMarkup,
    '</body></html>',
  ].join('');
}

/**
 * Opens the browser's print dialog for the chart alone. Resolves once the
 * dialog has been handed the document (browsers block until it closes);
 * the helper frame is removed afterwards.
 */
export function printOgeChart(
  chart: OgeChartSvgSource,
  options: OgeChartPrintOptions = {},
): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const svg = chart.getSvgElement();
  const width = svg.clientWidth || Number(svg.getAttribute('width')) || 600;
  const height = svg.clientHeight || Number(svg.getAttribute('height')) || 400;
  // the clone needs an intrinsic aspect ratio to scale to the page width
  const markup = serializeChartSvg(svg, options).replace(
    /^<svg/,
    `<svg preserveAspectRatio="xMidYMid meet"`,
  );
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const view = frame.contentWindow;
  if (doc === null || view === null) {
    frame.remove();
    return Promise.resolve();
  }
  doc.open();
  doc.write(chartPrintDocument(markup, { ...options, width, height }));
  doc.close();
  return new Promise<void>((resolve) => {
    // let the frame lay out before printing
    setTimeout(() => {
      try {
        view.focus();
        view.print();
      } finally {
        setTimeout(() => frame.remove(), 1000);
        resolve();
      }
    }, 50);
  });
}
