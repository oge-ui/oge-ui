'use client';

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  type ReactElement,
} from 'react';
import {
  GAUGE_BAR_LENGTH,
  buildLinearGaugeScene,
  type OgeGaugeOrientation,
  type OgeGaugeScaleOptions,
  type OgeLinearGaugeIndicator,
} from '@oge-ui/charts-engine';
import { cx, useStable } from './hooks';
import { useChartVisual, useGaugeSweep } from './visual-hooks';
import { ChartSrRows, ChartTick } from './visual-parts';
import type { OgeGaugeBaseProps, OgeGaugeHandle } from './circular-gauge';

const EMPTY: readonly never[] = [];
const NO_OPTIONS = {};

/** Props of `<OgeLinearGauge>` — the React face of `<oge-linear-gauge>`. */
export interface OgeLinearGaugeProps extends OgeGaugeBaseProps {
  readonly orientation?: OgeGaugeOrientation;
  /** `'bar'` (default) or `'marker'`. */
  readonly indicator?: OgeLinearGaugeIndicator;
  /** Mirrored layout; unset follows the page `dir`. */
  readonly rtlEnabled?: boolean;
}

/**
 * `<OgeLinearGauge>` — a horizontal or vertical scale with ranges, a bar or
 * marker indicator and subvalue ticks, mirrored in RTL; a `role="meter"`.
 * Commercial.
 *
 * ```tsx
 * <OgeLinearGauge value={64} indicator="marker" title="Tank level" />
 * ```
 */
export const OgeLinearGauge = forwardRef<OgeGaugeHandle, OgeLinearGaugeProps>(
  function OgeLinearGauge(props, ref): ReactElement {
    const value = props.value ?? null;
    const scale = useStable<OgeGaugeScaleOptions>(props.scale ?? NO_OPTIONS);
    const ranges = useStable(props.ranges ?? EMPTY);
    const subvalues = useStable(props.subvalues ?? EMPTY);
    const orientation = props.orientation ?? 'horizontal';
    const visual = useChartVisual({
      name: 'OgeLinearGauge',
      initialSize: { width: 400, height: 96 },
      hasData: value !== null,
      title: props.title,
      locale: props.locale,
      messages: props.messages,
      animation: props.animation,
      rtlEnabled: props.rtlEnabled,
      style: props.style,
    });
    const displayValue = useGaugeSweep(
      value,
      scale.min ?? 0,
      visual.animation.drawIn,
    );
    const { msg, locale, size, rtl } = visual;
    const scene = useMemo(
      () =>
        buildLinearGaugeScene({
          value,
          displayValue,
          subvalues,
          scale,
          ranges,
          barBase: props.barBase,
          showValue: props.showValue,
          valueFormat: props.valueFormat,
          orientation,
          indicator: props.indicator,
          rtl,
          title: props.title,
          width: size.width,
          height: size.height,
          locale,
          messages: msg,
        }),
      [
        value,
        displayValue,
        subvalues,
        scale,
        ranges,
        props.barBase,
        props.showValue,
        props.valueFormat,
        orientation,
        props.indicator,
        rtl,
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
    const color = props.color;
    const track = scene.track;

    return (
      <div
        ref={visual.rootRef}
        className={cx(
          'oge-chart',
          'oge-gauge',
          'oge-linear-gauge',
          orientation === 'vertical' && 'oge-linear-gauge-vertical',
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
          className="oge-chart-plot-wrap oge-gauge-meter"
          role="meter"
          aria-label={scene.aria.label}
          aria-valuenow={scene.aria.valueNow}
          aria-valuemin={scene.aria.valueMin}
          aria-valuemax={scene.aria.valueMax}
          aria-valuetext={scene.aria.valueText}
        >
          <svg
            ref={visual.svgRef}
            className="oge-chart-svg"
            aria-hidden="true"
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
          >
            {scene.ranges.map((range, index) => (
              <path
                key={index}
                className="oge-gauge-range"
                d={range.path}
                style={{ fill: range.color }}
              />
            ))}
            <line
              className="oge-gauge-track"
              x1={track.x1}
              y1={track.y1}
              x2={track.x2}
              y2={track.y2}
              strokeWidth={scene.barWidth}
            />
            {scene.indicator === 'bar' ? (
              <line
                className="oge-gauge-bar"
                x1={track.x1}
                y1={track.y1}
                x2={track.x2}
                y2={track.y2}
                pathLength={GAUGE_BAR_LENGTH}
                strokeWidth={scene.barWidth}
                style={{
                  strokeDasharray: scene.barDash,
                  ...(color ? { stroke: color } : {}),
                }}
              />
            ) : null}
            {scene.ticks.map((tick, index) => (
              <ChartTick key={index} tick={tick} minor={!tick.major} />
            ))}
            {scene.labels.map((label) => (
              <text
                key={label.value}
                className="oge-chart-axis-label oge-gauge-label"
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
              >
                {label.text}
              </text>
            ))}
            {scene.subvalues.map((sub, index) => (
              <line
                key={index}
                className="oge-gauge-subvalue"
                x1={sub.x1}
                y1={sub.y1}
                x2={sub.x2}
                y2={sub.y2}
              />
            ))}
            {scene.indicator === 'marker' && scene.markerOffset !== null ? (
              <path
                className="oge-gauge-marker"
                d={scene.markerPath}
                style={{
                  transform: scene.markerOffset,
                  ...(color ? { fill: color } : {}),
                }}
              />
            ) : null}
            {scene.valueText !== null ? (
              <text
                className="oge-gauge-value oge-gauge-value-linear"
                x={scene.valueText.x}
                y={scene.valueText.y}
                textAnchor={scene.valueText.anchor}
              >
                {scene.valueText.text}
              </text>
            ) : null}
          </svg>
        </div>
        <ChartSrRows caption={msg.aria.tableCaption} rows={scene.srRows} />
      </div>
    );
  },
);
