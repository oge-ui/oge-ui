import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  buildSparklineScene,
  detectChartRtl,
  mergeOgeChartsMessages,
  observeChartRtl,
  observeChartSize,
  sparklineIndexAt,
  sparklineTooltip,
  type OgeSparklineMarkers,
  type OgeSparklineType,
} from '@oge-ui/charts-engine';
import {
  OGE_CHARTS_CONFIG,
  type OgeChartsMessages,
} from '@oge-ui/charts/config';

/**
 * `<oge-sparkline>` — a word-sized chart for table cells, KPI tiles and
 * running text: `line`, `area`, `bar` or `winloss`, with optional first /
 * last / min / max markers and an optional hover tooltip. Its own entry
 * point (`@oge-ui/charts/sparkline`) that never loads the cartesian chart.
 * The svg is a `role="img"` whose label summarizes the series (count,
 * first, last, low, high). Commercial.
 *
 * ```html
 * <oge-sparkline [dataSource]="[4, 7, 5, 9, 12, 10]" type="area" [markers]="true" />
 * ```
 */
@Component({
  selector: 'oge-sparkline',
  styleUrl: './sparkline.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-sparkline',
    '[attr.dir]': 'hostDir()',
  },
  template: `
    <div
      #plotWrap
      class="oge-sparkline-wrap"
      (pointermove)="onPointerMove($event)"
      (pointerleave)="hoverIndex.set(-1)"
    >
      <svg
        #svgEl
        class="oge-sparkline-svg"
        role="img"
        [attr.aria-label]="scene().ariaLabel"
        [attr.width]="width()"
        [attr.height]="height()"
        [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
      >
        @if (scene().areaPath) {
          <path
            class="oge-sparkline-area"
            [attr.d]="scene().areaPath"
            [style.fill]="color() ?? null"
          />
        }
        @if (scene().linePath) {
          <path
            class="oge-sparkline-line"
            [attr.d]="scene().linePath"
            [attr.stroke-width]="lineWidth()"
            [style.stroke]="color() ?? null"
          />
        }
        @for (bar of scene().bars; track bar.index) {
          <rect
            class="oge-sparkline-bar"
            [class.oge-sparkline-bar-negative]="bar.kind === 'negative'"
            [class.oge-sparkline-bar-draw]="bar.kind === 'draw'"
            [attr.x]="bar.x"
            [attr.y]="bar.y"
            [attr.width]="bar.width"
            [attr.height]="bar.height"
            [style.fill]="barFill(bar.kind)"
          />
        }
        @for (marker of scene().markers; track marker.index) {
          <circle
            [attr.class]="
              'oge-sparkline-marker oge-sparkline-marker-' + marker.kind
            "
            [attr.cx]="marker.x"
            [attr.cy]="marker.y"
            r="2.5"
          />
        }
        @if (hoverPoint(); as point) {
          <circle
            class="oge-sparkline-hover"
            [attr.cx]="point.x"
            [attr.cy]="point.y"
            r="3"
          />
        }
      </svg>
      @if (tooltipVm(); as tip) {
        <div
          class="oge-sparkline-tooltip"
          [class.oge-sparkline-tooltip-flip]="tip.flip"
          [style.left.px]="tip.x"
          [style.top.px]="tip.y"
          aria-hidden="true"
        >
          {{ tip.text }}
        </div>
      }
    </div>
  `,
})
export class OgeSparkline<T extends object = Record<string, unknown>> {
  private readonly config = inject(OGE_CHARTS_CONFIG);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Numbers, or items read through `valueField` (`null` = a gap). */
  readonly dataSource = input<readonly (T | number | null)[]>([]);
  /** Default `'value'`; ignored for plain numbers. */
  readonly valueField = input<string | ((item: T) => unknown)>('value');
  /** Tooltip argument; default the point's position (1-based). */
  readonly argumentField = input<string | ((item: T) => unknown) | undefined>(
    undefined,
  );
  /** `'line'` (default), `'area'`, `'bar'` or `'winloss'`. */
  readonly type = input<OgeSparklineType>('line');
  /** Markers on the first / last / min / max points (`true` = all four). */
  readonly markers = input<boolean | OgeSparklineMarkers>(false);
  /** Win-loss: values above win, below lose, equal draw. Default 0. */
  readonly winlossThreshold = input(0);
  /** Fixed value range; default the data range (bars include 0). */
  readonly minValue = input<number | undefined>(undefined);
  readonly maxValue = input<number | undefined>(undefined);
  /** Line / area / positive-bar colour; default the accent. */
  readonly color = input<string | undefined>(undefined);
  /** Negative bars and losses; default the danger colour. */
  readonly negativeColor = input<string | undefined>(undefined);
  readonly lineWidth = input(1.5);
  /** Hover tooltip (`argument: value`). Default false. */
  readonly tooltipEnabled = input(false);
  readonly valueFormat = input<((value: number) => string) | undefined>(
    undefined,
  );
  /** Mirrors the argument direction; unset follows the page `dir`. */
  readonly rtlEnabled = input<boolean | undefined>(undefined);
  /** Prefix of the accessible label (`Sales sparkline, …`). */
  readonly title = input('');
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input<Partial<OgeChartsMessages>>({});

