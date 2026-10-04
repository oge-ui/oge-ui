import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  OGE_CHART_PALETTE,
  beginChartGesture,
  buildCartesianData,
  cartesianDragArgDelta,
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
  resolveChartAnimation,
  type ChartGestureHandle,
  type OgeChartAnimationOptions,
  type OgeChartPane,
  buildCartesianScene,
  cartesianActivePoints,
  cartesianAriaLabel,
  cartesianCrosshair,
  cartesianExportData,
  cartesianHoverAt,
  cartesianKeyCommand,
  cartesianNearestSeries,
  cartesianPanRange,
  cartesianPointAnnouncement,
  cartesianSelectionRange,
  cartesianSrRows,
  cartesianTooltip,
  cartesianWheelRange,
  cartesianZoomTo,
  chartArgumentText,
  chartDragMode,
  chartMarkerRadius,
  chartSeriesGroupOpacity,
  chartValueText,
  chartWheelZoomEnabled,
  formatOgeChartMessage,
  isChartPointSelected,
  measureChartElement,
  mergeOgeChartsMessages,
  nextChartSelection,
  observeChartSize,
  type OgeCartesianHoverState,
  type OgeChartAnnotation,
  type OgeChartAxisOptions,
  type OgeChartCrosshairOptions,
  type OgeChartExportData,
  type OgeChartLegendClickEvent,
  type OgeChartLegendOptions,
  type OgeChartPoint,
  type OgeChartPointEvent,
  type OgeChartPointRef,
  type OgeChartRange,
  type OgeChartRenderMarker,
  type OgeChartRenderSeries,
  type OgeChartSeriesEvent,
  type OgeChartSeriesInput,
  type OgeChartStripLine,
  type OgeChartTooltipOptions,
  type OgeChartTooltipShowingEvent,
} from '@oge-ui/charts-engine';
import {
  OgeChartAnnotationTemplate,
  OgeChartLegendTemplate,
  OgeChartTooltipTemplate,
} from './chart-templates';
import { OGE_CHARTS_CONFIG, type OgeChartsMessages } from '../config';

// The palette moved into the engine with the rest of the family's shared
// code (ADR 0003); re-exported here so `@oge-ui/charts` keeps its public API.
export { OGE_CHART_PALETTE };

/**
 * `<oge-chart>` — the cartesian chart: line/spline/area/bar/stacked/
 * scatter/range/candlestick series over a dependency-free SVG kernel,
 * with zoom & pan, crosshair, shared tooltips, an interactive legend and
 * keyboard point inspection. Commercial (see LICENSE).
 */
