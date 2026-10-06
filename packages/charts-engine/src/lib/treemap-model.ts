/**
 * The treemap view model — what `<oge-treemap>` / `<OgeTreemap>` draw:
 * nested tiles under the current drill-down root (squarified or
 * slice-and-dice), group headers, fitted labels, palette or colour-scale
 * fills, the breadcrumb, the tooltip, the screen-reader table and the
 * announcements. Framework-free and pure.
 */
import { ogeFormatMessage, ogeNumberFormat } from '@oge-ui/core';
import { OGE_CHART_PALETTE } from './charts-types';
import { formatOgeChartMessage, type OgeChartsMessages } from './charts-config';
import {
  resolveChartColorScale,
  type OgeChartColorScale,
  type OgeChartColorScaleLegend,
} from './color-scale';
import {
  chartHierarchyColor,
  chartHierarchyEvent,
  chartHierarchyPath,
  type OgeChartHierarchy,
  type OgeChartHierarchyNode,
  type OgeChartHierarchyNodeEvent,
} from './hierarchy';
import {
  mirrorTreemapRect,
  sliceAndDice,
  squarify,
  type OgeTreemapLayoutAlgorithm,
  type TreemapRect,
} from './treemap-layout';

export interface OgeTreemapSceneInput<T> {
  readonly hierarchy: OgeChartHierarchy<T>;
  /** The drill-down root's key (`''` = the whole tree). */
  readonly rootKey: string;
  readonly layoutAlgorithm: OgeTreemapLayoutAlgorithm;
  /** Levels drawn below the root. Default all. */
  readonly maxDepth: number;
  /** Colour leaves by value instead of by top-level group. */
  readonly colorScale?: OgeChartColorScale;
  readonly palette?: readonly string[];
  readonly showLabels: boolean;
  readonly valueFormat?: (value: number) => string;
  readonly rtl?: boolean;
  readonly title?: string;
  readonly width: number;
  readonly height: number;
  readonly locale?: string;
  readonly messages: OgeChartsMessages;
}

export interface OgeTreemapTileVm<T> {
  readonly key: string;
  readonly node: OgeChartHierarchyNode<T>;
  /** Level below the drawn root (1 = top). */
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
  /** Drawn with its children inside (a header band on top). */
  readonly nested: boolean;
  readonly isGroup: boolean;
  /** Name line (and value line when there is room); fitted to the tile. */
  readonly labels: readonly {
    readonly x: number;
    readonly y: number;
    readonly text: string;
    readonly strong: boolean;
  }[];
  readonly valueText: string;
  readonly payload: OgeChartHierarchyNodeEvent<T>;
}

export interface OgeTreemapScene<T> {
  readonly root: OgeChartHierarchyNode<T>;
  readonly tiles: readonly OgeTreemapTileVm<T>[];
  readonly breadcrumb: readonly {
    readonly key: string;
    readonly name: string;
  }[];
  readonly legend: OgeChartColorScaleLegend | null;
  readonly ariaLabel: string;
}

const round = (value: number): number => Math.round(value * 100) / 100;

const CHAR_W = 6.4;

