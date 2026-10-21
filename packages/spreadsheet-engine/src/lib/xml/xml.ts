/**
 * A small, strict XML reader and the escaping helpers the xlsx codec needs.
 *
 * Why not `DOMParser`: the engine reads workbooks in Web Workers and Node,
 * where there is none; a DOM of a million-cell sheet costs gigabytes; and a
 * parser that builds documents is a Trusted Types sink. This one streams
 * events to a handler and keeps nothing but the open-element stack.
 *
 * It is deliberately strict where laxness is an attack surface: a DOCTYPE is
 * an error (no external entities, no entity expansion bombs), only the five
 * predefined entities and numeric character references are understood, and
 * nesting depth is capped. Everything else a SpreadsheetML part contains —
 * namespaces, `mc:` alternate content, unknown elements — is passed through
 * as names for the reader to interpret.
 */

/** Why a document was refused. */
export type OgeXmlErrorCode =
  'doctype' | 'entity' | 'malformed' | 'mismatched-tag' | 'unclosed' | 'depth';

/** A refused document: what went wrong and where (UTF-16 offset). */
export class OgeXmlError extends Error {
  constructor(
    readonly code: OgeXmlErrorCode,
    readonly offset: number,
    message: string,
  ) {
    super(message);
    this.name = 'OgeXmlError';
  }
}

/** Receives the document's events, in order. */
export interface OgeXmlHandler {
  /**
   * A start tag; `attributes` has no prototype, names are as written
   * (`r:id`). `start` is the UTF-16 offset of its `<`.
   */
  open?(
    name: string,
    attributes: Readonly<Record<string, string>>,
    selfClosing: boolean,
    start: number,
  ): void;
  /**
   * An end tag (also called right after `open` for `<x/>`). `end` is the
   * offset just past its `>` — with `open`'s `start`, the element's source.
   */
  close?(name: string, end: number): void;
  /** Character data with entities decoded; CDATA sections arrive as text too. */
  text?(text: string): void;
}

/** Limits of {@link parseOgeXml}. */
export interface OgeXmlOptions {
  /** Deepest element nesting accepted. Default 256 (SpreadsheetML needs < 20). */
  readonly maxDepth?: number;
}

const PREDEFINED: Readonly<Record<string, string>> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
};

/** The local part of a qualified name (`x14:dataBar` → `dataBar`). */
export function ogeXmlLocalName(name: string): string {
  const colon = name.indexOf(':');
  return colon < 0 ? name : name.slice(colon + 1);
}

/** Decodes entity and character references; throws on anything else. */
function decode(text: string, offset: number): string {
  let amp = text.indexOf('&');
  if (amp < 0) return text;
  let out = '';
  let last = 0;
  while (amp >= 0) {
    const semi = text.indexOf(';', amp + 1);
    if (semi < 0 || semi - amp > 12) {
      throw new OgeXmlError(
        'entity',
        offset + amp,
        'Unterminated entity reference',
      );
    }
    const body = text.slice(amp + 1, semi);
    let value: string | undefined;
    if (body.startsWith('#x') || body.startsWith('#X')) {
      value = fromCodePoint(
        /^[0-9a-fA-F]{1,6}$/.test(body.slice(2))
          ? parseInt(body.slice(2), 16)
          : -1,
      );
    } else if (body.startsWith('#')) {
      value = fromCodePoint(
        /^[0-9]{1,7}$/.test(body.slice(1)) ? Number(body.slice(1)) : -1,
      );
    } else {
      value = Object.prototype.hasOwnProperty.call(PREDEFINED, body)
        ? PREDEFINED[body]
        : undefined;
    }
    if (value === undefined) {
      throw new OgeXmlError('entity', offset + amp, `Unknown entity &${body};`);
    }
    out += text.slice(last, amp) + value;
    last = semi + 1;
    amp = text.indexOf('&', last);
  }
  return out + text.slice(last);
}

/** A character reference's text, or `undefined` for one XML forbids. */
function fromCodePoint(code: number): string | undefined {
  const legal =
    code === 0x9 ||
    code === 0xa ||
    code === 0xd ||
    (code >= 0x20 && code <= 0xd7ff) ||
    (code >= 0xe000 && code <= 0xfffd) ||
    (code >= 0x10000 && code <= 0x10ffff);
  return legal ? String.fromCodePoint(code) : undefined;
}

/**
 * End-of-line handling (XML 1.0 §2.11): a literal CR LF pair or a lone CR
 * reads as LF. Excel writes CR LF inside note text; `&#13;` stays a CR.
 */
function lineEnds(text: string): string {
  return text.includes('\r') ? text.replace(/\r\n?/g, '\n') : text;
}

