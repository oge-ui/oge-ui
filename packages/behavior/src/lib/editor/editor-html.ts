/**
 * HTML in and out of the rich-text editor's document model (W8e).
 *
 * **Out:** the model is turned into a small render tree once
 * (`ogeEditorRenderGroups`), and that one tree is both serialized to the
 * `value` string and built into the live contenteditable DOM
 * (`editor-dom.ts`) — so what the user edits and what the form receives can
 * never disagree. Every text node and attribute value is escaped; the only
 * attributes that exist are the ones the tree builder writes.
 *
 * **In:** a strict allowlist parser. The markup is parsed into an inert
 * `DOMParser` document (behind the `oge-ui#editor` Trusted Types policy) and
 * *walked*: allow-listed tags and styles become model data, everything else
 * is unwrapped (unknown inline tags keep their text) or dropped with its
 * content (`script`, `style`, `svg`, `iframe`, …). Nothing from the input is
 * ever copied through as markup, which is what defeats mutation XSS: the
 * output is re-serialized from the model, so a payload that only becomes
 * dangerous when the browser re-parses it has nothing left to mutate.
 * Links go through `sanitizeUrl`, images through `sanitizeResourceUrl`.
 */
import { sanitizeResourceUrl, sanitizeUrl } from '../security/sanitize-url';
import {
  OGE_EDITOR_MAX_INDENT,
  blockLength,
  docIsEmpty,
  ensureDoc,
  normalizeInlines,
  ogeEditorNoMarks,
  type OgeEditorAlign,
  type OgeEditorBlock,
  type OgeEditorBlockType,
  type OgeEditorDirection,
  type OgeEditorDoc,
  type OgeEditorHeadingLevel,
  type OgeEditorInline,
  type OgeEditorLink,
  type OgeEditorListKind,
  type OgeEditorMarks,
} from './editor-model';
import { ogeEditorParserInput } from './editor-trusted-types';

// --- the render tree ----------------------------------------------------------

/** A text leaf of the render tree. */
export interface OgeEditorRenderText {
  readonly type: 'text';
  readonly text: string;
}

/** An element of the render tree. Attributes and styles are allow-listed by construction. */
export interface OgeEditorRenderElement {
  readonly type: 'element';
  readonly tag: string;
  readonly attrs: Readonly<Record<string, string>>;
  /** CSS properties, applied through the CSSOM in the live DOM (CSP-safe). */
  readonly styles: Readonly<Record<string, string>>;
  readonly children: readonly OgeEditorRenderNode[];
  /** Index of the model block this element renders, when it is a block element. */
  readonly block?: number;
}

/** One node of the render tree. */
export type OgeEditorRenderNode = OgeEditorRenderText | OgeEditorRenderElement;

/** A top-level element and the model blocks it renders (the DOM reuse key). */
export interface OgeEditorRenderGroup {
  readonly blocks: readonly OgeEditorBlock[];
  readonly node: OgeEditorRenderElement;
}

/** Options shared by the serializer and the parser. */
export interface OgeEditorUrlOptions {
  /** Extra link schemes on top of `sanitizeUrl`'s allowlist (`['web+app']`). */
  readonly allowedSchemes?: readonly string[];
  /** Keep `data:image/*` sources (non-markup only). Default `false`. */
  readonly allowDataImages?: boolean;
}

/** Options of {@link ogeEditorRenderGroups}. */
export interface OgeEditorRenderOptions extends OgeEditorUrlOptions {
  /**
   * Build the live editing DOM rather than the value: block elements carry
   * `data-oge-block`, empty blocks a placeholder `<br>`, and code blocks
   * keep `<br>` instead of newline text.
   */
  readonly editing?: boolean;
}

function el(
  tag: string,
  children: readonly OgeEditorRenderNode[] = [],
  attrs: Record<string, string> = {},
  styles: Record<string, string> = {},
  block?: number,
): OgeEditorRenderElement {
  return block === undefined
    ? { type: 'element', tag, attrs, styles, children }
    : { type: 'element', tag, attrs, styles, children, block };
}

/** A link `href` that survives the allowlist, or `null`. */
export function ogeEditorSafeHref(
  href: string | null | undefined,
  options: OgeEditorUrlOptions = {},
): string | null {
  const value = (href ?? '').trim();
  if (value === '') return null;
  const safe = sanitizeUrl(value, { allowedSchemes: options.allowedSchemes });
  return safe === 'about:blank' || safe === '' ? null : safe;
}

/**
 * What a person typed into a link field, as an address: `ogeui.com/docs`
 * gets `https://`, `name@example.com` gets `mailto:` — without this a bare
 * domain would become a *relative* link to a page of that name. Text with a
 * scheme, a path (`/`, `./`, `../`), a query or a fragment is kept as typed.
 */
