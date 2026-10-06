/**
 * Sankey layout (after Kelly Dunn / d3-sankey's approach): nodes get a
 * column from their longest path from a source, heights proportional to
 * their throughput, then a few rounds of relaxation pull every node
 * towards the weighted centre of its neighbours while a collision pass
 * keeps the column's padding. Links leave and enter their nodes sorted by
 * the other end's position so bands do not cross needlessly. Cycles are
 * broken by dropping back-edges from the column assignment. Pure.
 */

export type OgeSankeyNodeAlign = 'justify' | 'left' | 'right' | 'center';

export interface SankeyLinkInput {
  readonly source: string;
  readonly target: string;
  readonly value: number;
}

export interface SankeyLayoutInput {
  /** Node ids in their preferred order (unlisted link ends are appended). */
  readonly nodes: readonly string[];
  readonly links: readonly SankeyLinkInput[];
  readonly width: number;
  readonly height: number;
  readonly nodeWidth: number;
  readonly nodePadding: number;
  readonly nodeAlign: OgeSankeyNodeAlign;
  readonly iterations?: number;
  /** Mirror the flow (sources on the right). */
  readonly rtl?: boolean;
  /** Origin of the layout box (added to every output coordinate). */
  readonly x?: number;
  readonly y?: number;
}

export interface SankeyNodeLayout {
  readonly id: string;
  readonly index: number;
  readonly column: number;
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly value: number;
  readonly inflow: number;
  readonly outflow: number;
}

export interface SankeyLinkLayout {
  /** Index into the input links. */
  readonly index: number;
  readonly source: number;
  readonly target: number;
  readonly value: number;
  /** Band thickness, px. */
  readonly width: number;
  /** Band centre y at the source / target end. */
  readonly y0: number;
  readonly y1: number;
  readonly path: string;
}

export interface SankeyLayout {
  readonly nodes: readonly SankeyNodeLayout[];
  readonly links: readonly SankeyLinkLayout[];
  readonly columns: number;
}

interface WorkNode {
  id: string;
  index: number;
  column: number;
  height: number;
  value: number;
  inflow: number;
  outflow: number;
  y0: number;
  y1: number;
  sourceLinks: WorkLink[];
  targetLinks: WorkLink[];
}

interface WorkLink {
  index: number;
  source: WorkNode;
  target: WorkNode;
  value: number;
  width: number;
  y0: number;
  y1: number;
}

const round = (value: number): number => Math.round(value * 100) / 100;

/** The filled band of a link from (x0, y0) to (x1, y1), `w` thick. */
export function sankeyLinkPath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
): string {
  const xm = (x0 + x1) / 2;
  const h = w / 2;
  return [
    `M ${round(x0)} ${round(y0 - h)}`,
    `C ${round(xm)} ${round(y0 - h)} ${round(xm)} ${round(y1 - h)} ${round(x1)} ${round(y1 - h)}`,
    `L ${round(x1)} ${round(y1 + h)}`,
    `C ${round(xm)} ${round(y1 + h)} ${round(xm)} ${round(y0 + h)} ${round(x0)} ${round(y0 + h)}`,
    'Z',
  ].join(' ');
}

