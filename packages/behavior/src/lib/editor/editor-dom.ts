/**
 * The live contenteditable DOM of the rich-text editor (W8e): building it
 * from the model's render tree, keeping unchanged blocks' elements across
 * renders, and translating between DOM selection points and model points.
 *
 * Everything is built with `createElement` / `createTextNode` and
 * `setAttribute` from the allow-listed render tree; styles (alignment,
 * colours) go through the CSSOM (`style.setProperty`), which a strict
 * `style-src` CSP permits — nothing is ever assigned through `innerHTML`.
 */
import {
  ogeEditorRenderGroups,
  type OgeEditorRenderElement,
  type OgeEditorRenderNode,
  type OgeEditorUrlOptions,
} from './editor-html';
import {
  blockLength,
  clampPoint,
  type OgeEditorBlock,
  type OgeEditorDoc,
  type OgeEditorPoint,
  type OgeEditorSelection,
} from './editor-model';

/** Attribute marking a block element of the live editor. */
export const OGE_EDITOR_BLOCK_ATTR = 'data-oge-block';
/** Attribute marking the `<br>` that only holds an empty line open. */
export const OGE_EDITOR_PLACEHOLDER_ATTR = 'data-oge-placeholder';

/** The model blocks a top-level element renders — its reuse key. */
const RENDERED = new WeakMap<Node, readonly OgeEditorBlock[]>();

function build(doc: Document, node: OgeEditorRenderNode): Node {
  if (node.type === 'text') return doc.createTextNode(node.text);
  const element = doc.createElement(node.tag);
  for (const [name, value] of Object.entries(node.attrs)) {
    element.setAttribute(name, value);
  }
  for (const [name, value] of Object.entries(node.styles)) {
    element.style.setProperty(name, value);
  }
  if (node.tag === 'img') element.setAttribute('draggable', 'false');
  for (const child of node.children) element.appendChild(build(doc, child));
  return element;
}

/** Builds one render element into a DOM element of `doc`. */
export function ogeEditorBuildElement(
  doc: Document,
  node: OgeEditorRenderElement,
): HTMLElement {
  return build(doc, node) as HTMLElement;
}

function sameBlocks(
  a: readonly OgeEditorBlock[] | undefined,
  b: readonly OgeEditorBlock[],
): boolean {
  if (!a || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Renders `doc` into `root`, keeping every top-level element whose blocks
 * are unchanged (the model is immutable, so "unchanged" is identity). Block
 * indices live in `data-oge-block` and are renumbered in place. Keeping the
 * untouched elements is what preserves spell-check underlines and an IME
 * session in the rest of the document.
 */
export function renderOgeEditorDom(
  root: HTMLElement,
  doc: OgeEditorDoc,
  options: OgeEditorUrlOptions = {},
): void {
  const owner = root.ownerDocument;
  const groups = ogeEditorRenderGroups(doc, { ...options, editing: true });
  // reusable elements, keyed by the first model block they render
  const byFirstBlock = new Map<OgeEditorBlock, Node>();
  for (const node of Array.from(root.childNodes)) {
    const blocks = RENDERED.get(node);
    if (blocks && blocks.length > 0) byFirstBlock.set(blocks[0], node);
  }
  const desired: Node[] = [];
  let index = 0;
  for (const group of groups) {
    const candidate = byFirstBlock.get(group.blocks[0]);
    let element: Node;
    if (candidate && sameBlocks(RENDERED.get(candidate), group.blocks)) {
      byFirstBlock.delete(group.blocks[0]);
      element = candidate;
      renumber(element as HTMLElement, index);
    } else {
      element = build(owner, group.node);
      RENDERED.set(element, group.blocks);
    }
    desired.push(element);
    index += group.blocks.length;
  }
  desired.forEach((node, i) => {
    const at = root.childNodes[i];
    if (at !== node) root.insertBefore(node, at ?? null);
  });
  // everything after the rendered groups: stale elements and anything the
  // browser added at the top level that the model does not know about
  while (root.childNodes.length > desired.length) {
    root.removeChild(root.childNodes[desired.length]);
  }
}

function renumber(element: HTMLElement, start: number): void {
  const blocks = blockElements(element, true);
  blocks.forEach((block, i) => {
    const value = String(start + i);
    if (block.getAttribute(OGE_EDITOR_BLOCK_ATTR) !== value) {
      block.setAttribute(OGE_EDITOR_BLOCK_ATTR, value);
    }
  });
}

/** Every block element under `root`, in document order. */
export function blockElements(
  root: Element,
  includeSelf = false,
): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (includeSelf && root.hasAttribute(OGE_EDITOR_BLOCK_ATTR)) {
    out.push(root as HTMLElement);
  }
  root
    .querySelectorAll<HTMLElement>(`[${OGE_EDITOR_BLOCK_ATTR}]`)
    .forEach((element) => out.push(element));
  return out;
}

function isPlaceholder(node: Node): boolean {
  return (
    node.nodeType === 1 &&
    (node as Element).hasAttribute(OGE_EDITOR_PLACEHOLDER_ATTR)
  );
}

/** Width of a DOM node in model positions (text = length, `br`/`img` = 1). */
function nodeWidth(node: Node): number {
  if (node.nodeType === 3) return (node.nodeValue ?? '').length;
  if (node.nodeType !== 1) return 0;
  if (isPlaceholder(node)) return 0;
  const tag = (node as Element).localName;
  if (tag === 'br' || tag === 'img') return 1;
  if ((node as Element).hasAttribute(OGE_EDITOR_BLOCK_ATTR)) return 0;
  let width = 0;
  for (let child = node.firstChild; child; child = child.nextSibling) {
    width += nodeWidth(child);
  }
  return width;
}

/** The block element containing `node` (or `node` itself), within `root`. */
function owningBlock(root: HTMLElement, node: Node): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (
      current.nodeType === 1 &&
      (current as Element).hasAttribute(OGE_EDITOR_BLOCK_ATTR)
    ) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  return null;
}

