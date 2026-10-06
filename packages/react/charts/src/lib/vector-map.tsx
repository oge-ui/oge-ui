'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type Ref,
} from 'react';
import {
  OGE_MAP_HOME_VIEW,
  beginChartGesture,
  buildMapScene,
  chartMapKeyCommand,
  createChartPinchTracker,
  formatOgeChartMessage,
  mapEnsureVisible,
  mapPanBy,
  mapRegionLabel,
  mapSrTable,
  mapViewTransform,
  mapZoomAt,
  type ChartPinchTracker,
  type OgeChartAnimationOptions,
  type OgeChartColorScale,
  type OgeChartFieldExpr,
  type OgeChartLegendOptions,
  type OgeChartMapRegionEvent,
  type OgeChartPrintOptions,
  type OgeChartsMessages,
  type OgeGeoJsonFeature,
  type OgeGeoJsonFeatureCollection,
  type OgeMapProjection,
  type OgeMapRegionVm,
  type OgeMapView,
} from '@oge-ui/charts-engine';
import { cx, svgSafeId, useControllable, useStable } from './hooks';
import { useChartVisual } from './visual-hooks';
import { ChartColorLegend, ChartSrTable } from './visual-parts';

const EMPTY: readonly never[] = [];
const NO_OPTIONS = {};

