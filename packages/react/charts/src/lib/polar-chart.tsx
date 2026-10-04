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
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  buildPolarData,
  buildPolarScene,
  cartesianAriaLabel,
  formatOgeChartMessage,
  isChartPointSelected,
  mergeOgeChartsMessages,
  nextPolarSelection,
  polarKeyCommand,
  polarPointAnnouncement,
  polarPointIndex,
  polarSrRows,
  polarTooltip,
  printOgeChart,
  type OgeChartAxisOptions,
  type OgeChartPrintOptions,
  type OgeChartRenderLabel,
  type OgeChartLegendClickEvent,
  type OgeChartLegendItem,
  type OgeChartLegendOptions,
  type OgeChartPointEvent,
  type OgeChartPointRef,
  type OgeChartSeriesInput,
  type OgeChartsMessages,
  type OgePolarHover,
} from '@oge-ui/charts-engine';
import { useOgeChartsConfig } from './charts-config';
import { ChartDataLabel } from './data-label';
import { cx, useChartSize, useControllable, useStable } from './hooks';

const EMPTY: readonly never[] = [];
const NO_OPTIONS = {};

/** Props of `<OgePolarChart>` — the React face of `<oge-polar-chart>`. */
export interface OgePolarChartProps<
  T extends object = Record<string, unknown>,
