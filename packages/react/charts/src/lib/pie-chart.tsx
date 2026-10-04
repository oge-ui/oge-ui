'use client';

import {
  Fragment,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  buildPieScene,
  mergeOgeChartsMessages,
  pieAriaLabel,
  pieSelectedAnnouncement,
  pieSrTable,
  pieTooltip,
  printOgeChart,
  togglePieSlice,
  type OgeChartFieldExpr,
  type OgeChartLabelOptions,
  type OgeChartLegendClickEvent,
  type OgeChartLegendItem,
  type OgeChartLegendOptions,
  type OgeChartPieSliceEvent,
  type OgeChartPointCustomizer,
  type OgeChartPrintOptions,
  type OgeChartRenderLabel,
  type OgeChartSmallValuesGrouping,
  type OgeChartsMessages,
  type OgePieSeriesInput,
} from '@oge-ui/charts-engine';
import { useOgeChartsConfig } from './charts-config';
import { ChartDataLabel } from './data-label';
import { cx, useChartSize, useControllable, useStable } from './hooks';

const EMPTY: readonly never[] = [];
const NO_OPTIONS = {};

/** Props of `<OgePieChart>` — the React face of `<oge-pie-chart>`. */
export interface OgePieChartProps<T extends object = Record<string, unknown>> {
  /** One slice per item; negative values clamp to zero. */
  readonly dataSource?: readonly T[];
  /** Default `'argument'`. */
  readonly argumentField?: OgeChartFieldExpr<T>;
  /** Default `'value'`. */
  readonly valueField?: OgeChartFieldExpr<T>;
  readonly type?: 'pie' | 'doughnut';
  /** Doughnut hole as a fraction of the outer radius. Default 0.5. */
  readonly innerRadius?: number;
  /** Radians; 0 = 12 o'clock, clockwise. */
  readonly startAngle?: number;
  readonly smallValuesGrouping?: OgeChartSmallValuesGrouping | null;
  /** Label of the grouped tail slice. Default `'Others'`. */
  readonly othersLabel?: string;
  /** Outside labels with connectors. Default true. */
  readonly showLabels?: boolean;
  /** Data labels: position, format, zero handling, connectors, overlap. */
  readonly label?: OgeChartLabelOptions<T>;
  /** Per-slice colour read from the data. */
  readonly colorField?: OgeChartFieldExpr<T>;
  /** Per-slice colour / label overrides (wins over `colorField`). */
  readonly customizePoint?: OgeChartPointCustomizer<T>;
  /** Nested doughnut: one ring per entry (inner → outer). */
  readonly series?: readonly OgePieSeriesInput<T>[];
  readonly legend?: OgeChartLegendOptions;
  readonly tooltipEnabled?: boolean;
  readonly palette?: readonly string[];
  readonly title?: string;
  readonly locale?: string;
  readonly messages?: Partial<OgeChartsMessages>;
  /** Selected slice indexes (they explode) — controlled when provided. */
  readonly selectedSlices?: readonly number[];
  readonly defaultSelectedSlices?: readonly number[];
  readonly onSelectedSlicesChange?: (slices: readonly number[]) => void;
  readonly onSliceClick?: (event: OgeChartPieSliceEvent<T>) => void;
  /** Cancelable: set `event.cancel = true` to veto the selection toggle. */
  readonly onLegendClick?: (event: OgeChartLegendClickEvent) => void;
  /** Replaces a legend item's content (`*ogeChartLegendTemplate`). */
  readonly renderLegendItem?: (item: OgeChartLegendItem) => ReactNode;
  /** Replaces every data label's content (`*ogeChartLabelTemplate`). */
  readonly renderLabel?: (label: OgeChartRenderLabel) => ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** The `ref` handle of `<OgePieChart>`. */
export interface OgePieChartHandle {
  /** The live SVG root — what the image exporters serialize. */
  getSvgElement(): SVGSVGElement;
  /** Opens the browser's print dialog for the chart alone. */
  print(options?: OgeChartPrintOptions): Promise<void>;
}

function OgePieChartInner<T extends object>(
  props: OgePieChartProps<T>,
  ref: ForwardedRef<OgePieChartHandle>,
): ReactElement {
  const config = useOgeChartsConfig();
  const {
    argumentField = 'argument',
    valueField = 'value',
    type = 'pie',
    innerRadius = 0.5,
    startAngle = 0,
    othersLabel = 'Others',
    showLabels = true,
    tooltipEnabled = true,
    title = '',
    colorField,
    customizePoint,
    renderLegendItem,
    renderLabel,
  } = props;
  const dataSource = props.dataSource ?? EMPTY;
  const smallValuesGrouping = useStable(props.smallValuesGrouping ?? null);
  const legend = useStable<OgeChartLegendOptions>(props.legend ?? NO_OPTIONS);
  const label = useStable(props.label);
  const series = useStable(props.series ?? EMPTY);
  const palette = useStable(props.palette);
  const messages = useStable(props.messages);
  const msg = useMemo(
    () => mergeOgeChartsMessages(config.messages, messages),
    [config.messages, messages],
  );
  const locale = props.locale ?? config.locale;

  const [selectedSlices, setSelectedSlices] = useControllable<
    readonly number[]
  >(
    props.selectedSlices,
    props.defaultSelectedSlices ?? EMPTY,
    props.onSelectedSlicesChange,
  );
  const plotWrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size] = useChartSize(plotWrapRef, { width: 400, height: 300 });
  /** The hovered slice's `key` (ring-aware). */
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  /* the engine's view model (ADR 0003): slices, rings, labels, geometry */
  const scene = useMemo(
    () =>
      buildPieScene<T>({
        dataSource,
        argumentField,
        valueField,
        type,
        innerRadius,
        startAngle,
        smallValuesGrouping,
        othersLabel,
        showLabels,
        label,
        colorField,
        customizePoint,
        series,
        palette,
        width: size.width,
        height: size.height,
        locale,
      }),
    [
      dataSource,
      argumentField,
      valueField,
      type,
      innerRadius,
      startAngle,
      smallValuesGrouping,
      othersLabel,
      showLabels,
      label,
      colorField,
      customizePoint,
      series,
      palette,
      size.width,
      size.height,
      locale,
    ],
  );
  const srTable = useMemo(() => pieSrTable(scene, locale), [scene, locale]);
  const tooltipVm = tooltipEnabled ? pieTooltip(scene, hoverKey, locale) : null;
  const isSelected = (index: number): boolean => selectedSlices.includes(index);