export function ogeEditorNormalizeLinkInput(text: string): string {
  const value = text.trim();
  if (value === '') return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || /^[/#?.]/.test(value)) return value;
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(value)) return `mailto:${value}`;
  if (/^[^\s/]+\.[^\s/]{2,}(?:[/?#].*)?$/.test(value))
    return `https://${value}`;
  return value;
}

/** An image `src` that survives the allowlist, or `null`. */
export function ogeEditorSafeImageSrc(
  src: string | null | undefined,
  options: OgeEditorUrlOptions = {},
): string | null {
  const value = (src ?? '').trim();
  if (value === '') return null;
  const scheme = /^\s*([a-z][a-z0-9+.-]*):/i.exec(value)?.[1]?.toLowerCase();
  // object URLs die with the page that made them — never worth storing
  if (scheme === 'blob') return null;
  if (scheme === 'data') {
    if (!options.allowDataImages) return null;
    if (!/^data:image\/(png|jpe?g|gif|webp|avif|bmp);/i.test(value))
      return null;
  }
  const safe = sanitizeResourceUrl(value);
  return safe === 'about:blank' || safe === '' ? null : safe;
}

/** Values that are colour defaults, not choices — dropped from pastes. */
const DEFAULT_COLORS = new Set([
  'black',
  'windowtext',
  'auto',
  '#000',
  '#000000',
  'rgb(0, 0, 0)',
  'rgb(0,0,0)',
]);
const DEFAULT_BACKGROUNDS = new Set([
  'white',
  'window',
  '#fff',
  '#ffffff',
  'rgb(255, 255, 255)',
  'rgb(255,255,255)',
]);
const NOT_COLORS = new Set([
  'transparent',
  'inherit',
  'initial',
  'unset',
  'revert',
  'currentcolor',
  'none',
]);

/**
 * A CSS colour that is safe to keep — hex, `rgb()`/`hsl()` with plain
 * numbers, or a keyword — normalized to lower case, or `null`. Anything with
 * `url(`, `var(`, `expression(`, quotes or semicolons is refused.
 */
export function ogeEditorSafeColor(
  value: string | null | undefined,
): string | null {
  const color = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s*!important$/, '');
  if (color === '' || color.length > 64 || NOT_COLORS.has(color)) return null;
  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(color)) return color;
  if (/^(?:rgb|rgba|hsl|hsla)\([0-9.,%\s/deg+-]+\)$/.test(color)) return color;
  if (/^[a-z]{3,30}$/.test(color)) return color;
  return null;
}

// --- serializing ---------------------------------------------------------------

function linkAttrs(
  link: OgeEditorLink,
  options: OgeEditorUrlOptions,
): Record<string, string> | null {
  const href = ogeEditorSafeHref(link.href, options);
  if (href === null) return null;
  const attrs: Record<string, string> = { href };
  if (link.title) attrs['title'] = link.title;
  if (link.target === '_blank') {
    attrs['target'] = '_blank';
    attrs['rel'] = 'noopener noreferrer';
  }
  return attrs;
}

interface Layer {
  readonly key: (marks: OgeEditorMarks) => string | null;
  readonly build: (
    marks: OgeEditorMarks,
    children: readonly OgeEditorRenderNode[],
    options: OgeEditorUrlOptions,
  ) => OgeEditorRenderNode[];
}

const simple = (tag: string, test: (m: OgeEditorMarks) => boolean): Layer => ({
  key: (m) => (test(m) ? tag : null),
  build: (_m, children) => [el(tag, children)],
});

/**
 * Mark nesting order, outermost first. Adjacent inlines sharing a layer's
 * value share its element, so `<strong>a<em>b</em></strong>` is emitted
 * instead of one element stack per run.
 */
const LAYERS: readonly Layer[] = [
  {
    key: (m) =>
      m.link
        ? `${m.link.href}\u0000${m.link.title ?? ''}\u0000${m.link.target ?? ''}`
        : null,
    build: (m, children, options) => {
      const attrs = m.link ? linkAttrs(m.link, options) : null;
      return attrs ? [el('a', children, attrs)] : [...children];
    },
  },
  {
    key: (m) =>
      m.color || m.background ? `${m.color ?? ''}|${m.background ?? ''}` : null,
    build: (m, children) => {
      const styles: Record<string, string> = {};
      const color = ogeEditorSafeColor(m.color);
      const background = ogeEditorSafeColor(m.background);
      if (color) styles['color'] = color;
      if (background) styles['background-color'] = background;
      return Object.keys(styles).length > 0
        ? [el('span', children, {}, styles)]
        : [...children];
    },
  },
  simple('strong', (m) => m.bold === true),
  simple('em', (m) => m.italic === true),
  simple('u', (m) => m.underline === true),
  simple('s', (m) => m.strike === true),
  simple('code', (m) => m.code === true),
  {
    key: (m) => m.script ?? null,
    build: (m, children) => [el(m.script === 'sub' ? 'sub' : 'sup', children)],
  },
];

function leaf(
  inline: OgeEditorInline,
  options: OgeEditorRenderOptions,
  pre: boolean,
): OgeEditorRenderNode | null {
  if (inline.kind === 'text') return { type: 'text', text: inline.text };
  if (inline.kind === 'break') {
    return pre && !options.editing ? { type: 'text', text: '\n' } : el('br');
  }
  const src = ogeEditorSafeImageSrc(inline.src, options);
  if (src === null) return null;
  const attrs: Record<string, string> = { src, alt: inline.alt };
  if (inline.width) attrs['width'] = String(inline.width);
  if (inline.height) attrs['height'] = String(inline.height);
  return el('img', [], attrs);
}

function buildInlines(
  inlines: readonly OgeEditorInline[],
  layer: number,
  options: OgeEditorRenderOptions,
  pre: boolean,
): OgeEditorRenderNode[] {
  if (pre || layer >= LAYERS.length) {
    const out: OgeEditorRenderNode[] = [];
    for (const inline of inlines) {
      const node = leaf(inline, options, pre);
      if (node) out.push(node);
    }
    return out;
  }
  const { key, build } = LAYERS[layer];
  const out: OgeEditorRenderNode[] = [];
  let i = 0;
  while (i < inlines.length) {
    const k = key(inlines[i].marks);
    let j = i + 1;
    while (j < inlines.length && key(inlines[j].marks) === k) j++;
    const children = buildInlines(inlines.slice(i, j), layer + 1, options, pre);
    if (k === null) out.push(...children);
    else out.push(...build(inlines[i].marks, children, options));
    i = j;
  }
  return out;
}

/** Collapsible spaces that would vanish in HTML become no-break spaces. */
function protectSpaces(nodes: OgeEditorRenderNode[]): OgeEditorRenderNode[] {
  const texts: {
    node: OgeEditorRenderText;
    parent: OgeEditorRenderNode[];
    index: number;
  }[] = [];
  const walk = (list: OgeEditorRenderNode[]) => {
    list.forEach((node, index) => {
      if (node.type === 'text') texts.push({ node, parent: list, index });
      else if (node.tag === 'br' || node.tag === 'img') {
        texts.push({
          node: { type: 'text', text: '\n' },
          parent: [],
          index: -1,
        });
      } else walk(node.children as OgeEditorRenderNode[]);
    });
  };
  walk(nodes);
  let previousEndsWithSpace = true; // block start
  texts.forEach((entry, i) => {
    if (entry.index === -1) {
      previousEndsWithSpace = true;
      return;
    }
    let text = entry.node.text.replace(/ {2}/g, '  ');
    if (previousEndsWithSpace && text.startsWith(' '))
      text = ' ' + text.slice(1);
    const next = texts[i + 1];
    if ((!next || next.index === -1) && text.endsWith(' ')) {
      text = text.slice(0, -1) + ' ';
    }
    previousEndsWithSpace = text.endsWith(' ');
    if (text !== entry.node.text) {
      entry.parent[entry.index] = { type: 'text', text };
    }
  });
  return nodes;
}

function blockAttrs(
  block: OgeEditorBlock,
  index: number,
  options: OgeEditorRenderOptions,
): { attrs: Record<string, string>; styles: Record<string, string> } {
  const attrs: Record<string, string> = {};
  const styles: Record<string, string> = {};
  if (options.editing) attrs['data-oge-block'] = String(index);
  if (block.dir) attrs['dir'] = block.dir;
  if (block.align && block.type !== 'codeBlock')
    styles['text-align'] = block.align;
  return { attrs, styles };
}

function blockChildren(
  block: OgeEditorBlock,
  options: OgeEditorRenderOptions,
): OgeEditorRenderNode[] {
  const pre = block.type === 'codeBlock';
  const children = buildInlines(block.inlines, 0, options, pre);
  if (!pre && !options.editing) protectSpaces(children);
  if (options.editing) {
    const last = block.inlines[block.inlines.length - 1];
    if (block.inlines.length === 0 || last?.kind === 'break') {
      // an empty block — or one ending in a line break — needs a trailing
      // <br> or the browser gives the line no height and no caret
      children.push(el('br', [], { 'data-oge-placeholder': '' }));
    }
  } else if (!pre) {
    const last = block.inlines[block.inlines.length - 1];
    // an empty block gets a <br> to keep its line; a block ending in a line
    // break gets a second one, because HTML gives a trailing <br> no line
    if (block.inlines.length === 0 || last?.kind === 'break') {
      children.push(el('br'));
    }
  }
  return children;
}

function blockElement(
  block: OgeEditorBlock,
  index: number,
  options: OgeEditorRenderOptions,
  tagOverride?: string,
): OgeEditorRenderElement {
  const { attrs, styles } = blockAttrs(block, index, options);
  if (block.type === 'rule') {
    if (options.editing) attrs['contenteditable'] = 'false';
    return el('hr', [], attrs, styles, index);
  }
  const children = blockChildren(block, options);
  if (block.type === 'codeBlock') {
    return el('pre', [el('code', children)], attrs, styles, index);
  }
  const tag =
    tagOverride ?? (block.type === 'heading' ? `h${block.level ?? 1}` : 'p');
  return el(tag, children, attrs, styles, index);
}

/**
 * The document as top-level render groups. Consecutive list items become
 * one nested `<ul>`/`<ol>` tree (a list kind change at the top level starts
 * a new group), consecutive quote blocks one `<blockquote>`.
 */
export function ogeEditorRenderGroups(
  doc: OgeEditorDoc,
  options: OgeEditorRenderOptions = {},
): OgeEditorRenderGroup[] {
  const groups: OgeEditorRenderGroup[] = [];
  const blocks = doc.blocks;
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'listItem') {
      const start = i;
      const kind = block.list ?? 'bullet';
      // one root list per top-level kind run
      const items: number[] = [];
      while (
        i < blocks.length &&
        blocks[i].type === 'listItem' &&
        !(
          items.length > 0 &&
          blocks[i].indent === 0 &&
          (blocks[i].list ?? 'bullet') !== kind
        )
      ) {
        items.push(i);
        i++;
      }
      groups.push({
        blocks: blocks.slice(start, i),
        node: buildList(blocks, items, options),
      });
      continue;
    }
    if (block.type === 'blockquote') {
      const start = i;
      const children: OgeEditorRenderNode[] = [];
      while (i < blocks.length && blocks[i].type === 'blockquote') {
        children.push(blockElement(blocks[i], i, options, 'p'));
        i++;
      }
      groups.push({
        blocks: blocks.slice(start, i),
        node: el('blockquote', children),
      });
      continue;
    }
    groups.push({ blocks: [block], node: blockElement(block, i, options) });
    i++;
  }
  return groups;
}

