'use client';

import {
  Fragment,
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  beginChartGesture,
  buildCartesianData,
  cartesianDragArgDelta,
  cartesianDataLabelAnchor,
  cartesianLabelTransform,
  cartesianPinchRange,
  cartesianPlotArgPx,
  cartesianSeriesEnterOrigin,
  cartesianSeriesPane,
  cartesianZoomRect,
  chartAnimationVars,
  chartPrefersReducedMotion,
  chartTouchAction,
  chartTouchGestures,
  createChartPinchTracker,
  detectChartRtl,
  observeChartRtl,
  resolveChartAnimation,
  type ChartGestureHandle,
  type ChartPinchTracker,
  type OgeChartAnimationOptions,
  type OgeChartPane,
  CHART_AXIS_LABEL_LINE_H,
  buildCartesianScene,
  createChartLabelMeasure,
  type OgeChartTextMeasure,
  cartesianActivePoints,
  cartesianAriaLabel,
  cartesianCrosshair,
  cartesianExportData,
  cartesianHoverAt,
  cartesianKeyCommand,
  cartesianNearestSeries,
  cartesianPanRange,
  cartesianPointAnnouncement,
  cartesianPointEventColor,
  cartesianSelectionRange,
  cartesianSrRows,
  cartesianTooltip,
  cartesianTooltipRowText,
  cartesianWheelRange,
  cartesianZoomTo,
  chartArgumentText,
  chartDragMode,
  chartMarkerRadius,
  chartSeriesGroupOpacity,
  chartWheelZoomEnabled,
  formatOgeChartMessage,
  isChartPointSelected,
  mergeOgeChartsMessages,
  nextChartSelection,
  printOgeChart,
  type OgeCartesianHoverState,
  type OgeChartPrintOptions,
  type OgeChartRenderLabel,
  type OgeCartesianScene,
  type OgeChartAnnotation,
  type OgeChartAxisOptions,
  type OgeChartCrosshairOptions,
  type OgeChartExportData,
  type OgeChartLegendClickEvent,
  type OgeChartLegendItem,
  type OgeChartLegendOptions,
  type OgeChartPointEvent,
  type OgeChartPointRef,
  type OgeChartRange,
  type OgeChartSeriesEvent,
  type OgeChartSeriesInput,
  type OgeChartStripLine,
  type OgeChartTooltipOptions,
  type OgeChartTooltipShowingEvent,
  type OgeChartsMessages,
} from '@oge-ui/charts-engine';
import { useOgeChartsConfig } from './charts-config';
import { ChartDataLabel } from './data-label';
import {
  cx,
  svgSafeId,
  useChartSize,
  useControllable,
  useStable,
} from './hooks';

const EMPTY: readonly never[] = [];
const NO_OPTIONS = {};

