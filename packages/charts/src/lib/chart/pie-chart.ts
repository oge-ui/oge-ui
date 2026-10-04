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
  buildPieScene,
  chartLabelTemplateBox,
  mergeOgeChartsMessages,
  observeChartSize,
  pieAriaLabel,
  pieSelectedAnnouncement,
  pieSrTable,
  pieTooltip,
  printOgeChart,
  togglePieSlice,
  type OgeChartLabelOptions,
  type OgeChartLegendClickEvent,
  type OgeChartLegendOptions,
  type OgeChartPieSliceEvent,
  type OgeChartPointCustomizer,
  type OgeChartPrintOptions,
  type OgeChartRenderLabel,
  type OgeChartSmallValuesGrouping,
  type OgePieSeriesInput,
  type OgePieSliceVm,
} from '@oge-ui/charts-engine';
import { OGE_CHARTS_CONFIG, type OgeChartsMessages } from '../config';
import {
  OgeChartLabelTemplate,
  OgeChartLegendTemplate,
  OgeChartTooltipTemplate,
} from './chart-templates';

// The slice payload type lives in the engine (ADR 0003); re-exported so
// `@oge-ui/charts` keeps its public API.
export type { OgeChartPieSliceEvent };

type SliceVm<T> = OgePieSliceVm<T>;

/**
 * `<oge-pie-chart>` — pie/doughnut on the shared kernel: slice geometry,
 * nested doughnut rings, data labels (outside with connectors or inside the
 * ring), per-slice colours, small-value grouping, interactive legend, hover
 * tooltip, selection with slice explode. Commercial.
 */
