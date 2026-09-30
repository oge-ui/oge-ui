import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  beginChartGesture,
  buildRangeSelectorData,
  buildRangeSelectorScene,
  commitRangeSelection,
  mergeOgeChartsMessages,
  observeChartSize,
  rangeCenteredAt,
  rangeHandleDragRange,
  rangeHandleKeyRange,
  rangeSelectorAnnouncement,
  rangeSelectorDeltaValue,
  rangeSelectorEffective,
  rangeSelectorLabel,
  rangeSelectorWindowPx,
  rangeWindowDragRange,
  type OgeChartRange,
  type OgeChartSeriesInput,
} from '@oge-ui/charts-engine';
import { OGE_CHARTS_CONFIG, type OgeChartsMessages } from '../config';

/**
 * `<oge-range-selector>` — the overview strip (dxRangeSelector parity):
 * a mini background chart with a draggable selection window and two
 * resize handles, `[(value)]` two-way. Pair it with a chart by binding
 * the same range to `[(visualRange)]`. Handles follow the WAI-ARIA
 * slider pattern (arrow keys adjust, Home/End jump). Commercial.
 */
@Component({
  selector: 'oge-range-selector',
  styleUrl: './chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-chart oge-range-selector' },
  template: `
    <div #plotWrap class="oge-chart-plot-wrap oge-range-wrap">
      <svg
        #svgEl
        class="oge-chart-svg"
        role="presentation"
        [attr.width]="width()"
        [attr.height]="height()"
        [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
        (pointerdown)="onTrackPointerDown($event)"
      >
        @for (vm of backgroundSeries(); track vm.index) {
          @if (vm.areaPathD !== null) {
            <path
              class="oge-chart-area"
              [attr.d]="vm.areaPathD"
              [attr.fill]="vm.color"
              opacity="0.25"
            />
          }
          @if (vm.linePathD !== null) {
            <path
              class="oge-chart-line"
              [attr.d]="vm.linePathD"
              [attr.stroke]="vm.color"
              stroke-width="1.5"
              fill="none"
            />
          }
        }
        <!-- shades outside the window -->
        <rect
          class="oge-range-shade"
          x="0"
          y="0"
          [attr.width]="windowPx().start"
          [attr.height]="plotH()"
        />
        <rect
          class="oge-range-shade"
          [attr.x]="windowPx().end"
          y="0"
          [attr.width]="width() - windowPx().end"
          [attr.height]="plotH()"
        />
        <rect
          class="oge-range-window"
          [attr.x]="windowPx().start"
          y="0"
          [attr.width]="windowPx().end - windowPx().start"
          [attr.height]="plotH()"
          (pointerdown)="onWindowPointerDown($event)"
        />
        @for (tick of ticksVm(); track tick.px) {
          <text
            class="oge-chart-axis-label"
            [attr.x]="tick.px"
            [attr.y]="height() - 4"
            text-anchor="middle"
          >
            {{ tick.label }}
          </text>
        }
      </svg>
      <div
        class="oge-range-handle"
        role="slider"
        tabindex="0"
        [attr.aria-label]="msg().aria.rangeStart"
        [attr.aria-valuemin]="bounds().min"
        [attr.aria-valuemax]="effective().max"
        [attr.aria-valuenow]="effective().min"
        [attr.aria-valuetext]="labelOf(effective().min)"
        [style.left.px]="windowPx().start - 4"
        (pointerdown)="onHandlePointerDown('start', $event)"
        (keydown)="onHandleKeydown('start', $event)"
      ></div>
      <div
        class="oge-range-handle"
        role="slider"
        tabindex="0"
        [attr.aria-label]="msg().aria.rangeEnd"
        [attr.aria-valuemin]="effective().min"
        [attr.aria-valuemax]="bounds().max"
        [attr.aria-valuenow]="effective().max"
        [attr.aria-valuetext]="labelOf(effective().max)"
        [style.left.px]="windowPx().end - 4"
        (pointerdown)="onHandlePointerDown('end', $event)"
        (keydown)="onHandleKeydown('end', $event)"
      ></div>
    </div>
    <div class="oge-chart-live" aria-live="polite">{{ announcement() }}</div>
  `,
})
export class OgeRangeSelector<T extends object = Record<string, unknown>> {
  private readonly config = inject(OGE_CHARTS_CONFIG);

