/**
 * The pie/doughnut view model — what `<oge-pie-chart>` and `<OgePieChart>`
 * draw: slice paths (plain and exploded), nested rings, data labels
 * (outside columns with connectors, or inside the ring), the tooltip, the
 * sr table text and the selection toggle. Framework-free.
 */
import { createFieldAccessor } from '@oge-ui/core';
import {
  buildPieSlices,
  groupSmallValues,
  layoutPieLabels,
  sliceArcPath,
  type PieLabelPosition,
  type PieSlice,
  type PieSmallValuesGrouping,
} from './pie-layout';
import { numberFormat } from './tick-format';
import { OGE_CHART_PALETTE, type OgeChartPieSliceEvent } from './charts-types';
import type { OgeChartsMessages } from './charts-config';
import type {
  ChartLabelInfo,
  ChartLabelOptions,
  ChartPointCustomizer,
  ChartPointStyle,
} from './series-model';
import {
  chartContrastText,
  resolveChartLabels,
  type ChartLabelCandidate,
  type OgeChartRenderLabel,
} from './data-labels';

/** A field name / dotted path, or a getter. */
export type OgeChartFieldExpr<T> = string | ((item: T) => unknown);

/**
 * One ring of a nested doughnut. Unset fields fall back to the chart's
 * own `dataSource` / `argumentField` / `valueField` / `colorField` /
 * `customizePoint` / `label`.
 */
export interface OgePieSeriesInput<T> {
  readonly name?: string;
  readonly dataSource?: readonly T[];
  readonly argumentField?: OgeChartFieldExpr<T>;
  readonly valueField?: OgeChartFieldExpr<T>;
  readonly colorField?: OgeChartFieldExpr<T>;
  readonly customizePoint?: ChartPointCustomizer<T>;
  readonly label?: ChartLabelOptions<T>;
}

export interface OgePieSceneInput<T> {
  readonly dataSource: readonly T[];
  readonly argumentField: OgeChartFieldExpr<T>;
  readonly valueField: OgeChartFieldExpr<T>;
  readonly type: 'pie' | 'doughnut';
  /** Doughnut hole as a fraction of the outer radius. */
  readonly innerRadius: number;
  /** Radians; 0 = 12 o'clock, clockwise. */
  readonly startAngle: number;
  readonly smallValuesGrouping: PieSmallValuesGrouping | null;
  readonly othersLabel: string;
  /** Labels on/off — shorthand for `label.visible`. */
  readonly showLabels: boolean;
  readonly palette?: readonly string[];
  readonly width: number;
  readonly height: number;
  /** Per-slice colour read from the data. */
  readonly colorField?: OgeChartFieldExpr<T>;
  /** Per-slice colour / label overrides (wins over `colorField`). */
  readonly customizePoint?: ChartPointCustomizer<T>;
  /** Data labels: position, format, zero handling, connectors. */
  readonly label?: ChartLabelOptions<T>;
  /**
   * Nested doughnut: one ring per entry, inner to outer. Slices of the same
   * argument share a colour (and a legend entry) across rings; small-value
   * grouping does not apply.
   */
  readonly series?: readonly OgePieSeriesInput<T>[];
  /** BCP 47 locale of the label numbers. */
  readonly locale?: string;
}

export interface OgePieGeometry {
  readonly cx: number;
  readonly cy: number;
  readonly outerR: number;
  readonly innerR: number;
}

/** One drawn slice. */
export interface OgePieSliceVm<T> {
  readonly slice: PieSlice;
  readonly payload: OgeChartPieSliceEvent<T>;
  readonly path: string;
  /** The path moved outward along the mid-angle — drawn while selected. */
  readonly explodedPath: string;
  readonly color: string;
  readonly label: string;
  /** Stable render key (`ring:index`). */
  readonly key: string;
  /** Ring of a nested doughnut (0 = innermost; always 0 for one ring). */
  readonly ringIndex: number;
  /** `customizePoint` description, spoken after the value. */
  readonly description?: string;
}

/** A drawn pie label: text anchor plus the optional connector polyline. */
export interface OgePieLabelVm extends OgeChartRenderLabel {
  /** `points` of the connector `<polyline>`; `null` = none. */
  readonly connector: string | null;
  /** Render key (`ring:index`). */
  readonly key: string;
}

/** A pie legend entry: one per slice, or one per argument for rings. */
export interface OgePieLegendItemVm {
  /** The slice index (rings: the argument index) selection uses. */
  readonly index: number;
  readonly name: string;
  readonly color: string;
}

export interface OgePieRingVm {
  readonly index: number;
  readonly name: string;
  readonly innerR: number;
  readonly outerR: number;
}

