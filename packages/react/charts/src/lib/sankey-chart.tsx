'use client';

import {
  forwardRef,
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
  buildSankeyScene,
  chartColumnsKeyCommand,
  sankeyHighlight,
  sankeyNodeText,
  sankeySrTable,
  sankeyTooltip,
  type OgeChartAnimationOptions,
  type OgeChartFieldExpr,
  type OgeChartSankeyLinkEvent,
  type OgeChartSankeyNodeEvent,
  type OgeChartsMessages,
  type OgeSankeyLinkColor,
  type OgeSankeyNode,
  type OgeSankeyNodeAlign,
  type OgeSankeyNodeVm,
} from '@oge-ui/charts-engine';
import { cx, useStable } from './hooks';
import { useChartVisual } from './visual-hooks';
import { ChartSrTable } from './visual-parts';
import type { OgeVisualChartHandle } from './funnel-chart';

const EMPTY: readonly never[] = [];

type SankeyHover = { readonly kind: 'node' | 'link'; readonly index: number };

/** Props of `<OgeSankeyChart>` — the React face of `<oge-sankey-chart>`. */
export interface OgeSankeyChartProps<
  T extends object = Record<string, unknown>,
> {
  /** One item per link. */
  readonly dataSource?: readonly T[];
  /** Default `'source'`. */
  readonly sourceField?: OgeChartFieldExpr<T>;
  /** Default `'target'`. */
  readonly targetField?: OgeChartFieldExpr<T>;
  /** Default `'value'`. */
  readonly valueField?: OgeChartFieldExpr<T>;
  /** Optional per-node `{ id, label?, color? }`. */
  readonly nodes?: readonly OgeSankeyNode[];
  /** Default 14. */
  readonly nodeWidth?: number;
  /** Default 12. */
  readonly nodePadding?: number;
  /** Default `'justify'`. */
  readonly nodeAlign?: OgeSankeyNodeAlign;
  /** Default `'source'`. */
  readonly linkColor?: OgeSankeyLinkColor;
  readonly showLabels?: boolean;
  readonly palette?: readonly string[];
  readonly valueFormat?: (value: number) => string;
  readonly tooltipEnabled?: boolean;
  readonly onNodeClick?: (event: OgeChartSankeyNodeEvent) => void;
  readonly onLinkClick?: (event: OgeChartSankeyLinkEvent<T>) => void;
  /** Mirrored flow; unset follows the page `dir`. */
  readonly rtlEnabled?: boolean;
  readonly animation?: boolean | OgeChartAnimationOptions;
  readonly title?: string;
  readonly locale?: string;
  readonly messages?: Partial<OgeChartsMessages>;
  readonly className?: string;
  readonly style?: CSSProperties;
}