function blockIndexOf(element: HTMLElement): number {
  return (
    Number.parseInt(element.getAttribute(OGE_EDITOR_BLOCK_ATTR) ?? '0', 10) || 0
  );
}

/** Positions from the start of `block` to the DOM point (`node`, `offset`). */
function offsetWithin(block: HTMLElement, node: Node, offset: number): number {
  const countChildren = (parent: Node, limit: number): number => {
    let total = 0;
    let i = 0;
    for (
      let child = parent.firstChild;
      child && i < limit;
      child = child.nextSibling, i++
    ) {
      total += nodeWidth(child);
    }
    return total;
  };
  if (node === block) return countChildren(block, offset);
  let total = 0;
  const visit = (current: Node): boolean => {
    for (let child = current.firstChild; child; child = child.nextSibling) {
      if (child === node) {
        total +=
          child.nodeType === 3
            ? Math.min(offset, (child.nodeValue ?? '').length)
            : countChildren(child, offset);
        return true;
      }
      if (child.nodeType === 1 && child.contains(node)) {
        if ((child as Element).hasAttribute(OGE_EDITOR_BLOCK_ATTR))
          return false;
        return visit(child);
      }
      total += nodeWidth(child);
    }
    return false;
  };
  visit(block);
  return total;
}

/**
 * Maps a DOM point inside the editor to a model point, or `null` when the
 * point is outside it. A point on the root itself (between blocks) snaps to
 * the nearest block edge.
 */
export function ogeEditorPointFromDom(
  root: HTMLElement,
  doc: OgeEditorDoc,
  node: Node | null,
  offset: number,
): OgeEditorPoint | null {
  if (!node || (node !== root && !root.contains(node))) return null;
  const block = owningBlock(root, node);
  if (!block) {
    // the root, or a wrapper (ul, blockquote) between blocks
    const container = node as Element;
    const children = Array.from(container.childNodes);
    const after = children[offset];
    const before = children[offset - 1];
    const pick = (
      candidate: Node | undefined,
      last: boolean,
    ): OgeEditorPoint | null => {
      if (!candidate || candidate.nodeType !== 1) return null;
      const blocks = blockElements(candidate as Element, true);
      const target = last ? blocks[blocks.length - 1] : blocks[0];
      if (!target) return null;
      const index = blockIndexOf(target);
      const model = doc.blocks[index];
      if (!model) return null;
      return { block: index, offset: last ? blockLength(model) : 0 };
    };
    return (
      pick(after, false) ??
      pick(before, true) ??
      clampPoint(doc, {
        block: doc.blocks.length - 1,
        offset: Number.MAX_SAFE_INTEGER,
      })
    );
  }
  const index = blockIndexOf(block);
  if (!doc.blocks[index]) return null;
  return clampPoint(doc, {
    block: index,
    offset: offsetWithin(block, node, offset),
  });
}

