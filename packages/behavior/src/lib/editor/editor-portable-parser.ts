/**
 * A small, environment-independent HTML parser for the rich-text editor's
 * value (SSR follow-up to W8e). It exists so a server with no `DOMParser`
 * (Node, a prerender worker) reads the bound value into the same model the
 * browser does, and so the React adapter's first render — which a server
 * produces and the browser must reproduce while hydrating — parses the value
 * identically on both sides.
 *
 * It is not a general HTML parser and is never used to put markup on a page:
 * it builds a tree of plain objects exposing the handful of `Node` members
 * the editor's allow-list walker reads (`nodeType`, `nodeValue`,
 * `localName`, `firstChild`, `nextSibling`, `getAttribute`, `textContent`),
 * and the walker turns that tree into the model like any other source. The
 * HTML5 rules that matter for editor content are followed — void elements,
 * raw-text elements, implied `</p>` / `</li>` ends, the newline after
 * `<pre>`, character references, `<head>` content dropped — so the editor's
 * own serialized value and ordinary pasted documents parse exactly as a
 * browser parses them. Exotic named character references (outside the
 * common set below) stay literal.
 */

/** Minimal `Node` surface the editor's walker reads. */
interface PortableNode {
  readonly nodeType: 1 | 3;
  readonly nodeValue: string | null;
  readonly localName: string;
  firstChild: PortableNode | null;
  nextSibling: PortableNode | null;
  readonly textContent: string;
  getAttribute(name: string): string | null;
}

class PortableText implements PortableNode {
  readonly nodeType = 3 as const;
  readonly localName = '#text';
  firstChild: PortableNode | null = null;
  nextSibling: PortableNode | null = null;
  constructor(public nodeValue: string) {}
  get textContent(): string {
    return this.nodeValue;
  }
  getAttribute(): string | null {
    return null;
  }
}

class PortableElement implements PortableNode {
  readonly nodeType = 1 as const;
  readonly nodeValue = null;
  firstChild: PortableNode | null = null;
  nextSibling: PortableNode | null = null;
  private lastChild: PortableNode | null = null;
  constructor(
    readonly localName: string,
    private readonly attrs: ReadonlyMap<string, string>,
  ) {}
  getAttribute(name: string): string | null {
    return this.attrs.get(name.toLowerCase()) ?? null;
  }
  get textContent(): string {
    let text = '';
    for (let child = this.firstChild; child; child = child.nextSibling) {
      text += child.textContent;
    }
    return text;
  }
  append(child: PortableNode): void {
    if (child.nodeType === 3 && this.lastChild?.nodeType === 3) {
      // adjacent text merges, as in a parsed DOM
      (this.lastChild as PortableText).nodeValue += child.nodeValue ?? '';
      return;
    }
    if (this.lastChild) this.lastChild.nextSibling = child;
    else this.firstChild = child;
    this.lastChild = child;
  }
}

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Elements whose content is text up to their end tag. */
const RAW_TEXT = new Set([
  'script',
  'style',
  'textarea',
  'title',
  'xmp',
  'iframe',
  'noembed',
  'noframes',
  'noscript',
  'plaintext',
]);

/** Start tags that end an open `<p>` (HTML "close a p element"). */
const CLOSES_P = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'center',
  'details',
  'dialog',
  'dir',
  'div',
  'dl',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'li',
  'dd',
  'dt',
  'listing',
  'main',
  'menu',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'ul',
]);

/** Elements a `<p>` end search does not look past ("button scope"). */
const SCOPE = new Set([
  'applet',
  'caption',
  'html',
  'table',
  'td',
  'th',
  'marquee',
  'object',
  'template',
  'button',
]);