interface MutableElement {
  type: 'element';
  tag: string;
  attrs: Record<string, string>;
  styles: Record<string, string>;
  children: OgeEditorRenderNode[];
  block?: number;
}

function buildList(
  blocks: readonly OgeEditorBlock[],
  items: readonly number[],
  options: OgeEditorRenderOptions,
): OgeEditorRenderElement {
  const tagOf = (kind: OgeEditorListKind | undefined) =>
    kind === 'ordered' ? 'ol' : 'ul';
  const root: MutableElement = {
    type: 'element',
    tag: tagOf(blocks[items[0]].list),
    attrs: {},
    styles: {},
    children: [],
  };
  // stack[d] = the list element at depth d; lastItem[d] = its last <li>
  const stack: MutableElement[] = [root];
  const lastItem: (MutableElement | null)[] = [null];
  for (const index of items) {
    const block = blocks[index];
    const tag = tagOf(block.list);
    // an item can only nest one level below the previous one
    const depth = Math.min(block.indent, stack.length);
    while (stack.length > depth + 1) {
      stack.pop();
      lastItem.pop();
    }
    if (stack.length === depth + 1 && stack[depth].tag !== tag && depth > 0) {
      stack.pop();
      lastItem.pop();
    }
    if (stack.length < depth + 1) {
      const parentItem = lastItem[stack.length - 1];
      const list: MutableElement = {
        type: 'element',
        tag,
        attrs: {},
        styles: {},
        children: [],
      };
      if (parentItem) parentItem.children.push(list);
      else stack[stack.length - 1].children.push(list);
      stack.push(list);
      lastItem.push(null);
    }
    const li = blockElement(block, index, options, 'li') as MutableElement;
    const mutable: MutableElement = { ...li, children: [...li.children] };
    stack[stack.length - 1].children.push(mutable);
    lastItem[lastItem.length - 1] = mutable;
  }
  return root;
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '\u00a0': '&nbsp;',
};

