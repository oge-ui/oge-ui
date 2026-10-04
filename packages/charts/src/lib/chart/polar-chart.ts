import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
  buildPolarData,
  buildPolarScene,
  cartesianAriaLabel,
  chartLabelTemplateBox,
  formatOgeChartMessage,
  isChartPointSelected,
  mergeOgeChartsMessages,
  nextPolarSelection,
  observeChartSize,
  polarKeyCommand,
  polarPointAnnouncement,
  polarPointIndex,
  polarSrRows,
  polarTooltip,
  printOgeChart,
  type OgeChartAxisOptions,
  type OgeChartPrintOptions,
  type OgeChartRenderLabel,
  type OgeChartLegendClickEvent,
  type OgeChartLegendOptions,
  type OgeChartPointEvent,
  type OgeChartPointRef,
  type OgeChartSeriesInput,
  type OgePolarSeriesVm,
} from '@oge-ui/charts-engine';
import { OGE_CHARTS_CONFIG, type OgeChartsMessages } from '../config';
import {
  OgeChartLabelTemplate,
  OgeChartLegendTemplate,
} from './chart-templates';

type PolarSeriesVm = OgePolarSeriesVm;

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
                        swatch: item.swatch,
                      },
                    }"
                  />
                } @else {
                  <span
                    class="oge-chart-legend-marker"
                    [style.background]="item.swatch"
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
          <!-- radial-bar tracks, grid rings + spokes + tick labels -->
          @for (track of tracks(); track $index) {
            <path class="oge-chart-radial-track" [attr.d]="track" />
          }
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
                [attr.fill]="sector.color ?? vm.color"
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
                [attr.r]="marker.r ?? 4"
                [attr.fill]="marker.color ?? vm.color"
                (mouseenter)="
                  hover.set({
                    seriesIndex: vm.seriesIndex,
                    pointIndex: marker.pointIndex,
                  })
                "
                (mouseleave)="hover.set(null)"
              />
            }
            @for (label of vm.labels; track $index) {
              @if (labelTemplate(); as tpl) {
                <foreignObject
                  class="oge-chart-label-fo"
                  [attr.x]="labelBox(label).x"
                  [attr.y]="labelBox(label).y"
                  [attr.width]="labelBox(label).w"
                  [attr.height]="labelBox(label).h"
                >
                  <ng-container
                    [ngTemplateOutlet]="tpl.templateRef"
                    [ngTemplateOutletContext]="{ $implicit: label }"
                  />
                </foreignObject>
              } @else {
                <text
                  class="oge-chart-point-label"
                  [class.oge-chart-point-label-inside]="label.inside"
                  [attr.x]="label.x"
                  [attr.y]="label.y"
                  [attr.text-anchor]="label.anchor"
                  [style.fill]="label.textColor ?? null"
                >
                  {{ label.text }}
                </text>
              }
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
  /** Supported polar types: `line`, `area`, `scatter`, `bar`, `radialBar`. */
  readonly series = input<readonly OgeChartSeriesInput<T>[]>([]);
  readonly commonSeries = input<Partial<OgeChartSeriesInput<T>>>({});
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
  protected readonly labelTemplate = contentChild(OgeChartLabelTemplate, {
    descendants: false,
  });
  private readonly plotWrapEl =
    viewChild.required<ElementRef<HTMLElement>>('plotWrap');
  private readonly svgEl =
    viewChild.required<ElementRef<SVGSVGElement>>('svgEl');

  protected readonly msg = computed<OgeChartsMessages>(() =>
    mergeOgeChartsMessages(this.config.messages, this.messages()),
  );
  protected readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale,
  );

  private readonly hostSize = signal({ width: 480, height: 360 });
  protected readonly width = computed(() => this.hostSize().width);
  protected readonly height = computed(() => this.hostSize().height);
  protected readonly hover = signal<{
    seriesIndex: number;
    pointIndex: number;
  } | null>(null);
  protected readonly announcement = signal('');
  protected readonly activeArg = signal<number | null>(null);
  protected readonly activeSeriesIndex = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const stop = observeChartSize(this.plotWrapEl().nativeElement, (size) =>
        this.hostSize.set(size),
      );
      destroyRef.onDestroy(stop);
    });
  }

  /* ---------------- the engine's view model (ADR 0003) ---------------- */

  private readonly data = computed(() =>
    buildPolarData<T>({
      dataSource: this.dataSource(),
      series: this.series(),
      commonSeries: this.commonSeries(),
      messages: this.msg(),
    }),
  );

  private readonly hiddenSeries = signal<ReadonlySet<number>>(new Set());

  private readonly scene = computed(() =>
    buildPolarScene<T>({
      data: this.data(),
      valueAxis: this.valueAxis(),
      spider: this.spider(),
      startAngle: this.startAngle(),
      palette: this.palette(),
      hiddenSeries: this.hiddenSeries(),
      width: this.width(),
      height: this.height(),
      locale: this.effectiveLocale(),
    }),
  );

  protected readonly cx = computed(() => this.scene().cx);
  protected readonly cy = computed(() => this.scene().cy);
  protected readonly categories = computed(() => this.data().categories);
  protected readonly rings = computed(() => this.scene().rings);
  protected readonly tracks = computed(() => this.scene().tracks);
  protected readonly spokes = computed(() => this.scene().spokes);
  protected readonly renderSeries = computed<readonly PolarSeriesVm[]>(
    () => this.scene().renderSeries,
  );

  /* ---------------- legend ---------------- */

  protected readonly legendVisible = computed(
    () => this.legend().visible !== false,
  );
  protected readonly legendPosition = computed(
    () => this.legend().position ?? 'bottom',
  );
  protected readonly legendItems = computed(() => this.scene().legendItems);

  protected onLegendClick(seriesIndex: number): void {
    const hidden = untracked(this.hiddenSeries);
    const willHide = !hidden.has(seriesIndex);
    const series = untracked(this.data).seriesList[seriesIndex];
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
    this.announcement.set(
      formatOgeChartMessage(
        willHide
          ? this.msg().announcements.seriesHidden
          : this.msg().announcements.seriesShown,
        { series: event.seriesName },
      ),
    );
  }

  /* ---------------- tooltip / selection / keyboard ---------------- */

  protected readonly tooltipVm = computed(() =>
    this.tooltipEnabled() ? polarTooltip(this.scene(), this.hover()) : null,
  );

  protected isSelected(seriesIndex: number, pointIndex: number): boolean {
    return isChartPointSelected(this.selectedPoints(), seriesIndex, pointIndex);
  }

  protected onPlotKeydown(event: KeyboardEvent): void {
    const scene = untracked(this.scene);
    const active = untracked(this.activeArg);
    const command = polarKeyCommand(event.key, {
      argCount: scene.data.categories.length,
      position: active,
      seriesIndex: untracked(this.activeSeriesIndex),
      seriesCount: scene.data.seriesList.length,
      isSeriesVisible: (index) => !scene.hiddenSeries.has(index),
    });
    if (command === null) return;
    event.preventDefault();
    switch (command.type) {
      case 'argument':
        this.activeArg.set(command.position);
        this.announceActive();
        return;
      case 'series':
        this.activeSeriesIndex.set(command.seriesIndex);
        this.announceActive();
        return;
      case 'activate': {
        if (active === null) return;
        const seriesIndex = untracked(this.activeSeriesIndex);
        const series = scene.data.seriesList[seriesIndex];
        const pointIndex = polarPointIndex(scene, seriesIndex, active);
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
          this.selectedPoints.set(
            nextPolarSelection(
              untracked(this.selectedPoints),
              seriesIndex,
              pointIndex,
            ),
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
    this.announcement.set(
      polarPointAnnouncement(
        untracked(this.scene),
        this.msg(),
        active,
        untracked(this.activeSeriesIndex),
      ),
    );
  }

  protected readonly srRows = computed(() =>
    polarSrRows(this.scene(), this.config.a11yTableLimit ?? 50),
  );

  protected readonly rootAriaLabel = computed(() =>
    cartesianAriaLabel(this.msg(), this.title(), this.data().seriesList.length),
  );

  focus(): void {
    this.plotWrapEl().nativeElement.focus();
  }

  /** The live SVG root — the exporters rasterize/serialize it. */
  getSvgElement(): SVGSVGElement {
    return this.svgEl().nativeElement;
  }

  /** Opens the browser's print dialog for the chart alone. */
  print(options: OgeChartPrintOptions = {}): Promise<void> {
    return printOgeChart(this, { title: untracked(this.title), ...options });
  }

  protected labelBox(label: OgeChartRenderLabel): {
    x: number;
    y: number;
    w: number;
    h: number;
  } {
    return chartLabelTemplateBox(label);
  }
}
