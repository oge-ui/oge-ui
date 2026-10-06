import { createElement, type CSSProperties, type ReactNode } from 'react';
import {
  ogeEditorRenderGroups,
  type OgeEditorDoc,
  type OgeEditorRenderNode,
  type OgeEditorUrlOptions,
} from '@oge-ui/behavior';

/** Render-tree attribute names that React spells differently. */
const PROP_NAMES: Record<string, string> = {
  contenteditable: 'contentEditable',
};

function camel(name: string): string {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toReact(node: OgeEditorRenderNode, key: number): ReactNode {
  if (node.type === 'text') return node.text;
  const props: Record<string, unknown> = { key };
  for (const [name, value] of Object.entries(node.attrs)) {
    props[PROP_NAMES[name] ?? name] = value;
  }
  const styles = Object.entries(node.styles);
  if (styles.length > 0) {
    const style: Record<string, string> = {};
    for (const [name, value] of styles) style[camel(name)] = value;
    props['style'] = style as CSSProperties;
  }
  // the live surface builder marks images undraggable (no internal drag-move)
  if (node.tag === 'img') props['draggable'] = 'false';
  const children = node.children.map(toReact);
  return createElement(node.tag, props, ...(children.length ? children : []));
}

/**
 * The editing surface's first render as React elements: the same render tree
 * `renderOgeEditorDom` builds into the live element, so the server markup is
 * the document (not an empty box) and the browser's hydration render — made
 * from the same model — reproduces it. Elements, attributes and CSSOM styles
 * only; there is no markup string and no `dangerouslySetInnerHTML`.
 */
export function ogeEditorSurfaceElements(
  doc: OgeEditorDoc,
  options: OgeEditorUrlOptions,
): ReactNode[] {
  return ogeEditorRenderGroups(doc, { ...options, editing: true }).map(
    (group, i) => toReact(group.node, i),
  );
}
