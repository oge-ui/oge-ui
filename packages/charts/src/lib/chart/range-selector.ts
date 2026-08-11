import {
  ChangeDetectionStrategy,
  Component,
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
import { toLocalDate } from '@oge-ui/core';
import {
  clampRange,
  createLinearScale,
  createTimeScale,
  type ChartRange,
  type ChartScaleKind,
} from '../engine/scale';
import {
  linePath,
  baselineAreaPath,
  type PathPoint,
} from '../engine/path-builder';
import { buildSeries, type ChartSeriesInput } from '../engine/series-model';
import { timeTickFormatter, numberFormat } from '../engine/tick-format';
import { beginChartGesture } from './chart-gesture';
import { OGE_CHARTS_CONFIG, type OgeChartsMessages } from '../config';
import { OGE_CHART_PALETTE } from './chart';
import type { OgeChartRange } from '../charts-types';

const H_SCALE = 18;

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
  readonly series = input<readonly ChartSeriesInput<T>[]>([]);
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

  private readonly hostSize = signal({ width: 600, height: 90 });
  protected readonly width = computed(() => this.hostSize().width);
  protected readonly height = computed(() => this.hostSize().height);
  protected readonly plotH = computed(() => this.height() - H_SCALE);
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

  protected readonly kind = computed<ChartScaleKind>(() => {
    const explicit = this.scaleType();
    if (explicit !== undefined) return explicit;
    for (const item of this.dataSource()) {
      for (const seriesInput of this.series()) {
        const expr = seriesInput.argumentField;
        if (expr === undefined) return 'linear';
        const raw =
          typeof expr === 'string'
            ? (item as Record<string, unknown>)[expr]
            : expr(item);
        if (raw === undefined || raw === null) continue;
        if (raw instanceof Date) return 'time';
        if (typeof raw === 'string' && toLocalDate(raw) !== null) return 'time';
        return 'linear';
      }
    }
    return 'linear';
  });

  protected readonly seriesList = computed(() =>
    this.series().map((input, index) =>
      buildSeries(this.dataSource(), input, index, this.kind(), new Map()),
    ),
  );

  protected readonly bounds = computed<ChartRange>(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const series of this.seriesList()) {
      for (const point of series.points) {
        if (point.argNumeric === null) continue;
        if (point.argNumeric < min) min = point.argNumeric;
        if (point.argNumeric > max) max = point.argNumeric;
      }
    }
    return min <= max ? { min, max } : { min: 0, max: 1 };
  });

  protected readonly effective = computed<ChartRange>(() => {
    const value = this.value();
    const bounds = this.bounds();
    return value === null ? bounds : clampRange(value, bounds);
  });

  protected readonly scale = computed(() => {
    const bounds = this.bounds();
    const options = {
      min: bounds.min,
      max: bounds.max,
      rangePx: this.width(),
    };
    return this.kind() === 'time'
      ? createTimeScale(options)
      : createLinearScale(options);
  });

  protected readonly windowPx = computed(() => {
    const scale = this.scale();
    const range = this.effective();
    return { start: scale.toPx(range.min), end: scale.toPx(range.max) };
  });

  protected readonly backgroundSeries = computed(() => {
    const scale = this.scale();
    const palette = this.palette() ?? OGE_CHART_PALETTE;
    let valueMin = Infinity;
    let valueMax = -Infinity;
    for (const series of this.seriesList()) {
      for (const point of series.points) {
        if (point.value === null) continue;
        if (point.value < valueMin) valueMin = point.value;
        if (point.value > valueMax) valueMax = point.value;
      }
    }
    if (valueMin > valueMax) return [];
    const valueScale = createLinearScale({
      min: Math.min(0, valueMin),
      max: valueMax,
      rangePx: this.plotH() - 6,
      inverted: true,
    });
    return this.seriesList().map((series, index) => {
      const points: PathPoint[] = series.points.map((point) => ({
        x: point.argNumeric === null ? 0 : scale.toPx(point.argNumeric),
        y:
          point.argNumeric === null || point.value === null
            ? null
            : valueScale.toPx(point.value) + 3,
      }));
      const isArea = series.type === 'area' || series.type === 'splineArea';
      return {
        index,
        color: series.input.color ?? palette[index % palette.length],
        linePathD: linePath(points) || null,
        areaPathD: isArea
          ? baselineAreaPath(points, this.plotH()) || null
          : null,
      };
    });
  });

  protected readonly ticksVm = computed(() => {
    const scale = this.scale();
    const format =
      this.kind() === 'time'
        ? timeTickFormatter(scale.tickUnit ?? 'day', this.effectiveLocale())
        : (value: number): string =>
            numberFormat(value, this.effectiveLocale());
    return scale.ticks
      .filter((_, index, ticks) => index % Math.ceil(ticks.length / 8) === 0)
      .map((tick) => ({ px: scale.toPx(tick), label: format(tick) }));
  });

  protected labelOf(value: number): string {
    return this.kind() === 'time'
      ? new Intl.DateTimeFormat(this.effectiveLocale(), {
          dateStyle: 'medium',
        }).format(new Date(value))
      : numberFormat(value, this.effectiveLocale());
  }

  /* ---------------- interaction ---------------- */

  private commit(range: ChartRange): void {
    const bounds = untracked(this.bounds);
    const minSpan = (bounds.max - bounds.min) * 0.01;
    this.value.set(clampRange(range, bounds, minSpan));
  }

  protected onHandlePointerDown(
    side: 'start' | 'end',
    event: PointerEvent,
  ): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    const startRange = untracked(this.effective);
    const scale = untracked(this.scale);
    beginChartGesture(event, {
      onMove: (deltaX) => {
        const deltaValue = scale.fromPx(deltaX) - scale.fromPx(0);
        this.commit(
          side === 'start'
            ? {
                min: Math.min(startRange.min + deltaValue, startRange.max),
                max: startRange.max,
              }
            : {
                min: startRange.min,
                max: Math.max(startRange.max + deltaValue, startRange.min),
              },
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
    const scale = untracked(this.scale);
    beginChartGesture(event, {
      onMove: (deltaX) => {
        const deltaValue = scale.fromPx(deltaX) - scale.fromPx(0);
        this.commit({
          min: startRange.min + deltaValue,
          max: startRange.max + deltaValue,
        });
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
    const scale = untracked(this.scale);
    const range = untracked(this.effective);
    const span = range.max - range.min;
    const center = scale.fromPx(px);
    this.commit({ min: center - span / 2, max: center + span / 2 });
  }

  protected onHandleKeydown(side: 'start' | 'end', event: KeyboardEvent): void {
    const bounds = untracked(this.bounds);
    const range = untracked(this.effective);
    const step = (bounds.max - bounds.min) / 50;
    let next: ChartRange | null = null;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next =
          side === 'start'
            ? { min: range.min - step, max: range.max }
            : { min: range.min, max: Math.max(range.max - step, range.min) };
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next =
          side === 'start'
            ? { min: Math.min(range.min + step, range.max), max: range.max }
            : { min: range.min, max: range.max + step };
        break;
      case 'Home':
        next =
          side === 'start'
            ? { min: bounds.min, max: range.max }
            : { min: range.min, max: range.min };
        break;
      case 'End':
        next =
          side === 'start'
            ? { min: range.max, max: range.max }
            : { min: range.min, max: bounds.max };
        break;
      default:
        return;
    }
    event.preventDefault();
    this.commit(next);
    this.announcement.set(
      `${this.msg().aria.rangeWindow}: ${this.labelOf(untracked(this.effective).min)} – ${this.labelOf(untracked(this.effective).max)}`,
    );
  }

  /** Back to the full extent. */
  reset(): void {
    this.value.set(null);
  }
}
