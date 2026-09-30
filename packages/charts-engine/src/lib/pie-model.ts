/**
 * The pie/doughnut view model — what `<oge-pie-chart>` and `<OgePieChart>`
 * draw: slice paths (plain and exploded), outside labels, the tooltip, the
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

/** A field name / dotted path, or a getter. */
export type OgeChartFieldExpr<T> = string | ((item: T) => unknown);

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
  readonly showLabels: boolean;
  readonly palette?: readonly string[];
  readonly width: number;
  readonly height: number;
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
}

export interface OgePieScene<T> {
  readonly geometry: OgePieGeometry;
  readonly slices: readonly OgePieSliceVm<T>[];
  readonly labels: readonly PieLabelPosition[];
}

const accessorOf = <T>(expr: OgeChartFieldExpr<T>): ((item: T) => unknown) =>
  typeof expr === 'string' ? createFieldAccessor<T>(expr) : expr;

export function buildPieScene<T>(input: OgePieSceneInput<T>): OgePieScene<T> {
  const cx = input.width / 2;
  const cy = input.height / 2;
  const outerR = Math.max(
    20,
    Math.min(input.width, input.height) / 2 - (input.showLabels ? 56 : 16),
  );
  const innerR = input.type === 'doughnut' ? outerR * input.innerRadius : 0;
  const geometry = { cx, cy, outerR, innerR };

  const argOf = accessorOf(input.argumentField);
  const valueOf = accessorOf(input.valueField);
  const data = input.dataSource;
  const values = data.map((item) => {
    const raw = valueOf(item);
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  });
  const grouped = groupSmallValues(values, input.smallValuesGrouping);
  const palette = input.palette ?? OGE_CHART_PALETTE;
  const slices = buildPieSlices(grouped, input.startAngle)
    .filter((slice) => slice.fraction > 0)
    .map((slice): OgePieSliceVm<T> => {
      const entry = grouped[slice.index];
      const sources = entry.sourceIndexes.map((index) => data[index]);
      const label = entry.grouped
        ? input.othersLabel
        : String(argOf(sources[0]) ?? '');
      const mid = (slice.startAngle + slice.endAngle) / 2;
      const explode = 8;
      const dx = explode * Math.sin(mid);
      const dy = -explode * Math.cos(mid);
      return {
        slice,
        payload: {
          index: slice.index,
          argument: entry.grouped ? input.othersLabel : argOf(sources[0]),
          value: slice.value,
          fraction: slice.fraction,
          sources,
          grouped: entry.grouped,
        },
        path: sliceArcPath(
          cx,
          cy,
          outerR,
          innerR,
          slice.startAngle,
          slice.endAngle,
        ),
        explodedPath: sliceArcPath(
          cx + dx,
          cy + dy,
          outerR,
          innerR,
          slice.startAngle,
          slice.endAngle,
        ),
        color: palette[slice.index % palette.length],
        label,
      };
    });
  const labels = layoutPieLabels(
    slices.map((vm) => vm.slice),
    cx,
    cy,
    outerR,
  );
  return { geometry, slices, labels };
}

/** `1,234 (56.7%)` — the value plus its share. */
export function pieValueText<T>(
  vm: OgePieSliceVm<T>,
  locale: string | undefined,
): string {
  const percent = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(vm.slice.fraction);
  return `${numberFormat(vm.slice.value, locale)} (${percent})`;
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

/** The hover balloon, anchored half-way out along the slice's mid-angle. */
export function pieTooltip<T>(
  scene: OgePieScene<T>,
  hoverIndex: number | null,
  locale: string | undefined,
): OgePieTooltipVm | null {
  if (hoverIndex === null) return null;
  const vm = scene.slices.find((entry) => entry.slice.index === hoverIndex);
  if (vm === undefined) return null;
  const { cx, cy, outerR } = scene.geometry;
  const mid = (vm.slice.startAngle + vm.slice.endAngle) / 2;
  return {
    x: cx + (outerR / 2) * Math.sin(mid) + 12,
    y: cy - (outerR / 2) * Math.cos(mid),
    label: vm.label,
    valueText: pieValueText(vm, locale),
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