@Component({
  selector: 'oge-chart',
  imports: [NgTemplateOutlet],
  styleUrl: './chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chart',
    '[class.oge-chart-rotated]': 'rotated()',
    '[class.oge-chart-static]': '!resolvedAnimation().transitions',
    '[attr.dir]': 'hostDir()',
    '[style]': 'animationVars()',
  },
  template: `
    @if (title()) {
      <div class="oge-chart-title">{{ title() }}</div>
    }
    @if (subtitle()) {
      <div class="oge-chart-subtitle">{{ subtitle() }}</div>
    }
    <div
      class="oge-chart-layout"
      [class.oge-chart-legend-start]="legendPosition() === 'start'"
      [class.oge-chart-legend-end]="legendPosition() === 'end'"
      [class.oge-chart-legend-top]="legendPosition() === 'top'"
    >
      @if (legendVisible() && legendItems().length > 0) {
        <ul class="oge-chart-legend" [attr.aria-label]="msg().aria.legendLabel">
          @for (item of legendItems(); track item.seriesIndex) {
            <li>
              <button
                type="button"
                class="oge-chart-legend-btn"
                [class.oge-chart-legend-hidden]="item.hidden"
                [attr.aria-pressed]="!item.hidden"
                [disabled]="!legendInteractive()"
                (click)="onLegendClick(item.seriesIndex)"
                (mouseenter)="hoveredLegend.set(item.seriesIndex)"
                (mouseleave)="hoveredLegend.set(null)"
                (focus)="hoveredLegend.set(item.seriesIndex)"
                (blur)="hoveredLegend.set(null)"
              >
                @if (legendTemplate(); as tpl) {
                  <ng-container
                    [ngTemplateOutlet]="tpl.templateRef"
                    [ngTemplateOutletContext]="{
                      $implicit: {
                        name: item.name,
                        color: item.color,
                        hidden: item.hidden,
                      },
                    }"
                  />
                } @else {
                  <span
                    class="oge-chart-legend-marker"
                    [style.background-color]="item.color"
                  ></span>
                  <span class="oge-chart-legend-text">{{ item.name }}</span>
                }
              </button>
            </li>
          }
        </ul>
      }
      <div
        #plotWrap
        class="oge-chart-plot-wrap"
        tabindex="0"
        role="group"
        [attr.aria-label]="rootAriaLabel()"
        (keydown)="onPlotKeydown($event)"
        (pointerleave)="onPointerLeave()"
      >
        <!-- keyboard interaction (arrows + Enter) lives on the focusable
             wrapper above; the svg click is the pointer equivalent -->
        <!-- eslint-disable @angular-eslint/template/click-events-have-key-events -->
        <svg
          #svgEl
          class="oge-chart-svg"
          role="img"
          [attr.aria-label]="rootAriaLabel()"
          [attr.width]="width()"
          [attr.height]="height()"
          [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
          [class.oge-chart-touch-pan-x]="touchAction() === 'pan-x'"
          [class.oge-chart-touch-pan-y]="touchAction() === 'pan-y'"
          (pointermove)="onPointerMove($event)"
          (pointerdown)="onPlotPointerDown($event)"
          (click)="onPlotClick($event)"
          (wheel)="onWheel($event)"
        >
          <!-- eslint-enable @angular-eslint/template/click-events-have-key-events -->
          <defs>
            @for (pane of paneVms(); track pane.index) {
              <clipPath [attr.id]="clipId + '-' + pane.index">
                <rect
                  [attr.x]="pane.clip.x"
                  [attr.y]="pane.clip.y"
                  [attr.width]="pane.clip.w"
                  [attr.height]="pane.clip.h"
                />
              </clipPath>
            }
          </defs>
          <g [attr.transform]="'translate(' + plotX() + ',' + plotY() + ')'">
            <!-- strips (bands) -->
            @for (guide of guides(); track $index) {
              @if (guide.kind === 'band') {
                <rect
                  class="oge-chart-strip"
                  [attr.x]="guide.rect.x"
                  [attr.y]="guide.rect.y"
                  [attr.width]="guide.rect.w"
                  [attr.height]="guide.rect.h"
                  [attr.fill]="guide.color ?? null"
                />
              }
            }
            <!-- grid -->
            @for (line of gridLines(); track $index) {
              <line
                class="oge-chart-grid"
                [class.oge-chart-grid-minor]="line.minor"
                [attr.x1]="line.x1"
                [attr.x2]="line.x2"
                [attr.y1]="line.y1"
                [attr.y2]="line.y2"
              />
            }
            <!-- series: logical geometry inside the orientation frame -->
            <g class="oge-chart-plot-frame" [attr.transform]="frameTransform()">
              @for (rs of renderSeries(); track rs.seriesIndex) {
                <g
                  [attr.clip-path]="
                    'url(#' + clipId + '-' + paneOf(rs.seriesIndex) + ')'
                  "
                >
                  <g
                    class="oge-chart-series"
                    [class.oge-chart-series-enter]="drawingIn()"
                    [style.transform-origin]="enterOrigin(rs.seriesIndex)"
                    [attr.opacity]="seriesGroupOpacity(rs.seriesIndex)"
                  >
                    @if (rs.areaPathD !== null) {
                      <path
                        class="oge-chart-area"
                        [attr.d]="rs.areaPathD"
                        [attr.fill]="rs.color"
                        [attr.opacity]="rs.opacity * 0.35"
                      />
                    }
                    @if (rs.linePathD !== null) {
                      <path
                        class="oge-chart-line"
                        [attr.d]="rs.linePathD"
                        [attr.stroke]="rs.color"
                        [attr.stroke-width]="rs.strokeWidth"
                        [attr.stroke-dasharray]="rs.dashArray"
                        [attr.opacity]="rs.opacity"
                        fill="none"
                      />
                    }
                    @for (bar of rs.bars; track bar.pointIndex) {
                      <rect
                        class="oge-chart-bar"
                        [class.oge-chart-point-selected]="
                          isSelected(rs.seriesIndex, bar.pointIndex)
                        "
                        [attr.x]="bar.x"
                        [attr.y]="bar.y"
                        [attr.width]="bar.w"
                        [attr.height]="bar.h"
                        [attr.fill]="rs.color"
                        [attr.opacity]="rs.opacity"
                        rx="2"
                      />
                    }
                    @for (candle of rs.candles; track candle.pointIndex) {
                      <line
                        class="oge-chart-candle-wick"
                        [attr.x1]="candle.x"
                        [attr.x2]="candle.x"
                        [attr.y1]="candle.wickY1"
                        [attr.y2]="candle.wickY2"
                      />
                      <rect
                        class="oge-chart-candle"
                        [class.oge-chart-candle-falling]="!candle.rising"
                        [attr.x]="candle.x - candle.w / 2"
                        [attr.y]="candle.bodyY"
                        [attr.width]="candle.w"
                        [attr.height]="candle.bodyH"
                      />
                    }
                    @for (marker of rs.markers; track marker.pointIndex) {
                      <circle
                        class="oge-chart-marker"
                        [class.oge-chart-bubble]="rs.type === 'bubble'"
                        [class.oge-chart-point-selected]="
                          isSelected(rs.seriesIndex, marker.pointIndex)
                        "
                        [attr.cx]="marker.x"
                        [attr.cy]="marker.y"
                        [attr.r]="markerRadius(marker, rs.type)"
                        [attr.fill]="rs.color"
                      />
                    }
                    @for (label of rs.labels; track $index) {
                      <text
                        class="oge-chart-point-label"
                        [attr.x]="label.x"
                        [attr.y]="label.y"
                        [attr.text-anchor]="pointLabelAnchor()"
                        [attr.dominant-baseline]="pointLabelBaseline()"
                        [attr.transform]="labelTransform(label.x, label.y)"
                      >
                        {{ label.text }}
                      </text>
                    }
                  </g>
                </g>
              }
            </g>
            <!-- constant lines / strip lines -->
            @for (guide of guides(); track $index) {
              @if (guide.kind === 'line') {
                <line
                  [class.oge-chart-strip-line]="guide.variant === 'strip'"
                  [class.oge-chart-constant-line]="guide.variant === 'constant'"
                  [attr.x1]="guide.line.x1"
                  [attr.x2]="guide.line.x2"
                  [attr.y1]="guide.line.y1"
                  [attr.y2]="guide.line.y2"
                  [attr.stroke]="guide.color ?? null"
                  [attr.stroke-width]="guide.strokeWidth"
                  [attr.stroke-dasharray]="guide.dashArray"
                />
              }
            }
            <!-- axis breaks -->
            @for (marker of breakMarkers(); track $index) {
              <path class="oge-chart-break-gap" [attr.d]="marker.fillD" />
              <path class="oge-chart-break-line" [attr.d]="marker.lineD" />
            }
            @for (guide of guides(); track $index) {
              @if (guide.label; as label) {
                <text
                  class="oge-chart-strip-label"
                  [class.oge-chart-constant-label]="
                    guide.variant === 'constant'
                  "
                  [attr.x]="label.x"
                  [attr.y]="label.y"
                  [attr.text-anchor]="label.anchor"
                  [attr.fill]="
                    guide.variant === 'constant' ? (guide.color ?? null) : null
                  "
                >
                  {{ label.text }}
                </text>
              }
            }
            <!-- crosshair -->
            @if (crosshairPx(); as cross) {
              <line
                class="oge-chart-crosshair"
                [attr.x1]="cross.argLine.x1"
                [attr.x2]="cross.argLine.x2"
                [attr.y1]="cross.argLine.y1"
                [attr.y2]="cross.argLine.y2"
              />
              @if (crosshairHorizontal() && cross.valueLine; as valueLine) {
                <line
                  class="oge-chart-crosshair"
                  [attr.x1]="valueLine.x1"
                  [attr.x2]="valueLine.x2"
                  [attr.y1]="valueLine.y1"
                  [attr.y2]="valueLine.y2"
                />
              }
            }
            <!-- zoom selection -->
            @if (zoomSelection(); as sel) {
              <rect
                class="oge-chart-zoom-rect"
                [attr.x]="sel.x"
                [attr.y]="sel.y"
                [attr.width]="sel.w"
                [attr.height]="sel.h"
              />
            }
            <!-- annotations -->
            @for (note of annotationVms(); track $index) {
              @if (note.isPoint) {
                <circle
                  class="oge-chart-annotation-dot"
                  [attr.cx]="note.x"
                  [attr.cy]="note.y"
                  r="4"
                  [attr.fill]="note.color ?? null"
                />
                <line
                  class="oge-chart-annotation-connector"
                  [attr.x1]="note.x"
                  [attr.y1]="note.y"
                  [attr.x2]="note.labelX"
                  [attr.y2]="note.labelY"
                />
              }
              @if (annotationTemplate(); as tpl) {
                <foreignObject
                  [attr.x]="note.labelX"
                  [attr.y]="note.labelY - 14"
                  width="200"
                  height="60"
                  class="oge-chart-annotation-fo"
                >
                  <ng-container
                    [ngTemplateOutlet]="tpl.templateRef"
                    [ngTemplateOutletContext]="{
                      $implicit: { text: note.text },
                    }"
                  />
                </foreignObject>
              } @else {
                <rect
                  class="oge-chart-annotation-box"
                  [attr.x]="note.labelX - 6"
                  [attr.y]="note.labelY - 13"
                  [attr.width]="note.labelW"
                  height="20"
                  rx="4"
                />
                <text
                  class="oge-chart-annotation-text"
                  [attr.x]="note.labelX"
                  [attr.y]="note.labelY + 1"
                >
                  {{ note.text }}
                </text>
              }
            }
            <!-- axis lines + minor tick marks -->
            @for (line of axisLines(); track $index) {
              <line
                class="oge-chart-axis-line"
                [attr.x1]="line.x1"
                [attr.x2]="line.x2"
                [attr.y1]="line.y1"
                [attr.y2]="line.y2"
              />
            }
            @for (mark of tickMarks(); track $index) {
              <line
                class="oge-chart-tick-mark"
                [attr.x1]="mark.x1"
                [attr.x2]="mark.x2"
                [attr.y1]="mark.y1"
                [attr.y2]="mark.y2"
              />
            }
          </g>
          <!-- axis labels + titles -->
          @for (label of axisLabels(); track $index) {
            <text
              class="oge-chart-axis-label"
              [class.oge-chart-arg-label]="label.axis === 'argument'"
              [attr.x]="label.x"
              [attr.y]="label.y"
              [attr.text-anchor]="label.anchor"
              [attr.transform]="label.transform"
            >
              {{ label.text }}
            </text>
          }
          @for (axisTitle of axisTitles(); track $index) {
            <text
              class="oge-chart-axis-title"
              [attr.x]="axisTitle.x"
              [attr.y]="axisTitle.y"
              [attr.transform]="axisTitle.transform"
              text-anchor="middle"
            >
              {{ axisTitle.text }}
            </text>
          }
          @if (scene().empty) {
            <text
              class="oge-chart-no-data"
              [attr.x]="width() / 2"
              [attr.y]="height() / 2"
              text-anchor="middle"
            >
              {{ msg().noData }}
            </text>
          }
        </svg>
        <!-- tooltip -->
        @if (tooltipVm(); as tip) {
          <div
            class="oge-chart-tooltip"
            [class.oge-chart-tooltip-end-x]="tip.alignX === 'end'"
            [class.oge-chart-tooltip-end-y]="tip.alignY === 'end'"
            [style.left.px]="tip.x"
            [style.top.px]="tip.y"
            aria-hidden="true"
          >
            @if (tooltipTemplate(); as tpl) {
              <ng-container
                [ngTemplateOutlet]="tpl.templateRef"
                [ngTemplateOutletContext]="{ $implicit: tip.points }"
              />
            } @else {
              <span class="oge-chart-tooltip-arg">{{ tip.argumentText }}</span>
              @for (point of tip.points; track point.seriesIndex) {
                <span class="oge-chart-tooltip-row">
                  <span
                    class="oge-chart-legend-marker"
                    [style.background-color]="colorOf(point.seriesIndex)"
                  ></span>
                  {{ point.seriesName }}: {{ valueText(point.point) }}
                </span>
              }
            }
          </div>
        }
      </div>
    </div>
    <!-- screen-reader data table -->
    <table class="oge-chart-sr-table">
      <caption>
        {{
          msg().aria.tableCaption
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ msg().aria.argumentHeader }}</th>
          @for (item of legendItems(); track item.seriesIndex) {
            <th scope="col">{{ item.name }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of srRows(); track row.argText) {
          <tr>
            <th scope="row">{{ row.argText }}</th>
            @for (cell of row.cells; track $index) {
              <td>{{ cell }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
    <div class="oge-chart-live" aria-live="polite">{{ announcement() }}</div>
  `,
})
export class OgeChart<T extends object = Record<string, unknown>> {
  private static nextId = 0;
  private readonly config = inject(OGE_CHARTS_CONFIG);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly clipId = `oge-chart-clip-${OgeChart.nextId++}`;