export interface OgePieScene<T> {
  readonly geometry: OgePieGeometry;
  readonly slices: readonly OgePieSliceVm<T>[];
  /** Outside label positions (outermost ring) — kept for custom renderers. */
  readonly labels: readonly PieLabelPosition[];
  /** Every drawn label after positioning and overlap resolution. */
  readonly labelVms: readonly OgePieLabelVm[];
  readonly legendItems: readonly OgePieLegendItemVm[];
  readonly rings: readonly OgePieRingVm[];
  /** Whether the chart draws nested rings (`series` given). */
  readonly ringed: boolean;
}

const accessorOf = <T>(expr: OgeChartFieldExpr<T>): ((item: T) => unknown) =>
  typeof expr === 'string' ? createFieldAccessor<T>(expr) : expr;

const pointAt = (
  cx: number,
  cy: number,
  r: number,
  angle: number,
): { x: number; y: number } => ({
  x: cx + r * Math.sin(angle),
  y: cy - r * Math.cos(angle),
});

interface RingSpec<T> {
  readonly name: string;
  readonly data: readonly T[];
  readonly argOf: (item: T) => unknown;
  readonly valueOf: (item: T) => unknown;
  readonly colorOf: ((item: T) => unknown) | null;
  readonly customize: ChartPointCustomizer<T> | undefined;
  readonly label: ChartLabelOptions<T> | undefined;
}

