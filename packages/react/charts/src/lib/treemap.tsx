'use client';

import {
  forwardRef,
  useId,
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
  buildChartHierarchy,
  buildTreemapScene,
  chartHierarchyDrillFocus,
  chartHierarchyKeyCommand,
  chartHierarchySrTable,
  chartHierarchyValueText,
  formatOgeChartMessage,
  treemapTooltip,
  type OgeChartAnimationOptions,
  type OgeChartColorScale,
  type OgeChartFieldExpr,
  type OgeChartHierarchy,
  type OgeChartHierarchyNode,
  type OgeChartHierarchyNodeEvent,
  type OgeChartPrintOptions,
  type OgeChartsMessages,
  type OgeTreemapLayoutAlgorithm,
} from '@oge-ui/charts-engine';
import { cx, svgSafeId, useControllable, useStable } from './hooks';
import { useChartVisual, type ChartVisual } from './visual-hooks';
import {
  ChartBreadcrumb,
  ChartColorLegend,
  ChartSrTable,
} from './visual-parts';

const EMPTY: readonly never[] = [];

/** The hierarchy fields both drill-down charts share. */
export interface OgeHierarchyChartProps<
  T extends object = Record<string, unknown>,
> {
  /** Nested items (`childrenField`) or a flat list (`idField` + `parentField`). */
  readonly dataSource?: readonly T[];
  /** Default `'items'`. */
  readonly childrenField?: OgeChartFieldExpr<T>;
  /** Default `'id'`. */
  readonly idField?: OgeChartFieldExpr<T>;
  /** Setting it switches to flat mode. */
  readonly parentField?: OgeChartFieldExpr<T>;
  /** Default `'name'`. */
  readonly labelField?: OgeChartFieldExpr<T>;
  /** Default `'value'`. */
  readonly valueField?: OgeChartFieldExpr<T>;
  readonly colorField?: OgeChartFieldExpr<T>;
  /** Levels drawn below the current root; unset = all. */
  readonly maxDepth?: number;
  readonly palette?: readonly string[];
  /** Default true. */
  readonly showLabels?: boolean;
  readonly valueFormat?: (value: number) => string;
  /** Clicking / Enter on a group makes it the root. Default true. */
  readonly drillDown?: boolean;
  readonly tooltipEnabled?: boolean;
  /** The drill-down root's key (`''` = the whole tree) — controlled when provided. */
  readonly rootKey?: string;
  readonly defaultRootKey?: string;
  readonly onRootKeyChange?: (key: string) => void;
  readonly animation?: boolean | OgeChartAnimationOptions;
  readonly title?: string;
  readonly locale?: string;
  readonly messages?: Partial<OgeChartsMessages>;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** Props of `<OgeTreemap>` — the React face of `<oge-treemap>`. */
export interface OgeTreemapProps<
  T extends object = Record<string, unknown>,
> extends OgeHierarchyChartProps<T> {
  /** `'squarified'` (default) or `'sliceAndDice'`. */
  readonly layoutAlgorithm?: OgeTreemapLayoutAlgorithm;
  /** Colour leaves by value (adds the legend). */
  readonly colorScale?: OgeChartColorScale;
  readonly onTileClick?: (event: OgeChartHierarchyNodeEvent<T>) => void;
  /** Mirrored layout; unset follows the page `dir`. */
  readonly rtlEnabled?: boolean;
}

/** The `ref` handle of `<OgeTreemap>` / `<OgeSunburstChart>`. */
export interface OgeHierarchyChartHandle {
  getSvgElement(): SVGSVGElement;
  print(options?: OgeChartPrintOptions): Promise<void>;
  refresh(): void;
  focus(): void;
  /** Makes the node with `key` the root (`''` = the whole tree). */
  drillTo(key: string): void;
  /** Drills one level up (no-op at the top). */
  drillUp(): void;
}

/** The shared hierarchy + drill state of the treemap and the sunburst. */
export function useHierarchyDrill<T extends object>(
  props: OgeHierarchyChartProps<T>,
  msg: OgeChartsMessages,
): {
  readonly hierarchy: OgeChartHierarchy<T>;
  readonly rootKey: string;
  readonly activeKey: string | null;
  readonly setActiveKey: (key: string | null) => void;
  readonly announcement: string;
  readonly setAnnouncement: (text: string) => void;
  drillTo(key: string): void;
} {
  const dataSource = props.dataSource ?? EMPTY;
  const childrenField = props.childrenField ?? 'items';
  const idField = props.idField ?? 'id';
  const labelField = props.labelField ?? 'name';
  const valueField = props.valueField ?? 'value';
  const rootLabel = msg.visuals.root;
  const hierarchy = useMemo(
    () =>
      buildChartHierarchy<T>({
        dataSource,
        childrenField,
        idField,
        parentField: props.parentField,
        labelField,
        valueField,
        colorField: props.colorField,
        rootLabel,
      }),
    [
      dataSource,
      childrenField,
      idField,
      props.parentField,
      labelField,
      valueField,
      props.colorField,
      rootLabel,
    ],
  );
  const [rootKey, setRootKey] = useControllable(
    props.rootKey,
    props.defaultRootKey ?? '',
    props.onRootKeyChange,
  );
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  return {
    hierarchy,
    rootKey,
    activeKey,
    setActiveKey,
    announcement,
    setAnnouncement,
    drillTo(key) {
      const node = hierarchy.byKey.get(key);
      if (node === undefined || rootKey === key) return;
      setRootKey(key);
      const focus = chartHierarchyDrillFocus(rootKey, node);
      setActiveKey(focus.activeKey);
      setAnnouncement(
        formatOgeChartMessage(
          focus.up ? msg.visuals.drilledUp : msg.visuals.drilledDown,
          { name: node.name },
        ),
      );
    },
  };
}

/** Keyboard + activation shared by the treemap and the sunburst. */
export function hierarchyHandlers<T extends object>(
  drill: ReturnType<typeof useHierarchyDrill<T>>,
  root: OgeChartHierarchyNode<T>,
  props: OgeHierarchyChartProps<T>,
  visual: ChartVisual,
  onClick: ((node: OgeChartHierarchyNode<T>) => void) | undefined,
  rtl?: boolean,
): {
  activate(node: OgeChartHierarchyNode<T>): void;
  onKeyDown(event: KeyboardEvent<HTMLDivElement>): void;
  drillUp(): void;
} {
  const drillDown = props.drillDown ?? true;
  const drillUp = (): void => {
    if (root.parent !== null) drill.drillTo(root.parent.key);
  };
  const announce = (node: OgeChartHierarchyNode<T>): void =>
    drill.setAnnouncement(
      chartHierarchyValueText(
        node,
        visual.msg,
        visual.locale,
        props.valueFormat,
      ),
    );
  const activate = (node: OgeChartHierarchyNode<T>): void => {
    onClick?.(node);
    if (drillDown && node.children.length > 0) {
      drill.drillTo(node.key);
      return;
    }
    announce(node);
  };
  return {
    activate,
    drillUp,
    onKeyDown(event) {
      const active =
        drill.activeKey === null
          ? null
          : (drill.hierarchy.byKey.get(drill.activeKey) ?? null);
      const command = chartHierarchyKeyCommand(event.key, {
        root,
        active,
        drillDown,
        maxDepth: props.maxDepth ?? Infinity,
        rtl,
      });
      if (command === null) return;
      event.preventDefault();
      if (command.type === 'up') {
        drillUp();
        return;
      }
      const node = drill.hierarchy.byKey.get(command.key);
      if (node === undefined) return;
      if (command.type === 'focus') {
        drill.setActiveKey(node.key);
        announce(node);
        return;
      }
      activate(node);
    },
  };
}

function OgeTreemapInner<T extends object>(
  props: OgeTreemapProps<T>,
  ref: ForwardedRef<OgeHierarchyChartHandle>,
): ReactElement {
  const colorScale = useStable(props.colorScale);
  const palette = useStable(props.palette);
  const tooltipEnabled = props.tooltipEnabled ?? true;
  const visual = useChartVisual({
    name: 'OgeTreemap',
    initialSize: { width: 520, height: 340 },
    hasData: (props.dataSource ?? EMPTY).length > 0,
    title: props.title,
    locale: props.locale,
    messages: props.messages,
    animation: props.animation,
    rtlEnabled: props.rtlEnabled,
    style: props.style,
  });
  const { msg, locale, size, rtl } = visual;
  const hintId = `oge-chart-visual-${svgSafeId(useId())}-hint`;
  const drill = useHierarchyDrill(props, msg);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const scene = useMemo(
    () =>
      buildTreemapScene<T>({
        hierarchy: drill.hierarchy,
        rootKey: drill.rootKey,
        layoutAlgorithm: props.layoutAlgorithm ?? 'squarified',
        maxDepth: props.maxDepth ?? Infinity,
        colorScale,
        palette,
        showLabels: props.showLabels ?? true,
        valueFormat: props.valueFormat,
        rtl,
        title: props.title,
        width: size.width,
        height: size.height,
        locale,
        messages: msg,
      }),
    [
      drill.hierarchy,
      drill.rootKey,
      props.layoutAlgorithm,
      props.maxDepth,
      colorScale,
      palette,
      props.showLabels,
      props.valueFormat,
      rtl,
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
        scene.tiles.map((tile) => tile.node),
        scene.root,
        msg,
        locale,
        visual.tableLimit,
        props.valueFormat,
      ),
    [scene, msg, locale, visual.tableLimit, props.valueFormat],
  );
  const tooltip = tooltipEnabled
    ? treemapTooltip(scene, hoverKey ?? drill.activeKey, size.width, locale)
    : null;
  const handlers = hierarchyHandlers(
    drill,
    scene.root,
    props,
    visual,
    (node) => {
      const tile = scene.tiles.find((entry) => entry.key === node.key);
      if (tile !== undefined) props.onTileClick?.(tile.payload);
    },
    rtl,
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
        'oge-treemap',
        !visual.animation.transitions && 'oge-chart-static',
        props.className,
      )}
      style={visual.rootStyle}
      dir={visual.dir}
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
        {scene.legend !== null ? (
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
              {scene.tiles.map((tile) => [
                <rect
                  key={tile.key}
                  className={cx(
                    'oge-treemap-tile',
                    tile.nested && 'oge-treemap-group',
                    drill.activeKey === tile.key && 'oge-chart-item-active',
                  )}
                  x={tile.x}
                  y={tile.y}
                  width={tile.width}
                  height={tile.height}
                  style={{ fill: tile.fill }}
                  onClick={() => handlers.activate(tile.node)}
                  onMouseEnter={() => setHoverKey(tile.key)}
                  onMouseLeave={() => setHoverKey(null)}
                />,
                ...tile.labels.map((label, index) => (
                  <text
                    key={`${tile.key}#${index}`}
                    className={cx(
                      'oge-chart-point-label',
                      'oge-treemap-label',
                      label.strong && 'oge-treemap-label-strong',
                    )}
                    x={label.x}
                    y={label.y}
                    textAnchor={rtl ? 'end' : 'start'}
                  >
                    {label.text}
                  </text>
                )),
              ])}
            </g>
            {scene.tiles.length === 0 ? (
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
        {msg.visuals.drillHint}
      </div>
      <div className="oge-chart-live" aria-live="polite">
        {drill.announcement}
      </div>
    </div>
  );
}

/**
 * `<OgeTreemap>` — nested rectangles sized by value (squarified or
 * slice-and-dice), group headers, fitted labels, palette or colour-scale
 * fills and drill-down with a breadcrumb. Commercial.
 *
 * ```tsx
 * <OgeTreemap dataSource={regions} valueField="sales" />
 * ```
 */
export const OgeTreemap = forwardRef(OgeTreemapInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeTreemapProps<T> & { ref?: Ref<OgeHierarchyChartHandle> },
) => ReactElement;
