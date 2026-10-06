import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  contentChild,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  buildFunnelScene,
  chartLabelTemplateBox,
  chartListKeyCommand,
  funnelAnnouncement,
  funnelSrTable,
  funnelTooltip,
  formatOgeChartMessage,
  toggleChartIndex,
  type OgeChartFunnelItemEvent,
  type OgeChartLabelOptions,
  type OgeChartLegendClickEvent,
  type OgeChartLegendOptions,
  type OgeChartPointCustomizer,
  type OgeChartRenderLabel,
  type OgeFunnelAlgorithm,
  type OgeFunnelItemVm,
  type OgeFunnelType,
} from '@oge-ui/charts-engine';
import {
  OgeChartLabelTemplate,
  OgeChartLegendTemplate,
} from './chart-templates';
import { OgeChartVisualRtlBase } from './visual-base';

/**
 * `<oge-funnel-chart>` — funnel and pyramid on the shared charts engine:
 * stages sized by value (`dynamicSlope` widths or `dynamicHeight`
 * heights), a neck, inverted funnels, inside or outside labels with
 * connectors, conversion rates (share of the first and of the previous
 * stage) in the tooltip and the screen-reader table, an interactive legend,
 * selection and keyboard stage inspection. Commercial.
 *
 * ```html
 * <oge-funnel-chart
 *   [dataSource]="pipeline"
 *   argumentField="stage"
 *   valueField="count"
 *   title="Sales pipeline"
 * />
 * ```
 */