export function buildPieScene<T>(input: OgePieSceneInput<T>): OgePieScene<T> {
  const ringed = (input.series?.length ?? 0) > 0;
  const specs: RingSpec<T>[] = (
    ringed ? (input.series as readonly OgePieSeriesInput<T>[]) : [{}]
  ).map((ring, index) => ({
    name: ring.name ?? (ringed ? `Series ${index + 1}` : ''),
    data: ring.dataSource ?? input.dataSource,
    argOf: accessorOf(ring.argumentField ?? input.argumentField),
    valueOf: accessorOf(ring.valueField ?? input.valueField),
    colorOf:
      (ring.colorField ?? input.colorField) === undefined
        ? null
        : accessorOf(
            (ring.colorField ?? input.colorField) as OgeChartFieldExpr<T>,
          ),
    customize: ring.customizePoint ?? input.customizePoint,
    label: ring.label ?? input.label,
  }));

  const outerLabelOptions = specs[specs.length - 1].label ?? input.label;
  const labelsVisible = outerLabelOptions?.visible ?? input.showLabels;
  const outsideLabels =
    labelsVisible && (outerLabelOptions?.position ?? 'outside') === 'outside';
  const cx = input.width / 2;
  const cy = input.height / 2;
  const outerR = Math.max(
    20,
    Math.min(input.width, input.height) / 2 - (outsideLabels ? 56 : 16),
  );
  const innerR =
    input.type === 'doughnut' || ringed ? outerR * input.innerRadius : 0;
  const pieInnerR = input.type === 'doughnut' ? innerR : 0;
  const geometry = { cx, cy, outerR, innerR: ringed ? pieInnerR : innerR };
  const palette = input.palette ?? OGE_CHART_PALETTE;

  // rings: the band between the hole and the rim split evenly
  const ringBase = ringed ? pieInnerR : innerR;
  const ringWidth = (outerR - ringBase) / specs.length;
  const rings: OgePieRingVm[] = specs.map((spec, index) => ({
    index,
    name: spec.name,
    innerR: ringBase + ringWidth * index + (index > 0 ? 1.5 : 0),
    outerR: ringBase + ringWidth * (index + 1),
  }));

  // nested rings colour by argument (stable across rings)
  const argumentOrder: unknown[] = [];
  const argumentIndex = new Map<unknown, number>();
  if (ringed) {
    for (const spec of specs) {
      for (const item of spec.data) {
        const argument = spec.argOf(item);
        if (!argumentIndex.has(argument)) {
          argumentIndex.set(argument, argumentOrder.length);
          argumentOrder.push(argument);
        }
      }
    }
  }

  const slices: OgePieSliceVm<T>[] = [];
  const legendColors = new Map<number, string>();
  const labelStyles = new Map<string, ChartPointStyle['label']>();
  specs.forEach((spec, ringIndex) => {
    const ring = rings[ringIndex];
    const values = spec.data.map((item) => {
      const raw = spec.valueOf(item);
      return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
    });
    const grouped = groupSmallValues(
      values,
      ringed ? null : input.smallValuesGrouping,
    );
    buildPieSlices(grouped, input.startAngle).forEach((raw) => {
      if (raw.fraction <= 0) return;
      const entry = grouped[raw.index];
      const sources = entry.sourceIndexes.map((index) => spec.data[index]);
      const argument = entry.grouped
        ? input.othersLabel
        : spec.argOf(sources[0]);
      const index = ringed ? (argumentIndex.get(argument) ?? 0) : raw.index;
      const slice: PieSlice = { ...raw, index };
      let style: ChartPointStyle | undefined;
      if (!entry.grouped) {
        const sourceIndex = entry.sourceIndexes[0];
        const color = spec.colorOf?.(sources[0]);
        if (typeof color === 'string' && color !== '') style = { color };
        const custom = spec.customize?.({
          seriesIndex: ringIndex,
          seriesName: spec.name,
          pointIndex: sourceIndex,
          argument,
          value: raw.value,
          source: sources[0],
        });
        if (custom !== null && custom !== undefined) {
          style = { ...style, ...custom };
        }
      }
      const color = style?.color ?? palette[index % palette.length];
      if (!legendColors.has(index)) legendColors.set(index, color);
      const mid = (raw.startAngle + raw.endAngle) / 2;
      const explode = 8;
      const dx = explode * Math.sin(mid);
      const dy = -explode * Math.cos(mid);
      slices.push({
        slice,
        payload: {
          index,
          argument,
          value: raw.value,
          fraction: raw.fraction,
          sources,
          grouped: entry.grouped,
          ...(ringed ? { ringIndex, ringName: spec.name } : {}),
        },
        path: sliceArcPath(
          cx,
          cy,
          ring.outerR,
          ring.innerR,
          raw.startAngle,
          raw.endAngle,
        ),
        explodedPath: sliceArcPath(
          cx + dx,
          cy + dy,
          ring.outerR,
          ring.innerR,
          raw.startAngle,
          raw.endAngle,
        ),
        color,
        label: String(argument ?? ''),
        key: `${ringIndex}:${index}`,
        ringIndex,
        ...(style?.description !== undefined
          ? { description: style.description }
          : {}),
      });
      if (style?.label !== undefined) {
        labelStyles.set(`${ringIndex}:${index}`, style.label);
      }
    });
  });

  /* labels */
  const outermost = specs.length - 1;
  const labels = layoutPieLabels(
    slices.filter((vm) => vm.ringIndex === outermost).map((vm) => vm.slice),
    cx,
    cy,
    outerR,
  );
  const labelVms: OgePieLabelVm[] = [];
  const inner: ChartLabelCandidate[] = [];
  for (const vm of slices) {
    const spec = specs[vm.ringIndex];
    const options = spec.label ?? input.label;
    const labelStyle = labelStyles.get(vm.key);
    const visible = labelStyle?.visible ?? options?.visible ?? input.showLabels;
    if (!visible) continue;
    if (options?.showForZero === false && vm.slice.value === 0) continue;
    const info: ChartLabelInfo<T> = {
      seriesIndex: vm.ringIndex,
      seriesName: spec.name,
      pointIndex: vm.slice.index,
      argument: vm.payload.argument,
      value: vm.slice.value,
      percent: vm.slice.fraction,
      source: vm.payload.sources[0],
      text: vm.label,
    };
    const text =
      labelStyle?.text ??
      (options?.format !== undefined ? options.format(info) : vm.label);
    const position = options?.position ?? 'outside';
    const ring = rings[vm.ringIndex];
    if (position === 'outside' && vm.ringIndex === outermost) {
      const at = labels.find((entry) => entry.sliceIndex === vm.slice.index);
      if (at === undefined) continue;
      labelVms.push({
        x: at.labelX + (at.side === 'end' ? 4 : -4),
        y: at.labelY + 4,
        text,
        anchor: at.side === 'end' ? 'start' : 'end',
        inside: false,
        textColor: null,
        seriesIndex: vm.ringIndex,
        pointIndex: vm.slice.index,
        seriesName: spec.name,
        argument: vm.payload.argument,
        value: vm.slice.value,
        connector:
          options?.connector === false
            ? null
            : `${at.arcX},${at.arcY} ${at.labelX},${at.labelY}`,
        key: vm.key,
      });
      continue;
    }
    const base = ring.innerR > 0 ? ring.innerR : ring.outerR * 0.18;
    const r =
      position === 'insideEnd'
        ? ring.outerR - 12
        : position === 'insideBase'
          ? base + 12
          : (base + ring.outerR) / 2;
    const sweep = vm.slice.endAngle - vm.slice.startAngle;
    // too thin a wedge for any text
    if (sweep * r < 14) continue;
    const at = pointAt(
      cx,
      cy,
      r,
      (vm.slice.startAngle + vm.slice.endAngle) / 2,
    );
    inner.push({
      overlap: options?.overlap ?? 'hide',
      label: {
        x: at.x,
        y: at.y + 4,
        text,
        anchor: 'middle',
        inside: true,
        textColor: chartContrastText(vm.color),
        seriesIndex: vm.ringIndex,
        pointIndex: vm.slice.index,
        seriesName: spec.name,
        argument: vm.payload.argument,
        value: vm.slice.value,
      },
    });
  }
  for (const label of resolveChartLabels(inner, input.width, input.height)) {
    labelVms.push({
      ...label,
      connector: null,
      key: `${label.seriesIndex}:${label.pointIndex}`,
    });
  }

  const legendItems: OgePieLegendItemVm[] = ringed
    ? argumentOrder.map((argument, index) => ({
        index,
        name: String(argument ?? ''),
        color: legendColors.get(index) ?? palette[index % palette.length],
      }))
    : slices.map((vm) => ({
        index: vm.slice.index,
        name: vm.label,
        color: vm.color,
      }));

  return {
    geometry,
    slices,
    labels,
    labelVms,
    legendItems,
    rings,
    ringed,
  };
}

