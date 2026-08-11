import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
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
import { toLocalDate } from '@oge-ui/core';
import {
  categoryBandPx,
  clampRange,
  createCategoryScale,
  createLinearScale,
  createLogScale,
  createTimeScale,
  type ChartRange,
  type ChartScale,
  type ChartScaleKind,
} from '../engine/scale';
import {
  buildSeries,
  collectCategories,
  isBarType,
  numericArgument,
  seriesValueExtent,
  type ChartPoint,
  type ChartSeries,
  type ChartSeriesInput,
} from '../engine/series-model';
import {
  candleGeometry,
  computeBarSlots,
  computeStacks,
} from '../engine/series-layout';
import {
  baselineAreaPath,
  linePath,
  splinePath,
  steppedPoints,
  type PathPoint,
} from '../engine/path-builder';
import { downsamplePath } from '../engine/downsample';
import {
  decideLabelLayout,
  numberFormat,
  siFormat,
  timeTickFormatter,
} from '../engine/tick-format';
import { buildArgumentIndex, nearestIndex } from '../engine/hit-test';
import { panRange, rangeFromSelection, zoomRangeAt } from '../engine/zoom-math';
import { beginChartGesture } from './chart-gesture';
import {
  OgeChartAnnotationTemplate,
  OgeChartLegendTemplate,
  OgeChartTooltipTemplate,
} from './chart-templates';
import { OGE_CHARTS_CONFIG, type OgeChartsMessages } from '../config';
import type {
  OgeChartAnnotation,
  OgeChartAxisOptions,
  OgeChartCrosshairOptions,
  OgeChartExportData,
  OgeChartLegendClickEvent,
  OgeChartLegendOptions,
  OgeChartPointEvent,
  OgeChartPointRef,
  OgeChartRange,
  OgeChartSeriesEvent,
  OgeChartStripLine,
  OgeChartTooltipOptions,
  OgeChartTooltipShowingEvent,
} from '../charts-types';

/**
 * Default palette — concrete hex values (not CSS vars) so exported images
 * carry their colors; chosen to hold up on light and dark surfaces.
 */
export const OGE_CHART_PALETTE: readonly string[] = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#ec4899',
  '#84cc16',
];

const MARGIN_TOP = 16;
const MARGIN_BOTTOM = 34;
const AXIS_W = 52;

interface RenderBar {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly seriesIndex: number;
  readonly pointIndex: number;
}

interface RenderCandle {
  readonly x: number;
  readonly bodyY: number;
  readonly bodyH: number;
  readonly wickY1: number;
  readonly wickY2: number;
  readonly w: number;
  readonly rising: boolean;
  readonly pointIndex: number;
}

interface RenderMarker {
  readonly x: number;
  readonly y: number;
  readonly seriesIndex: number;
  readonly pointIndex: number;
  /** bubble radius; undefined = the default marker size. */
  readonly r?: number;
}

