/**
 * The funnel / pyramid view model — what `<oge-funnel-chart>` /
 * `<OgeFunnelChart>` draw: one outline per stage, inside or outside labels
 * (with connectors), the legend, the hover tooltip with the conversion
 * rates, the screen-reader table and the selection toggle. Framework-free.
 */
import {
  createFieldAccessor,
  ogeFormatMessage,
  ogeNumberFormat,
} from '@oge-ui/core';
import { OGE_CHART_PALETTE } from './charts-types';
import { formatOgeChartMessage, type OgeChartsMessages } from './charts-config';
import type {
  ChartLabelInfo,
  ChartLabelOptions,
  ChartPointCustomizer,
  ChartPointStyle,
} from './series-model';
import {
  chartContrastText,
  chartLabelBox,
  type OgeChartRenderLabel,
} from './data-labels';
import {
  layoutFunnel,
  type FunnelStageGeometry,
  type OgeFunnelAlgorithm,
  type OgeFunnelType,
} from './funnel-layout';

type FieldExpr<T> = string | ((item: T) => unknown);

const accessorOf = <T>(expr: FieldExpr<T>): ((item: T) => unknown) =>
  typeof expr === 'string' ? createFieldAccessor<T>(expr) : expr;

/** The payload of a stage click / activation. */
export interface OgeChartFunnelItemEvent<T = unknown> {
  readonly index: number;
  readonly argument: unknown;
  readonly value: number;
  /** Share of the first stage, 0–1. */
  readonly percentOfFirst: number;
  /** Share of the previous stage, 0–1 (1 for the first). */
  readonly percentOfPrevious: number;
  readonly source: T;
}

export interface OgeFunnelSceneInput<T> {
  readonly dataSource: readonly T[];
  readonly argumentField: FieldExpr<T>;
  readonly valueField: FieldExpr<T>;
  readonly colorField?: FieldExpr<T>;
  readonly customizePoint?: ChartPointCustomizer<T>;
  readonly type: OgeFunnelType;
  readonly algorithm: OgeFunnelAlgorithm;
  readonly neckWidth: number;
  readonly neckHeight: number;
  readonly inverted: boolean;
  /** Sort the stages by value, largest first. Default true. */
  readonly sortData: boolean;
  /** Gap between stages, px. */
  readonly itemGap: number;
  /** `position: 'outside'` puts the labels beside the shape with connectors. */
  readonly label?: ChartLabelOptions<T>;
  readonly showLabels: boolean;
  readonly palette?: readonly string[];
  /** Outside labels go to the inline end (left in RTL). */
  readonly rtl?: boolean;
  readonly valueFormat?: (value: number) => string;
  readonly title?: string;
  readonly width: number;
  readonly height: number;
  readonly locale?: string;
  readonly messages: OgeChartsMessages;
}

export interface OgeFunnelItemVm<T> {
  readonly index: number;
  readonly key: string;
  readonly path: string;
  readonly color: string;
  readonly label: string;
  readonly valueText: string;
  readonly payload: OgeChartFunnelItemEvent<T>;
  readonly geometry: FunnelStageGeometry;
  readonly description?: string;
}

export interface OgeFunnelLabelVm extends OgeChartRenderLabel {
  readonly connector: string | null;
  readonly key: string;
}

export interface OgeFunnelLegendItemVm {
  readonly index: number;
  readonly name: string;
  readonly color: string;
}

export interface OgeFunnelScene<T> {
  readonly items: readonly OgeFunnelItemVm<T>[];
  readonly labels: readonly OgeFunnelLabelVm[];
  readonly legendItems: readonly OgeFunnelLegendItemVm[];
  readonly ariaLabel: string;
}

const percentText = (value: number, locale: string | undefined): string =>
  ogeNumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);

