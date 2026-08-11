import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  contentChild,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  angleForIndex,
  polarToCartesian,
  radarGridPath,
  radarLoopPath,
  type PolarXY,
} from '../engine/polar-layout';
import { sliceArcPath } from '../engine/pie-layout';
import { niceTicks } from '../engine/scale';
import {
  buildSeries,
  collectCategories,
  type ChartSeriesInput,
} from '../engine/series-model';
import { numberFormat } from '../engine/tick-format';
import { OGE_CHARTS_CONFIG, type OgeChartsMessages } from '../config';
import { OGE_CHART_PALETTE } from './chart';
import { OgeChartLegendTemplate } from './chart-templates';
import type {
  OgeChartAxisOptions,
  OgeChartLegendClickEvent,
  OgeChartLegendOptions,
  OgeChartPointEvent,
  OgeChartPointRef,
} from '../charts-types';

interface PolarMarkerVm {
  readonly x: number;
  readonly y: number;
  readonly seriesIndex: number;
  readonly pointIndex: number;
}

interface PolarSeriesVm {
  readonly seriesIndex: number;
  readonly name: string;
  readonly color: string;
  readonly linePathD: string | null;
  readonly areaPathD: string | null;
  readonly sectors: readonly {
    readonly path: string;
    readonly pointIndex: number;
  }[];
  readonly markers: readonly PolarMarkerVm[];
  readonly strokeWidth: number;
  readonly opacity: number;
}

/**
 * `<oge-polar-chart>` — radar/polar charts on the shared kernel:
 * `line`/`area` radar loops, `scatter` markers and `bar` sectors around a
 * category circle, with circular or spider grids, interactive legend,
 * tooltip, selection and keyboard point inspection. Commercial.
 */
