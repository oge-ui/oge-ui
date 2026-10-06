'use client';

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from 'react';
import {
  buildSparklineScene,
  detectChartRtl,
  mergeOgeChartsMessages,
  observeChartRtl,
  sparklineIndexAt,
  sparklineTooltip,
  type OgeChartFieldExpr,
  type OgeChartsMessages,
  type OgeSparklineMarkers,
  type OgeSparklineType,
} from '@oge-ui/charts-engine';
import { useOgeChartsConfig } from './charts-config';
import {
  cx,
  useChartSize,
  useIsomorphicLayoutEffect,
  useStable,
} from './hooks';

const EMPTY: readonly never[] = [];

/** Props of `<OgeSparkline>` — the React face of `<oge-sparkline>`. */
export interface OgeSparklineProps<T extends object = Record<string, unknown>> {
  /** Numbers, or items read through `valueField` (`null` = a gap). */
  readonly dataSource?: readonly (T | number | null)[];
  /** Default `'value'`; ignored for plain numbers. */
  readonly valueField?: OgeChartFieldExpr<T>;
  /** Tooltip argument; default the point's position (1-based). */
  readonly argumentField?: OgeChartFieldExpr<T>;
  /** `'line'` (default), `'area'`, `'bar'` or `'winloss'`. */
  readonly type?: OgeSparklineType;
  /** Markers on the first / last / min / max points (`true` = all four). */
  readonly markers?: boolean | OgeSparklineMarkers;
  /** Win-loss: values above win, below lose, equal draw. Default 0. */
  readonly winlossThreshold?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  /** Line / area / positive-bar colour; default the accent. */
  readonly color?: string;
  /** Negative bars and losses; default the danger colour. */
  readonly negativeColor?: string;
  /** Default 1.5. */
  readonly lineWidth?: number;
  /** Hover tooltip (`argument: value`). Default false. */
  readonly tooltipEnabled?: boolean;
  readonly valueFormat?: (value: number) => string;
  /** Mirrors the argument direction; unset follows the page `dir`. */
  readonly rtlEnabled?: boolean;
  /** Prefix of the accessible label. */
  readonly title?: string;
  readonly locale?: string;
  readonly messages?: Partial<OgeChartsMessages>;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** The `ref` handle of `<OgeSparkline>`. */
export interface OgeSparklineHandle {
  /** The live SVG root — what the image exporters serialize. */
  getSvgElement(): SVGSVGElement;
}

function OgeSparklineInner<T extends object>(
  props: OgeSparklineProps<T>,
  ref: ForwardedRef<OgeSparklineHandle>,
): ReactElement {
  const config = useOgeChartsConfig();
  const messages = useStable(props.messages);
  const msg = useMemo(
    () => mergeOgeChartsMessages(config.messages, messages),
    [config.messages, messages],
  );
  const locale = props.locale ?? config.locale;
  const dataSource = props.dataSource ?? EMPTY;
  const markers = useStable(props.markers ?? false);
  const tooltipEnabled = props.tooltipEnabled ?? false;
  const lineWidth = props.lineWidth ?? 1.5;
  const rootRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size] = useChartSize(wrapRef, { width: 120, height: 32 });
  const [autoRtl, setAutoRtl] = useState(false);
  useIsomorphicLayoutEffect(() => {
    setAutoRtl(detectChartRtl(rootRef.current));
    return observeChartRtl(rootRef.current, setAutoRtl);
  }, []);
  const rtl = props.rtlEnabled ?? autoRtl;
  const [hoverIndex, setHoverIndex] = useState(-1);

  const scene = useMemo(
    () =>
      buildSparklineScene<T>({
        dataSource,
        valueField: props.valueField,
        argumentField: props.argumentField,
        type: props.type,
        markers,
        winlossThreshold: props.winlossThreshold,
        minValue: props.minValue,
        maxValue: props.maxValue,
        rtl,
        width: size.width,
        height: size.height,
        lineWidth,
        valueFormat: props.valueFormat,
        title: props.title,
        locale,
        messages: msg,
      }),
    [
      dataSource,
      props.valueField,
      props.argumentField,
      props.type,
      markers,
      props.winlossThreshold,
      props.minValue,
      props.maxValue,
      rtl,
      size.width,
      size.height,
      lineWidth,
      props.valueFormat,
      props.title,
      locale,
      msg,
    ],
  );