function OgeSankeyChartInner<T extends object>(
  props: OgeSankeyChartProps<T>,
  ref: ForwardedRef<OgeVisualChartHandle>,
): ReactElement {
  const dataSource = props.dataSource ?? EMPTY;
  const nodes = useStable(props.nodes ?? EMPTY);
  const palette = useStable(props.palette);
  const tooltipEnabled = props.tooltipEnabled ?? true;
  const visual = useChartVisual({
    name: 'OgeSankeyChart',
    initialSize: { width: 560, height: 340 },
    hasData: dataSource.length > 0,
    title: props.title,
    locale: props.locale,
    messages: props.messages,
    animation: props.animation,
    rtlEnabled: props.rtlEnabled,
    style: props.style,
  });
  const { msg, locale, size, rtl } = visual;
  const [hover, setHover] = useState<SankeyHover | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  const scene = useMemo(
    () =>
      buildSankeyScene<T>({
        dataSource,
        sourceField: props.sourceField ?? 'source',
        targetField: props.targetField ?? 'target',
        valueField: props.valueField ?? 'value',
        nodes,
        nodeWidth: props.nodeWidth ?? 14,
        nodePadding: props.nodePadding ?? 12,
        nodeAlign: props.nodeAlign ?? 'justify',
        linkColor: props.linkColor ?? 'source',
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
      props.sourceField,
      props.targetField,
      props.valueField,
      nodes,
      props.nodeWidth,
      props.nodePadding,
      props.nodeAlign,
      props.linkColor,
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
  const target: SankeyHover | null =
    hover ??
    (activeIndex === null ? null : { kind: 'node', index: activeIndex });
  const lit = sankeyHighlight(scene, target);
  const srTable = useMemo(
    () => sankeySrTable(scene, msg, visual.tableLimit),
    [scene, msg, visual.tableLimit],
  );
  const tooltip = tooltipEnabled
    ? sankeyTooltip(
        scene,
        target,
        msg,
        size.width,
        locale,
        hover?.kind === 'link' ? (pointer ?? undefined) : undefined,
      )
    : null;

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

  const nodeText = (node: OgeSankeyNodeVm): string =>
    sankeyNodeText(node, msg, locale, props.valueFormat);
  const onNodeClick = (node: OgeSankeyNodeVm): void => {
    props.onNodeClick?.(node.payload);
    setAnnouncement(nodeText(node));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const command = chartColumnsKeyCommand(event.key, {
      columns: scene.columns,
      index: activeIndex,
      rtl,
    });
    if (command === null) return;
    event.preventDefault();
    if (command.type === 'move') {
      const node = scene.nodes.find((entry) => entry.index === command.index);
      if (node === undefined) return;
      setActiveIndex(node.index);
      setAnnouncement(nodeText(node));
      return;
    }
    const node = scene.nodes.find((entry) => entry.index === activeIndex);
    if (node !== undefined) onNodeClick(node);
  };

  return (
    <div
      ref={visual.rootRef}
      className={cx(
        'oge-chart',
        'oge-sankey-chart',
        !visual.animation.transitions && 'oge-chart-static',
        props.className,
      )}
      style={visual.rootStyle}
      dir={visual.dir}
    >
      {props.title ? (
        <div className="oge-chart-title">{props.title}</div>
      ) : null}
      <div className="oge-chart-layout">
        <div
          ref={visual.plotWrapRef}
          className="oge-chart-plot-wrap"
          tabIndex={0}
          role="group"
          aria-label={scene.ariaLabel}
          onKeyDown={onKeyDown}
          onPointerLeave={() => setHover(null)}
        >
          <svg
            ref={visual.svgRef}
            className="oge-chart-svg"
            role="img"
            aria-label={scene.ariaLabel}
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
            onPointerMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setPointer({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
              });
            }}
          >
            <g
              className={
                visual.drawingIn ? 'oge-chart-visual-enter' : undefined
              }
            >
              {scene.links.map((link) => (
                <path
                  key={link.key}
                  className={cx(
                    'oge-sankey-link',
                    lit?.links.has(link.index) === true &&
                      'oge-sankey-link-lit',
                    lit !== null &&
                      !lit.links.has(link.index) &&
                      'oge-sankey-dim',
                  )}
                  d={link.path}
                  style={{ fill: link.color }}
                  onClick={() => props.onLinkClick?.(link.payload)}
                  onMouseEnter={() =>
                    setHover({ kind: 'link', index: link.index })
                  }
                />
              ))}
              {scene.nodes.map((node) => (
                <rect
                  key={node.index}
                  className={cx(
                    'oge-sankey-node',
                    lit !== null &&
                      !lit.nodes.has(node.index) &&
                      'oge-sankey-dim',
                    activeIndex === node.index && 'oge-chart-item-active',
                  )}
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  style={{ fill: node.color }}
                  onClick={() => onNodeClick(node)}
                  onMouseEnter={() =>
                    setHover({ kind: 'node', index: node.index })
                  }
                />
              ))}
            </g>
            {scene.nodes.map((node) =>
              node.labelVm !== null ? (
                <text
                  key={node.index}
                  className="oge-chart-point-label"
                  x={node.labelVm.x}
                  y={node.labelVm.y}
                  textAnchor={node.labelVm.anchor}
                >
                  {node.labelVm.text}
                </text>
              ) : null,
            )}
            {scene.nodes.length === 0 ? (
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
      <div className="oge-chart-live" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}

/**
 * `<OgeSankeyChart>` — flows between nodes with relaxed positions, link
 * bands, hover highlighting and keyboard node navigation. Commercial.
 *
 * ```tsx
 * <OgeSankeyChart dataSource={flows} sourceField="from" targetField="to" valueField="amount" />
 * ```
 */
export const OgeSankeyChart = forwardRef(OgeSankeyChartInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeSankeyChartProps<T> & { ref?: Ref<OgeVisualChartHandle> },
) => ReactElement;