/** HTML-escapes text or an attribute value. */
export function ogeEditorEscape(value: string): string {
  return value.replace(/[&<>"'\u00a0]/g, (c) => ESCAPES[c]);
}

const VOID = new Set(['br', 'img', 'hr']);

function serializeNode(node: OgeEditorRenderNode): string {
  if (node.type === 'text') return ogeEditorEscape(node.text);
  let attrs = '';
  for (const [name, value] of Object.entries(node.attrs)) {
    attrs += ` ${name}="${ogeEditorEscape(value)}"`;
  }
  const style = Object.entries(node.styles)
    .map(([name, value]) => `${name}: ${value}`)
    .join('; ');
  if (style) attrs += ` style="${ogeEditorEscape(style)}"`;
  if (VOID.has(node.tag)) return `<${node.tag}${attrs}>`;
  return `<${node.tag}${attrs}>${node.children.map(serializeNode).join('')}</${node.tag}>`;
}

/** Serializes render nodes to HTML. */
export function ogeEditorSerializeNodes(
  nodes: readonly OgeEditorRenderNode[],
): string {
  return nodes.map(serializeNode).join('');
}

/** The document as its HTML value; an empty document is `''`. */
export function ogeEditorToHtml(
  doc: OgeEditorDoc,
  options: OgeEditorUrlOptions = {},
): string {
  if (docIsEmpty(doc) && !doc.blocks[0].align && !doc.blocks[0].dir) {
    if (doc.blocks[0].type === 'paragraph') return '';
  }
  return ogeEditorRenderGroups(doc, { ...options, editing: false })
    .map((group) => serializeNode(group.node))
    .join('');
}

// --- parsing -------------------------------------------------------------------

/** Where the markup being parsed came from. */
export type OgeEditorParseSource = 'value' | 'paste' | 'dom';

/** Options of {@link ogeEditorFromHtml} and {@link ogeEditorReadDom}. */
export interface OgeEditorParseOptions extends OgeEditorUrlOptions {
  /**
   * `'paste'` turns on the clipboard heuristics (Word list paragraphs,
   * dropping default black/white colours, Office namespace tags); `'dom'`
   * reads the live editor back and keeps whitespace verbatim.
   */
  readonly source?: OgeEditorParseSource;
  /** Keep text/highlight colours. Default `true`. */
  readonly keepColors?: boolean;
}

/** Elements dropped together with everything inside them. */
const DROP = new Set([
  'script',
  'style',
  'template',
  'noscript',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'svg',
  'math',
  'head',
  'title',
  'meta',
  'link',
  'base',
  'xml',
  'canvas',
  'video',
  'audio',
  'source',
  'track',
  'picture',
  'map',
  'area',
  'input',
  'button',
  'select',
  'option',
  'textarea',
  'form',
  'dialog',
  'portal',
]);

const BLOCK_TAGS = new Set([
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'ul',
  'ol',
  'li',
  'hr',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'aside',
  'nav',
  'address',
  'figure',
  'figcaption',
  'details',
  'summary',
  'dl',
  'dt',
  'dd',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'caption',
  'center',
  'body',
  'html',
]);

/** Leaf blocks: an empty one still produces an (empty) paragraph. */
const LEAF_BLOCKS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'pre',
  'dt',
  'dd',
  'td',
  'th',
]);

