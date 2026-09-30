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
  mergeOgeChartsMessages,
  observeChartSize,
  pieAriaLabel,
  pieLabelText,
  pieSelectedAnnouncement,
  pieTooltip,
  pieValueText,
  togglePieSlice,
  type OgeChartLegendClickEvent,
  type OgeChartLegendOptions,
  type OgeChartPieSliceEvent,
  type OgeChartSmallValuesGrouping,
  type OgePieSliceVm,
} from '@oge-ui/charts-engine';
import { OGE_CHARTS_CONFIG, type OgeChartsMessages } from '../config';
import {
  OgeChartLegendTemplate,
  OgeChartTooltipTemplate,
} from './chart-templates';

// The slice payload type lives in the engine (ADR 0003); re-exported so
// `@oge-ui/charts` keeps its public API.
export type { OgeChartPieSliceEvent };

type SliceVm<T> = OgePieSliceVm<T>;

/**
 * `<oge-pie-chart>` — pie/doughnut on the shared kernel: slice geometry,
 * outside labels with connectors, small-value grouping, interactive
 * legend, hover tooltip, selection with slice explode. Commercial.
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
      @if (legendVisible() && slices().length > 0) {
        <ul class="oge-chart-legend" [attr.aria-label]="msg().aria.legendLabel">
          @for (vm of slices(); track vm.slice.index) {
            <li>
              <button
                type="button"
                class="oge-chart-legend-btn"
                [attr.aria-pressed]="isSelected(vm.slice.index)"
                (click)="toggleSelection(vm.slice.index)"
              >
                @if (legendTemplate(); as tpl) {
                  <ng-container
                    [ngTemplateOutlet]="tpl.templateRef"
                    [ngTemplateOutletContext]="{
                      $implicit: {
                        name: vm.label,
                        color: vm.color,
                        hidden: false,
                      },
                    }"
                  />
                } @else {
                  <span
                    class="oge-chart-legend-marker"
                    [style.background-color]="vm.color"
                  ></span>
                  <span class="oge-chart-legend-text">{{ vm.label }}</span>
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
          @for (vm of slices(); track vm.slice.index) {
            <path
              class="oge-chart-pie-slice"
              [class.oge-chart-point-selected]="isSelected(vm.slice.index)"
              [attr.d]="isSelected(vm.slice.index) ? vm.explodedPath : vm.path"
              [attr.fill]="vm.color"
              (click)="onSliceClick(vm, $event)"
              (mouseenter)="hoverIndex.set(vm.slice.index)"
              (mouseleave)="hoverIndex.set(null)"
            />
          }
          @if (showLabels()) {
            @for (label of labels(); track label.sliceIndex) {
              <polyline
                class="oge-chart-pie-connector"
                [attr.points]="
                  label.arcX +
                  ',' +
                  label.arcY +
                  ' ' +
                  label.labelX +
                  ',' +
                  label.labelY
                "
              />
              <text
                class="oge-chart-axis-label"
                [attr.x]="label.labelX + (label.side === 'end' ? 4 : -4)"
                [attr.y]="label.labelY + 4"
                [attr.text-anchor]="label.side === 'end' ? 'start' : 'end'"
              >
                {{ labelTextOf(label.sliceIndex) }}
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
      <tbody>
        @for (vm of slices(); track vm.slice.index) {
          <tr>
            <th scope="row">{{ vm.label }}</th>
            <td>{{ valueTextOf(vm) }}</td>
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
  protected readonly hoverIndex = signal<number | null>(null);
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

  /** The engine's view model (ADR 0003): slices, labels, geometry. */
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
      palette: this.palette(),
      width: this.width(),
      height: this.height(),
    }),
  );

  protected readonly slices = computed<readonly SliceVm<T>[]>(
    () => this.scene().slices,
  );
  protected readonly labels = computed(() => this.scene().labels);

  protected labelTextOf(sliceIndex: number): string {
    return pieLabelText(this.scene(), sliceIndex);
  }

  protected valueTextOf(vm: SliceVm<T>): string {
    return pieValueText(vm, this.effectiveLocale());
  }

  protected readonly tooltipVm = computed(() =>
    this.tooltipEnabled()
      ? pieTooltip(this.scene(), this.hoverIndex(), this.effectiveLocale())
      : null,
  );

  protected isSelected(index: number): boolean {
    return this.selectedSlices().includes(index);
  }

  protected toggleSelection(index: number): void {
    const vm = untracked(this.slices).find(
      (entry) => entry.slice.index === index,
    );
    const event: OgeChartLegendClickEvent = {
      seriesIndex: index,
      seriesName: vm?.label ?? '',
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

  protected readonly rootAriaLabel = computed(() =>
    pieAriaLabel(this.msg(), this.title(), this.slices().length),
  );
}