@Component({
  selector: 'oge-polar-chart',
  imports: [NgTemplateOutlet],
  styleUrl: './chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-chart oge-polar-chart' },
  template: `
    @if (title()) {
      <div class="oge-chart-title">{{ title() }}</div>
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
                (click)="onLegendClick(item.seriesIndex)"
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
        (pointerleave)="hover.set(null)"
      >
        <svg
          #svgEl
          class="oge-chart-svg"
          role="img"
          [attr.aria-label]="rootAriaLabel()"
          [attr.width]="width()"
          [attr.height]="height()"
          [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
        >
          <!-- grid rings + spokes + tick labels -->
          @for (ring of rings(); track ring.radius) {
            <path class="oge-chart-grid" [attr.d]="ring.path" fill="none" />
          }
          @for (spoke of spokes(); track spoke.index) {
            <line
              class="oge-chart-grid"
              [attr.x1]="cx()"
              [attr.y1]="cy()"
              [attr.x2]="spoke.x"
              [attr.y2]="spoke.y"
            />
            <text
              class="oge-chart-axis-label"
              [attr.x]="spoke.labelX"
              [attr.y]="spoke.labelY"
              [attr.text-anchor]="spoke.anchor"
            >
              {{ spoke.label }}
            </text>
          }
          @for (ring of rings(); track ring.radius) {
            <text
              class="oge-chart-axis-label"
              [attr.x]="cx() + 4"
              [attr.y]="cy() - ring.radius - 3"
            >
              {{ ring.label }}
            </text>
          }
          <!-- series -->
          @for (vm of renderSeries(); track vm.seriesIndex) {
            @if (vm.areaPathD !== null) {
              <path
                class="oge-chart-area"
                [attr.d]="vm.areaPathD"
                [attr.fill]="vm.color"
                [attr.opacity]="vm.opacity * 0.3"
              />
            }
            @if (vm.linePathD !== null) {
              <path
                class="oge-chart-line"
                [attr.d]="vm.linePathD"
                [attr.stroke]="vm.color"
                [attr.stroke-width]="vm.strokeWidth"
                [attr.opacity]="vm.opacity"
                fill="none"
              />
            }
            @for (sector of vm.sectors; track sector.pointIndex) {
              <path
                class="oge-chart-bar"
                [class.oge-chart-point-selected]="
                  isSelected(vm.seriesIndex, sector.pointIndex)
                "
                [attr.d]="sector.path"
                [attr.fill]="vm.color"
                [attr.opacity]="vm.opacity * 0.85"
                (mouseenter)="
                  hover.set({
                    seriesIndex: vm.seriesIndex,
                    pointIndex: sector.pointIndex,
                  })
                "
                (mouseleave)="hover.set(null)"
              />
            }
            @for (marker of vm.markers; track marker.pointIndex) {
              <circle
                class="oge-chart-marker"
                [class.oge-chart-point-selected]="
                  isSelected(vm.seriesIndex, marker.pointIndex)
                "
                [attr.cx]="marker.x"
                [attr.cy]="marker.y"
                r="4"
                [attr.fill]="vm.color"
                (mouseenter)="
                  hover.set({
                    seriesIndex: vm.seriesIndex,
                    pointIndex: marker.pointIndex,
                  })
                "
                (mouseleave)="hover.set(null)"
              />
            }
          }
          @if (legendItems().length === 0 || categories().length === 0) {
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
        @if (tooltipVm(); as tip) {
          <div
            class="oge-chart-tooltip"
            [style.left.px]="tip.x"
            [style.top.px]="tip.y"
            aria-hidden="true"
          >
            <span class="oge-chart-tooltip-arg">{{ tip.argument }}</span>
            <span class="oge-chart-tooltip-row">
              <span
                class="oge-chart-legend-marker"
                [style.background-color]="tip.color"
              ></span>
              {{ tip.seriesName }}: {{ tip.valueText }}
            </span>
          </div>
        }
      </div>
    </div>
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
export class OgePolarChart<T extends object = Record<string, unknown>> {
  private readonly config = inject(OGE_CHARTS_CONFIG);

  readonly dataSource = input<readonly T[]>([]);
  /** Supported polar types: `line`, `area`, `scatter`, `bar`. */
  readonly series = input<readonly ChartSeriesInput<T>[]>([]);
  readonly commonSeries = input<Partial<ChartSeriesInput<T>>>({});
  /** `min`/`max`/`labelFormat` of the radial value axis. */
  readonly valueAxis = input<OgeChartAxisOptions>({});
  /** Straight-segment (polygon) grid instead of circles. */
  readonly spider = input(false);
  /** Radians; 0 = 12 o'clock, clockwise. */
  readonly startAngle = input(0);
  readonly legend = input<OgeChartLegendOptions>({});
  readonly tooltipEnabled = input(true);
  readonly selectionMode = input<'point' | 'none'>('none');
  readonly palette = input<readonly string[] | undefined>(undefined);
  readonly title = input('');
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input<Partial<OgeChartsMessages>>({});
  readonly selectedPoints = model<readonly OgeChartPointRef[]>([]);

  readonly pointClick = output<OgeChartPointEvent<T>>();
  readonly legendClick = output<OgeChartLegendClickEvent>();

  protected readonly legendTemplate = contentChild(OgeChartLegendTemplate, {
    descendants: false,
  });
  private readonly plotWrapEl =
    viewChild.required<ElementRef<HTMLElement>>('plotWrap');
  private readonly svgEl =
    viewChild.required<ElementRef<SVGSVGElement>>('svgEl');

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

  private readonly hostSize = signal({ width: 480, height: 360 });
  protected readonly width = computed(() => this.hostSize().width);
  protected readonly height = computed(() => this.hostSize().height);
  protected readonly cx = computed(() => this.width() / 2);
  protected readonly cy = computed(() => this.height() / 2);
  protected readonly radius = computed(() =>
    Math.max(30, Math.min(this.width(), this.height()) / 2 - 42),
  );
  protected readonly hover = signal<{
    seriesIndex: number;
    pointIndex: number;
  } | null>(null);
  protected readonly announcement = signal('');
  protected readonly activeArg = signal<number | null>(null);
  protected readonly activeSeriesIndex = signal(0);

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
  }

  private readonly mergedSeriesInputs = computed<
    readonly ChartSeriesInput<T>[]
  >(() => {
    const common = this.commonSeries();
    return this.series().map(
      (entry) => ({ ...common, ...entry }) as ChartSeriesInput<T>,
    );
  });

  protected readonly categories = computed<readonly unknown[]>(() =>
    collectCategories(this.dataSource(), this.mergedSeriesInputs()),
  );
  private readonly categoryIndex = computed<ReadonlyMap<unknown, number>>(
    () =>
      new Map(this.categories().map((category, index) => [category, index])),
  );

  protected readonly seriesList = computed(() => {
    const categoryIndex = this.categoryIndex();
    const data = this.dataSource();
    return this.mergedSeriesInputs().map((input, index) =>
      buildSeries(data, input, index, 'category', categoryIndex),
    );
  });

  private readonly hiddenSeries = signal<ReadonlySet<number>>(new Set());

  protected readonly valueMax = computed(() => {
    const override = this.valueAxis().max;
    if (typeof override === 'number') return override;
    let max = 0;
    this.seriesList().forEach((series, index) => {
      if (this.hiddenSeries().has(index)) return;
      for (const point of series.points) {
        if (point.value !== null && point.value > max) max = point.value;
      }
    });
    return max > 0 ? max : 1;
  });

  protected readonly ticks = computed(() =>
    niceTicks(0, this.valueMax(), 4).filter((tick) => tick > 0),
  );

  private radiusOf(value: number): number {
    return (value / this.valueMax()) * this.radius();
  }

  protected readonly rings = computed(() => {
    const format = this.valueAxis().labelFormat;
    return this.ticks().map((tick) => ({
      radius: this.radiusOf(tick),
      path: radarGridPath(
        this.cx(),
        this.cy(),
        this.radiusOf(tick),
        this.categories().length,
        this.spider(),
        this.startAngle(),
      ),
      label:
        format !== undefined
          ? format(tick)
          : numberFormat(tick, this.effectiveLocale()),
    }));
  });

  protected readonly spokes = computed(() => {
    const count = this.categories().length;
    return this.categories().map((category, index) => {
      const angle = angleForIndex(index, count, this.startAngle());
      const edge = polarToCartesian(this.cx(), this.cy(), this.radius(), angle);
      const label = polarToCartesian(
        this.cx(),
        this.cy(),
        this.radius() + 14,
        angle,
      );
      const sin = Math.sin(angle);
      return {
        index,
        x: edge.x,
        y: edge.y,
        labelX: label.x,
        labelY: label.y + 4,
        anchor:
          Math.abs(sin) < 0.3
            ? ('middle' as const)
            : sin > 0
              ? ('start' as const)
              : ('end' as const),
        label: String(category),
      };
    });
  });

  protected colorOf(seriesIndex: number): string {
    const palette = this.palette() ?? OGE_CHART_PALETTE;
    return (
      this.seriesList()[seriesIndex]?.input.color ??
      palette[seriesIndex % palette.length]
    );
  }

  protected readonly renderSeries = computed<readonly PolarSeriesVm[]>(() => {
    const count = this.categories().length;
    const result: PolarSeriesVm[] = [];
    this.seriesList().forEach((series, seriesIndex) => {
      if (this.hiddenSeries().has(seriesIndex)) return;
      const color = this.colorOf(seriesIndex);
      const type = series.type;
      const points: (PolarXY | null)[] = series.points.map((point) => {
        if (point.argNumeric === null || point.value === null) return null;
        return polarToCartesian(
          this.cx(),
          this.cy(),
          this.radiusOf(Math.max(0, point.value)),
          angleForIndex(point.argNumeric, count, this.startAngle()),
        );
      });
      const markers: PolarMarkerVm[] = [];
      points.forEach((point, pointIndex) => {
        if (point !== null) {
          markers.push({ x: point.x, y: point.y, seriesIndex, pointIndex });
        }
      });
      const sectors: { path: string; pointIndex: number }[] = [];
      if (type === 'bar') {
        const half = Math.PI / Math.max(3, count) / 1.6;
        series.points.forEach((point, pointIndex) => {
          if (point.argNumeric === null || point.value === null) return;
          const angle = angleForIndex(
            point.argNumeric,
            count,
            this.startAngle(),
          );
          sectors.push({
            path: sliceArcPath(
              this.cx(),
              this.cy(),
              this.radiusOf(Math.max(0, point.value)),
              0,
              angle - half,
              angle + half,
            ),
            pointIndex,
          });
        });
      }
      const loop = type === 'line' || type === 'area';
      result.push({
        seriesIndex,
        name: series.name,
        color,
        linePathD: loop ? radarLoopPath(points, true) || null : null,
        areaPathD:
          type === 'area' ? `${radarLoopPath(points, true)}` || null : null,
        sectors,
        markers: type === 'bar' ? [] : markers,
        strokeWidth: series.input.width ?? 2,
        opacity: series.input.opacity ?? 1,
      });
    });
    return result;
  });

  /* ---------------- legend ---------------- */

  protected readonly legendVisible = computed(
    () => this.legend().visible !== false,
  );
  protected readonly legendPosition = computed(
    () => this.legend().position ?? 'bottom',
  );
  protected readonly legendItems = computed(() =>
    this.seriesList()
      .map((series, seriesIndex) => ({
        seriesIndex,
        name: series.name,
        color: this.colorOf(seriesIndex),
        hidden: this.hiddenSeries().has(seriesIndex),
        inLegend: series.input.showInLegend !== false,
      }))
      .filter((item) => item.inLegend),
  );

  protected onLegendClick(seriesIndex: number): void {
    const hidden = untracked(this.hiddenSeries);
    const willHide = !hidden.has(seriesIndex);
    const series = untracked(this.seriesList)[seriesIndex];
    const event: OgeChartLegendClickEvent = {
      seriesIndex,
      seriesName: series?.name ?? '',
      willHide,
      cancel: false,
    };
    this.legendClick.emit(event);
    if (event.cancel) return;
    const next = new Set(hidden);
    if (willHide) next.add(seriesIndex);
    else next.delete(seriesIndex);
    this.hiddenSeries.set(next);
    this.announce(
      willHide
        ? this.msg().announcements.seriesHidden
        : this.msg().announcements.seriesShown,
      { series: event.seriesName },
    );
  }

  /* ---------------- tooltip / selection / keyboard ---------------- */

  protected readonly tooltipVm = computed(() => {
    if (!this.tooltipEnabled()) return null;
    const hover = this.hover();
    if (hover === null) return null;
    const series = this.seriesList()[hover.seriesIndex];
    const point = series?.points[hover.pointIndex];
    if (point === undefined || point.value === null) return null;
    const position = polarToCartesian(
      this.cx(),
      this.cy(),
      this.radiusOf(point.value),
      angleForIndex(
        point.argNumeric ?? 0,
        this.categories().length,
        this.startAngle(),
      ),
    );
    return {
      x: position.x + 12,
      y: position.y - 8,
      argument: String(point.argument),
      seriesName: series.name,
      color: this.colorOf(hover.seriesIndex),
      valueText: numberFormat(point.value, this.effectiveLocale()),
    };
  });

  protected isSelected(seriesIndex: number, pointIndex: number): boolean {
    return this.selectedPoints().some(
      (ref) => ref.seriesIndex === seriesIndex && ref.pointIndex === pointIndex,
    );
  }

  protected onPlotKeydown(event: KeyboardEvent): void {
    const count = this.categories().length;
    if (count === 0) return;
    const seriesCount = untracked(this.seriesList).length;
    const active = untracked(this.activeArg);
    const step = (delta: number): void => {
      event.preventDefault();
      const next = ((active ?? -delta) + delta + count) % count;
      this.activeArg.set(next);
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
          if (!untracked(this.hiddenSeries).has(next)) break;
        }
        this.activeSeriesIndex.set(next);
        this.announceActive();
        return;
      }
      case 'Enter':
      case ' ': {
        if (active === null) return;
        event.preventDefault();
        const seriesIndex = untracked(this.activeSeriesIndex);
        const series = untracked(this.seriesList)[seriesIndex];
        const pointIndex = series?.points.findIndex(
          (point) => point.argNumeric === active,
        );
        if (series === undefined || pointIndex === -1) return;
        const payload: OgeChartPointEvent<T> = {
          seriesIndex,
          seriesName: series.name,
          pointIndex,
          point: series.points[pointIndex],
          event,
        };
        this.pointClick.emit(payload);
        if (this.selectionMode() === 'point') {
          const current = untracked(this.selectedPoints);
          const exists = current.some(
            (ref) =>
              ref.seriesIndex === seriesIndex && ref.pointIndex === pointIndex,
          );
          this.selectedPoints.set(
            exists
              ? current.filter(
                  (ref) =>
                    !(
                      ref.seriesIndex === seriesIndex &&
                      ref.pointIndex === pointIndex
                    ),
                )
              : [{ seriesIndex, pointIndex }],
          );
        }
        return;
      }
      default:
        return;
    }
  }

  private announceActive(): void {
    const active = untracked(this.activeArg);
    if (active === null) return;
    const seriesIndex = untracked(this.activeSeriesIndex);
    const series = untracked(this.seriesList)[seriesIndex];
    const point = series?.points.find((entry) => entry.argNumeric === active);
    this.announce(this.msg().announcements.point, {
      series: series?.name ?? '',
      argument: String(this.categories()[active] ?? ''),
      value:
        point?.value == null
          ? ''
          : numberFormat(point.value, this.effectiveLocale()),
    });
  }

  protected readonly srRows = computed(() => {
    const limit = this.config.a11yTableLimit ?? 50;
    return this.categories()
      .slice(0, limit)
      .map((category, argPosition) => ({
        argText: String(category),
        cells: this.legendItems().map((item) => {
          const point = this.seriesList()[item.seriesIndex].points.find(
            (entry) => entry.argNumeric === argPosition,
          );
          return point?.value == null
            ? ''
            : numberFormat(point.value, this.effectiveLocale());
        }),
      }));
  });

  protected readonly rootAriaLabel = computed(() => {
    return `${this.msg()
      .aria.chartLabel.replace('{title}', this.title() || 'Data')
      .replace(
        '{count}',
        String(this.seriesList().length),
      )}. ${this.msg().aria.plotHint}`;
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

  focus(): void {
    this.plotWrapEl().nativeElement.focus();
  }

  /** The live SVG root — the exporters rasterize/serialize it. */
  getSvgElement(): SVGSVGElement {
    return this.svgEl().nativeElement;
  }
}