const MAX_DEPTH = 256;

interface BlockContext {
  readonly type: OgeEditorBlockType;
  readonly level?: OgeEditorHeadingLevel;
  readonly list?: OgeEditorListKind;
  readonly indent: number;
  readonly align?: OgeEditorAlign;
  readonly dir?: OgeEditorDirection;
  /** Depth of `ul`/`ol` ancestors. */
  readonly listDepth: number;
  readonly listKind?: OgeEditorListKind;
}

interface OpenBlock {
  ctx: BlockContext;
  inlines: OgeEditorInline[];
  explicit: boolean;
  token: object | null;
}

function parseStyle(element: Element): Map<string, string> {
  const map = new Map<string, string>();
  const style = element.getAttribute('style');
  if (!style) return map;
  for (const declaration of style.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;
    const name = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim();
    if (name) map.set(name, value);
  }
  return map;
}

function alignFrom(
  value: string | null | undefined,
): OgeEditorAlign | undefined {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'center':
    case 'middle':
      return 'center';
    case 'right':
    case 'end':
      return 'end';
    case 'justify':
      return 'justify';
    case 'left':
    case 'start':
      return 'start';
    default:
      return undefined;
  }
}

function dirFrom(
  value: string | null | undefined,
): OgeEditorDirection | undefined {
  const dir = (value ?? '').trim().toLowerCase();
  return dir === 'rtl' || dir === 'ltr' ? dir : undefined;
}

function stripControls(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}

class DocBuilder {
  readonly blocks: OgeEditorBlock[] = [];
  private open: OpenBlock | null = null;

  constructor(private readonly verbatim: boolean) {}

  startBlock(ctx: BlockContext, explicit: boolean): object {
    this.flush();
    const token = {};
    this.open = { ctx, inlines: [], explicit, token };
    return token;
  }

  endBlock(token: object): void {
    const open = this.open;
    if (!open) return;
    if ((open.token === token && open.explicit) || open.inlines.length > 0) {
      this.push(open);
    }
    this.open = null;
  }

  /** Called before a nested block starts: pushes what the parent collected. */
  flush(): void {
    const open = this.open;
    if (open && open.inlines.length > 0) this.push(open);
    this.open = null;
  }

  pushRule(): void {
    this.flush();
    this.blocks.push({ type: 'rule', indent: 0, inlines: [] });
  }

  inline(ctx: BlockContext, inline: OgeEditorInline): void {
    if (!this.open)
      this.open = { ctx, inlines: [], explicit: false, token: null };
    const inlines = this.open.inlines;
    if (
      inline.kind === 'text' &&
      !this.verbatim &&
      this.open.ctx.type !== 'codeBlock'
    ) {
      let text = inline.text;
      const last = inlines[inlines.length - 1];
      const atLineStart =
        inlines.length === 0 ||
        last.kind === 'break' ||
        (last.kind === 'text' && last.text.endsWith(' '));
      if (atLineStart) text = text.replace(/^ +/, '');
      if (text === '') return;
      inlines.push({ ...inline, text });
      return;
    }
    inlines.push(inline);
  }