/** Elements that stay inside an unclosed `<head>`. */
const HEAD_CONTENT = new Set([
  'base',
  'link',
  'meta',
  'noscript',
  'script',
  'style',
  'template',
  'title',
]);

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  zwnj: '‌',
  zwj: '‍',
  lrm: '‎',
  rlm: '‏',
  shy: '­',
  copy: '©',
  reg: '®',
  trade: '™',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  laquo: '«',
  raquo: '»',
  bull: '•',
  middot: '·',
  deg: '°',
  plusmn: '±',
  times: '×',
  divide: '÷',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  sect: '§',
  para: '¶',
  iexcl: '¡',
  iquest: '¿',
  larr: '←',
  rarr: '→',
  uarr: '↑',
  darr: '↓',
  harr: '↔',
  hearts: '♥',
  check: '✓',
};

/** C1 replacements for numeric references (HTML's windows-1252 table). */
const C1: Record<number, number> = {
  0x80: 0x20ac,
  0x82: 0x201a,
  0x83: 0x0192,
  0x84: 0x201e,
  0x85: 0x2026,
  0x86: 0x2020,
  0x87: 0x2021,
  0x88: 0x02c6,
  0x89: 0x2030,
  0x8a: 0x0160,
  0x8b: 0x2039,
  0x8c: 0x0152,
  0x8e: 0x017d,
  0x91: 0x2018,
  0x92: 0x2019,
  0x93: 0x201c,
  0x94: 0x201d,
  0x95: 0x2022,
  0x96: 0x2013,
  0x97: 0x2014,
  0x98: 0x02dc,
  0x99: 0x2122,
  0x9a: 0x0161,
  0x9b: 0x203a,
  0x9c: 0x0153,
  0x9e: 0x017e,
  0x9f: 0x0178,
};

function codePoint(value: number): string {
  if (value === 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff))
    return '�';
  return String.fromCodePoint(C1[value] ?? value);
}

