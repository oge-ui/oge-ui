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
  pieLabelText,
  pieSelectedAnnouncement,
  pieTooltip,
  pieValueText,
  togglePieSlice,
  type OgeChartFieldExpr,
  type OgeChartLegendClickEvent,
  type OgeChartLegendItem,
  type OgeChartLegendOptions,
  type OgeChartPieSliceEvent,
  type OgeChartSmallValuesGrouping,
  type OgeChartsMessages,
} from '@oge-ui/charts-engine';
import { useOgeChartsConfig } from './charts-config';
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
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** The `ref` handle of `<OgePieChart>`. */
export interface OgePieChartHandle {
  /** The live SVG root — what the image exporters serialize. */
  getSvgElement(): SVGSVGElement;
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
    renderLegendItem,
  } = props;
  const dataSource = props.dataSource ?? EMPTY;
  const smallValuesGrouping = useStable(props.smallValuesGrouping ?? null);
  const legend = useStable<OgeChartLegendOptions>(props.legend ?? NO_OPTIONS);
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  /* the engine's view model (ADR 0003): slices, labels, geometry */
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
        palette,
        width: size.width,
        height: size.height,
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
      palette,
      size.width,
      size.height,
    ],
  );
  const tooltipVm = tooltipEnabled
    ? pieTooltip(scene, hoverIndex, locale)
    : null;
  const isSelected = (index: number): boolean => selectedSlices.includes(index);

  const toggleSelection = (index: number): void => {
    const vm = scene.slices.find((entry) => entry.slice.index === index);
    const event: OgeChartLegendClickEvent = {
      seriesIndex: index,
      seriesName: vm?.label ?? '',
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
    }),
    [],
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
        {legend.visible !== false && scene.slices.length > 0 ? (
          <ul className="oge-chart-legend" aria-label={msg.aria.legendLabel}>
            {scene.slices.map((vm) => (
              <li key={vm.slice.index}>
                <button
                  type="button"
                  className="oge-chart-legend-btn"
                  aria-pressed={isSelected(vm.slice.index)}
                  onClick={() => toggleSelection(vm.slice.index)}
                >
                  {renderLegendItem ? (
                    renderLegendItem({
                      name: vm.label,
                      color: vm.color,
                      hidden: false,
                    })
                  ) : (
                    <>
                      <span
                        className="oge-chart-legend-marker"
                        style={{ backgroundColor: vm.color }}
                      />
                      <span className="oge-chart-legend-text">{vm.label}</span>
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
                key={vm.slice.index}
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
                onMouseEnter={() => setHoverIndex(vm.slice.index)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            ))}
            {showLabels
              ? scene.labels.map((label) => (
                  <Fragment key={label.sliceIndex}>
                    <polyline
                      className="oge-chart-pie-connector"
                      points={`${label.arcX},${label.arcY} ${label.labelX},${label.labelY}`}
                    />
                    <text
                      className="oge-chart-axis-label"
                      x={label.labelX + (label.side === 'end' ? 4 : -4)}
                      y={label.labelY + 4}
                      textAnchor={label.side === 'end' ? 'start' : 'end'}
                    >
                      {pieLabelText(scene, label.sliceIndex)}
                    </text>
                  </Fragment>
                ))
              : null}
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
        <tbody>
          {scene.slices.map((vm) => (
            <tr key={vm.slice.index}>
              <th scope="row">{vm.label}</th>
              <td>{pieValueText(vm, locale)}</td>
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
 * outside labels with connectors, small-value grouping, an interactive
 * legend, a hover tooltip and selection with slice explode. Commercial.
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