  private push(open: OpenBlock): void {
    const { ctx } = open;
    let inlines = open.inlines;
    if (!this.verbatim && ctx.type !== 'codeBlock') {
      // trim trailing collapsible spaces (also before a final line break)
      inlines = inlines.slice();
      for (let i = inlines.length - 1; i >= 0; i--) {
        const inline = inlines[i];
        if (inline.kind !== 'text') {
          if (inline.kind === 'break' && i === inlines.length - 1) continue;
          break;
        }
        const trimmed = inline.text.replace(/ +$/, '');
        if (trimmed === inline.text) break;
        if (trimmed === '') inlines.splice(i, 1);
        else {
          inlines[i] = { ...inline, text: trimmed };
          break;
        }
      }
      // HTML gives a trailing <br> no line of its own — it is the
      // empty-line placeholder, not content (the serializer doubles it)
      if (inlines[inlines.length - 1]?.kind === 'break') inlines.pop();
    } else if (inlines.length === 1 && inlines[0].kind === 'break') {
      // a browser-inserted <br> in an emptied block of the live editor
      inlines = [];
    }
    const block: Record<string, unknown> = {
      type: ctx.type,
      indent:
        ctx.type === 'listItem'
          ? Math.min(ctx.indent, OGE_EDITOR_MAX_INDENT)
          : 0,
      inlines: normalizeInlines(inlines),
    };
    if (ctx.type === 'heading') block['level'] = ctx.level ?? 1;
    if (ctx.type === 'listItem') block['list'] = ctx.list ?? 'bullet';
    if (ctx.align && ctx.align !== 'start' && ctx.type !== 'codeBlock')
      block['align'] = ctx.align;
    if (ctx.dir) block['dir'] = ctx.dir;
    this.blocks.push(block as unknown as OgeEditorBlock);
  }
}

interface WalkContext {
  readonly block: BlockContext;
  readonly marks: OgeEditorMarks;
  readonly pre: boolean;
}

const ROOT_BLOCK: BlockContext = { type: 'paragraph', indent: 0, listDepth: 0 };

class Walker {
  private readonly builder: DocBuilder;
  private readonly paste: boolean;
  private readonly dom: boolean;
  private readonly keepColors: boolean;

  constructor(private readonly options: OgeEditorParseOptions) {
    this.paste = options.source === 'paste';
    this.dom = options.source === 'dom';
    this.keepColors = options.keepColors !== false;
    this.builder = new DocBuilder(this.dom);
  }

  run(root: Node): OgeEditorDoc {
    this.children(
      root,
      { block: ROOT_BLOCK, marks: ogeEditorNoMarks(), pre: false },
      0,
    );
    this.builder.flush();
    return ensureDoc(this.builder.blocks);
  }