/** Decodes character references in text or an attribute value. */
export function ogeEditorDecodeEntities(text: string): string {
  if (!text.includes('&')) return text;
  return text.replace(
    /&(?:#[xX]([0-9a-fA-F]+);?|#([0-9]+);?|([a-zA-Z][a-zA-Z0-9]*);)/g,
    (match, hex?: string, dec?: string, name?: string) => {
      if (hex !== undefined) return codePoint(Number.parseInt(hex, 16));
      if (dec !== undefined) return codePoint(Number.parseInt(dec, 10));
      return NAMED[name as string] ?? match;
    },
  );
}

const ATTR = /\s*([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/y;

/**
 * Parses `html` into a portable tree and returns its body-equivalent root.
 * The result is only meant for the editor's walker (`ogeEditorReadDom`).
 */
export function ogeEditorParsePortable(html: string): Node {
  const source = html.replace(/\r\n?/g, '\n');
  const root = new PortableElement('body', new Map());
  // `<head>` content (title, styles, meta) never reaches the body
  const discard = new PortableElement('head', new Map());
  const stack: PortableElement[] = [root];
  const current = () => stack[stack.length - 1];
  let skipNewline = false;
  let i = 0;

  const text = (value: string) => {
    let content = value;
    const inHead = stack.indexOf(discard);
    if (inHead > 0 && content.trim() !== '') popTo(inHead);
    if (skipNewline && content.startsWith('\n')) content = content.slice(1);
    skipNewline = false;
    if (content !== '')
      current().append(new PortableText(ogeEditorDecodeEntities(content)));
  };

  const popTo = (index: number) => {
    stack.length = Math.max(1, index);
  };
  const findOpen = (
    tag: string | ((name: string) => boolean),
    scope: ReadonlySet<string>,
  ): number => {
    const match = typeof tag === 'string' ? (n: string) => n === tag : tag;
    for (let d = stack.length - 1; d > 0; d--) {
      const name = stack[d].localName;
      if (match(name)) return d;
      if (scope.has(name)) return -1;
    }
    return -1;
  };
  const listScope = new Set([...SCOPE, 'ol', 'ul']);

  while (i < source.length) {
    const lt = source.indexOf('<', i);
    if (lt === -1) {
      text(source.slice(i));
      break;
    }
    if (lt > i) text(source.slice(i, lt));
    i = lt;
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4);
      i = end === -1 ? source.length : end + 3;
      continue;
    }
    if (source[i + 1] === '!' || source[i + 1] === '?') {
      // doctype, CDATA, processing instruction: bogus comment
      const end = source.indexOf('>', i + 2);
      i = end === -1 ? source.length : end + 1;
      continue;
    }
    const end = /^<\/([a-zA-Z][^\s/>]*)[^>]*>/.exec(source.slice(i, i + 512));
    if (end) {
      i += end[0].length;
      const name = end[1].toLowerCase();
      skipNewline = false;
      if (name === 'head') {
        const inHead = stack.indexOf(discard);
        if (inHead > 0) popTo(inHead);
        continue;
      }
      if (name === 'body' || name === 'html') continue;
      if (name === 'br') {
        current().append(new PortableElement('br', new Map()));
        continue;
      }
      const at = HEADINGS.has(name)
        ? findOpen((n) => HEADINGS.has(n), SCOPE)
        : name === 'li'
          ? findOpen('li', listScope)
          : findOpen(name, name === 'p' ? SCOPE : new Set());
      if (at > 0) popTo(at);
      continue;
    }
    const start = /^<([a-zA-Z][^\s/>]*)/.exec(source.slice(i, i + 512));
    if (!start) {
      text('<');
      i += 1;
      continue;
    }
    const name = start[1].toLowerCase();
    i += start[0].length;
    const attrs = new Map<string, string>();
    for (;;) {
      // whitespace and stray '/' between attributes
      while (
        i < source.length &&
        (/\s/.test(source[i]) || (source[i] === '/' && source[i + 1] !== '>'))
      ) {
        i++;
      }
      ATTR.lastIndex = i;
      const attr = ATTR.exec(source);
      if (!attr || attr[0].trim() === '') break;
      i = ATTR.lastIndex;
      const key = attr[1].toLowerCase();
      if (!attrs.has(key)) {
        attrs.set(
          key,
          ogeEditorDecodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? ''),
        );
      }
    }
    const close = source.indexOf('>', i);
    i = close === -1 ? source.length : close + 1;
    skipNewline = false;

    if (name === 'html') continue;
    if (name === 'head') {
      if (!stack.includes(discard)) stack.push(discard);
      continue;
    }
    // body content ends an unclosed <head>
    const inHead = stack.indexOf(discard);
    if (inHead > 0 && !HEAD_CONTENT.has(name)) popTo(inHead);
    if (name === 'body') continue;
    if (CLOSES_P.has(name)) {
      const p = findOpen('p', SCOPE);
      if (p > 0) popTo(p);
    }
    if (name === 'li') {
      const li = findOpen('li', listScope);
      if (li > 0) popTo(li);
    } else if (name === 'dd' || name === 'dt') {
      const item = findOpen((n) => n === 'dd' || n === 'dt', SCOPE);
      if (item > 0) popTo(item);
    } else if (HEADINGS.has(name) && HEADINGS.has(current().localName)) {
      stack.pop();
    }
    const element = new PortableElement(name, attrs);
    current().append(element);
    if (VOID.has(name)) continue;
    if (RAW_TEXT.has(name)) {
      const closing = new RegExp(`</${name}[\\s/>]`, 'i');
      const rest = source.slice(i);
      const found = closing.exec(rest);
      const content = found ? rest.slice(0, found.index) : rest;
      // raw text is not decoded except in the escapable ones
      if (content !== '') {
        element.append(
          new PortableText(
            name === 'textarea' || name === 'title'
              ? ogeEditorDecodeEntities(content)
              : content,
          ),
        );
      }
      if (!found) break;
      const after = source.indexOf('>', i + found.index);
      i = after === -1 ? source.length : after + 1;
      continue;
    }
    stack.push(element);
    if (name === 'pre' || name === 'listing') skipNewline = true;
  }
  return root as unknown as Node;
}