interface RenderLabel {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

interface RenderSeries {
  readonly seriesIndex: number;
  readonly name: string;
  readonly color: string;
  readonly type: ChartSeries['type'];
  readonly linePathD: string | null;
  readonly areaPathD: string | null;
  readonly bars: readonly RenderBar[];
  readonly candles: readonly RenderCandle[];
  readonly markers: readonly RenderMarker[];
  readonly labels: readonly RenderLabel[];
  readonly dashArray: string | null;
  readonly strokeWidth: number;
  readonly opacity: number;
}

interface AxisTickVm {
  readonly px: number;
  readonly label: string;
}

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
  host: { class: 'oge-chart' },
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
          (pointermove)="onPointerMove($event)"
          (pointerdown)="onPlotPointerDown($event)"
          (click)="onPlotClick($event)"
          (wheel)="onWheel($event)"
        >
          <!-- eslint-enable @angular-eslint/template/click-events-have-key-events -->
          <defs>
            <clipPath [attr.id]="clipId">
              <rect
                x="0"
                y="0"
                [attr.width]="plotW()"
                [attr.height]="plotH()"
              />
            </clipPath>
          </defs>
          <g [attr.transform]="'translate(' + plotX() + ',' + plotY() + ')'">
            <!-- strip lines / bands -->
            @for (strip of stripRects(); track $index) {
              @if (strip.widthPx > 0) {
                <rect
                  class="oge-chart-strip"
                  [attr.x]="strip.px"
                  y="0"
                  [attr.width]="strip.widthPx"
                  [attr.height]="plotH()"
                  [attr.fill]="strip.color ?? null"
                />
              } @else {
                <line
                  class="oge-chart-strip-line"
                  [attr.x1]="strip.px"
                  [attr.x2]="strip.px"
                  y1="0"
                  [attr.y2]="plotH()"
                  [attr.stroke]="strip.color ?? null"
                />
              }
              @if (strip.label) {
                <text
                  class="oge-chart-strip-label"
                  [attr.x]="strip.px + 4"
                  y="12"
                >
                  {{ strip.label }}
                </text>
              }
            }
            <!-- grid -->
            @for (tick of valueTicksVm(); track tick.px) {
              <line
                class="oge-chart-grid"
                x1="0"
                [attr.x2]="plotW()"
                [attr.y1]="tick.px"
                [attr.y2]="tick.px"
              />
            }
            @if (argGrid()) {
              @for (tick of argTicksVm(); track tick.px) {
                <line
                  class="oge-chart-grid"
                  [attr.x1]="tick.px"
                  [attr.x2]="tick.px"
                  y1="0"
                  [attr.y2]="plotH()"
                />
              }
            }
            <!-- series -->
            <g [attr.clip-path]="'url(#' + clipId + ')'">
              @for (rs of renderSeries(); track rs.seriesIndex) {
                <g
                  class="oge-chart-series"
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
                      [attr.r]="marker.r ?? (rs.type === 'scatter' ? 4 : 3.5)"
                      [attr.fill]="rs.color"
                    />
                  }
                  @for (label of rs.labels; track $index) {
                    <text
                      class="oge-chart-point-label"
                      [attr.x]="label.x"
                      [attr.y]="label.y"
                      text-anchor="middle"
                    >
                      {{ label.text }}
                    </text>
                  }
                </g>
              }
            </g>
            <!-- crosshair -->
            @if (crosshairPx(); as cross) {
              <line
                class="oge-chart-crosshair"
                [attr.x1]="cross.x"
                [attr.x2]="cross.x"
                y1="0"
                [attr.y2]="plotH()"
              />
              @if (crosshairHorizontal() && cross.y !== null) {
                <line
                  class="oge-chart-crosshair"
                  x1="0"
                  [attr.x2]="plotW()"
                  [attr.y1]="cross.y"
                  [attr.y2]="cross.y"
                />
              }
            }
            <!-- zoom selection -->
            @if (zoomSelection(); as sel) {
              <rect
                class="oge-chart-zoom-rect"
                [attr.x]="sel.x"
                y="0"
                [attr.width]="sel.w"
                [attr.height]="plotH()"
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
            <!-- axes lines -->
            <line
              class="oge-chart-axis-line"
              x1="0"
              [attr.x2]="plotW()"
              [attr.y1]="plotH()"
              [attr.y2]="plotH()"
            />
          </g>
          <!-- argument labels -->
          @for (tick of argTicksVm(); track tick.px) {
            <text
              class="oge-chart-axis-label oge-chart-arg-label"
              [attr.x]="plotX() + tick.px"
              [attr.y]="plotY() + plotH() + 16"
              [attr.text-anchor]="argRotated() ? 'end' : 'middle'"
              [attr.transform]="
                argRotated()
                  ? 'rotate(-40 ' +
                    (plotX() + tick.px) +
                    ' ' +
                    (plotY() + plotH() + 16) +
                    ')'
                  : null
              "
            >
              {{ tick.label }}
            </text>
          }
          <!-- value labels -->
          @for (axis of valueAxesVm(); track axis.index) {
            @for (tick of axis.ticks; track tick.px) {
              <text
                class="oge-chart-axis-label"
                [attr.x]="axis.labelX"
                [attr.y]="plotY() + tick.px + 4"
                [attr.text-anchor]="axis.anchor"
              >
                {{ tick.label }}
              </text>
            }
            @if (axis.title) {
              <text
                class="oge-chart-axis-title"
                [attr.transform]="axis.titleTransform"
                text-anchor="middle"
              >
                {{ axis.title }}
              </text>
            }
          }
          @if (argAxisTitle()) {
            <text
              class="oge-chart-axis-title"
              [attr.x]="plotX() + plotW() / 2"
              [attr.y]="height() - 4"
              text-anchor="middle"
            >
              {{ argAxisTitle() }}
            </text>
          }
          @if (visibleSeries().length === 0 || sortedArgs().length === 0) {
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
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly clipId = `oge-chart-clip-${OgeChart.nextId++}`;

  /* ---------------- inputs ---------------- */

  readonly dataSource = input<readonly T[]>([]);
  readonly series = input<readonly ChartSeriesInput<T>[]>([]);
  /** Shared defaults merged under every series (dx commonSeriesSettings). */
  readonly commonSeries = input<Partial<ChartSeriesInput<T>>>({});
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
  readonly animation = input(true);
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

  protected readonly msg = computed<OgeChartsMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
    aria: { ...this.config.messages.aria, ...this.messages().aria },
    announcements: {
      ...this.config.messages.announcements,
      ...this.messages().announcements,
    },
  }));
  protected readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale,
  );

  /* ---------------- sizing ---------------- */

  private readonly hostSize = signal({ width: 600, height: 400 });
  protected readonly width = computed(() => this.hostSize().width);
  protected readonly height = computed(() => this.hostSize().height);

  constructor() {
    afterNextRender(() => {
      const wrap = this.plotWrapEl().nativeElement;
      const measure = (): void => {
        const rect = wrap.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          this.hostSize.set({
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      };
      measure();
      if (typeof ResizeObserver === 'undefined') return; // jsdom
      let frame = false;
      const observer = new ResizeObserver(() => {
        if (frame) return;
        frame = true;
        requestAnimationFrame(() => {
          frame = false;
          measure();
        });
      });
      observer.observe(wrap);
    });
    effect(() => {
      this.renderSeries();
      this.drawn.emit();
    });
  }

  protected readonly rightAxisCount = computed(
    () =>
      this.valueAxesOptions().filter((axis) => axis.position === 'end').length,
  );
  protected readonly leftAxisCount = computed(
    () => this.valueAxesOptions().length - this.rightAxisCount(),
  );
  protected readonly plotX = computed(
    () => Math.max(1, this.leftAxisCount()) * AXIS_W,
  );
  protected readonly plotY = computed(() => MARGIN_TOP);
  protected readonly plotW = computed(() =>
    Math.max(
      10,
      this.width() -
        this.plotX() -
        Math.max(this.rightAxisCount() * AXIS_W, 12),
    ),
  );
  protected readonly plotH = computed(() =>
    Math.max(
      10,
      this.height() -
        MARGIN_TOP -
        MARGIN_BOTTOM -
        (this.argAxisTitle() ? 14 : 0),
    ),
  );

  /* ---------------- data pipeline ---------------- */

  protected readonly argKind = computed<ChartScaleKind>(() => {
    const explicit = this.argumentAxis().type;
    if (explicit !== undefined) return explicit;
    // auto-detect from the first plottable argument
    for (const item of this.dataSource()) {
      for (const seriesInput of this.series()) {
        const expr = seriesInput.argumentField;
        if (expr === undefined) return 'linear';
        const raw =
          typeof expr === 'string'
            ? (item as Record<string, unknown>)[expr]
            : expr(item);
        if (raw === undefined || raw === null) continue;
        if (typeof raw === 'number') return 'linear';
        if (raw instanceof Date) return 'time';
        if (typeof raw === 'string') {
          return toLocalDate(raw) !== null ? 'time' : 'category';
        }
        return 'category';
      }
    }
    return 'linear';
  });

  private readonly mergedSeriesInputs = computed<
    readonly ChartSeriesInput<T>[]
  >(() => {
    const common = this.commonSeries();
    return this.series().map(
      (entry) => ({ ...common, ...entry }) as ChartSeriesInput<T>,
    );
  });

  protected readonly categories = computed<readonly unknown[]>(() =>
    this.argKind() === 'category'
      ? collectCategories(this.dataSource(), this.mergedSeriesInputs())
      : [],
  );
  private readonly categoryIndex = computed<ReadonlyMap<unknown, number>>(
    () =>
      new Map(this.categories().map((category, index) => [category, index])),
  );

  protected readonly seriesList = computed<readonly ChartSeries<T>[]>(() => {
    const kind = this.argKind();
    const categoryIndex = this.categoryIndex();
    const data = this.dataSource();
    return this.mergedSeriesInputs().map((input, index) =>
      buildSeries(data, input, index, kind, categoryIndex),
    );
  });

  /** Legend-toggle overrides; unset = the series input's `visible` flag. */
  private readonly visibilityOverrides = signal<ReadonlyMap<number, boolean>>(
    new Map(),
  );

  protected isSeriesVisible(seriesIndex: number): boolean {
    const override = this.visibilityOverrides().get(seriesIndex);
    if (override !== undefined) return override;
    return this.seriesList()[seriesIndex]?.input.visible !== false;
  }

  protected readonly visibleSeries = computed(() =>
    this.seriesList().filter((_, index) => this.isSeriesVisible(index)),
  );

  /** Full data bounds on the argument axis. */
  protected readonly argBounds = computed<ChartRange>(() => {
    if (this.argKind() === 'category') {
      return { min: -0.5, max: Math.max(0.5, this.categories().length - 0.5) };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const series of this.seriesList()) {
      for (const point of series.points) {
        if (point.argNumeric === null) continue;
        if (point.argNumeric < min) min = point.argNumeric;
        if (point.argNumeric > max) max = point.argNumeric;
      }
    }
    if (min > max) return { min: 0, max: 1 };
    const axis = this.argumentAxis();
    const override = (value: number | Date | undefined): number | null =>
      value === undefined
        ? null
        : value instanceof Date
          ? value.getTime()
          : value;
    min = override(axis.min) ?? min;
    max = override(axis.max) ?? max;
    if (min === max) max = min + 1;
    // bars need half a band of headroom on both sides
    if (this.hasBars()) {
      const pad = (max - min) * 0.03;
      min -= pad;
      max += pad;
    }
    return { min, max };
  });

  private readonly hasBars = computed(() =>
    this.seriesList().some((series) => isBarType(series.type)),
  );

  protected readonly effectiveRange = computed<ChartRange>(() => {
    const bounds = this.argBounds();
    const range = this.visualRange();
    return range === null ? bounds : clampRange(range, bounds);
  });

  protected readonly argScale = computed<ChartScale>(() => {
    const range = this.effectiveRange();
    const kind = this.argKind();
    const rangePx = this.plotW();
    const inverted = this.argumentAxis().inverted;
    if (kind === 'time') {
      return createTimeScale({
        min: range.min,
        max: range.max,
        rangePx,
        inverted,
      });
    }
    if (kind === 'category') {
      const full = this.visualRange() === null;
      if (full) {
        return createCategoryScale({
          count: this.categories().length,
          rangePx,
          inverted,
        });
      }
      const linear = createLinearScale({
        min: range.min,
        max: range.max,
        rangePx,
        inverted,
      });
      const ticks: number[] = [];
      for (
        let i = Math.max(0, Math.ceil(range.min));
        i <= Math.min(this.categories().length - 1, Math.floor(range.max));
        i++
      ) {
        ticks.push(i);
      }
      return { ...linear, kind: 'category', ticks };
    }
    if (kind === 'logarithmic') {
      return createLogScale({
        min: range.min,
        max: range.max,
        rangePx,
        inverted,
      });
    }
    return createLinearScale({
      min: range.min,
      max: range.max,
      rangePx,
      inverted,
    });
  });

  protected readonly valueAxesOptions = computed<
    readonly OgeChartAxisOptions[]
  >(() => {
    const axis = this.valueAxis();
    const list = Array.isArray(axis)
      ? (axis as readonly OgeChartAxisOptions[])
      : [axis as OgeChartAxisOptions];
    return list.length > 0 ? list : [{}];
  });

  private readonly stacksBySeries = computed(() =>
    computeStacks(this.seriesList()),
  );

  protected readonly valueScales = computed<readonly ChartScale[]>(() => {
    const axes = this.valueAxesOptions();
    const stacks = this.stacksBySeries();
    const plotH = this.plotH();
    return axes.map((axis, axisIndex) => {
      let min = Infinity;
      let max = -Infinity;
      this.seriesList().forEach((series, seriesIndex) => {
        if (!this.isSeriesVisible(seriesIndex)) return;
        if ((series.input.axis ?? 0) !== axisIndex) return;
        const stacked = stacks[seriesIndex];
        if (stacked !== null) {
          for (const entry of stacked) {
            if (entry === null) continue;
            min = Math.min(min, entry.base, entry.top);
            max = Math.max(max, entry.base, entry.top);
          }
        } else {
          const extent = seriesValueExtent(series);
          if (extent !== null) {
            min = Math.min(min, extent.min);
            max = Math.max(max, extent.max);
          }
        }
        if (isBarType(series.type) || series.type === 'area') {
          min = Math.min(min, 0);
          max = Math.max(max, 0);
        }
      });
      if (min > max) {
        min = 0;
        max = 1;
      }
      const pad = (max - min || 1) * 0.05;
      let lo = min === 0 ? 0 : min - pad;
      let hi = max === 0 ? 0 : max + pad;
      const override = (value: number | Date | undefined): number | null =>
        value === undefined
          ? null
          : value instanceof Date
            ? value.getTime()
            : value;
      lo = override(axis.min) ?? lo;
      hi = override(axis.max) ?? hi;
      if (lo === hi) hi = lo + 1;
      // value axes render top-down: inverted mapping unless the user flips
      const inverted = axis.inverted !== true;
      if (axis.type === 'logarithmic') {
        return createLogScale({
          min: Math.max(lo, Number.MIN_VALUE),
          max: hi,
          rangePx: plotH,
          inverted,
        });
      }
      return createLinearScale({ min: lo, max: hi, rangePx: plotH, inverted });
    });
  });

  /* ---------------- render model ---------------- */

  protected readonly resolvedPalette = computed<readonly string[]>(
    () => this.palette() ?? OGE_CHART_PALETTE,
  );

  protected colorOf(seriesIndex: number): string {
    const series = this.seriesList()[seriesIndex];
    const palette = this.resolvedPalette();
    return series?.input.color ?? palette[seriesIndex % palette.length];
  }

  private barBandPx(): number {
    const scale = this.argScale();
    if (this.argKind() === 'category') {
      const visible =
        (this.effectiveRange().max - this.effectiveRange().min) /
        Math.max(1, this.categories().length);
      const count =
        this.visualRange() === null
          ? this.categories().length
          : Math.max(1, this.categories().length * visible);
      return categoryBandPx(scale, Math.round(count));
    }
    // continuous axes: the smallest px gap between adjacent arguments
    const args = this.sortedArgs();
    if (args.length < 2) return Math.min(40, this.plotW() / 2);
    let minDelta = Infinity;
    for (let i = 1; i < args.length; i++) {
      minDelta = Math.min(minDelta, args[i] - args[i - 1]);
    }
    return Math.max(
      2,
      Math.abs(scale.toPx(args[0] + minDelta) - scale.toPx(args[0])),
    );
  }

  protected readonly renderSeries = computed<readonly RenderSeries[]>(() => {
    const scale = this.argScale();
    const scales = this.valueScales();
    const stacks = this.stacksBySeries();
    const barSlots = computeBarSlots(this.seriesList(), this.barBandPx());
    const markerThreshold = this.config.markerThreshold ?? 200;
    const result: RenderSeries[] = [];
    this.seriesList().forEach((series, seriesIndex) => {
      if (!this.isSeriesVisible(seriesIndex)) return;
      const valueScale = scales[series.input.axis ?? 0] ?? scales[0];
      const color = this.colorOf(seriesIndex);
      const stacked = stacks[seriesIndex];
      const slot = barSlots[seriesIndex];
      const xOf = (point: ChartPoint<T>): number | null =>
        point.argNumeric === null ? null : scale.toPx(point.argNumeric);
      const showLabels = series.input.showLabels === true;
      const labels: RenderLabel[] = [];
      const labelText = (value: number): string =>
        siFormat(value, this.effectiveLocale());
      const dashArray =
        series.input.dashStyle === 'dash'
          ? '6 4'
          : series.input.dashStyle === 'dot'
            ? '2 3'
            : null;
      const strokeWidth = series.input.width ?? 2;
      const opacity = series.input.opacity ?? 1;

      let linePathD: string | null = null;
      let areaPathD: string | null = null;
      const bars: RenderBar[] = [];
      const candles: RenderCandle[] = [];
      const markers: RenderMarker[] = [];

      const type = series.type;
      if (isBarType(type)) {
        series.points.forEach((point, pointIndex) => {
          const x = xOf(point);
          if (x === null || slot === null) return;
          const segment =
            type === 'rangeBar'
              ? point.value === null || point.value2 === null
                ? null
                : { base: point.value2, top: point.value }
              : (stacked?.[pointIndex] ??
                (point.value === null ? null : { base: 0, top: point.value }));
          if (segment === null) return;
          const y1 = valueScale.toPx(segment.base);
          const y2 = valueScale.toPx(segment.top);
          bars.push({
            x: x + slot.offsetPx,
            y: Math.min(y1, y2),
            w: slot.widthPx,
            h: Math.max(1, Math.abs(y2 - y1)),
            seriesIndex,
            pointIndex,
          });
          if (showLabels && point.value !== null) {
            labels.push({
              x: x + slot.offsetPx + slot.widthPx / 2,
              y: Math.min(y1, y2) - 4,
              text: labelText(point.value),
            });
          }
        });
      } else if (type === 'bubble') {
        let sizeMin = Infinity;
        let sizeMax = -Infinity;
        for (const point of series.points) {
          if (point.size === null) continue;
          sizeMin = Math.min(sizeMin, point.size);
          sizeMax = Math.max(sizeMax, point.size);
        }
        const sizeSpan = sizeMax - sizeMin || 1;
        series.points.forEach((point, pointIndex) => {
          const x = xOf(point);
          if (x === null || point.value === null) return;
          const frac =
            point.size === null ? 0.5 : (point.size - sizeMin) / sizeSpan;
          // sqrt so AREA (not radius) tracks the size value
          const r = 4 + Math.sqrt(frac) * 14;
          const y = valueScale.toPx(point.value);
          markers.push({ x, y, seriesIndex, pointIndex, r });
          if (showLabels) {
            labels.push({ x, y: y - r - 4, text: labelText(point.value) });
          }
        });
      } else if (type === 'candlestick') {
        const w = Math.max(3, this.barBandPx() * 0.5);
        series.points.forEach((point, pointIndex) => {
          const x = xOf(point);
          const geometry = candleGeometry(point);
          if (x === null || geometry === null) return;
          const bodyY1 = valueScale.toPx(geometry.bodyTop);
          const bodyY2 = valueScale.toPx(geometry.bodyBottom);
          candles.push({
            x,
            bodyY: Math.min(bodyY1, bodyY2),
            bodyH: Math.max(1, Math.abs(bodyY2 - bodyY1)),
            wickY1: valueScale.toPx(geometry.wickTop),
            wickY2: valueScale.toPx(geometry.wickBottom),
            w,
            rising: geometry.rising,
            pointIndex,
          });
        });
      } else if (type === 'scatter') {
        series.points.forEach((point, pointIndex) => {
          const x = xOf(point);
          if (x === null || point.value === null) return;
          const y = valueScale.toPx(point.value);
          markers.push({ x, y, seriesIndex, pointIndex });
          if (showLabels) {
            labels.push({ x, y: y - 8, text: labelText(point.value) });
          }
        });
      } else {
        // line-family
        const spline = type === 'spline' || type === 'splineArea';
        const step = type === 'stepLine' || type === 'stepArea';
        const top: PathPoint[] = series.points.map((point, pointIndex) => {
          const x = xOf(point);
          const value =
            stacked !== null ? (stacked[pointIndex]?.top ?? null) : point.value;
          return {
            x: x ?? 0,
            y: x === null || value === null ? null : valueScale.toPx(value),
          };
        });
        // big series: LTTB-downsample the PATH only (markers/hit-testing
        // keep the full data) so one path never carries more points than
        // the plot has pixels
        const budget = Math.max(200, Math.ceil(this.plotW() * 1.5));
        const pathTop = step
          ? steppedPoints(top)
          : top.length > budget
            ? downsamplePath(top, budget)
            : top;
        linePathD = spline ? splinePath(pathTop) : linePath(pathTop);
        if (
          type === 'area' ||
          type === 'splineArea' ||
          type === 'stepArea' ||
          type === 'stackedArea' ||
          type === 'fullStackedArea' ||
          type === 'rangeArea'
        ) {
          if (type === 'rangeArea') {
            const bottom: PathPoint[] = series.points.map((point) => {
              const x = xOf(point);
              return {
                x: x ?? 0,
                y:
                  x === null || point.value2 === null
                    ? null
                    : valueScale.toPx(point.value2),
              };
            });
            const back = reversePathPoints(bottom);
            areaPathD =
              linePathD !== '' && back !== '' ? `${linePathD} ${back} Z` : null;
          } else if (
            (type === 'stackedArea' || type === 'fullStackedArea') &&
            stacked !== null
          ) {
            const bottom: PathPoint[] = series.points.map(
              (point, pointIndex) => {
                const x = xOf(point);
                const segment = stacked[pointIndex];
                return {
                  x: x ?? 0,
                  y:
                    x === null || segment === null
                      ? null
                      : valueScale.toPx(segment.base),
                };
              },
            );
            areaPathD = `${linePathD} ${reversePathPoints(bottom)} Z`;
          } else {
            const baselineY = valueScale.toPx(
              Math.max(valueScale.min, Math.min(valueScale.max, 0)),
            );
            areaPathD = baselineAreaPath(pathTop, baselineY, spline);
          }
        }
        if (series.points.length <= markerThreshold) {
          series.points.forEach((point, pointIndex) => {
            const pathPoint = top[pointIndex];
            if (pathPoint.y === null) return;
            markers.push({
              x: pathPoint.x,
              y: pathPoint.y,
              seriesIndex,
              pointIndex,
            });
            if (showLabels && point.value !== null) {
              labels.push({
                x: pathPoint.x,
                y: pathPoint.y - 8,
                text: labelText(point.value),
              });
            }
          });
        }
      }
      result.push({
        seriesIndex,
        name: series.name,
        color,
        type,
        linePathD: linePathD === '' ? null : linePathD,
        areaPathD: areaPathD === '' ? null : areaPathD,
        bars,
        candles,
        markers,
        labels,
        dashArray,
        strokeWidth,
        opacity,
      });
    });
    return result;
  });

  /* ---------------- axes vm ---------------- */

  protected readonly argGrid = computed(
    () => this.argumentAxis().grid === true,
  );
  protected readonly argAxisTitle = computed(
    () => this.argumentAxis().title ?? '',
  );

  private argLabelOf(tickValue: number): string {
    const axis = this.argumentAxis();
    const kind = this.argKind();
    if (axis.labelFormat !== undefined) {
      const raw =
        kind === 'category' ? this.categories()[tickValue] : tickValue;
      return axis.labelFormat(kind === 'time' ? new Date(tickValue) : raw);
    }
    if (kind === 'category') {
      return String(this.categories()[tickValue] ?? '');
    }
    if (kind === 'time') {
      const unit = this.argScale().tickUnit ?? 'day';
      return timeTickFormatter(unit, this.effectiveLocale())(tickValue);
    }
    return numberFormat(tickValue, this.effectiveLocale());
  }

  protected readonly argTicksLayout = computed(() => {
    const scale = this.argScale();
    const labels = scale.ticks.map((tick) => this.argLabelOf(tick));
    const widest = labels.reduce(
      (acc, label) => Math.max(acc, label.length * 7),
      0,
    );
    return decideLabelLayout(
      scale.ticks.length,
      this.plotW(),
      widest,
      this.argumentAxis().labelOverlap ?? 'skip',
    );
  });
  protected readonly argRotated = computed(() => this.argTicksLayout().rotated);

  protected readonly argTicksVm = computed<readonly AxisTickVm[]>(() => {
    const scale = this.argScale();
    const { skipEvery } = this.argTicksLayout();
    return scale.ticks
      .filter((_, index) => index % skipEvery === 0)
      .map((tick) => ({ px: scale.toPx(tick), label: this.argLabelOf(tick) }));
  });

  protected readonly valueTicksVm = computed<readonly AxisTickVm[]>(() => {
    const scale = this.valueScales()[0];
    if (scale === undefined) return [];
    return scale.ticks.map((tick) => ({
      px: scale.toPx(tick),
      label: '',
    }));
  });

  protected readonly valueAxesVm = computed(() => {
    const axes = this.valueAxesOptions();
    const scales = this.valueScales();
    let leftSlot = 0;
    let rightSlot = 0;
    return axes.map((axis, index) => {
      const scale = scales[index];
      const right = axis.position === 'end';
      const slot = right ? rightSlot++ : leftSlot++;
      const labelX = right
        ? this.plotX() + this.plotW() + 8 + slot * AXIS_W
        : this.plotX() - 8 - slot * AXIS_W;
      const format = (value: number): string => {
        if (axis.labelFormat !== undefined) return axis.labelFormat(value);
        return axis.abbreviate === false
          ? numberFormat(value, this.effectiveLocale())
          : siFormat(value, this.effectiveLocale());
      };
      const titleX = right ? labelX + AXIS_W - 14 : labelX - AXIS_W + 14;
      const titleY = this.plotY() + this.plotH() / 2;
      return {
        index,
        anchor: right ? ('start' as const) : ('end' as const),
        labelX,
        title: axis.title ?? '',
        titleTransform: `translate(${titleX},${titleY}) rotate(${right ? 90 : -90})`,
        ticks:
          scale === undefined
            ? []
            : scale.ticks.map((tick) => ({
                px: scale.toPx(tick),
                label: format(tick),
              })),
      };
    });
  });

  protected readonly stripRects = computed(() => {
    const scale = this.argScale();
    const kind = this.argKind();
    const categoryIndex = this.categoryIndex();
    const toNumeric = (value: number | Date | string): number | null =>
      numericArgument(value, kind, categoryIndex);
    return this.stripLines()
      .map((strip) => {
        const start = toNumeric(strip.start);
        if (start === null) return null;
        const px = scale.toPx(start);
        const end = strip.end === undefined ? null : toNumeric(strip.end);
        return {
          px,
          widthPx: end === null ? 0 : Math.max(0, scale.toPx(end) - px),
          label: strip.label,
          color: strip.color,
        };
      })
      .filter((strip): strip is NonNullable<typeof strip> => strip !== null);
  });

  protected readonly annotationVms = computed(() => {
    const scale = this.argScale();
    const scales = this.valueScales();
    const kind = this.argKind();
    const categoryIndex = this.categoryIndex();
    return this.annotations()
      .map((annotation) => {
        const arg = numericArgument(annotation.argument, kind, categoryIndex);
        if (arg === null) return null;
        const x = scale.toPx(arg);
        const valueScale = scales[annotation.axis ?? 0] ?? scales[0];
        const anchorY =
          annotation.value === undefined
            ? 14
            : valueScale.toPx(annotation.value);
        const isPoint = annotation.type !== 'text';
        const labelX = x + (annotation.offsetX ?? 12);
        const labelY = anchorY + (annotation.offsetY ?? -12);
        return {
          x,
          y: anchorY,
          isPoint,
          text: annotation.text,
          color: annotation.color,
          labelX,
          labelY,
          labelW: annotation.text.length * 6.6 + 12,
        };
      })
      .filter(
        (annotation): annotation is NonNullable<typeof annotation> =>
          annotation !== null,
      );
  });

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
  protected readonly legendItems = computed(() =>
    this.seriesList()
      .map((series, seriesIndex) => ({
        seriesIndex,
        name: series.name,
        color: this.colorOf(seriesIndex),
        hidden: !this.isSeriesVisible(seriesIndex),
        inLegend: series.input.showInLegend !== false,
      }))
      .filter((item) => item.inLegend),
  );

  /** Hovering a legend item spotlights its series and dims the rest. */
  protected readonly hoveredLegend = signal<number | null>(null);

  protected seriesGroupOpacity(seriesIndex: number): number {
    const hovered = this.hoveredLegend();
    return hovered === null || hovered === seriesIndex ? 1 : 0.25;
  }

  protected onLegendClick(seriesIndex: number): void {
    if (!this.legendInteractive()) return;
    const willHide = untracked(() => this.isSeriesVisible(seriesIndex));
    const series = untracked(this.seriesList)[seriesIndex];
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

  private readonly argIndex = computed(() =>
    buildArgumentIndex(
      this.seriesList().map((series) =>
        series.points.map((point) => point.argNumeric),
      ),
    ),
  );
  protected readonly sortedArgs = computed(() => this.argIndex().sortedArgs);

  /** Hovered/keyboard argument position (index into sortedArgs). */
  protected readonly activeArgPos = signal<number | null>(null);
  /** Keyboard-focused series (crosshair value snap + announcements). */
  protected readonly activeSeriesIndex = signal(0);
  private readonly pointerY = signal<number | null>(null);
  protected readonly announcement = signal('');

  private rafPending = false;

  protected onPointerMove(event: PointerEvent): void {
    if (this.rafPending) return;
    this.rafPending = true;
    const svgRect = this.svgEl().nativeElement.getBoundingClientRect();
    const x = event.clientX - svgRect.left - this.plotX();
    const y = event.clientY - svgRect.top - this.plotY();
    requestAnimationFrame(() => {
      this.rafPending = false;
      if (x < 0 || x > this.plotW() || y < 0 || y > this.plotH()) {
        this.activeArgPos.set(null);
        this.pointerY.set(null);
        return;
      }
      const args = untracked(this.sortedArgs);
      const target = untracked(this.argScale).fromPx(x);
      const position = nearestIndex(args, target);
      const changed = untracked(this.activeArgPos) !== position;
      this.activeArgPos.set(position === -1 ? null : position);
      this.pointerY.set(y);
      if (changed && position !== -1 && this.tooltip().enabled !== false) {
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
    () => {
      const position = this.activeArgPos();
      if (position === null) return [];
      const index = this.argIndex();
      const shared = this.tooltip().shared === true;
      const list: OgeChartPointEvent<T>[] = [];
      this.seriesList().forEach((series, seriesIndex) => {
        if (!this.isSeriesVisible(seriesIndex)) return;
        if (!shared && seriesIndex !== this.nearestSeriesIndex()) return;
        const pointIndex = index.pointIndexAt(position, seriesIndex);
        if (pointIndex === -1) return;
        const point = series.points[pointIndex];
        if (point.value === null && series.type !== 'candlestick') return;
        list.push({
          seriesIndex,
          seriesName: series.name,
          pointIndex,
          point,
          event: new MouseEvent('pointermove'),
        });
      });
      return list;
    },
  );

  /** Non-shared tooltips snap to the series whose value is nearest the cursor. */
  private readonly nearestSeriesIndex = computed(() => {
    const position = this.activeArgPos();
    const y = this.pointerY();
    if (position === null || y === null) return this.activeSeriesIndex();
    const index = this.argIndex();
    const scales = this.valueScales();
    let best = 0;
    let bestDist = Infinity;
    this.seriesList().forEach((series, seriesIndex) => {
      if (!this.isSeriesVisible(seriesIndex)) return;
      const pointIndex = index.pointIndexAt(position, seriesIndex);
      if (pointIndex === -1) return;
      const value = series.points[pointIndex].value;
      if (value === null) return;
      const scale = scales[series.input.axis ?? 0] ?? scales[0];
      const dist = Math.abs(scale.toPx(value) - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = seriesIndex;
      }
    });
    return best;
  });

  protected readonly crosshairPx = computed<{
    x: number;
    y: number | null;
  } | null>(() => {
    if (this.crosshair().enabled === false) return null;
    const position = this.activeArgPos();
    if (position === null) return null;
    const arg = this.sortedArgs()[position];
    if (arg === undefined) return null;
    return { x: this.argScale().toPx(arg), y: this.pointerY() };
  });
  protected readonly crosshairHorizontal = computed(
    () => this.crosshair().horizontal === true,
  );

  protected readonly tooltipVm = computed<{
    x: number;
    y: number;
    points: readonly OgeChartPointEvent<T>[];
    argumentText: string;
  } | null>(() => {
    if (this.tooltip().enabled === false) return null;
    if (this.zoomDrag() !== null || this.tooltipCancelled()) return null;
    const points = this.activePoints();
    const position = this.activeArgPos();
    if (points.length === 0 || position === null) return null;
    const arg = this.sortedArgs()[position];
    const x = this.plotX() + this.argScale().toPx(arg);
    const flip = x > this.plotX() + this.plotW() * 0.66;
    return {
      x: flip ? x - 12 : x + 12,
      y: this.plotY() + 8,
      points,
      argumentText: this.argTextOf(points[0].point),
    };
  });

  protected argTextOf(point: ChartPoint<T>): string {
    const kind = this.argKind();
    if (kind === 'time' && point.argNumeric !== null) {
      return new Intl.DateTimeFormat(this.effectiveLocale(), {
        dateStyle: 'medium',
      }).format(new Date(point.argNumeric));
    }
    return String(point.argument);
  }

  protected valueText(point: ChartPoint<T>): string {
    if (point.open !== null && point.close !== null) {
      const format = (value: number | null): string =>
        value === null ? '' : numberFormat(value, this.effectiveLocale());
      return `O ${format(point.open)} H ${format(point.high)} L ${format(point.low)} C ${format(point.close)}`;
    }
    if (point.value2 !== null && point.value !== null) {
      return `${numberFormat(point.value2, this.effectiveLocale())} – ${numberFormat(point.value, this.effectiveLocale())}`;
    }
    return point.value === null
      ? ''
      : numberFormat(point.value, this.effectiveLocale());
  }

  /* ---------------- zoom / pan ---------------- */

  protected readonly zoomDrag = signal<{ startPx: number; px: number } | null>(
    null,
  );
  protected readonly zoomSelection = computed(() => {
    const drag = this.zoomDrag();
    if (drag === null) return null;
    return {
      x: Math.min(drag.startPx, drag.px),
      w: Math.abs(drag.px - drag.startPx),
    };
  });

  protected onWheel(event: WheelEvent): void {
    const mode = this.zoomEnabled();
    if (mode !== 'wheel' && mode !== 'both') return;
    const svgRect = this.svgEl().nativeElement.getBoundingClientRect();
    const x = event.clientX - svgRect.left - this.plotX();
    if (x < 0 || x > this.plotW()) return;
    event.preventDefault();
    const focusFrac = x / this.plotW();
    const factor = event.deltaY < 0 ? 0.8 : 1.25;
    const next = zoomRangeAt(
      untracked(this.effectiveRange),
      focusFrac,
      factor,
      untracked(this.argBounds),
    );
    this.visualRange.set(next);
    this.announce(this.msg().announcements.zoomed, {});
  }

  protected onPlotPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const mode = this.zoomEnabled();
    const pan = this.panEnabled() && event.shiftKey;
    const dragZoom = (mode === 'drag' || mode === 'both') && !event.shiftKey;
    if (!pan && !dragZoom) return;
    const svgRect = this.svgEl().nativeElement.getBoundingClientRect();
    const startPx = event.clientX - svgRect.left - this.plotX();
    if (startPx < 0 || startPx > this.plotW()) return;
    const startRange = untracked(this.effectiveRange);
    beginChartGesture(event, {
      onMove: (deltaX) => {
        if (pan) {
          const frac = -deltaX / this.plotW();
          this.visualRange.set(
            panRange(startRange, frac, untracked(this.argBounds)),
          );
        } else {
          this.zoomDrag.set({ startPx, px: startPx + deltaX });
        }
      },
      onFinish: (commit, cancelled) => {
        const drag = untracked(this.zoomDrag);
        this.zoomDrag.set(null);
        if (pan || cancelled || !commit || drag === null) return;
        if (Math.abs(drag.px - drag.startPx) < 8) return;
        this.visualRange.set(
          rangeFromSelection(
            drag.startPx,
            drag.px,
            untracked(this.argScale),
            untracked(this.argBounds),
          ),
        );
        this.announce(this.msg().announcements.zoomed, {});
      },
    });
  }

  /* ---------------- selection / clicks ---------------- */

  protected isSelected(seriesIndex: number, pointIndex: number): boolean {
    return this.selectedPoints().some(
      (ref) => ref.seriesIndex === seriesIndex && ref.pointIndex === pointIndex,
    );
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
    const mode = this.selectionMode();
    if (mode === 'none') return;
    const current = untracked(this.selectedPoints);
    let refs: OgeChartPointRef[];
    if (mode === 'series') {
      const series = untracked(this.seriesList)[target.seriesIndex];
      const already =
        current.length > 0 && current[0].seriesIndex === target.seriesIndex;
      refs = already
        ? []
        : series.points.map((_, pointIndex) => ({
            seriesIndex: target.seriesIndex,
            pointIndex,
          }));
    } else {
      const exists = current.some(
        (ref) =>
          ref.seriesIndex === target.seriesIndex &&
          ref.pointIndex === target.pointIndex,
      );
      const multi = event.ctrlKey || event.metaKey;
      const single = {
        seriesIndex: target.seriesIndex,
        pointIndex: target.pointIndex,
      };
      refs = exists
        ? current.filter(
            (ref) =>
              !(
                ref.seriesIndex === target.seriesIndex &&
                ref.pointIndex === target.pointIndex
              ),
          )
        : multi
          ? [...current, single]
          : [single];
    }
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
    const args = this.sortedArgs();
    if (args.length === 0) return;
    const position = untracked(this.activeArgPos);
    const seriesCount = untracked(this.seriesList).length;
    const step = (delta: number): void => {
      event.preventDefault();
      const next = Math.max(
        0,
        Math.min(args.length - 1, (position ?? -delta) + delta),
      );
      this.activeArgPos.set(next);
      this.pointerY.set(null);
      this.announceActive();
    };
    switch (event.key) {
      case 'ArrowRight':
        step(1);
        return;
      case 'ArrowLeft':
        step(-1);
        return;
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        let next = untracked(this.activeSeriesIndex);
        for (let i = 0; i < seriesCount; i++) {
          next = (next + delta + seriesCount) % seriesCount;
          if (untracked(() => this.isSeriesVisible(next))) break;
        }
        this.activeSeriesIndex.set(next);
        this.announceActive();
        return;
      }
      case 'Home':
        event.preventDefault();
        this.activeArgPos.set(0);
        this.announceActive();
        return;
      case 'End':
        event.preventDefault();
        this.activeArgPos.set(args.length - 1);
        this.announceActive();
        return;
      case 'Enter':
      case ' ': {
        if (position === null) return;
        event.preventDefault();
        const index = untracked(this.argIndex);
        const seriesIndex = untracked(this.activeSeriesIndex);
        const series = untracked(this.seriesList)[seriesIndex];
        const pointIndex = index.pointIndexAt(position, seriesIndex);
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
      case 'Escape':
        if (untracked(this.visualRange) !== null) {
          event.preventDefault();
          this.resetZoom();
        }
        return;
      default:
        return;
    }
  }

  private announceActive(): void {
    const position = untracked(this.activeArgPos);
    if (position === null) return;
    const seriesIndex = untracked(this.activeSeriesIndex);
    const series = untracked(this.seriesList)[seriesIndex];
    if (series === undefined) return;
    const pointIndex = untracked(this.argIndex).pointIndexAt(
      position,
      seriesIndex,
    );
    const point = pointIndex === -1 ? null : series.points[pointIndex];
    this.announce(this.msg().announcements.point, {
      series: series.name,
      argument: point === null ? '' : this.argTextOf(point),
      value: point === null ? '' : this.valueText(point),
    });
  }

  /* ---------------- aria / sr table ---------------- */

  protected readonly rootAriaLabel = computed(() => {
    const template = this.msg().aria.chartLabel;
    return `${template
      .replace('{title}', this.title() || 'Data')
      .replace(
        '{count}',
        String(this.seriesList().length),
      )}. ${this.msg().aria.plotHint}`;
  });

  protected readonly srRows = computed(() => {
    const limit = this.config.a11yTableLimit ?? 50;
    const index = this.argIndex();
    const items = this.legendItems();
    return index.sortedArgs.slice(0, limit).map((arg, position) => {
      const cells = items.map((item) => {
        const pointIndex = index.pointIndexAt(position, item.seriesIndex);
        if (pointIndex === -1) return '';
        const point = this.seriesList()[item.seriesIndex].points[pointIndex];
        return this.valueText(point);
      });
      const first = items.find(
        (item) => index.pointIndexAt(position, item.seriesIndex) !== -1,
      );
      const argText =
        first === undefined
          ? String(arg)
          : this.argTextOf(
              this.seriesList()[first.seriesIndex].points[
                index.pointIndexAt(position, first.seriesIndex)
              ],
            );
      return { argText, cells };
    });
  });

  private announce(
    template: string,
    tokens: Readonly<Record<string, string>>,
  ): void {
    let text = template;
    for (const [token, value] of Object.entries(tokens)) {
      text = text.replace(`{${token}}`, value);
    }
    this.announcement.set(text);
  }

  /* ---------------- public methods ---------------- */

  zoomToRange(range: OgeChartRange): void {
    this.visualRange.set(clampRange(range, untracked(this.argBounds)));
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
    const rect = this.plotWrapEl().nativeElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.hostSize.set({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    }
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
    return {
      title: untracked(this.title),
      series: untracked(this.seriesList).map((series, seriesIndex) => ({
        name: series.name,
        type: series.type,
        color: this.colorOf(seriesIndex),
        visible: untracked(() => this.isSeriesVisible(seriesIndex)),
        points: series.points,
      })),
      argumentRange: untracked(this.effectiveRange),
      argumentKind: untracked(this.argKind),
    };
  }
}

/** Bottom edge of a ribbon: reversed point order, joined with L commands. */
function reversePathPoints(points: readonly PathPoint[]): string {
  const solid = points.filter(
    (point): point is { x: number; y: number } => point.y !== null,
  );
  return [...solid]
    .reverse()
    .map(
      (point) =>
        `L ${Math.round(point.x * 100) / 100} ${Math.round(point.y * 100) / 100}`,
    )
    .join(' ');
}
