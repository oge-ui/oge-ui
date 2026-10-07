/**
 * Axis tick-label boxes: the width a label takes when drawn, its wrapped
 * lines and the extent it covers along its axis — what the overlap modes
 * (`hide` / `stagger` / `skip`) compare. Pure; the measuring itself is a
 * function the render layer may supply (`createChartLabelMeasure`), with
 * the house character estimate as the SSR / jsdom fallback.
 */

/** The rendered width (px) of an axis tick label's text. */
export type OgeChartTextMeasure = (text: string) => number;

/** Line height of an axis tick label (11px text), px. */
export const CHART_AXIS_LABEL_LINE_H = 14;

/** At most this many lines per wrapped label; the last one is ellipsized. */
export const CHART_AXIS_LABEL_MAX_LINES = 3;

/**
 * The character estimate of a label's width — what the charts used before
 * a measurer is available (first paint, SSR, jsdom).
 */
export function estimateChartLabelWidth(text: string): number {
  return text.length * 7;
}

/** A measured axis label. */
export interface ChartAxisLabelBox {
  /** One entry per drawn line (one line unless the label wrapped). */
  readonly lines: readonly string[];
  /** The widest line, px. */
  readonly width: number;
  /** Extent across the lines (`lines × line height`), px. */
  readonly height: number;
}

/**
 * Measures `text` and, when it is wider than `maxWidth`, wraps it at
 * whitespace into at most {@link CHART_AXIS_LABEL_MAX_LINES} lines; a word
 * wider than `maxWidth` keeps a line of its own, and text left over after
 * the last line is cut at a word boundary with an ellipsis.
 */
export function chartAxisLabelBox(
  text: string,
  measure: OgeChartTextMeasure,
  maxWidth = Infinity,
): ChartAxisLabelBox {
  const full = measure(text);
  if (full <= maxWidth || !/\s/.test(text.trim())) {
    return { lines: [text], width: full, height: CHART_AXIS_LABEL_LINE_H };
  }
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  let index = 0;
  for (; index < words.length; index++) {
    const word = words[index];
    const candidate = current === '' ? word : `${current} ${word}`;
    if (current !== '' && measure(candidate) > maxWidth) {
      lines.push(current);
      current = word;
      if (lines.length === CHART_AXIS_LABEL_MAX_LINES - 1) {
        index++;
        break;
      }
    } else {
      current = candidate;
    }
  }
  const rest = words.slice(index);
  if (rest.length > 0) {
    // the last line holds what fits of the rest, then an ellipsis
    let last = [current, ...rest].join(' ');
    const tail = [current, ...rest];
    while (tail.length > 1 && measure(`${last}…`) > maxWidth) {
      tail.pop();
      last = tail.join(' ');
    }
    current = `${last}…`;
  }
  lines.push(current);
  return {
    lines,
    width: lines.reduce((acc, line) => Math.max(acc, measure(line)), 0),
    height: lines.length * CHART_AXIS_LABEL_LINE_H,
  };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * A measurer that lays the text out in the chart's own `<svg>` with the
 * axis-label classes — so the chart's CSS font applies — and reads
 * `getComputedTextLength()`. `undefined` where SVG text cannot be measured
 * (SSR, jsdom): the scene then keeps the character estimate. A zero width
 * for non-empty text (an svg not laid out yet) also falls back.
 */
export function createChartLabelMeasure(
  svg: SVGSVGElement | null | undefined,
): OgeChartTextMeasure | undefined {
  if (svg === null || svg === undefined) return undefined;
  const probe = svg.ownerDocument.createElementNS(SVG_NS, 'text');
  if (typeof (probe as SVGTextElement).getComputedTextLength !== 'function') {
    return undefined;
  }
  probe.setAttribute('class', 'oge-chart-axis-label oge-chart-arg-label');
  probe.setAttribute('aria-hidden', 'true');
  probe.setAttribute('visibility', 'hidden');
  const cache = new Map<string, number>();
  return (text) => {
    if (text === '') return 0;
    const hit = cache.get(text);
    if (hit !== undefined) return hit;
    probe.textContent = text;
    svg.appendChild(probe);
    let width = 0;
    try {
      width = (probe as SVGTextElement).getComputedTextLength();
    } finally {
      probe.remove();
    }
    // not laid out (hidden container): estimate, and measure again next time
    if (!(width > 0)) return estimateChartLabelWidth(text);
    if (cache.size >= 2000) cache.clear();
    cache.set(text, width);
    return width;
  };
}
