/**
 * A plain-data XML element tree — the editable form of `<bpmn:extensionElements>`
 * content (Camunda 7 `camunda:*`, Camunda 8 `zeebe:*`, any vendor). The reader
 * turns the DOM subtree into this tree, the writer serializes it back
 * deterministically, and the properties panel edits it through immutable
 * helpers, so extension elements are editable without the engine taking an
 * XML library (dependency-free by design).
 */

/** One element of an extension tree, by qualified name (`zeebe:taskDefinition`). */
export interface BpmnXmlElement {
  /**
   * Qualified element name. Two pseudo names carry the non-element nodes of
   * mixed content: `#text` (a text run) and `#comment` (an XML comment), both
   * with their content in `text`.
   */
  readonly name: string;
  /** Attributes by qualified name, namespace declarations included. */
  readonly attributes?: Readonly<Record<string, string>>;
  /** Child elements (and `#text` / `#comment` runs when the content is mixed). */
  readonly children?: readonly BpmnXmlElement[];
  /** Text content of a leaf element, or of a `#text` / `#comment` node. */
  readonly text?: string;
}

/** Namespace URI of Camunda 8 (Zeebe) extension elements. */
export const BPMN_ZEEBE_NAMESPACE = 'http://camunda.org/schema/zeebe/1.0';
/** Namespace URI of Camunda 7 extension elements and attributes. */
export const BPMN_CAMUNDA_NAMESPACE = 'http://camunda.org/schema/1.0/bpmn';
/** Namespace URI of the BPMN 2.0 model. */
export const BPMN_MODEL_NAMESPACE =
  'http://www.omg.org/spec/BPMN/20100524/MODEL';

/** Writer-owned namespace URIs → the fixed prefix the writer declares for them. */
const WRITER_PREFIX_BY_URI: Readonly<Record<string, string>> = {
  [BPMN_MODEL_NAMESPACE]: 'bpmn',
  'http://www.omg.org/spec/BPMN/20100524/DI': 'bpmndi',
  'http://www.omg.org/spec/DD/20100524/DC': 'dc',
  'http://www.omg.org/spec/DD/20100524/DI': 'di',
  'http://www.w3.org/2001/XMLSchema-instance': 'xsi',
  'http://bpmn.io/schema/bpmn/biocolor/1.0': 'bioc',
};

/**
 * Reads a DOM element into a {@link BpmnXmlElement}. `declared` maps the
 * prefixes the output document declares on `<definitions>` to their URIs; a
 * prefix the element uses that is not declared there (or is bound to another
 * URI) gets an `xmlns:*` attribute on the element, so the fragment stays
 * self-contained when written back. Elements in a writer-owned namespace are
 * renamed to the writer's fixed prefix (`bpmn2:` → `bpmn:`).
 */
export function readBpmnXmlElement(
  element: Element,
  declared: ReadonlyMap<string, string>,
): BpmnXmlElement {
  return readElement(element, declared);
}

function qualified(prefix: string | null, local: string): string {
  return prefix === null || prefix === '' ? local : `${prefix}:${local}`;
}

function readElement(
  element: Element,
  scope: ReadonlyMap<string, string>,
): BpmnXmlElement {
  const inner = new Map(scope);
  const attributes: Record<string, string> = {};
  const declare = (
    prefix: string | null,
    uri: string | null,
  ): string | null => {
    if (prefix === null || prefix === '' || prefix === 'xml' || uri === null) {
      return prefix;
    }
    const writerPrefix = WRITER_PREFIX_BY_URI[uri];
    if (writerPrefix !== undefined) {
      return writerPrefix;
    }
    if (inner.get(prefix) !== uri) {
      attributes[`xmlns:${prefix}`] = uri;
      inner.set(prefix, uri);
    }
    return prefix;
  };
  for (const attr of Array.from(element.attributes)) {
    if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) {
      const prefix = attr.name === 'xmlns' ? '' : attr.name.slice(6);
      if (WRITER_PREFIX_BY_URI[attr.value] !== undefined) {
        continue; // the writer declares its own namespaces
      }
      if (prefix !== '' && scope.get(prefix) === attr.value) {
        continue; // already declared on <definitions>
      }
      attributes[attr.name] = attr.value;
      if (prefix !== '') inner.set(prefix, attr.value);
    }
  }
  const prefix = declare(element.prefix, element.namespaceURI);
  for (const attr of Array.from(element.attributes)) {
    if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) {
      continue;
    }
    const attrPrefix = declare(attr.prefix, attr.namespaceURI);
    attributes[qualified(attrPrefix, attr.localName)] = attr.value;
  }
  const name = qualified(prefix, element.localName);
  const children: BpmnXmlElement[] = [];
  let text = '';
  let hasElements = false;
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === 1) {
      hasElements = true;
      children.push(readElement(node as Element, inner));
    } else if (node.nodeType === 3 || node.nodeType === 4) {
      text += node.nodeValue ?? '';
      children.push({ name: '#text', text: node.nodeValue ?? '' });
    } else if (node.nodeType === 8) {
      hasElements = true;
      children.push({ name: '#comment', text: node.nodeValue ?? '' });
    }
  }
  const attrs = Object.keys(attributes).length > 0 ? { attributes } : {};
  if (!hasElements) {
    return text === '' ? { name, ...attrs } : { name, ...attrs, text };
  }
  // Mixed content: whitespace-only runs between elements are formatting.
  const kept = children.filter(
    (child) => child.name !== '#text' || (child.text ?? '').trim() !== '',
  );
  return { name, ...attrs, children: kept };
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** A QName the writer may emit (`zeebe:taskDefinition`, `type`, `xmlns:x`). */
const QNAME = /^[A-Za-z_][\w.-]*(:[A-Za-z_][\w.-]*)?$/;

