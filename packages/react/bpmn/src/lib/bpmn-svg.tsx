'use client';

import { createElement, type ReactNode } from 'react';
import {
  BPMN_SVG_ALLOWED_ATTRIBUTES,
  type OgeBpmnSvgNode,
} from '@oge-ui/bpmn-engine';

/** DOM attribute names → React props, for an already sanitized record. */
function svgProps(
  attrs: Readonly<Record<string, string | number>> | undefined,
): Record<string, string | number> {
  const props: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(attrs ?? {})) {
    const prop = BPMN_SVG_ALLOWED_ATTRIBUTES[name];
    if (prop !== undefined) props[prop] = value;
  }
  return props;
}

/**
 * Draws a safe SVG tree (`OgeBpmnSvgNode[]` from the `bpmnSvg` builders,
 * sanitized by the engine) element by element with `createElement` — the
 * React twin of the Angular `[ogeBpmnSvgNodes]` component. Text is a text
 * node; there is no markup path.
 */
export function BpmnSvgNodes({
  nodes,
}: {
  nodes: readonly OgeBpmnSvgNode[];
}): ReactNode {
  return nodes.map((node, index) =>
    createElement(
      node.tag,
      { key: index, ...svgProps(node.attrs) },
      node.tag === 'g' ? (
        <BpmnSvgNodes nodes={node.children ?? []} />
      ) : node.tag === 'text' ? (
        node.text
      ) : undefined,
    ),
  );
}
