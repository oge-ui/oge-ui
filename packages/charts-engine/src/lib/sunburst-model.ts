/**
 * The sunburst view model — what `<oge-sunburst-chart>` /
 * `<OgeSunburstChart>` draw: one ring per hierarchy level around the
 * drill-down root, segments sized by value inside their parent's angle,
 * radial labels where they fit, the centre caption, the breadcrumb and the
 * tooltip. Angles are radians, 0 at 12 o'clock, clockwise (the pie's
 * convention). Framework-free and pure.
 */
import { ogeFormatMessage, ogeNumberFormat } from '@oge-ui/core';
import { OGE_CHART_PALETTE } from './charts-types';
import type { OgeChartsMessages } from './charts-config';
import {
  chartHierarchyColor,
  chartHierarchyEvent,
  chartHierarchyPath,
  type OgeChartHierarchy,
  type OgeChartHierarchyNode,
  type OgeChartHierarchyNodeEvent,
} from './hierarchy';
import { sliceArcPath } from './pie-layout';
import { fitChartText } from './treemap-model';

export interface OgeSunburstSceneInput<T> {
  readonly hierarchy: OgeChartHierarchy<T>;
  readonly rootKey: string;
  /** Rings drawn below the root. Default all. */
  readonly maxDepth: number;
  /** Centre hole as a fraction of the radius. Default 0.25. */
  readonly innerRadius: number;
  /** Radians; 0 = 12 o'clock, clockwise. */
  readonly startAngle: number;
  readonly palette?: readonly string[];
  readonly showLabels: boolean;
  readonly valueFormat?: (value: number) => string;
  readonly title?: string;
  readonly width: number;
  readonly height: number;
  readonly locale?: string;
  readonly messages: OgeChartsMessages;
}

export interface OgeSunburstSegmentVm<T> {
  readonly key: string;
  readonly node: OgeChartHierarchyNode<T>;
  readonly level: number;
  readonly path: string;
  readonly fill: string;
  readonly startAngle: number;
  readonly endAngle: number;
  readonly innerR: number;
  readonly outerR: number;
  readonly isGroup: boolean;
  /** A radial label, rotated to stay upright; `null` where it does not fit. */
  readonly label: {
    readonly x: number;
    readonly y: number;
    readonly text: string;
    readonly rotate: number;
  } | null;
  readonly valueText: string;
  readonly payload: OgeChartHierarchyNodeEvent<T>;
}

export interface OgeSunburstScene<T> {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly holeRadius: number;
  readonly root: OgeChartHierarchyNode<T>;
  readonly segments: readonly OgeSunburstSegmentVm<T>[];
  /** The centre caption (root name, value). */
  readonly center: {
    readonly name: string | null;
    readonly value: string | null;
  };
  readonly breadcrumb: readonly {
    readonly key: string;
    readonly name: string;
  }[];
  readonly ariaLabel: string;
}

const round = (value: number): number => Math.round(value * 100) / 100;

const depthBelow = <T>(node: OgeChartHierarchyNode<T>): number =>
  node.children.length === 0
    ? 0
    : 1 + Math.max(...node.children.map(depthBelow));

