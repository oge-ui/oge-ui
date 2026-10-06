/**
 * Safe SVG builders (G5b) — the only way extension code draws: custom palette
 * and context-pad icons and `renderers` overrides return {@link OgeBpmnSvgNode}
 * trees, never markup strings. Both render layers draw a tree element by
 * element (Angular through `<svg:*>` templates, React through
 * `createElement`), after {@link sanitizeBpmnSvg} has dropped every tag and
 * attribute outside a small presentational allowlist — no `<script>`, no
 * `<foreignObject>`, no `href`, no `on*` handler, no `style`, no external
 * `url(…)`. There is no raw-HTML path to bypass.
 */

/** The SVG elements a tree may contain. */
export type OgeBpmnSvgTag =
  | 'g'
  | 'path'
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'polyline'
  | 'polygon'
  | 'text';

/** One element of a safe SVG tree. */
export interface OgeBpmnSvgNode {
  readonly tag: OgeBpmnSvgTag;
  /** Presentational attributes (see {@link BPMN_SVG_ALLOWED_ATTRIBUTES}). */
  readonly attrs?: Readonly<Record<string, string | number>>;
  /** Child elements (`g` only). */
  readonly children?: readonly OgeBpmnSvgNode[];
  /** Text content (`text` only), rendered as a text node — never parsed. */
  readonly text?: string;
}

/** Every tag {@link sanitizeBpmnSvg} keeps. */
export const BPMN_SVG_ALLOWED_TAGS: readonly OgeBpmnSvgTag[] = [
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
];

/**
 * Every attribute {@link sanitizeBpmnSvg} keeps, mapped to the React prop
 * name the React layer passes to `createElement` (DOM attribute names are
 * hyphenated; React's SVG props are camelCase).
 */
export const BPMN_SVG_ALLOWED_ATTRIBUTES: Readonly<Record<string, string>> = {
  d: 'd',
  x: 'x',
  y: 'y',
  x1: 'x1',
  y1: 'y1',
  x2: 'x2',
  y2: 'y2',
  cx: 'cx',
  cy: 'cy',
  r: 'r',
  rx: 'rx',
  ry: 'ry',
  width: 'width',
  height: 'height',
  points: 'points',
  transform: 'transform',
  fill: 'fill',
  stroke: 'stroke',
  'stroke-width': 'strokeWidth',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-opacity': 'fillOpacity',
  'stroke-opacity': 'strokeOpacity',
  opacity: 'opacity',
  'text-anchor': 'textAnchor',
  'dominant-baseline': 'dominantBaseline',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  class: 'className',
};

const MAX_DEPTH = 8;
const MAX_NODES = 200;

/** A value is kept when it cannot load or run anything. */
function safeValue(name: string, value: string | number): string | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  if (typeof value !== 'string') return null;
  const lower = value.toLowerCase();
  if (lower.includes('javascript:') || lower.includes('expression(')) {
    return null;
  }
  if (lower.includes('url(') && !/^url\(#[\w-]+\)$/.test(value.trim())) {
    return null; // only same-document references (`url(#gradient)`)
  }
  if (name === 'class' && !/^[\w\s-]*$/.test(value)) return null;
  return value;
}

/**
 * Returns a copy of the trees with every disallowed tag (and its subtree)
 * and attribute removed, numbers made finite, text kept as plain text, and
 * size bounded (depth 8, 200 elements) so a runaway renderer cannot freeze
 * the editor.
 */
export function sanitizeBpmnSvg(
  nodes: readonly OgeBpmnSvgNode[] | null | undefined,
): readonly OgeBpmnSvgNode[] {
  let budget = MAX_NODES;
  const clean = (
    list: readonly OgeBpmnSvgNode[],
    depth: number,
  ): OgeBpmnSvgNode[] => {
    const out: OgeBpmnSvgNode[] = [];
    if (depth > MAX_DEPTH) return out;
    for (const node of list) {
      if (budget <= 0) break;
      if (
        node === null ||
        typeof node !== 'object' ||
        !BPMN_SVG_ALLOWED_TAGS.includes(node.tag)
      ) {
        continue;
      }
      budget--;
      const attrs: Record<string, string> = {};
      for (const [name, value] of Object.entries(node.attrs ?? {})) {
        if (BPMN_SVG_ALLOWED_ATTRIBUTES[name] === undefined) continue;
        const safe = safeValue(name, value);
        if (safe !== null) attrs[name] = safe;
      }
      const children =
        node.tag === 'g' && node.children !== undefined
          ? clean(node.children, depth + 1)
          : undefined;
      out.push({
        tag: node.tag,
        ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
        ...(children !== undefined && children.length > 0 ? { children } : {}),
        ...(node.tag === 'text' && typeof node.text === 'string'
          ? { text: node.text }
          : {}),
      });
    }
    return out;
  };
  return nodes === null || nodes === undefined ? [] : clean(nodes, 0);
}

type Attrs = Readonly<Record<string, string | number>>;

/** Builders for {@link OgeBpmnSvgNode} trees — `bpmnSvg.circle(12, 12, 8)`. */
export const bpmnSvg = {
  g(children: readonly OgeBpmnSvgNode[], attrs?: Attrs): OgeBpmnSvgNode {
    return { tag: 'g', children, ...(attrs ? { attrs } : {}) };
  },
  path(d: string, attrs?: Attrs): OgeBpmnSvgNode {
    return { tag: 'path', attrs: { d, ...attrs } };
  },
  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    attrs?: Attrs,
  ): OgeBpmnSvgNode {
    return { tag: 'rect', attrs: { x, y, width, height, ...attrs } };
  },
  circle(cx: number, cy: number, r: number, attrs?: Attrs): OgeBpmnSvgNode {
    return { tag: 'circle', attrs: { cx, cy, r, ...attrs } };
  },
  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    attrs?: Attrs,
  ): OgeBpmnSvgNode {
    return { tag: 'ellipse', attrs: { cx, cy, rx, ry, ...attrs } };
  },
  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    attrs?: Attrs,
  ): OgeBpmnSvgNode {
    return { tag: 'line', attrs: { x1, y1, x2, y2, ...attrs } };
  },
  polyline(points: string, attrs?: Attrs): OgeBpmnSvgNode {
    return { tag: 'polyline', attrs: { points, ...attrs } };
  },
  polygon(points: string, attrs?: Attrs): OgeBpmnSvgNode {
    return { tag: 'polygon', attrs: { points, ...attrs } };
  },
  text(x: number, y: number, content: string, attrs?: Attrs): OgeBpmnSvgNode {
    return { tag: 'text', text: content, attrs: { x, y, ...attrs } };
  },
} as const;

/** Escapes a value for an attribute of the exported SVG string. */
function escapeSvg(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Serializes a sanitized tree for the static SVG export. */
export function bpmnSvgToString(nodes: readonly OgeBpmnSvgNode[]): string {
  return sanitizeBpmnSvg(nodes)
    .map((node) => {
      const attrs = Object.entries(node.attrs ?? {})
        .map(([name, value]) => ` ${name}="${escapeSvg(String(value))}"`)
        .join('');
      const inner =
        node.tag === 'text'
          ? escapeSvg(node.text ?? '')
          : bpmnSvgToString(node.children ?? []);
      return inner === ''
        ? `<${node.tag}${attrs}/>`
        : `<${node.tag}${attrs}>${inner}</${node.tag}>`;
    })
    .join('');
}