export function buildFunnelScene<T>(
  input: OgeFunnelSceneInput<T>,
): OgeFunnelScene<T> {
  const argOf = accessorOf(input.argumentField);
  const valueOf = accessorOf(input.valueField);
  const colorOf =
    input.colorField === undefined ? null : accessorOf(input.colorField);
  const palette = input.palette ?? OGE_CHART_PALETTE;
  const format =
    input.valueFormat ??
    ((v: number) =>
      ogeNumberFormat(input.locale, { maximumFractionDigits: 2 }).format(v));

  interface Entry {
    readonly source: T;
    readonly sourceIndex: number;
    readonly argument: unknown;
    readonly value: number;
  }
  const entries: Entry[] = input.dataSource.map((source, sourceIndex) => {
    const raw = valueOf(source);
    return {
      source,
      sourceIndex,
      argument: argOf(source),
      value:
        typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, raw) : 0,
    };
  });
  if (input.sortData) entries.sort((a, b) => b.value - a.value);

  const labelOptions = input.label;
  const labelsVisible = labelOptions?.visible ?? input.showLabels;
  const outside = labelsVisible && labelOptions?.position === 'outside';
  const rtl = input.rtl === true;
  const pad = 8;
  const labelColumn = outside
    ? Math.min(220, Math.max(90, input.width * 0.32))
    : 0;
  const shapeX = pad + (outside && rtl ? labelColumn : 0);
  const shapeW = Math.max(10, input.width - pad * 2 - labelColumn);
  const geometry = layoutFunnel({
    values: entries.map((entry) => entry.value),
    type: input.type,
    algorithm: input.algorithm,
    neckWidth: input.neckWidth,
    neckHeight: input.neckHeight,
    inverted: input.inverted,
    gap: input.itemGap,
    x: shapeX,
    y: pad,
    width: shapeW,
    height: Math.max(10, input.height - pad * 2),
  });

  const first = entries.find((entry) => entry.value > 0)?.value ?? 0;
  const items: OgeFunnelItemVm<T>[] = [];
  const styles = new Map<number, ChartPointStyle>();
  for (const geo of geometry) {
    const entry = entries[geo.index];
    const previous = entries[geo.index - 1];
    let style: ChartPointStyle | undefined;
    const raw = colorOf?.(entry.source);
    if (typeof raw === 'string' && raw !== '') style = { color: raw };
    const custom = input.customizePoint?.({
      seriesIndex: 0,
      seriesName: '',
      pointIndex: geo.index,
      argument: entry.argument,
      value: entry.value,
      source: entry.source,
    });
    if (custom !== null && custom !== undefined)
      style = { ...style, ...custom };
    if (style !== undefined) styles.set(geo.index, style);
    const percentOfFirst = first > 0 ? entry.value / first : 0;
    const percentOfPrevious =
      previous === undefined || previous.value <= 0
        ? 1
        : entry.value / previous.value;
    const valueText = format(entry.value);
    items.push({
      index: geo.index,
      key: String(geo.index),
      path: geo.path,
      color: style?.color ?? palette[geo.index % palette.length],
      label: String(entry.argument ?? ''),
      valueText:
        style?.description === undefined
          ? valueText
          : `${valueText}, ${style.description}`,
      payload: {
        index: geo.index,
        argument: entry.argument,
        value: entry.value,
        percentOfFirst,
        percentOfPrevious,
        source: entry.source,
      },
      geometry: geo,
      ...(style?.description !== undefined
        ? { description: style.description }
        : {}),
    });
  }

  const labels: OgeFunnelLabelVm[] = [];
  if (labelsVisible) {
    // outside labels: one column, pushed apart vertically
    let lastY = -Infinity;
    const ordered = outside
      ? [...items].sort((a, b) => a.geometry.cy - b.geometry.cy)
      : items;
    for (const vm of ordered) {
      const style = styles.get(vm.index);
      if (style?.label?.visible === false) continue;
      if (labelOptions?.showForZero === false && vm.payload.value === 0)
        continue;
      const info: ChartLabelInfo<T> = {
        seriesIndex: 0,
        seriesName: '',
        pointIndex: vm.index,
        argument: vm.payload.argument,
        value: vm.payload.value,
        percent: vm.payload.percentOfFirst,
        source: vm.payload.source,
        text: formatOgeChartMessage(input.messages.visuals.item, {
          name: vm.label,
          value: format(vm.payload.value),
        }),
      };
      const text =
        style?.label?.text ??
        (labelOptions?.format !== undefined
          ? labelOptions.format(info)
          : info.text);
      const base = {
        text,
        seriesIndex: 0,
        pointIndex: vm.index,
        seriesName: '',
        argument: vm.payload.argument,
        value: vm.payload.value,
        key: vm.key,
      };
      if (outside) {
        const y = Math.max(vm.geometry.cy + 4, lastY + 15);
        lastY = y;
        const edgeX = rtl ? vm.geometry.leftX : vm.geometry.rightX;
        const labelX = rtl
          ? pad + labelColumn - 6
          : input.width - pad - labelColumn + 6;
        labels.push({
          ...base,
          x: labelX,
          y,
          anchor: rtl ? 'end' : 'start',
          inside: false,
          textColor: null,
          connector:
            labelOptions?.connector === false
              ? null
              : `${Math.round(edgeX * 100) / 100},${Math.round(vm.geometry.cy * 100) / 100} ${labelX + (rtl ? 4 : -4)},${y - 4}`,
        });
        continue;
      }
      const height = vm.geometry.bottom - vm.geometry.top;
      const box = chartLabelBox({
        x: vm.geometry.cx,
        y: vm.geometry.cy + 4,
        text,
        anchor: 'middle',
      });
      // too small a stage for its text
      if (height < 14 || box.w > vm.geometry.midWidth - 6) continue;
      labels.push({
        ...base,
        x: vm.geometry.cx,
        y: vm.geometry.cy + 4,
        anchor: 'middle',
        inside: true,
        textColor: chartContrastText(vm.color),
        connector: null,
      });
    }
  }

  return {
    items,
    labels,
    legendItems: items.map((vm) => ({
      index: vm.index,
      name: vm.label,
      color: vm.color,
    })),
    ariaLabel: ogeFormatMessage(
      input.type === 'pyramid'
        ? input.messages.visuals.pyramidLabel
        : input.messages.visuals.funnelLabel,
      { title: input.title ?? '', count: items.length },
      input.locale,
    ).trim(),
  };
}

