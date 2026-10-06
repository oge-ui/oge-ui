'use client';

import {
  forwardRef,
  useId,
  useImperativeHandle,
  useMemo,
  useState,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from 'react';
import {
  buildSunburstScene,
  chartHierarchySrTable,
  sunburstTooltip,
  type OgeChartHierarchyNodeEvent,
} from '@oge-ui/charts-engine';
import { cx, svgSafeId, useStable } from './hooks';
import {
  hierarchyHandlers,
  useHierarchyDrill,
  type OgeHierarchyChartHandle,
  type OgeHierarchyChartProps,
} from './treemap';
import { useChartVisual } from './visual-hooks';
import { ChartBreadcrumb, ChartSrTable } from './visual-parts';

const EMPTY: readonly never[] = [];

/** Props of `<OgeSunburstChart>` — the React face of `<oge-sunburst-chart>`. */
export interface OgeSunburstChartProps<
  T extends object = Record<string, unknown>,
> extends OgeHierarchyChartProps<T> {
  /** Centre hole as a fraction of the radius. Default 0.25. */
  readonly innerRadius?: number;
  /** Radians; 0 = 12 o'clock, clockwise. */
  readonly startAngle?: number;
  readonly onSegmentClick?: (event: OgeChartHierarchyNodeEvent<T>) => void;
}

function OgeSunburstChartInner<T extends object>(
  props: OgeSunburstChartProps<T>,
  ref: ForwardedRef<OgeHierarchyChartHandle>,
): ReactElement {
  const palette = useStable(props.palette);
  const tooltipEnabled = props.tooltipEnabled ?? true;
  const visual = useChartVisual({
    name: 'OgeSunburstChart',
    initialSize: { width: 400, height: 400 },
    hasData: (props.dataSource ?? EMPTY).length > 0,
    title: props.title,
    locale: props.locale,
    messages: props.messages,
    animation: props.animation,
    style: props.style,
  });
  const { msg, locale, size } = visual;
  const hintId = `oge-chart-visual-${svgSafeId(useId())}-hint`;
  const drill = useHierarchyDrill(props, msg);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const scene = useMemo(
    () =>
      buildSunburstScene<T>({
        hierarchy: drill.hierarchy,
        rootKey: drill.rootKey,
        maxDepth: props.maxDepth ?? Infinity,
        innerRadius: props.innerRadius ?? 0.25,
        startAngle: props.startAngle ?? 0,
        palette,
        showLabels: props.showLabels ?? true,
        valueFormat: props.valueFormat,
        title: props.title,
        width: size.width,
        height: size.height,
        locale,
        messages: msg,
      }),
    [
      drill.hierarchy,
      drill.rootKey,
      props.maxDepth,
      props.innerRadius,
      props.startAngle,
      palette,
      props.showLabels,
      props.valueFormat,
      props.title,
      size.width,
      size.height,
      locale,
      msg,
    ],
  );
  const srTable = useMemo(
    () =>
      chartHierarchySrTable(
        scene.segments.map((segment) => segment.node),
        scene.root,
        msg,
        locale,
        visual.tableLimit,
        props.valueFormat,
      ),
    [scene, msg, locale, visual.tableLimit, props.valueFormat],
  );
  const tooltip = tooltipEnabled
    ? sunburstTooltip(scene, hoverKey ?? drill.activeKey, locale)
    : null;
  const handlers = hierarchyHandlers(
    drill,
    scene.root,
    props,
    visual,
    (node) => {
      const segment = scene.segments.find((entry) => entry.key === node.key);
      if (segment !== undefined) props.onSegmentClick?.(segment.payload);
    },
  );

  useImperativeHandle(
    ref,
    (): OgeHierarchyChartHandle => ({
      getSvgElement: visual.getSvgElement,
      print: visual.print,
      refresh: visual.refresh,
      focus: visual.focus,
      drillTo: drill.drillTo,
      drillUp: handlers.drillUp,
    }),
    [visual, drill, handlers],
  );

  const drillDown = props.drillDown ?? true;
  return (
    <div
      ref={visual.rootRef}
      className={cx(
        'oge-chart',
        'oge-sunburst-chart',
        !visual.animation.transitions && 'oge-chart-static',
        props.className,
      )}
      style={visual.rootStyle}
    >
      {props.title ? (
        <div className="oge-chart-title">{props.title}</div>
      ) : null}
      {drillDown && scene.breadcrumb.length > 1 ? (
        <ChartBreadcrumb
          crumbs={scene.breadcrumb}
          label={msg.visuals.breadcrumbLabel}
          onCrumbClick={drill.drillTo}
        />
      ) : null}
      <div className="oge-chart-layout">
        <div
          ref={visual.plotWrapRef}
          className="oge-chart-plot-wrap"
          tabIndex={0}
          role="group"
          aria-label={scene.ariaLabel}
          aria-describedby={hintId}
          onKeyDown={handlers.onKeyDown}
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
              {scene.segments.map((segment) => (
                <path
                  key={segment.key}
                  className={cx(
                    'oge-sunburst-segment',
                    drill.activeKey === segment.key && 'oge-chart-item-active',
                  )}
                  d={segment.path}
                  style={{ fill: segment.fill }}
                  onClick={() => handlers.activate(segment.node)}
                  onMouseEnter={() => setHoverKey(segment.key)}
                  onMouseLeave={() => setHoverKey(null)}
                />
              ))}
              {scene.segments.map((segment) =>
                segment.label !== null ? (
                  <text
                    key={segment.key}
                    className="oge-chart-point-label oge-treemap-label"
                    x={segment.label.x}
                    y={segment.label.y + 4}
                    textAnchor="middle"
                    transform={`rotate(${segment.label.rotate} ${segment.label.x} ${segment.label.y})`}
                  >
                    {segment.label.text}
                  </text>
                ) : null,
              )}
            </g>
            {scene.holeRadius > 0 && scene.segments.length > 0 ? (
              <>
                <circle
                  className={cx(
                    'oge-sunburst-center',
                    scene.root.parent !== null && 'oge-sunburst-center-up',
                  )}
                  cx={scene.cx}
                  cy={scene.cy}
                  r={scene.holeRadius - 2}
                  onClick={handlers.drillUp}
                />
                {scene.center.name !== null ? (
                  <text
                    className="oge-sunburst-center-name"
                    x={scene.cx}
                    y={scene.cy}
                    textAnchor="middle"
                  >
                    {scene.center.name}
                  </text>
                ) : null}
                {scene.center.value !== null ? (
                  <text
                    className="oge-sunburst-center-value"
                    x={scene.cx}
                    y={scene.cy + 15}
                    textAnchor="middle"
                  >
                    {scene.center.value}
                  </text>
                ) : null}
              </>
            ) : null}
            {scene.segments.length === 0 ? (
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
              <span className="oge-chart-tooltip-row">{tooltip.valueText}</span>
            </div>
          ) : null}
        </div>
      </div>
      <ChartSrTable caption={msg.aria.tableCaption} table={srTable} />
      <div className="oge-chart-live" id={hintId}>
        {msg.visuals.drillHint}
      </div>
      <div className="oge-chart-live" aria-live="polite">
        {drill.announcement}
      </div>
    </div>
  );
}

/**
 * `<OgeSunburstChart>` — a hierarchy as rings around a centre, with radial
 * labels and drill-down (segment, centre, breadcrumb, keyboard).
 * Commercial.
 *
 * ```tsx
 * <OgeSunburstChart dataSource={org} valueField="headcount" />
 * ```
 */
export const OgeSunburstChart = forwardRef(OgeSunburstChartInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeSunburstChartProps<T> & { ref?: Ref<OgeHierarchyChartHandle> },
) => ReactElement;