/** `text` cut to `width` px with an ellipsis; `null` when not even 3 chars fit. */
export function fitChartText(text: string, width: number): string | null {
  const max = Math.floor((width - 8) / CHAR_W);
  if (max < 3) return null;
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

export function buildTreemapScene<T>(
  input: OgeTreemapSceneInput<T>,
): OgeTreemapScene<T> {
  const palette = input.palette ?? OGE_CHART_PALETTE;
  const format =
    input.valueFormat ??
    ((v: number) =>
      ogeNumberFormat(input.locale, { maximumFractionDigits: 2 }).format(v));
  const root = input.hierarchy.byKey.get(input.rootKey) ?? input.hierarchy.root;
  const maxDepth = Math.max(1, input.maxDepth);
  const leafValues: number[] = [];
  const collectLeaves = (
    node: OgeChartHierarchyNode<T>,
    level: number,
  ): void => {
    for (const child of node.children) {
      if (child.children.length === 0 || level >= maxDepth)
        leafValues.push(child.value);
      else collectLeaves(child, level + 1);
    }
  };
  collectLeaves(root, 1);
  const scale =
    input.colorScale === undefined
      ? null
      : resolveChartColorScale(input.colorScale, leafValues, input.locale);
  const pad = 2;
  const frame: TreemapRect = {
    x: pad,
    y: pad,
    w: Math.max(0, input.width - pad * 2),
    h: Math.max(0, input.height - pad * 2),
  };
  const headerH = 20;
  const tiles: OgeTreemapTileVm<T>[] = [];

  const place = (
    node: OgeChartHierarchyNode<T>,
    rect: TreemapRect,
    level: number,
  ): void => {
    const values = node.children.map((child) => child.value);
    const rects =
      input.layoutAlgorithm === 'sliceAndDice'
        ? sliceAndDice(values, rect, level % 2 === 0)
        : squarify(values, rect);
    node.children.forEach((child, index) => {
      let tile = rects[index];
      if (tile.w <= 0.5 || tile.h <= 0.5) return;
      if (input.rtl === true) tile = mirrorTreemapRect(tile, rect);
      const isGroup = child.children.length > 0;
      const canNest =
        isGroup && level < maxDepth && tile.h > headerH + 16 && tile.w > 36;
      const leafFill =
        scale !== null && !isGroup
          ? scale.colorOf(child.value)
          : scale !== null && isGroup && !canNest
            ? scale.colorOf(child.value)
            : chartHierarchyColor(child, palette);
      const valueText = format(child.value);
      const labels: { x: number; y: number; text: string; strong: boolean }[] =
        [];
      if (input.showLabels) {
        const name = fitChartText(child.name, tile.w);
        const textX = input.rtl === true ? tile.x + tile.w - 4 : tile.x + 4;
        if (canNest) {
          if (name !== null)
            labels.push({
              x: round(textX),
              y: round(tile.y + 14),
              text: name,
              strong: true,
            });
        } else if (name !== null && tile.h >= 18) {
          labels.push({
            x: round(textX),
            y: round(tile.y + 15),
            text: name,
            strong: true,
          });
          const value = fitChartText(valueText, tile.w);
          if (value !== null && tile.h >= 34) {
            labels.push({
              x: round(textX),
              y: round(tile.y + 29),
              text: value,
              strong: false,
            });
          }
        }
      }
      tiles.push({
        key: child.key,
        node: child,
        level,
        x: round(tile.x),
        y: round(tile.y),
        width: round(tile.w),
        height: round(tile.h),
        fill: canNest ? chartHierarchyColor(child, palette) : leafFill,
        nested: canNest,
        isGroup,
        labels,
        valueText,
        payload: chartHierarchyEvent(child),
      });
      if (canNest) {
        place(
          child,
          {
            x: tile.x + pad,
            y: tile.y + headerH,
            w: Math.max(0, tile.w - pad * 2),
            h: Math.max(0, tile.h - headerH - pad),
          },
          level + 1,
        );
      }
    });
  };
  place(root, frame, 1);

  return {
    root,
    tiles,
    breadcrumb: chartHierarchyPath(root).map((node) => ({
      key: node.key,
      name: node.name,
    })),
    legend: scale?.legend ?? null,
    ariaLabel: ogeFormatMessage(
      input.messages.visuals.treemapLabel,
      { title: input.title ?? '', count: tiles.length },
      input.locale,
    ).trim(),
  };
}

/** `name: 1,200 (34%)` — a node's spoken value. */
export function chartHierarchyValueText<T>(
  node: OgeChartHierarchyNode<T>,
  messages: OgeChartsMessages,
  locale: string | undefined,
  valueFormat?: (value: number) => string,
): string {
  const format =
    valueFormat ??
    ((v: number) =>
      ogeNumberFormat(locale, { maximumFractionDigits: 2 }).format(v));
  const parentValue = node.parent?.value ?? 0;
  const share =
    parentValue > 0
      ? ` (${ogeNumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(node.value / parentValue)})`
      : '';
  return formatOgeChartMessage(messages.visuals.item, {
    name: node.name,
    value: `${format(node.value)}${share}`,
  });
}

export interface OgeTreemapTooltipVm {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly valueText: string;
  readonly flipX: boolean;
}

/** The hover balloon of a tile. */
export function treemapTooltip<T>(
  scene: OgeTreemapScene<T>,
  key: string | null,
  width: number,
  locale: string | undefined,
): OgeTreemapTooltipVm | null {
  if (key === null) return null;
  const tile = scene.tiles.find((entry) => entry.key === key);
  if (tile === undefined) return null;
  const parentValue = tile.node.parent?.value ?? 0;
  const share =
    parentValue > 0
      ? ` (${ogeNumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(tile.node.value / parentValue)})`
      : '';
  const cx = tile.x + tile.width / 2;
  return {
    x: round(cx),
    y: round(tile.y + Math.min(tile.height / 2, 28)),
    label: chartHierarchyPath(tile.node)
      .slice(scene.root.depth + 1)
      .map((node) => node.name)
      .join(' / '),
    valueText: `${tile.valueText}${share}`,
    flipX: cx > width / 2,
  };
}

/** The screen-reader table: every drawn tile with its path, value and share. */
export function chartHierarchySrTable<T>(
  nodes: readonly OgeChartHierarchyNode<T>[],
  root: OgeChartHierarchyNode<T>,
  messages: OgeChartsMessages,
  locale: string | undefined,
  limit: number,
  valueFormat?: (value: number) => string,
): {
  readonly headers: readonly string[];
  readonly rows: readonly {
    readonly argText: string;
    readonly cells: readonly string[];
  }[];
} {
  const format =
    valueFormat ??
    ((v: number) =>
      ogeNumberFormat(locale, { maximumFractionDigits: 2 }).format(v));
  const percent = ogeNumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  });
  return {
    headers: [
      messages.aria.argumentHeader,
      messages.visuals.valueHeader,
      messages.visuals.shareHeader,
    ],
    rows: nodes.slice(0, limit).map((node) => {
      const parentValue = node.parent?.value ?? 0;
      return {
        argText: chartHierarchyPath(node)
          .slice(root.depth + 1)
          .map((entry) => entry.name)
          .join(' / '),
        cells: [
          format(node.value),
          parentValue > 0 ? percent.format(node.value / parentValue) : '',
        ],
      };
    }),
  };
}