  private children(node: Node, ctx: WalkContext, depth: number): void {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      this.node(child, ctx, depth + 1);
    }
  }

  private node(node: Node, ctx: WalkContext, depth: number): void {
    if (node.nodeType === 3) {
      this.text(node.nodeValue ?? '', ctx);
      return;
    }
    if (node.nodeType !== 1) return; // comments, processing instructions, …
    const element = node as Element;
    const tag = element.localName.toLowerCase();
    if (DROP.has(tag) || tag.includes(':')) return; // incl. Office o:p, v:shape, w:…
    if (element.getAttribute('data-oge-placeholder') !== null) return;
    if (depth > MAX_DEPTH) {
      this.text(element.textContent ?? '', ctx);
      return;
    }
    const style = parseStyle(element);
    const display = (style.get('display') ?? '').toLowerCase();
    if (
      display === 'none' ||
      (style.get('mso-hide') ?? '').toLowerCase() === 'all'
    ) {
      return;
    }
    if (
      this.paste &&
      /mso-list\s*:\s*ignore/i.test(element.getAttribute('style') ?? '')
    ) {
      return; // Word's literal bullet / number glyphs
    }
    if (tag === 'br') {
      this.builder.inline(ctx.block, {
        kind: 'break',
        marks: marksForAtom(ctx.marks),
      });
      return;
    }
    if (tag === 'img') {
      this.image(element, ctx);
      return;
    }
    if (tag === 'hr') {
      this.builder.pushRule();
      return;
    }
    if (BLOCK_TAGS.has(tag)) {
      this.block(element, tag, style, ctx, depth);
      return;
    }
    this.children(
      element,
      { ...ctx, marks: this.inlineMarks(element, tag, style, ctx.marks) },
      depth,
    );
  }

  private text(raw: string, ctx: WalkContext): void {
    let text = stripControls(raw);
    if (!ctx.pre && !this.dom) text = text.replace(/[ \t\n\r\f]+/g, ' ');
    if (text === '') return;
    if (ctx.pre) {
      const lines = text.replace(/\r\n?/g, '\n').split('\n');
      lines.forEach((line, i) => {
        if (i > 0)
          this.builder.inline(ctx.block, {
            kind: 'break',
            marks: ogeEditorNoMarks(),
          });
        if (line)
          this.builder.inline(ctx.block, {
            kind: 'text',
            text: line,
            marks: ogeEditorNoMarks(),
          });
      });
      return;
    }
    const marks =
      ctx.block.type === 'codeBlock' ? ogeEditorNoMarks() : ctx.marks;
    this.builder.inline(ctx.block, { kind: 'text', text, marks });
  }

  private image(element: Element, ctx: WalkContext): void {
    const src = ogeEditorSafeImageSrc(
      element.getAttribute('src'),
      this.options,
    );
    if (src === null) return;
    const size = (name: string): number | undefined => {
      const value = Number.parseInt(element.getAttribute(name) ?? '', 10);
      return Number.isFinite(value) && value > 0 && value <= 10000
        ? value
        : undefined;
    };
    const width = size('width');
    const height = size('height');
    this.builder.inline(ctx.block, {
      kind: 'image',
      src,
      alt: stripControls(element.getAttribute('alt') ?? '').slice(0, 1000),
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      marks: marksForAtom(ctx.marks),
    });
  }

  private inlineMarks(
    element: Element,
    tag: string,
    style: Map<string, string>,
    base: OgeEditorMarks,
  ): OgeEditorMarks {
    let marks: Record<string, unknown> = { ...base };
    const set = (key: string, on: boolean) => {
      if (on) marks[key] = true;
      else delete marks[key];
    };
    switch (tag) {
      case 'b':
      case 'strong':
        set('bold', true);
        break;
      case 'i':
      case 'em':
      case 'cite':
      case 'dfn':
      case 'var':
        set('italic', true);
        break;
      case 'u':
      case 'ins':
        set('underline', true);
        break;
      case 's':
      case 'strike':
      case 'del':
        set('strike', true);
        break;
      case 'code':
      case 'kbd':
      case 'samp':
      case 'tt':
        set('code', true);
        break;
      case 'sub':
        marks['script'] = 'sub';
        break;
      case 'sup':
        marks['script'] = 'super';
        break;
      case 'a': {
        const href = ogeEditorSafeHref(
          element.getAttribute('href'),
          this.options,
        );
        if (href !== null) {
          const link: { href: string; title?: string; target?: '_blank' } = {
            href,
          };
          const title = stripControls(
            element.getAttribute('title') ?? '',
          ).trim();
          if (title) link.title = title.slice(0, 500);
          if (element.getAttribute('target') === '_blank')
            link.target = '_blank';
          marks['link'] = link;
        }
        break;
      }
      case 'font': {
        const color = element.getAttribute('color');
        if (color) this.applyColor(marks, 'color', color);
        break;
      }
    }
    const weight = style.get('font-weight');
    if (weight !== undefined) {
      const w = weight.toLowerCase();
      const numeric = Number.parseInt(w, 10);
      if (w === 'bold' || w === 'bolder' || numeric >= 600) set('bold', true);
      else if (
        w === 'normal' ||
        w === 'lighter' ||
        (numeric > 0 && numeric < 600)
      )
        set('bold', false);
    }
    const fontStyle = style.get('font-style');
    if (fontStyle !== undefined) {
      if (/italic|oblique/i.test(fontStyle)) set('italic', true);
      else if (/normal/i.test(fontStyle)) set('italic', false);
    }
    const decoration = `${style.get('text-decoration') ?? ''} ${style.get('text-decoration-line') ?? ''}`;
    if (/underline/i.test(decoration)) set('underline', true);
    if (/line-through/i.test(decoration)) set('strike', true);
    if (
      /\bnone\b/i.test(decoration) &&
      !/underline|line-through/i.test(decoration)
    ) {
      set('underline', false);
      set('strike', false);
    }
    const vertical = style.get('vertical-align');
    if (vertical) {
      if (/^sub/i.test(vertical)) marks['script'] = 'sub';
      else if (/^super/i.test(vertical)) marks['script'] = 'super';
    }
    const color = style.get('color');
    if (color !== undefined) this.applyColor(marks, 'color', color);
    const background = style.get('background-color') ?? style.get('background');
    if (background !== undefined)
      this.applyColor(marks, 'background', background);
    if (marks['bold'] === undefined) delete marks['bold'];
    marks = { ...marks };
    return marks as OgeEditorMarks;
  }

  private applyColor(
    marks: Record<string, unknown>,
    key: 'color' | 'background',
    raw: string,
  ): void {
    if (!this.keepColors) return;
    const value = ogeEditorSafeColor(raw);
    if (value === null) return;
    if (
      this.paste &&
      (key === 'color' ? DEFAULT_COLORS : DEFAULT_BACKGROUNDS).has(value)
    ) {
      delete marks[key];
      return;
    }
    marks[key] = value;
  }

  private block(
    element: Element,
    tag: string,
    style: Map<string, string>,
    ctx: WalkContext,
    depth: number,
  ): void {
    const parent = ctx.block;
    const align =
      alignFrom(style.get('text-align') ?? element.getAttribute('align')) ??
      parent.align;
    const dir =
      dirFrom(element.getAttribute('dir') ?? style.get('direction')) ??
      parent.dir;
    let block: BlockContext = { ...parent, align, dir };
    let pre = ctx.pre;
    const headingMatch = /^h([1-6])$/.exec(tag);
    if (headingMatch) {
      block = {
        ...block,
        type: 'heading',
        level: Number(headingMatch[1]) as OgeEditorHeadingLevel,
      };
    } else if (tag === 'blockquote') {
      if (parent.type !== 'listItem') block = { ...block, type: 'blockquote' };
    } else if (tag === 'pre') {
      block = { ...block, type: 'codeBlock', align: undefined };
      pre = true;
    } else if (tag === 'ul' || tag === 'ol') {
      block = {
        ...block,
        listDepth: parent.listDepth + 1,
        listKind: tag === 'ol' ? 'ordered' : 'bullet',
      };
      this.builder.flush();
      this.children(element, { ...ctx, block, pre }, depth);
      this.builder.flush();
      return;
    } else if (tag === 'li') {
      block = {
        ...block,
        type: 'listItem',
        list: parent.listKind ?? 'bullet',
        indent: Math.max(0, parent.listDepth - 1),
      };
    } else if (this.paste && this.isWordListParagraph(element, style)) {
      const level = /level(\d+)/i.exec(style.get('mso-list') ?? '')?.[1];
      block = {
        ...block,
        type: 'listItem',
        list: this.wordListKind(element),
        indent: Math.max(0, Number(level ?? '1') - 1),
      };
    } else if (tag === 'p' && parent.type === 'heading') {
      block = { ...block, type: 'paragraph', level: undefined };
    }
    const marks = this.inlineMarks(element, tag, style, ctx.marks);
    const explicit = LEAF_BLOCKS.has(tag);
    const token = this.builder.startBlock(block, explicit);
    this.children(element, { block, marks, pre }, depth);
    this.builder.endBlock(token);
  }

  private isWordListParagraph(
    element: Element,
    style: Map<string, string>,
  ): boolean {
    const className = element.getAttribute('class') ?? '';
    return (
      /MsoListParagraph/i.test(className) ||
      /level\d+/i.test(style.get('mso-list') ?? '')
    );
  }

  private wordListKind(element: Element): OgeEditorListKind {
    // Word writes the bullet or number as text in a `mso-list:Ignore` span
    let marker = '';
    const walk = (node: Node): boolean => {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (child.nodeType === 1) {
          const styleAttr = (child as Element).getAttribute('style') ?? '';
          if (/mso-list\s*:\s*ignore/i.test(styleAttr)) {
            marker = (child.textContent ?? '').trim();
            return true;
          }
          if (walk(child)) return true;
        }
      }
      return false;
    };
    walk(element);
    return /^\(?([0-9]+|[a-z]|[ivxlcdm]+)[.)]/i.test(marker)
      ? 'ordered'
      : 'bullet';
  }
}

