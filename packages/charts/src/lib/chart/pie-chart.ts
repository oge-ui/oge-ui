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
import { createFieldAccessor } from '@oge-ui/core';
import {
  buildPieSlices,
  groupSmallValues,
  layoutPieLabels,
  type PieSlice,
} from '../engine/pie-layout';
import { sliceArcPath } from '../engine/pie-layout';
import { numberFormat } from '../engine/tick-format';
import { OGE_CHARTS_CONFIG, type OgeChartsMessages } from '../config';
import { OGE_CHART_PALETTE } from './chart';
import {
  OgeChartLegendTemplate,
  OgeChartTooltipTemplate,
} from './chart-templates';
import type {
  OgeChartLegendClickEvent,
  OgeChartLegendOptions,
  OgeChartSmallValuesGrouping,
} from '../charts-types';

/** A rendered slice — the payload of pie events and tooltips. */
export interface OgeChartPieSliceEvent<T = unknown> {
  readonly index: number;
  readonly argument: unknown;
  readonly value: number;
  readonly fraction: number;
  /** Merged sources for the synthetic "others" slice. */
  readonly sources: readonly T[];
  readonly grouped: boolean;
}

interface SliceVm<T> {
  readonly slice: PieSlice;
  readonly payload: OgeChartPieSliceEvent<T>;
  readonly path: string;
  readonly explodedPath: string;
  readonly color: string;
  readonly label: string;
}

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

  private readonly hostSize = signal({ width: 400, height: 300 });
  protected readonly width = computed(() => this.hostSize().width);
  protected readonly height = computed(() => this.hostSize().height);
  protected readonly hoverIndex = signal<number | null>(null);
  protected readonly announcement = signal('');

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

  protected readonly legendVisible = computed(
    () => this.legend().visible !== false,
  );
  protected readonly legendPosition = computed(
    () => this.legend().position ?? 'bottom',
  );

  private readonly geometry = computed(() => {
    const cx = this.width() / 2;
    const cy = this.height() / 2;
    const outerR = Math.max(
      20,
      Math.min(this.width(), this.height()) / 2 - (this.showLabels() ? 56 : 16),
    );
    const innerR =
      this.type() === 'doughnut' ? outerR * this.innerRadius() : 0;
    return { cx, cy, outerR, innerR };
  });

  protected readonly slices = computed<readonly SliceVm<T>[]>(() => {
    const argOf =
      typeof this.argumentField() === 'string'
        ? createFieldAccessor<T>(this.argumentField() as string)
        : (this.argumentField() as (item: T) => unknown);
    const valueOf =
      typeof this.valueField() === 'string'
        ? createFieldAccessor<T>(this.valueField() as string)
        : (this.valueField() as (item: T) => unknown);
    const data = this.dataSource();
    const values = data.map((item) => {
      const raw = valueOf(item);
      return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
    });
    const grouped = groupSmallValues(values, this.smallValuesGrouping());
    const slices = buildPieSlices(grouped, this.startAngle());
    const { cx, cy, outerR, innerR } = this.geometry();
    const palette = this.palette() ?? OGE_CHART_PALETTE;
    return slices
      .filter((slice) => slice.fraction > 0)
      .map((slice) => {
        const entry = grouped[slice.index];
        const sources = entry.sourceIndexes.map((index) => data[index]);
        const label = entry.grouped
          ? this.othersLabel()
          : String(argOf(sources[0]) ?? '');
        const mid = (slice.startAngle + slice.endAngle) / 2;
        const explode = 8;
        const dx = explode * Math.sin(mid);
        const dy = -explode * Math.cos(mid);
        return {
          slice,
          payload: {
            index: slice.index,
            argument: entry.grouped ? this.othersLabel() : argOf(sources[0]),
            value: slice.value,
            fraction: slice.fraction,
            sources,
            grouped: entry.grouped,
          },
          path: sliceArcPath(
            cx,
            cy,
            outerR,
            innerR,
            slice.startAngle,
            slice.endAngle,
          ),
          explodedPath: sliceArcPath(
            cx + dx,
            cy + dy,
            outerR,
            innerR,
            slice.startAngle,
            slice.endAngle,
          ),
          color: palette[slice.index % palette.length],
          label,
        };
      });
  });

  protected readonly labels = computed(() => {
    const { cx, cy, outerR } = this.geometry();
    return layoutPieLabels(
      this.slices().map((vm) => vm.slice),
      cx,
      cy,
      outerR,
    );
  });

  protected labelTextOf(sliceIndex: number): string {
    const vm = this.slices().find((entry) => entry.slice.index === sliceIndex);
    return vm === undefined ? '' : vm.label;
  }

  protected valueTextOf(vm: SliceVm<T>): string {
    const percent = new Intl.NumberFormat(this.effectiveLocale(), {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(vm.slice.fraction);
    return `${numberFormat(vm.slice.value, this.effectiveLocale())} (${percent})`;
  }

  protected readonly tooltipVm = computed(() => {
    if (!this.tooltipEnabled()) return null;
    const index = this.hoverIndex();
    if (index === null) return null;
    const vm = this.slices().find((entry) => entry.slice.index === index);
    if (vm === undefined) return null;
    const { cx, cy, outerR } = this.geometry();
    const mid = (vm.slice.startAngle + vm.slice.endAngle) / 2;
    return {
      x: cx + (outerR / 2) * Math.sin(mid) + 12,
      y: cy - (outerR / 2) * Math.cos(mid),
      label: vm.label,
      valueText: this.valueTextOf(vm),
    };
  });

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
    const current = untracked(this.selectedSlices);
    this.selectedSlices.set(
      current.includes(index)
        ? current.filter((entry) => entry !== index)
        : [...current, index],
    );
  }

  protected onSliceClick(vm: SliceVm<T>, event: MouseEvent): void {
    void event;
    this.sliceClick.emit(vm.payload);
    const current = untracked(this.selectedSlices);
    this.selectedSlices.set(
      current.includes(vm.slice.index)
        ? current.filter((entry) => entry !== vm.slice.index)
        : [...current, vm.slice.index],
    );
    this.announcement.set(
      this.msg()
        .announcements.selected.replace('{series}', vm.label)
        .replace('{argument}', this.valueTextOf(vm)),
    );
  }

  /** The live SVG root — the exporters rasterize/serialize it. */
  getSvgElement(): SVGSVGElement {
    return this.svgEl().nativeElement;
  }

  protected readonly rootAriaLabel = computed(() =>
    this.msg()
      .aria.pieLabel.replace('{title}', this.title() || 'Data')
      .replace('{count}', String(this.slices().length)),
  );
}