@Component({
  selector: 'oge-funnel-chart',
  imports: [NgTemplateOutlet],
  styleUrls: ['./chart.scss', './visuals.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chart oge-funnel-chart',
    '[class.oge-chart-static]': '!resolvedAnimation().transitions',
    '[attr.dir]': 'hostDir()',
    '[style]': 'animationVars()',
  },
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
      @if (legendVisible() && scene().legendItems.length > 0) {
        <ul class="oge-chart-legend" [attr.aria-label]="msg().aria.legendLabel">
          @for (item of scene().legendItems; track item.index) {
            <li>
              <button
                type="button"
                class="oge-chart-legend-btn"
                [attr.aria-pressed]="isSelected(item.index)"
                (click)="onLegendClick(item.index)"
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
      <div
        #plotWrap
        class="oge-chart-plot-wrap"
        tabindex="0"
        role="group"
        [attr.aria-label]="scene().ariaLabel"
        (keydown)="onKeydown($event)"
        (blur)="activeIndex.set(null)"
      >
        <svg
          #svgEl
          class="oge-chart-svg"
          role="img"
          [attr.aria-label]="scene().ariaLabel"
          [attr.width]="width()"
          [attr.height]="height()"
          [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
        >
          <g [class.oge-chart-visual-enter]="drawingIn()">
            @for (item of scene().items; track item.key) {
              <path
                class="oge-funnel-item"
                [class.oge-chart-point-selected]="isSelected(item.index)"
                [class.oge-chart-item-active]="activeIndex() === item.index"
                [attr.d]="item.path"
                [style.fill]="item.color"
                (click)="onItemClick(item)"
                (mouseenter)="hoverIndex.set(item.index)"
                (mouseleave)="hoverIndex.set(null)"
              />
            }
          </g>
          @for (label of scene().labels; track label.key) {
            @if (label.connector !== null) {
              <polyline
                class="oge-funnel-connector"
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
          @if (scene().items.length === 0) {
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
            @for (row of tip.rows; track $index) {
              <span class="oge-chart-tooltip-row">{{ row }}</span>
            }
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
          @for (header of srTable().headers; track $index) {
            <th scope="col">{{ header }}</th>
          }
        </tr>
      </thead>
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
export class OgeFunnelChart<
  T extends object = Record<string, unknown>,
> extends OgeChartVisualRtlBase {
  /** One stage per item; negative values clamp to zero. */
  readonly dataSource = input<readonly T[]>([]);
  readonly argumentField = input<string | ((item: T) => unknown)>('argument');
  readonly valueField = input<string | ((item: T) => unknown)>('value');
  /** Per-stage colour read from the data. */
  readonly colorField = input<string | ((item: T) => unknown) | undefined>(
    undefined,
  );
  /** Per-stage colour / label / description overrides (wins over `colorField`). */
  readonly customizePoint = input<OgeChartPointCustomizer<T> | undefined>(
    undefined,
  );
  /** `'funnel'` (default) or `'pyramid'` (apex on top, first stage at the base). */
  readonly type = input<OgeFunnelType>('funnel');
  /** `'dynamicSlope'` (widths follow values) or `'dynamicHeight'` (heights follow values). */
  readonly algorithm = input<OgeFunnelAlgorithm>('dynamicSlope');
  /** Neck width as a fraction of the full width. Default 0. */
  readonly neckWidth = input(0);
  /** Neck height as a fraction of the height (dynamicHeight). Default 0. */
  readonly neckHeight = input(0);
  /** Upside down (the funnel opens downwards). */
  readonly inverted = input(false);
  /** Sort the stages by value, largest first. Default true. */
  readonly sortData = input(true);
  /** Gap between stages, px. Default 2. */
  readonly itemGap = input(2);
  /** Labels on/off — shorthand for `label.visible`. Default true. */
  readonly showLabels = input(true);
  /** `position: 'outside'` puts the labels beside the shape with connectors; `format(info)`. */
  readonly label = input<OgeChartLabelOptions<T> | undefined>(undefined);
  readonly legend = input<OgeChartLegendOptions>({});
  readonly tooltipEnabled = input(true);
  readonly palette = input<readonly string[] | undefined>(undefined);
  readonly valueFormat = input<((value: number) => string) | undefined>(
    undefined,
  );
  /** Selected stage indexes (drawing order). Two-way. */
  readonly selectedItems = model<readonly number[]>([]);

  readonly itemClick = output<OgeChartFunnelItemEvent<T>>();
  readonly legendClick = output<OgeChartLegendClickEvent>();

  protected readonly legendTemplate = contentChild(OgeChartLegendTemplate, {
    descendants: false,
  });
  protected readonly labelTemplate = contentChild(OgeChartLabelTemplate, {
    descendants: false,
  });

  protected readonly hoverIndex = signal<number | null>(null);
  protected readonly activeIndex = signal<number | null>(null);
  protected readonly announcement = signal('');

  protected initialSize(): { width: number; height: number } {
    return { width: 480, height: 320 };
  }

  protected hasData(): boolean {
    return this.dataSource().length > 0;
  }

  /** The engine's view model (ADR 0003). */
  protected readonly scene = computed(() =>
    buildFunnelScene<T>({
      dataSource: this.dataSource(),
      argumentField: this.argumentField(),
      valueField: this.valueField(),
      colorField: this.colorField(),
      customizePoint: this.customizePoint(),
      type: this.type(),
      algorithm: this.algorithm(),
      neckWidth: this.neckWidth(),
      neckHeight: this.neckHeight(),
      inverted: this.inverted(),
      sortData: this.sortData(),
      itemGap: this.itemGap(),
      label: this.label(),
      showLabels: this.showLabels(),
      palette: this.palette(),
      rtl: this.rtl(),
      valueFormat: this.valueFormat(),
      title: this.title(),
      width: this.width(),
      height: this.height(),
      locale: this.effectiveLocale(),
      messages: this.msg(),
    }),
  );

  protected readonly legendVisible = computed(
    () => this.legend().visible !== false,
  );
  protected readonly legendPosition = computed(
    () => this.legend().position ?? 'bottom',
  );
  protected readonly srTable = computed(() =>
    funnelSrTable(this.scene(), this.msg(), this.effectiveLocale()),
  );
  protected readonly tooltipVm = computed(() =>
    this.tooltipEnabled()
      ? funnelTooltip(
          this.scene(),
          this.hoverIndex() ?? this.activeIndex(),
          this.msg(),
          this.effectiveLocale(),
        )
      : null,
  );

  protected isSelected(index: number): boolean {
    return this.selectedItems().includes(index);
  }

  protected labelBox(label: OgeChartRenderLabel): {
    x: number;
    y: number;
    w: number;
    h: number;
  } {
    return chartLabelTemplateBox(label);
  }

  protected onLegendClick(index: number): void {
    const item = untracked(this.scene).legendItems.find(
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
    this.selectedItems.set(
      toggleChartIndex(untracked(this.selectedItems), index),
    );
  }

  protected onItemClick(item: OgeFunnelItemVm<T>): void {
    this.itemClick.emit(item.payload);
    this.selectedItems.set(
      toggleChartIndex(untracked(this.selectedItems), item.index),
    );
    this.announcement.set(
      formatOgeChartMessage(this.msg().announcements.selected, {
        series: item.label,
        argument: item.valueText,
      }),
    );
  }

  protected onKeydown(event: KeyboardEvent): void {
    const scene = untracked(this.scene);
    const indexes = scene.items.map((item) => item.index);
    const active = untracked(this.activeIndex);
    const position = active === null ? null : indexes.indexOf(active);
    const command = chartListKeyCommand(event.key, {
      count: indexes.length,
      index: position === -1 ? null : position,
      rtl: untracked(this.rtl),
    });
    if (command === null) return;
    event.preventDefault();
    if (command.type === 'move') {
      const index = indexes[command.index];
      this.activeIndex.set(index);
      this.announcement.set(
        funnelAnnouncement(scene, index, this.msg(), this.effectiveLocale()),
      );
      return;
    }
    const item = scene.items.find((entry) => entry.index === active);
    if (item !== undefined) this.onItemClick(item);
  }

  /** Moves the keyboard focus to the plot. */
  focus(): void {
    this.plotWrapEl().nativeElement.focus();
  }
}
