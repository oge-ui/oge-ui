/**
 * A small element tree over the pull parser, for the parts that stay small
 * (styles, theme, workbook, comments, document properties). Worksheets and
 * the shared-string table stream instead — a tree of a million cells is what
 * the engine avoids building.
 */
import { ogeXmlLocalName, parseOgeXml } from '../xml/xml';

/** An element: local name, attributes as written, children, direct text. */
export interface OgeXmlNode {
  /** Local name (`x14:dataBar` → `dataBar`). */
  readonly name: string;
  /** Name as written, prefix included. */
  readonly qname: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: OgeXmlNode[];
  /** Concatenated character data directly inside this element. */
  text: string;
  /** Source span (UTF-16 offsets) — for passing elements through verbatim. */
  readonly start: number;
  end: number;
}

/** Parses a document into a tree; throws `OgeXmlError` like the parser. */
export function parseOgeXmlTree(xml: string): OgeXmlNode {
  const stack: OgeXmlNode[] = [];
  let root: OgeXmlNode | undefined;
  parseOgeXml(xml, {
    open(qname, attributes, _selfClosing, start) {
      const node: OgeXmlNode = {
        name: ogeXmlLocalName(qname),
        qname,
        attributes,
        children: [],
        text: '',
        start,
        end: start,
      };
      const parent = stack[stack.length - 1];
      if (parent) parent.children.push(node);
      else root = node;
      stack.push(node);
    },
    close(_name, end) {
      const node = stack.pop();
      if (node) node.end = end;
    },
    text(text) {
      const node = stack[stack.length - 1];
      if (node) node.text += text;
    },
  });
  return root as OgeXmlNode;
}

/** The first child with a local name. */
export function ogeXmlChild(
  node: OgeXmlNode | undefined,
  name: string,
): OgeXmlNode | undefined {
  return node?.children.find((child) => child.name === name);
}

/** Every child with a local name. */
export function ogeXmlChildren(
  node: OgeXmlNode | undefined,
  name: string,
): OgeXmlNode[] {
  return node ? node.children.filter((child) => child.name === name) : [];
}

/**
 * An attribute by its local name: `id` finds `r:id` as well as `id`. With
 * `prefixed`, only a prefixed attribute matches (the relationship id beside
 * a plain `id`).
 */
export function ogeXmlAttribute(
  attributes: Readonly<Record<string, string>>,
  name: string,
  prefixed = false,
): string | undefined {
  if (!prefixed && attributes[name] !== undefined) return attributes[name];
  for (const key in attributes) {
    const colon = key.indexOf(':');
    if (colon > 0 && key.slice(colon + 1) === name) return attributes[key];
  }
  return undefined;
}

/** An `xsd:boolean` attribute: `1`/`true` or `0`/`false`; `fallback` otherwise. */
export function ogeXmlBool(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  return fallback;
}

/** A finite number attribute, or `undefined`. */
export function ogeXmlNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** A non-negative integer attribute, or `undefined`. */
export function ogeXmlIndex(value: string | undefined): number | undefined {
  const n = ogeXmlNumber(value);
  return n !== undefined && Number.isInteger(n) && n >= 0 ? n : undefined;
}