  const toggleSelection = (index: number): void => {
    const item = scene.legendItems.find((entry) => entry.index === index);
    const event: OgeChartLegendClickEvent = {
      seriesIndex: index,
      seriesName: item?.name ?? '',
      willHide: false,
      cancel: false,
    };
    props.onLegendClick?.(event);
    if (event.cancel) return;
    setSelectedSlices(togglePieSlice(selectedSlices, index));
  };

  useImperativeHandle(
    ref,
    (): OgePieChartHandle => ({
      getSvgElement() {
        const svg = svgRef.current;
        if (svg === null) throw new Error('OgePieChart is not mounted');
        return svg;
      },
      print(options) {
        return printOgeChart(this, { title, ...options });
      },
    }),
    [title],
  );

  const legendPosition = legend.position ?? 'bottom';
  const rootAriaLabel = pieAriaLabel(msg, title, scene.slices.length);

  return (
    <div
      className={cx('oge-chart', 'oge-pie-chart', props.className)}
      style={props.style}
    >
      {title ? <div className="oge-chart-title">{title}</div> : null}
      <div
        className={cx(
          'oge-chart-layout',
          legendPosition === 'start' && 'oge-chart-legend-start',
          legendPosition === 'end' && 'oge-chart-legend-end',
          legendPosition === 'top' && 'oge-chart-legend-top',
        )}
      >
        {legend.visible !== false && scene.legendItems.length > 0 ? (
          <ul className="oge-chart-legend" aria-label={msg.aria.legendLabel}>
            {scene.legendItems.map((item) => (
              <li key={item.index}>
                <button
                  type="button"
                  className="oge-chart-legend-btn"
                  aria-pressed={isSelected(item.index)}
                  onClick={() => toggleSelection(item.index)}
                >
                  {renderLegendItem ? (
                    renderLegendItem({
                      name: item.name,
                      color: item.color,
                      hidden: false,
                      swatch: item.color,
                    })
                  ) : (
                    <>
                      <span
                        className="oge-chart-legend-marker"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="oge-chart-legend-text">{item.name}</span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div ref={plotWrapRef} className="oge-chart-plot-wrap">
          <svg
            ref={svgRef}
            className="oge-chart-svg"
            role="img"
            aria-label={rootAriaLabel}
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
          >
            {scene.slices.map((vm) => (
              <path
                key={vm.key}
                className={cx(
                  'oge-chart-pie-slice',
                  isSelected(vm.slice.index) && 'oge-chart-point-selected',
                )}
                d={isSelected(vm.slice.index) ? vm.explodedPath : vm.path}
                fill={vm.color}
                onClick={() => {
                  props.onSliceClick?.(vm.payload);
                  setSelectedSlices(
                    togglePieSlice(selectedSlices, vm.slice.index),
                  );
                  setAnnouncement(pieSelectedAnnouncement(msg, vm, locale));
                }}
                onMouseEnter={() => setHoverKey(vm.key)}
                onMouseLeave={() => setHoverKey(null)}
              />
            ))}
            {scene.labelVms.map((labelVm) => (
              <Fragment key={labelVm.key}>
                {labelVm.connector !== null ? (
                  <polyline
                    className="oge-chart-pie-connector"
                    points={labelVm.connector}
                  />
                ) : null}
                <ChartDataLabel
                  label={labelVm}
                  render={renderLabel}
                  className="oge-chart-axis-label oge-chart-pie-label"
                />
              </Fragment>
            ))}
            {scene.slices.length === 0 ? (
              <text
                className="oge-chart-no-data"
                x={size.width / 2}
                y={size.height / 2}
                textAnchor="middle"
              >
                {msg.noData}
              </text>
            ) : null}
          </svg>
          {tooltipVm !== null ? (
            <div
              className="oge-chart-tooltip"
              style={{ left: `${tooltipVm.x}px`, top: `${tooltipVm.y}px` }}
              aria-hidden="true"
            >
              <span className="oge-chart-tooltip-arg">{tooltipVm.label}</span>
              <span className="oge-chart-tooltip-row">
                {tooltipVm.valueText}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <table className="oge-chart-sr-table">
        <caption>{msg.aria.tableCaption}</caption>
        {srTable.headers !== null ? (
          <thead>
            <tr>
              <th scope="col">{msg.aria.argumentHeader}</th>
              {srTable.headers.map((header, index) => (
                <th key={index} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {srTable.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <th scope="row">{row.argText}</th>
              {row.cells.map((cell, index) => (
                <td key={index}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="oge-chart-live" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}

/**
 * `<OgePieChart>` — pie/doughnut on the shared engine: slice geometry,
 * nested doughnut rings, data labels (outside with connectors or inside the
 * ring), per-slice colours, small-value grouping, an interactive legend, a
 * hover tooltip and selection with slice explode. Commercial.
 *
 * ```tsx
 * <OgePieChart
 *   dataSource={browsers}
 *   argumentField="browser"
 *   valueField="share"
 *   type="doughnut"
 *   style={{ height: 360 }}
 * />
 * ```
 */
export const OgePieChart = forwardRef(OgePieChartInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgePieChartProps<T> & { ref?: Ref<OgePieChartHandle> },
) => ReactElement;