/** A DOM point for a model point. Prefers text-node positions. */
export function ogeEditorPointToDom(
  root: HTMLElement,
  point: OgeEditorPoint,
): { node: Node; offset: number } | null {
  const block = root.querySelector<HTMLElement>(
    `[${OGE_EDITOR_BLOCK_ATTR}="${point.block}"]`,
  );
  if (!block) return null;
  if (block.localName === 'hr') {
    const parent = block.parentNode;
    if (!parent) return null;
    return {
      node: parent,
      offset: Array.prototype.indexOf.call(parent.childNodes, block),
    };
  }
  let remaining = point.offset;
  let result: { node: Node; offset: number } | null = null;
  const walk = (current: Node): boolean => {
    for (let child = current.firstChild; child; child = child.nextSibling) {
      if (
        child.nodeType === 1 &&
        (child as Element).hasAttribute(OGE_EDITOR_BLOCK_ATTR)
      ) {
        continue; // sublist
      }
      if (child.nodeType === 3) {
        const length = (child.nodeValue ?? '').length;
        if (remaining <= length) {
          result = { node: child, offset: remaining };
          return true;
        }
        remaining -= length;
        continue;
      }
      if (child.nodeType !== 1 || isPlaceholder(child)) continue;
      const tag = (child as Element).localName;
      if (tag === 'br' || tag === 'img') {
        if (remaining === 0) {
          result = { node: current, offset: indexIn(current, child) };
          return true;
        }
        remaining -= 1;
        if (remaining === 0) {
          // right after the atom: before its next sibling
          result = { node: current, offset: indexIn(current, child) + 1 };
          const next = child.nextSibling;
          if (next && next.nodeType === 3) result = { node: next, offset: 0 };
          return true;
        }
        continue;
      }
      if (walk(child)) return true;
    }
    return false;
  };
  if (walk(block)) return result;
  // at the end (or an empty block): after the last content node
  const children = Array.from(block.childNodes).filter(
    (child) =>
      !(
        child.nodeType === 1 &&
        (child as Element).hasAttribute(OGE_EDITOR_BLOCK_ATTR)
      ),
  );
  const placeholderIndex = children.findIndex(isPlaceholder);
  if (block.localName === 'pre') {
    const code = block.firstElementChild ?? block;
    const codeChildren = Array.from(code.childNodes);
    const ph = codeChildren.findIndex(isPlaceholder);
    return { node: code, offset: ph === -1 ? codeChildren.length : ph };
  }
  const offset =
    placeholderIndex === -1
      ? indexIn(block, children[children.length - 1] ?? null) + 1
      : indexIn(block, children[placeholderIndex]);
  return { node: block, offset: Math.max(0, offset) };
}

function indexIn(parent: Node, child: Node | null): number {
  if (!child) return -1;
  return Array.prototype.indexOf.call(parent.childNodes, child);
}

/** Reads the DOM selection inside `root` into a model selection. */
export function ogeEditorReadSelection(
  root: HTMLElement,
  doc: OgeEditorDoc,
  selection: Selection | null,
): OgeEditorSelection | null {
  if (!selection || selection.rangeCount === 0) return null;
  const anchor = ogeEditorPointFromDom(
    root,
    doc,
    selection.anchorNode,
    selection.anchorOffset,
  );
  const focus = ogeEditorPointFromDom(
    root,
    doc,
    selection.focusNode,
    selection.focusOffset,
  );
  if (!anchor || !focus) return null;
  return { anchor, focus };
}

/** Applies a model selection to the DOM selection. Returns `false` when it could not. */
export function ogeEditorWriteSelection(
  root: HTMLElement,
  selection: OgeEditorSelection,
  domSelection: Selection | null,
): boolean {
  if (!domSelection) return false;
  const anchor = ogeEditorPointToDom(root, selection.anchor);
  const focus = ogeEditorPointToDom(root, selection.focus);
  if (!anchor || !focus) return false;
  if (
    domSelection.anchorNode === anchor.node &&
    domSelection.anchorOffset === anchor.offset &&
    domSelection.focusNode === focus.node &&
    domSelection.focusOffset === focus.offset
  ) {
    return true;
  }
  try {
    if (typeof domSelection.setBaseAndExtent === 'function') {
      domSelection.setBaseAndExtent(
        anchor.node,
        anchor.offset,
        focus.node,
        focus.offset,
      );
    } else {
      const range = root.ownerDocument.createRange();
      range.setStart(anchor.node, anchor.offset);
      range.setEnd(focus.node, focus.offset);
      domSelection.removeAllRanges();
      domSelection.addRange(range);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * The block element of the live editor for a model block index, for
 * callers that need its bounding box (scrolling the caret into view).
 */
export function ogeEditorBlockElement(
  root: HTMLElement,
  index: number,
): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    `[${OGE_EDITOR_BLOCK_ATTR}="${index}"]`,
  );
}
