'use client';

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';
import {
  buildBulletScene,
  type OgeChartAnimationOptions,
  type OgeChartsMessages,
  type OgeChartValueRange,
  type OgeGaugeOrientation,
  type OgeGaugeScaleOptions,
} from '@oge-ui/charts-engine';
import { cx, useStable } from './hooks';
import { useChartVisual } from './visual-hooks';
import { ChartSrRows, ChartTick } from './visual-parts';
import type { OgeGaugeHandle } from './circular-gauge';

const EMPTY: readonly never[] = [];
const NO_OPTIONS = {};

/** Props of `<OgeBulletChart>` — the React face of `<oge-bullet-chart>`. */
export interface OgeBulletChartProps {
  /** The measure; `null` draws the bands and the target alone. */
  readonly value?: number | null;
  /** The comparative measure (the target marker). */
  readonly target?: number | null;
  /** Qualitative bands, low → high. */
  readonly ranges?: readonly OgeChartValueRange[];
  /** `min`/`max` default to 0 and the nice ceiling of the data. */
  readonly scale?: OgeGaugeScaleOptions;
  readonly orientation?: OgeGaugeOrientation;
  /** Value-bar colour; default the text colour. */
  readonly color?: string;
  /** Target-marker colour; default the text colour. */
  readonly targetColor?: string;
  readonly valueFormat?: (value: number) => string;
  /** Hovering shows the value and the target. Default true. */
  readonly tooltipEnabled?: boolean;
  /** Mirrored layout; unset follows the page `dir`. */
  readonly rtlEnabled?: boolean;
  readonly animation?: boolean | OgeChartAnimationOptions;
  readonly title?: string;
  readonly locale?: string;
  readonly messages?: Partial<OgeChartsMessages>;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/**
 * `<OgeBulletChart>` — Stephen Few's bullet graph: range bands, the value
 * bar and a target marker, horizontal or vertical, mirrored in RTL.
 * Commercial.
 *
 * ```tsx
 * <OgeBulletChart value={270} target={250} ranges={bands} title="Revenue" />
 * ```
 */
export const OgeBulletChart = forwardRef<OgeGaugeHandle, OgeBulletChartProps>(
  function OgeBulletChart(props, ref): ReactElement {
    const value = props.value ?? null;
    const target = props.target ?? null;
    const scale = useStable<OgeGaugeScaleOptions>(props.scale ?? NO_OPTIONS);
    const ranges = useStable(props.ranges ?? EMPTY);
    const orientation = props.orientation ?? 'horizontal';
    const tooltipEnabled = props.tooltipEnabled ?? true;
    const visual = useChartVisual({
      name: 'OgeBulletChart',
      initialSize: { width: 400, height: 64 },
      hasData: value !== null || target !== null,
      title: props.title,
      locale: props.locale,
      messages: props.messages,
      animation: props.animation,
      rtlEnabled: props.rtlEnabled,
      style: props.style,
    });
    const { msg, locale, size, rtl } = visual;
    const [hover, setHover] = useState(false);
    const scene = useMemo(
      () =>
        buildBulletScene({
          value,
          target,
          ranges,
          scale,
          orientation,
          rtl,
          valueFormat: props.valueFormat,
          title: props.title,
          width: size.width,
          height: size.height,
          locale,
          messages: msg,
        }),
      [
        value,
        target,
        ranges,
        scale,
        orientation,
        rtl,
        props.valueFormat,
        props.title,
        size.width,
        size.height,
        locale,
        msg,
      ],
    );
    useImperativeHandle(
      ref,
      (): OgeGaugeHandle => ({
        getSvgElement: visual.getSvgElement,
        print: visual.print,
        refresh: visual.refresh,
      }),
      [visual],
    );

    return (
      <div
        ref={visual.rootRef}
        className={cx(
          'oge-chart',
          'oge-bullet-chart',
          orientation === 'vertical' && 'oge-bullet-chart-vertical',
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
          ref={visual.plotWrapRef}
          className="oge-chart-plot-wrap"
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => setHover(false)}
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
              {scene.ranges.map((range, index) => (
                <rect
                  key={index}
                  className="oge-bullet-range"
                  x={range.x}
                  y={range.y}
                  width={range.width}
                  height={range.height}
                  style={{ fill: range.color }}
                />
              ))}
              {scene.bar !== null ? (
                <rect
                  className="oge-bullet-bar"
                  x={scene.bar.x}
                  y={scene.bar.y}
                  width={scene.bar.width}
                  height={scene.bar.height}
                  style={props.color ? { fill: props.color } : undefined}
                />
              ) : null}
              {scene.target !== null ? (
                <line
                  className="oge-bullet-target"
                  x1={scene.target.x1}
                  y1={scene.target.y1}
                  x2={scene.target.x2}
                  y2={scene.target.y2}
                  style={
                    props.targetColor
                      ? { stroke: props.targetColor }
                      : undefined
                  }
                />
              ) : null}
            </g>
            {scene.ticks.map((tick, index) => (
              <ChartTick key={index} tick={tick} />
            ))}
            {scene.labels.map((label) => (
              <text
                key={label.value}
                className="oge-chart-axis-label"
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
              >
                {label.text}
              </text>
            ))}
          </svg>
          {tooltipEnabled && hover ? (
            <div
              className="oge-chart-tooltip oge-bullet-tooltip"
              aria-hidden="true"
            >
              {props.title ? (
                <span className="oge-chart-tooltip-arg">{props.title}</span>
              ) : null}
              <span className="oge-chart-tooltip-row">{scene.valueText}</span>
              <span className="oge-chart-tooltip-row">{scene.targetText}</span>
            </div>
          ) : null}
        </div>
        <ChartSrRows caption={msg.aria.tableCaption} rows={scene.srRows} />
      </div>
    );
  },
);