function marksForAtom(marks: OgeEditorMarks): OgeEditorMarks {
  return marks.link ? { link: marks.link } : ogeEditorNoMarks();
}

/** Reads a DOM subtree (an inert parsed body, or the live editor) into a document. */
export function ogeEditorReadDom(
  root: Node,
  options: OgeEditorParseOptions = {},
): OgeEditorDoc {
  return new Walker(options).run(root);
}

/** Strips markup without a parser (SSR fallback): the text only, as paragraphs. */
function textOnlyDoc(html: string): OgeEditorDoc {
  const text = html
    .replace(
      /<(script|style|template|svg|math|iframe|noscript)\b[\s\S]*?<\/\1\s*>/gi,
      '',
    )
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
  const lines = stripControls(text)
    .split('\n')
    .map((line) => line.replace(/[ \t\r\f]+/g, ' ').trim())
    .filter((line, i, all) => line !== '' || (i > 0 && i < all.length - 1));
  return ensureDoc(
    lines.map((line) => ({
      type: 'paragraph' as const,
      indent: 0,
      inlines: line
        ? [{ kind: 'text' as const, text: line, marks: ogeEditorNoMarks() }]
        : [],
    })),
  );
}

/**
 * Parses HTML into a sanitized document. Uses an inert `DOMParser` document
 * (Trusted Types policy `oge-ui#editor`); without `DOMParser` (server
 * rendering) the text survives and all markup is dropped.
 */
export function ogeEditorFromHtml(
  html: string | null | undefined,
  options: OgeEditorParseOptions = {},
): OgeEditorDoc {
  const source = (html ?? '').trim();
  if (source === '') return ensureDoc([]);
  if (typeof DOMParser === 'undefined') return textOnlyDoc(source);
  let parsed: Document;
  try {
    parsed = new DOMParser().parseFromString(
      ogeEditorParserInput(source),
      'text/html',
    );
  } catch {
    return textOnlyDoc(source);
  }
  return ogeEditorReadDom(parsed.body, options);
}

/**
 * Sanitizes HTML through the editor's allowlist: parse into the model and
 * serialize it back. Use it on the server-bound value or on HTML you render
 * elsewhere — the output only ever contains the editor's own tags.
 */
export function ogeSanitizeEditorHtml(
  html: string | null | undefined,
  options: OgeEditorParseOptions = {},
): string {
  return ogeEditorToHtml(ogeEditorFromHtml(html, options), options);
}

/** A plain-text clipboard payload as a document: one paragraph per line. */
export function ogeEditorFromText(text: string): OgeEditorDoc {
  const lines = stripControls(text.replace(/\r\n?/g, '\n')).split('\n');
  return ensureDoc(
    lines.map((line) => ({
      type: 'paragraph' as const,
      indent: 0,
      inlines: line
        ? [{ kind: 'text' as const, text: line, marks: ogeEditorNoMarks() }]
        : [],
    })),
  );
}

/** Total text width of a document, for clamps. */
export function docLength(doc: OgeEditorDoc): number {
  return doc.blocks.reduce((sum, block) => sum + blockLength(block), 0);
}