function isSpace(code: number): boolean {
  return code === 0x20 || code === 0x9 || code === 0xa || code === 0xd;
}

/**
 * Streams an XML document to `handler`. Throws {@link OgeXmlError} for a
 * document that is not well-formed or uses what the reader refuses.
 */
export function parseOgeXml(
  xml: string,
  handler: OgeXmlHandler,
  options: OgeXmlOptions = {},
): void {
  const state: ParseState = {
    stack: [],
    rooted: false,
    maxDepth: options.maxDepth ?? 256,
  };
  const stack = state.stack;
  const len = xml.length;
  let pos = xml.charCodeAt(0) === 0xfeff ? 1 : 0;
  while (pos < len) {
    const lt = xml.indexOf('<', pos);
    const textEnd = lt < 0 ? len : lt;
    if (textEnd > pos) {
      const raw = xml.slice(pos, textEnd);
      if (stack.length === 0) {
        if (raw.trim())
          throw new OgeXmlError(
            'malformed',
            pos,
            'Text outside the root element',
          );
      } else {
        // decoded even without a text handler: a bad entity is an error either way
        const decoded = decode(lineEnds(raw), pos);
        handler.text?.(decoded);
      }
    }
    if (lt < 0) break;
    pos = lt;
    const next = xml.charCodeAt(pos + 1);
    if (next === 0x3f /* ? */) {
      const end = xml.indexOf('?>', pos + 2);
      if (end < 0)
        throw new OgeXmlError(
          'malformed',
          pos,
          'Unterminated processing instruction',
        );
      pos = end + 2;
    } else if (next === 0x21 /* ! */) {
      if (xml.startsWith('<!--', pos)) {
        const end = xml.indexOf('-->', pos + 4);
        if (end < 0)
          throw new OgeXmlError('malformed', pos, 'Unterminated comment');
        pos = end + 3;
      } else if (xml.startsWith('<![CDATA[', pos)) {
        const end = xml.indexOf(']]>', pos + 9);
        if (end < 0)
          throw new OgeXmlError('malformed', pos, 'Unterminated CDATA section');
        if (stack.length === 0)
          throw new OgeXmlError('malformed', pos, 'CDATA outside the root');
        handler.text?.(lineEnds(xml.slice(pos + 9, end)));
        pos = end + 3;
      } else if (xml.slice(pos + 2, pos + 9).toUpperCase() === 'DOCTYPE') {
        throw new OgeXmlError(
          'doctype',
          pos,
          'DOCTYPE declarations are not accepted',
        );
      } else {
        throw new OgeXmlError('malformed', pos, 'Unknown markup declaration');
      }
    } else if (next === 0x2f /* / */) {
      const end = xml.indexOf('>', pos + 2);
      if (end < 0)
        throw new OgeXmlError('malformed', pos, 'Unterminated end tag');
      const name = xml.slice(pos + 2, end).trim();
      const open = stack.pop();
      if (open !== name) {
        throw new OgeXmlError(
          'mismatched-tag',
          pos,
          open === undefined
            ? `Unexpected </${name}>`
            : `</${name}> closes <${open}>`,
        );
      }
      handler.close?.(name, end + 1);
      pos = end + 1;
    } else {
      pos = readStartTag(xml, pos, state, handler);
    }
  }
  if (stack.length) {
    throw new OgeXmlError(
      'unclosed',
      len,
      `<${stack[stack.length - 1]}> is never closed`,
    );
  }
}

/** The open-element stack and whether the root element has been read. */
interface ParseState {
  readonly stack: string[];
  rooted: boolean;
  readonly maxDepth: number;
}