  /* ---------------- inputs ---------------- */

  readonly dataSource = input<readonly T[]>([]);
  readonly series = input<readonly OgeChartSeriesInput<T>[]>([]);
  /** Shared defaults merged under every series (dx commonSeriesSettings). */
  readonly commonSeries = input<Partial<OgeChartSeriesInput<T>>>({});
  readonly argumentAxis = input<OgeChartAxisOptions>({});
  readonly valueAxis = input<
    OgeChartAxisOptions | readonly OgeChartAxisOptions[]
  >({});
  readonly stripLines = input<readonly OgeChartStripLine[]>([]);
  /** Text/point annotations anchored on the plot. */
  readonly annotations = input<readonly OgeChartAnnotation[]>([]);
  readonly legend = input<OgeChartLegendOptions>({});
  readonly tooltip = input<OgeChartTooltipOptions>({});
  readonly crosshair = input<OgeChartCrosshairOptions>({});
  readonly zoomEnabled = input<'none' | 'wheel' | 'drag' | 'both'>('none');
  readonly panEnabled = input(false);
  readonly selectionMode = input<'point' | 'series' | 'none'>('none');
  readonly palette = input<readonly string[] | undefined>(undefined);
  /**
   * Hover/selection transitions plus the series draw-in on the first render
   * (`{ enabled, duration, easing }`); `prefers-reduced-motion` always wins.
   */
  readonly animation = input<boolean | OgeChartAnimationOptions>(true);
  /**
   * Swaps the axes: the argument axis runs vertically, the value axis
   * horizontally — bars become horizontal bars, lines run top-down.
   */
  readonly rotated = input(false);
  /**
   * Right-to-left layout (mirrored argument axis, value axes, legend,
   * tooltip and arrow keys); unset follows the `dir` of the page.
   */
  readonly rtlEnabled = input<boolean | undefined>(undefined);
  /** Plot areas stacked over the shared argument axis (price + volume). */
  readonly panes = input<readonly OgeChartPane[]>([]);
  readonly title = input('');
  readonly subtitle = input('');
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input<Partial<OgeChartsMessages>>({});