/** Props of `<OgeVectorMap>` — the React face of `<oge-vector-map>`. */
export interface OgeVectorMapProps<T extends object = Record<string, unknown>> {
  /** A GeoJSON `FeatureCollection` (`Polygon` / `MultiPolygon` features drawn). */
  readonly geoJson?: OgeGeoJsonFeatureCollection | null;
  /** `'mercator'` (default) or `'equirectangular'`. */
  readonly projection?: OgeMapProjection;
  /** A feature's key; default `feature.id`, then `properties.name`. */
  readonly regionKey?: (feature: OgeGeoJsonFeature) => string;
  /** Default `'name'`. */
  readonly nameField?: string;
  readonly dataSource?: readonly T[];
  /** Default `'key'`. */
  readonly keyField?: OgeChartFieldExpr<T>;
  /** Default `'value'`. */
  readonly valueField?: OgeChartFieldExpr<T>;
  readonly colorScale?: OgeChartColorScale;
  readonly showLabels?: boolean;
  readonly valueFormat?: (value: number) => string;
  readonly legend?: OgeChartLegendOptions;
  readonly tooltipEnabled?: boolean;
  /** Wheel, pinch, button and keyboard zoom plus drag pan. Default true. */
  readonly zoomEnabled?: boolean;
  /** Default 8. */
  readonly maxZoom?: number;
  /** Selected region keys — controlled when provided. */
  readonly selectedRegions?: readonly string[];
  readonly defaultSelectedRegions?: readonly string[];
  readonly onSelectedRegionsChange?: (keys: readonly string[]) => void;
  readonly onRegionClick?: (event: OgeChartMapRegionEvent<T>) => void;
  readonly animation?: boolean | OgeChartAnimationOptions;
  readonly title?: string;
  readonly locale?: string;
  readonly messages?: Partial<OgeChartsMessages>;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** The `ref` handle of `<OgeVectorMap>`. */
export interface OgeVectorMapHandle {
  getSvgElement(): SVGSVGElement;
  print(options?: OgeChartPrintOptions): Promise<void>;
  refresh(): void;
  focus(): void;
  zoomIn(): void;
  zoomOut(): void;
  resetZoom(): void;
}

function OgeVectorMapInner<T extends object>(
  props: OgeVectorMapProps<T>,
  ref: ForwardedRef<OgeVectorMapHandle>,
): ReactElement {
  const geoJson = props.geoJson ?? null;
  const dataSource = props.dataSource ?? EMPTY;
  const colorScale = useStable(props.colorScale);
  const legend = useStable<OgeChartLegendOptions>(props.legend ?? NO_OPTIONS);
  const tooltipEnabled = props.tooltipEnabled ?? true;
  const zoomEnabled = props.zoomEnabled ?? true;
  const maxZoom = props.maxZoom ?? 8;
  const showLabels = props.showLabels ?? true;
  const visual = useChartVisual({
    name: 'OgeVectorMap',
    initialSize: { width: 560, height: 340 },
    hasData: (geoJson?.features.length ?? 0) > 0,
    title: props.title,
    locale: props.locale,
    messages: props.messages,
    animation: props.animation,
    style: props.style,
  });
  const { msg, locale, size } = visual;
  const hintId = `oge-chart-visual-${svgSafeId(useId())}-hint`;
  const [selected, setSelected] = useControllable<readonly string[]>(
    props.selectedRegions,
    props.defaultSelectedRegions ?? EMPTY,
    props.onSelectedRegionsChange,
  );
  const [view, setView] = useState<OgeMapView>(OGE_MAP_HOME_VIEW);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [dragging, setDragging] = useState(false);
  const suppressClick = useRef(false);

  // the latest values for the native listeners
  const latest = useRef({ view, size, maxZoom, zoomEnabled });
  latest.current = { view, size, maxZoom, zoomEnabled };

  const scene = useMemo(
    () =>
      buildMapScene<T>({
        geoJson,
        projection: props.projection ?? 'mercator',
        regionKey: props.regionKey,
        nameField: props.nameField ?? 'name',
        dataSource,
        keyField: props.keyField ?? 'key',
        valueField: props.valueField ?? 'value',
        colorScale,
        showLabels,
        valueFormat: props.valueFormat,
        title: props.title,
        width: size.width,
        height: size.height,
        locale,
        messages: msg,
      }),
    [
      geoJson,
      props.projection,
      props.regionKey,
      props.nameField,
      dataSource,
      props.keyField,
      props.valueField,
      colorScale,
      showLabels,
      props.valueFormat,
      props.title,
      size.width,
      size.height,
      locale,
      msg,
    ],
  );
  const srTable = useMemo(
    () => mapSrTable(scene, msg, visual.tableLimit),
    [scene, msg, visual.tableLimit],
  );

  // wheel zoom: React's onWheel is passive — a native listener can preventDefault
  const svgRef = visual.svgRef;
  useEffect(() => {
    const svg = svgRef.current;
    if (svg === null) return undefined;
    const onWheel = (event: WheelEvent): void => {
      const {
        view: current,
        size: box,
        maxZoom: max,
        zoomEnabled: on,
      } = latest.current;
      if (!on) return;
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      setView(
        mapZoomAt(
          current,
          event.deltaY < 0 ? 1.25 : 1 / 1.25,
          event.clientX - rect.left,
          event.clientY - rect.top,
          box.width,
          box.height,
          max,
        ),
      );
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [svgRef]);

  // pinch: created on the effect's mount side so StrictMode's remount revives it
  const pinchRef = useRef<ChartPinchTracker | null>(null);
  useEffect(() => {
    let startView: OgeMapView | null = null;
    const tracker = createChartPinchTracker({
      onPinchStart: () => {
        startView = latest.current.view;
      },
      onPinch: (startA, startB, a, b) => {
        const svg = svgRef.current;
        if (svg === null || startView === null) return;
        const rect = svg.getBoundingClientRect();
        const d0 = Math.hypot(
          startB.clientX - startA.clientX,
          startB.clientY - startA.clientY,
        );
        const d1 = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        if (d0 <= 0) return;
        const { size: box, maxZoom: max } = latest.current;
        const cx = (a.clientX + b.clientX) / 2 - rect.left;
        const cy = (a.clientY + b.clientY) / 2 - rect.top;
        const scx = (startA.clientX + startB.clientX) / 2 - rect.left;
        const scy = (startA.clientY + startB.clientY) / 2 - rect.top;
        const zoomed = mapZoomAt(
          startView,
          d1 / d0,
          scx,
          scy,
          box.width,
          box.height,
          max,
        );
        setView(
          mapPanBy(zoomed, cx - scx, cy - scy, box.width, box.height, max),
        );
      },
      onPinchEnd: () => {
        startView = null;
      },
    });
    pinchRef.current = tracker;
    return () => {
      tracker.dispose();
      pinchRef.current = null;
    };
  }, [svgRef]);

  const zoomAtCenter = (factor: number): void =>
    setView(
      mapZoomAt(
        view,
        factor,
        size.width / 2,
        size.height / 2,
        size.width,
        size.height,
        maxZoom,
      ),
    );

  useImperativeHandle(ref, (): OgeVectorMapHandle => ({
    getSvgElement: visual.getSvgElement,
    print: visual.print,
    refresh: visual.refresh,
    focus: visual.focus,
    zoomIn: () => zoomAtCenter(1.5),
    zoomOut: () => zoomAtCenter(1 / 1.5),
    resetZoom: () => setView(OGE_MAP_HOME_VIEW),
  }));

  const isSelected = (region: OgeMapRegionVm<T>): boolean =>
    selected.includes(region.key);
  const onRegionClick = (region: OgeMapRegionVm<T>): void => {
    if (suppressClick.current) return;
    props.onRegionClick?.(region.payload);
    const was = selected.includes(region.key);
    setSelected(
      was
        ? selected.filter((key) => key !== region.key)
        : [...selected, region.key],
    );
    if (!was) {
      setAnnouncement(
        formatOgeChartMessage(msg.announcements.selected, {
          series: region.name,
          argument: region.valueText,
        }),
      );
    }
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (!zoomEnabled) return;
    const pinch = pinchRef.current;
    if (pinch !== null && pinch.pointerDown(event.nativeEvent)) return;
    if (event.button !== 0 || pinch?.active === true) return;
    const start = view;
    if (start.zoom <= 1) return;
    beginChartGesture(event.nativeEvent, {
      onMove: (dx, dy) => {
        setDragging(true);
        const { size: box, maxZoom: max } = latest.current;
        setView(mapPanBy(start, dx, dy, box.width, box.height, max));
      },
      onFinish: (commit, cancelled) => {
        setDragging(false);
        if (cancelled) setView(start);
        if (commit) {
          // the click that ends a drag is not a region click
          suppressClick.current = true;
          setTimeout(() => (suppressClick.current = false));
        }
      },
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const command = chartMapKeyCommand(event.key, {
      centroids: scene.regions.map((region) => region.centroid),
      index: activeIndex,
      shift: event.shiftKey,
      panStep: size.width * 0.1,
    });
    if (command === null) return;
    const zooming =
      command.type === 'zoom' ||
      command.type === 'pan' ||
      command.type === 'reset';
    if (zooming && !zoomEnabled) return;
    event.preventDefault();
    switch (command.type) {
      case 'move': {
        const region = scene.regions[command.index];
        if (region === undefined) return;
        setActiveIndex(region.index);
        setView(
          mapEnsureVisible(
            view,
            region.centroid,
            size.width,
            size.height,
            maxZoom,
          ),
        );
        setAnnouncement(
          formatOgeChartMessage(msg.visuals.item, {
            name: region.name,
            value: region.valueText,
          }),
        );
        return;
      }
      case 'zoom':
        zoomAtCenter(command.factor);
        return;
      case 'pan':
        setView(
          mapPanBy(
            view,
            command.dx,
            command.dy,
            size.width,
            size.height,
            maxZoom,
          ),
        );
        return;
      case 'reset':
        setView(OGE_MAP_HOME_VIEW);
        return;
      case 'activate': {
        const region =
          activeIndex === null ? undefined : scene.regions[activeIndex];
        if (region !== undefined) onRegionClick(region);
        return;
      }
    }
  };

  const labels = showLabels
    ? scene.regions.flatMap((region) => {
        const label = mapRegionLabel(region, view.zoom);
        return label === null ? [] : [{ ...label, key: region.key }];
      })
    : [];
  const tipIndex = hoverIndex ?? activeIndex;
  const tipRegion = tipIndex === null ? undefined : scene.regions[tipIndex];
  let tooltip: {
    x: number;
    y: number;
    label: string;
    valueText: string;
    flipX: boolean;
  } | null = null;
  if (tooltipEnabled && tipRegion !== undefined) {
    const x = view.x + tipRegion.centroid.x * view.zoom;
    const flipX = x > size.width / 2;
    tooltip = {
      x: flipX ? x - 10 : x + 10,
      y: view.y + tipRegion.centroid.y * view.zoom,
      label: tipRegion.name,
      valueText: tipRegion.valueText,
      flipX,
    };
  }
  const legendPosition = legend.position ?? 'bottom';

  return (
    <div
      ref={visual.rootRef}
      className={cx(
        'oge-chart',
        'oge-vector-map',
        !visual.animation.transitions && 'oge-chart-static',
        props.className,
      )}
      style={visual.rootStyle}
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
        {legend.visible !== false && scene.regions.length > 0 ? (
          <ChartColorLegend
            legend={scene.legend}
            label={msg.visuals.colorScaleLabel}
          />
        ) : null}
        <div
          ref={visual.plotWrapRef}
          className="oge-chart-plot-wrap"
          tabIndex={0}
          role="group"
          aria-label={scene.ariaLabel}
          aria-describedby={hintId}
          onKeyDown={onKeyDown}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {zoomEnabled ? (
            <div className="oge-map-controls">
              <button
                type="button"
                className="oge-map-control"
                aria-label={msg.visuals.zoomIn}
                disabled={view.zoom >= maxZoom}
                onClick={() => zoomAtCenter(1.5)}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M8 3v10M3 8h10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    fill="none"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="oge-map-control"
                aria-label={msg.visuals.zoomOut}
                disabled={view.zoom <= 1}
                onClick={() => zoomAtCenter(1 / 1.5)}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M3 8h10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    fill="none"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="oge-map-control"
                aria-label={msg.visuals.resetZoom}
                disabled={view.zoom === 1}
                onClick={() => setView(OGE_MAP_HOME_VIEW)}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M3.5 8a4.5 4.5 0 1 0 1.3-3.2M3.5 2.5v2.6h2.6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ) : null}
          <svg
            ref={visual.svgRef}
            className={cx(
              'oge-chart-svg',
              'oge-map-svg',
              dragging && 'oge-map-dragging',
            )}
            role="img"
            aria-label={scene.ariaLabel}
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
            onPointerDown={onPointerDown}
          >
            <g
              transform={mapViewTransform(view)}
              className={
                visual.drawingIn ? 'oge-chart-visual-enter' : undefined
              }
            >
              {scene.regions.map((region) => (
                <path
                  key={region.key}
                  className={cx(
                    'oge-map-region',
                    region.empty && 'oge-map-region-empty',
                    isSelected(region) && 'oge-chart-point-selected',
                    activeIndex === region.index && 'oge-chart-item-active',
                  )}
                  d={region.path}
                  style={{ fill: region.fill }}
                  onClick={() => onRegionClick(region)}
                  onMouseEnter={() => setHoverIndex(region.index)}
                />
              ))}
              {labels.map((label) => (
                <text
                  key={label.key}
                  className="oge-map-label"
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  style={{
                    fontSize: `${11 / view.zoom}px`,
                    strokeWidth: `${3 / view.zoom}px`,
                  }}
                >
                  {label.text}
                </text>
              ))}
            </g>
            {scene.regions.length === 0 ? (
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
      <div className="oge-chart-live" id={hintId}>
        {msg.visuals.mapHint}
      </div>
      <div className="oge-chart-live" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}

/**
 * `<OgeVectorMap>` — a choropleth over GeoJSON polygons with zoom / pan
 * and keyboard region navigation. No tiles, no projection library.
 * Commercial.
 *
 * ```tsx
 * <OgeVectorMap geoJson={regions} dataSource={sales} keyField="region" valueField="total" />
 * ```
 */
export const OgeVectorMap = forwardRef(OgeVectorMapInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeVectorMapProps<T> & { ref?: Ref<OgeVectorMapHandle> },
) => ReactElement;