/** Props of `<OgeChart>` — the React face of `<oge-chart>`'s inputs and outputs. */
export interface OgeChartProps<T extends object = Record<string, unknown>> {
  /** Data items; never mutated. */
  readonly dataSource?: readonly T[];
  readonly series?: readonly OgeChartSeriesInput<T>[];
  /** Shared defaults merged under every series (dx commonSeriesSettings). */
  readonly commonSeries?: Partial<OgeChartSeriesInput<T>>;
  readonly argumentAxis?: OgeChartAxisOptions;
  readonly valueAxis?: OgeChartAxisOptions | readonly OgeChartAxisOptions[];
  readonly stripLines?: readonly OgeChartStripLine[];
  /** Text/point annotations anchored on the plot. */
  readonly annotations?: readonly OgeChartAnnotation[];
  readonly legend?: OgeChartLegendOptions;
  readonly tooltip?: OgeChartTooltipOptions;
  readonly crosshair?: OgeChartCrosshairOptions;
  readonly zoomEnabled?: 'none' | 'wheel' | 'drag' | 'both';
  readonly panEnabled?: boolean;
  readonly selectionMode?: 'point' | 'series' | 'none';
  readonly palette?: readonly string[];
  /**
   * Hover/selection transitions plus the series draw-in on the first render
   * (`{ enabled, duration, easing }`); `prefers-reduced-motion` always wins.
   */
  readonly animation?: boolean | OgeChartAnimationOptions;
  /**
   * Swaps the axes: the argument axis runs vertically, the value axis
   * horizontally — bars become horizontal bars, lines run top-down.
   */
  readonly rotated?: boolean;
  /**
   * Right-to-left layout (mirrored argument axis, value axes, legend,
   * tooltip and arrow keys); unset follows the `dir` of the page.
   */
  readonly rtlEnabled?: boolean;
  /** Plot areas stacked over the shared argument axis (price + volume). */
  readonly panes?: readonly OgeChartPane[];
  readonly title?: string;
  readonly subtitle?: string;
  readonly locale?: string;
  readonly messages?: Partial<OgeChartsMessages>;
  /** The zoom window (`null` = full extent) — controlled when provided. */
  readonly visualRange?: OgeChartRange | null;
  /** Uncontrolled initial zoom window. */
  readonly defaultVisualRange?: OgeChartRange | null;
  readonly onVisualRangeChange?: (range: OgeChartRange | null) => void;
  /** Selected points — controlled when provided. */
  readonly selectedPoints?: readonly OgeChartPointRef[];
  readonly defaultSelectedPoints?: readonly OgeChartPointRef[];
  readonly onSelectedPointsChange?: (
    points: readonly OgeChartPointRef[],
  ) => void;
  readonly onPointClick?: (event: OgeChartPointEvent<T>) => void;
  readonly onSeriesClick?: (event: OgeChartSeriesEvent) => void;
  /** Cancelable: set `event.cancel = true` to veto the visibility toggle. */
  readonly onLegendClick?: (event: OgeChartLegendClickEvent) => void;
  /** Cancelable: before the tooltip shows for a new argument. */
  readonly onTooltipShowing?: (event: OgeChartTooltipShowingEvent<T>) => void;
  /** After every render pass of the series. */
  readonly onDrawn?: () => void;
  /** Replaces the tooltip's content (`*ogeChartTooltipTemplate`). */
  readonly renderTooltip?: (
    points: readonly OgeChartPointEvent<T>[],
  ) => ReactNode;
  /** Replaces a legend item's content (`*ogeChartLegendTemplate`). */
  readonly renderLegendItem?: (item: OgeChartLegendItem) => ReactNode;
  /** Replaces an annotation's label, inside a `foreignObject` (`*ogeChartAnnotationTemplate`). */
  readonly renderAnnotation?: (note: { readonly text: string }) => ReactNode;
  /** Replaces every data label's content, inside a 120 × 22 px `foreignObject` (`*ogeChartLabelTemplate`). */
  readonly renderLabel?: (label: OgeChartRenderLabel) => ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** The `ref` handle of `<OgeChart>` — the Angular component's public methods. */
export interface OgeChartHandle<T extends object = Record<string, unknown>> {
  /** Programmatic zoom, clamped into the data bounds. */
  zoomToRange(range: OgeChartRange): void;
  /** Back to the full extent, announced. */
  resetZoom(): void;
  /** Clears the hover state (tooltip + crosshair). */
  hideTooltip(): void;
  /** Re-measures the container (ResizeObserver normally covers it). */
  refresh(): void;
  /** Focuses the keyboard-inspectable plot region. */
  focus(): void;
  /** Snapshot for exporters and custom pipelines. */
  getExportData(): OgeChartExportData<T>;
  /** The live SVG root — what the image exporters serialize. */
  getSvgElement(): SVGSVGElement;
  /** Opens the browser's print dialog for the chart alone (title above it). */
  print(options?: OgeChartPrintOptions): Promise<void>;
}

interface ZoomDrag {
  readonly startPx: number;
  readonly px: number;
}

function OgeChartInner<T extends object>(
  props: OgeChartProps<T>,
  ref: ForwardedRef<OgeChartHandle<T>>,
): ReactElement {
  const config = useOgeChartsConfig();
  const {
    zoomEnabled = 'none',
    panEnabled = false,
    selectionMode = 'none',
    title = '',
    subtitle = '',
    renderTooltip,
    renderLegendItem,
    renderAnnotation,
    renderLabel,
  } = props;
  const dataSource = props.dataSource ?? EMPTY;
  const series = useStable(props.series ?? EMPTY);
  const commonSeries = useStable(props.commonSeries ?? NO_OPTIONS);
  const argumentAxis = useStable<OgeChartAxisOptions>(
    props.argumentAxis ?? NO_OPTIONS,
  );
  const valueAxis = useStable(props.valueAxis ?? NO_OPTIONS);
  const stripLines = useStable(props.stripLines ?? EMPTY);
  const annotations = useStable(props.annotations ?? EMPTY);
  const legend = useStable<OgeChartLegendOptions>(props.legend ?? NO_OPTIONS);
  const tooltip = useStable<OgeChartTooltipOptions>(
    props.tooltip ?? NO_OPTIONS,
  );
  const crosshair = useStable<OgeChartCrosshairOptions>(
    props.crosshair ?? NO_OPTIONS,
  );
  const palette = useStable(props.palette);
  const messages = useStable(props.messages);
  const panes = useStable(props.panes ?? EMPTY);
  const animationOption = useStable(props.animation ?? true);
  const rotated = props.rotated === true;

  const msg = useMemo(
    () => mergeOgeChartsMessages(config.messages, messages),
    [config.messages, messages],
  );
  const locale = props.locale ?? config.locale;

  const [visualRange, setVisualRange] = useControllable<OgeChartRange | null>(
    props.visualRange,
    props.defaultVisualRange ?? null,
    props.onVisualRangeChange,
  );
  const [selectedPoints, setSelectedPoints] = useControllable<
    readonly OgeChartPointRef[]
  >(
    props.selectedPoints,
    props.defaultSelectedPoints ?? EMPTY,
    props.onSelectedPointsChange,
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const plotWrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  /* ---------------- orientation / animation ---------------- */

  // the page direction, read after mount (SSR-safe)
  const [autoRtl, setAutoRtl] = useState(false);
  useEffect(() => {
    setAutoRtl(detectChartRtl(rootRef.current));
    // follow a later `dir` flip (an app-wide language switch)
    return observeChartRtl(rootRef.current, setAutoRtl);
  }, []);
  const rtl = props.rtlEnabled ?? autoRtl;
  // measures label text in the chart's svg once it exists (real text boxes
  // for the label overlap / wrap decisions); the estimate until then
  const [measureLabel, setMeasureLabel] = useState<
    OgeChartTextMeasure | undefined
  >(undefined);
  useEffect(() => {
    const measure = createChartLabelMeasure(svgRef.current);
    setMeasureLabel(() => measure);
  }, []);
  const [reducedMotion] = useState(chartPrefersReducedMotion);
  const animation = useMemo(
    () => resolveChartAnimation(animationOption, reducedMotion),
    [animationOption, reducedMotion],
  );
  // true until the first-render draw-in has played
  const [entering, setEntering] = useState(true);
  const drawingIn = entering && animation.drawIn;
  const [size, refresh] = useChartSize(plotWrapRef, {
    width: 600,
    height: 400,
  });
  const clipId = `oge-chart-clip-${svgSafeId(useId())}`;

  /* ---------------- the engine's view model (ADR 0003) ---------------- */

  const argumentType = argumentAxis.type;
  const data = useMemo(
    () =>
      buildCartesianData<T>({
        dataSource,
        series,
        commonSeries,
        argumentType,
        messages: msg,
      }),
    [dataSource, series, commonSeries, argumentType, msg],
  );
  const [visibilityOverrides, setVisibilityOverrides] = useState<
    ReadonlyMap<number, boolean>
  >(() => new Map());
  const markerThreshold = config.markerThreshold;
  const scene: OgeCartesianScene<T> = useMemo(
    () =>
      buildCartesianScene<T>({
        data,
        argumentAxis,
        valueAxis,
        stripLines,
        annotations,
        palette,
        visualRange,
        visibilityOverrides,
        width: size.width,
        height: size.height,
        locale,
        markerThreshold,
        rotated,
        rtl,
        panes,
        measureLabel,
      }),
    [
      data,
      argumentAxis,
      valueAxis,
      stripLines,
      annotations,
      palette,
      visualRange,
      visibilityOverrides,
      size.width,
      size.height,
      locale,
      markerThreshold,
      rotated,
      rtl,
      panes,
      measureLabel,
    ],
  );

  // the draw-in runs once: from the first render with data, for `duration`
  const sceneEmpty = scene.empty;
  useEffect(() => {
    if (!entering || sceneEmpty) return undefined;
    const timer = setTimeout(() => setEntering(false), animation.duration + 50);
    return () => clearTimeout(timer);
  }, [entering, sceneEmpty, animation.duration]);

  /* ---------------- hover state ---------------- */

  const [activeArgPos, setActiveArgPos] = useState<number | null>(null);
  const [activeSeriesIndex, setActiveSeriesIndex] = useState(0);
  const [pointerY, setPointerY] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [hoveredLegend, setHoveredLegend] = useState<number | null>(null);
  const [zoomDrag, setZoomDrag] = useState<ZoomDrag | null>(null);
  const [tooltipCancelled, setTooltipCancelled] = useState(false);

  const hover = useMemo<OgeCartesianHoverState>(
    () => ({ activeArgPos, pointerY, activeSeriesIndex }),
    [activeArgPos, pointerY, activeSeriesIndex],
  );
  const shared = tooltip.shared === true;
  const activePoints = useMemo(
    () => cartesianActivePoints(scene, hover, shared),
    [scene, hover, shared],
  );
  const crosshairVm = cartesianCrosshair(scene, hover, crosshair);
  const tooltipVm = useMemo(
    () =>
      cartesianTooltip(
        scene,
        hover,
        activePoints,
        tooltip,
        zoomDrag !== null || tooltipCancelled,
      ),
    [scene, hover, activePoints, tooltip, zoomDrag, tooltipCancelled],
  );

  // Every handler reads the current render's values through this ref, so
  // the native listeners, the rAF callback and the gesture closures never
  // act on a stale scene.
  const latest = useRef({
    props,
    scene,
    hover,
    msg,
    locale,
    selectedPoints,
    selectionMode,
    visualRange,
    zoomDrag,
    shared,
    tooltip,
  });
  latest.current = {
    props,
    scene,
    hover,
    msg,
    locale,
    selectedPoints,
    selectionMode,
    visualRange,
    zoomDrag,
    shared,
    tooltip,
  };

  const announce = (
    template: string,
    tokens: Readonly<Record<string, string>>,
  ): void => setAnnouncement(formatOgeChartMessage(template, tokens));

  /* ---------------- drawn ---------------- */

  const renderSeries = scene.renderSeries;
  useEffect(() => {
    latest.current.props.onDrawn?.();
  }, [renderSeries]);

  /* ---------------- legend ---------------- */

  const legendVisible = legend.visible !== false;
  const legendPosition = legend.position ?? 'bottom';
  const legendInteractive = legend.interactive !== false;

  const onLegendClick = (seriesIndex: number): void => {
    if (!legendInteractive) return;
    const current = latest.current.scene;
    const willHide = current.visibility[seriesIndex] ?? false;
    const event: OgeChartLegendClickEvent = {
      seriesIndex,
      seriesName: current.data.seriesList[seriesIndex]?.name ?? '',
      willHide,
      cancel: false,
    };
    latest.current.props.onLegendClick?.(event);
    if (event.cancel) return;
    setVisibilityOverrides((previous) => {
      const next = new Map(previous);
      next.set(seriesIndex, !willHide);
      return next;
    });
    announce(
      willHide ? msg.announcements.seriesHidden : msg.announcements.seriesShown,
      { series: event.seriesName },
    );
  };

  /* ---------------- pointer ---------------- */

  const rafPending = useRef(false);
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (rafPending.current) return;
    rafPending.current = true;
    const svgRect = event.currentTarget.getBoundingClientRect();
    const plot = latest.current.scene.plot;
    const x = event.clientX - svgRect.left - plot.x;
    const y = event.clientY - svgRect.top - plot.y;
    requestAnimationFrame(() => {
      rafPending.current = false;
      const now = latest.current;
      const hit = cartesianHoverAt(now.scene, x, y);
      const changed = now.hover.activeArgPos !== hit.position;
      setActiveArgPos(hit.position);
      setPointerY(hit.pointerY);
      if (changed && hit.position !== null && now.tooltip.enabled !== false) {
        const showing: OgeChartTooltipShowingEvent<T> = {
          points: cartesianActivePoints(
            now.scene,
            {
              activeArgPos: hit.position,
              pointerY: hit.pointerY,
              activeSeriesIndex: now.hover.activeSeriesIndex,
            },
            now.shared,
          ),
          cancel: false,
        };
        now.props.onTooltipShowing?.(showing);
        setTooltipCancelled(showing.cancel);
      }
    });
  };

  const onPointerLeave = (): void => {
    setActiveArgPos(null);
    setPointerY(null);
  };

  /* ---------------- zoom / pan ---------------- */

  // A native, non-passive listener: React attaches `wheel` passively, and a
  // passive listener cannot `preventDefault()` the page scroll away.
  useEffect(() => {
    const svg = svgRef.current;
    if (svg === null) return undefined;
    const onWheel = (event: WheelEvent): void => {
      const now = latest.current;
      if (!chartWheelZoomEnabled(now.props.zoomEnabled ?? 'none')) return;
      const svgRect = svg.getBoundingClientRect();
      const x = event.clientX - svgRect.left - now.scene.plot.x;
      const y = event.clientY - svgRect.top - now.scene.plot.y;
      const next = cartesianWheelRange(now.scene, x, event.deltaY, y);
      if (next === null) return;
      event.preventDefault();
      setVisualRange(next);
      setAnnouncement(now.msg.announcements.zoomed);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [setVisualRange]);

  // the running one-finger / mouse gesture (a second finger cancels it)
  const activeGesture = useRef<ChartGestureHandle | null>(null);
  const pinchStart = useRef<{ range: OgeChartRange; rect: DOMRect } | null>(
    null,
  );
  const pinchRef = useRef<ChartPinchTracker | null>(null);
  // two fingers on the plot: pinch-zoom and two-finger pan
  const pinch = (): ChartPinchTracker => {
    pinchRef.current ??= createChartPinchTracker({
      onPinchStart: () => {
        activeGesture.current?.cancel();
        activeGesture.current = null;
        setZoomDrag(null);
        const svg = svgRef.current;
        if (svg === null) return;
        pinchStart.current = {
          range: latest.current.scene.effectiveRange,
          rect: svg.getBoundingClientRect(),
        };
      },
      onPinch: (startA, startB, a, b) => {
        const start = pinchStart.current;
        if (start === null) return;
        const now = latest.current.scene;
        const local = (point: { clientX: number; clientY: number }) => ({
          x: point.clientX - start.rect.left - now.plot.x,
          y: point.clientY - start.rect.top - now.plot.y,
        });
        const next = cartesianPinchRange(
          now,
          start.range,
          local(startA),
          local(startB),
          local(a),
          local(b),
        );
        if (next !== null) setVisualRange(next);
      },
      onPinchEnd: (cancelled) => {
        pinchStart.current = null;
        if (!cancelled) {
          setAnnouncement(latest.current.msg.announcements.zoomed);
        }
      },
    });
    return pinchRef.current;
  };
  useEffect(
    () => () => {
      pinchRef.current?.dispose();
      pinchRef.current = null;
    },
    [],
  );

  const onPlotPointerDown = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (
      event.pointerType === 'touch' &&
      chartTouchGestures(zoomEnabled, panEnabled)
    ) {
      // the second finger turns the gesture into a pinch
      const tracker = pinch();
      if (tracker.pointerDown(event.nativeEvent) || tracker.active) return;
    }
    if (event.button !== 0) return;
    const mode = chartDragMode(
      zoomEnabled,
      panEnabled,
      event.shiftKey,
      event.pointerType,
    );
    if (mode === null) return;
    const svgRect = event.currentTarget.getBoundingClientRect();
    const startPx = cartesianPlotArgPx(
      scene,
      event.clientX - svgRect.left - scene.plot.x,
      event.clientY - svgRect.top - scene.plot.y,
    );
    if (startPx === null) return;
    const startRange = scene.effectiveRange;
    let drag: ZoomDrag | null = null;
    activeGesture.current = beginChartGesture(event.nativeEvent, {
      onMove: (deltaX, deltaY) => {
        const now = latest.current.scene;
        if (mode === 'pan') {
          setVisualRange(cartesianPanRange(now, startRange, deltaX, deltaY));
        } else {
          drag = {
            startPx,
            px: startPx + cartesianDragArgDelta(now, deltaX, deltaY),
          };
          setZoomDrag(drag);
        }
      },
      onFinish: (commit, cancelled) => {
        activeGesture.current = null;
        setZoomDrag(null);
        if (mode === 'pan' || cancelled || !commit || drag === null) return;
        const range = cartesianSelectionRange(
          latest.current.scene,
          drag.startPx,
          drag.px,
        );
        if (range === null) return;
        setVisualRange(range);
        setAnnouncement(latest.current.msg.announcements.zoomed);
      },
    });
  };

  /* ---------------- selection / clicks ---------------- */

  const applySelection = (
    target: OgeChartPointEvent<T>,
    event: MouseEvent | KeyboardEvent,
  ): void => {
    const now = latest.current;
    const targetSeries = now.scene.data.seriesList[target.seriesIndex];
    const refs = nextChartSelection(
      now.selectionMode,
      now.selectedPoints,
      target,
      targetSeries?.points.length ?? 0,
      event.ctrlKey || event.metaKey,
    );
    if (refs === null) return;
    setSelectedPoints(refs);
    if (refs.length > 0) {
      announce(now.msg.announcements.selected, {
        series: target.seriesName,
        argument: chartArgumentText(
          now.scene.data.argKind,
          target.point,
          now.locale,
          now.msg.values,
        ),
      });
    }
  };

  const onPlotClick = (event: ReactMouseEvent<SVGSVGElement>): void => {
    if (activePoints.length === 0) return;
    const nearestIndex = cartesianNearestSeries(scene, hover);
    const nearest =
      activePoints.find((entry) => entry.seriesIndex === nearestIndex) ??
      activePoints[0];
    const payload: OgeChartPointEvent<T> = {
      ...nearest,
      event: event.nativeEvent,
    };
    props.onPointClick?.(payload);
    props.onSeriesClick?.({
      seriesIndex: nearest.seriesIndex,
      seriesName: nearest.seriesName,
      event: event.nativeEvent,
    });
    applySelection(nearest, event.nativeEvent);
  };

  /* ---------------- keyboard ---------------- */

  const announceActive = (position: number, seriesIndex: number): void => {
    const text = cartesianPointAnnouncement(scene, msg, position, seriesIndex);
    if (text !== null) setAnnouncement(text);
  };

  const onPlotKeydown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const command = cartesianKeyCommand(event.key, {
      argCount: scene.data.sortedArgs.length,
      position: activeArgPos,
      seriesIndex: activeSeriesIndex,
      seriesCount: scene.data.seriesList.length,
      isSeriesVisible: (index) => scene.visibility[index] === true,
      zoomed: scene.zoomed,
      rotated: scene.rotated,
      rtl: scene.rtl,
    });
    if (command === null) return;
    event.preventDefault();
    switch (command.type) {
      case 'argument':
        setActiveArgPos(command.position);
        if (command.clearPointer) setPointerY(null);
        announceActive(command.position, activeSeriesIndex);
        return;
      case 'series':
        setActiveSeriesIndex(command.seriesIndex);
        if (activeArgPos !== null) {
          announceActive(activeArgPos, command.seriesIndex);
        }
        return;
      case 'activate': {
        if (activeArgPos === null) return;
        const targetSeries = scene.data.seriesList[activeSeriesIndex];
        const pointIndex = scene.data.argIndex.pointIndexAt(
          activeArgPos,
          activeSeriesIndex,
        );
        if (targetSeries === undefined || pointIndex === -1) return;
        const target: OgeChartPointEvent<T> = {
          seriesIndex: activeSeriesIndex,
          seriesName: targetSeries.name,
          pointIndex,
          point: targetSeries.points[pointIndex],
          event: event.nativeEvent,
        };
        props.onPointClick?.(target);
        applySelection(target, event.nativeEvent);
        return;
      }
      case 'resetZoom':
        setVisualRange(null);
        setAnnouncement(msg.announcements.zoomReset);
        return;
    }
  };

  /* ---------------- handle ---------------- */

  useImperativeHandle(
    ref,
    (): OgeChartHandle<T> => ({
      zoomToRange(range) {
        setVisualRange(cartesianZoomTo(latest.current.scene, range));
      },
      resetZoom() {
        setVisualRange(null);
        setAnnouncement(latest.current.msg.announcements.zoomReset);
      },
      hideTooltip() {
        setActiveArgPos(null);
        setPointerY(null);
      },
      refresh() {
        refresh();
        setAutoRtl(detectChartRtl(rootRef.current));
      },
      focus() {
        plotWrapRef.current?.focus();
      },
      getExportData() {
        return cartesianExportData(
          latest.current.scene,
          latest.current.props.title ?? '',
        );
      },
      getSvgElement() {
        const svg = svgRef.current;
        if (svg === null) throw new Error('OgeChart is not mounted');
        return svg;
      },
      print(options) {
        return printOgeChart(this, {
          title: latest.current.props.title ?? '',
          ...options,
        });
      },
    }),
    [refresh, setVisualRange],
  );

  /* ---------------- render ---------------- */

  const { plot } = scene;
  const rootAriaLabel = cartesianAriaLabel(
    msg,
    title,
    scene.data.seriesList.length,
  );
  const srRows = useMemo(
    () => cartesianSrRows(scene, config.a11yTableLimit ?? 50),
    [scene, config.a11yTableLimit],
  );
  const zoomSelection =
    zoomDrag === null
      ? null
      : cartesianZoomRect(scene, zoomDrag.startPx, zoomDrag.px);
  const isSelected = (seriesIndex: number, pointIndex: number): boolean =>
    isChartPointSelected(selectedPoints, seriesIndex, pointIndex);
  const touchAction = chartTouchAction(scene, zoomEnabled, panEnabled);
  const rootStyle = {
    ...chartAnimationVars(animation),
    ...props.style,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={cx(
        'oge-chart',
        rotated && 'oge-chart-rotated',
        !animation.transitions && 'oge-chart-static',
        props.className,
      )}
      style={rootStyle}
      dir={
        props.rtlEnabled === undefined
          ? undefined
          : props.rtlEnabled
            ? 'rtl'
            : 'ltr'
      }
    >
      {title ? <div className="oge-chart-title">{title}</div> : null}
      {subtitle ? <div className="oge-chart-subtitle">{subtitle}</div> : null}
      <div
        className={cx(
          'oge-chart-layout',
          legendPosition === 'start' && 'oge-chart-legend-start',
          legendPosition === 'end' && 'oge-chart-legend-end',
          legendPosition === 'top' && 'oge-chart-legend-top',
        )}
      >
        {legendVisible && scene.legendItems.length > 0 ? (
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
                  disabled={!legendInteractive}
                  onClick={() => onLegendClick(item.seriesIndex)}
                  onMouseEnter={() => setHoveredLegend(item.seriesIndex)}
                  onMouseLeave={() => setHoveredLegend(null)}
                  onFocus={() => setHoveredLegend(item.seriesIndex)}
                  onBlur={() => setHoveredLegend(null)}
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
          onPointerLeave={onPointerLeave}
        >
          {/* keyboard interaction (arrows + Enter) lives on the focusable
              wrapper above; the svg click is the pointer equivalent */}
          <svg
            ref={svgRef}
            className={cx(
              'oge-chart-svg',
              touchAction === 'pan-x' && 'oge-chart-touch-pan-x',
              touchAction === 'pan-y' && 'oge-chart-touch-pan-y',
            )}
            role="img"
            aria-label={rootAriaLabel}
            width={scene.width}
            height={scene.height}
            viewBox={`0 0 ${scene.width} ${scene.height}`}
            onPointerMove={onPointerMove}
            onPointerDown={onPlotPointerDown}
            onClick={onPlotClick}
          >
            <defs>
              {scene.panes.map((pane) => (
                <clipPath key={pane.index} id={`${clipId}-${pane.index}`}>
                  <rect
                    x={pane.clip.x}
                    y={pane.clip.y}
                    width={pane.clip.w}
                    height={pane.clip.h}
                  />
                </clipPath>
              ))}
            </defs>
            <g transform={`translate(${plot.x},${plot.y})`}>
              {/* strips (bands) */}
              {scene.guides.map((guide, index) =>
                guide.kind === 'band' ? (
                  <rect
                    key={index}
                    className="oge-chart-strip"
                    x={guide.rect.x}
                    y={guide.rect.y}
                    width={guide.rect.w}
                    height={guide.rect.h}
                    fill={guide.color}
                  />
                ) : null,
              )}
              {/* grid */}
              {scene.gridLines.map((line, index) => (
                <line
                  key={index}
                  className={cx(
                    'oge-chart-grid',
                    line.minor && 'oge-chart-grid-minor',
                  )}
                  x1={line.x1}
                  x2={line.x2}
                  y1={line.y1}
                  y2={line.y2}
                />
              ))}
              {/* series: logical geometry inside the orientation frame */}
              <g
                className="oge-chart-plot-frame"
                transform={scene.frame.transform ?? undefined}
              >
                {renderSeries.map((rs) => (
                  <g
                    key={rs.seriesIndex}
                    clipPath={`url(#${clipId}-${cartesianSeriesPane(scene, rs.seriesIndex)})`}
                  >
                    <g
                      className={cx(
                        'oge-chart-series',
                        drawingIn && 'oge-chart-series-enter',
                      )}
                      style={
                        drawingIn
                          ? {
                              transformOrigin: cartesianSeriesEnterOrigin(
                                scene,
                                rs.seriesIndex,
                              ),
                            }
                          : undefined
                      }
                      opacity={chartSeriesGroupOpacity(
                        hoveredLegend,
                        rs.seriesIndex,
                      )}
                    >
                      {rs.areaPathD !== null ? (
                        <path
                          className="oge-chart-area"
                          d={rs.areaPathD}
                          fill={rs.color}
                          opacity={rs.opacity * 0.35}
                        />
                      ) : null}
                      {rs.extraPaths.map((extra, index) => (
                        <path
                          key={`x${index}`}
                          className={extra.cls}
                          d={extra.d}
                          fill={extra.fill ?? 'none'}
                          stroke={extra.stroke ?? undefined}
                          strokeWidth={extra.strokeWidth}
                          strokeDasharray={extra.dashArray ?? undefined}
                          opacity={extra.opacity}
                        />
                      ))}
                      {rs.linePathD !== null ? (
                        <path
                          className="oge-chart-line"
                          d={rs.linePathD}
                          stroke={rs.color}
                          strokeWidth={rs.strokeWidth}
                          strokeDasharray={rs.dashArray ?? undefined}
                          opacity={rs.opacity}
                          fill="none"
                        />
                      ) : null}
                      {rs.bars.map((bar, index) => (
                        <rect
                          key={index}
                          className={cx(
                            'oge-chart-bar',
                            bar.cls,
                            isSelected(rs.seriesIndex, bar.pointIndex) &&
                              'oge-chart-point-selected',
                          )}
                          x={bar.x}
                          y={bar.y}
                          width={bar.w}
                          height={bar.h}
                          fill={bar.color ?? rs.color}
                          stroke={bar.stroke ?? undefined}
                          opacity={rs.opacity}
                          rx="2"
                        />
                      ))}
                      {rs.candles.map((candle) => (
                        <Fragment key={candle.pointIndex}>
                          <line
                            className="oge-chart-candle-wick"
                            x1={candle.x}
                            x2={candle.x}
                            y1={candle.wickY1}
                            y2={candle.wickY2}
                          />
                          <rect
                            className={cx(
                              'oge-chart-candle',
                              !candle.rising && 'oge-chart-candle-falling',
                            )}
                            x={candle.x - candle.w / 2}
                            y={candle.bodyY}
                            width={candle.w}
                            height={candle.bodyH}
                            style={
                              candle.color ? { fill: candle.color } : undefined
                            }
                          />
                        </Fragment>
                      ))}
                      {rs.segments.map((seg, index) => (
                        <line
                          key={`s${index}`}
                          className={seg.cls}
                          x1={seg.x1}
                          y1={seg.y1}
                          x2={seg.x2}
                          y2={seg.y2}
                          style={seg.color ? { stroke: seg.color } : undefined}
                        />
                      ))}
                      {rs.markers.map((marker) => (
                        <circle
                          key={marker.pointIndex}
                          className={cx(
                            'oge-chart-marker',
                            rs.type === 'bubble' && 'oge-chart-bubble',
                            isSelected(rs.seriesIndex, marker.pointIndex) &&
                              'oge-chart-point-selected',
                          )}
                          cx={marker.x}
                          cy={marker.y}
                          r={chartMarkerRadius(marker, rs.type)}
                          fill={marker.color ?? rs.color}
                        />
                      ))}
                      {rs.dots.map((dot, index) => (
                        <circle
                          key={`d${index}`}
                          className="oge-chart-dot"
                          cx={dot.x}
                          cy={dot.y}
                          r={dot.r}
                          fill={dot.color ?? rs.color}
                        />
                      ))}
                      {rs.labels.map((label, index) => (
                        <ChartDataLabel
                          key={`l${index}`}
                          label={label}
                          render={renderLabel}
                          anchor={cartesianDataLabelAnchor(scene, label)}
                          baseline={scene.pointLabelBaseline}
                          transform={cartesianLabelTransform(
                            scene,
                            label.x,
                            label.y,
                          )}
                        />
                      ))}
                    </g>
                  </g>
                ))}
              </g>
              {/* constant lines / strip lines */}
              {scene.guides.map((guide, index) =>
                guide.kind === 'line' ? (
                  <line
                    key={index}
                    className={
                      guide.variant === 'constant'
                        ? 'oge-chart-constant-line'
                        : 'oge-chart-strip-line'
                    }
                    x1={guide.line.x1}
                    x2={guide.line.x2}
                    y1={guide.line.y1}
                    y2={guide.line.y2}
                    stroke={guide.color}
                    strokeWidth={guide.strokeWidth}
                    strokeDasharray={guide.dashArray ?? undefined}
                  />
                ) : null,
              )}
              {/* axis breaks */}
              {scene.breakMarkers.map((marker, index) => (
                <Fragment key={index}>
                  <path className="oge-chart-break-gap" d={marker.fillD} />
                  <path className="oge-chart-break-line" d={marker.lineD} />
                </Fragment>
              ))}
              {scene.guides.map((guide, index) =>
                guide.label !== null ? (
                  <text
                    key={index}
                    className={cx(
                      'oge-chart-strip-label',
                      guide.variant === 'constant' &&
                        'oge-chart-constant-label',
                    )}
                    x={guide.label.x}
                    y={guide.label.y}
                    textAnchor={guide.label.anchor}
                    fill={
                      guide.variant === 'constant' ? guide.color : undefined
                    }
                  >
                    {guide.label.text}
                  </text>
                ) : null,
              )}
              {/* crosshair */}
              {crosshairVm !== null ? (
                <>
                  <line
                    className="oge-chart-crosshair"
                    x1={crosshairVm.argLine.x1}
                    x2={crosshairVm.argLine.x2}
                    y1={crosshairVm.argLine.y1}
                    y2={crosshairVm.argLine.y2}
                  />
                  {crosshair.horizontal === true &&
                  crosshairVm.valueLine !== null ? (
                    <line
                      className="oge-chart-crosshair"
                      x1={crosshairVm.valueLine.x1}
                      x2={crosshairVm.valueLine.x2}
                      y1={crosshairVm.valueLine.y1}
                      y2={crosshairVm.valueLine.y2}
                    />
                  ) : null}
                </>
              ) : null}
              {/* zoom selection */}
              {zoomSelection !== null ? (
                <rect
                  className="oge-chart-zoom-rect"
                  x={zoomSelection.x}
                  y={zoomSelection.y}
                  width={zoomSelection.w}
                  height={zoomSelection.h}
                />
              ) : null}
              {/* annotations */}
              {scene.annotations.map((note, index) => (
                <Fragment key={index}>
                  {note.isPoint ? (
                    <>
                      <circle
                        className="oge-chart-annotation-dot"
                        cx={note.x}
                        cy={note.y}
                        r="4"
                        fill={note.color}
                      />
                      <line
                        className="oge-chart-annotation-connector"
                        x1={note.x}
                        y1={note.y}
                        x2={note.labelX}
                        y2={note.labelY}
                      />
                    </>
                  ) : null}
                  {renderAnnotation ? (
                    <foreignObject
                      x={note.labelX}
                      y={note.labelY - 14}
                      width="200"
                      height="60"
                      className="oge-chart-annotation-fo"
                    >
                      {renderAnnotation({ text: note.text })}
                    </foreignObject>
                  ) : (
                    <>
                      <rect
                        className="oge-chart-annotation-box"
                        x={note.labelX - 6}
                        y={note.labelY - 13}
                        width={note.labelW}
                        height="20"
                        rx="4"
                      />
                      <text
                        className="oge-chart-annotation-text"
                        x={note.labelX}
                        y={note.labelY + 1}
                      >
                        {note.text}
                      </text>
                    </>
                  )}
                </Fragment>
              ))}
              {/* axis lines + minor tick marks */}
              {scene.axisLines.map((line, index) => (
                <line
                  key={index}
                  className="oge-chart-axis-line"
                  x1={line.x1}
                  x2={line.x2}
                  y1={line.y1}
                  y2={line.y2}
                />
              ))}
              {scene.tickMarks.map((mark, index) => (
                <line
                  key={index}
                  className="oge-chart-tick-mark"
                  x1={mark.x1}
                  x2={mark.x2}
                  y1={mark.y1}
                  y2={mark.y2}
                />
              ))}
            </g>
            {/* axis labels + titles */}
            {scene.axisLabels.map((label, index) => (
              <text
                key={index}
                className={cx(
                  'oge-chart-axis-label',
                  label.axis === 'argument' && 'oge-chart-arg-label',
                )}
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
                transform={label.transform ?? undefined}
              >
                {label.lines === undefined
                  ? label.text
                  : label.lines.map((line, lineIndex) => (
                      <tspan
                        key={lineIndex}
                        x={label.x}
                        dy={lineIndex === 0 ? 0 : CHART_AXIS_LABEL_LINE_H}
                      >
                        {line}
                      </tspan>
                    ))}
              </text>
            ))}
            {scene.axisTitles.map((axisTitle, index) => (
              <text
                key={index}
                className="oge-chart-axis-title"
                x={axisTitle.x}
                y={axisTitle.y}
                transform={axisTitle.transform ?? undefined}
                textAnchor="middle"
              >
                {axisTitle.text}
              </text>
            ))}
            {scene.empty ? (
              <text
                className="oge-chart-no-data"
                x={scene.width / 2}
                y={scene.height / 2}
                textAnchor="middle"
              >
                {msg.noData}
              </text>
            ) : null}
          </svg>
          {/* tooltip */}
          {tooltipVm !== null ? (
            <div
              className={cx(
                'oge-chart-tooltip',
                tooltipVm.alignX === 'end' && 'oge-chart-tooltip-end-x',
                tooltipVm.alignY === 'end' && 'oge-chart-tooltip-end-y',
              )}
              style={{ left: `${tooltipVm.x}px`, top: `${tooltipVm.y}px` }}
              aria-hidden="true"
            >
              {renderTooltip ? (
                renderTooltip(tooltipVm.points)
              ) : (
                <>
                  <span className="oge-chart-tooltip-arg">
                    {tooltipVm.argumentText}
                  </span>
                  {tooltipVm.points.map((point) => (
                    <span
                      key={point.seriesIndex}
                      className="oge-chart-tooltip-row"
                    >
                      <span
                        className="oge-chart-legend-marker"
                        style={{
                          backgroundColor: cartesianPointEventColor(
                            scene,
                            point,
                          ),
                        }}
                      />
                      {cartesianTooltipRowText(scene, point)}
                    </span>
                  ))}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
      {/* screen-reader data table */}
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
 * `<OgeChart>` — the cartesian chart: line/spline/area/bar/stacked/
 * scatter/range/candlestick series on the same dependency-free SVG engine as
 * the Angular `<oge-chart>`, with zoom & pan, crosshair, shared tooltips, an
 * interactive legend and keyboard point inspection. Commercial (see LICENSE).
 *
 * ```tsx
 * <OgeChart
 *   dataSource={sales}
 *   series={[{ type: 'bar', argumentField: 'quarter', valueField: 'total' }]}
 *   title="Quarterly revenue"
 *   style={{ height: 380 }}
 * />
 * ```
 */
export const OgeChart = forwardRef(OgeChartInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeChartProps<T> & { ref?: Ref<OgeChartHandle<T>> },
) => ReactElement;