  readonly dataSource = input<readonly T[]>([]);
  /** Background mini series (line/area recommended). */
  readonly series = input<readonly OgeChartSeriesInput<T>[]>([]);
  /** `'time' | 'linear'`; auto-detects from the first argument when unset. */
  readonly scaleType = input<'time' | 'linear' | undefined>(undefined);
  readonly palette = input<readonly string[] | undefined>(undefined);
  readonly locale = input<string | undefined>(undefined);
  readonly messages = input<Partial<OgeChartsMessages>>({});
  /** The selected window; `null` = full range. Two-way. */
  readonly value = model<OgeChartRange | null>(null);

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

  private readonly hostSize = signal({ width: 600, height: 90 });
  protected readonly width = computed(() => this.hostSize().width);
  protected readonly height = computed(() => this.hostSize().height);
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

  /* ---------------- the engine's view model (ADR 0003) ---------------- */

  private readonly data = computed(() =>
    buildRangeSelectorData<T>({
      dataSource: this.dataSource(),
      series: this.series(),
      scaleType: this.scaleType(),
    }),
  );
  private readonly scene = computed(() =>
    buildRangeSelectorScene<T>({
      data: this.data(),
      palette: this.palette(),
      width: this.width(),
      height: this.height(),
      locale: this.effectiveLocale(),
    }),
  );

  protected readonly plotH = computed(() => this.scene().plotH);
  protected readonly bounds = computed(() => this.data().bounds);
  protected readonly effective = computed(() =>
    rangeSelectorEffective(this.data(), this.value()),
  );
  protected readonly windowPx = computed(() =>
    rangeSelectorWindowPx(this.scene(), this.effective()),
  );
  protected readonly backgroundSeries = computed(
    () => this.scene().backgroundSeries,
  );
  protected readonly ticksVm = computed(() => this.scene().ticks);

  protected labelOf(value: number): string {
    return rangeSelectorLabel(this.data().kind, value, this.effectiveLocale());
  }

  /* ---------------- interaction ---------------- */

  private commit(range: OgeChartRange): void {
    this.value.set(commitRangeSelection(range, untracked(this.bounds)));
  }

  protected onHandlePointerDown(
    side: 'start' | 'end',
    event: PointerEvent,
  ): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    const startRange = untracked(this.effective);
    const scale = untracked(this.scene).scale;
    beginChartGesture(event, {
      onMove: (deltaX) => {
        this.commit(
          rangeHandleDragRange(
            side,
            startRange,
            rangeSelectorDeltaValue(scale, deltaX),
          ),
        );
      },
      onFinish: (_commit, cancelled) => {
        if (cancelled) this.value.set(startRange);
      },
    });
  }

  protected onWindowPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    const startRange = untracked(this.effective);
    const scale = untracked(this.scene).scale;
    beginChartGesture(event, {
      onMove: (deltaX) => {
        this.commit(
          rangeWindowDragRange(
            startRange,
            rangeSelectorDeltaValue(scale, deltaX),
          ),
        );
      },
      onFinish: (_commit, cancelled) => {
        if (cancelled) this.value.set(startRange);
      },
    });
  }

  /** Click on the track centers the window there. */
  protected onTrackPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const svgRect = this.svgEl().nativeElement.getBoundingClientRect();
    const px = event.clientX - svgRect.left;
    const center = untracked(this.scene).scale.fromPx(px);
    this.commit(rangeCenteredAt(untracked(this.effective), center));
  }

  protected onHandleKeydown(side: 'start' | 'end', event: KeyboardEvent): void {
    const next = rangeHandleKeyRange(
      side,
      event.key,
      untracked(this.effective),
      untracked(this.bounds),
    );
    if (next === null) return;
    event.preventDefault();
    this.commit(next);
    this.announcement.set(
      rangeSelectorAnnouncement(
        this.msg(),
        untracked(this.data).kind,
        untracked(this.effective),
        this.effectiveLocale(),
      ),
    );
  }

  /** Back to the full extent. */
  reset(): void {
    this.value.set(null);
  }
}