> {
  readonly dataSource?: readonly T[];
  /** Supported polar types: `line`, `area`, `scatter`, `bar`, `radialBar`. */
  readonly series?: readonly OgeChartSeriesInput<T>[];
  readonly commonSeries?: Partial<OgeChartSeriesInput<T>>;
  /** `max` / `labelFormat` of the radial value axis. */
  readonly valueAxis?: OgeChartAxisOptions;
  /** Straight-segment (polygon) grid instead of circles. */
  readonly spider?: boolean;
  /** Radians; 0 = 12 o'clock, clockwise. */
  readonly startAngle?: number;
  readonly legend?: OgeChartLegendOptions;
  readonly tooltipEnabled?: boolean;
  readonly selectionMode?: 'point' | 'none';
  readonly palette?: readonly string[];
  readonly title?: string;
  readonly locale?: string;
  readonly messages?: Partial<OgeChartsMessages>;
  /** Selected points — controlled when provided. */
  readonly selectedPoints?: readonly OgeChartPointRef[];
  readonly defaultSelectedPoints?: readonly OgeChartPointRef[];
  readonly onSelectedPointsChange?: (
    points: readonly OgeChartPointRef[],
  ) => void;
  readonly onPointClick?: (event: OgeChartPointEvent<T>) => void;
  /** Cancelable: set `event.cancel = true` to veto the visibility toggle. */
  readonly onLegendClick?: (event: OgeChartLegendClickEvent) => void;
  /** Replaces a legend item's content (`*ogeChartLegendTemplate`). */
  readonly renderLegendItem?: (item: OgeChartLegendItem) => ReactNode;
  /** Replaces every data label's content (`*ogeChartLabelTemplate`). */
  readonly renderLabel?: (label: OgeChartRenderLabel) => ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** The `ref` handle of `<OgePolarChart>`. */
export interface OgePolarChartHandle {
  /** Focuses the keyboard-inspectable plot region. */
  focus(): void;
  /** The live SVG root — what the image exporters serialize. */
  getSvgElement(): SVGSVGElement;
  /** Opens the browser's print dialog for the chart alone. */
  print(options?: OgeChartPrintOptions): Promise<void>;
}

function OgePolarChartInner<T extends object>(
  props: OgePolarChartProps<T>,
  ref: ForwardedRef<OgePolarChartHandle>,
): ReactElement {
  const config = useOgeChartsConfig();
  const {
    spider = false,
    startAngle = 0,
    tooltipEnabled = true,
    selectionMode = 'none',
    title = '',
    renderLegendItem,
    renderLabel,
  } = props;
  const dataSource = props.dataSource ?? EMPTY;
  const series = useStable(props.series ?? EMPTY);
  const commonSeries = useStable(props.commonSeries ?? NO_OPTIONS);
  const valueAxis = useStable<OgeChartAxisOptions>(
    props.valueAxis ?? NO_OPTIONS,
  );
  const legend = useStable<OgeChartLegendOptions>(props.legend ?? NO_OPTIONS);
  const palette = useStable(props.palette);
  const messages = useStable(props.messages);
  const msg = useMemo(
    () => mergeOgeChartsMessages(config.messages, messages),
    [config.messages, messages],
  );
  const locale = props.locale ?? config.locale;

  const [selectedPoints, setSelectedPoints] = useControllable<
    readonly OgeChartPointRef[]
  >(
    props.selectedPoints,
    props.defaultSelectedPoints ?? EMPTY,
    props.onSelectedPointsChange,
  );
  const plotWrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size] = useChartSize(plotWrapRef, { width: 480, height: 360 });
  const [hover, setHover] = useState<OgePolarHover | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [activeArg, setActiveArg] = useState<number | null>(null);
  const [activeSeriesIndex, setActiveSeriesIndex] = useState(0);
  const [hiddenSeries, setHiddenSeries] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  /* the engine's view model (ADR 0003) */
  const data = useMemo(
    () =>
      buildPolarData<T>({ dataSource, series, commonSeries, messages: msg }),
    [dataSource, series, commonSeries, msg],
  );
  const scene = useMemo(
    () =>
      buildPolarScene<T>({
        data,
        valueAxis,
        spider,
        startAngle,
        palette,
        hiddenSeries,
        width: size.width,
        height: size.height,
        locale,
      }),
    [
      data,
      valueAxis,
      spider,
      startAngle,
      palette,
      hiddenSeries,
      size.width,
      size.height,
      locale,
    ],
  );
  const tooltipVm = tooltipEnabled ? polarTooltip(scene, hover) : null;
  const srRows = useMemo(
    () => polarSrRows(scene, config.a11yTableLimit ?? 50),
    [scene, config.a11yTableLimit],
  );
  const isSelected = (seriesIndex: number, pointIndex: number): boolean =>
    isChartPointSelected(selectedPoints, seriesIndex, pointIndex);

  const onLegendClick = (seriesIndex: number): void => {
    const willHide = !hiddenSeries.has(seriesIndex);
    const event: OgeChartLegendClickEvent = {
      seriesIndex,
      seriesName: data.seriesList[seriesIndex]?.name ?? '',
      willHide,
      cancel: false,
    };
    props.onLegendClick?.(event);
    if (event.cancel) return;
    const next = new Set(hiddenSeries);
    if (willHide) next.add(seriesIndex);
    else next.delete(seriesIndex);
    setHiddenSeries(next);
    setAnnouncement(
      formatOgeChartMessage(
        willHide
          ? msg.announcements.seriesHidden
          : msg.announcements.seriesShown,
        { series: event.seriesName },
      ),
    );
  };

  const onPlotKeydown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const command = polarKeyCommand(event.key, {
      argCount: data.categories.length,
      position: activeArg,
      seriesIndex: activeSeriesIndex,
      seriesCount: data.seriesList.length,
      isSeriesVisible: (index) => !hiddenSeries.has(index),
    });
    if (command === null) return;
    event.preventDefault();
    switch (command.type) {
      case 'argument':
        setActiveArg(command.position);
        setAnnouncement(
          polarPointAnnouncement(
            scene,
            msg,
            command.position,
            activeSeriesIndex,
          ),
        );
        return;
      case 'series':
        setActiveSeriesIndex(command.seriesIndex);
        if (activeArg !== null) {
          setAnnouncement(
            polarPointAnnouncement(scene, msg, activeArg, command.seriesIndex),
          );
        }
        return;
      case 'activate': {
        if (activeArg === null) return;
        const target = data.seriesList[activeSeriesIndex];
        const pointIndex = polarPointIndex(scene, activeSeriesIndex, activeArg);
        if (target === undefined || pointIndex === -1) return;
        props.onPointClick?.({
          seriesIndex: activeSeriesIndex,
          seriesName: target.name,
          pointIndex,
          point: target.points[pointIndex],
          event: event.nativeEvent,
        });
        if (selectionMode === 'point') {
          setSelectedPoints(
            nextPolarSelection(selectedPoints, activeSeriesIndex, pointIndex),
          );
        }
        return;
      }
      default:
        return;
    }
  };

  useImperativeHandle(
    ref,
    (): OgePolarChartHandle => ({
      focus() {
        plotWrapRef.current?.focus();
      },
      getSvgElement() {
        const svg = svgRef.current;
        if (svg === null) throw new Error('OgePolarChart is not mounted');
        return svg;
      },
      print(options) {
        return printOgeChart(this, { title, ...options });
      },
    }),
    [title],
  );

  const legendPosition = legend.position ?? 'bottom';
  const rootAriaLabel = cartesianAriaLabel(msg, title, data.seriesList.length);

  return (
    <div
      className={cx('oge-chart', 'oge-polar-chart', props.className)}
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
              <li key={item.seriesIndex}>
                <button
                  type="button"
                  className={cx(
                    'oge-chart-legend-btn',
                    item.hidden && 'oge-chart-legend-hidden',
                  )}
                  aria-pressed={!item.hidden}
                  onClick={() => onLegendClick(item.seriesIndex)}
                >
                  {renderLegendItem ? (
                    renderLegendItem({
                      name: item.name,
                      color: item.color,
                      hidden: item.hidden,
                      swatch: item.swatch,
                    })
                  ) : (
                    <>
                      <span
                        className="oge-chart-legend-marker"
                        style={{ background: item.swatch }}
                      />
                      <span className="oge-chart-legend-text">{item.name}</span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div
          ref={plotWrapRef}
          className="oge-chart-plot-wrap"
          tabIndex={0}
          role="group"
          aria-label={rootAriaLabel}
          onKeyDown={onPlotKeydown}
          onPointerLeave={() => setHover(null)}
        >
          <svg
            ref={svgRef}
            className="oge-chart-svg"
            role="img"
            aria-label={rootAriaLabel}
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
          >
            {/* radial-bar tracks, grid rings + spokes + tick labels */}
            {scene.tracks.map((track, index) => (
              <path
                key={`t${index}`}
                className="oge-chart-radial-track"
                d={track}
              />
            ))}
            {scene.rings.map((ring) => (
              <path
                key={ring.radius}
                className="oge-chart-grid"
                d={ring.path}
                fill="none"
              />
            ))}
            {scene.spokes.map((spoke) => (
              <Fragment key={spoke.index}>
                <line
                  className="oge-chart-grid"
                  x1={scene.cx}
                  y1={scene.cy}
                  x2={spoke.x}
                  y2={spoke.y}
                />
                <text
                  className="oge-chart-axis-label"
                  x={spoke.labelX}
                  y={spoke.labelY}
                  textAnchor={spoke.anchor}
                >
                  {spoke.label}
                </text>
              </Fragment>
            ))}
            {scene.rings.map((ring) => (
              <text
                key={ring.radius}
                className="oge-chart-axis-label"
                x={scene.cx + 4}
                y={scene.cy - ring.radius - 3}
              >
                {ring.label}
              </text>
            ))}
            {/* series */}
            {scene.renderSeries.map((vm) => (
              <Fragment key={vm.seriesIndex}>
                {vm.areaPathD !== null ? (
                  <path
                    className="oge-chart-area"
                    d={vm.areaPathD}
                    fill={vm.color}
                    opacity={vm.opacity * 0.3}
                  />
                ) : null}
                {vm.linePathD !== null ? (
                  <path
                    className="oge-chart-line"
                    d={vm.linePathD}
                    stroke={vm.color}
                    strokeWidth={vm.strokeWidth}
                    opacity={vm.opacity}
                    fill="none"
                  />
                ) : null}
                {vm.sectors.map((sector) => (
                  <path
                    key={sector.pointIndex}
                    className={cx(
                      'oge-chart-bar',
                      isSelected(vm.seriesIndex, sector.pointIndex) &&
                        'oge-chart-point-selected',
                    )}
                    d={sector.path}
                    fill={sector.color ?? vm.color}
                    opacity={vm.opacity * 0.85}
                    onMouseEnter={() =>
                      setHover({
                        seriesIndex: vm.seriesIndex,
                        pointIndex: sector.pointIndex,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
                {vm.markers.map((marker) => (
                  <circle
                    key={marker.pointIndex}
                    className={cx(
                      'oge-chart-marker',
                      isSelected(vm.seriesIndex, marker.pointIndex) &&
                        'oge-chart-point-selected',
                    )}
                    cx={marker.x}
                    cy={marker.y}
                    r={marker.r ?? 4}
                    fill={marker.color ?? vm.color}
                    onMouseEnter={() =>
                      setHover({
                        seriesIndex: vm.seriesIndex,
                        pointIndex: marker.pointIndex,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
                {vm.labels.map((label, index) => (
                  <ChartDataLabel
                    key={`l${index}`}
                    label={label}
                    render={renderLabel}
                  />
                ))}
              </Fragment>
            ))}
            {scene.empty ? (
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
              <span className="oge-chart-tooltip-arg">
                {tooltipVm.argument}
              </span>
              <span className="oge-chart-tooltip-row">
                <span
                  className="oge-chart-legend-marker"
                  style={{ backgroundColor: tooltipVm.color }}
                />
                {tooltipVm.seriesName}: {tooltipVm.valueText}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <table className="oge-chart-sr-table">
        <caption>{msg.aria.tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{msg.aria.argumentHeader}</th>
            {scene.legendItems.map((item) => (
              <th key={item.seriesIndex} scope="col">
                {item.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {srRows.map((row, rowIndex) => (
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
 * `<OgePolarChart>` — radar/polar charts on the shared engine: `line` /
 * `area` radar loops, `scatter` markers and `bar` sectors around a category
 * circle, with circular or spider grids, an interactive legend, tooltip,
 * selection and keyboard point inspection. Commercial.
 *
 * ```tsx
 * <OgePolarChart
 *   dataSource={skills}
 *   commonSeries={{ argumentField: 'skill' }}
 *   series={[{ type: 'area', valueField: 'ada', name: 'Ada' }]}
 *   spider
 *   style={{ height: 400 }}
 * />
 * ```
 */
export const OgePolarChart = forwardRef(OgePolarChartInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgePolarChartProps<T> & { ref?: Ref<OgePolarChartHandle> },
) => ReactElement;
