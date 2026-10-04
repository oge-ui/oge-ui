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
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type Ref,
} from 'react';
import {
  beginChartGesture,
  buildRangeSelectorData,
  buildRangeSelectorScene,
  commitRangeSelection,
  mergeOgeChartsMessages,
  rangeCenteredAt,
  rangeHandleDragRange,
  rangeHandleKeyRange,
  rangeSelectorAnnouncement,
  rangeSelectorDeltaValue,
  rangeSelectorEffective,
  rangeSelectorLabel,
  rangeSelectorPeriods,
  rangeSelectorWindowPx,
  rangeWindowDragRange,
  type OgeChartCustomPeriod,
  type OgeChartPeriod,
  type OgeChartRange,
  type OgeChartSeriesInput,
  type OgeChartsMessages,
} from '@oge-ui/charts-engine';
import { useOgeChartsConfig } from './charts-config';
import { cx, useChartSize, useControllable, useStable } from './hooks';

const EMPTY: readonly never[] = [];

/** Props of `<OgeRangeSelector>` — the React face of `<oge-range-selector>`. */
export interface OgeRangeSelectorProps<
  T extends object = Record<string, unknown>,
> {
  readonly dataSource?: readonly T[];
  /** Background mini series (line/area recommended). */
  readonly series?: readonly OgeChartSeriesInput<T>[];
  /** `'time' | 'linear'`; auto-detects from the first argument when unset. */
  readonly scaleType?: 'time' | 'linear';
  readonly palette?: readonly string[];
  readonly locale?: string;
  readonly messages?: Partial<OgeChartsMessages>;
  /**
   * Period buttons above the strip: `'1M' | '3M' | '6M' | 'YTD' | '1Y' |
   * 'All'` (calendar months back from the data end) and custom
   * `{ label, range }` entries. Calendar periods only show on time scales.
   */
  readonly periods?: readonly (OgeChartPeriod | OgeChartCustomPeriod)[];
  /** The selected window (`null` = full range) — controlled when provided. */
  readonly value?: OgeChartRange | null;
  readonly defaultValue?: OgeChartRange | null;
  readonly onValueChange?: (value: OgeChartRange | null) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** The `ref` handle of `<OgeRangeSelector>`. */
export interface OgeRangeSelectorHandle {
  /** Back to the full extent (`value = null`). */
  reset(): void;
}

function OgeRangeSelectorInner<T extends object>(
  props: OgeRangeSelectorProps<T>,
  ref: ForwardedRef<OgeRangeSelectorHandle>,
): ReactElement {
  const config = useOgeChartsConfig();
  const dataSource = props.dataSource ?? EMPTY;
  const series = useStable(props.series ?? EMPTY);
  const palette = useStable(props.palette);
  const messages = useStable(props.messages);
  const scaleType = props.scaleType;
  const msg = useMemo(
    () => mergeOgeChartsMessages(config.messages, messages),
    [config.messages, messages],
  );
  const locale = props.locale ?? config.locale;
  const [value, setValue] = useControllable<OgeChartRange | null>(
    props.value,
    props.defaultValue ?? null,
    props.onValueChange,
  );
  const plotWrapRef = useRef<HTMLDivElement>(null);
  const [size] = useChartSize(plotWrapRef, { width: 600, height: 90 });
  const [announcement, setAnnouncement] = useState('');

  /* the engine's view model (ADR 0003) */
  const data = useMemo(
    () => buildRangeSelectorData<T>({ dataSource, series, scaleType }),
    [dataSource, series, scaleType],
  );
  const scene = useMemo(
    () =>
      buildRangeSelectorScene<T>({
        data,
        palette,
        width: size.width,
        height: size.height,
        locale,
      }),
    [data, palette, size.width, size.height, locale],
  );
  const effective = rangeSelectorEffective(data, value);
  const windowPx = rangeSelectorWindowPx(scene, effective);
  const labelOf = (point: number): string =>
    rangeSelectorLabel(data.kind, point, locale);
  const periods = useStable(props.periods ?? EMPTY);
  const periodButtons = useMemo(
    () => rangeSelectorPeriods(periods, data, value, msg),
    [periods, data, value, msg],
  );

  // the gesture closures outlive the render that started them
  const latest = useRef({ data, scene });
  latest.current = { data, scene };
  const commit = (range: OgeChartRange): OgeChartRange => {
    const next = commitRangeSelection(range, latest.current.data.bounds);
    setValue(next);
    return next;
  };

  const onHandlePointerDown = (
    side: 'start' | 'end',
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const startRange = effective;
    const scale = scene.scale;
    beginChartGesture(event.nativeEvent, {
      onMove: (deltaX) => {
        commit(
          rangeHandleDragRange(
            side,
            startRange,
            rangeSelectorDeltaValue(scale, deltaX),
          ),
        );
      },
      onFinish: (_commit, cancelled) => {
        if (cancelled) setValue(startRange);
      },
    });
  };

  const onWindowPointerDown = (
    event: ReactPointerEvent<SVGRectElement>,
  ): void => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const startRange = effective;
    const scale = scene.scale;
    beginChartGesture(event.nativeEvent, {
      onMove: (deltaX) => {
        commit(
          rangeWindowDragRange(
            startRange,
            rangeSelectorDeltaValue(scale, deltaX),
          ),
        );
      },
      onFinish: (_commit, cancelled) => {
        if (cancelled) setValue(startRange);
      },
    });
  };

  /** A click on the track centers the window there. */
  const onTrackPointerDown = (
    event: ReactPointerEvent<SVGSVGElement>,
  ): void => {
    if (event.button !== 0) return;
    const svgRect = event.currentTarget.getBoundingClientRect();
    const center = scene.scale.fromPx(event.clientX - svgRect.left);
    commit(rangeCenteredAt(effective, center));
  };

  const onHandleKeydown = (
    side: 'start' | 'end',
    event: ReactKeyboardEvent<HTMLDivElement>,
  ): void => {
    const next = rangeHandleKeyRange(side, event.key, effective, data.bounds);
    if (next === null) return;
    event.preventDefault();
    const committed = commit(next);
    setAnnouncement(
      rangeSelectorAnnouncement(
        msg,
        data.kind,
        rangeSelectorEffective(data, committed),
        locale,
      ),
    );
  };

  useImperativeHandle(
    ref,
    (): OgeRangeSelectorHandle => ({
      reset() {
        setValue(null);
      },
    }),
    [setValue],
  );

  return (
    <div
      className={cx('oge-chart', 'oge-range-selector', props.className)}
      style={props.style}
    >
      {periodButtons.length > 0 ? (
        <div
          className="oge-range-periods"
          role="group"
          aria-label={msg.periods.groupLabel}
        >
          {periodButtons.map((period) => (
            <button
              key={period.key}
              type="button"
              className={cx(
                'oge-range-period',
                period.active && 'oge-range-period-active',
              )}
              aria-pressed={period.active}
              title={period.label === period.text ? undefined : period.label}
              onClick={() => {
                setValue(period.range);
                setAnnouncement(
                  rangeSelectorAnnouncement(
                    msg,
                    data.kind,
                    rangeSelectorEffective(data, period.range),
                    locale,
                  ),
                );
              }}
            >
              {period.text}
            </button>
          ))}
        </div>
      ) : null}
      <div ref={plotWrapRef} className="oge-chart-plot-wrap oge-range-wrap">
        <svg
          className="oge-chart-svg"
          role="presentation"
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          onPointerDown={onTrackPointerDown}
        >
          {scene.backgroundSeries.map((vm) => (
            <Fragment key={vm.index}>
              {vm.areaPathD !== null ? (
                <path
                  className="oge-chart-area"
                  d={vm.areaPathD}
                  fill={vm.color}
                  opacity="0.25"
                />
              ) : null}
              {vm.linePathD !== null ? (
                <path
                  className="oge-chart-line"
                  d={vm.linePathD}
                  stroke={vm.color}
                  strokeWidth="1.5"
                  fill="none"
                />
              ) : null}
            </Fragment>
          ))}
          {/* shades outside the window */}
          <rect
            className="oge-range-shade"
            x="0"
            y="0"
            width={windowPx.start}
            height={scene.plotH}
          />
          <rect
            className="oge-range-shade"
            x={windowPx.end}
            y="0"
            width={size.width - windowPx.end}
            height={scene.plotH}
          />
          <rect
            className="oge-range-window"
            x={windowPx.start}
            y="0"
            width={windowPx.end - windowPx.start}
            height={scene.plotH}
            onPointerDown={onWindowPointerDown}
          />
          {scene.ticks.map((tick) => (
            <text
              key={tick.px}
              className="oge-chart-axis-label"
              x={tick.px}
              y={size.height - 4}
              textAnchor="middle"
            >
              {tick.label}
            </text>
          ))}
        </svg>
        <div
          className="oge-range-handle"
          role="slider"
          tabIndex={0}
          aria-label={msg.aria.rangeStart}
          aria-valuemin={data.bounds.min}
          aria-valuemax={effective.max}
          aria-valuenow={effective.min}
          aria-valuetext={labelOf(effective.min)}
          style={{ left: `${windowPx.start - 4}px` }}
          onPointerDown={(event) => onHandlePointerDown('start', event)}
          onKeyDown={(event) => onHandleKeydown('start', event)}
        />
        <div
          className="oge-range-handle"
          role="slider"
          tabIndex={0}
          aria-label={msg.aria.rangeEnd}
          aria-valuemin={effective.min}
          aria-valuemax={data.bounds.max}
          aria-valuenow={effective.max}
          aria-valuetext={labelOf(effective.max)}
          style={{ left: `${windowPx.end - 4}px` }}
          onPointerDown={(event) => onHandlePointerDown('end', event)}
          onKeyDown={(event) => onHandleKeydown('end', event)}
        />
      </div>
      <div className="oge-chart-live" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}

/**
 * `<OgeRangeSelector>` — the overview strip (dxRangeSelector parity): a
 * mini background chart with a draggable selection window and two resize
 * handles. Pair it with a chart by sharing one state between its `value` and
 * the chart's `visualRange`. Handles follow the WAI-ARIA slider pattern
 * (arrow keys adjust, Home/End jump, Escape mid-drag restores). Commercial.
 *
 * ```tsx
 * const [range, setRange] = useState<OgeChartRange | null>(null);
 * <OgeChart dataSource={sales} series={series} visualRange={range} onVisualRangeChange={setRange} />
 * <OgeRangeSelector dataSource={sales} series={mini} value={range} onValueChange={setRange} />
 * ```
 */
export const OgeRangeSelector = forwardRef(OgeRangeSelectorInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeRangeSelectorProps<T> & { ref?: Ref<OgeRangeSelectorHandle> },
) => ReactElement;
