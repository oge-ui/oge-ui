'use client';

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type KeyboardEvent,
  type ReactElement,
  type Ref,
} from 'react';
import {
  buildHeatmapScene,
  chartGridKeyCommand,
  formatOgeChartMessage,
  heatmapAnnouncement,
  heatmapCell,
  heatmapSrTable,
  heatmapTooltip,
  type OgeChartAnimationOptions,
  type OgeChartColorScale,
  type OgeChartFieldExpr,
  type OgeChartHeatmapCellEvent,
  type OgeChartLegendOptions,
  type OgeChartsMessages,
  type OgeHeatmapCellVm,
} from '@oge-ui/charts-engine';
import { cx, useControllable, useStable } from './hooks';
import { useChartVisual } from './visual-hooks';
import { ChartColorLegend, ChartSrTable } from './visual-parts';
import type { OgeVisualChartHandle } from './funnel-chart';

const EMPTY: readonly never[] = [];
const NO_OPTIONS = {};

/** A cell position in the heatmap's selection. */
export interface OgeChartCellRef {
  readonly row: number;
  readonly column: number;
}

/** Props of `<OgeHeatmap>` — the React face of `<oge-heatmap>`. */
export interface OgeHeatmapProps<T extends object = Record<string, unknown>> {
  readonly dataSource?: readonly T[];
  /** Column category. Default `'x'`. */
  readonly xField?: OgeChartFieldExpr<T>;
  /** Row category. Default `'y'`. */
  readonly yField?: OgeChartFieldExpr<T>;
  /** Default `'value'`. */
  readonly valueField?: OgeChartFieldExpr<T>;
  readonly xCategories?: readonly unknown[];
  readonly yCategories?: readonly unknown[];
  readonly colorScale?: OgeChartColorScale;
  /** Default true. */
  readonly showLabels?: boolean;
  readonly valueFormat?: (value: number) => string;
  /** Default 2. */
  readonly cellGap?: number;
  /** Default `'bottom'`. */
  readonly xAxisPosition?: 'top' | 'bottom';
  /** The colour-scale legend: `visible`, `position`. */
  readonly legend?: OgeChartLegendOptions;
  readonly tooltipEnabled?: boolean;
  /** Selected cells — controlled when provided. */
  readonly selectedCells?: readonly OgeChartCellRef[];
  readonly defaultSelectedCells?: readonly OgeChartCellRef[];
  readonly onSelectedCellsChange?: (cells: readonly OgeChartCellRef[]) => void;
  readonly onCellClick?: (event: OgeChartHeatmapCellEvent<T>) => void;
  /** Mirrored layout; unset follows the page `dir`. */
  readonly rtlEnabled?: boolean;
  readonly animation?: boolean | OgeChartAnimationOptions;
  readonly title?: string;
  readonly locale?: string;
  readonly messages?: Partial<OgeChartsMessages>;
  readonly className?: string;
  readonly style?: CSSProperties;
}

