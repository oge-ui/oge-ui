'use client';

import {
  Fragment,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  buildFunnelScene,
  chartListKeyCommand,
  formatOgeChartMessage,
  funnelAnnouncement,
  funnelSrTable,
  funnelTooltip,
  toggleChartIndex,
  type OgeChartAnimationOptions,
  type OgeChartFieldExpr,
  type OgeChartFunnelItemEvent,
  type OgeChartLabelOptions,
  type OgeChartLegendClickEvent,
  type OgeChartLegendItem,
  type OgeChartLegendOptions,
  type OgeChartPointCustomizer,
  type OgeChartPrintOptions,
  type OgeChartRenderLabel,
  type OgeChartsMessages,
  type OgeFunnelAlgorithm,
  type OgeFunnelItemVm,
  type OgeFunnelType,
} from '@oge-ui/charts-engine';
import { ChartDataLabel } from './data-label';
import { cx, useControllable, useStable } from './hooks';
import { useChartVisual } from './visual-hooks';
import { ChartSrTable } from './visual-parts';

const EMPTY: readonly never[] = [];
const NO_OPTIONS = {};

/** Props of `<OgeFunnelChart>` — the React face of `<oge-funnel-chart>`. */
export interface OgeFunnelChartProps<
  T extends object = Record<string, unknown>,
