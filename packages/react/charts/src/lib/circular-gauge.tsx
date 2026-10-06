'use client';

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  type CSSProperties,
  type ReactElement,
} from 'react';
import {
  GAUGE_BAR_LENGTH,
  buildCircularGaugeScene,
  type OgeChartAnimationOptions,
  type OgeChartPrintOptions,
  type OgeChartsMessages,
  type OgeChartValueRange,
  type OgeCircularGaugeIndicator,
  type OgeGaugeScaleOptions,
} from '@oge-ui/charts-engine';
import { cx, useStable } from './hooks';
import { useChartVisual, useGaugeSweep } from './visual-hooks';
import { ChartSrRows, ChartTick } from './visual-parts';

const EMPTY: readonly never[] = [];
const NO_OPTIONS = {};

/** Props shared by the circular and the linear gauge. */
export interface OgeGaugeBaseProps {
  /** The reading; `null` draws the scale alone. */
  readonly value?: number | null;
  /** `min`/`max`, tick intervals, label visibility and format. */
  readonly scale?: OgeGaugeScaleOptions;
  /** Coloured bands; a `label` is spoken with the value. */
  readonly ranges?: readonly OgeChartValueRange[];
  /** Value text and `aria-valuetext`; default the locale number. */
  readonly valueFormat?: (value: number) => string;
  /** Indicator / bar colour; default the accent. */
  readonly color?: string;
  /** Where the bar indicator starts; default the scale minimum. */
  readonly barBase?: number;
  /** Secondary readings drawn as small markers. */
  readonly subvalues?: readonly number[];
  /** The value text. Default true. */
  readonly showValue?: boolean;
  /** The first-render sweep and value transitions; reduced motion wins. */
  readonly animation?: boolean | OgeChartAnimationOptions;
  readonly title?: string;
  readonly locale?: string;
  readonly messages?: Partial<OgeChartsMessages>;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** Props of `<OgeCircularGauge>` — the React face of `<oge-circular-gauge>`. */
export interface OgeCircularGaugeProps extends OgeGaugeBaseProps {
  /** `'needle'` (default), `'bar'` or `'marker'`. */
  readonly indicator?: OgeCircularGaugeIndicator;
  /** Degrees; 0 = 12 o'clock, clockwise. Default -120. */
  readonly startAngle?: number;
  /** Degrees. Default 120. */
  readonly endAngle?: number;
}

/** The `ref` handle of the gauges and the bullet chart. */
export interface OgeGaugeHandle {
  /** The live SVG root — what the image exporters serialize. */
  getSvgElement(): SVGSVGElement;
  /** Opens the browser's print dialog for the gauge alone. */
  print(options?: OgeChartPrintOptions): Promise<void>;
  /** Re-measures the container and re-reads the page direction. */
  refresh(): void;
}

/**
 * `<OgeCircularGauge>` — a dial on the shared charts engine: scale, ranges,
 * a needle / bar / marker indicator, subvalues and the value text; a
 * `role="meter"` with `aria-valuetext`. Commercial.
 *
 * ```tsx
 * <OgeCircularGauge value={72} scale={{ min: 0, max: 120 }} title="Speed" />
 * ```
 */
export const OgeCircularGauge = forwardRef<
  OgeGaugeHandle,
  OgeCircularGaugeProps
>(function OgeCircularGauge(props, ref): ReactElement {
  const value = props.value ?? null;
  const scale = useStable<OgeGaugeScaleOptions>(props.scale ?? NO_OPTIONS);
  const ranges = useStable(props.ranges ?? EMPTY);
  const subvalues = useStable(props.subvalues ?? EMPTY);
  const visual = useChartVisual({
    name: 'OgeCircularGauge',
    initialSize: { width: 300, height: 260 },
    hasData: value !== null,
    title: props.title,
    locale: props.locale,
    messages: props.messages,
    animation: props.animation,
    style: props.style,
  });
  const displayValue = useGaugeSweep(
    value,
    scale.min ?? 0,
    visual.animation.drawIn,
  );
  const { msg, locale, size } = visual;
  const scene = useMemo(
    () =>
      buildCircularGaugeScene({
        value,
        displayValue,
        subvalues,
        scale,
        ranges,
        barBase: props.barBase,
        showValue: props.showValue,
        valueFormat: props.valueFormat,
        startAngle: props.startAngle,
        endAngle: props.endAngle,
        indicator: props.indicator,
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
      props.startAngle,
      props.endAngle,
      props.indicator,
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
  const rotate = (angle: number): CSSProperties => ({
    transform: `rotate(${angle}deg)`,
    transformOrigin: scene.origin,
  });

  return (
    <div
      ref={visual.rootRef}
      className={cx(
        'oge-chart',
        'oge-gauge',
        'oge-circular-gauge',
        !visual.animation.transitions && 'oge-chart-static',
        props.className,
      )}
      style={visual.rootStyle}
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
          {scene.indicator === 'bar' ? (
            <>
              <path
                className="oge-gauge-track"
                d={scene.trackPath}
                strokeWidth={scene.barWidth}
              />
              <path
                className="oge-gauge-bar"
                d={scene.trackPath}
                pathLength={GAUGE_BAR_LENGTH}
                strokeWidth={scene.barWidth}
                style={{
                  strokeDasharray: scene.barDash,
                  ...(color ? { stroke: color } : {}),
                }}
              />
            </>
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
          {scene.subvalueAngles.map((angle, index) => (
            <path
              key={index}
              className="oge-gauge-subvalue"
              d={scene.subvaluePath}
              style={rotate(angle)}
            />
          ))}
          {scene.indicatorAngle !== null && scene.indicator === 'needle' ? (
            <>
              <path
                className="oge-gauge-needle"
                d={scene.needlePath}
                style={{
                  ...rotate(scene.indicatorAngle),
                  ...(color ? { fill: color } : {}),
                }}
              />
              <circle
                className="oge-gauge-hub"
                cx={scene.cx}
                cy={scene.cy}
                r={scene.hubRadius}
              />
            </>
          ) : null}
          {scene.indicatorAngle !== null && scene.indicator === 'marker' ? (
            <path
              className="oge-gauge-marker"
              d={scene.markerPath}
              style={{
                ...rotate(scene.indicatorAngle),
                ...(color ? { fill: color } : {}),
              }}
            />
          ) : null}
          {scene.valueText !== null ? (
            <text
              className="oge-gauge-value"
              x={scene.valueText.x}
              y={scene.valueText.y}
              textAnchor="middle"
              style={{ fontSize: `${scene.valueText.size}px` }}
            >
              {scene.valueText.text}
            </text>
          ) : null}
        </svg>
      </div>
      <ChartSrRows caption={msg.aria.tableCaption} rows={scene.srRows} />
    </div>
  );
});