export function buildSunburstScene<T>(
  input: OgeSunburstSceneInput<T>,
): OgeSunburstScene<T> {
  const palette = input.palette ?? OGE_CHART_PALETTE;
  const format =
    input.valueFormat ??
    ((v: number) =>
      ogeNumberFormat(input.locale, { maximumFractionDigits: 2 }).format(v));
  const root = input.hierarchy.byKey.get(input.rootKey) ?? input.hierarchy.root;
  const cx = input.width / 2;
  const cy = input.height / 2;
  const radius = Math.max(20, Math.min(input.width, input.height) / 2 - 6);
  const hole = radius * Math.max(0, Math.min(0.8, input.innerRadius));
  const levels = Math.max(
    1,
    Math.min(Math.max(1, input.maxDepth), depthBelow(root)),
  );
  const ringW = (radius - hole) / levels;
  const segments: OgeSunburstSegmentVm<T>[] = [];

  const place = (
    node: OgeChartHierarchyNode<T>,
    a0: number,
    a1: number,
    level: number,
  ): void => {
    if (level > levels || node.value <= 0) return;
    let angle = a0;
    for (const child of node.children) {
      if (child.value <= 0) continue;
      const sweep = ((a1 - a0) * child.value) / node.value;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      const innerR =
        hole + (level - 1) * ringW + (level > 1 || hole > 0 ? 1 : 0);
      const outerR = hole + level * ringW;
      const mid = (start + end) / 2;
      const midR = (innerR + outerR) / 2;
      let label: OgeSunburstSegmentVm<T>['label'] = null;
      if (input.showLabels && sweep * midR >= 13) {
        const text = fitChartText(child.name, outerR - innerR - 2);
        if (text !== null) {
          const deg = (mid * 180) / Math.PI;
          // along the radius, flipped on the left half so it reads upright
          const leftHalf = Math.sin(mid) < 0;
          label = {
            x: round(cx + midR * Math.sin(mid)),
            y: round(cy - midR * Math.cos(mid)),
            text,
            rotate: round(leftHalf ? deg + 90 : deg - 90),
          };
        }
      }
      segments.push({
        key: child.key,
        node: child,
        level,
        path: sliceArcPath(cx, cy, outerR, innerR, start, end),
        fill: chartHierarchyColor(child, palette),
        startAngle: start,
        endAngle: end,
        innerR: round(innerR),
        outerR: round(outerR),
        isGroup: child.children.length > 0,
        label,
        valueText: format(child.value),
        payload: chartHierarchyEvent(child),
      });
      place(child, start, end, level + 1);
    }
  };
  place(root, input.startAngle, input.startAngle + Math.PI * 2, 1);

  return {
    cx: round(cx),
    cy: round(cy),
    radius: round(radius),
    holeRadius: round(hole),
    root,
    segments,
    center: {
      name: hole >= 26 ? fitChartText(root.name, hole * 1.7) : null,
      value: hole >= 26 ? format(root.value) : null,
    },
    breadcrumb: chartHierarchyPath(root).map((node) => ({
      key: node.key,
      name: node.name,
    })),
    ariaLabel: ogeFormatMessage(
      input.messages.visuals.sunburstLabel,
      { title: input.title ?? '', count: segments.length },
      input.locale,
    ).trim(),
  };
}

/** The segment under a pointer (svg px), by angle and radius. */
export function sunburstSegmentAt<T>(
  scene: OgeSunburstScene<T>,
  x: number,
  y: number,
): OgeSunburstSegmentVm<T> | null {
  const dx = x - scene.cx;
  const dy = y - scene.cy;
  const r = Math.hypot(dx, dy);
  const tau = Math.PI * 2;
  const angle = ((Math.atan2(dx, -dy) % tau) + tau) % tau;
  for (const segment of scene.segments) {
    if (r < segment.innerR || r > segment.outerR) continue;
    const start = ((segment.startAngle % tau) + tau) % tau;
    let probe = angle;
    if (probe < start) probe += tau;
    if (probe < start + (segment.endAngle - segment.startAngle)) return segment;
  }
  return null;
}

export interface OgeSunburstTooltipVm {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly valueText: string;
}

/** The hover balloon of a segment, at its centroid. */
export function sunburstTooltip<T>(
  scene: OgeSunburstScene<T>,
  key: string | null,
  locale: string | undefined,
): OgeSunburstTooltipVm | null {
  if (key === null) return null;
  const segment = scene.segments.find((entry) => entry.key === key);
  if (segment === undefined) return null;
  const mid = (segment.startAngle + segment.endAngle) / 2;
  const r = (segment.innerR + segment.outerR) / 2;
  const parentValue = segment.node.parent?.value ?? 0;
  const share =
    parentValue > 0
      ? ` (${ogeNumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(segment.node.value / parentValue)})`
      : '';
  return {
    x: round(scene.cx + r * Math.sin(mid) + 12),
    y: round(scene.cy - r * Math.cos(mid)),
    label: chartHierarchyPath(segment.node)
      .slice(scene.root.depth + 1)
      .map((node) => node.name)
      .join(' / '),
    valueText: `${segment.valueText}${share}`,
  };
}
