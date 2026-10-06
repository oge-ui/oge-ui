/**
 * The Sankey view model — what `<oge-sankey-chart>` / `<OgeSankeyChart>`
 * draw: node bars, link bands coloured by their source (or target), node
 * labels, the hover highlight (a node lights up its links, a link its two
 * nodes), tooltips, the keyboard's column map and the screen-reader table
 * of flows. Framework-free and pure.
 */
import {
  createFieldAccessor,
  ogeFormatMessage,
  ogeNumberFormat,
} from '@oge-ui/core';
import { OGE_CHART_PALETTE } from './charts-types';
import { formatOgeChartMessage, type OgeChartsMessages } from './charts-config';
import { layoutSankey, type OgeSankeyNodeAlign } from './sankey-layout';

type FieldExpr<T> = string | ((item: T) => unknown);

const accessorOf = <T>(expr: FieldExpr<T>): ((item: T) => unknown) =>
  typeof expr === 'string' ? createFieldAccessor<T>(expr) : expr;

/** Optional per-node settings (`nodes`). */
export interface OgeSankeyNode {
  readonly id: string;
  /** Display name; default the id. */
  readonly label?: string;
  readonly color?: string;
}

export type OgeSankeyLinkColor = 'source' | 'target' | 'neutral';

/** The payload of a node click / activation. */
export interface OgeChartSankeyNodeEvent {
  readonly id: string;
  readonly label: string;
  readonly inflow: number;
  readonly outflow: number;
}

/** The payload of a link click. */
export interface OgeChartSankeyLinkEvent<T = unknown> {
  readonly source: string;
  readonly target: string;
  readonly value: number;
  readonly item: T;
}

export interface OgeSankeySceneInput<T> {
  readonly dataSource: readonly T[];
  readonly sourceField: FieldExpr<T>;
  readonly targetField: FieldExpr<T>;
  readonly valueField: FieldExpr<T>;
  readonly nodes?: readonly OgeSankeyNode[];
  readonly nodeWidth: number;
  readonly nodePadding: number;
  readonly nodeAlign: OgeSankeyNodeAlign;
  readonly linkColor: OgeSankeyLinkColor;
  readonly showLabels: boolean;
  readonly palette?: readonly string[];
  readonly rtl?: boolean;
  readonly valueFormat?: (value: number) => string;
  readonly title?: string;
  readonly width: number;
  readonly height: number;
  readonly locale?: string;
  readonly messages: OgeChartsMessages;
}

export interface OgeSankeyNodeVm {
  readonly index: number;
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
  readonly column: number;
  readonly valueText: string;
  readonly labelVm: {
    readonly x: number;
    readonly y: number;
    readonly text: string;
    readonly anchor: 'start' | 'end';
  } | null;
  readonly payload: OgeChartSankeyNodeEvent;
}

export interface OgeSankeyLinkVm<T> {
  readonly index: number;
  readonly key: string;
  readonly path: string;
  readonly color: string;
  readonly source: number;
  readonly target: number;
  readonly valueText: string;
  readonly payload: OgeChartSankeyLinkEvent<T>;
}

export interface OgeSankeyScene<T> {
  readonly nodes: readonly OgeSankeyNodeVm[];
  readonly links: readonly OgeSankeyLinkVm<T>[];
  /** Node indexes per column, top to bottom (the keyboard's map). */
  readonly columns: readonly (readonly number[])[];
  readonly ariaLabel: string;
}

const round = (value: number): number => Math.round(value * 100) / 100;