@Component({
  selector: 'oge-pie-chart',
  imports: [NgTemplateOutlet],
  styleUrl: './chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-chart oge-pie-chart' },
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
          @for (item of legendItems(); track item.index) {
            <li>
              <button
                type="button"
                class="oge-chart-legend-btn"
                [attr.aria-pressed]="isSelected(item.index)"
                (click)="toggleSelection(item.index)"
              >
                @if (legendTemplate(); as tpl) {
                  <ng-container
                    [ngTemplateOutlet]="tpl.templateRef"
                    [ngTemplateOutletContext]="{
                      $implicit: {
                        name: item.name,
                        color: item.color,
                        hidden: false,
                        swatch: item.color,
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
      <div #plotWrap class="oge-chart-plot-wrap">
        <svg
          #svgEl
          class="oge-chart-svg"
          role="img"
          [attr.aria-label]="rootAriaLabel()"
          [attr.width]="width()"
          [attr.height]="height()"
          [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
        >
          @for (vm of slices(); track vm.key) {
            <path
              class="oge-chart-pie-slice"
              [class.oge-chart-point-selected]="isSelected(vm.slice.index)"
              [attr.d]="isSelected(vm.slice.index) ? vm.explodedPath : vm.path"
              [attr.fill]="vm.color"
              (click)="onSliceClick(vm, $event)"
              (mouseenter)="hoverKey.set(vm.key)"
              (mouseleave)="hoverKey.set(null)"
            />
          }
          @for (label of labelVms(); track label.key) {
            @if (label.connector !== null) {
              <polyline
                class="oge-chart-pie-connector"
                [attr.points]="label.connector"
              />
            }
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
                class="oge-chart-axis-label oge-chart-pie-label"
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
          @if (slices().length === 0) {
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
            <span class="oge-chart-tooltip-arg">{{ tip.label }}</span>
            <span class="oge-chart-tooltip-row">{{ tip.valueText }}</span>
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
      @if (srTable().headers; as headers) {
        <thead>
          <tr>
            <th scope="col">{{ msg().aria.argumentHeader }}</th>
            @for (header of headers; track $index) {
              <th scope="col">{{ header }}</th>
            }
          </tr>
        </thead>
      }
      <tbody>
        @for (row of srTable().rows; track $index) {
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
export class OgePieChart<T extends object = Record<string, unknown>> {
  private readonly config = inject(OGE_CHARTS_CONFIG);

  readonly dataSource = input<readonly T[]>([]);
  readonly argumentField = input<string | ((item: T) => unknown)>('argument');
  readonly valueField = input<string | ((item: T) => unknown)>('value');
  readonly type = input<'pie' | 'doughnut'>('pie');
  /** Doughnut hole as a fraction of the outer radius. */
  readonly innerRadius = input(0.5);
  /** Radians; 0 = 12 o'clock, clockwise. */
  readonly startAngle = input(0);
  readonly smallValuesGrouping = input<OgeChartSmallValuesGrouping | null>(
    null,
  );
  readonly othersLabel = input('Others');
  readonly showLabels = input(true);
  /** Data labels: position, format, zero handling, connectors, overlap. */
  readonly label = input<OgeChartLabelOptions<T> | undefined>(undefined);
  /** Per-slice colour read from the data. */
  readonly colorField = input<string | ((item: T) => unknown) | undefined>(
    undefined,
  );
  /** Per-slice colour / label overrides (wins over `colorField`). */
  readonly customizePoint = input<OgeChartPointCustomizer<T> | undefined>(
    undefined,
  );
  /**
   * Nested doughnut: one ring per entry (inner → outer); unset fields fall
   * back to this chart's own inputs.
   */
  readonly series = input<readonly OgePieSeriesInput<T>[]>([]);
  readonly legend = input<OgeChartLegendOptions>({});
  readonly tooltipEnabled = input(true);
  readonly palette = input<readonly string[] | undefined>(undefined);
  readonly title = input('');
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input<Partial<OgeChartsMessages>>({});
  readonly selectedSlices = model<readonly number[]>([]);

  readonly sliceClick = output<OgeChartPieSliceEvent<T>>();
  readonly legendClick = output<OgeChartLegendClickEvent>();

  protected readonly legendTemplate = contentChild(OgeChartLegendTemplate, {
    descendants: false,
  });
  protected readonly tooltipTemplate = contentChild(OgeChartTooltipTemplate, {
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

  private readonly hostSize = signal({ width: 400, height: 300 });
  protected readonly width = computed(() => this.hostSize().width);
  protected readonly height = computed(() => this.hostSize().height);
  /** The hovered slice's `key` (ring-aware). */
  protected readonly hoverKey = signal<string | null>(null);
  protected readonly announcement = signal('');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const stop = observeChartSize(this.plotWrapEl().nativeElement, (size) =>
        this.hostSize.set(size),
      );
      destroyRef.onDestroy(stop);
    });
  }

  protected readonly legendVisible = computed(
    () => this.legend().visible !== false,
  );
  protected readonly legendPosition = computed(
    () => this.legend().position ?? 'bottom',
  );

  /** The engine's view model (ADR 0003): slices, rings, labels, geometry. */
  private readonly scene = computed(() =>
    buildPieScene<T>({
      dataSource: this.dataSource(),
      argumentField: this.argumentField(),
      valueField: this.valueField(),
      type: this.type(),
      innerRadius: this.innerRadius(),
      startAngle: this.startAngle(),
      smallValuesGrouping: this.smallValuesGrouping(),
      othersLabel: this.othersLabel(),
      showLabels: this.showLabels(),
      label: this.label(),
      colorField: this.colorField(),
      customizePoint: this.customizePoint(),
      series: this.series(),
      palette: this.palette(),
      width: this.width(),
      height: this.height(),
      locale: this.effectiveLocale(),
    }),
  );

  protected readonly slices = computed<readonly SliceVm<T>[]>(
    () => this.scene().slices,
  );
  protected readonly labelVms = computed(() => this.scene().labelVms);
  protected readonly legendItems = computed(() => this.scene().legendItems);
  protected readonly srTable = computed(() =>
    pieSrTable(this.scene(), this.effectiveLocale()),
  );

  protected labelBox(label: OgeChartRenderLabel): {
    x: number;
    y: number;
    w: number;
    h: number;
  } {
    return chartLabelTemplateBox(label);
  }

  protected readonly tooltipVm = computed(() =>
    this.tooltipEnabled()
      ? pieTooltip(this.scene(), this.hoverKey(), this.effectiveLocale())
      : null,
  );

  protected isSelected(index: number): boolean {
    return this.selectedSlices().includes(index);
  }

  protected toggleSelection(index: number): void {
    const item = untracked(this.legendItems).find(
      (entry) => entry.index === index,
    );
    const event: OgeChartLegendClickEvent = {
      seriesIndex: index,
      seriesName: item?.name ?? '',
      willHide: false,
      cancel: false,
    };
    this.legendClick.emit(event);
    if (event.cancel) return;
    this.selectedSlices.set(
      togglePieSlice(untracked(this.selectedSlices), index),
    );
  }

  protected onSliceClick(vm: SliceVm<T>, event: MouseEvent): void {
    void event;
    this.sliceClick.emit(vm.payload);
    this.selectedSlices.set(
      togglePieSlice(untracked(this.selectedSlices), vm.slice.index),
    );
    this.announcement.set(
      pieSelectedAnnouncement(this.msg(), vm, this.effectiveLocale()),
    );
  }

  /** The live SVG root — the exporters rasterize/serialize it. */
  getSvgElement(): SVGSVGElement {
    return this.svgEl().nativeElement;
  }

  /** Opens the browser's print dialog for the chart alone. */
  print(options: OgeChartPrintOptions = {}): Promise<void> {
    return printOgeChart(this, { title: untracked(this.title), ...options });
  }

  protected readonly rootAriaLabel = computed(() =>
    pieAriaLabel(this.msg(), this.title(), this.slices().length),
  );
}