/** Reads `<name attr="v" …>` or `<name …/>` at `start`; returns the next position. */
function readStartTag(
  xml: string,
  start: number,
  state: ParseState,
  handler: OgeXmlHandler,
): number {
  const { stack, maxDepth } = state;
  const len = xml.length;
  let i = start + 1;
  while (i < len) {
    const c = xml.charCodeAt(i);
    if (isSpace(c) || c === 0x2f || c === 0x3e) break;
    i++;
  }
  const name = xml.slice(start + 1, i);
  if (!name || name.includes('<') || name.includes('=')) {
    throw new OgeXmlError('malformed', start, 'Malformed start tag');
  }
  if (stack.length === 0 && state.rooted) {
    throw new OgeXmlError('malformed', start, 'A second root element');
  }
  const attributes: Record<string, string> = Object.create(null);
  for (;;) {
    while (i < len && isSpace(xml.charCodeAt(i))) i++;
    if (i >= len)
      throw new OgeXmlError('malformed', start, `Unterminated <${name}>`);
    const c = xml.charCodeAt(i);
    if (c === 0x3e /* > */) {
      i++;
      if (stack.length >= maxDepth)
        throw new OgeXmlError('depth', start, 'Elements nest too deep');
      state.rooted = true;
      stack.push(name);
      handler.open?.(name, attributes, false, start);
      return i;
    }
    if (c === 0x2f /* / */) {
      if (xml.charCodeAt(i + 1) !== 0x3e)
        throw new OgeXmlError('malformed', i, 'Stray "/" in a tag');
      state.rooted = true;
      handler.open?.(name, attributes, true, start);
      handler.close?.(name, i + 2);
      return i + 2;
    }
    // an attribute: name = "value"
    const nameStart = i;
    while (i < len) {
      const a = xml.charCodeAt(i);
      if (a === 0x3d /* = */ || isSpace(a) || a === 0x3e || a === 0x2f) break;
      i++;
    }
    const attribute = xml.slice(nameStart, i);
    while (i < len && isSpace(xml.charCodeAt(i))) i++;
    if (!attribute || xml.charCodeAt(i) !== 0x3d) {
      throw new OgeXmlError(
        'malformed',
        nameStart,
        `Attribute without a value in <${name}>`,
      );
    }
    i++;
    while (i < len && isSpace(xml.charCodeAt(i))) i++;
    const quote = xml[i];
    if (quote !== '"' && quote !== "'") {
      throw new OgeXmlError(
        'malformed',
        i,
        `Unquoted attribute value in <${name}>`,
      );
    }
    const end = xml.indexOf(quote, i + 1);
    if (end < 0)
      throw new OgeXmlError(
        'malformed',
        i,
        `Unterminated attribute value in <${name}>`,
      );
    const raw = xml.slice(i + 1, end);
    if (raw.includes('<'))
      throw new OgeXmlError(
        'malformed',
        i,
        `"<" in an attribute value of <${name}>`,
      );
    if (attribute in attributes) {
      throw new OgeXmlError(
        'malformed',
        nameStart,
        `Duplicate attribute ${attribute} in <${name}>`,
      );
    }
    // attribute-value normalisation: literal tabs and line breaks read as
    // spaces, a CR LF pair as one
    attributes[attribute] = decode(
      lineEnds(raw).replace(/[\t\n]/g, ' '),
      i + 1,
    );
    i = end + 1;
  }
}

/** Escapes element text: `&`, `<`, `>` and CR. */
export function escapeOgeXmlText(text: string): string {
  // a literal CR would read back as LF (end-of-line handling): write it as a reference
  return text.replace(/[&<>\r]/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&#13;',
  );
}

/**
 * Escapes an attribute value for double quotes. Tabs and line breaks become
 * character references, so attribute-value normalisation keeps them.
 */
export function escapeOgeXmlAttribute(text: string): string {
  return text.replace(/[&<>"\t\n\r]/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case '\t':
        return '&#9;';
      case '\n':
        return '&#10;';
      default:
        return '&#13;';
    }
  });
}

/** Whether a UTF-16 code unit sequence position holds a character XML 1.0 forbids. */
function forbiddenAt(text: string, i: number): number {
  const code = text.charCodeAt(i);
  if (code < 0x20) return code === 0x9 || code === 0xa || code === 0xd ? 0 : 1;
  if (code === 0xfffe || code === 0xffff) return 1;
  if (code >= 0xd800 && code <= 0xdbff) {
    const low = text.charCodeAt(i + 1);
    return low >= 0xdc00 && low <= 0xdfff ? 0 : 1; // a lone high surrogate
  }
  if (code >= 0xdc00 && code <= 0xdfff) {
    const high = text.charCodeAt(i - 1);
    return high >= 0xd800 && high <= 0xdbff ? 0 : 1; // a lone low surrogate
  }
  return 0;
}

const XSTRING_ESCAPE = /_x[0-9A-Fa-f]{4}_/g;

/**
 * Encodes text for a SpreadsheetML string (`ST_Xstring`): characters XML
 * cannot carry (control characters, lone surrogates) become `_xHHHH_`, and a
 * literal `_xHHHH_` in the text has its underscore escaped (`_x005F_`) so it
 * reads back as written. Apply XML escaping after this.
 */
export function encodeOgeXstring(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '_' && /^_x[0-9A-Fa-f]{4}_/.test(text.slice(i, i + 7))) {
      out += '_x005F_';
      continue;
    }
    out += forbiddenAt(text, i)
      ? `_x${text.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0')}_`
      : ch;
  }
  return out;
}

/** Decodes `_xHHHH_` escapes of a SpreadsheetML string. */
export function decodeOgeXstring(text: string): string {
  if (!text.includes('_x')) return text;
  return text.replace(XSTRING_ESCAPE, (match) =>
    String.fromCharCode(parseInt(match.slice(2, 6), 16)),
  );
}