export function buildSankeyScene<T>(
  input: OgeSankeySceneInput<T>,
): OgeSankeyScene<T> {
  const sourceOf = accessorOf(input.sourceField);
  const targetOf = accessorOf(input.targetField);
  const valueOf = accessorOf(input.valueField);
  const palette = input.palette ?? OGE_CHART_PALETTE;
  const format =
    input.valueFormat ??
    ((v: number) =>
      ogeNumberFormat(input.locale, { maximumFractionDigits: 2 }).format(v));
  const settings = new Map((input.nodes ?? []).map((n) => [n.id, n]));
  const raw = input.dataSource.map((item) => {
    const value = valueOf(item);
    return {
      item,
      source: String(sourceOf(item) ?? ''),
      target: String(targetOf(item) ?? ''),
      value: typeof value === 'number' && Number.isFinite(value) ? value : 0,
    };
  });
  const pad = 4;
  const layout = layoutSankey({
    nodes: (input.nodes ?? []).map((n) => n.id),
    links: raw,
    x: pad,
    y: pad,
    width: Math.max(10, input.width - pad * 2),
    height: Math.max(10, input.height - pad * 2),
    nodeWidth: input.nodeWidth,
    nodePadding: input.nodePadding,
    nodeAlign: input.nodeAlign,
    rtl: input.rtl,
  });
  const rtl = input.rtl === true;
  const lastColumn = layout.columns - 1;
  const nodes: OgeSankeyNodeVm[] = layout.nodes
    .filter((n) => n.value > 0)
    .map((n) => {
      const setting = settings.get(n.id);
      const label = setting?.label ?? n.id;
      const x = n.x0;
      const y = n.y0;
      const width = n.x1 - n.x0;
      const height = Math.max(1, n.y1 - n.y0);
      // labels face the inside of the diagram: after the node, except in the last column
      const after = n.column < lastColumn || layout.columns === 1;
      const toRight = rtl ? !after : after;
      return {
        index: n.index,
        id: n.id,
        label,
        x: round(x),
        y: round(y),
        width: round(width),
        height: round(height),
        color: setting?.color ?? palette[n.index % palette.length],
        column: n.column,
        valueText: format(n.value),
        labelVm: input.showLabels
          ? {
              x: round(toRight ? x + width + 6 : x - 6),
              y: round(y + height / 2 + 4),
              text: label,
              anchor: toRight ? ('start' as const) : ('end' as const),
            }
          : null,
        payload: { id: n.id, label, inflow: n.inflow, outflow: n.outflow },
      };
    });
  const colorOf = new Map(nodes.map((n) => [n.index, n.color]));
  const nodeById = new Map(layout.nodes.map((n) => [n.index, n]));
  const links: OgeSankeyLinkVm<T>[] = layout.links.map((l) => {
    const entry = raw[l.index];
    return {
      index: l.index,
      key: String(l.index),
      path: l.path,
      color:
        input.linkColor === 'neutral'
          ? 'var(--oge-chart-link)'
          : (colorOf.get(input.linkColor === 'target' ? l.target : l.source) ??
            palette[0]),
      source: l.source,
      target: l.target,
      valueText: format(l.value),
      payload: {
        source: nodeById.get(l.source)?.id ?? entry.source,
        target: nodeById.get(l.target)?.id ?? entry.target,
        value: l.value,
        item: entry.item,
      },
    };
  });
  const columns: number[][] = Array.from({ length: layout.columns }, () => []);
  for (const n of [...nodes].sort((a, b) => a.y - b.y))
    columns[n.column].push(n.index);
  return {
    nodes,
    links,
    columns,
    ariaLabel: ogeFormatMessage(
      input.messages.visuals.sankeyLabel,
      { title: input.title ?? '', nodes: nodes.length, links: links.length },
      input.locale,
    ).trim(),
  };
}

/** What the hover highlights: a node lights its links, a link its ends. */
export function sankeyHighlight<T>(
  scene: OgeSankeyScene<T>,
  hover: { readonly kind: 'node' | 'link'; readonly index: number } | null,
): {
  readonly nodes: ReadonlySet<number>;
  readonly links: ReadonlySet<number>;
} | null {
  if (hover === null) return null;
  if (hover.kind === 'link') {
    const link = scene.links.find((l) => l.index === hover.index);
    if (link === undefined) return null;
    return {
      nodes: new Set([link.source, link.target]),
      links: new Set([link.index]),
    };
  }
  const links = scene.links.filter(
    (l) => l.source === hover.index || l.target === hover.index,
  );
  return {
    nodes: new Set([
      hover.index,
      ...links.flatMap((l) => [l.source, l.target]),
    ]),
    links: new Set(links.map((l) => l.index)),
  };
}

