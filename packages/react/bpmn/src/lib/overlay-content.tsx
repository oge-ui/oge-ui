'use client';

import { createElement, useMemo, type ReactNode } from 'react';
import { sanitizeResourceUrl, sanitizeUrl } from '@oge-ui/behavior';
import {
  sanitizeBpmnOverlayHtml,
  type BpmnOverlayNode,
} from '@oge-ui/bpmn-engine';

/** HTML attribute → React prop name for the allow-listed attributes. */
const PROP_NAMES: Readonly<Record<string, string>> = {
  class: 'className',
  datetime: 'dateTime',
};

function toReact(nodes: readonly BpmnOverlayNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.kind === 'text') {
      return node.text;
    }
    const props: Record<string, unknown> = { key: index };
    for (const [name, value] of Object.entries(node.attributes)) {
      if (name === 'href') {
        props['href'] = sanitizeUrl(value);
      } else if (name === 'src') {
        props['src'] = sanitizeResourceUrl(value);
      } else {
        props[PROP_NAMES[name] ?? name] = value;
      }
    }
    return createElement(
      node.tag,
      props,
      ...(node.children.length > 0 ? toReact(node.children) : []),
    );
  });
}

/**
 * Renders an overlay badge's `html` without `dangerouslySetInnerHTML`: the
 * engine parses it into an inert, allow-listed node tree (the policy
 * Angular's sanitizing `[innerHTML]` applies) and this builds real React
 * elements from it — text stays text, `href` goes through `sanitizeUrl` and
 * `src` through `sanitizeResourceUrl`.
 */
export function BpmnOverlayContent({ html }: { html: string }): ReactNode {
  const nodes = useMemo(() => sanitizeBpmnOverlayHtml(html), [html]);
  return <>{toReact(nodes)}</>;
}