export interface OgeFunnelTooltipVm {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly rows: readonly string[];
}

/** The hover balloon of stage `index`: value, share of first and of previous. */
export function funnelTooltip<T>(
  scene: OgeFunnelScene<T>,
  index: number | null,
  messages: OgeChartsMessages,
  locale: string | undefined,
): OgeFunnelTooltipVm | null {
  if (index === null) return null;
  const vm = scene.items.find((item) => item.index === index);
  if (vm === undefined) return null;
  const rows = [vm.valueText];
  if (vm.index > 0) {
    rows.push(
      formatOgeChartMessage(messages.visuals.percentOfFirst, {
        percent: percentText(vm.payload.percentOfFirst, locale),
      }),
      formatOgeChartMessage(messages.visuals.percentOfPrevious, {
        percent: percentText(vm.payload.percentOfPrevious, locale),
      }),
    );
  }
  return {
    x: vm.geometry.cx + 12,
    y: vm.geometry.cy,
    label: vm.label,
    rows,
  };
}

/**
 * The screen-reader table: stage, value, share of the first stage
 * (`headers` include the row-header column).
 */
export function funnelSrTable<T>(
  scene: OgeFunnelScene<T>,
  messages: OgeChartsMessages,
  locale: string | undefined,
): {
  readonly headers: readonly string[];
  readonly rows: readonly {
    readonly argText: string;
    readonly cells: readonly string[];
  }[];
} {
  return {
    headers: [
      messages.aria.argumentHeader,
      messages.visuals.valueHeader,
      messages.visuals.shareHeader,
    ],
    rows: scene.items.map((vm) => ({
      argText: vm.label,
      cells: [
        vm.valueText,
        formatOgeChartMessage(messages.visuals.percentOfFirst, {
          percent: percentText(vm.payload.percentOfFirst, locale),
        }),
      ],
    })),
  };
}

/** The live-region text of the active stage. */
export function funnelAnnouncement<T>(
  scene: OgeFunnelScene<T>,
  index: number,
  messages: OgeChartsMessages,
  locale: string | undefined,
): string {
  const vm = scene.items.find((item) => item.index === index);
  if (vm === undefined) return '';
  const text = formatOgeChartMessage(messages.visuals.item, {
    name: vm.label,
    value: vm.valueText,
  });
  return vm.index > 0
    ? `${text}, ${formatOgeChartMessage(messages.visuals.percentOfFirst, {
        percent: percentText(vm.payload.percentOfFirst, locale),
      })}`
    : text;
}

/** Toggles one index in a selection. */
export function toggleChartIndex(
  current: readonly number[],
  index: number,
): number[] {
  return current.includes(index)
    ? current.filter((entry) => entry !== index)
    : [...current, index];
}