  private readonly plotWrapEl =
    viewChild.required<ElementRef<HTMLElement>>('plotWrap');
  private readonly svgEl =
    viewChild.required<ElementRef<SVGSVGElement>>('svgEl');

  private readonly hostSize = signal({ width: 120, height: 32 });
  protected readonly width = computed(() => this.hostSize().width);
  protected readonly height = computed(() => this.hostSize().height);
  private readonly autoRtl = signal(false);
  protected readonly hoverIndex = signal(-1);
  protected readonly hostDir = computed(() => {
    const explicit = this.rtlEnabled();
    return explicit === undefined ? null : explicit ? 'rtl' : 'ltr';
  });
  private readonly msg = computed<OgeChartsMessages>(() =>
    mergeOgeChartsMessages(this.config.messages, this.messages()),
  );
  private readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale,
  );

  constructor() {
    afterNextRender(() => {
      this.autoRtl.set(detectChartRtl(this.hostEl.nativeElement));
      const stopRtl = observeChartRtl(this.hostEl.nativeElement, (rtl) =>
        this.autoRtl.set(rtl),
      );
      this.destroyRef.onDestroy(stopRtl);
      const stop = observeChartSize(this.plotWrapEl().nativeElement, (size) =>
        this.hostSize.set(size),
      );
      this.destroyRef.onDestroy(stop);
    });
  }

  /** The engine's view model (ADR 0003). */
  protected readonly scene = computed(() =>
    buildSparklineScene<T>({
      dataSource: this.dataSource(),
      valueField: this.valueField(),
      argumentField: this.argumentField(),
      type: this.type(),
      markers: this.markers(),
      winlossThreshold: this.winlossThreshold(),
      minValue: this.minValue(),
      maxValue: this.maxValue(),
      rtl: this.rtlEnabled() ?? this.autoRtl(),
      width: this.width(),
      height: this.height(),
      lineWidth: this.lineWidth(),
      valueFormat: this.valueFormat(),
      title: this.title(),
      locale: this.effectiveLocale(),
      messages: this.msg(),
    }),
  );

  protected readonly hoverPoint = computed(() => {
    const point = this.scene().points[this.hoverIndex()];
    return point === undefined || point.y === null ? null : point;
  });

  protected readonly tooltipVm = computed(() =>
    this.tooltipEnabled() && this.hoverIndex() >= 0
      ? sparklineTooltip(
          this.scene(),
          this.hoverIndex(),
          this.width(),
          this.effectiveLocale(),
          this.valueFormat(),
        )
      : null,
  );

  protected barFill(kind: 'positive' | 'negative' | 'draw'): string | null {
    if (kind === 'negative') return this.negativeColor() ?? null;
    if (kind === 'positive') return this.color() ?? null;
    return null;
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.tooltipEnabled() || !this.isBrowser) return;
    const rect = this.svgEl().nativeElement.getBoundingClientRect();
    this.hoverIndex.set(
      sparklineIndexAt(this.scene(), event.clientX - rect.left),
    );
  }

  /** The live SVG root — the image exporters serialize it. */
  getSvgElement(): SVGSVGElement {
    return this.svgEl().nativeElement;
  }
}