function formatAttributes(attributes: BpmnXmlElement['attributes']): string {
  if (attributes === undefined) return '';
  // names from an untrusted JSON envelope never break out of the tag
  const names = Object.keys(attributes).filter(
    (n) => QNAME.test(n) && typeof attributes[n] === 'string',
  );
  // namespace declarations first, then the rest alphabetically
  const decls = names.filter((n) => n === 'xmlns' || n.startsWith('xmlns:'));
  const rest = names.filter((n) => !decls.includes(n));
  decls.sort();
  rest.sort();
  return [...decls, ...rest]
    .map((n) => ` ${n}="${escapeAttr(attributes[n])}"`)
    .join('');
}

/**
 * Serializes an element tree as indented lines (2 spaces per level), with
 * attributes in a fixed order (declarations, then alphabetical) — two writes
 * of the same tree are byte-identical.
 */
export function writeBpmnXmlElement(
  element: BpmnXmlElement,
  indent: string,
  lines: string[],
): void {
  if (element.name === '#text') {
    lines.push(`${indent}${escapeText(element.text ?? '')}`);
    return;
  }
  if (element.name === '#comment') {
    lines.push(`${indent}<!--${(element.text ?? '').replace(/--/g, '- -')}-->`);
    return;
  }
  if (!QNAME.test(element.name)) {
    return; // not an element name — dropped rather than written raw
  }
  const open = `${indent}<${element.name}${formatAttributes(element.attributes)}`;
  const children = element.children ?? [];
  if (children.length === 0) {
    if (element.text === undefined || element.text === '') {
      lines.push(`${open} />`);
    } else {
      lines.push(`${open}>${escapeText(element.text)}</${element.name}>`);
    }
    return;
  }
  lines.push(`${open}>`);
  for (const child of children) {
    writeBpmnXmlElement(child, `${indent}  `, lines);
  }
  lines.push(`${indent}</${element.name}>`);
}

// ------------------------------------------------------------ tree helpers

/** The first child element with the given qualified name. */
export function bpmnXmlChild(
  element: BpmnXmlElement | undefined,
  name: string,
): BpmnXmlElement | undefined {
  return element?.children?.find((child) => child.name === name);
}

/** Every child element with the given qualified name. */
export function bpmnXmlChildren(
  element: BpmnXmlElement | undefined,
  name: string,
): readonly BpmnXmlElement[] {
  return element?.children?.filter((child) => child.name === name) ?? [];
}

/** The first element of a list with the given qualified name. */
export function bpmnXmlFind(
  elements: readonly BpmnXmlElement[] | undefined,
  name: string,
): BpmnXmlElement | undefined {
  return elements?.find((element) => element.name === name);
}

/**
 * Returns the list with the first element named `name` replaced by
 * `next` (appended when absent; removed when `next` is null). Never mutates.
 */
export function bpmnXmlReplace(
  elements: readonly BpmnXmlElement[] | undefined,
  name: string,
  next: BpmnXmlElement | null,
): readonly BpmnXmlElement[] {
  const list = elements ?? [];
  const index = list.findIndex((element) => element.name === name);
  if (index === -1) {
    return next === null ? list : [...list, next];
  }
  return next === null
    ? [...list.slice(0, index), ...list.slice(index + 1)]
    : [...list.slice(0, index), next, ...list.slice(index + 1)];
}

/** Returns the element with one attribute set (or removed for `undefined`). */
export function bpmnXmlWithAttribute(
  element: BpmnXmlElement,
  name: string,
  value: string | undefined,
): BpmnXmlElement {
  const { [name]: _previous, ...rest } = element.attributes ?? {};
  const attributes = value === undefined ? rest : { ...rest, [name]: value };
  const { attributes: _old, ...base } = element;
  return Object.keys(attributes).length > 0 ? { ...base, attributes } : base;
}