export function layoutSankey(input: SankeyLayoutInput): SankeyLayout {
  const byId = new Map<string, WorkNode>();
  const nodes: WorkNode[] = [];
  const node = (id: string): WorkNode => {
    let found = byId.get(id);
    if (found === undefined) {
      found = {
        id,
        index: nodes.length,
        column: 0,
        height: 0,
        value: 0,
        inflow: 0,
        outflow: 0,
        y0: 0,
        y1: 0,
        sourceLinks: [],
        targetLinks: [],
      };
      byId.set(id, found);
      nodes.push(found);
    }
    return found;
  };
  input.nodes.forEach(node);
  const links: WorkLink[] = [];
  input.links.forEach((link, index) => {
    if (!(link.value > 0) || link.source === link.target) return;
    const source = node(link.source);
    const target = node(link.target);
    const work: WorkLink = {
      index,
      source,
      target,
      value: link.value,
      width: 0,
      y0: 0,
      y1: 0,
    };
    links.push(work);
    source.sourceLinks.push(work);
    target.targetLinks.push(work);
  });
  for (const n of nodes) {
    n.inflow = n.targetLinks.reduce((sum, l) => sum + l.value, 0);
    n.outflow = n.sourceLinks.reduce((sum, l) => sum + l.value, 0);
    n.value = Math.max(n.inflow, n.outflow);
  }

  // cycles: a forward depth-first walk (in node order) marks every link that
  // closes a loop as a back-edge; columns then ignore those links
  const back = new Set<WorkLink>();
  const state = new Map<WorkNode, 1 | 2>();
  const visit = (n: WorkNode): void => {
    state.set(n, 1);
    for (const l of n.sourceLinks) {
      const seen = state.get(l.target);
      if (seen === 1) back.add(l);
      else if (seen === undefined) visit(l.target);
    }
    state.set(n, 2);
  };
  for (const n of nodes)
    if (n.targetLinks.length === 0 && !state.has(n)) visit(n);
  for (const n of nodes) if (!state.has(n)) visit(n);
  // columns: the longest path from a source
  const depth = new Map<WorkNode, number>();
  const depthOf = (n: WorkNode): number => {
    const known = depth.get(n);
    if (known !== undefined) return known;
    depth.set(n, 0);
    let d = 0;
    for (const l of n.targetLinks) {
      if (back.has(l)) continue;
      d = Math.max(d, depthOf(l.source) + 1);
    }
    depth.set(n, d);
    return d;
  };
  nodes.forEach(depthOf);
  const heightOf = new Map<WorkNode, number>();
  const heightVisiting = new Set<WorkNode>();
  const reach = (n: WorkNode): number => {
    const known = heightOf.get(n);
    if (known !== undefined) return known;
    heightVisiting.add(n);
    let h = 0;
    for (const l of n.sourceLinks) {
      if (back.has(l) || heightVisiting.has(l.target)) continue;
      h = Math.max(h, reach(l.target) + 1);
    }
    heightVisiting.delete(n);
    heightOf.set(n, h);
    return h;
  };
  nodes.forEach(reach);
  const maxDepth = Math.max(0, ...nodes.map((n) => depth.get(n) ?? 0));
  for (const n of nodes) {
    const d = depth.get(n) ?? 0;
    const h = heightOf.get(n) ?? 0;
    switch (input.nodeAlign) {
      case 'left':
        n.column = d;
        break;
      case 'right':
        n.column = maxDepth - h;
        break;
      case 'center':
        n.column =
          n.targetLinks.length > 0
            ? d
            : n.sourceLinks.length > 0
              ? Math.max(
                  0,
                  Math.min(
                    ...n.sourceLinks.map((l) => depth.get(l.target) ?? 1),
                  ) - 1,
                )
              : 0;
        break;
      default:
        // justify: sinks go to the last column
        n.column = n.sourceLinks.length === 0 ? maxDepth : d;
    }
  }
  const columnCount = maxDepth + 1;
  const columns: WorkNode[][] = Array.from({ length: columnCount }, () => []);
  for (const n of nodes) columns[n.column].push(n);

  // vertical scale: the tightest column decides
  const height = Math.max(1, input.height);
  const padding = Math.max(0, input.nodePadding);
  let ky = Infinity;
  for (const column of columns) {
    if (column.length === 0) continue;
    const total = column.reduce((sum, n) => sum + n.value, 0);
    const room = height - (column.length - 1) * padding;
    if (total > 0) ky = Math.min(ky, Math.max(0, room) / total);
  }
  if (!Number.isFinite(ky)) ky = 0;
  for (const column of columns) {
    let y = 0;
    for (const n of column) {
      n.height = n.value * ky;
      n.y0 = y;
      n.y1 = y + n.height;
      y = n.y1 + padding;
    }
  }
  for (const l of links) l.width = l.value * ky;

  const center = (n: WorkNode): number => (n.y0 + n.y1) / 2;
  const resolveCollisions = (column: WorkNode[]): void => {
    column.sort((a, b) => a.y0 - b.y0);
    let y = 0;
    for (const n of column) {
      const dy = y - n.y0;
      if (dy > 0) {
        n.y0 += dy;
        n.y1 += dy;
      }
      y = n.y1 + padding;
    }
    // push back up from the bottom
    let bottom = height;
    for (let i = column.length - 1; i >= 0; i--) {
      const n = column[i];
      const dy = n.y1 - bottom;
      if (dy > 0) {
        n.y0 -= dy;
        n.y1 -= dy;
      }
      bottom = n.y0 - padding;
    }
  };
  const iterations = input.iterations ?? 6;
  let alpha = 1;
  for (let k = 0; k < iterations; k++) {
    alpha *= 0.99;
    // right sweep: follow the sources
    for (let c = 1; c < columnCount; c++) {
      for (const n of columns[c]) {
        const incoming = n.targetLinks.filter((l) => !back.has(l));
        const total = incoming.reduce((sum, l) => sum + l.value, 0);
        if (total <= 0) continue;
        const target =
          incoming.reduce((sum, l) => sum + center(l.source) * l.value, 0) /
          total;
        const dy = (target - center(n)) * alpha;
        n.y0 += dy;
        n.y1 += dy;
      }
      resolveCollisions(columns[c]);
    }
    // left sweep: follow the targets
    for (let c = columnCount - 2; c >= 0; c--) {
      for (const n of columns[c]) {
        const outgoing = n.sourceLinks.filter((l) => !back.has(l));
        const total = outgoing.reduce((sum, l) => sum + l.value, 0);
        if (total <= 0) continue;
        const target =
          outgoing.reduce((sum, l) => sum + center(l.target) * l.value, 0) /
          total;
        const dy = (target - center(n)) * alpha;
        n.y0 += dy;
        n.y1 += dy;
      }
      resolveCollisions(columns[c]);
    }
  }
  for (const column of columns) resolveCollisions(column);

  // link attachment: sorted by the other end so bands fan out cleanly
  for (const n of nodes) {
    n.sourceLinks.sort(
      (a, b) => a.target.y0 - b.target.y0 || a.index - b.index,
    );
    n.targetLinks.sort(
      (a, b) => a.source.y0 - b.source.y0 || a.index - b.index,
    );
    let y = n.y0;
    for (const l of n.sourceLinks) {
      l.y0 = y + l.width / 2;
      y += l.width;
    }
    y = n.y0;
    for (const l of n.targetLinks) {
      l.y1 = y + l.width / 2;
      y += l.width;
    }
  }

  const ox = input.x ?? 0;
  const oy = input.y ?? 0;
  const nodeW = Math.max(1, input.nodeWidth);
  const step = columnCount > 1 ? (input.width - nodeW) / (columnCount - 1) : 0;
  const xOf = (column: number): number => {
    const x = columnCount > 1 ? column * step : (input.width - nodeW) / 2;
    return ox + (input.rtl === true ? input.width - nodeW - x : x);
  };
  const nodeOut: SankeyNodeLayout[] = nodes.map((n) => ({
    id: n.id,
    index: n.index,
    column: n.column,
    x0: round(xOf(n.column)),
    x1: round(xOf(n.column) + nodeW),
    y0: round(oy + n.y0),
    y1: round(oy + n.y1),
    value: n.value,
    inflow: n.inflow,
    outflow: n.outflow,
  }));
  const linkOut: SankeyLinkLayout[] = links.map((l) => {
    const rtl = input.rtl === true;
    const sx = rtl ? xOf(l.source.column) : xOf(l.source.column) + nodeW;
    const tx = rtl ? xOf(l.target.column) + nodeW : xOf(l.target.column);
    return {
      index: l.index,
      source: l.source.index,
      target: l.target.index,
      value: l.value,
      width: round(l.width),
      y0: round(oy + l.y0),
      y1: round(oy + l.y1),
      path: sankeyLinkPath(sx, oy + l.y0, tx, oy + l.y1, Math.max(1, l.width)),
    };
  });
  return { nodes: nodeOut, links: linkOut, columns: columnCount };
}