/** `1,234 (56.7%)` — the value plus its share (and the description). */
export function pieValueText<T>(
  vm: OgePieSliceVm<T>,
  locale: string | undefined,
): string {
  const percent = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(vm.slice.fraction);
  const text = `${numberFormat(vm.slice.value, locale)} (${percent})`;
  return vm.description === undefined ? text : `${text}, ${vm.description}`;
}

/** The label text drawn at an outside label position. */
export function pieLabelText<T>(
  scene: OgePieScene<T>,
  sliceIndex: number,
): string {
  const vm = scene.slices.find((entry) => entry.slice.index === sliceIndex);
  return vm === undefined ? '' : vm.label;
}

export interface OgePieTooltipVm {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly valueText: string;
}

/**
 * The hover balloon, anchored half-way out along the slice's mid-angle.
 * `hoverKey` is a slice index, or a slice `key` for nested rings.
 */
export function pieTooltip<T>(
  scene: OgePieScene<T>,
  hoverIndex: number | string | null,
  locale: string | undefined,
): OgePieTooltipVm | null {
  if (hoverIndex === null) return null;
  const vm = scene.slices.find((entry) =>
    typeof hoverIndex === 'string'
      ? entry.key === hoverIndex
      : entry.slice.index === hoverIndex,
  );
  if (vm === undefined) return null;
  const { cx, cy } = scene.geometry;
  const ring = scene.rings[vm.ringIndex];
  const r = ring === undefined ? scene.geometry.outerR / 2 : ring.outerR * 0.8;
  const mid = (vm.slice.startAngle + vm.slice.endAngle) / 2;
  const valueText = pieValueText(vm, locale);
  return {
    x: cx + r * Math.sin(mid) + 12,
    y: cy - r * Math.cos(mid),
    label: vm.label,
    valueText:
      scene.ringed && ring !== undefined
        ? `${ring.name}: ${valueText}`
        : valueText,
  };
}

/**
 * The screen-reader table: one row per slice (one ring), or one row per
 * argument with a column per ring (`headers` = ring names) for nested
 * doughnuts.
 */
export function pieSrTable<T>(
  scene: OgePieScene<T>,
  locale: string | undefined,
): {
  readonly headers: readonly string[] | null;
  readonly rows: readonly {
    readonly argText: string;
    readonly cells: readonly string[];
  }[];
} {
  if (!scene.ringed) {
    return {
      headers: null,
      rows: scene.slices.map((vm) => ({
        argText: vm.label,
        cells: [pieValueText(vm, locale)],
      })),
    };
  }
  return {
    headers: scene.rings.map((ring) => ring.name),
    rows: scene.legendItems.map((item) => ({
      argText: item.name,
      cells: scene.rings.map((ring) => {
        const vm = scene.slices.find(
          (entry) =>
            entry.ringIndex === ring.index && entry.slice.index === item.index,
        );
        return vm === undefined ? '' : pieValueText(vm, locale);
      }),
    })),
  };
}

/** Toggles one slice index in a selection. */
export function togglePieSlice(
  current: readonly number[],
  index: number,
): number[] {
  return current.includes(index)
    ? current.filter((entry) => entry !== index)
    : [...current, index];
}

/** The svg label: `{title}`, `{count}` (slices). */
export function pieAriaLabel(
  messages: OgeChartsMessages,
  title: string,
  sliceCount: number,
): string {
  return messages.aria.pieLabel
    .replace('{title}', title || 'Data')
    .replace('{count}', String(sliceCount));
}

/** The live-region text after a slice is clicked. */
export function pieSelectedAnnouncement<T>(
  messages: OgeChartsMessages,
  vm: OgePieSliceVm<T>,
  locale: string | undefined,
): string {
  return messages.announcements.selected
    .replace('{series}', vm.label)
    .replace('{argument}', pieValueText(vm, locale));
}