/** Node text: `name: in 120, out 80` (the announcement). */
export function sankeyNodeText(
  node: OgeSankeyNodeVm,
  messages: OgeChartsMessages,
  locale: string | undefined,
  valueFormat?: (value: number) => string,
): string {
  const format =
    valueFormat ??
    ((v: number) =>
      ogeNumberFormat(locale, { maximumFractionDigits: 2 }).format(v));
  const parts: string[] = [];
  if (node.payload.inflow > 0) {
    parts.push(
      formatOgeChartMessage(messages.visuals.inflow, {
        value: format(node.payload.inflow),
      }),
    );
  }
  if (node.payload.outflow > 0) {
    parts.push(
      formatOgeChartMessage(messages.visuals.outflow, {
        value: format(node.payload.outflow),
      }),
    );
  }
  return formatOgeChartMessage(messages.visuals.item, {
    name: node.label,
    value: parts.join(', '),
  });
}

export interface OgeSankeyTooltipVm {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly valueText: string;
  readonly flipX: boolean;
}

/** The hover balloon of a node or a link. */
export function sankeyTooltip<T>(
  scene: OgeSankeyScene<T>,
  hover: { readonly kind: 'node' | 'link'; readonly index: number } | null,
  messages: OgeChartsMessages,
  width: number,
  locale: string | undefined,
  pointer?: { readonly x: number; readonly y: number },
): OgeSankeyTooltipVm | null {
  if (hover === null) return null;
  const format = (v: number): string =>
    ogeNumberFormat(locale, { maximumFractionDigits: 2 }).format(v);
  if (hover.kind === 'node') {
    const node = scene.nodes.find((n) => n.index === hover.index);
    if (node === undefined) return null;
    const right = node.x > width / 2;
    const parts: string[] = [];
    if (node.payload.inflow > 0)
      parts.push(
        formatOgeChartMessage(messages.visuals.inflow, {
          value: format(node.payload.inflow),
        }),
      );
    if (node.payload.outflow > 0)
      parts.push(
        formatOgeChartMessage(messages.visuals.outflow, {
          value: format(node.payload.outflow),
        }),
      );
    return {
      x: right ? node.x - 8 : node.x + node.width + 8,
      y: node.y + node.height / 2,
      label: node.label,
      valueText: parts.join(', '),
      flipX: right,
    };
  }
  const link = scene.links.find((l) => l.index === hover.index);
  if (link === undefined) return null;
  const source = scene.nodes.find((n) => n.index === link.source);
  const target = scene.nodes.find((n) => n.index === link.target);
  const at = pointer ?? {
    x: ((source?.x ?? 0) + (target?.x ?? 0)) / 2,
    y: ((source?.y ?? 0) + (target?.y ?? 0)) / 2,
  };
  return {
    x: at.x + 12,
    y: at.y,
    label: formatOgeChartMessage(messages.visuals.flow, {
      source: source?.label ?? link.payload.source,
      target: target?.label ?? link.payload.target,
    }),
    valueText: link.valueText,
    flipX: at.x > width / 2,
  };
}

/** The screen-reader table: one row per flow (source, target, value). */
export function sankeySrTable<T>(
  scene: OgeSankeyScene<T>,
  messages: OgeChartsMessages,
  limit: number,
): {
  readonly headers: readonly string[];
  readonly rows: readonly {
    readonly argText: string;
    readonly cells: readonly string[];
  }[];
} {
  const label = new Map(scene.nodes.map((n) => [n.index, n.label]));
  return {
    headers: [
      messages.visuals.sourceHeader,
      messages.visuals.targetHeader,
      messages.visuals.valueHeader,
    ],
    rows: scene.links.slice(0, limit).map((link) => ({
      argText: label.get(link.source) ?? link.payload.source,
      cells: [label.get(link.target) ?? link.payload.target, link.valueText],
    })),
  };
}