> {
  /** One stage per item; negative values clamp to zero. */
  readonly dataSource?: readonly T[];
  /** Default `'argument'`. */
  readonly argumentField?: OgeChartFieldExpr<T>;
  /** Default `'value'`. */
  readonly valueField?: OgeChartFieldExpr<T>;
  readonly colorField?: OgeChartFieldExpr<T>;
  readonly customizePoint?: OgeChartPointCustomizer<T>;
  /** `'funnel'` (default) or `'pyramid'`. */
  readonly type?: OgeFunnelType;
  /** `'dynamicSlope'` (default) or `'dynamicHeight'`. */
  readonly algorithm?: OgeFunnelAlgorithm;
  /** Default 0. */
  readonly neckWidth?: number;
  /** Default 0. */
  readonly neckHeight?: number;
  readonly inverted?: boolean;
  /** Default true. */
  readonly sortData?: boolean;
  /** Default 2. */
  readonly itemGap?: number;
  /** Default true. */
  readonly showLabels?: boolean;
  readonly label?: OgeChartLabelOptions<T>;
  readonly legend?: OgeChartLegendOptions;
  readonly tooltipEnabled?: boolean;
  readonly palette?: readonly string[];
  readonly valueFormat?: (value: number) => string;
  /** Selected stage indexes (drawing order) — controlled when provided. */
  readonly selectedItems?: readonly number[];
  readonly defaultSelectedItems?: readonly number[];
  readonly onSelectedItemsChange?: (items: readonly number[]) => void;
  readonly onItemClick?: (event: OgeChartFunnelItemEvent<T>) => void;
  /** Cancelable: set `event.cancel = true` to veto the selection toggle. */
  readonly onLegendClick?: (event: OgeChartLegendClickEvent) => void;
  readonly renderLegendItem?: (item: OgeChartLegendItem) => ReactNode;
  readonly renderLabel?: (label: OgeChartRenderLabel) => ReactNode;
  /** Mirrored layout; unset follows the page `dir`. */
  readonly rtlEnabled?: boolean;
  readonly animation?: boolean | OgeChartAnimationOptions;
  readonly title?: string;
  readonly locale?: string;
  readonly messages?: Partial<OgeChartsMessages>;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** The `ref` handle of the interactive non-cartesian charts. */
export interface OgeVisualChartHandle {
  getSvgElement(): SVGSVGElement;
  print(options?: OgeChartPrintOptions): Promise<void>;
  /** Re-measures the container and re-reads the page direction. */
  refresh(): void;
  /** Moves the keyboard focus to the plot. */
  focus(): void;
}

function OgeFunnelChartInner<T extends object>(
  props: OgeFunnelChartProps<T>,
  ref: ForwardedRef<OgeVisualChartHandle>,
): ReactElement {
  const dataSource = props.dataSource ?? EMPTY;
  const label = useStable(props.label);
  const legend = useStable<OgeChartLegendOptions>(props.legend ?? NO_OPTIONS);
  const palette = useStable(props.palette);
  const tooltipEnabled = props.tooltipEnabled ?? true;
  const visual = useChartVisual({
    name: 'OgeFunnelChart',
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
  const [selected, setSelected] = useControllable<readonly number[]>(
    props.selectedItems,
    props.defaultSelectedItems ?? EMPTY,
    props.onSelectedItemsChange,
  );
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const scene = useMemo(
    () =>
      buildFunnelScene<T>({
        dataSource,
        argumentField: props.argumentField ?? 'argument',
        valueField: props.valueField ?? 'value',
        colorField: props.colorField,
        customizePoint: props.customizePoint,
        type: props.type ?? 'funnel',
        algorithm: props.algorithm ?? 'dynamicSlope',
        neckWidth: props.neckWidth ?? 0,
        neckHeight: props.neckHeight ?? 0,
        inverted: props.inverted ?? false,
        sortData: props.sortData ?? true,
        itemGap: props.itemGap ?? 2,
        label,
        showLabels: props.showLabels ?? true,
        palette,
        rtl,
        valueFormat: props.valueFormat,
        title: props.title,
        width: size.width,
        height: size.height,
        locale,
        messages: msg,
      }),
    [
      dataSource,
      props.argumentField,
      props.valueField,
      props.colorField,
      props.customizePoint,
      props.type,
      props.algorithm,
      props.neckWidth,
      props.neckHeight,
      props.inverted,
      props.sortData,
      props.itemGap,
      label,
      props.showLabels,
      palette,
      rtl,
      props.valueFormat,
      props.title,
      size.width,
      size.height,
      locale,
      msg,
    ],
  );
  const srTable = useMemo(
    () => funnelSrTable(scene, msg, locale),
    [scene, msg, locale],
  );
  const tooltip = tooltipEnabled
    ? funnelTooltip(scene, hoverIndex ?? activeIndex, msg, locale)
    : null;
  const isSelected = (index: number): boolean => selected.includes(index);

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

  const onLegendClick = (index: number): void => {
    const item = scene.legendItems.find((entry) => entry.index === index);
    const event: OgeChartLegendClickEvent = {
      seriesIndex: index,
      seriesName: item?.name ?? '',
      willHide: false,
      cancel: false,
    };
    props.onLegendClick?.(event);
    if (event.cancel) return;
    setSelected(toggleChartIndex(selected, index));
  };
  const onItemClick = (item: OgeFunnelItemVm<T>): void => {
    props.onItemClick?.(item.payload);
    setSelected(toggleChartIndex(selected, item.index));
    setAnnouncement(
      formatOgeChartMessage(msg.announcements.selected, {
        series: item.label,
        argument: item.valueText,
      }),
    );
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const indexes = scene.items.map((item) => item.index);
    const position = activeIndex === null ? -1 : indexes.indexOf(activeIndex);
    const command = chartListKeyCommand(event.key, {
      count: indexes.length,
      index: position === -1 ? null : position,
      rtl,
    });
    if (command === null) return;
    event.preventDefault();
    if (command.type === 'move') {
      const index = indexes[command.index];
      setActiveIndex(index);
      setAnnouncement(funnelAnnouncement(scene, index, msg, locale));
      return;
    }
    const item = scene.items.find((entry) => entry.index === activeIndex);
    if (item !== undefined) onItemClick(item);
  };

  const legendPosition = legend.position ?? 'bottom';
  return (
    <div
      ref={visual.rootRef}
      className={cx(
        'oge-chart',
        'oge-funnel-chart',
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
        {legend.visible !== false && scene.legendItems.length > 0 ? (
          <ul className="oge-chart-legend" aria-label={msg.aria.legendLabel}>
            {scene.legendItems.map((item) => (
              <li key={item.index}>
                <button
                  type="button"
                  className="oge-chart-legend-btn"
                  aria-pressed={isSelected(item.index)}
                  onClick={() => onLegendClick(item.index)}
                >
                  {props.renderLegendItem ? (
                    props.renderLegendItem({
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
        <div
          ref={visual.plotWrapRef}
          className="oge-chart-plot-wrap"
          tabIndex={0}
          role="group"
          aria-label={scene.ariaLabel}
          onKeyDown={onKeyDown}
          onBlur={() => setActiveIndex(null)}
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
              {scene.items.map((item) => (
                <path
                  key={item.key}
                  className={cx(
                    'oge-funnel-item',
                    isSelected(item.index) && 'oge-chart-point-selected',
                    activeIndex === item.index && 'oge-chart-item-active',
                  )}
                  d={item.path}
                  style={{ fill: item.color }}
                  onClick={() => onItemClick(item)}
                  onMouseEnter={() => setHoverIndex(item.index)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              ))}
            </g>
            {scene.labels.map((labelVm) => (
              <Fragment key={labelVm.key}>
                {labelVm.connector !== null ? (
                  <polyline
                    className="oge-funnel-connector"
                    points={labelVm.connector}
                  />
                ) : null}
                <ChartDataLabel label={labelVm} render={props.renderLabel} />
              </Fragment>
            ))}
            {scene.items.length === 0 ? (
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
              className="oge-chart-tooltip"
              style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
              aria-hidden="true"
            >
              <span className="oge-chart-tooltip-arg">{tooltip.label}</span>
              {tooltip.rows.map((row, index) => (
                <span key={index} className="oge-chart-tooltip-row">
                  {row}
                </span>
              ))}
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
 * `<OgeFunnelChart>` — funnel and pyramid on the shared charts engine:
 * stages sized by value, a neck, inside or outside labels, conversion
 * rates in the tooltip and the sr table, a legend, selection and keyboard
 * stage inspection. Commercial.
 *
 * ```tsx
 * <OgeFunnelChart dataSource={pipeline} argumentField="stage" valueField="count" />
 * ```
 */
export const OgeFunnelChart = forwardRef(OgeFunnelChartInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeFunnelChartProps<T> & { ref?: Ref<OgeVisualChartHandle> },
) => ReactElement;