function OgeHeatmapInner<T extends object>(
  props: OgeHeatmapProps<T>,
  ref: ForwardedRef<OgeVisualChartHandle>,
): ReactElement {
  const dataSource = props.dataSource ?? EMPTY;
  const xCategories = useStable(props.xCategories);
  const yCategories = useStable(props.yCategories);
  const colorScale = useStable(props.colorScale);
  const legend = useStable<OgeChartLegendOptions>(props.legend ?? NO_OPTIONS);
  const tooltipEnabled = props.tooltipEnabled ?? true;
  const visual = useChartVisual({
    name: 'OgeHeatmap',
    initialSize: { width: 480, height: 320 },
    hasData: dataSource.length > 0,
    title: props.title,
    locale: props.locale,
    messages: props.messages,
    animation: props.animation,
    rtlEnabled: props.rtlEnabled,
    style: props.style,
  });
  const { msg, locale, size, rtl } = visual;
  const [selected, setSelected] = useControllable<readonly OgeChartCellRef[]>(
    props.selectedCells,
    props.defaultSelectedCells ?? EMPTY,
    props.onSelectedCellsChange,
  );
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const scene = useMemo(
    () =>
      buildHeatmapScene<T>({
        dataSource,
        xField: props.xField ?? 'x',
        yField: props.yField ?? 'y',
        valueField: props.valueField ?? 'value',
        xCategories,
        yCategories,
        colorScale,
        showLabels: props.showLabels ?? true,
        valueFormat: props.valueFormat,
        cellGap: props.cellGap ?? 2,
        xAxisPosition: props.xAxisPosition ?? 'bottom',
        rtl,
        title: props.title,
        width: size.width,
        height: size.height,
        locale,
        messages: msg,
      }),
    [
      dataSource,
      props.xField,
      props.yField,
      props.valueField,
      xCategories,
      yCategories,
      colorScale,
      props.showLabels,
      props.valueFormat,
      props.cellGap,
      props.xAxisPosition,
      rtl,
      props.title,
      size.width,
      size.height,
      locale,
      msg,
    ],
  );
  const srTable = useMemo(
    () => heatmapSrTable(scene, msg, visual.tableLimit),
    [scene, msg, visual.tableLimit],
  );
  const tooltip = tooltipEnabled
    ? heatmapTooltip(scene, hoverKey ?? activeKey, size.width)
    : null;

  useImperativeHandle(
    ref,
    (): OgeVisualChartHandle => ({
      getSvgElement: visual.getSvgElement,
      print: visual.print,
      refresh: visual.refresh,
      focus: visual.focus,
    }),
    [visual],
  );

  const isSelected = (cell: OgeHeatmapCellVm<T>): boolean =>
    selected.some((r) => r.row === cell.row && r.column === cell.column);
  const onCellClick = (cell: OgeHeatmapCellVm<T>): void => {
    props.onCellClick?.(cell.payload);
    const was = isSelected(cell);
    setSelected(
      was
        ? selected.filter((r) => r.row !== cell.row || r.column !== cell.column)
        : [...selected, { row: cell.row, column: cell.column }],
    );
    if (!was) {
      setAnnouncement(
        formatOgeChartMessage(msg.announcements.selected, {
          series: scene.yCategories[cell.row] ?? '',
          argument: formatOgeChartMessage(msg.visuals.item, {
            name: scene.xCategories[cell.column] ?? '',
            value: cell.valueText,
          }),
        }),
      );
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const [row, column] =
      activeKey === null ? [null, null] : activeKey.split(':').map(Number);
    const command = chartGridKeyCommand(event.key, {
      rows: scene.rows,
      columns: scene.columns,
      row,
      column,
      ctrl: event.ctrlKey || event.metaKey,
      rtl,
    });
    if (command === null) return;
    event.preventDefault();
    if (command.type === 'move') {
      const cell = heatmapCell(scene, command.row, command.column);
      if (cell === undefined) return;
      setActiveKey(cell.key);
      setAnnouncement(heatmapAnnouncement(scene, cell, msg));
      return;
    }
    const cell =
      row === null || column === null
        ? undefined
        : heatmapCell(scene, row, column);
    if (cell !== undefined) onCellClick(cell);
  };

  const legendPosition = legend.position ?? 'bottom';
  return (
    <div
      ref={visual.rootRef}
      className={cx(
        'oge-chart',
        'oge-heatmap',
        !visual.animation.transitions && 'oge-chart-static',
        props.className,
      )}
      style={visual.rootStyle}
      dir={visual.dir}
    >
      {props.title ? (
        <div className="oge-chart-title">{props.title}</div>
      ) : null}
      <div
        className={cx(
          'oge-chart-layout',
          legendPosition === 'start' && 'oge-chart-legend-start',
          legendPosition === 'end' && 'oge-chart-legend-end',
          legendPosition === 'top' && 'oge-chart-legend-top',
        )}
      >
        {legend.visible !== false && scene.cells.length > 0 ? (
          <ChartColorLegend
            legend={scene.legend}
            label={msg.visuals.colorScaleLabel}
            rtl={rtl}
          />
        ) : null}
        <div
          ref={visual.plotWrapRef}
          className="oge-chart-plot-wrap"
          tabIndex={0}
          role="group"
          aria-label={scene.ariaLabel}
          onKeyDown={onKeyDown}
        >
          <svg
            ref={visual.svgRef}
            className="oge-chart-svg"
            role="img"
            aria-label={scene.ariaLabel}
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
          >
            <g
              className={
                visual.drawingIn ? 'oge-chart-visual-enter' : undefined
              }
            >
              {scene.cells.map((cell) => (
                <rect
                  key={cell.key}
                  className={cx(
                    'oge-heatmap-cell',
                    cell.empty && 'oge-heatmap-cell-empty',
                    isSelected(cell) && 'oge-chart-point-selected',
                    activeKey === cell.key && 'oge-chart-item-active',
                  )}
                  x={cell.x}
                  y={cell.y}
                  width={cell.width}
                  height={cell.height}
                  style={{ fill: cell.fill }}
                  onClick={() => onCellClick(cell)}
                  onMouseEnter={() => setHoverKey(cell.key)}
                  onMouseLeave={() => setHoverKey(null)}
                />
              ))}
              {scene.cells.map((cell) =>
                cell.labelText !== null ? (
                  <text
                    key={cell.key}
                    className="oge-chart-point-label"
                    x={cell.x + cell.width / 2}
                    y={cell.y + cell.height / 2 + 4}
                    textAnchor="middle"
                  >
                    {cell.labelText}
                  </text>
                ) : null,
              )}
            </g>
            {[...scene.xLabels, ...scene.yLabels].map((label, index) => (
              <text
                key={index}
                className="oge-chart-axis-label"
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
              >
                {label.text}
              </text>
            ))}
            {scene.cells.length === 0 ? (
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
          {tooltip !== null ? (
            <div
              className={cx(
                'oge-chart-tooltip',
                tooltip.flipX && 'oge-chart-tooltip-end-x',
              )}
              style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
              aria-hidden="true"
            >
              <span className="oge-chart-tooltip-arg">{tooltip.label}</span>
              <span className="oge-chart-tooltip-row">{tooltip.valueText}</span>
            </div>
          ) : null}
        </div>
      </div>
      <ChartSrTable caption={msg.aria.tableCaption} table={srTable} />
      <div className="oge-chart-live" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}

/**
 * `<OgeHeatmap>` — a category × category grid coloured through a colour
 * scale, with the colour legend, cell labels, tooltips, selection and
 * APG-grid-style keyboard cell navigation. Commercial.
 *
 * ```tsx
 * <OgeHeatmap dataSource={load} xField="hour" yField="day" valueField="tickets" />
 * ```
 */
export const OgeHeatmap = forwardRef(OgeHeatmapInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeHeatmapProps<T> & { ref?: Ref<OgeVisualChartHandle> },
) => ReactElement;
