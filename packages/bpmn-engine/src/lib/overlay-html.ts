/**
 * Overlay badge markup, sanitized into plain data (ADR 0003).
 *
 * `OgeBpmnOverlay.html` is markup the host wrote. Angular renders it through
 * its sanitizing `[innerHTML]`; React has no sanitizing HTML binding, and the
 * suite forbids `dangerouslySetInnerHTML` outright (ARCHITECTURE, Security
 * rules). So the markup is parsed into an inert document — `DOMParser` never
 * runs scripts or loads resources — and walked into a node tree that keeps
 * only allow-listed elements and attributes, the same policy Angular's
 * sanitizer applies: no `<script>`/`<style>`/`<iframe>`/SVG, no `on*`
 * handlers, no inline `style`. URL attributes are kept for the render layer
 * to pass through its URL sanitizer (`@oge-ui/behavior`'s `sanitizeUrl` /
 * `sanitizeResourceUrl` in React). The render layer then builds real
 * elements from the tree — text stays text.
 */

/** A text run of sanitized overlay markup. */
export interface BpmnOverlayTextNode {
  readonly kind: 'text';
  readonly text: string;
}

/** An allow-listed element of sanitized overlay markup. */
export interface BpmnOverlayElementNode {
  readonly kind: 'element';
  /** Lower-case tag name from {@link BPMN_OVERLAY_ALLOWED_TAGS}. */
  readonly tag: string;
  /** Allow-listed attributes; `href`/`src` still need the layer's URL sanitizer. */
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: readonly BpmnOverlayNode[];
}

/** One node of sanitized overlay markup. */
export type BpmnOverlayNode = BpmnOverlayTextNode | BpmnOverlayElementNode;

/** Elements an overlay badge may contain — inline and simple block formatting. */
export const BPMN_OVERLAY_ALLOWED_TAGS: ReadonlySet<string> = new Set([
  'a',
  'abbr',
  'b',
  'br',
  'code',
  'div',
  'em',
  'i',
  'img',
  'kbd',
  'li',
  'mark',
  'ol',
  'p',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'ul',
]);

/** Elements whose whole subtree is dropped, text included. */
const DROPPED_SUBTREES = new Set([
  'script',
  'style',
  'template',
  'iframe',
  'object',
  'embed',
  'noscript',
  'svg',
  'math',
  'textarea',
  'select',
  'title',
]);

/** Attributes kept on any allowed element (`aria-*` / `data-*` are kept too). */
const ALLOWED_ATTRIBUTES = new Set([
  'class',
  'title',
  'role',
  'dir',
  'lang',
  'alt',
  'href',
  'src',
  'width',
  'height',
  'datetime',
  'target',
  'rel',
]);

/** Attributes that carry a URL — the render layer must sanitize them. */
export const BPMN_OVERLAY_URL_ATTRIBUTES: ReadonlySet<string> = new Set([
  'href',
  'src',
]);

/**
 * Parses overlay markup into a sanitized node tree. Returns an empty list
 * where no `DOMParser` exists (server rendering) — the overlay then renders
 * empty on the server and fills in on the client.
 */
export function sanitizeBpmnOverlayHtml(html: string): BpmnOverlayNode[] {
  if (typeof DOMParser === 'undefined') {
    return [];
  }
  const doc = new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    'text/html',
  );
  return walkChildren(doc.body);
}

function walkChildren(parent: Node): BpmnOverlayNode[] {
  const out: BpmnOverlayNode[] = [];
  parent.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const text = child.textContent ?? '';
      if (text !== '') {
        out.push({ kind: 'text', text });
      }
      return;
    }
    if (child.nodeType !== 1) {
      return; // comments, processing instructions
    }
    const element = child as Element;
    const tag = element.tagName.toLowerCase();
    if (DROPPED_SUBTREES.has(tag)) {
      return;
    }
    if (!BPMN_OVERLAY_ALLOWED_TAGS.has(tag)) {
      // unknown wrapper: keep its (sanitized) content, drop the element
      out.push(...walkChildren(element));
      return;
    }
    const attributes: Record<string, string> = {};
    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase();
      if (
        ALLOWED_ATTRIBUTES.has(name) ||
        name.startsWith('aria-') ||
        name.startsWith('data-')
      ) {
        attributes[name] = attr.value;
      }
    }
    out.push({
      kind: 'element',
      tag,
      attributes,
      children: tag === 'br' || tag === 'img' ? [] : walkChildren(element),
    });
  });
  return out;
}