  useImperativeHandle(
    ref,
    (): OgeSparklineHandle => ({
      getSvgElement() {
        const svg = svgRef.current;
        if (svg === null) throw new Error('OgeSparkline is not mounted');
        return svg;
      },
    }),
    [],
  );

  const hoverPoint = scene.points[hoverIndex];
  const tooltip =
    tooltipEnabled && hoverIndex >= 0
      ? sparklineTooltip(
          scene,
          hoverIndex,
          size.width,
          locale,
          props.valueFormat,
        )
      : null;
  const barFill = (
    kind: 'positive' | 'negative' | 'draw',
  ): CSSProperties | undefined => {
    const fill =
      kind === 'negative'
        ? props.negativeColor
        : kind === 'positive'
          ? props.color
          : undefined;
    return fill ? { fill } : undefined;
  };
  const colorStyle = (prop: 'fill' | 'stroke'): CSSProperties | undefined =>
    props.color ? { [prop]: props.color } : undefined;

  return (
    <span
      ref={rootRef}
      className={cx('oge-sparkline', props.className)}
      style={props.style}
      dir={
        props.rtlEnabled === undefined
          ? undefined
          : props.rtlEnabled
            ? 'rtl'
            : 'ltr'
      }
    >
      {/* spans, not divs: a sparkline lives inside running text and cells */}
      <span
        ref={wrapRef}
        className="oge-sparkline-wrap"
        onPointerMove={(event) => {
          if (!tooltipEnabled || svgRef.current === null) return;
          const rect = svgRef.current.getBoundingClientRect();
          setHoverIndex(sparklineIndexAt(scene, event.clientX - rect.left));
        }}
        onPointerLeave={() => setHoverIndex(-1)}
      >
        <svg
          ref={svgRef}
          className="oge-sparkline-svg"
          role="img"
          aria-label={scene.ariaLabel}
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
        >
          {scene.areaPath ? (
            <path
              className="oge-sparkline-area"
              d={scene.areaPath}
              style={colorStyle('fill')}
            />
          ) : null}
          {scene.linePath ? (
            <path
              className="oge-sparkline-line"
              d={scene.linePath}
              strokeWidth={lineWidth}
              style={colorStyle('stroke')}
            />
          ) : null}
          {scene.bars.map((bar) => (
            <rect
              key={bar.index}
              className={cx(
                'oge-sparkline-bar',
                bar.kind === 'negative' && 'oge-sparkline-bar-negative',
                bar.kind === 'draw' && 'oge-sparkline-bar-draw',
              )}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              style={barFill(bar.kind)}
            />
          ))}
          {scene.markers.map((marker) => (
            <circle
              key={marker.index}
              className={`oge-sparkline-marker oge-sparkline-marker-${marker.kind}`}
              cx={marker.x}
              cy={marker.y}
              r="2.5"
            />
          ))}
          {hoverPoint !== undefined && hoverPoint.y !== null ? (
            <circle
              className="oge-sparkline-hover"
              cx={hoverPoint.x}
              cy={hoverPoint.y}
              r="3"
            />
          ) : null}
        </svg>
        {tooltip !== null ? (
          <span
            className={cx(
              'oge-sparkline-tooltip',
              tooltip.flip && 'oge-sparkline-tooltip-flip',
            )}
            style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
            aria-hidden="true"
          >
            {tooltip.text}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/**
 * `<OgeSparkline>` — a word-sized chart (`line`, `area`, `bar`, `winloss`)
 * with optional markers and tooltip; its own entry point
 * (`@oge-ui/react-charts/sparkline`) that never loads the cartesian chart.
 * Commercial.
 *
 * ```tsx
 * <OgeSparkline dataSource={[4, 7, 5, 9, 12, 10]} type="area" markers />
 * ```
 */
export const OgeSparkline = forwardRef(OgeSparklineInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeSparklineProps<T> & { ref?: Ref<OgeSparklineHandle> },
) => ReactElement;