  readonly visualRange = model<OgeChartRange | null>(null);
  readonly selectedPoints = model<readonly OgeChartPointRef[]>([]);

  /* ---------------- events ---------------- */

  readonly pointClick = output<OgeChartPointEvent<T>>();
  readonly seriesClick = output<OgeChartSeriesEvent>();
  readonly legendClick = output<OgeChartLegendClickEvent>();
  readonly tooltipShowing = output<OgeChartTooltipShowingEvent<T>>();
  readonly drawn = output<void>();

  protected readonly tooltipTemplate = contentChild(OgeChartTooltipTemplate, {
    descendants: false,
  });
  protected readonly legendTemplate = contentChild(OgeChartLegendTemplate, {
    descendants: false,
  });
  protected readonly annotationTemplate = contentChild(
    OgeChartAnnotationTemplate,
    { descendants: false },
  );
  private readonly plotWrapEl =
    viewChild.required<ElementRef<HTMLElement>>('plotWrap');
  private readonly svgEl =
    viewChild.required<ElementRef<SVGSVGElement>>('svgEl');

  /* ---------------- config / i18n ---------------- */

  protected readonly msg = computed<OgeChartsMessages>(() =>
    mergeOgeChartsMessages(this.config.messages, this.messages()),
  );
  protected readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale,
  );

  /* ---------------- sizing ---------------- */

  private readonly hostSize = signal({ width: 600, height: 400 });
  protected readonly width = computed(() => this.hostSize().width);
  protected readonly height = computed(() => this.hostSize().height);

  constructor() {
    afterNextRender(() => {
      this.autoRtl.set(detectChartRtl(this.hostEl.nativeElement));
      const stop = observeChartSize(this.plotWrapEl().nativeElement, (size) =>
        this.hostSize.set(size),
      );
      this.destroyRef.onDestroy(stop);
    });
    effect(() => {
      this.renderSeries();
      this.drawn.emit();
    });
    // the draw-in runs once: from the first render with data, for `duration`
    effect((onCleanup) => {
      if (!this.isBrowser || !untracked(this.entering)) return;
      if (this.scene().empty) return;
      const timer = setTimeout(
        () => this.entering.set(false),
        untracked(this.resolvedAnimation).duration + 50,
      );
      onCleanup(() => clearTimeout(timer));
    });
    this.destroyRef.onDestroy(() => this.pinch.dispose());
  }

  /* ---------------- orientation / animation ---------------- */

  /** The page direction, read after the first render (SSR-safe). */
  private readonly autoRtl = signal(false);
  protected readonly rtl = computed(() => this.rtlEnabled() ?? this.autoRtl());
  protected readonly hostDir = computed(() => {
    const explicit = this.rtlEnabled();
    return explicit === undefined ? null : explicit ? 'rtl' : 'ltr';
  });
  private readonly reducedMotion = chartPrefersReducedMotion();
  protected readonly resolvedAnimation = computed(() =>
    resolveChartAnimation(this.animation(), this.reducedMotion),
  );
  protected readonly animationVars = computed(() =>
    chartAnimationVars(this.resolvedAnimation()),
  );
  /** True until the first-render draw-in has played. */
  private readonly entering = signal(true);
  protected readonly drawingIn = computed(
    () => this.entering() && this.resolvedAnimation().drawIn,
  );

  /* ---------------- the engine's view model (ADR 0003) ---------------- */

  /** Stage 1 — normalized data; only data/series changes rebuild it. */
  private readonly data = computed(() =>
    buildCartesianData<T>({
      dataSource: this.dataSource(),
      series: this.series(),
      commonSeries: this.commonSeries(),
      argumentType: this.argumentAxis().type,
    }),
  );

  /** Legend-toggle overrides; unset = the series input's `visible` flag. */
  private readonly visibilityOverrides = signal<ReadonlyMap<number, boolean>>(
    new Map(),
  );

  /** Stage 2 — everything drawn except the hover layer. */
  protected readonly scene = computed(() =>
    buildCartesianScene<T>({
      data: this.data(),
      argumentAxis: this.argumentAxis(),
      valueAxis: this.valueAxis(),
      stripLines: this.stripLines(),
      annotations: this.annotations(),
      palette: this.palette(),
      visualRange: this.visualRange(),
      visibilityOverrides: this.visibilityOverrides(),
      width: this.width(),
      height: this.height(),
      locale: this.effectiveLocale(),
      markerThreshold: this.config.markerThreshold,
      rotated: this.rotated(),
      rtl: this.rtl(),
      panes: this.panes(),
    }),
  );

  protected readonly plotX = computed(() => this.scene().plot.x);
  protected readonly plotY = computed(() => this.scene().plot.y);
  protected readonly plotW = computed(() => this.scene().plot.w);
  protected readonly plotH = computed(() => this.scene().plot.h);
  protected readonly sortedArgs = computed(() => this.data().sortedArgs);
  protected readonly renderSeries = computed<readonly OgeChartRenderSeries[]>(
    () => this.scene().renderSeries,
  );
  protected readonly argGrid = computed(() => this.scene().argGrid);
  protected readonly argAxisTitle = computed(() => this.scene().argAxisTitle);
  protected readonly argRotated = computed(() => this.scene().argRotated);
  protected readonly argTicksVm = computed(() => this.scene().argTicks);
  protected readonly valueTicksVm = computed(() => this.scene().valueGridTicks);
  protected readonly valueAxesVm = computed(() => this.scene().valueAxes);
  protected readonly annotationVms = computed(() => this.scene().annotations);
  protected readonly legendItems = computed(() => this.scene().legendItems);
  protected readonly paneVms = computed(() => this.scene().panes);
  protected readonly guides = computed(() => this.scene().guides);
  protected readonly gridLines = computed(() => this.scene().gridLines);
  protected readonly axisLines = computed(() => this.scene().axisLines);
  protected readonly tickMarks = computed(() => this.scene().tickMarks);
  protected readonly breakMarkers = computed(() => this.scene().breakMarkers);
  protected readonly axisLabels = computed(() => this.scene().axisLabels);
  protected readonly axisTitles = computed(() => this.scene().axisTitles);
  protected readonly frameTransform = computed(
    () => this.scene().frame.transform,
  );
  protected readonly pointLabelAnchor = computed(
    () => this.scene().pointLabelAnchor,
  );
  protected readonly pointLabelBaseline = computed(
    () => this.scene().pointLabelBaseline,
  );
  protected readonly touchAction = computed(() =>
    chartTouchAction(this.scene(), this.zoomEnabled(), this.panEnabled()),
  );

  protected paneOf(seriesIndex: number): number {
    return cartesianSeriesPane(this.scene(), seriesIndex);
  }

  protected enterOrigin(seriesIndex: number): string | null {
    return this.drawingIn()
      ? cartesianSeriesEnterOrigin(this.scene(), seriesIndex)
      : null;
  }

  protected labelTransform(x: number, y: number): string | null {
    return cartesianLabelTransform(this.scene(), x, y);
  }

  protected colorOf(seriesIndex: number): string {
    return this.scene().colors[seriesIndex] ?? OGE_CHART_PALETTE[0];
  }

  protected markerRadius(
    marker: OgeChartRenderMarker,
    type: OgeChartRenderSeries['type'],
  ): number {
    return chartMarkerRadius(marker, type);
  }

  /* ---------------- legend ---------------- */

  protected readonly legendVisible = computed(
    () => this.legend().visible !== false,
  );
  protected readonly legendPosition = computed(
    () => this.legend().position ?? 'bottom',
  );
  protected readonly legendInteractive = computed(
    () => this.legend().interactive !== false,
  );

  /** Hovering a legend item spotlights its series and dims the rest. */
  protected readonly hoveredLegend = signal<number | null>(null);

  protected seriesGroupOpacity(seriesIndex: number): number {
    return chartSeriesGroupOpacity(this.hoveredLegend(), seriesIndex);
  }

  protected onLegendClick(seriesIndex: number): void {
    if (!this.legendInteractive()) return;
    const scene = untracked(this.scene);
    const willHide = scene.visibility[seriesIndex] ?? false;
    const series = scene.data.seriesList[seriesIndex];
    const event: OgeChartLegendClickEvent = {
      seriesIndex,
      seriesName: series?.name ?? '',
      willHide,
      cancel: false,
    };
    this.legendClick.emit(event);
    if (event.cancel) return;
    const next = new Map(untracked(this.visibilityOverrides));
    next.set(seriesIndex, !willHide);
    this.visibilityOverrides.set(next);
    this.announce(
      willHide
        ? this.msg().announcements.seriesHidden
        : this.msg().announcements.seriesShown,
      { series: event.seriesName },
    );
  }

  /* ---------------- pointer: tooltip / crosshair ---------------- */

  /** Hovered/keyboard argument position (index into sortedArgs). */
  protected readonly activeArgPos = signal<number | null>(null);
  /** Keyboard-focused series (crosshair value snap + announcements). */
  protected readonly activeSeriesIndex = signal(0);
  private readonly pointerY = signal<number | null>(null);
  protected readonly announcement = signal('');

  private readonly hoverState = computed<OgeCartesianHoverState>(() => ({
    activeArgPos: this.activeArgPos(),
    pointerY: this.pointerY(),
    activeSeriesIndex: this.activeSeriesIndex(),
  }));

  private rafPending = false;

  protected onPointerMove(event: PointerEvent): void {
    if (this.rafPending) return;
    this.rafPending = true;
    const svgRect = this.svgEl().nativeElement.getBoundingClientRect();
    const x = event.clientX - svgRect.left - this.plotX();
    const y = event.clientY - svgRect.top - this.plotY();
    requestAnimationFrame(() => {
      this.rafPending = false;
      const hit = cartesianHoverAt(untracked(this.scene), x, y);
      const changed = untracked(this.activeArgPos) !== hit.position;
      this.activeArgPos.set(hit.position);
      this.pointerY.set(hit.pointerY);
      if (
        changed &&
        hit.position !== null &&
        this.tooltip().enabled !== false
      ) {
        const event: OgeChartTooltipShowingEvent<T> = {
          points: untracked(this.activePoints),
          cancel: false,
        };
        this.tooltipShowing.emit(event);
        this.tooltipCancelled.set(event.cancel);
      }
    });
  }

  private readonly tooltipCancelled = signal(false);

  protected onPointerLeave(): void {
    this.activeArgPos.set(null);
    this.pointerY.set(null);
  }

  /** Point events at the active argument (shared → all visible series). */
  protected readonly activePoints = computed<readonly OgeChartPointEvent<T>[]>(
    () =>
      cartesianActivePoints(
        this.scene(),
        this.hoverState(),
        this.tooltip().shared === true,
      ),
  );

  /** Non-shared tooltips snap to the series whose value is nearest the cursor. */
  private readonly nearestSeriesIndex = computed(() =>
    cartesianNearestSeries(this.scene(), this.hoverState()),
  );

  protected readonly crosshairPx = computed(() =>
    cartesianCrosshair(this.scene(), this.hoverState(), this.crosshair()),
  );
  protected readonly crosshairHorizontal = computed(
    () => this.crosshair().horizontal === true,
  );

  protected readonly tooltipVm = computed(() =>
    cartesianTooltip(
      this.scene(),
      this.hoverState(),
      this.activePoints(),
      this.tooltip(),
      this.zoomDrag() !== null || this.tooltipCancelled(),
    ),
  );

  protected argTextOf(point: OgeChartPoint<T>): string {
    return chartArgumentText(
      this.data().argKind,
      point,
      this.effectiveLocale(),
    );
  }

  protected valueText(point: OgeChartPoint<T>): string {
    return chartValueText(point, this.effectiveLocale());
  }

  /* ---------------- zoom / pan ---------------- */

  protected readonly zoomDrag = signal<{ startPx: number; px: number } | null>(
    null,
  );
  protected readonly zoomSelection = computed(() => {
    const drag = this.zoomDrag();
    return drag === null
      ? null
      : cartesianZoomRect(this.scene(), drag.startPx, drag.px);
  });

  /** The running one-finger / mouse gesture (a second finger cancels it). */
  private activeGesture: ChartGestureHandle | null = null;
  private pinchStart: { range: OgeChartRange; rect: DOMRect } | null = null;

  /** Two fingers on the plot: pinch-zoom and two-finger pan. */
  private readonly pinch = createChartPinchTracker({
    onPinchStart: () => {
      this.activeGesture?.cancel();
      this.activeGesture = null;
      this.zoomDrag.set(null);
      this.pinchStart = {
        range: untracked(this.scene).effectiveRange,
        rect: this.svgEl().nativeElement.getBoundingClientRect(),
      };
    },
    onPinch: (startA, startB, a, b) => {
      const start = this.pinchStart;
      if (start === null) return;
      const scene = untracked(this.scene);
      const local = (point: { clientX: number; clientY: number }) => ({
        x: point.clientX - start.rect.left - scene.plot.x,
        y: point.clientY - start.rect.top - scene.plot.y,
      });
      const next = cartesianPinchRange(
        scene,
        start.range,
        local(startA),
        local(startB),
        local(a),
        local(b),
      );
      if (next !== null) this.visualRange.set(next);
    },
    onPinchEnd: (cancelled) => {
      this.pinchStart = null;
      if (!cancelled) this.announce(this.msg().announcements.zoomed, {});
    },
  });

  protected onWheel(event: WheelEvent): void {
    if (!chartWheelZoomEnabled(this.zoomEnabled())) return;
    const svgRect = this.svgEl().nativeElement.getBoundingClientRect();
    const x = event.clientX - svgRect.left - this.plotX();
    const y = event.clientY - svgRect.top - this.plotY();
    const next = cartesianWheelRange(untracked(this.scene), x, event.deltaY, y);
    if (next === null) return;
    event.preventDefault();
    this.visualRange.set(next);
    this.announce(this.msg().announcements.zoomed, {});
  }

  protected onPlotPointerDown(event: PointerEvent): void {
    if (
      event.pointerType === 'touch' &&
      chartTouchGestures(this.zoomEnabled(), this.panEnabled())
    ) {
      // the second finger turns the gesture into a pinch
      if (this.pinch.pointerDown(event) || this.pinch.active) return;
    }
    if (event.button !== 0) return;
    const mode = chartDragMode(
      this.zoomEnabled(),
      this.panEnabled(),
      event.shiftKey,
      event.pointerType,
    );
    if (mode === null) return;
    const svgRect = this.svgEl().nativeElement.getBoundingClientRect();
    const startScene = untracked(this.scene);
    const startPx = cartesianPlotArgPx(
      startScene,
      event.clientX - svgRect.left - this.plotX(),
      event.clientY - svgRect.top - this.plotY(),
    );
    if (startPx === null) return;
    const startRange = startScene.effectiveRange;
    this.activeGesture = beginChartGesture(event, {
      onMove: (deltaX, deltaY) => {
        const scene = untracked(this.scene);
        if (mode === 'pan') {
          this.visualRange.set(
            cartesianPanRange(scene, startRange, deltaX, deltaY),
          );
        } else {
          this.zoomDrag.set({
            startPx,
            px: startPx + cartesianDragArgDelta(scene, deltaX, deltaY),
          });
        }
      },
      onFinish: (commit, cancelled) => {
        this.activeGesture = null;
        const drag = untracked(this.zoomDrag);
        this.zoomDrag.set(null);
        if (mode === 'pan' || cancelled || !commit || drag === null) return;
        const range = cartesianSelectionRange(
          untracked(this.scene),
          drag.startPx,
          drag.px,
        );
        if (range === null) return;
        this.visualRange.set(range);
        this.announce(this.msg().announcements.zoomed, {});
      },
    });
  }

  /* ---------------- selection / clicks ---------------- */

  protected isSelected(seriesIndex: number, pointIndex: number): boolean {
    return isChartPointSelected(this.selectedPoints(), seriesIndex, pointIndex);
  }

  protected onPlotClick(event: MouseEvent): void {
    const points = untracked(this.activePoints);
    if (points.length === 0) return;
    const nearest =
      points.find(
        (entry) => entry.seriesIndex === untracked(this.nearestSeriesIndex),
      ) ?? points[0];
    const payload: OgeChartPointEvent<T> = { ...nearest, event };
    this.pointClick.emit(payload);
    this.seriesClick.emit({
      seriesIndex: nearest.seriesIndex,
      seriesName: nearest.seriesName,
      event,
    });
    this.applySelection(nearest, event);
  }

  private applySelection(
    target: OgeChartPointEvent<T>,
    event: MouseEvent | KeyboardEvent,
  ): void {
    const series = untracked(this.data).seriesList[target.seriesIndex];
    const refs = nextChartSelection(
      this.selectionMode(),
      untracked(this.selectedPoints),
      target,
      series?.points.length ?? 0,
      event.ctrlKey || event.metaKey,
    );
    if (refs === null) return;
    this.selectedPoints.set(refs);
    if (refs.length > 0) {
      this.announce(this.msg().announcements.selected, {
        series: target.seriesName,
        argument: this.argTextOf(target.point),
      });
    }
  }

  /* ---------------- keyboard ---------------- */

  protected onPlotKeydown(event: KeyboardEvent): void {
    const scene = untracked(this.scene);
    const position = untracked(this.activeArgPos);
    const command = cartesianKeyCommand(event.key, {
      argCount: scene.data.sortedArgs.length,
      position,
      seriesIndex: untracked(this.activeSeriesIndex),
      seriesCount: scene.data.seriesList.length,
      isSeriesVisible: (index) => scene.visibility[index] === true,
      zoomed: scene.zoomed,
      rotated: scene.rotated,
      rtl: scene.rtl,
    });
    if (command === null) return;
    switch (command.type) {
      case 'argument':
        event.preventDefault();
        this.activeArgPos.set(command.position);
        if (command.clearPointer) this.pointerY.set(null);
        this.announceActive();
        return;
      case 'series':
        event.preventDefault();
        this.activeSeriesIndex.set(command.seriesIndex);
        this.announceActive();
        return;
      case 'activate': {
        event.preventDefault();
        if (position === null) return;
        const seriesIndex = untracked(this.activeSeriesIndex);
        const series = scene.data.seriesList[seriesIndex];
        const pointIndex = scene.data.argIndex.pointIndexAt(
          position,
          seriesIndex,
        );
        if (series === undefined || pointIndex === -1) return;
        const target: OgeChartPointEvent<T> = {
          seriesIndex,
          seriesName: series.name,
          pointIndex,
          point: series.points[pointIndex],
          event,
        };
        this.pointClick.emit(target);
        this.applySelection(target, event);
        return;
      }
      case 'resetZoom':
        event.preventDefault();
        this.resetZoom();
        return;
    }
  }

  private announceActive(): void {
    const position = untracked(this.activeArgPos);
    if (position === null) return;
    const text = cartesianPointAnnouncement(
      untracked(this.scene),
      this.msg(),
      position,
      untracked(this.activeSeriesIndex),
    );
    if (text !== null) this.announcement.set(text);
  }

  /* ---------------- aria / sr table ---------------- */

  protected readonly rootAriaLabel = computed(() =>
    cartesianAriaLabel(this.msg(), this.title(), this.data().seriesList.length),
  );

  protected readonly srRows = computed(() =>
    cartesianSrRows(this.scene(), this.config.a11yTableLimit ?? 50),
  );

  private announce(
    template: string,
    tokens: Readonly<Record<string, string>>,
  ): void {
    this.announcement.set(formatOgeChartMessage(template, tokens));
  }

  /* ---------------- public methods ---------------- */

  zoomToRange(range: OgeChartRange): void {
    this.visualRange.set(cartesianZoomTo(untracked(this.scene), range));
  }

  resetZoom(): void {
    this.visualRange.set(null);
    this.announce(this.msg().announcements.zoomReset, {});
  }

  hideTooltip(): void {
    this.activeArgPos.set(null);
    this.pointerY.set(null);
  }

  /** Re-measures the container (rarely needed — ResizeObserver covers it). */
  refresh(): void {
    const size = measureChartElement(this.plotWrapEl().nativeElement);
    if (size !== null) this.hostSize.set(size);
    this.autoRtl.set(detectChartRtl(this.hostEl.nativeElement));
  }

  focus(): void {
    this.plotWrapEl().nativeElement.focus();
  }

  /** The live SVG root — the exporters rasterize/serialize it. */
  getSvgElement(): SVGSVGElement {
    return this.svgEl().nativeElement;
  }

  /** Snapshot for `@oge-ui/charts/export-image`. */
  getExportData(): OgeChartExportData<T> {
    return cartesianExportData(untracked(this.scene), untracked(this.title));
  }
}
